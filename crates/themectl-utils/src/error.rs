/// Custom error types for themectl.
#[derive(thiserror::Error, Debug)]
pub enum ThemectlError {
    #[error("Theme '{0}' not found")]
    ThemeNotFound(String),

    #[error("Theme '{0}' is already installed. Use --force to reinstall.")]
    AlreadyInstalled(String),

    #[error("Invalid theme manifest: {0}")]
    InvalidManifest(String),

    #[error("Unsupported desktop environment: {0}")]
    UnsupportedDesktop(String),

    #[error("Theme '{name}' does not support '{desktop}'")]
    ThemeNotCompatible { name: String, desktop: String },

    #[error("Required tool not found: {0}")]
    ToolNotFound(String),

    #[error("Download failed: {0}")]
    DownloadFailed(String),

    #[error("No backup available to restore")]
    NoBackupAvailable,

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("YAML parse error: {0}")]
    YamlParse(#[from] serde_yaml::Error),

    #[error("JSON parse error: {0}")]
    JsonParse(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
}

pub type Result<T> = std::result::Result<T, ThemectlError>;

impl ThemectlError {
    pub fn context(&self) -> Option<String> {
        match self {
            Self::ThemeNotCompatible { name, .. } => {
                if let Some(data_dir) = dirs::data_local_dir() {
                    let manifest_path = data_dir.join("themectl/themes").join(name).join("theme.yaml");
                    if manifest_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(manifest_path) {
                            let mut supports = Vec::new();
                            let mut in_supports = false;
                            for line in content.lines() {
                                let trimmed = line.trim();
                                if trimmed.starts_with("supports:") {
                                    in_supports = true;
                                    continue;
                                }
                                if in_supports {
                                    if trimmed.starts_with('-') {
                                        let val = trimmed[1..].trim().trim_matches('"').trim_matches('\'').to_string();
                                        supports.push(val);
                                    } else if trimmed.contains(':') && !trimmed.starts_with('#') {
                                        break;
                                    }
                                }
                            }
                            if !supports.is_empty() {
                                return Some(format!("  Supported environments: {}", supports.join(", ")));
                            }
                        }
                    }
                }
                Some("  Supported environments: kde-plasma-6".to_string())
            }
            _ => None,
        }
    }
}
