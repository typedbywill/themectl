use assert_cmd::prelude::*;
use std::process::Command;
use tempfile::tempdir;
use std::fs;
use std::path::{Path, PathBuf};

fn create_theme_archive(temp_dir: &Path) -> PathBuf {
    let source_dir = temp_dir.join("minimal-theme");
    fs::create_dir(&source_dir).unwrap();
    fs::write(
        source_dir.join("theme.yaml"),
        r#"
name: minimal-theme
version: 0.1.0
supports:
  - kde-plasma-6
"#
    ).unwrap();

    let archive_path = temp_dir.join("minimal-theme.theme");
    
    let mut file = fs::File::create(&archive_path).unwrap();
    std::io::Write::write_all(&mut file, b"THEMECTL\nversion: 1\n").unwrap();
    let enc = flate2::write::GzEncoder::new(file, flate2::Compression::default());
    let mut tar = tar::Builder::new(enc);
    tar.append_dir_all("minimal-theme", &source_dir).unwrap();
    tar.finish().unwrap();

    archive_path
}

fn create_invalid_theme_archive(temp_dir: &Path) -> PathBuf {
    let source_dir = temp_dir.join("invalid-theme");
    fs::create_dir(&source_dir).unwrap();
    fs::write(
        source_dir.join("theme.yaml"),
        r#"
name: invalid_name_with_uppercase
version: invalid_semver
supports:
  - kde-plasma-6
"#
    ).unwrap();

    let archive_path = temp_dir.join("invalid-theme.theme");
    
    let mut file = fs::File::create(&archive_path).unwrap();
    std::io::Write::write_all(&mut file, b"THEMECTL\nversion: 1\n").unwrap();
    let enc = flate2::write::GzEncoder::new(file, flate2::Compression::default());
    let mut tar = tar::Builder::new(enc);
    tar.append_dir_all("invalid-theme", &source_dir).unwrap();
    tar.finish().unwrap();

    archive_path
}

#[test]
fn test_cli_install_flow() {
    let temp = tempdir().unwrap();
    let xdg_data = temp.path().join("data");
    let xdg_config = temp.path().join("config");
    fs::create_dir(&xdg_data).unwrap();
    fs::create_dir(&xdg_config).unwrap();

    let theme_path = create_theme_archive(temp.path());

    // 1. install from local .theme file
    let mut cmd = Command::cargo_bin("themectl").unwrap();
    cmd.env("XDG_DATA_HOME", &xdg_data)
       .env("XDG_CONFIG_HOME", &xdg_config)
       .arg("install")
       .arg(&theme_path);
    
    cmd.assert()
       .success()
       .stdout(predicates::str::contains("✓ Installed to"));

    let installed_path = xdg_data.join("themectl/themes/minimal-theme");
    assert!(installed_path.exists());
    assert!(installed_path.join("theme.yaml").exists());

    // 2. install already installed theme returns error
    let mut cmd_fail = Command::cargo_bin("themectl").unwrap();
    cmd_fail.env("XDG_DATA_HOME", &xdg_data)
            .env("XDG_CONFIG_HOME", &xdg_config)
            .arg("install")
            .arg(&theme_path);
    
    cmd_fail.assert()
            .failure()
            .stderr(predicates::str::contains("already installed"));

    // 3. install already installed theme with --force succeeds
    let mut cmd_force = Command::cargo_bin("themectl").unwrap();
    cmd_force.env("XDG_DATA_HOME", &xdg_data)
             .env("XDG_CONFIG_HOME", &xdg_config)
             .arg("install")
             .arg(&theme_path)
             .arg("--force");
    
    cmd_force.assert()
             .success()
             .stdout(predicates::str::contains("✓ Installed to"));

    // 4. install file that is not a valid .theme returns error
    let non_tar_file = temp.path().join("test.theme");
    fs::write(&non_tar_file, "just some text").unwrap();
    let mut cmd_bad_file = Command::cargo_bin("themectl").unwrap();
    cmd_bad_file.env("XDG_DATA_HOME", &xdg_data)
                .env("XDG_CONFIG_HOME", &xdg_config)
                .arg("install")
                .arg(&non_tar_file);
    
    cmd_bad_file.assert()
                .failure();

    // 5. install theme with invalid manifest returns error
    let invalid_theme_path = create_invalid_theme_archive(temp.path());
    let mut cmd_bad_manifest = Command::cargo_bin("themectl").unwrap();
    cmd_bad_manifest.env("XDG_DATA_HOME", &xdg_data)
                    .env("XDG_CONFIG_HOME", &xdg_config)
                    .arg("install")
                    .arg(&invalid_theme_path);
    
    cmd_bad_manifest.assert()
                    .failure()
                    .stderr(predicates::str::contains("Invalid theme manifest"));
}

#[test]
fn test_cli_new_features_flow() {
    use ed25519_dalek::SigningKey;
    use rand::rngs::OsRng;

    let temp = tempdir().unwrap();
    let xdg_data = temp.path().join("data");
    let xdg_config = temp.path().join("config");
    fs::create_dir(&xdg_data).unwrap();
    fs::create_dir(&xdg_config).unwrap();

    // 1. Create a theme with id and targets
    let source_dir = temp.path().join("signed-theme");
    fs::create_dir(&source_dir).unwrap();
    fs::write(
        source_dir.join("theme.yaml"),
        r#"
id: org.signed.theme
name: signed-theme
version: 0.1.0
targets:
  - kde-plasma
compatibility:
  plasma:
    min: 6.0
    max: 6.x
components:
  color_scheme: ./colors.colors
  wallpaper: ./wall.jpg
"#
    ).unwrap();
    fs::write(source_dir.join("colors.colors"), "[General]\n").unwrap();
    fs::write(source_dir.join("wall.jpg"), "fake-jpg-data").unwrap();

    // Generate keys and sign theme directory
    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let signature = themectl::theme::signature::sign_theme_dir(&source_dir, &signing_key).unwrap();

    // Append signature to theme.yaml
    let mut yaml_content = fs::read_to_string(source_dir.join("theme.yaml")).unwrap();
    yaml_content.push_str(&format!(
        "\nsignature:\n  algorithm: {}\n  public_key: {}\n  signature: {}\n",
        signature.algorithm, signature.public_key, signature.signature
    ));
    fs::write(source_dir.join("theme.yaml"), yaml_content).unwrap();

    // Pack theme
    let archive_path = temp.path().join("signed-theme.theme");
    {
        let mut file = fs::File::create(&archive_path).unwrap();
        std::io::Write::write_all(&mut file, b"THEMECTL\nversion: 1\n").unwrap();
        let enc = flate2::write::GzEncoder::new(file, flate2::Compression::default());
        let mut tar = tar::Builder::new(enc);
        tar.append_dir_all("signed-theme", &source_dir).unwrap();
        tar.finish().unwrap();
    }

    // 2. Install the signed theme
    let mut cmd_install = Command::cargo_bin("themectl").unwrap();
    cmd_install.env("XDG_DATA_HOME", &xdg_data)
               .env("XDG_CONFIG_HOME", &xdg_config)
               .arg("install")
               .arg(&archive_path);

    cmd_install.assert()
               .success()
               .stdout(predicates::str::contains("✓ Theme cryptographic signature is valid!"));

    // Verify it was installed using the ID "org.signed.theme" instead of name
    let installed_path = xdg_data.join("themectl/themes/org.signed.theme");
    assert!(installed_path.exists());

    // 3. Verify command
    let mut cmd_verify = Command::cargo_bin("themectl").unwrap();
    cmd_verify.env("XDG_DATA_HOME", &xdg_data)
              .env("XDG_CONFIG_HOME", &xdg_config)
              .arg("verify")
              .arg("org.signed.theme");

    cmd_verify.assert()
              .success()
              .stdout(predicates::str::contains("✓ Cryptographic signature is valid!"));

    // Verify local package path directly
    let mut cmd_verify_path = Command::cargo_bin("themectl").unwrap();
    cmd_verify_path.env("XDG_DATA_HOME", &xdg_data)
                   .env("XDG_CONFIG_HOME", &xdg_config)
                   .arg("verify")
                   .arg(&archive_path);

    cmd_verify_path.assert()
                   .success()
                   .stdout(predicates::str::contains("✓ Cryptographic signature is valid!"));

    // 4. Preview command
    let mut cmd_preview = Command::cargo_bin("themectl").unwrap();
    cmd_preview.env("XDG_DATA_HOME", &xdg_data)
               .env("XDG_CONFIG_HOME", &xdg_config)
               .arg("preview")
               .arg("org.signed.theme");

    cmd_preview.assert()
               .success()
               .stdout(predicates::str::contains("✓ Mudará esquema de cores"))
               .stdout(predicates::str::contains("✓ Alterará wallpaper"));

    // 5. Doctor command
    let mut cmd_doctor = Command::cargo_bin("themectl").unwrap();
    cmd_doctor.env("XDG_DATA_HOME", &xdg_data)
              .env("XDG_CONFIG_HOME", &xdg_config)
              .arg("doctor");

    cmd_doctor.assert()
              .success()
              .stdout(predicates::str::contains("=== Themectl System Doctor ==="));
}
