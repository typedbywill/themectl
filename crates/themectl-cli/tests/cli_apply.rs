use assert_cmd::prelude::*;
use std::process::Command;
use tempfile::tempdir;
use std::fs;
use std::path::Path;

fn install_test_theme(xdg_data: &Path, _xdg_config: &Path) {
    let themes_dir = xdg_data.join("themectl/themes/minimal-theme");
    fs::create_dir_all(&themes_dir).unwrap();
    fs::write(
        themes_dir.join("theme.yaml"),
        r#"
name: minimal-theme
version: 0.1.0
supports:
  - kde-plasma-6
components:
  plasma_style: ./plasma
"#
    ).unwrap();
    fs::create_dir(themes_dir.join("plasma")).unwrap();
}

#[test]
fn test_cli_apply_flow() {
    let temp = tempdir().unwrap();
    let xdg_data = temp.path().join("data");
    let xdg_config = temp.path().join("config");
    fs::create_dir(&xdg_data).unwrap();
    fs::create_dir(&xdg_config).unwrap();

    // 1. apply theme not installed returns error
    let mut cmd_fail = Command::cargo_bin("themectl").unwrap();
    cmd_fail.env("XDG_DATA_HOME", &xdg_data)
            .env("XDG_CONFIG_HOME", &xdg_config)
            .arg("apply")
            .arg("minimal-theme");
    
    cmd_fail.assert()
            .failure()
            .stderr(predicates::str::contains("not found"));

    // Install the theme for the next steps
    install_test_theme(&xdg_data, &xdg_config);

    // 2. apply installed theme with --dry-run prints plan and does not apply
    let mut cmd_dry = Command::cargo_bin("themectl").unwrap();
    cmd_dry.env("XDG_DATA_HOME", &xdg_data)
           .env("XDG_CONFIG_HOME", &xdg_config)
           .env("XDG_CURRENT_DESKTOP", "KDE")
           .env("KDE_SESSION_VERSION", "6")
           .arg("--dry-run")
           .arg("apply")
           .arg("minimal-theme");
    
    cmd_dry.assert()
           .success()
           .stdout(predicates::str::contains("(dry-run) Would apply"))
           .stdout(predicates::str::contains("simulated successfully"));

    // Verify registry applied theme is NOT set after dry-run
    let registry_file = xdg_data.join("themectl/registry.yaml");
    if registry_file.exists() {
        let content = fs::read_to_string(&registry_file).unwrap();
        assert!(!content.contains("applied: minimal-theme"));
    }

    // 3. apply creates backup before applying (unless --no-backup)
    let mut cmd_apply = Command::cargo_bin("themectl").unwrap();
    cmd_apply.env("XDG_DATA_HOME", &xdg_data)
              .env("XDG_CONFIG_HOME", &xdg_config)
              .env("XDG_CURRENT_DESKTOP", "KDE")
              .env("KDE_SESSION_VERSION", "6")
              .arg("apply")
              .arg("minimal-theme");

    cmd_apply.assert()
              .success()
              .stdout(predicates::str::contains("✓ Backup created"))
              .stdout(predicates::str::contains("Theme 'minimal-theme' applied successfully"));

    // Verify backup folder exists
    let backups_dir = xdg_data.join("themectl/backups");
    assert!(backups_dir.exists());
    let mut has_backup = false;
    for entry in fs::read_dir(backups_dir).unwrap() {
        let entry = entry.unwrap();
        if entry.path().join("snapshot.yaml").exists() {
            has_backup = true;
        }
    }
    assert!(has_backup);
}
