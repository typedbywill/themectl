use crate::error::Result;
use crate::theme::manifest::DesktopEnvironment;
use crate::util::cmd::{kreadconfig5, run};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;

/// Snapshot of the KDE Plasma configuration parameters.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct KdeConfigSnapshot {
    pub plasma_style: Option<String>,
    pub color_scheme: Option<String>,
    pub icon_theme: Option<String>,
    pub cursor_theme: Option<String>,
    pub wallpaper: Option<String>,
    pub gtk_theme: Option<String>,
    pub font_general: Option<String>,
    pub font_fixed: Option<String>,
}

/// A snapshot captures the full appearance configuration state before a theme is applied.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
    pub created_at: DateTime<Utc>,
    pub desktop: DesktopEnvironment,
    pub theme_applied: Option<String>,
    pub kde: KdeConfigSnapshot,
}

/// Creates a new snapshot by reading current settings.
pub fn create_snapshot(theme_applied: Option<String>, desktop: DesktopEnvironment) -> Result<Snapshot> {
    let plasma_style = kreadconfig5("plasmarc", "Theme", "name").ok().filter(|s| !s.is_empty());
    let color_scheme = kreadconfig5("kdeglobals", "General", "ColorScheme").ok().filter(|s| !s.is_empty());
    let icon_theme = kreadconfig5("kdeglobals", "Icons", "Theme").ok().filter(|s| !s.is_empty());
    let cursor_theme = kreadconfig5("kcminputrc", "Mouse", "cursorTheme").ok().filter(|s| !s.is_empty());
    let font_general = kreadconfig5("kdeglobals", "General", "font").ok().filter(|s| !s.is_empty());
    let font_fixed = kreadconfig5("kdeglobals", "General", "fixed").ok().filter(|s| !s.is_empty());

    // GTK Theme reading
    let mut gtk_theme = kreadconfig5("kdeglobals", "GTK", "GTKTheme").ok().filter(|s| !s.is_empty());
    if gtk_theme.is_none() {
        if let Some(config_dir) = dirs::config_dir() {
            let gtk3_ini = config_dir.join("gtk-3.0/settings.ini");
            if gtk3_ini.exists() {
                if let Ok(content) = fs::read_to_string(gtk3_ini) {
                    for line in content.lines() {
                        let trimmed = line.trim();
                        if trimmed.starts_with("gtk-theme-name") {
                            if let Some(val) = trimmed.split('=').nth(1) {
                                gtk_theme = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    let wallpaper = get_wallpaper_path();

    Ok(Snapshot {
        created_at: Utc::now(),
        desktop,
        theme_applied,
        kde: KdeConfigSnapshot {
            plasma_style,
            color_scheme,
            icon_theme,
            cursor_theme,
            wallpaper,
            gtk_theme,
            font_general,
            font_fixed,
        },
    })
}

fn get_wallpaper_path() -> Option<String> {
    // 1. Try DBus command as specified in SPEC
    if let Ok(out) = run("dbus-send", &[
        "--session",
        "--print-reply",
        "--dest=org.kde.plasmashell",
        "/PlasmaShell",
        "org.kde.PlasmaShell.evaluateScript",
        "string:var a = desktops(); print(a[0].wallpaperPlugin)",
    ]) {
        if let Some(start_idx) = out.find("string \"") {
            let content = &out[start_idx + 8..];
            if let Some(end_idx) = content.find('"') {
                let val = &content[..end_idx];
                if val.starts_with('/') || val.starts_with("file://") {
                    let cleaned = if val.starts_with("file://") { &val[7..] } else { val };
                    return Some(cleaned.to_string());
                }
            }
        }
    }

    // 2. Try the actual DBus script to query wallpaper Image path
    let script = "var a = desktops(); var d = a[0]; d.currentConfigGroup = Array('Wallpaper', 'org.kde.image', 'General'); d.readConfig('Image')";
    if let Ok(out) = run("dbus-send", &[
        "--session",
        "--print-reply",
        "--dest=org.kde.plasmashell",
        "/PlasmaShell",
        "org.kde.PlasmaShell.evaluateScript",
        &format!("string:{}", script),
    ]) {
        if let Some(start_idx) = out.find("string \"") {
            let content = &out[start_idx + 8..];
            if let Some(end_idx) = content.find('"') {
                let val = &content[..end_idx];
                if !val.is_empty() {
                    let cleaned = if val.starts_with("file://") { &val[7..] } else { val };
                    return Some(cleaned.to_string());
                }
            }
        }
    }

    // 3. Fallback to parsing ~/.config/plasma-org.kde.plasma.desktop-appletsrc
    if let Some(config_dir) = dirs::config_dir() {
        let appletsrc = config_dir.join("plasma-org.kde.plasma.desktop-appletsrc");
        if appletsrc.exists() {
            if let Ok(content) = fs::read_to_string(appletsrc) {
                let mut in_wallpaper_group = false;
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with('[') && trimmed.ends_with(']') {
                        if trimmed.contains("Wallpaper") || trimmed.contains("org.kde.image") {
                            in_wallpaper_group = true;
                        } else {
                            in_wallpaper_group = false;
                        }
                    }
                    if in_wallpaper_group && trimmed.starts_with("Image=") {
                        let path = trimmed["Image=".len()..].trim();
                        let cleaned = if path.starts_with("file://") { &path[7..] } else { path };
                        if !cleaned.is_empty() {
                            return Some(cleaned.to_string());
                        }
                    }
                }
            }
        }
    }

    None
}
