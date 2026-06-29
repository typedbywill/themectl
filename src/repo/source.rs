use crate::error::{ThemectlError, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub name: String,
    pub url: String,
    pub last_refreshed: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SourcesConfig {
    pub sources: Vec<Source>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteTheme {
    pub name: String,
    pub display_name: Option<String>,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub license: Option<String>,
    pub supports: Vec<String>,
    pub download_url: String,
    pub screenshots: Option<Vec<String>>,
    pub size_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoIndex {
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub themes: Vec<RemoteTheme>,
}

/// Resolves the absolute path to `~/.local/share/themectl/sources.yaml`.
pub fn get_sources_path() -> Result<PathBuf> {
    let data_dir = dirs::data_local_dir().ok_or_else(|| {
        ThemectlError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not resolve local data directory",
        ))
    })?;
    let themectl_dir = data_dir.join("themectl");
    crate::util::fs::ensure_dir(&themectl_dir)?;
    Ok(themectl_dir.join("sources.yaml"))
}

/// Loads configured repositories from `sources.yaml`.
/// If the file does not exist, it initializes it with the official repository.
pub fn load_sources() -> Result<SourcesConfig> {
    let path = get_sources_path()?;
    if !path.exists() {
        let default_config = SourcesConfig {
            sources: vec![Source {
                name: "official".to_string(),
                url: "https://themes.themectl.dev/index.json".to_string(),
                last_refreshed: None,
            }],
        };
        save_sources(&default_config)?;
        return Ok(default_config);
    }

    let file = fs::File::open(path)?;
    let config: SourcesConfig = serde_yaml::from_reader(file)?;
    Ok(config)
}

/// Saves the sources configuration to `sources.yaml`.
pub fn save_sources(config: &SourcesConfig) -> Result<()> {
    let path = get_sources_path()?;
    let file = fs::File::create(path)?;
    serde_yaml::to_writer(file, config)?;
    Ok(())
}

/// Helper to get cached index path for a specific source
pub fn get_source_cache_path(source_name: &str) -> Result<PathBuf> {
    let data_dir = dirs::data_local_dir().ok_or_else(|| {
        ThemectlError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not resolve local data directory",
        ))
    })?;
    let cache_dir = data_dir.join("themectl/cache");
    crate::util::fs::ensure_dir(&cache_dir)?;
    Ok(cache_dir.join(format!("{}.json", source_name)))
}
