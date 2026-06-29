use themectl_utils::Result;
use themectl_spec::DesktopEnvironment;
use std::env;
use std::process::Command;

/// Detects the current desktop environment.
pub fn detect() -> Result<DesktopEnvironment> {
    // 1. Check XDG_CURRENT_DESKTOP
    if let Ok(xdg) = env::var("XDG_CURRENT_DESKTOP") {
        let xdg_lower = xdg.to_lowercase();
        if xdg_lower.contains("kde") {
            if let Ok(ver) = env::var("KDE_SESSION_VERSION") {
                if ver == "6" {
                    return Ok(DesktopEnvironment::KdePlasma6);
                } else if ver == "5" {
                    return Ok(DesktopEnvironment::KdePlasma5);
                }
            }
            if is_plasmashell_running() {
                return Ok(DesktopEnvironment::KdePlasma6);
            }
        }
    }

    // 2. Check KDE_SESSION_VERSION
    if let Ok(ver) = env::var("KDE_SESSION_VERSION") {
        if ver == "6" {
            return Ok(DesktopEnvironment::KdePlasma6);
        } else if ver == "5" {
            return Ok(DesktopEnvironment::KdePlasma5);
        }
    }

    // 3. Check for plasmashell process
    if is_plasmashell_running() {
        return Ok(DesktopEnvironment::KdePlasma6);
    }

    let current = env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| "unknown".to_string());
    Ok(DesktopEnvironment::Unknown(current))
}

fn is_plasmashell_running() -> bool {
    Command::new("pgrep")
        .arg("plasmashell")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_with_env() {
        // Temporarily set env vars
        env::set_var("XDG_CURRENT_DESKTOP", "KDE");
        env::set_var("KDE_SESSION_VERSION", "6");
        assert_eq!(detect().unwrap(), DesktopEnvironment::KdePlasma6);

        env::set_var("KDE_SESSION_VERSION", "5");
        assert_eq!(detect().unwrap(), DesktopEnvironment::KdePlasma5);

        env::remove_var("KDE_SESSION_VERSION");
        env::set_var("XDG_CURRENT_DESKTOP", "GNOME");
        if is_plasmashell_running() {
            assert_eq!(detect().unwrap(), DesktopEnvironment::KdePlasma6);
        } else {
            assert!(matches!(detect().unwrap(), DesktopEnvironment::Unknown(_)));
        }

        env::remove_var("XDG_CURRENT_DESKTOP");
    }
}
