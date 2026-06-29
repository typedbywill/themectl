use crate::error::{ThemectlError, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegistryTheme {
    pub version: String,
    pub installed_at: DateTime<Utc>,
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct Registry {
    pub applied: Option<String>,
    pub themes: HashMap<String, RegistryTheme>,
}

/// Resolves the absolute path to `~/.local/share/themectl/registry.yaml`.
pub fn get_registry_path() -> Result<PathBuf> {
    let data_dir = dirs::data_local_dir().ok_or_else(|| {
        ThemectlError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not resolve local data directory",
        ))
    })?;
    let themectl_dir = data_dir.join("themectl");
    crate::util::fs::ensure_dir(&themectl_dir)?;
    Ok(themectl_dir.join("registry.yaml"))
}

/// Loads the local theme registry index from `registry.yaml`.
/// If the file does not exist, it returns an empty Registry.
pub fn load_registry() -> Result<Registry> {
    let path = get_registry_path()?;
    if !path.exists() {
        let default_registry = Registry::default();
        save_registry(&default_registry)?;
        return Ok(default_registry);
    }

    let file = fs::File::open(path)?;
    let registry: Registry = serde_yaml::from_reader(file)?;
    Ok(registry)
}

/// Saves the registry state to `registry.yaml`.
pub fn save_registry(registry: &Registry) -> Result<()> {
    let path = get_registry_path()?;
    let file = fs::File::create(path)?;
    serde_yaml::to_writer(file, registry)?;
    Ok(())
}

/// Helper to get target path for installed themes
pub fn get_themes_dir() -> Result<PathBuf> {
    let data_dir = dirs::data_local_dir().ok_or_else(|| {
        ThemectlError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not resolve local data directory",
        ))
    })?;
    let themes_dir = data_dir.join("themectl/themes");
    crate::util::fs::ensure_dir(&themes_dir)?;
    Ok(themes_dir)
}
