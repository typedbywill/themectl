use crate::error::{ThemectlError, Result};
use crate::theme::manifest::ThemeManifest;
use crate::theme::validator;
use flate2::read::GzDecoder;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tar::Archive;

/// Unpacks a .theme package, reads the manifest, and validates it.
/// Returns the parsed manifest and the path to the unpacked theme directory.
pub fn unpack_and_validate(theme_tar_path: &Path, temp_extract_dir: &Path) -> Result<(ThemeManifest, PathBuf)> {
    let mut file = File::open(theme_tar_path)?;
    
    // Read and verify the header
    let mut header = [0u8; 20];
    file.read_exact(&mut header).map_err(|_| {
        ThemectlError::InvalidManifest("Invalid theme package format: missing or corrupt THEMECTL header".to_string())
    })?;
    
    if &header != b"THEMECTL\nversion: 1\n" {
        return Err(ThemectlError::InvalidManifest("Invalid theme package format: unsupported or missing THEMECTL header".to_string()));
    }
    
    let tar = GzDecoder::new(file);
    let mut archive = Archive::new(tar);

    archive.unpack(temp_extract_dir)?;

    // Search for a directory containing theme.yaml inside the extraction dir
    let mut theme_dir = None;
    for entry in std::fs::read_dir(temp_extract_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() && path.join("theme.yaml").exists() {
            theme_dir = Some(path);
            break;
        }
    }

    let theme_dir = theme_dir.ok_or_else(|| {
        ThemectlError::InvalidManifest("theme.yaml not found in package root".to_string())
    })?;

    let manifest_path = theme_dir.join("theme.yaml");
    let manifest_file = File::open(manifest_path)?;
    
    // strict deserialization to deny unknown fields
    let manifest: ThemeManifest = serde_yaml::from_reader(manifest_file)?;

    // validate the manifest structure and component paths
    validator::validate(&manifest, &theme_dir)?;

    Ok((manifest, theme_dir))
}

/// Packs a theme directory into a .theme file with the THEMECTL header.
pub fn pack_theme(theme_dir: &Path, output_archive_path: &Path) -> Result<()> {
    let mut file = File::create(output_archive_path)?;
    
    // Write the magic header
    file.write_all(b"THEMECTL\nversion: 1\n")?;
    
    let enc = flate2::write::GzEncoder::new(file, flate2::Compression::default());
    let mut tar = tar::Builder::new(enc);

    let folder_name = theme_dir.file_name().ok_or_else(|| {
        ThemectlError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Invalid theme directory path",
        ))
    })?;

    tar.append_dir_all(folder_name, theme_dir)?;
    tar.finish()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::{self, File};
    use std::io::Write;

    #[test]
    fn test_pack_and_unpack() {
        let source_temp = tempdir().unwrap();
        let theme_folder = source_temp.path().join("my-theme");
        fs::create_dir(&theme_folder).unwrap();

        // Create theme.yaml
        let manifest_content = r#"
name: my-theme
version: 1.0.0
supports:
  - kde-plasma-6
"#;
        let mut yaml_file = File::create(theme_folder.join("theme.yaml")).unwrap();
        yaml_file.write_all(manifest_content.as_bytes()).unwrap();

        // Pack it
        let archive_temp = tempdir().unwrap();
        let archive_path = archive_temp.path().join("my-theme.theme");
        pack_theme(&theme_folder, &archive_path).unwrap();

        // Unpack and validate it
        let extract_temp = tempdir().unwrap();
        let (manifest, unpacked_dir) = unpack_and_validate(&archive_path, extract_temp.path()).unwrap();

        assert_eq!(manifest.name, "my-theme");
        assert_eq!(manifest.version, "1.0.0");
        assert!(unpacked_dir.join("theme.yaml").exists());
    }
}
