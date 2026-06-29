use crate::error::Result;
use crate::theme::manifest::ThemeManifest;
use crate::util::cmd::{check_tool, run};
use crate::util::fs::{copy_dir, ensure_dir};
use std::path::Path;

#[derive(Debug, Clone, Default)]
pub struct ApplyOptions {
    pub dry_run: bool,
    pub components: Option<Vec<String>>,
}

#[derive(Debug, Clone, Default)]
pub struct ApplyReport {
    pub applied: Vec<String>,
    pub skipped: Vec<String>,
    pub warnings: Vec<String>,
}

/// Applies the theme configurations to the KDE Plasma desktop.
pub fn apply(theme_dir: &Path, manifest: &ThemeManifest, opts: ApplyOptions) -> Result<ApplyReport> {
    let mut report = ApplyReport::default();

    let components_to_apply = opts.components.as_ref();
    let is_enabled = |name: &str| -> bool {
        match components_to_apply {
            Some(list) => list.contains(&name.to_string()),
            None => true,
        }
    };

    let local_data = dirs::data_local_dir().ok_or_else(|| {
        crate::error::ThemectlError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not resolve local data directory",
        ))
    })?;

    if let Some(ref comp) = manifest.components {
        // 1. fonts
        if is_enabled("fonts") {
            if let Some(ref fonts_list) = comp.fonts {
                if check_tool("fc-cache") {
                    let fonts_dest = local_data.join("fonts");
                    report.applied.push("fonts".to_string());
                    if !opts.dry_run {
                        ensure_dir(&fonts_dest)?;
                        for font_path in fonts_list {
                            let clean_p = if font_path.starts_with("./") { &font_path[2..] } else { font_path };
                            let src_file = theme_dir.join(clean_p);
                            if src_file.exists() {
                                let filename = src_file.file_name().unwrap();
                                std::fs::copy(&src_file, fonts_dest.join(filename))?;
                            } else {
                                report.warnings.push(format!("Font file not found: {:?}", src_file));
                            }
                        }
                        let _ = run("fc-cache", &["-fv", fonts_dest.to_str().unwrap()]);
                    }
                } else {
                    report.skipped.push("fonts".to_string());
                    report.warnings.push("fc-cache not found".to_string());
                }
            }
        }

        // 2. plasma_style
        if is_enabled("plasma_style") {
            if let Some(ref plasma_style_path) = comp.plasma_style {
                if check_tool("plasma-apply-desktoptheme") {
                    report.applied.push("plasma_style".to_string());
                    if !opts.dry_run {
                        let clean_p = if plasma_style_path.starts_with("./") { &plasma_style_path[2..] } else { plasma_style_path };
                        let src_dir = theme_dir.join(clean_p);
                        let dest_dir = local_data.join("plasma/desktoptheme").join(&manifest.name);
                        if src_dir.exists() {
                            copy_dir(&src_dir, &dest_dir)?;
                            let _ = run("plasma-apply-desktoptheme", &[&manifest.name]);
                        } else {
                            report.warnings.push(format!("Plasma style dir not found: {:?}", src_dir));
                        }
                    }
                } else {
                    report.skipped.push("plasma_style".to_string());
                    report.warnings.push("plasma-apply-desktoptheme not found".to_string());
                }
            }
        }

        // 3. color_scheme
        if is_enabled("color_scheme") {
            if let Some(ref color_scheme_path) = comp.color_scheme {
                if check_tool("plasma-apply-colorscheme") {
                    report.applied.push("color_scheme".to_string());
                    if !opts.dry_run {
                        let clean_p = if color_scheme_path.starts_with("./") { &color_scheme_path[2..] } else { color_scheme_path };
                        let src_file = theme_dir.join(clean_p);
                        if src_file.exists() {
                            let filename = src_file.file_name().unwrap();
                            let dest_file = local_data.join("color-schemes").join(filename);
                            ensure_dir(&local_data.join("color-schemes"))?;
                            std::fs::copy(&src_file, &dest_file)?;

                            // Apply using the file name stem (usually the theme name)
                            let stem = Path::new(filename).file_stem().unwrap().to_str().unwrap();
                            let _ = run("plasma-apply-colorscheme", &[stem]);
                        } else {
                            report.warnings.push(format!("Color scheme file not found: {:?}", src_file));
                        }
                    }
                } else {
                    report.skipped.push("color_scheme".to_string());
                    report.warnings.push("plasma-apply-colorscheme not found".to_string());
                }
            }
        }

        // 4. icon_theme
        if is_enabled("icon_theme") {
            if let Some(ref icon_theme_path) = comp.icon_theme {
                if check_tool("kwriteconfig5") {
                    report.applied.push("icon_theme".to_string());
                    if !opts.dry_run {
                        let name_to_apply = if icon_theme_path.starts_with("./") || icon_theme_path.starts_with("../") {
                            // Copy local folder to ~/.local/share/icons/<manifest.name>/
                            let clean_p = if icon_theme_path.starts_with("./") { &icon_theme_path[2..] } else { icon_theme_path };
                            let src_dir = theme_dir.join(clean_p);
                            let dest_dir = local_data.join("icons").join(&manifest.name);
                            if src_dir.exists() {
                                copy_dir(&src_dir, &dest_dir)?;
                            } else {
                                report.warnings.push(format!("Icon theme dir not found: {:?}", src_dir));
                            }
                            manifest.name.clone()
                        } else {
                            // System icon theme name
                            icon_theme_path.clone()
                        };

                        let _ = run("kwriteconfig5", &["--file", "kdeglobals", "--group", "Icons", "--key", "Theme", &name_to_apply]);
                        let _ = run("dbus-send", &["--session", "--print-reply", "--dest=org.kde.KWin", "/KWin", "org.kde.KWin.reloadConfig"]);
                    }
                } else {
                    report.skipped.push("icon_theme".to_string());
                    report.warnings.push("kwriteconfig5 not found".to_string());
                }
            }
        }

        // 5. cursor_theme
        if is_enabled("cursor_theme") {
            if let Some(ref cursor_theme_path) = comp.cursor_theme {
                if check_tool("kwriteconfig5") {
                    report.applied.push("cursor_theme".to_string());
                    if !opts.dry_run {
                        let name_to_apply = if cursor_theme_path.starts_with("./") || cursor_theme_path.starts_with("../") {
                            // Copy local folder to ~/.local/share/icons/<manifest.name>-cursors/
                            let clean_p = if cursor_theme_path.starts_with("./") { &cursor_theme_path[2..] } else { cursor_theme_path };
                            let src_dir = theme_dir.join(clean_p);
                            let folder_name = format!("{}-cursors", manifest.name);
                            let dest_dir = local_data.join("icons").join(&folder_name);
                            if src_dir.exists() {
                                copy_dir(&src_dir, &dest_dir)?;
                            } else {
                                report.warnings.push(format!("Cursor theme dir not found: {:?}", src_dir));
                            }
                            folder_name
                        } else {
                            cursor_theme_path.clone()
                        };

                        let _ = run("kwriteconfig5", &["--file", "kcminputrc", "--group", "Mouse", "--key", "cursorTheme", &name_to_apply]);
                    }
                } else {
                    report.skipped.push("cursor_theme".to_string());
                    report.warnings.push("kwriteconfig5 not found".to_string());
                }
            }
        }

        // 6. kvantum_theme
        if is_enabled("kvantum_theme") {
            if let Some(ref kvantum_theme_path) = comp.kvantum_theme {
                if check_tool("kvantummanager") {
                    report.applied.push("kvantum_theme".to_string());
                    if !opts.dry_run {
                        let clean_p = if kvantum_theme_path.starts_with("./") { &kvantum_theme_path[2..] } else { kvantum_theme_path };
                        let src_dir = theme_dir.join(clean_p);
                        let config_dir = dirs::config_dir().ok_or_else(|| {
                            crate::error::ThemectlError::Io(std::io::Error::new(
                                std::io::ErrorKind::NotFound,
                                "Could not resolve config directory",
                            ))
                        })?;
                        let dest_dir = config_dir.join("Kvantum").join(&manifest.name);
                        if src_dir.exists() {
                            copy_dir(&src_dir, &dest_dir)?;
                            let _ = run("kvantummanager", &["--set", &manifest.name]);
                            let _ = run("kwriteconfig5", &["--file", "kdeglobals", "--group", "KDE", "--key", "widgetStyle", "kvantum-dark"]);
                        } else {
                            report.warnings.push(format!("Kvantum theme dir not found: {:?}", src_dir));
                        }
                    }
                } else {
                    report.skipped.push("kvantum_theme".to_string());
                    report.warnings.push("kvantum not found".to_string());
                }
            }
        }

        // 7. gtk_theme
        if is_enabled("gtk_theme") {
            if let Some(ref gtk_theme_path) = comp.gtk_theme {
                let home = dirs::home_dir().ok_or_else(|| {
                    crate::error::ThemectlError::Io(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        "Could not resolve home directory",
                    ))
                })?;
                report.applied.push("gtk_theme".to_string());
                if !opts.dry_run {
                    let clean_p = if gtk_theme_path.starts_with("./") { &gtk_theme_path[2..] } else { gtk_theme_path };
                    let src_dir = theme_dir.join(clean_p);
                    let dest_dir = home.join(".themes").join(&manifest.name);
                    if src_dir.exists() {
                        copy_dir(&src_dir, &dest_dir)?;
                        if check_tool("gsettings") {
                            let _ = run("gsettings", &["set", "org.gnome.desktop.interface", "gtk-theme", &manifest.name]);
                        }
                        if let Some(config_dir) = dirs::config_dir() {
                            let gtk4_ini = config_dir.join("gtk-4.0/settings.ini");
                            ensure_dir(&config_dir.join("gtk-4.0"))?;
                            let path_str = gtk4_ini.to_str().unwrap_or("~/.config/gtk-4.0/settings.ini");
                            let _ = run("kwriteconfig5", &[
                                "--file",
                                path_str,
                                "--group",
                                "Settings",
                                "--key",
                                "gtk-theme-name",
                                &manifest.name,
                            ]);
                        }
                    } else {
                        report.warnings.push(format!("GTK theme dir not found: {:?}", src_dir));
                    }
                }
            }
        }

        // 8. wallpaper
        if is_enabled("wallpaper") {
            if let Some(ref wallpaper_path) = comp.wallpaper {
                let has_qdbus = check_tool("qdbus");
                let has_dbus_send = check_tool("dbus-send");
                if has_qdbus || has_dbus_send {
                    report.applied.push("wallpaper".to_string());
                    if !opts.dry_run {
                        let clean_p = if wallpaper_path.starts_with("./") { &wallpaper_path[2..] } else { wallpaper_path };
                        let wall_file = theme_dir.join(clean_p);
                        if wall_file.exists() {
                            let abs_path = std::fs::canonicalize(wall_file)?;
                            let abs_path_str = abs_path.to_str().unwrap();

                            let script = format!(
                                "var allDesktops = desktops(); for (var i=0; i<allDesktops.length; i++) {{ var d = allDesktops[i]; d.wallpaperPlugin = 'org.kde.image'; d.currentConfigGroup = Array('Wallpaper', 'org.kde.image', 'General'); d.writeConfig('Image', 'file://{}'); }}",
                                abs_path_str
                            );

                            if has_qdbus {
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
                        } else {
                            report.warnings.push(format!("Wallpaper file not found: {:?}", wall_file));
                        }
                    }
                } else {
                    report.skipped.push("wallpaper".to_string());
                    report.warnings.push("qdbus or dbus-send not found".to_string());
                }
            }
        }

        // 9. konsole_profile
        if is_enabled("konsole_profile") {
            if let Some(ref profile_path) = comp.konsole_profile {
                report.applied.push("konsole_profile".to_string());
                if !opts.dry_run {
                    let clean_p = if profile_path.starts_with("./") { &profile_path[2..] } else { profile_path };
                    let src_file = theme_dir.join(clean_p);
                    let konsole_dest = local_data.join("konsole");
                    if src_file.exists() {
                        ensure_dir(&konsole_dest)?;
                        let filename = src_file.file_name().unwrap();
                        std::fs::copy(&src_file, konsole_dest.join(filename))?;
                    } else {
                        report.warnings.push(format!("Konsole profile file not found: {:?}", src_file));
                    }
                }
            }
        }
    }

    Ok(report)
}
