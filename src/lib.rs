pub mod error;
pub mod theme;
pub mod apply;
pub mod backup;
pub mod repo;
pub mod util;
pub mod cli;

use crate::error::{ThemectlError, Result};
use crate::theme::manifest::{ThemeManifest, DesktopEnvironment};
use crate::theme::package;
use crate::repo::registry::{load_registry, save_registry, get_themes_dir, RegistryTheme};
use crate::repo::source::{load_sources, save_sources, get_source_cache_path, Source, RepoIndex};
use crate::backup::{create_and_save_snapshot, list_snapshots};
use crate::backup::restore::restore_snapshot;
use crate::util::cmd::check_tool;
use crate::util::fs::copy_dir;

use clap::Parser;
use colored::Colorize;
use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;

/// Standard entry point for the themectl CLI logic.
pub fn run_cli() -> Result<()> {
    let cli = cli::Cli::parse();

    // Configure colored output override if requested
    if cli.no_color {
        colored::control::set_override(false);
    }

    match cli.command {
        cli::Commands::Install { source, name, force } => {
            install_cmd(&source, name.as_deref(), force, cli.dry_run)?;
        }
        cli::Commands::Apply { name, no_backup, components } => {
            apply_cmd(&name, no_backup, components, cli.dry_run)?;
        }
        cli::Commands::Rollback { to, list } => {
            rollback_cmd(to.as_deref(), list, cli.dry_run)?;
        }
        cli::Commands::List { installed, available } => {
            list_cmd(installed, available)?;
        }
        cli::Commands::Remove { name, force } => {
            remove_cmd(&name, force, cli.dry_run)?;
        }
        cli::Commands::Source { subcommand } => {
            source_cmd(subcommand)?;
        }
        cli::Commands::Export { output } => {
            export_cmd(output.as_deref(), cli.dry_run)?;
        }
        cli::Commands::Info { name } => {
            info_cmd(&name)?;
        }
    }

    Ok(())
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
    crate::util::fs::ensure_dir(&tmp_dir)?;
    let temp_file_path = tmp_dir.join("download.theme");
    let mut file = std::fs::File::create(&temp_file_path)?;
    response.copy_to(&mut file)?;
    Ok(temp_file_path)
}

fn install_cmd(source: &str, override_name: Option<&str>, force: bool, dry_run: bool) -> Result<()> {
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
    crate::util::fs::ensure_dir(&temp_extract)?;

    let (manifest, unpacked_dir) = package::unpack_and_validate(&theme_file_path, &temp_extract)?;
    
    let target_name = override_name.unwrap_or(&manifest.name);
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
                if !check_tool(pkg) {
                    println!("{} Missing dependency: {} (install it for full theme support)", "⚠".yellow(), pkg);
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

fn apply_cmd(name: &str, no_backup: bool, components: Option<Vec<String>>, dry_run: bool) -> Result<()> {
    let themes_dir = get_themes_dir()?;
    let theme_path = themes_dir.join(name);
    if !theme_path.exists() {
        return Err(ThemectlError::ThemeNotFound(name.to_string()));
    }

    let manifest_file = fs::File::open(theme_path.join("theme.yaml"))?;
    let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file)?;

    // Check environment support
    let current_desktop = apply::detector::detect()?;
    let supported = manifest.supports.iter().any(|s| {
        match (&current_desktop, s) {
            (DesktopEnvironment::KdePlasma6, DesktopEnvironment::KdePlasma6) => true,
            (DesktopEnvironment::KdePlasma5, DesktopEnvironment::KdePlasma5) => true,
            _ => false,
        }
    });

    if !supported {
        let desktop_str = current_desktop.to_string();
        return Err(ThemectlError::ThemeNotCompatible {
            name: name.to_string(),
            desktop: desktop_str,
        });
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
    let opts = apply::kde::ApplyOptions {
        dry_run,
        components,
    };

    let report = apply::kde::apply(&theme_path, &manifest, opts)?;

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

fn rollback_cmd(to: Option<&str>, list: bool, dry_run: bool) -> Result<()> {
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

fn list_cmd(installed: bool, available: bool) -> Result<()> {
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

fn remove_cmd(name: &str, force: bool, dry_run: bool) -> Result<()> {
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

fn source_cmd(sub: cli::SourceSubcommands) -> Result<()> {
    match sub {
        cli::SourceSubcommands::Add { url, name } => {
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
        cli::SourceSubcommands::Remove { name_or_url } => {
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
        cli::SourceSubcommands::List => {
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
        cli::SourceSubcommands::Refresh => {
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

fn export_cmd(output: Option<&str>, dry_run: bool) -> Result<()> {
    let current_desktop = apply::detector::detect()?;
    let snap = crate::backup::snapshot::create_snapshot(None, current_desktop)?;
    let kde = &snap.kde;

    let theme_name = "my-theme";
    
    // Create temporary workspace folder
    let data_dir = dirs::data_local_dir().unwrap();
    let temp_export_dir = data_dir.join("themectl/tmp/export_theme").join(theme_name);
    let _ = fs::remove_dir_all(&temp_export_dir);
    crate::util::fs::ensure_dir(&temp_export_dir)?;

    let mut comp_manifest = crate::theme::manifest::Components {
        plasma_style: kde.plasma_style.clone(),
        color_scheme: None,
        icon_theme: kde.icon_theme.clone(),
        kvantum_theme: None,
        gtk_theme: kde.gtk_theme.clone(),
        wallpaper: None,
        fonts: None,
        konsole_profile: None,
        cursor_theme: kde.cursor_theme.clone(),
    };

    // If wallpaper path is present and is a local file, copy it and make it relative
    if let Some(ref wall_path) = kde.wallpaper {
        let wall_file = Path::new(wall_path);
        if wall_file.exists() && wall_file.is_file() {
            let filename = wall_file.file_name().unwrap();
            let dest_wall_dir = temp_export_dir.join("wallpapers");
            crate::util::fs::ensure_dir(&dest_wall_dir)?;
            if !dry_run {
                std::fs::copy(wall_file, dest_wall_dir.join(filename))?;
            }
            comp_manifest.wallpaper = Some(format!("wallpapers/{}", filename.to_str().unwrap()));
        }
    }

    // Copy color scheme file if it can be found locally
    if let Some(ref scheme_name) = kde.color_scheme {
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
            crate::util::fs::ensure_dir(&dest_scheme_dir)?;
            if !dry_run {
                std::fs::copy(src_scheme_path, dest_scheme_dir.join(&scheme_filename))?;
            }
            comp_manifest.color_scheme = Some(format!("colors/{}", scheme_filename));
        }
    }

    let manifest = ThemeManifest {
        name: theme_name.to_string(),
        version: "0.1.0".to_string(),
        display_name: Some("My Exported Theme".to_string()),
        description: Some("Theme exported automatically by themectl.".to_string()),
        author: Some(std::env::var("USER").unwrap_or_else(|_| "Unknown".to_string())),
        homepage: None,
        license: Some("Proprietary".to_string()),
        supports: vec![DesktopEnvironment::KdePlasma6],
        dependencies: None,
        components: Some(comp_manifest),
    };

    if !dry_run {
        let yaml_file = fs::File::create(temp_export_dir.join("theme.yaml"))?;
        serde_yaml::to_writer(yaml_file, &manifest)?;
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

fn info_cmd(name: &str) -> Result<()> {
    let themes_dir = get_themes_dir()?;
    let theme_path = themes_dir.join(name);
    if !theme_path.exists() {
        return Err(ThemectlError::ThemeNotFound(name.to_string()));
    }

    let manifest_file = fs::File::open(theme_path.join("theme.yaml"))?;
    let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file)?;

    println!("Theme: {}", manifest.name.cyan());
    println!("Version: {}", manifest.version);
    println!("Author: {}", manifest.author.as_deref().unwrap_or("Unknown"));
    println!("License: {}", manifest.license.as_deref().unwrap_or("Unknown"));
    
    let supports_str = manifest.supports.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(", ");
    println!("Supports: {}", supports_str);

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
                let status = if check_tool(pkg) {
                    "installed".green()
                } else {
                    "missing".red()
                };
                println!("  {:<15} ✓ {}", pkg, status);
            }
        }
    }

    Ok(())
}
