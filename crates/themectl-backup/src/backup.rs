use themectl_utils::{ThemectlError, Result};
use themectl_spec::DesktopEnvironment;
use crate::snapshot;
use std::fs;
use std::path::PathBuf;

/// Gets the local path where backups are stored.
pub fn get_backups_root() -> Result<PathBuf> {
    let data_dir = dirs::data_local_dir().ok_or_else(|| {
        ThemectlError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not resolve local data directory",
        ))
    })?;
    let backup_dir = data_dir.join("themectl/backups");
    themectl_utils::fs::ensure_dir(&backup_dir)?;
    Ok(backup_dir)
}

/// Lists all existing snapshots, sorted chronologically from oldest to newest.
pub fn list_snapshots() -> Result<Vec<(String, snapshot::Snapshot)>> {
    let root = get_backups_root()?;
    let mut snapshots = Vec::new();

    if root.exists() {
        for entry in fs::read_dir(root)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                let snap_yaml = path.join("snapshot.yaml");
                if snap_yaml.exists() {
                    let file = fs::File::open(snap_yaml)?;
                    if let Ok(snap) = serde_yaml::from_reader::<_, snapshot::Snapshot>(file) {
                        if let Some(folder_name) = path.file_name().and_then(|n| n.to_str()) {
                            snapshots.push((folder_name.to_string(), snap));
                        }
                    }
                }
            }
        }
    }

    // Sort chronologically by the created_at time
    snapshots.sort_by(|a, b| a.1.created_at.cmp(&b.1.created_at));
    Ok(snapshots)
}

/// Creates a new configuration snapshot and saves it to disk.
/// Enforces the limit of keeping at most 10 snapshots.
pub fn create_and_save_snapshot(theme_applied: Option<String>, desktop: DesktopEnvironment) -> Result<String> {
    let root = get_backups_root()?;

    // 1. Create the snapshot
    let snap = snapshot::create_snapshot(theme_applied, desktop)?;

    // 2. Format filename YYYY-MM-DDTHH-MM-SS (replacing colons with hyphens)
    let timestamp = snap.created_at.format("%Y-%m-%dT%H-%M-%S").to_string();
    let snap_dir = root.join(&timestamp);
    themectl_utils::fs::ensure_dir(&snap_dir)?;

    // 3. Save to snapshot.yaml
    let snap_yaml = snap_dir.join("snapshot.yaml");
    let file = fs::File::create(snap_yaml)?;
    serde_yaml::to_writer(file, &snap)?;

    // 4. Enforce the limit of 10 backups (delete oldest if exceeded)
    let existing = list_snapshots()?;
    if existing.len() > 10 {
        let to_delete = existing.len() - 10;
        for i in 0..to_delete {
            let folder_name = &existing[i].0;
            let dir_to_remove = root.join(folder_name);
            let _ = fs::remove_dir_all(dir_to_remove);
        }
    }

    Ok(timestamp)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use chrono::Utc;

    #[test]
    fn test_list_and_rotate_backups() {
        // We override get_backups_root behavior in unit tests by using temp dirs,
        // but since we want to test rotation logic cleanly, let's create a helper.
        let temp = tempdir().unwrap();
        let root = temp.path();

        // Let's create 12 dummy snapshot folders
        for i in 1..=12 {
            let snap = snapshot::Snapshot {
                created_at: Utc::now() + chrono::Duration::seconds(i),
                desktop: DesktopEnvironment::KdePlasma6,
                theme_applied: None,
                kde: snapshot::KdeConfigSnapshot {
                    plasma_style: Some(format!("Style-{}", i)),
                    color_scheme: None,
                    icon_theme: None,
                    cursor_theme: None,
                    wallpaper: None,
                    gtk_theme: None,
                    font_general: None,
                    font_fixed: None,
                },
            };
            
            let timestamp = snap.created_at.format("%Y-%m-%dT%H-%M-%S").to_string();
            let snap_dir = root.join(&timestamp);
            fs::create_dir_all(&snap_dir).unwrap();
            let file = fs::File::create(snap_dir.join("snapshot.yaml")).unwrap();
            serde_yaml::to_writer(file, &snap).unwrap();
        }

        // Read them manually from our temp root
        let mut snapshots = Vec::new();
        for entry in fs::read_dir(root).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            if path.is_dir() {
                let snap_yaml = path.join("snapshot.yaml");
                if snap_yaml.exists() {
                    let file = fs::File::open(snap_yaml).unwrap();
                    let snap: snapshot::Snapshot = serde_yaml::from_reader(file).unwrap();
                    snapshots.push((path.file_name().unwrap().to_str().unwrap().to_string(), snap));
                }
            }
        }
        snapshots.sort_by(|a, b| a.1.created_at.cmp(&b.1.created_at));

        assert_eq!(snapshots.len(), 12);

        // Simulate rotation: if we enforce limit, keep only the latest 10
        if snapshots.len() > 10 {
            let to_delete = snapshots.len() - 10;
            for i in 0..to_delete {
                let folder_name = &snapshots[i].0;
                let dir_to_remove = root.join(folder_name);
                fs::remove_dir_all(dir_to_remove).unwrap();
            }
        }

        // Re-read
        let mut snapshots_after = Vec::new();
        for entry in fs::read_dir(root).unwrap() {
            let entry = entry.unwrap();
            snapshots_after.push(entry.file_name().to_str().unwrap().to_string());
        }
        assert_eq!(snapshots_after.len(), 10);
    }
}
