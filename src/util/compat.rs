use std::fs::File;
use std::io::{BufRead, BufReader};
use crate::util::cmd::check_tool;

/// Reads /etc/os-release to detect the current system's distro and base distros.
pub fn get_current_distros() -> Vec<String> {
    let mut distros = Vec::new();
    if let Ok(file) = File::open("/etc/os-release") {
        let reader = BufReader::new(file);
        for line in reader.lines().map_while(Result::ok) {
            if line.starts_with("ID=") {
                let val = line.trim_start_matches("ID=").trim_matches('"').to_lowercase();
                if !val.is_empty() {
                    distros.push(val);
                }
            } else if line.starts_with("ID_LIKE=") {
                let val = line.trim_start_matches("ID_LIKE=").trim_matches('"').to_lowercase();
                for part in val.split_whitespace() {
                    let cleaned = part.trim_matches('"');
                    if !cleaned.is_empty() {
                        distros.push(cleaned.to_string());
                    }
                }
            }
        }
    }
    distros
}

fn parse_version(v: &str) -> Vec<u32> {
    v.split('.')
        .map(|s| s.parse::<u32>().unwrap_or(0))
        .collect()
}

/// Checks if the current version satisfies min and max version constraints.
/// Supports wildcard segments in max version (e.g. "6.x" or "6.*").
pub fn is_version_compatible(current: &str, min: Option<&str>, max: Option<&str>) -> bool {
    let cur_parts = parse_version(current);

    if let Some(min_str) = min {
        let min_parts = parse_version(min_str);
        let len = std::cmp::max(cur_parts.len(), min_parts.len());
        let mut cur_padded = cur_parts.clone();
        cur_padded.resize(len, 0);
        let mut min_padded = min_parts;
        min_padded.resize(len, 0);
        if cur_padded < min_padded {
            return false;
        }
    }

    if let Some(max_str) = max {
        if max_str.contains('x') || max_str.contains('*') {
            let max_parts: Vec<&str> = max_str.split('.').collect();
            for (i, part) in max_parts.iter().enumerate() {
                if *part == "x" || *part == "*" {
                    break;
                }
                let part_num = part.parse::<u32>().unwrap_or(0);
                if i >= cur_parts.len() || cur_parts[i] != part_num {
                    return false;
                }
            }
        } else {
            let max_parts = parse_version(max_str);
            let len = std::cmp::max(cur_parts.len(), max_parts.len());
            let mut cur_padded = cur_parts;
            cur_padded.resize(len, 0);
            let mut max_padded = max_parts;
            max_padded.resize(len, 0);
            if cur_padded > max_padded {
                return false;
            }
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_version_compatible() {
        assert!(is_version_compatible("6.7.0", Some("6.0"), Some("6.x")));
        assert!(is_version_compatible("6.7.0", Some("6.0"), Some("6.99")));
        assert!(!is_version_compatible("7.0.0", Some("6.0"), Some("6.x")));
        assert!(is_version_compatible("6.0.0", Some("6.0"), Some("6.0")));
        assert!(!is_version_compatible("5.27.0", Some("6.0"), None));
        assert!(is_version_compatible("6.4.2", None, Some("6.4.*")));
        assert!(!is_version_compatible("6.5.0", None, Some("6.4.*")));
    }
}

/// Checks if a font is installed on the system using fc-list.
pub fn is_font_installed(font_name: &str) -> bool {
    if !check_tool("fc-list") {
        return false;
    }
    if let Ok(output) = std::process::Command::new("fc-list")
        .args(&[":", "family"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
        stdout.contains(&font_name.to_lowercase())
    } else {
        false
    }
}

/// Checks if an icon theme folder exists locally or in system directories.
pub fn is_icon_theme_installed(theme_name: &str) -> bool {
    let local_icons = dirs::data_local_dir().map(|d| d.join("icons")).unwrap_or_default();
    let system_icons = std::path::Path::new("/usr/share/icons");
    let pixmaps = std::path::Path::new("/usr/share/pixmaps");
    
    let check_dir = |dir: &std::path::Path| -> bool {
        if !dir.exists() {
            return false;
        }
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                if entry.file_name().to_string_lossy().to_lowercase() == theme_name.to_lowercase() {
                    return true;
                }
            }
        }
        false
    };
    
    check_dir(&local_icons) || check_dir(system_icons) || check_dir(pixmaps)
}

/// Checks if a package is installed using the system package manager or as a CLI tool.
pub fn is_package_installed(pkg_name: &str) -> bool {
    if check_tool(pkg_name) {
        return true;
    }
    let distros = get_current_distros();
    if distros.contains(&"fedora".to_string()) || distros.contains(&"rhel".to_string()) {
        std::process::Command::new("rpm")
            .args(&["-q", pkg_name])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else if distros.contains(&"arch".to_string()) {
        std::process::Command::new("pacman")
            .args(&["-Q", pkg_name])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else if distros.contains(&"debian".to_string()) || distros.contains(&"ubuntu".to_string()) {
        std::process::Command::new("dpkg")
            .args(&["-s", pkg_name])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else {
        false
    }
}

