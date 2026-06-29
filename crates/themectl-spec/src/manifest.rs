use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;

/// Desktop environments supported by themectl.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DesktopEnvironment {
    KdePlasma6,
    KdePlasma5,
    Unknown(String),
}

impl fmt::Display for DesktopEnvironment {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::KdePlasma6 => write!(f, "kde-plasma-6"),
            Self::KdePlasma5 => write!(f, "kde-plasma-5"),
            Self::Unknown(s) => write!(f, "{}", s),
        }
    }
}

impl<'de> Deserialize<'de> for DesktopEnvironment {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match s.as_str() {
            "kde-plasma-6" => Ok(Self::KdePlasma6),
            "kde-plasma-5" => Ok(Self::KdePlasma5),
            other => Ok(Self::Unknown(other.to_string())),
        }
    }
}

impl Serialize for DesktopEnvironment {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// System and font dependencies for a theme.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Dependencies {
    pub packages: Option<Vec<String>>,
    pub system: Option<Vec<String>>,
    pub fonts: Option<Vec<String>>,
    pub icons: Option<Vec<String>>,
}

/// Desktop version compatibility requirements.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PlasmaCompat {
    pub min: Option<String>,
    pub max: Option<String>,
}

/// Compatibility requirements for the theme.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Compatibility {
    pub plasma: Option<PlasmaCompat>,
    pub distro: Option<Vec<String>>,
}

/// Cryptographic signature of the theme.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Signature {
    pub algorithm: String,
    pub public_key: String,
    pub signature: String,
}

/// Individual theme components to apply.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Components {
    pub plasma_style: Option<String>,
    pub color_scheme: Option<String>,
    pub icon_theme: Option<String>,
    pub kvantum_theme: Option<String>,
    pub gtk_theme: Option<String>,
    pub wallpaper: Option<String>,
    pub fonts: Option<Vec<String>>,
    pub konsole_profile: Option<String>,
    pub cursor_theme: Option<String>,
}

/// The main manifest structure for theme.yaml.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ThemeManifest {
    pub id: Option<String>,
    pub name: String,
    pub version: String,
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub author: Option<String>,
    pub homepage: Option<String>,
    pub license: Option<String>,
    #[serde(default)]
    pub supports: Vec<DesktopEnvironment>,
    pub targets: Option<Vec<String>>,
    pub compatibility: Option<Compatibility>,
    pub dependencies: Option<Dependencies>,
    pub components: Option<Components>,
    pub signature: Option<Signature>,
}
