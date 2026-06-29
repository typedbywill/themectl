use themectl_utils::{ThemectlError, Result};
use themectl_spec::{ThemeManifest, DesktopEnvironment, lockfile};
use themectl_theme::package;
use themectl_security::signature;
use themectl_repository::registry::{load_registry, save_registry, get_themes_dir, RegistryTheme};
use themectl_repository::source::{load_sources, save_sources, get_source_cache_path, Source, RepoIndex};
use themectl_backup::{list_snapshots, create_and_save_snapshot, restore_snapshot};
use themectl_backup::snapshot::create_snapshot;
use themectl_kde::kde::{self, ApplyOptions};
use themectl_kde::detector;
use themectl_utils::cmd::check_tool;
use themectl_utils::fs::copy_dir;
use themectl_utils::compat::{get_current_distros, is_version_compatible};

use colored::Colorize;
use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;

#[derive(Debug, Clone)]
pub enum SourceSubcommand {
    Add {
        url: String,
        name: Option<String>,
    },
    Remove {
        name_or_url: String,
    },
    List,
    Refresh,
}

fn download_file(url: &str) -> Result<PathBuf> {
    let mut response = reqwest::blocking::get(url)?;
    if !response.status().is_success() {
        return Err(ThemectlError::DownloadFailed(format!("HTTP error {}", response.status())));
    }
    let data_dir = dirs::data_local_dir().ok_or_else(|| {
        ThemectlError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, "Could not resolve data local dir"))
    })?;
    let tmp_dir = data_dir.join("themectl/tmp");
    themectl_utils::fs::ensure_dir(&tmp_dir)?;
    let temp_file_path = tmp_dir.join("download.theme");
    let mut file = std::fs::File::create(&temp_file_path)?;
    response.copy_to(&mut file)?;
    Ok(temp_file_path)
}

pub fn install(source: &str, override_name: Option<&str>, force: bool, dry_run: bool) -> Result<()> {
    let theme_file_path = if source.starts_with("http://") || source.starts_with("https://") {
        if !dry_run {
            println!("Downloading theme from {}...", source);
            download_file(source)?
        } else {
            println!("(dry-run) Would download theme from {}", source);
            PathBuf::from("dryrun.theme")
        }
    } else if source.ends_with(".theme") && Path::new(source).exists() {
        PathBuf::from(source)
    } else {
        // Search configured repository sources
        let sources_config = load_sources()?;
        let mut download_url = None;
        for src in &sources_config.sources {
            let cache_path = get_source_cache_path(&src.name)?;
            if cache_path.exists() {
                if let Ok(file) = fs::File::open(cache_path) {
                    if let Ok(index) = serde_json::from_reader::<_, RepoIndex>(file) {
                        if let Some(found) = index.themes.iter().find(|t| t.name == source) {
                            download_url = Some((found.download_url.clone(), found.version.clone()));
                            break;
                        }
                    }
                }
            }
        }

        if let Some((url, version)) = download_url {
            if !dry_run {
                println!("Found theme '{}' (version {}) in repositories. Downloading...", source, version);
                download_file(&url)?
            } else {
                println!("(dry-run) Would download theme '{}' (version {}) from {}", source, version, url);
                PathBuf::from("dryrun.theme")
            }
        } else {
            return Err(ThemectlError::ThemeNotFound(source.to_string()));
        }
    };

    if dry_run {
        println!("(dry-run) Would unpack, validate and install theme '{}'", source);
        return Ok(());
    }

    // Unpack and validate
    let data_dir = dirs::data_local_dir().unwrap();
    let temp_extract = data_dir.join("themectl/tmp/extract");
    let _ = fs::remove_dir_all(&temp_extract);
    themectl_utils::fs::ensure_dir(&temp_extract)?;

    let (manifest, unpacked_dir) = package::unpack_and_validate(&theme_file_path, &temp_extract)?;
    
    // Cryptographic verification if signature is present
    if let Some(ref signature) = manifest.signature {
        println!("Verifying theme cryptographic signature...");
        if let Err(e) = signature::verify_theme_signature(&unpacked_dir, signature) {
            return Err(ThemectlError::InvalidManifest(format!("Cryptographic signature verification failed: {}. Aborting installation.", e)));
        }
        println!("✓ Theme cryptographic signature is valid!");
    } else {
        println!("{} Theme has no cryptographic signature. Installing anyway.", "⚠".yellow());
    }
    
    let target_name = override_name.unwrap_or(manifest.id.as_deref().unwrap_or(&manifest.name));
    let themes_dir = get_themes_dir()?;
    let install_dest = themes_dir.join(target_name);

    if install_dest.exists() && !force {
        return Err(ThemectlError::AlreadyInstalled(target_name.to_string()));
    }

    println!("✓ Downloaded {} v{}", manifest.name, manifest.version);
    println!("✓ Validated theme manifest");

    // Check dependencies
    if let Some(ref deps) = manifest.dependencies {
        if let Some(ref packages) = deps.packages {
            for pkg in packages {
                if !themectl_utils::compat::is_package_installed(pkg) {
                    println!("{} Missing dependency: {} (install it for full theme support)", "⚠".yellow(), pkg);
                }
            }
        }
        if let Some(ref system_pkgs) = deps.system {
            for pkg in system_pkgs {
                if !themectl_utils::compat::is_package_installed(pkg) {
                    println!("{} Missing system dependency: {} (install it for full theme support)", "⚠".yellow(), pkg);
                }
            }
        }
        if let Some(ref fonts) = deps.fonts {
            for font in fonts {
                if !themectl_utils::compat::is_font_installed(font) {
                    println!("{} Missing font: {} (install it for full theme support)", "⚠".yellow(), font);
                }
            }
        }
        if let Some(ref icons) = deps.icons {
            for icon in icons {
                if !themectl_utils::compat::is_icon_theme_installed(icon) {
                    println!("{} Missing icon theme: {} (install it for full theme support)", "⚠".yellow(), icon);
                }
            }
        }
    }

    // Copy to install location
    let _ = fs::remove_dir_all(&install_dest);
    copy_dir(&unpacked_dir, &install_dest)?;

    // Update registry
    let mut registry = load_registry()?;
    registry.themes.insert(target_name.to_string(), RegistryTheme {
        version: manifest.version.clone(),
        installed_at: Utc::now(),
        source_url: if source.starts_with("http") { Some(source.to_string()) } else { None },
    });
    save_registry(&registry)?;

    // Clean up temporary files
    let _ = fs::remove_dir_all(&temp_extract);
    if theme_file_path.to_str().unwrap().contains("themectl/tmp") {
        let _ = fs::remove_file(&theme_file_path);
    }

    println!("✓ Installed to ~/.local/share/themectl/themes/{}", target_name);
    println!("✓ Done! Run: themectl apply {}", target_name);

    Ok(())
}

pub fn apply(name: &str, no_backup: bool, components: Option<Vec<String>>, dry_run: bool) -> Result<()> {
    let themes_dir = get_themes_dir()?;
    let theme_path = themes_dir.join(name);
    if !theme_path.exists() {
        return Err(ThemectlError::ThemeNotFound(name.to_string()));
    }

    let manifest_file = fs::File::open(theme_path.join("theme.yaml"))?;
    let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file)?;

    // Check environment support
    let current_desktop = detector::detect()?;
    let supported_by_supports = manifest.supports.iter().any(|s| {
        match (&current_desktop, s) {
            (DesktopEnvironment::KdePlasma6, DesktopEnvironment::KdePlasma6) => true,
            (DesktopEnvironment::KdePlasma5, DesktopEnvironment::KdePlasma5) => true,
            _ => false,
        }
    });
    let supported_by_targets = if let Some(ref targets) = manifest.targets {
        targets.iter().any(|t| t == "kde-plasma" && matches!(current_desktop, DesktopEnvironment::KdePlasma6 | DesktopEnvironment::KdePlasma5))
    } else {
        false
    };

    if !supported_by_supports && !supported_by_targets {
        let desktop_str = current_desktop.to_string();
        return Err(ThemectlError::ThemeNotCompatible {
            name: name.to_string(),
            desktop: desktop_str,
        });
    }

    // Check system compatibility if specified
    if let Some(ref compat) = manifest.compatibility {
        if let Some(ref plasma_compat) = compat.plasma {
            let current_plasma_version = lockfile::generate_lockfile().lock.plasma;
            if let Some(ref ver) = current_plasma_version {
                if !is_version_compatible(ver, plasma_compat.min.as_deref(), plasma_compat.max.as_deref()) {
                    return Err(ThemectlError::ThemeNotCompatible {
                        name: name.to_string(),
                        desktop: format!("KDE Plasma version {} (required min: {:?}, max: {:?})", ver, plasma_compat.min, plasma_compat.max),
                    });
                }
            }
        }

        if let Some(ref distros_list) = compat.distro {
            let current_distros = get_current_distros();
            let distro_matched = distros_list.iter().any(|d| current_distros.contains(&d.to_lowercase()));
            if !distro_matched {
                return Err(ThemectlError::ThemeNotCompatible {
                    name: name.to_string(),
                    desktop: format!("Distro {:?} (required: {:?})", current_distros, distros_list),
                });
            }
        }
    }

    if !no_backup {
        if !dry_run {
            let timestamp = create_and_save_snapshot(Some(name.to_string()), current_desktop)?;
            println!("✓ Backup created: {}", timestamp);
        } else {
            println!("(dry-run) Would create configuration backup");
        }
    }

    // Apply
    let opts = ApplyOptions {
        dry_run,
        components,
    };

    let report = kde::apply(&theme_path, &manifest, opts)?;

    for comp in &report.applied {
        if dry_run {
            println!("(dry-run) Would apply: {}", comp);
        } else {
            println!("✓ Applied: {}", comp);
        }
    }

    for comp in &report.skipped {
        println!("- Skipped: {}", comp);
    }

    for warn in &report.warnings {
        println!("{} {}", "⚠".yellow(), warn);
    }

    if !dry_run {
        let mut registry = load_registry()?;
        registry.applied = Some(name.to_string());
        save_registry(&registry)?;
        println!("✓ Theme '{}' applied successfully!", name);
        println!("  Some changes may require re-login to take full effect.");
    } else {
        println!("(dry-run) Theme '{}' simulated successfully!", name);
    }

    Ok(())
}

pub fn rollback(to: Option<&str>, list: bool, dry_run: bool) -> Result<()> {
    let snapshots = list_snapshots()?;
    if snapshots.is_empty() {
        return Err(ThemectlError::NoBackupAvailable);
    }

    if list {
        let registry = load_registry()?;
        println!("Available backups:");
        // list_snapshots returns sorted oldest to newest. We print from newest to oldest for convenience
        for (timestamp, snap) in snapshots.iter().rev() {
            let is_current = if registry.applied.is_some() && registry.applied == snap.theme_applied {
                " (current) "
            } else {
                "            "
            };
            println!(
                "  {}{}{}plasma: {}, colors: {}",
                timestamp.cyan(),
                is_current,
                if snap.theme_applied.is_some() { "theme: " } else { "" },
                snap.kde.plasma_style.as_deref().unwrap_or("None"),
                snap.kde.color_scheme.as_deref().unwrap_or("None")
            );
        }
        println!("\nRun: themectl rollback --to <timestamp>");
        return Ok(());
    }

    let target_snap = if let Some(ts) = to {
        snapshots.iter().find(|(t, _)| t == ts)
            .ok_or_else(|| ThemectlError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, format!("Backup with timestamp '{}' not found", ts))))?
    } else {
        // Last is the newest
        snapshots.last().ok_or(ThemectlError::NoBackupAvailable)?
    };

    if dry_run {
        println!("(dry-run) Would rollback to snapshot {}", target_snap.0);
        return Ok(());
    }

    restore_snapshot(&target_snap.1)?;

    let mut registry = load_registry()?;
    registry.applied = target_snap.1.theme_applied.clone();
    save_registry(&registry)?;

    println!("✓ Successfully rolled back to snapshot {}", target_snap.0);
    Ok(())
}

pub fn list(installed: bool, available: bool) -> Result<()> {
    let show_installed = installed || !available;

    if show_installed {
        let registry = load_registry()?;
        println!("Installed themes:");
        let themes_dir = get_themes_dir()?;
        if themes_dir.exists() {
            for entry in fs::read_dir(themes_dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() && path.join("theme.yaml").exists() {
                    let name = path.file_name().unwrap().to_str().unwrap();
                    let manifest_file = fs::File::open(path.join("theme.yaml"))?;
                    if let Ok(manifest) = serde_yaml::from_reader::<_, ThemeManifest>(manifest_file) {
                        let is_applied = if registry.applied.as_deref() == Some(name) {
                            "  applied ✓"
                        } else {
                            ""
                        };
                        println!("  {:<18} v{:<8}{}", name.cyan(), manifest.version, is_applied.green());
                    }
                }
            }
        }
        println!("\nRun: themectl apply <name>");
    }

    if available {
        println!("Available themes in repositories:");
        let sources_config = load_sources()?;
        for src in &sources_config.sources {
            let cache_path = get_source_cache_path(&src.name)?;
            if cache_path.exists() {
                if let Ok(file) = fs::File::open(cache_path) {
                    if let Ok(index) = serde_json::from_reader::<_, RepoIndex>(file) {
                        println!("Source: {}", src.name.cyan());
                        for theme in &index.themes {
                            println!(
                                "  {:<18} v{:<8} - {}",
                                theme.name.cyan(),
                                theme.version,
                                theme.description.as_deref().unwrap_or("No description")
                            );
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

pub fn remove(name: &str, force: bool, dry_run: bool) -> Result<()> {
    let themes_dir = get_themes_dir()?;
    let theme_path = themes_dir.join(name);
    if !theme_path.exists() {
        return Err(ThemectlError::ThemeNotFound(name.to_string()));
    }

    let mut registry = load_registry()?;
    if registry.applied.as_deref() == Some(name) && !force {
        return Err(ThemectlError::AlreadyInstalled(format!(
            "Theme '{}' is currently applied. Use --force to remove it.",
            name
        )));
    }

    if dry_run {
        println!("(dry-run) Would remove theme '{}'", name);
        return Ok(());
    }

    fs::remove_dir_all(theme_path)?;
    registry.themes.remove(name);
    if registry.applied.as_deref() == Some(name) {
        registry.applied = None;
    }
    save_registry(&registry)?;

    println!("✓ Removed theme '{}'", name);
    Ok(())
}

pub fn source(sub: SourceSubcommand) -> Result<()> {
    match sub {
        SourceSubcommand::Add { url, name } => {
            println!("Validating source URL {}...", url);
            let response = reqwest::blocking::get(&url)?;
            if !response.status().is_success() {
                return Err(ThemectlError::DownloadFailed(format!("HTTP error {}", response.status())));
            }
            let index: RepoIndex = response.json()?;

            // slugify name if not provided
            let repo_name = name.unwrap_or_else(|| {
                index.name.to_lowercase().replace(' ', "-").replace(|c: char| !c.is_ascii_alphanumeric() && c != '-', "")
            });

            let mut config = load_sources()?;
            if config.sources.iter().any(|s| s.name == repo_name) {
                return Err(ThemectlError::AlreadyInstalled(format!("Repository '{}' already exists", repo_name)));
            }

            // Save JSON cache
            let cache_path = get_source_cache_path(&repo_name)?;
            let cache_file = fs::File::create(cache_path)?;
            serde_json::to_writer(cache_file, &index)?;

            config.sources.push(Source {
                name: repo_name.clone(),
                url: url.clone(),
                last_refreshed: Some(Utc::now()),
            });
            save_sources(&config)?;

            println!("✓ Added source '{}'", repo_name);
        }
        SourceSubcommand::Remove { name_or_url } => {
            let mut config = load_sources()?;
            let pos = config.sources.iter().position(|s| s.name == name_or_url || s.url == name_or_url);
            if let Some(idx) = pos {
                let removed = config.sources.remove(idx);
                save_sources(&config)?;
                let cache_path = get_source_cache_path(&removed.name)?;
                let _ = fs::remove_file(cache_path);
                println!("✓ Removed source '{}'", removed.name);
            } else {
                return Err(ThemectlError::ThemeNotFound(format!("Repository '{}' not found", name_or_url)));
            }
        }
        SourceSubcommand::List => {
            let config = load_sources()?;
            println!("Configured sources:");
            for src in &config.sources {
                let refresh_info = match src.last_refreshed {
                    Some(t) => {
                        let diff = Utc::now() - t;
                        if diff.num_minutes() < 1 {
                            "refreshed just now".to_string()
                        } else if diff.num_hours() < 1 {
                            format!("refreshed {}m ago", diff.num_minutes())
                        } else {
                            format!("refreshed {}h ago", diff.num_hours())
                        }
                    }
                    None => "never refreshed".to_string(),
                };
                println!("  {:<12} {}   ({})", src.name.cyan(), src.url, refresh_info);
            }
        }
        SourceSubcommand::Refresh => {
            let mut config = load_sources()?;
            println!("Refreshing repository indexes...");
            for src in &mut config.sources {
                print!("  Refreshing {}... ", src.name);
                match reqwest::blocking::get(&src.url) {
                    Ok(res) => {
                        if res.status().is_success() {
                            if let Ok(index) = res.json::<RepoIndex>() {
                                if let Ok(cache_path) = get_source_cache_path(&src.name) {
                                    if let Ok(cache_file) = fs::File::create(cache_path) {
                                        let _ = serde_json::to_writer(cache_file, &index);
                                        src.last_refreshed = Some(Utc::now());
                                        println!("{}", "✓".green());
                                        continue;
                                    }
                                }
                            }
                        }
                        println!("{}", "✗ failed parsing".red());
                    }
                    Err(_) => {
                        println!("{}", "✗ failed connecting".red());
                    }
                }
            }
            save_sources(&config)?;
            println!("✓ Done!");
        }
    }
    Ok(())
}

pub fn export(output: Option<&str>, dry_run: bool) -> Result<()> {
    let current_desktop = detector::detect()?;
    let snap = create_snapshot(None, current_desktop)?;
    let kde_snap = &snap.kde;

    let theme_name = "my-theme";
    
    // Create temporary workspace folder
    let data_dir = dirs::data_local_dir().unwrap();
    let temp_export_dir = data_dir.join("themectl/tmp/export_theme").join(theme_name);
    let _ = fs::remove_dir_all(&temp_export_dir);
    themectl_utils::fs::ensure_dir(&temp_export_dir)?;

    let mut comp_manifest = themectl_spec::Components {
        plasma_style: kde_snap.plasma_style.clone(),
        color_scheme: None,
        icon_theme: kde_snap.icon_theme.clone(),
        kvantum_theme: None,
        gtk_theme: kde_snap.gtk_theme.clone(),
        wallpaper: None,
        fonts: None,
        konsole_profile: None,
        cursor_theme: kde_snap.cursor_theme.clone(),
    };

    // If wallpaper path is present and is a local file, copy it and make it relative
    if let Some(ref wall_path) = kde_snap.wallpaper {
        let wall_file = Path::new(wall_path);
        if wall_file.exists() && wall_file.is_file() {
            let filename = wall_file.file_name().unwrap();
            let dest_wall_dir = temp_export_dir.join("wallpapers");
            themectl_utils::fs::ensure_dir(&dest_wall_dir)?;
            if !dry_run {
                std::fs::copy(wall_file, dest_wall_dir.join(filename))?;
            }
            comp_manifest.wallpaper = Some(format!("wallpapers/{}", filename.to_str().unwrap()));
        }
    }

    // Copy color scheme file if it can be found locally
    if let Some(ref scheme_name) = kde_snap.color_scheme {
        let scheme_filename = format!("{}.colors", scheme_name);
        let local_schemes = data_dir.join("color-schemes").join(&scheme_filename);
        let system_schemes = Path::new("/usr/share/color-schemes").join(&scheme_filename);
        
        let found_scheme = if local_schemes.exists() {
            Some(local_schemes)
        } else if system_schemes.exists() {
            Some(system_schemes)
        } else {
            None
        };

        if let Some(src_scheme_path) = found_scheme {
            let dest_scheme_dir = temp_export_dir.join("colors");
            themectl_utils::fs::ensure_dir(&dest_scheme_dir)?;
            if !dry_run {
                std::fs::copy(src_scheme_path, dest_scheme_dir.join(&scheme_filename))?;
            }
            comp_manifest.color_scheme = Some(format!("colors/{}", scheme_filename));
        }
    }

    let manifest = ThemeManifest {
        id: Some(format!("org.themectl.{}", theme_name)),
        name: theme_name.to_string(),
        version: "0.1.0".to_string(),
        display_name: Some("My Exported Theme".to_string()),
        description: Some("Theme exported automatically by themectl.".to_string()),
        author: Some(std::env::var("USER").unwrap_or_else(|_| "Unknown".to_string())),
        homepage: None,
        license: Some("Proprietary".to_string()),
        supports: vec![DesktopEnvironment::KdePlasma6],
        targets: Some(vec!["kde-plasma".to_string()]),
        compatibility: Some(themectl_spec::Compatibility {
            plasma: Some(themectl_spec::PlasmaCompat {
                min: Some("6.0".to_string()),
                max: Some("6.x".to_string()),
            }),
            distro: None,
        }),
        dependencies: None,
        components: Some(comp_manifest),
        signature: None,
    };

    let lfile = lockfile::generate_lockfile();
    if !dry_run {
        lockfile::write_lockfile(&temp_export_dir.join("theme.lock"), &lfile)?;
        let yaml_file = fs::File::create(temp_export_dir.join("theme.yaml"))?;
        serde_yaml::to_writer(yaml_file, &manifest)?;
    } else {
        println!("(dry-run) Would generate theme.lock: {:?}", lfile.lock);
    }

    let timestamp = Utc::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    let default_output = format!("./my-theme-{}.theme", timestamp);
    let final_output = output.unwrap_or(&default_output);
    let final_output_path = Path::new(final_output);

    if !dry_run {
        package::pack_theme(temp_export_dir.parent().unwrap(), final_output_path)?;
        let _ = fs::remove_dir_all(temp_export_dir);
        println!("✓ Exported theme to {}", final_output);
    } else {
        println!("(dry-run) Would export theme to {}", final_output);
    }

    Ok(())
}

pub fn info(name: &str) -> Result<()> {
    let themes_dir = get_themes_dir()?;
    let theme_path = themes_dir.join(name);
    if !theme_path.exists() {
        return Err(ThemectlError::ThemeNotFound(name.to_string()));
    }

    let manifest_file = fs::File::open(theme_path.join("theme.yaml"))?;
    let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file)?;

    if let Some(ref id) = manifest.id {
        println!("ID: {}", id.cyan());
    }
    println!("Theme: {}", manifest.name.cyan());
    println!("Version: {}", manifest.version);
    println!("Author: {}", manifest.author.as_deref().unwrap_or("Unknown"));
    println!("License: {}", manifest.license.as_deref().unwrap_or("Unknown"));
    
    let supports_str = manifest.supports.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(", ");
    println!("Supports: {}", supports_str);
    if let Some(ref targets) = manifest.targets {
        println!("Targets: {}", targets.join(", "));
    }

    println!("\nComponents:");
    if let Some(ref comp) = manifest.components {
        let check_comp = |name: &str, is_present: bool| {
            if is_present {
                println!("  {:<15} ✓", name);
            }
        };
        check_comp("plasma_style", comp.plasma_style.is_some());
        check_comp("color_scheme", comp.color_scheme.is_some());
        check_comp("icon_theme", comp.icon_theme.is_some());
        check_comp("wallpaper", comp.wallpaper.is_some());
        check_comp("kvantum_theme", comp.kvantum_theme.is_some());
        check_comp("gtk_theme", comp.gtk_theme.is_some());
        check_comp("fonts", comp.fonts.is_some());
        check_comp("konsole_profile", comp.konsole_profile.is_some());
        check_comp("cursor_theme", comp.cursor_theme.is_some());
    }

    if let Some(ref deps) = manifest.dependencies {
        println!("\nDependencies:");
        if let Some(ref packages) = deps.packages {
            for pkg in packages {
                let status = if themectl_utils::compat::is_package_installed(pkg) {
                    "installed".green()
                } else {
                    "missing".red()
                };
                println!("  [Package]   {:<15} ✓ {}", pkg, status);
            }
        }
        if let Some(ref system) = deps.system {
            for pkg in system {
                let status = if themectl_utils::compat::is_package_installed(pkg) {
                    "installed".green()
                } else {
                    "missing".red()
                };
                println!("  [System]    {:<15} ✓ {}", pkg, status);
            }
        }
        if let Some(ref fonts) = deps.fonts {
            for font in fonts {
                let status = if themectl_utils::compat::is_font_installed(font) {
                    "installed".green()
                } else {
                    "missing".red()
                };
                println!("  [Font]      {:<15} ✓ {}", font, status);
            }
        }
        if let Some(ref icons) = deps.icons {
            for icon in icons {
                let status = if themectl_utils::compat::is_icon_theme_installed(icon) {
                    "installed".green()
                } else {
                    "missing".red()
                };
                println!("  [Icon]      {:<15} ✓ {}", icon, status);
            }
        }
    }

    let lock_path = theme_path.join("theme.lock");
    if lock_path.exists() {
        if let Ok(lfile) = lockfile::load_lockfile(&lock_path) {
            println!("\nEnvironment Lock:");
            if let Some(ref p) = lfile.lock.plasma {
                println!("  plasma: {}", p);
            }
            if let Some(ref k) = lfile.lock.kvantum {
                println!("  kvantum: {}", k);
            }
            if let Some(ref i) = lfile.lock.icons {
                println!("  icons: {}", i);
            }
        }
    }

    Ok(())
}

pub fn doctor() -> Result<()> {
    println!("{}", "=== Themectl System Doctor ===".bold().cyan());
    
    let desktop = detector::detect()?;
    println!("Desktop Environment: {}", desktop.to_string().green());
    
    if check_tool("plasmashell") {
        if let Ok(output) = std::process::Command::new("plasmashell").arg("--version").output() {
            let ver_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            println!("  Version: {}", ver_str.green());
        }
    } else {
        println!("  Version: {}", "Not found".red());
    }

    let distros = get_current_distros();
    println!("Detected Distros/Likes: {}", distros.join(", ").green());

    println!("\n=== Core Tools ===");
    let check_core = |tool: &str| {
        let status = if check_tool(tool) {
            "Installed".green()
        } else {
            "Missing (Optional but recommended)".yellow()
        };
        println!("  {:<25}: {}", tool, status);
    };
    check_core("kwriteconfig5");
    check_core("kwriteconfig6");
    check_core("plasma-apply-colorscheme");
    check_core("plasma-apply-desktoptheme");
    check_core("kvantummanager");
    check_core("gsettings");
    check_core("fc-cache");
    check_core("qdbus");
    check_core("dbus-send");

    let registry = load_registry()?;
    if let Some(ref applied_theme) = registry.applied {
        println!("\n=== Applied Theme: {} ===", applied_theme.cyan());
        let themes_dir = get_themes_dir()?;
        let theme_path = themes_dir.join(applied_theme);
        if theme_path.exists() {
            let manifest_file = fs::File::open(theme_path.join("theme.yaml"))?;
            let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file)?;
            
            if let Some(ref deps) = manifest.dependencies {
                let mut missing = 0;
                
                if let Some(ref pkgs) = deps.packages {
                    for pkg in pkgs {
                        if themectl_utils::compat::is_package_installed(pkg) {
                            println!("  [System Package] {:<18} : {}", pkg.cyan(), "Found".green());
                        } else {
                            println!("  [System Package] {:<18} : {}", pkg.cyan(), "Missing".red());
                            missing += 1;
                        }
                    }
                }
                if let Some(ref sys_pkgs) = deps.system {
                    for pkg in sys_pkgs {
                        if themectl_utils::compat::is_package_installed(pkg) {
                            println!("  [System Package] {:<18} : {}", pkg.cyan(), "Found".green());
                        } else {
                            println!("  [System Package] {:<18} : {}", pkg.cyan(), "Missing".red());
                            missing += 1;
                        }
                    }
                }

                if let Some(ref fonts) = deps.fonts {
                    for font in fonts {
                        if themectl_utils::compat::is_font_installed(font) {
                            println!("  [Font]           {:<18} : {}", font.cyan(), "Found".green());
                        } else {
                            println!("  [Font]           {:<18} : {}", font.cyan(), "Missing".red());
                            missing += 1;
                        }
                    }
                }

                if let Some(ref icons) = deps.icons {
                    for icon in icons {
                        if themectl_utils::compat::is_icon_theme_installed(icon) {
                            println!("  [Icon Theme]     {:<18} : {}", icon.cyan(), "Found".green());
                        } else {
                            println!("  [Icon Theme]     {:<18} : {}", icon.cyan(), "Missing".red());
                            missing += 1;
                        }
                    }
                }

                if missing == 0 {
                    println!("\n✓ All theme dependencies are met!");
                } else {
                    println!("\n⚠ Some dependencies are missing. Install them to avoid issues with this theme.");
                }
            } else {
                println!("No dependencies listed for this theme.");
            }
        } else {
            println!("Theme directory not found in ~/.local/share/themectl/themes/");
        }
    } else {
        println!("\nNo theme currently registered as applied.");
    }
    
    Ok(())
}

pub fn verify(name_or_path: &str) -> Result<()> {
    let path = Path::new(name_or_path);
    let (manifest, theme_dir, _temp_dir) = if name_or_path.ends_with(".theme") && path.exists() {
        let data_dir = dirs::data_local_dir().ok_or_else(|| {
            ThemectlError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, "Could not resolve data local dir"))
        })?;
        let temp_extract = data_dir.join("themectl/tmp/verify_extract");
        let _ = fs::remove_dir_all(&temp_extract);
        themectl_utils::fs::ensure_dir(&temp_extract)?;
        let (manifest, unpacked_dir) = package::unpack_and_validate(path, &temp_extract)?;
        (manifest, unpacked_dir, Some(temp_extract))
    } else {
        let themes_dir = get_themes_dir()?;
        let theme_path = themes_dir.join(name_or_path);
        if !theme_path.exists() {
            return Err(ThemectlError::ThemeNotFound(name_or_path.to_string()));
        }
        let manifest_file = fs::File::open(theme_path.join("theme.yaml"))?;
        let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file)?;
        (manifest, theme_path, None)
    };

    if let Some(ref signature) = manifest.signature {
        println!("Verifying theme signature for '{}'...", manifest.name.cyan());
        match signature::verify_theme_signature(&theme_dir, signature) {
            Ok(_) => {
                println!("{}", "✓ Cryptographic signature is valid!".green());
                println!("  Algorithm: {}", signature.algorithm);
                println!("  Public Key: {}", signature.public_key);
            }
            Err(e) => {
                println!("{}", "✗ Cryptographic signature verification failed!".red());
                if let Some(ref temp) = _temp_dir {
                    let _ = fs::remove_dir_all(temp);
                }
                return Err(e);
            }
        }
    } else {
        println!("{} Theme '{}' is not signed.", "⚠".yellow(), manifest.name.cyan());
    }

    if let Some(ref temp) = _temp_dir {
        let _ = fs::remove_dir_all(temp);
    }
    Ok(())
}

pub fn preview(name_or_path: &str) -> Result<()> {
    let path = Path::new(name_or_path);
    let (manifest, _temp_dir) = if name_or_path.ends_with(".theme") && path.exists() {
        let data_dir = dirs::data_local_dir().ok_or_else(|| {
            ThemectlError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, "Could not resolve data local dir"))
        })?;
        let temp_extract = data_dir.join("themectl/tmp/preview_extract");
        let _ = fs::remove_dir_all(&temp_extract);
        themectl_utils::fs::ensure_dir(&temp_extract)?;
        let (manifest, _unpacked_dir) = package::unpack_and_validate(path, &temp_extract)?;
        (manifest, Some(temp_extract))
    } else {
        let themes_dir = get_themes_dir()?;
        let theme_path = themes_dir.join(name_or_path);
        if !theme_path.exists() {
            return Err(ThemectlError::ThemeNotFound(name_or_path.to_string()));
        }
        let manifest_file = fs::File::open(theme_path.join("theme.yaml"))?;
        let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file)?;
        (manifest, None)
    };

    println!("Preview para o tema: {}", manifest.name.cyan());
    if let Some(ref comp) = manifest.components {
        if comp.color_scheme.is_some() {
            println!("✓ Mudará esquema de cores");
        }
        if comp.fonts.is_some() {
            println!("✓ Instalará fontes");
        }
        if comp.wallpaper.is_some() {
            println!("✓ Alterará wallpaper");
        }
        if comp.gtk_theme.is_some() {
            println!("✓ Aplicará tema GTK");
        }
        if comp.plasma_style.is_some() {
            println!("✓ Mudará estilo do Plasma");
        }
        if comp.icon_theme.is_some() {
            println!("✓ Alterará tema de ícones");
        }
        if comp.cursor_theme.is_some() {
            println!("✓ Alterará tema de cursor");
        }
        if comp.kvantum_theme.is_some() {
            println!("✓ Aplicará tema do Kvantum");
        }
        if comp.konsole_profile.is_some() {
            println!("✓ Aplicará perfil do Konsole");
        }
    } else {
        println!("Este tema não possui componentes definidos.");
    }

    if let Some(ref temp) = _temp_dir {
        let _ = fs::remove_dir_all(temp);
    }
    Ok(())
}
