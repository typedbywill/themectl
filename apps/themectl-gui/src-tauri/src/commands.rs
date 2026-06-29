use crate::dto::*;
use themectl_repository::{
    registry::{load_registry, save_registry, get_themes_dir},
    source::{load_sources, get_source_cache_path, RepoIndex},
};
use themectl_backup::{
    backup::get_backups_root,
    list_snapshots,
    create_and_save_snapshot,
};
use themectl_spec::{ThemeManifest, DesktopEnvironment};
use themectl_kde::{kde::{self, ApplyOptions}, detector};
use themectl_utils::cmd::check_tool;
use themectl_utils::compat::get_current_distros;
use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;

fn get_settings_path() -> std::result::Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or("Could not resolve config directory")?;
    let themectl_dir = config_dir.join("themectl");
    std::fs::create_dir_all(&themectl_dir).map_err(|e| e.to_string())?;
    Ok(themectl_dir.join("gui-settings.yaml"))
}

fn load_settings_internal() -> std::result::Result<GuiSettingsDto, String> {
    let path = get_settings_path()?;
    if !path.exists() {
        let home = dirs::home_dir().ok_or("Could not resolve home directory")?;
        let default_settings = GuiSettingsDto {
            theme_directory: home.join(".local/share/themectl/themes").to_string_lossy().to_string(),
            backup_directory: home.join(".local/share/themectl/backups").to_string_lossy().to_string(),
            max_backups: 10,
            allow_unsigned_themes: true,
            auto_backup_before_apply: true,
            auto_refresh_repositories: false,
            auto_remove_old_backups: true,
            signature_policy: "warn".to_string(),
        };
        let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
        serde_yaml::to_writer(file, &default_settings).map_err(|e| e.to_string())?;
        return Ok(default_settings);
    }
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let settings: GuiSettingsDto = serde_yaml::from_reader(file).map_err(|e| e.to_string())?;
    Ok(settings)
}

fn save_settings_internal(settings: &GuiSettingsDto) -> std::result::Result<(), String> {
    let path = get_settings_path()?;
    let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
    serde_yaml::to_writer(file, settings).map_err(|e| e.to_string())?;
    Ok(())
}

fn check_theme_signature(theme_dir: &Path, manifest: &ThemeManifest) -> SignatureStatus {
    if let Some(ref signature) = manifest.signature {
        match themectl_security::signature::verify_theme_signature(theme_dir, signature) {
            Ok(_) => SignatureStatus::Verified,
            Err(e) => SignatureStatus::Invalid(e.to_string()),
        }
    } else {
        SignatureStatus::Unsigned
    }
}

fn map_manifest_to_installed(name: &str, version: &str, manifest: &ThemeManifest, is_applied: bool, installed_at: String, source_url: Option<String>, theme_dir: &Path) -> InstalledThemeDto {
    let components = if let Some(ref comp) = manifest.components {
        ComponentsDto {
            plasma_style: comp.plasma_style.is_some(),
            color_scheme: comp.color_scheme.is_some(),
            icon_theme: comp.icon_theme.is_some(),
            kvantum_theme: comp.kvantum_theme.is_some(),
            gtk_theme: comp.gtk_theme.is_some(),
            wallpaper: comp.wallpaper.is_some(),
            fonts: comp.fonts.is_some(),
            konsole_profile: comp.konsole_profile.is_some(),
            cursor_theme: comp.cursor_theme.is_some(),
        }
    } else {
        ComponentsDto {
            plasma_style: false,
            color_scheme: false,
            icon_theme: false,
            kvantum_theme: false,
            gtk_theme: false,
            wallpaper: false,
            fonts: false,
            konsole_profile: false,
            cursor_theme: false,
        }
    };

    let dependencies = manifest.dependencies.as_ref().map(|deps| {
        let mut items = Vec::new();
        if let Some(ref packages) = deps.packages {
            for p in packages {
                items.push(DependencyItemDto {
                    name: p.clone(),
                    kind: "package".to_string(),
                    installed: themectl_utils::compat::is_package_installed(p),
                });
            }
        }
        if let Some(ref system) = deps.system {
            for p in system {
                items.push(DependencyItemDto {
                    name: p.clone(),
                    kind: "system".to_string(),
                    installed: themectl_utils::compat::is_package_installed(p),
                });
            }
        }
        if let Some(ref fonts) = deps.fonts {
            for f in fonts {
                items.push(DependencyItemDto {
                    name: f.clone(),
                    kind: "font".to_string(),
                    installed: themectl_utils::compat::is_font_installed(f),
                });
            }
        }
        if let Some(ref icons) = deps.icons {
            for i in icons {
                items.push(DependencyItemDto {
                    name: i.clone(),
                    kind: "icon".to_string(),
                    installed: themectl_utils::compat::is_icon_theme_installed(i),
                });
            }
        }
        DependenciesDto { items }
    });

    let signature_status = check_theme_signature(theme_dir, manifest);

    InstalledThemeDto {
        name: name.to_string(),
        version: version.to_string(),
        display_name: manifest.display_name.clone(),
        description: manifest.description.clone(),
        author: manifest.author.clone(),
        license: manifest.license.clone(),
        homepage: manifest.homepage.clone(),
        is_applied,
        installed_at,
        source_url,
        components,
        dependencies,
        signature_status,
        supports: manifest.supports.iter().map(|s| s.to_string()).collect(),
    }
}

// === THEME COMMANDS ===

#[tauri::command]
pub async fn list_installed_themes() -> std::result::Result<Vec<InstalledThemeDto>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let registry = load_registry().map_err(|e| e.to_string())?;
        let themes_dir = get_themes_dir().map_err(|e| e.to_string())?;
        let mut list = Vec::new();

        if themes_dir.exists() {
            for entry in fs::read_dir(themes_dir).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let path = entry.path();
                if path.is_dir() && path.join("theme.yaml").exists() {
                    let name = path.file_name().unwrap().to_str().unwrap();
                    let manifest_file = fs::File::open(path.join("theme.yaml")).map_err(|e| e.to_string())?;
                    if let Ok(manifest) = serde_yaml::from_reader::<_, ThemeManifest>(manifest_file) {
                        let is_applied = registry.applied.as_deref() == Some(name);
                        let reg_theme = registry.themes.get(name);
                        let installed_at = reg_theme.map(|t| t.installed_at.to_rfc3339()).unwrap_or_else(|| Utc::now().to_rfc3339());
                        let source_url = reg_theme.and_then(|t| t.source_url.clone());
                        list.push(map_manifest_to_installed(name, &manifest.version, &manifest, is_applied, installed_at, source_url, &path));
                    }
                }
            }
        }
        Ok(list)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_available_themes() -> std::result::Result<Vec<AvailableThemeDto>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let registry = load_registry().map_err(|e| e.to_string())?;
        let sources_config = load_sources().map_err(|e| e.to_string())?;
        let mut list = Vec::new();

        for src in &sources_config.sources {
            let cache_path = get_source_cache_path(&src.name).map_err(|e| e.to_string())?;
            if cache_path.exists() {
                if let Ok(file) = fs::File::open(cache_path) {
                    if let Ok(index) = serde_json::from_reader::<_, RepoIndex>(file) {
                        for t in &index.themes {
                            let is_installed = registry.themes.contains_key(&t.name);
                            list.push(AvailableThemeDto {
                                name: t.name.clone(),
                                display_name: t.display_name.clone(),
                                version: t.version.clone(),
                                description: t.description.clone(),
                                author: t.author.clone(),
                                license: t.license.clone(),
                                screenshots: t.screenshots.clone().unwrap_or_default(),
                                download_url: t.download_url.clone(),
                                source_name: src.name.clone(),
                                size_bytes: t.size_bytes,
                                is_installed,
                            });
                        }
                    }
                }
            }
        }
        Ok(list)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_theme_details(name: String) -> std::result::Result<InstalledThemeDto, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let registry = load_registry().map_err(|e| e.to_string())?;
        let themes_dir = get_themes_dir().map_err(|e| e.to_string())?;
        let theme_path = themes_dir.join(&name);
        if !theme_path.exists() {
            return Err(format!("Theme '{}' not found", name));
        }
        let manifest_file = fs::File::open(theme_path.join("theme.yaml")).map_err(|e| e.to_string())?;
        let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file).map_err(|e| e.to_string())?;
        let is_applied = registry.applied.as_deref() == Some(&name);
        let reg_theme = registry.themes.get(&name);
        let installed_at = reg_theme.map(|t| t.installed_at.to_rfc3339()).unwrap_or_else(|| Utc::now().to_rfc3339());
        let source_url = reg_theme.and_then(|t| t.source_url.clone());
        Ok(map_manifest_to_installed(&name, &manifest.version, &manifest, is_applied, installed_at, source_url, &theme_path))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn install_theme(source: String, force: bool) -> std::result::Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        themectl_core::install(&source, None, force, false).map_err(|e| e.to_string())?;
        Ok(format!("Theme installed successfully from {}", source))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn apply_theme(name: String, no_backup: bool, components: Option<Vec<String>>) -> std::result::Result<ApplyResultDto, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let themes_dir = get_themes_dir().map_err(|e| e.to_string())?;
        let theme_path = themes_dir.join(&name);
        if !theme_path.exists() {
            return Err(format!("Theme '{}' not found", name));
        }

        let manifest_file = fs::File::open(theme_path.join("theme.yaml")).map_err(|e| e.to_string())?;
        let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file).map_err(|e| e.to_string())?;

        // Compatibility check
        let current_desktop = detector::detect().map_err(|e| e.to_string())?;
        let supported = manifest.supports.iter().any(|s| {
            match (&current_desktop, s) {
                (DesktopEnvironment::KdePlasma6, DesktopEnvironment::KdePlasma6) => true,
                (DesktopEnvironment::KdePlasma5, DesktopEnvironment::KdePlasma5) => true,
                _ => false,
            }
        });
        if !supported {
            return Err(format!("Theme is not compatible with {}", current_desktop));
        }

        let mut backup_timestamp = None;
        if !no_backup {
            let timestamp = create_and_save_snapshot(Some(name.clone()), current_desktop).map_err(|e| e.to_string())?;
            backup_timestamp = Some(timestamp);
        }

        let opts = ApplyOptions {
            dry_run: false,
            components: components.clone(),
        };

        let report = kde::apply(&theme_path, &manifest, opts).map_err(|e| e.to_string())?;

        // Update registry
        let mut registry = load_registry().map_err(|e| e.to_string())?;
        registry.applied = Some(name.clone());
        save_registry(&registry).map_err(|e| e.to_string())?;

        Ok(ApplyResultDto {
            applied: report.applied,
            skipped: report.skipped,
            warnings: report.warnings,
            backup_timestamp,
        })
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn remove_theme(name: String, force: bool) -> std::result::Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        themectl_core::remove(&name, force, false).map_err(|e| e.to_string())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn preview_theme(name: String) -> std::result::Result<PreviewDto, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let themes_dir = get_themes_dir().map_err(|e| e.to_string())?;
        let theme_path = themes_dir.join(&name);
        if !theme_path.exists() {
            return Err(format!("Theme '{}' not found", name));
        }
        let manifest_file = fs::File::open(theme_path.join("theme.yaml")).map_err(|e| e.to_string())?;
        let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file).map_err(|e| e.to_string())?;

        let mut changes = Vec::new();
        let mut missing_deps = Vec::new();

        if let Some(ref comp) = manifest.components {
            let mut add_change = |comp_name: &str, desc: &str, is_present: bool| {
                if is_present {
                    changes.push(PreviewChange {
                        component: comp_name.to_string(),
                        description: desc.to_string(),
                    });
                }
            };
            add_change("plasma_style", "Will apply Plasma desktop theme style", comp.plasma_style.is_some());
            add_change("color_scheme", "Will set the desktop color scheme", comp.color_scheme.is_some());
            add_change("icon_theme", "Will change the icon pack", comp.icon_theme.is_some());
            add_change("cursor_theme", "Will change mouse cursor styles", comp.cursor_theme.is_some());
            add_change("kvantum_theme", "Will apply Kvantum engine theme", comp.kvantum_theme.is_some());
            add_change("gtk_theme", "Will apply GTK 3/4 interface themes", comp.gtk_theme.is_some());
            add_change("wallpaper", "Will set desktop background wallpaper", comp.wallpaper.is_some());
            add_change("fonts", "Will install system font files", comp.fonts.is_some());
            add_change("konsole_profile", "Will add a profile configuration to Konsole", comp.konsole_profile.is_some());
        }

        if let Some(ref deps) = manifest.dependencies {
            let mut check_dep = |dep_name: &str, kind: &str, check_fn: fn(&str) -> bool| {
                let installed = check_fn(dep_name);
                if !installed {
                    missing_deps.push(DependencyItemDto {
                        name: dep_name.to_string(),
                        kind: kind.to_string(),
                        installed,
                    });
                }
            };

            if let Some(ref packages) = deps.packages {
                for p in packages {
                    check_dep(p, "package", themectl_utils::compat::is_package_installed);
                }
            }
            if let Some(ref system) = deps.system {
                for s in system {
                    check_dep(s, "system", themectl_utils::compat::is_package_installed);
                }
            }
            if let Some(ref fonts) = deps.fonts {
                for f in fonts {
                    check_dep(f, "font", themectl_utils::compat::is_font_installed);
                }
            }
            if let Some(ref icons) = deps.icons {
                for i in icons {
                    check_dep(i, "icon", themectl_utils::compat::is_icon_theme_installed);
                }
            }
        }

        Ok(PreviewDto {
            theme_name: name,
            changes,
            missing_deps,
        })
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn verify_theme(name: String) -> std::result::Result<SignatureStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let themes_dir = get_themes_dir().map_err(|e| e.to_string())?;
        let theme_path = themes_dir.join(&name);
        if !theme_path.exists() {
            return Err(format!("Theme '{}' not found", name));
        }
        let manifest_file = fs::File::open(theme_path.join("theme.yaml")).map_err(|e| e.to_string())?;
        let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file).map_err(|e| e.to_string())?;
        Ok(check_theme_signature(&theme_path, &manifest))
    }).await.map_err(|e| e.to_string())?
}

// === BACKUP COMMANDS ===

#[tauri::command]
pub async fn list_backups() -> std::result::Result<Vec<BackupDto>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let registry = load_registry().map_err(|e| e.to_string())?;
        let snapshots = list_snapshots().map_err(|e| e.to_string())?;
        let mut list = Vec::new();

        // Print newest to oldest
        for (timestamp, snap) in snapshots.iter().rev() {
            let is_current = registry.applied.is_some() && registry.applied == snap.theme_applied;
            list.push(BackupDto {
                timestamp: timestamp.clone(),
                created_at: snap.created_at.to_rfc3339(),
                theme_applied: snap.theme_applied.clone(),
                plasma_style: snap.kde.plasma_style.clone(),
                color_scheme: snap.kde.color_scheme.clone(),
                icon_theme: snap.kde.icon_theme.clone(),
                is_current,
            });
        }
        Ok(list)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn restore_backup(timestamp: String) -> std::result::Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        themectl_core::rollback(Some(&timestamp), false, false).map_err(|e| e.to_string())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_backup(timestamp: String) -> std::result::Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = get_backups_root().map_err(|e| e.to_string())?;
        let dir = root.join(timestamp);
        if dir.exists() {
            fs::remove_dir_all(dir).map_err(|e| e.to_string())?;
        }
        Ok(())
    }).await.map_err(|e| e.to_string())?
}

// === SOURCE COMMANDS ===

#[tauri::command]
pub async fn list_sources() -> std::result::Result<Vec<SourceDto>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let sources_config = load_sources().map_err(|e| e.to_string())?;
        let mut list = Vec::new();

        for src in &sources_config.sources {
            let mut theme_count = 0;
            let cache_path = get_source_cache_path(&src.name).map_err(|e| e.to_string())?;
            if cache_path.exists() {
                if let Ok(file) = fs::File::open(cache_path) {
                    if let Ok(index) = serde_json::from_reader::<_, RepoIndex>(file) {
                        theme_count = index.themes.len() as u32;
                    }
                }
            }
            list.push(SourceDto {
                name: src.name.clone(),
                url: src.url.clone(),
                last_refreshed: src.last_refreshed.map(|t| t.to_rfc3339()),
                theme_count,
            });
        }
        Ok(list)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn add_source(url: String, name: Option<String>) -> std::result::Result<SourceDto, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let sub = themectl_core::SourceSubcommand::Add { url: url.clone(), name: name.clone() };
        themectl_core::source(sub).map_err(|e| e.to_string())?;

        // Retrieve the newly added source details
        let sources_config = load_sources().map_err(|e| e.to_string())?;
        let src = sources_config.sources.iter().find(|s| s.url == url).ok_or("Failed to locate added source")?;

        let mut theme_count = 0;
        let cache_path = get_source_cache_path(&src.name).map_err(|e| e.to_string())?;
        if cache_path.exists() {
            if let Ok(file) = fs::File::open(cache_path) {
                if let Ok(index) = serde_json::from_reader::<_, RepoIndex>(file) {
                    theme_count = index.themes.len() as u32;
                }
            }
        }

        Ok(SourceDto {
            name: src.name.clone(),
            url: src.url.clone(),
            last_refreshed: src.last_refreshed.map(|t| t.to_rfc3339()),
            theme_count,
        })
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn remove_source(name: String) -> std::result::Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let sub = themectl_core::SourceSubcommand::Remove { name_or_url: name };
        themectl_core::source(sub).map_err(|e| e.to_string())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn refresh_sources() -> std::result::Result<Vec<SourceDto>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let sub = themectl_core::SourceSubcommand::Refresh;
        themectl_core::source(sub).map_err(|e| e.to_string())?;
        
        let sources_config = load_sources().map_err(|e| e.to_string())?;
        let mut list = Vec::new();

        for src in &sources_config.sources {
            let mut theme_count = 0;
            let cache_path = get_source_cache_path(&src.name).map_err(|e| e.to_string())?;
            if cache_path.exists() {
                if let Ok(file) = fs::File::open(cache_path) {
                    if let Ok(index) = serde_json::from_reader::<_, RepoIndex>(file) {
                        theme_count = index.themes.len() as u32;
                    }
                }
            }
            list.push(SourceDto {
                name: src.name.clone(),
                url: src.url.clone(),
                last_refreshed: src.last_refreshed.map(|t| t.to_rfc3339()),
                theme_count,
            });
        }
        Ok(list)
    }).await.map_err(|e| e.to_string())?
}

// === SYSTEM / DOCTOR COMMANDS ===

#[tauri::command]
pub async fn run_doctor() -> std::result::Result<DoctorReportDto, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let desktop = detector::detect().map_err(|e| e.to_string())?;
        let mut plasma_version = None;
        if check_tool("plasmashell") {
            if let Ok(output) = std::process::Command::new("plasmashell").arg("--version").output() {
                plasma_version = Some(String::from_utf8_lossy(&output.stdout).trim().to_string());
            }
        }
        let distros = get_current_distros();

        let core_tools = vec![
            "kwriteconfig5",
            "kwriteconfig6",
            "plasma-apply-colorscheme",
            "plasma-apply-desktoptheme",
            "kvantummanager",
            "gsettings",
            "fc-cache",
            "qdbus",
            "dbus-send",
        ];

        let mut tools = Vec::new();
        for t in core_tools {
            tools.push(ToolStatusDto {
                name: t.to_string(),
                installed: check_tool(t),
                category: "core".to_string(),
            });
        }

        let registry = load_registry().map_err(|e| e.to_string())?;
        let applied_theme = registry.applied.clone();
        let mut dependency_status = Vec::new();

        if let Some(ref name) = applied_theme {
            let themes_dir = get_themes_dir().map_err(|e| e.to_string())?;
            let theme_path = themes_dir.join(name);
            if theme_path.exists() {
                if let Ok(manifest_file) = fs::File::open(theme_path.join("theme.yaml")) {
                    if let Ok(manifest) = serde_yaml::from_reader::<_, ThemeManifest>(manifest_file) {
                        if let Some(ref deps) = manifest.dependencies {
                            if let Some(ref pkgs) = deps.packages {
                                for p in pkgs {
                                    dependency_status.push(DependencyItemDto {
                                        name: p.clone(),
                                        kind: "package".to_string(),
                                        installed: themectl_utils::compat::is_package_installed(p),
                                    });
                                }
                            }
                            if let Some(ref system) = deps.system {
                                for s in system {
                                    dependency_status.push(DependencyItemDto {
                                        name: s.clone(),
                                        kind: "system".to_string(),
                                        installed: themectl_utils::compat::is_package_installed(s),
                                    });
                                }
                            }
                            if let Some(ref fonts) = deps.fonts {
                                for f in fonts {
                                    dependency_status.push(DependencyItemDto {
                                        name: f.clone(),
                                        kind: "font".to_string(),
                                        installed: themectl_utils::compat::is_font_installed(f),
                                    });
                                }
                            }
                            if let Some(ref icons) = deps.icons {
                                for i in icons {
                                    dependency_status.push(DependencyItemDto {
                                        name: i.clone(),
                                        kind: "icon".to_string(),
                                        installed: themectl_utils::compat::is_icon_theme_installed(i),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(DoctorReportDto {
            desktop: desktop.to_string(),
            plasma_version,
            distros,
            tools,
            applied_theme,
            dependency_status,
        })
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_doctor_report_text() -> std::result::Result<String, String> {
    let report = run_doctor().await?;
    let mut out = String::new();
    out.push_str("=== Themectl System Doctor ===\n");
    out.push_str(&format!("Desktop Environment: {}\n", report.desktop));
    if let Some(ref pv) = report.plasma_version {
        out.push_str(&format!("  Version: {}\n", pv));
    }
    out.push_str(&format!("Detected Distros/Likes: {}\n\n", report.distros.join(", ")));
    
    out.push_str("=== Core Tools ===\n");
    for t in report.tools {
        let status = if t.installed { "Installed" } else { "Missing" };
        out.push_str(&format!("  {:<25}: {}\n", t.name, status));
    }

    if let Some(ref theme) = report.applied_theme {
        out.push_str(&format!("\n=== Applied Theme: {} ===\n", theme));
        if report.dependency_status.is_empty() {
            out.push_str("No dependencies listed or all met!\n");
        } else {
            for dep in report.dependency_status {
                let status = if dep.installed { "Found" } else { "Missing" };
                out.push_str(&format!("  [{}] {:<18} : {}\n", dep.kind, dep.name, status));
            }
        }
    } else {
        out.push_str("\nNo theme currently registered as applied.\n");
    }
    Ok(out)
}

// === SETTINGS COMMANDS ===

#[tauri::command]
pub async fn get_settings() -> std::result::Result<GuiSettingsDto, String> {
    tauri::async_runtime::spawn_blocking(load_settings_internal).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_settings(settings: GuiSettingsDto) -> std::result::Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        save_settings_internal(&settings)
    }).await.map_err(|e| e.to_string())?
}
