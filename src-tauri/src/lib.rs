use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State, Window};
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

/// Project root. Overridable with `BIBLELM_ROOT`; in `tauri dev` it falls back
/// to the parent of the crate manifest dir (i.e. the repo root).
fn project_root() -> PathBuf {
    if let Ok(r) = std::env::var("BIBLELM_ROOT") {
        return PathBuf::from(r);
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."))
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
        .env("PYTHONPATH", root.join("python"))
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
    if !run.join("ckpt.pt").exists() {
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
        .invoke_handler(tauri::generate_handler![
            corpus_status,
            corpus_list,
            corpus_add,
            corpus_download,
            train_start,
            train_stop,
            inference_generate,
            export_onnx,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BibleLM");
}
