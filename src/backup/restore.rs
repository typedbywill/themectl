use crate::error::Result;
use crate::backup::snapshot::Snapshot;
use crate::util::cmd::{run, check_tool};

/// Restores a system configuration from a snapshot.
pub fn restore_snapshot(snapshot: &Snapshot) -> Result<()> {
    let kde = &snapshot.kde;

    if let Some(ref val) = kde.font_general {
        let _ = run("kwriteconfig5", &["--file", "kdeglobals", "--group", "General", "--key", "font", val]);
    }
    if let Some(ref val) = kde.font_fixed {
        let _ = run("kwriteconfig5", &["--file", "kdeglobals", "--group", "General", "--key", "fixed", val]);
    }

    if let Some(ref val) = kde.plasma_style {
        if check_tool("plasma-apply-desktoptheme") {
            let _ = run("plasma-apply-desktoptheme", &[val]);
        } else {
            let _ = run("kwriteconfig5", &["--file", "plasmarc", "--group", "Theme", "--key", "name", val]);
        }
    }

    if let Some(ref val) = kde.color_scheme {
        if check_tool("plasma-apply-colorscheme") {
            let _ = run("plasma-apply-colorscheme", &[val]);
        } else {
            let _ = run("kwriteconfig5", &["--file", "kdeglobals", "--group", "General", "--key", "ColorScheme", val]);
        }
    }

    if let Some(ref val) = kde.icon_theme {
        let _ = run("kwriteconfig5", &["--file", "kdeglobals", "--group", "Icons", "--key", "Theme", val]);
    }

    if let Some(ref val) = kde.cursor_theme {
        let _ = run("kwriteconfig5", &["--file", "kcminputrc", "--group", "Mouse", "--key", "cursorTheme", val]);
    }

    if let Some(ref val) = kde.gtk_theme {
        if check_tool("gsettings") {
            let _ = run("gsettings", &["set", "org.gnome.desktop.interface", "gtk-theme", val]);
        }
        if let Some(config_dir) = dirs::config_dir() {
            let gtk4_ini = config_dir.join("gtk-4.0/settings.ini");
            let path_str = gtk4_ini.to_str().unwrap_or("~/.config/gtk-4.0/settings.ini");
            let _ = run("kwriteconfig5", &[
                "--file",
                path_str,
                "--group",
                "Settings",
                "--key",
                "gtk-theme-name",
                val,
            ]);
        }
    }

    if let Some(ref val) = kde.wallpaper {
        let script = format!(
            "var allDesktops = desktops(); for (var i=0; i<allDesktops.length; i++) {{ var d = allDesktops[i]; d.wallpaperPlugin = 'org.kde.image'; d.currentConfigGroup = Array('Wallpaper', 'org.kde.image', 'General'); d.writeConfig('Image', 'file://{}'); }}",
            val
        );
        if check_tool("qdbus") {
            let _ = run("qdbus", &["org.kde.plasmashell", "/PlasmaShell", "org.kde.PlasmaShell.evaluateScript", &script]);
        } else {
            let _ = run("dbus-send", &[
                "--session",
                "--print-reply",
                "--dest=org.kde.plasmashell",
                "/PlasmaShell",
                "org.kde.PlasmaShell.evaluateScript",
                &format!("string:{}", script),
            ]);
        }
    }

    // Reload window manager configuration to apply icon/cursor changes
    let _ = run("dbus-send", &[
        "--session",
        "--print-reply",
        "--dest=org.kde.KWin",
        "/KWin",
        "org.kde.KWin.reloadConfig",
    ]);

    Ok(())
}
