use assert_cmd::prelude::*;
use std::process::Command;
use tempfile::tempdir;
use std::fs;

#[test]
fn test_cli_rollback_flow() {
    let temp = tempdir().unwrap();
    let xdg_data = temp.path().join("data");
    let xdg_config = temp.path().join("config");
    fs::create_dir(&xdg_data).unwrap();
    fs::create_dir(&xdg_config).unwrap();

    // 1. rollback with no backup returns error
    let mut cmd_fail = Command::cargo_bin("themectl").unwrap();
    cmd_fail.env("XDG_DATA_HOME", &xdg_data)
            .env("XDG_CONFIG_HOME", &xdg_config)
            .arg("rollback");
    
    cmd_fail.assert()
            .failure()
            .stderr(predicates::str::contains("No backup available"));

    // Create a mock backup snapshot to test --list and rollback
    let backups_dir = xdg_data.join("themectl/backups/2024-01-15T10-30-00");
    fs::create_dir_all(&backups_dir).unwrap();
    fs::write(
        backups_dir.join("snapshot.yaml"),
        r#"
created_at: "2024-01-15T10:30:00Z"
desktop: kde-plasma-6
theme_applied: null
kde:
  plasma_style: "Breeze"
  color_scheme: "BreezeLight"
"#
    ).unwrap();

    // 2. rollback --list shows available backups
    let mut cmd_list = Command::cargo_bin("themectl").unwrap();
    cmd_list.env("XDG_DATA_HOME", &xdg_data)
            .env("XDG_CONFIG_HOME", &xdg_config)
            .arg("rollback")
            .arg("--list");

    cmd_list.assert()
            .success()
            .stdout(predicates::str::contains("2024-01-15T10-30-00"))
            .stdout(predicates::str::contains("plasma: Breeze"));

    // Test actual rollback execution
    let mut cmd_rollback = Command::cargo_bin("themectl").unwrap();
    cmd_rollback.env("XDG_DATA_HOME", &xdg_data)
                .env("XDG_CONFIG_HOME", &xdg_config)
                .arg("rollback")
                .arg("--to")
                .arg("2024-01-15T10-30-00");

    cmd_rollback.assert()
                .success()
                .stdout(predicates::str::contains("Successfully rolled back to snapshot"));
}
