mod study;

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::{Arc, Mutex, OnceLock};
use tauri::{Emitter, Manager, State, Window};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

// ── shared types ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CorpusStatus {
    pub downloaded: bool,
    pub size_bytes: u64,
    pub word_count: u64,
    pub char_count: u64,
    pub token_count: u64,
    pub vocab_size: u64,
}

impl CorpusStatus {
    fn empty() -> Self {
        Self {
            downloaded: false,
            size_bytes: 0,
            word_count: 0,
            char_count: 0,
            token_count: 0,
            vocab_size: 0,
        }
    }
}

#[derive(Debug, Deserialize, Clone)]
pub struct TrainConfig {
    pub d_model: usize,
    pub n_layers: usize,
    pub n_heads: usize,
    pub context_len: usize,
    pub batch_size: usize,
    pub learning_rate: f64,
    pub epochs: usize,
    pub eval_interval: usize,
    pub tokenizer_type: String,
    /// "python" (the default) or "axon": who trains the model.
    #[serde(default)]
    pub engine: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    pub available: bool,
    pub name: String,
    pub total_mb: u64,
    pub free_mb: u64,
    pub allocated_mb: u64,
    pub reserved_mb: u64,
    pub device_count: u32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Default)]
pub struct TrainingState {
    pub running: bool,
    pub pid: Option<u32>,
    pub stopping: bool,
}

pub struct AppState {
    pub training: Arc<Mutex<TrainingState>>,
}

// ── path / interpreter resolution ───────────────────────────────────────

/// Where the Lab works and where its Python lives.
///
/// - `work`: data/, runs/ and the .venv the Lab trains with.
/// - `scripts`: the folder holding python/biblelm.
///
/// In `tauri dev` both are the repo. A release build used to fall back to the
/// compile-time CARGO_MANIFEST_DIR, which only existed on the machine that
/// built it; now the scripts come from the bundle's resources and the work
/// folder is the per-user app data folder. `BIBLELM_ROOT` overrides both.
struct Roots {
    work: PathBuf,
    scripts: PathBuf,
}

static ROOTS: OnceLock<Roots> = OnceLock::new();

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn init_roots(app: &tauri::AppHandle) {
    let roots = if let Ok(r) = std::env::var("BIBLELM_ROOT") {
        Roots { work: PathBuf::from(&r), scripts: PathBuf::from(r) }
    } else if cfg!(debug_assertions) {
        Roots { work: repo_root(), scripts: repo_root() }
    } else {
        let work = app.path().app_data_dir().unwrap_or_else(|_| repo_root());
        let _ = std::fs::create_dir_all(&work);
        let scripts = app.path().resource_dir().unwrap_or_else(|_| repo_root());
        Roots { work, scripts }
    };
    let _ = ROOTS.set(roots);
}

/// The Lab's work folder (data/, runs/, .venv).
fn project_root() -> PathBuf {
    ROOTS.get().map(|r| r.work.clone()).unwrap_or_else(repo_root)
}

fn scripts_root() -> PathBuf {
    ROOTS.get().map(|r| r.scripts.clone()).unwrap_or_else(repo_root)
}

/// The Python interpreter to spawn. Prefers the project `.venv`, then a
/// `BIBLELM_PYTHON` override, then a bare `python` on PATH.
fn python_exe(root: &Path) -> PathBuf {
    if let Ok(p) = std::env::var("BIBLELM_PYTHON") {
        return PathBuf::from(p);
    }
    let venv = if cfg!(windows) {
        root.join(".venv").join("Scripts").join("python.exe")
    } else {
        root.join(".venv").join("bin").join("python")
    };
    if venv.exists() {
        venv
    } else {
        PathBuf::from("python")
    }
}

fn data_dir(root: &Path) -> PathBuf {
    root.join("data")
}

fn run_dir(root: &Path) -> PathBuf {
    root.join("runs").join("current")
}

/// Build a `Command` that runs `python -m <module> <args...>` with the package
/// on PYTHONPATH and stdout piped for line streaming.
fn py_command(root: &Path, module: &str, args: &[String]) -> Command {
    let mut cmd = Command::new(python_exe(root));
    cmd.arg("-u") // unbuffered stdout — events arrive immediately
        .arg("-m")
        .arg(module)
        .args(args)
        .current_dir(root)
        .env("PYTHONPATH", scripts_root().join("python"))
        .env("PYTHONIOENCODING", "utf-8")
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());
    #[cfg(windows)]
    {
        // Put the child in its own process group so a stray Ctrl+C / Ctrl+Break
        // in the `tauri dev` console can't deliver SIGINT to the training
        // process (which would trip its graceful-stop path and end the run
        // after one step). CREATE_NO_WINDOW also avoids a console flash in the
        // windowed release build. `train_stop` still kills it via `taskkill`.
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW);
    }
    cmd
}

fn event_type(v: &serde_json::Value) -> Option<&str> {
    v.get("type").and_then(|t| t.as_str())
}

// ── Axon (the Rust engine, nexis-ml-rs) ─────────────────────────────────
//
// Axon 0.11 trains the same character-level GPT as python/biblelm/model.py
// (`[data] path` a .txt file) and streams protocol v1 NDJSON ("ev": ...).
// The Lab drives it when it is installed, with no PyTorch: train.toml is
// written from the Lab's settings, Axon's events are mapped onto the Lab's
// own, and `axon serve` streams generated characters.

/// The `axon` binary: `BIBLELM_AXON`, else `axon` on PATH.
fn axon_exe() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("BIBLELM_AXON") {
        let p = PathBuf::from(p);
        return p.is_file().then_some(p);
    }
    let name = if cfg!(windows) { "axon.exe" } else { "axon" };
    std::env::var_os("PATH").and_then(|paths| std::env::split_paths(&paths).map(|d| d.join(name)).find(|p| p.is_file()))
}

fn axon_dir(root: &Path) -> PathBuf {
    root.join("runs").join("axon")
}

/// The run id of the last Axon training, recorded when it starts.
fn axon_latest(root: &Path) -> Option<String> {
    std::fs::read_to_string(axon_dir(root).join("latest-run")).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

fn axon_command(exe: &Path, args: &[&str]) -> Command {
    let mut cmd = Command::new(exe);
    cmd.args(args).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::inherit());
    #[cfg(windows)]
    {
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW);
    }
    cmd
}

/// A TOML basic string: forward slashes and escaped quotes, so Windows paths survive.
fn toml_str(s: &str) -> String {
    format!("\"{}\"", s.replace('\\', "/").replace('"', "\\\""))
}

/// train.toml for the Lab's settings. One Axon "epoch" is `eval_interval`
/// optimizer steps followed by a validation pass, the Lab's eval rhythm.
fn axon_toml(config: &TrainConfig, corpus: &Path) -> String {
    format!(
        "# Written by BibleLM's Lab; edited here it is overwritten next run.\n\
         [train]\nepochs = {}\nbatch_size = {}\nlr = {}\nval_split = 0.1\nseed = 42\ndevice = \"auto\"\n\n\
         [data]\npath = {}\n\n\
         [gpt]\nd_model = {}\nn_layers = {}\nn_heads = {}\ncontext_len = {}\nsteps_per_epoch = {}\neval_batches = 8\nsample_chars = 200\nsample_prompt = \"And God said\"\n",
        config.epochs,
        config.batch_size,
        config.learning_rate,
        toml_str(&corpus.to_string_lossy()),
        config.d_model,
        config.n_layers,
        config.n_heads,
        config.context_len,
        config.eval_interval.max(1),
    )
}

/// Which engines the Lab can use: Axon's version when it is installed.
#[tauri::command]
async fn lab_engines() -> Result<serde_json::Value, String> {
    let axon = match axon_exe() {
        Some(exe) => Command::new(&exe)
            .arg("--version")
            .output()
            .await
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()),
        None => None,
    };
    // Axon 0.11 is the first with the text template.
    let text = axon.as_deref().and_then(|v| v.split_whitespace().last()).and_then(|v| {
        let mut p = v.split('.').map(|x| x.parse::<u32>().unwrap_or(0));
        Some((p.next()?, p.next()?))
    });
    Ok(serde_json::json!({ "axon": axon, "axonText": matches!(text, Some((maj, min)) if maj > 0 || min >= 11) }))
}

async fn axon_train(config: TrainConfig, corpus: PathBuf, training: Arc<Mutex<TrainingState>>, window: Window) -> Result<(), String> {
    let exe = axon_exe().ok_or("Axon is not installed: put axon on PATH or set BIBLELM_AXON.")?;
    let root = project_root();
    let dir = axon_dir(&root);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("train.toml"), axon_toml(&config, &corpus)).map_err(|e| e.to_string())?;
    let dir_s = dir.to_string_lossy().into_owned();
    let mut child = axon_command(&exe, &["--nexis-protocol", "train", &dir_s])
        .spawn()
        .map_err(|e| format!("failed to start axon: {e}"))?;
    {
        let mut t = training.lock().map_err(|e| e.to_string())?;
        t.running = true;
        t.pid = child.id();
    }
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let steps = config.eval_interval.max(1);
    tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        let mut errored = false;
        // Axon reports each metric on its own line; the Lab wants one row per epoch.
        let (mut train, mut val, mut tps) = (None::<f64>, None::<f64>, None::<f64>);
        while let Ok(Some(line)) = lines.next_line().await {
            let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) else { continue };
            match v.get("ev").and_then(|e| e.as_str()) {
                Some("run.started") => {
                    if let Some(id) = v["run"].as_str() {
                        let _ = std::fs::write(axon_dir(&project_root()).join("latest-run"), id);
                    }
                    let _ = window.emit("train:status", serde_json::json!({ "phase": "start", "device": v["device"], "engine": "axon" }));
                }
                Some("metric") => {
                    let x = v["value"].as_f64();
                    match v["name"].as_str() {
                        Some("loss/train") => train = x,
                        Some("loss/val") => val = x,
                        Some("tokens/sec") => tps = x,
                        _ => {}
                    }
                }
                Some("epoch") => {
                    let epoch = v["epoch"].as_u64().unwrap_or(0);
                    let _ = window.emit(
                        "train:metric",
                        serde_json::json!({ "step": epoch as usize * steps, "epoch": epoch, "trainLoss": train, "valLoss": val, "tokensPerSec": tps }),
                    );
                    (train, val, tps) = (None, None, None);
                }
                Some("error") => {
                    errored = true;
                    let msg = v.get("message").or_else(|| v.get("msg")).cloned().unwrap_or_else(|| "Axon failed".into());
                    let _ = window.emit("train:error", serde_json::json!({ "message": msg }));
                }
                Some("run.finished") if v["status"].as_str() == Some("error") => {
                    errored = true;
                    let _ = window.emit("train:error", serde_json::json!({ "message": "Axon stopped with an error; see its run folder." }));
                }
                _ => {}
            }
        }
        let status = child.wait().await;
        if !errored && status.map(|s| !s.success()).unwrap_or(true) {
            errored = true;
            let _ = window.emit("train:error", serde_json::json!({ "message": "Axon exited with an error (is it 0.11 or newer?)." }));
        }
        let was_stopped = if let Ok(mut t) = training.lock() {
            t.running = false;
            t.pid = None;
            std::mem::take(&mut t.stopping)
        } else {
            false
        };
        if !errored && !was_stopped {
            let _ = window.emit("train:complete", serde_json::json!({ "ended": true, "engine": "axon" }));
        }
    });
    Ok(())
}

/// Generate from the last Axon run through `axon serve`, streaming characters.
async fn axon_generate(run: String, prompt: String, temperature: f64, max_tokens: usize, top_k: usize, window: &Window) -> Result<(), String> {
    use tokio::io::AsyncWriteExt;
    let exe = axon_exe().ok_or("Axon is not installed: put axon on PATH or set BIBLELM_AXON.")?;
    let dir = axon_dir(&project_root()).to_string_lossy().into_owned();
    let mut child = axon_command(&exe, &["serve", "--run", &run, &dir]).spawn().map_err(|e| format!("failed to start axon: {e}"))?;
    let mut stdin = child.stdin.take().ok_or("no stdin")?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let req = serde_json::json!({ "prompt": prompt, "max_tokens": max_tokens, "temperature": temperature, "top_k": top_k });
    stdin.write_all(format!("{req}\n").as_bytes()).await.map_err(|e| e.to_string())?;
    stdin.flush().await.map_err(|e| e.to_string())?;
    let mut lines = BufReader::new(stdout).lines();
    let mut err = None;
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) else { continue };
        match v.get("ev").and_then(|e| e.as_str()) {
            Some("token") => {
                let _ = window.emit("inference:token", serde_json::json!({ "token": v["text"] }));
            }
            Some("generation") => break,
            Some("error") => {
                err = v.get("message").or_else(|| v.get("msg")).and_then(|m| m.as_str()).map(str::to_string);
                break;
            }
            _ => {}
        }
    }
    // Closing stdin ends the serve loop.
    drop(stdin);
    let _ = child.kill().await;
    let _ = window.emit("inference:complete", serde_json::json!({}));
    err.map_or(Ok(()), Err)
}

// ── commands ────────────────────────────────────────────────────────────

#[tauri::command]
async fn corpus_status(version: Option<String>) -> Result<CorpusStatus, String> {
    let root = project_root();
    let version = version.unwrap_or_else(|| "kjv".into());
    let meta = data_dir(&root).join(format!("{version}.meta.json"));
    if !meta.exists() {
        return Ok(CorpusStatus::empty());
    }
    let text = std::fs::read_to_string(&meta).map_err(|e| e.to_string())?;
    let v: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    let num = |k: &str| v.get(k).and_then(serde_json::Value::as_u64).unwrap_or(0);
    Ok(CorpusStatus {
        downloaded: v
            .get("downloaded")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true),
        size_bytes: num("size_bytes"),
        word_count: num("word_count"),
        char_count: num("char_count"),
        token_count: num("token_count"),
        vocab_size: num("vocab_size"),
    })
}

#[tauri::command]
async fn corpus_list() -> Result<serde_json::Value, String> {
    let root = project_root();
    let args = vec![
        "list".into(),
        "--data-dir".into(),
        data_dir(&root).to_string_lossy().into_owned(),
    ];
    let mut child = py_command(&root, "biblelm.corpus", &args)
        .spawn()
        .map_err(|e| format!("failed to start python: {e}"))?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let mut lines = BufReader::new(stdout).lines();
    let mut sources = serde_json::Value::Array(vec![]);
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
            if event_type(&v) == Some("sources") {
                sources = v["sources"].clone();
            }
        }
    }
    let _ = child.wait().await;
    Ok(sources)
}

#[tauri::command]
async fn corpus_add(
    id: String,
    name: String,
    language: String,
    url: String,
) -> Result<(), String> {
    let root = project_root();
    let args = vec![
        "add".into(),
        "--data-dir".into(),
        data_dir(&root).to_string_lossy().into_owned(),
        "--id".into(),
        id,
        "--name".into(),
        name,
        "--language".into(),
        language,
        "--url".into(),
        url,
    ];
    let status = py_command(&root, "biblelm.corpus", &args)
        .spawn()
        .map_err(|e| format!("failed to start python: {e}"))?
        .wait()
        .await
        .map_err(|e| e.to_string())?;
    if !status.success() {
        return Err("failed to add translation".into());
    }
    Ok(())
}

#[tauri::command]
async fn corpus_download(window: Window, version: Option<String>) -> Result<(), String> {
    let root = project_root();
    let version = version.unwrap_or_else(|| "kjv".into());
    let args = vec![
        "download".into(),
        "--version".into(),
        version,
        "--data-dir".into(),
        data_dir(&root).to_string_lossy().into_owned(),
    ];
    let mut child = py_command(&root, "biblelm.corpus", &args)
        .spawn()
        .map_err(|e| format!("failed to start python: {e}"))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let mut lines = BufReader::new(stdout).lines();
    let mut err: Option<String> = None;
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
            match event_type(&v) {
                Some("progress") => {
                    let _ = window.emit(
                        "corpus:progress",
                        serde_json::json!({ "bytes": v["bytes"], "total": v["total"] }),
                    );
                }
                Some("error") => err = v["message"].as_str().map(str::to_string),
                _ => {}
            }
        }
    }
    let status = child.wait().await.map_err(|e| e.to_string())?;
    if let Some(msg) = err {
        return Err(msg);
    }
    if !status.success() {
        return Err("corpus download failed".into());
    }
    Ok(())
}

/// Run a python module that prints one JSON event of type `want` and return it.
/// An `error` event on the stream becomes an `Err`, so Python-side failures
/// arrive in the UI as their real message rather than a generic exit code.
async fn py_json(
    root: &Path,
    module: &str,
    args: &[String],
    want: &str,
) -> Result<serde_json::Value, String> {
    let mut child = py_command(root, module, args)
        .spawn()
        .map_err(|e| format!("failed to start python: {e}"))?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let mut lines = BufReader::new(stdout).lines();
    let mut found: Option<serde_json::Value> = None;
    let mut err: Option<String> = None;
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        let Ok(v) = serde_json::from_str::<serde_json::Value>(line.trim()) else {
            continue;
        };
        match event_type(&v) {
            Some(t) if t == want => found = Some(v),
            Some("error") => err = v["message"].as_str().map(str::to_string),
            _ => {}
        }
    }
    let status = child.wait().await.map_err(|e| e.to_string())?;
    if let Some(msg) = err {
        return Err(msg);
    }
    found.ok_or_else(|| {
        if status.success() {
            format!("{module} returned no {want} event")
        } else {
            format!("{module} failed")
        }
    })
}

#[tauri::command]
async fn corpus_remove(id: String) -> Result<(), String> {
    let root = project_root();
    let args = vec![
        "remove".into(),
        "--data-dir".into(),
        data_dir(&root).to_string_lossy().into_owned(),
        "--id".into(),
        id,
    ];
    py_json(&root, "biblelm.corpus", &args, "done").await.map(|_| ())
}

#[tauri::command]
async fn corpus_preview(version: String, chars: Option<u32>) -> Result<String, String> {
    let root = project_root();
    let args = vec![
        "preview".into(),
        "--data-dir".into(),
        data_dir(&root).to_string_lossy().into_owned(),
        "--version".into(),
        version,
        "--chars".into(),
        chars.unwrap_or(600).to_string(),
    ];
    let v = py_json(&root, "biblelm.corpus", &args, "preview").await?;
    Ok(v["text"].as_str().unwrap_or_default().to_string())
}

/// Every character in a downloaded corpus with its count, commonest first:
/// the model's whole vocabulary.
#[tauri::command]
async fn corpus_alphabet(version: String) -> Result<serde_json::Value, String> {
    let root = project_root();
    let args = vec![
        "alphabet".into(),
        "--data-dir".into(),
        data_dir(&root).to_string_lossy().into_owned(),
        "--version".into(),
        version,
    ];
    let v = py_json(&root, "biblelm.corpus", &args, "alphabet").await?;
    Ok(v["symbols"].clone())
}

#[tauri::command]
async fn model_status() -> Result<serde_json::Value, String> {
    let root = project_root();
    let args = vec![
        "inspect".into(),
        "--run-dir".into(),
        run_dir(&root).to_string_lossy().into_owned(),
    ];
    py_json(&root, "biblelm.model_io", &args, "model").await
}

/// Install model files the user dropped on the window (or picked by path) into
/// the current run directory. Each file is validated by `model_io` *before* it
/// replaces anything, so a wrong file can't break a working model.
#[tauri::command]
async fn model_import(paths: Vec<String>) -> Result<serde_json::Value, String> {
    if paths.is_empty() {
        return Err("No files to import".into());
    }
    let root = project_root();
    let mut args = vec![
        "import".into(),
        "--run-dir".into(),
        run_dir(&root).to_string_lossy().into_owned(),
    ];
    for p in paths {
        args.push("--file".into());
        args.push(p);
    }
    py_json(&root, "biblelm.model_io", &args, "imported").await
}

#[tauri::command]
async fn train_start(
    config: TrainConfig,
    version: Option<String>,
    state: State<'_, AppState>,
    window: Window,
) -> Result<(), String> {
    if config.d_model % config.n_heads != 0 {
        return Err(format!(
            "d_model ({}) must be divisible by n_heads ({})",
            config.d_model, config.n_heads
        ));
    }
    let training = state.training.clone();
    {
        let t = training.lock().map_err(|e| e.to_string())?;
        if t.running {
            return Err("Training is already running".into());
        }
    }

    let root = project_root();
    let version = version.unwrap_or_else(|| "kjv".into());
    let corpus = data_dir(&root).join(format!("{version}.txt"));
    if !corpus.exists() {
        return Err("Selected corpus isn't downloaded — download it on the Corpus tab first.".into());
    }
    if config.engine.as_deref() == Some("axon") {
        return axon_train(config, corpus, training, window).await;
    }
    let run = run_dir(&root);
    let args = vec![
        "--corpus".into(),
        corpus.to_string_lossy().into_owned(),
        "--run-dir".into(),
        run.to_string_lossy().into_owned(),
        "--tokenizer".into(),
        config.tokenizer_type.clone(),
        "--d-model".into(),
        config.d_model.to_string(),
        "--n-layers".into(),
        config.n_layers.to_string(),
        "--n-heads".into(),
        config.n_heads.to_string(),
        "--context-len".into(),
        config.context_len.to_string(),
        "--batch-size".into(),
        config.batch_size.to_string(),
        "--lr".into(),
        format!("{}", config.learning_rate),
        "--epochs".into(),
        config.epochs.to_string(),
        "--eval-interval".into(),
        config.eval_interval.to_string(),
    ];

    let mut child = py_command(&root, "biblelm.train", &args)
        .spawn()
        .map_err(|e| format!("failed to start python: {e}"))?;
    let pid = child.id();
    {
        let mut t = training.lock().map_err(|e| e.to_string())?;
        t.running = true;
        t.pid = pid;
    }

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let win = window.clone();
    // Stream in the background so this command returns immediately; the UI is
    // driven entirely by events. `train_stop` kills the process by pid.
    tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        let mut errored = false;
        while let Ok(Some(line)) = lines.next_line().await {
            let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) else {
                continue;
            };
            match event_type(&v) {
                Some("metric") => {
                    let _ = win.emit(
                        "train:metric",
                        serde_json::json!({
                            "step": v["step"],
                            "epoch": v["epoch"],
                            "trainLoss": v["train_loss"],
                            "valLoss": v["val_loss"],
                            "tokensPerSec": v["tokens_per_sec"],
                        }),
                    );
                }
                Some("status") => {
                    let _ = win.emit("train:status", v.clone());
                }
                Some("error") => {
                    errored = true;
                    let _ = win.emit(
                        "train:error",
                        serde_json::json!({ "message": v["message"] }),
                    );
                }
                _ => {}
            }
        }
        let _ = child.wait().await;
        let was_stopped = if let Ok(mut t) = training.lock() {
            t.running = false;
            t.pid = None;
            let s = t.stopping;
            t.stopping = false;
            s
        } else {
            false
        };
        // A user-initiated stop already reset the UI; don't flip it to "completed".
        if !errored && !was_stopped {
            let _ = win.emit("train:complete", serde_json::json!({ "ended": true }));
        }
    });

    Ok(())
}

#[tauri::command]
async fn train_stop(state: State<'_, AppState>) -> Result<(), String> {
    let pid = {
        let mut t = state.training.lock().map_err(|e| e.to_string())?;
        t.running = false;
        t.stopping = true;
        t.pid.take()
    };
    if let Some(pid) = pid {
        kill_pid(pid);
    }
    Ok(())
}

#[tauri::command]
async fn inference_generate(
    prompt: String,
    temperature: f64,
    max_tokens: usize,
    top_k: usize,
    window: Window,
) -> Result<(), String> {
    let root = project_root();
    let run = run_dir(&root);
    // Generate from whichever engine trained most recently.
    let modified = |p: PathBuf| std::fs::metadata(p).and_then(|m| m.modified()).ok();
    let py_at = modified(run.join("ckpt.pt"));
    let axon_at = modified(axon_dir(&root).join("latest-run"));
    if let Some(id) = axon_latest(&root) {
        if axon_at.is_some() && (py_at.is_none() || axon_at > py_at) {
            return axon_generate(id, prompt, temperature, max_tokens, top_k, &window).await;
        }
    }
    if py_at.is_none() {
        return Err("No trained model — train a model first.".into());
    }
    let args = vec![
        "--run-dir".into(),
        run.to_string_lossy().into_owned(),
        "--prompt".into(),
        prompt,
        "--temperature".into(),
        format!("{temperature}"),
        "--max-tokens".into(),
        max_tokens.to_string(),
        "--top-k".into(),
        top_k.to_string(),
    ];
    let mut child = py_command(&root, "biblelm.generate", &args)
        .spawn()
        .map_err(|e| format!("failed to start python: {e}"))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let mut lines = BufReader::new(stdout).lines();
    let mut err: Option<String> = None;
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
            match event_type(&v) {
                Some("token") => {
                    let _ = window
                        .emit("inference:token", serde_json::json!({ "token": v["token"] }));
                }
                Some("error") => err = v["message"].as_str().map(str::to_string),
                _ => {}
            }
        }
    }
    let _ = child.wait().await;
    let _ = window.emit("inference:complete", serde_json::json!({}));
    if let Some(msg) = err {
        return Err(msg);
    }
    Ok(())
}

#[tauri::command]
async fn export_onnx(window: Window) -> Result<ExportResult, String> {
    let root = project_root();
    let run = run_dir(&root);
    if !run.join("ckpt.pt").exists() {
        return Err("No trained model to export — train a model first.".into());
    }
    let out = run.join("model.onnx");
    let args = vec![
        "--run-dir".into(),
        run.to_string_lossy().into_owned(),
        "--out".into(),
        out.to_string_lossy().into_owned(),
    ];
    let mut child = py_command(&root, "biblelm.export_onnx", &args)
        .spawn()
        .map_err(|e| format!("failed to start python: {e}"))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let mut lines = BufReader::new(stdout).lines();
    let mut result: Option<ExportResult> = None;
    let mut err: Option<String> = None;
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
            match event_type(&v) {
                Some("status") => {
                    let _ = window.emit("export:status", v.clone());
                }
                Some("done") => {
                    result = Some(ExportResult {
                        path: v["path"].as_str().unwrap_or_default().to_string(),
                        size_bytes: v["size_bytes"].as_u64().unwrap_or(0),
                    });
                }
                Some("error") => err = v["message"].as_str().map(str::to_string),
                _ => {}
            }
        }
    }
    let _ = child.wait().await;
    if let Some(msg) = err {
        return Err(msg);
    }
    result.ok_or_else(|| "export produced no output".into())
}

#[tauri::command]
async fn gpu_info() -> Result<GpuInfo, String> {
    let root = project_root();
    let mut child = py_command(&root, "biblelm.gpu_info", &[])
        .spawn()
        .map_err(|e| format!("failed to start python: {e}"))?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let mut lines = BufReader::new(stdout).lines();
    let mut result: Option<GpuInfo> = None;
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        let line = line.trim().to_string();
        if line.is_empty() {
            continue;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
            result = Some(GpuInfo {
                available: v["available"].as_bool().unwrap_or(false),
                name: v["name"].as_str().unwrap_or("Unknown").to_string(),
                total_mb: v["total_mb"].as_u64().unwrap_or(0),
                free_mb: v["free_mb"].as_u64().unwrap_or(0),
                allocated_mb: v["allocated_mb"].as_u64().unwrap_or(0),
                reserved_mb: v["reserved_mb"].as_u64().unwrap_or(0),
                device_count: v["device_count"].as_u64().unwrap_or(0) as u32,
            });
            break;
        }
    }
    let _ = child.wait().await;
    result.ok_or_else(|| "gpu_info returned no output".into())
}

/// Look inside the trained model (python/biblelm/inspect_model.py).
#[tauri::command]
async fn lab_inspect(mode: String, text: Option<String>) -> Result<serde_json::Value, String> {
    let root = project_root();
    let mut args = vec![
        mode.clone(),
        "--run-dir".into(),
        run_dir(&root).to_string_lossy().into_owned(),
    ];
    match mode.as_str() {
        "lens" => {
            args.push("--text".into());
            args.push(text.unwrap_or_default());
        }
        "surprise" => {
            args.push("--corpus".into());
            args.push(data_dir(&root).join("kjv.txt").to_string_lossy().into_owned());
        }
        _ => return Err(format!("unknown inspect mode {mode}")),
    }
    py_json(&root, "biblelm.inspect_model", &args, "inspect").await
}

// ── helpers ─────────────────────────────────────────────────────────────

fn kill_pid(pid: u32) {
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .status();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            training: Arc::new(Mutex::new(TrainingState::default())),
        })
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            init_roots(app.handle());
            study::init(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            corpus_status,
            corpus_list,
            corpus_add,
            corpus_download,
            corpus_remove,
            corpus_preview,
            corpus_alphabet,
            train_start,
            train_stop,
            lab_engines,
            inference_generate,
            export_onnx,
            lab_inspect,
            study::notes_load,
            study::notes_save,
            study::notes_export_markdown,
            study::app_data_dir,
            study::jev_available,
            study::jev,
            gpu_info,
            model_status,
            model_import,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BibleLM");
}
