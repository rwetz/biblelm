//! Study-side commands: durable notes, Markdown export, and the one optional
//! network call (Jev). Reading and searching need none of this: the Bible data
//! is static files in the bundle.
//!
//! Notes are the one irreplaceable thing the app holds, so writes are atomic
//! (temp file + rename) and the previous file is copied to a dated backup once
//! a day, keeping the newest 14.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Deserialize;
use tauri::{AppHandle, Manager};

static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

/// Called once from setup(): the per-user app data folder (created if missing).
pub fn init(app: &AppHandle) {
    if let Ok(dir) = app.path().app_data_dir() {
        let _ = fs::create_dir_all(&dir);
        let _ = DATA_DIR.set(dir);
    }
}

fn data_dir() -> Result<&'static PathBuf, String> {
    DATA_DIR.get().ok_or_else(|| "app data folder unavailable".into())
}

const NOTES: &str = "notes.json";
const KEEP_BACKUPS: usize = 14;

fn today() -> String {
    // Days since the epoch is enough for a once-a-day backup name; formatted
    // as a civil date so the files sort and read naturally.
    let days = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() / 86_400;
    let (y, m, d) = civil_from_days(days as i64);
    format!("{y:04}-{m:02}-{d:02}")
}

/// Howard Hinnant's days-to-civil algorithm.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (yoe + era * 400 + i64::from(m <= 2), m, d)
}

fn backup_once_a_day(dir: &Path, current: &Path) -> std::io::Result<()> {
    if !current.exists() {
        return Ok(());
    }
    let backups = dir.join("backups");
    fs::create_dir_all(&backups)?;
    let target = backups.join(format!("notes-{}.json", today()));
    if !target.exists() {
        fs::copy(current, &target)?;
    }
    let mut all: Vec<_> = fs::read_dir(&backups)?
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.file_name().and_then(|n| n.to_str()).is_some_and(|n| n.starts_with("notes-")))
        .collect();
    all.sort();
    while all.len() > KEEP_BACKUPS {
        let _ = fs::remove_file(all.remove(0));
    }
    Ok(())
}

/// Write via a temp file and rename, so a crash mid-write never leaves a
/// truncated notes file behind.
pub fn write_atomic(path: &Path, contents: &str) -> std::io::Result<()> {
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, contents)?;
    fs::rename(&tmp, path)
}

#[tauri::command]
pub fn notes_load() -> Result<Option<String>, String> {
    let path = data_dir()?.join(NOTES);
    match fs::read_to_string(&path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("could not read {}: {e}", path.display())),
    }
}

#[tauri::command]
pub fn notes_save(json: String) -> Result<(), String> {
    // Refuse anything that is not a JSON object: a bug upstream must not be
    // able to replace the notes file with garbage.
    let parsed: serde_json::Value = serde_json::from_str(&json).map_err(|e| format!("notes are not valid JSON: {e}"))?;
    if !parsed.is_object() {
        return Err("notes must be a JSON object".into());
    }
    let dir = data_dir()?;
    let path = dir.join(NOTES);
    backup_once_a_day(dir, &path).map_err(|e| format!("backup failed, nothing written: {e}"))?;
    write_atomic(&path, &json).map_err(|e| format!("could not save notes: {e}"))
}

#[derive(Deserialize)]
pub struct ExportFile {
    path: String,
    body: String,
}

/// Write a notebook as Markdown under <app data>/exports/, returning the folder.
#[tauri::command]
pub fn notes_export_markdown(files: Vec<ExportFile>) -> Result<String, String> {
    let root = data_dir()?.join("exports");
    let mut top: Option<PathBuf> = None;
    for f in files {
        // Only plain relative paths: no "..", no absolute paths.
        let rel = Path::new(&f.path);
        if rel.is_absolute() || rel.components().any(|c| !matches!(c, std::path::Component::Normal(_))) {
            return Err(format!("refusing to write outside the export folder: {}", f.path));
        }
        let dest = root.join(rel);
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            top.get_or_insert_with(|| parent.to_path_buf());
        }
        fs::write(&dest, f.body).map_err(|e| e.to_string())?;
    }
    Ok(top.unwrap_or(root).to_string_lossy().into_owned())
}

#[tauri::command]
pub fn app_data_dir() -> Result<String, String> {
    Ok(data_dir()?.to_string_lossy().into_owned())
}

fn agent() -> ureq::Agent {
    ureq::AgentBuilder::new().timeout(Duration::from_secs(120)).build()
}

// ── Jev (TypeSafe System One) ─────────────────────────────────────────

const JEV_ENDPOINT: &str = "https://api.typesafe.ai/v1/systemone";

#[tauri::command]
pub fn jev_available() -> bool {
    std::env::var("TYPESAFE_API_KEY").is_ok_and(|k| !k.trim().is_empty())
}

/// One bounded judgment. The key comes from the user's environment and never
/// crosses into the webview; only the request body (a short query, or verse
/// references with their text) leaves the machine.
#[tauri::command]
pub async fn jev(task: String, input: serde_json::Value) -> Result<serde_json::Value, String> {
    let key = std::env::var("TYPESAFE_API_KEY").map_err(|_| "TYPESAFE_API_KEY is not set".to_string())?;
    if !matches!(task.as_str(), "route" | "rerank") {
        return Err(format!("unknown Jev task {task}"));
    }
    tauri::async_runtime::spawn_blocking(move || {
        agent()
            .post(JEV_ENDPOINT)
            .set("Authorization", &format!("Bearer {key}"))
            .set("Content-Type", "application/json")
            .send_json(input)
            .map_err(|e| format!("Jev request failed: {e}"))?
            .into_json::<serde_json::Value>()
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn civil_dates() {
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        assert_eq!(civil_from_days(20_746), (2026, 10, 20));
        assert_eq!(civil_from_days(11_016), (2000, 2, 29));
    }

    #[test]
    fn atomic_write_replaces_whole_file() {
        let dir = std::env::temp_dir().join(format!("biblelm-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let p = dir.join("notes.json");
        write_atomic(&p, "{\"a\":1}").unwrap();
        write_atomic(&p, "{\"b\":2}").unwrap();
        assert_eq!(fs::read_to_string(&p).unwrap(), "{\"b\":2}");
        assert!(!p.with_extension("json.tmp").exists());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn backups_are_capped() {
        let dir = std::env::temp_dir().join(format!("biblelm-bk-{}", std::process::id()));
        let b = dir.join("backups");
        fs::create_dir_all(&b).unwrap();
        for i in 0..20 {
            fs::write(b.join(format!("notes-2000-01-{i:02}.json")), "{}").unwrap();
        }
        let cur = dir.join("notes.json");
        fs::write(&cur, "{}").unwrap();
        backup_once_a_day(&dir, &cur).unwrap();
        assert_eq!(fs::read_dir(&b).unwrap().count(), KEEP_BACKUPS);
        let _ = fs::remove_dir_all(dir);
    }
}
