use themectl_utils::Result;
use themectl_utils::cmd::kreadconfig5;
use themectl_utils::compat::get_current_distros;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LockDetails {
    pub plasma: Option<String>,
    pub kvantum: Option<String>,
    pub icons: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Lockfile {
    pub lock: LockDetails,
}

fn detect_plasma_version() -> Option<String> {
    if let Ok(output) = std::process::Command::new("plasmashell").arg("--version").output() {
        if output.status.success() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = out_str.trim().split_whitespace().collect();
            if parts.len() >= 2 {
                return Some(parts[1].to_string());
            }
        }
    }
    None
}

fn detect_kvantum_version() -> Option<String> {
    if let Ok(output) = std::process::Command::new("kvantummanager").arg("--version").output() {
        if output.status.success() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = out_str.trim().split_whitespace().collect();
            if parts.len() >= 3 {
                return Some(parts[2].to_string());
            }
        }
    }
    None
}

fn detect_icons_version() -> Option<String> {
    let icon_theme = kreadconfig5("kdeglobals", "Icons", "Theme").ok().filter(|s| !s.is_empty())?;
    let theme_lower = icon_theme.to_lowercase();
    let pkg_name = if theme_lower.starts_with("papirus") {
        "papirus-icon-theme".to_string()
    } else if theme_lower.starts_with("breeze") {
        "breeze-icon-theme".to_string()
    } else {
        format!("{}-icon-theme", theme_lower)
    };

    let distros = get_current_distros();
    let clean_version = |out: &str| -> Option<String> {
        let parts: Vec<&str> = out.trim().split('-').collect();
        if parts.len() >= 3 {
            return Some(parts[parts.len() - 2].to_string());
        }
        Some(out.trim().to_string())
    };

    if distros.contains(&"fedora".to_string()) || distros.contains(&"rhel".to_string()) {
        if let Ok(output) = std::process::Command::new("rpm").args(&["-q", &pkg_name]).output() {
            if output.status.success() {
                return clean_version(&String::from_utf8_lossy(&output.stdout));
            }
        }
        if let Ok(output) = std::process::Command::new("rpm").args(&["-q", &theme_lower]).output() {
            if output.status.success() {
                return clean_version(&String::from_utf8_lossy(&output.stdout));
            }
        }
    } else if distros.contains(&"arch".to_string()) {
        if let Ok(output) = std::process::Command::new("pacman").args(&["-Q", &pkg_name]).output() {
            if output.status.success() {
                let out_str = String::from_utf8_lossy(&output.stdout);
                let parts: Vec<&str> = out_str.trim().split_whitespace().collect();
                if parts.len() >= 2 {
                    return Some(parts[1].to_string());
                }
            }
        }
    } else if distros.contains(&"debian".to_string()) || distros.contains(&"ubuntu".to_string()) {
        if let Ok(output) = std::process::Command::new("dpkg-query").args(&["-W", "-f=${Version}", &pkg_name]).output() {
            if output.status.success() {
                return Some(String::from_utf8_lossy(&output.stdout).trim().to_string());
            }
        }
    }

    None
}

/// Generates a lockfile based on the active system packages and configurations.
pub fn generate_lockfile() -> Lockfile {
    Lockfile {
        lock: LockDetails {
            plasma: detect_plasma_version(),
            kvantum: detect_kvantum_version(),
            icons: detect_icons_version(),
        },
    }
}

/// Writes the lockfile to the specified path in YAML format.
pub fn write_lockfile(path: &Path, lockfile: &Lockfile) -> Result<()> {
    let file = File::create(path)?;
    serde_yaml::to_writer(file, lockfile)?;
    Ok(())
}

/// Loads a lockfile from a path.
pub fn load_lockfile(path: &Path) -> Result<Lockfile> {
    let file = File::open(path)?;
    let lockfile: Lockfile = serde_yaml::from_reader(file)?;
    Ok(lockfile)
}
