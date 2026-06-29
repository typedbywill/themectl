use crate::error::{ThemectlError, Result};
use crate::theme::manifest::{ThemeManifest, DesktopEnvironment};
use std::path::Path;

/// Validates the theme manifest according to SPEC rules.
pub fn validate(manifest: &ThemeManifest, package_dir: &Path) -> Result<()> {
    // 1. Name validation
    if !is_valid_name(&manifest.name) {
        return Err(ThemectlError::InvalidManifest(format!(
            "name '{}' is invalid (must match ^[a-z0-9][a-z0-9-]{{1,63}}$)",
            manifest.name
        )));
    }

    // 2. Version validation
    if !is_valid_semver(&manifest.version) {
        return Err(ThemectlError::InvalidManifest(format!(
            "version '{}' is not valid SemVer 2.0",
            manifest.version
        )));
    }

    // 3. Description length validation
    if let Some(ref desc) = manifest.description {
        if desc.chars().count() > 200 {
            return Err(ThemectlError::InvalidManifest(
                "description exceeds maximum length of 200 characters".to_string(),
            ));
        }
    }

    // 4. Desktop environment compatibility validation
    let has_valid_env = manifest.supports.iter().any(|env| {
        matches!(env, DesktopEnvironment::KdePlasma6 | DesktopEnvironment::KdePlasma5)
    });
    if !has_valid_env {
        return Err(ThemectlError::InvalidManifest(
            "supports must contain at least one valid desktop environment (kde-plasma-5 or kde-plasma-6)".to_string(),
        ));
    }

    // 5. Component relative path existence validation
    if let Some(ref comp) = manifest.components {
        let check_path = |p: &str| -> Result<()> {
            if p.starts_with("./") || p.starts_with("../") || (!p.starts_with('/') && !p.contains(':')) {
                // If it's a relative path, strip leading "./" if present
                let clean_p = if p.starts_with("./") { &p[2..] } else { p };
                let full_path = package_dir.join(clean_p);
                if !full_path.exists() {
                    return Err(ThemectlError::InvalidManifest(format!(
                        "referenced path '{}' does not exist in package",
                        p
                    )));
                }
            }
            Ok(())
        };

        if let Some(ref p) = comp.plasma_style {
            check_path(p)?;
        }
        if let Some(ref p) = comp.color_scheme {
            check_path(p)?;
        }
        if let Some(ref p) = comp.icon_theme {
            check_path(p)?;
        }
        if let Some(ref p) = comp.kvantum_theme {
            check_path(p)?;
        }
        if let Some(ref p) = comp.gtk_theme {
            check_path(p)?;
        }
        if let Some(ref p) = comp.wallpaper {
            check_path(p)?;
        }
        if let Some(ref fonts) = comp.fonts {
            for font in fonts {
                check_path(font)?;
            }
        }
        if let Some(ref p) = comp.konsole_profile {
            check_path(p)?;
        }
        if let Some(ref p) = comp.cursor_theme {
            check_path(p)?;
        }
    }

    Ok(())
}

fn is_valid_name(name: &str) -> bool {
    let len = name.len();
    if len < 2 || len > 64 {
        return false;
    }
    let mut chars = name.chars();
    if let Some(first) = chars.next() {
        if !first.is_ascii_lowercase() && !first.is_ascii_digit() {
            return false;
        }
    } else {
        return false;
    }
    for c in chars {
        if !c.is_ascii_lowercase() && !c.is_ascii_digit() && c != '-' {
            return false;
        }
    }
    true
}

fn is_valid_semver(v: &str) -> bool {
    let parts: Vec<&str> = v.splitn(3, '.').collect();
    if parts.len() != 3 {
        return false;
    }
    
    let major = parts[0];
    let minor = parts[1];
    let rest = parts[2];
    
    if !is_numeric_identifier(major) {
        return false;
    }
    if !is_numeric_identifier(minor) {
        return false;
    }
    
    let (patch_and_prerelease, build) = if let Some(idx) = rest.find('+') {
        (&rest[..idx], Some(&rest[idx+1..]))
    } else {
        (rest, None)
    };
    
    let (patch, prerelease) = if let Some(idx) = patch_and_prerelease.find('-') {
        (&patch_and_prerelease[..idx], Some(&patch_and_prerelease[idx+1..]))
    } else {
        (patch_and_prerelease, None)
    };
    
    if !is_numeric_identifier(patch) {
        return false;
    }
    
    if let Some(pre) = prerelease {
        if pre.is_empty() {
            return false;
        }
        for identifier in pre.split('.') {
            if identifier.is_empty() {
                return false;
            }
            if identifier.chars().all(|c| c.is_ascii_digit()) && !is_numeric_identifier(identifier) {
                return false;
            }
            for c in identifier.chars() {
                if !c.is_ascii_alphanumeric() && c != '-' {
                    return false;
                }
            }
        }
    }
    
    if let Some(b) = build {
        if b.is_empty() {
            return false;
        }
        for identifier in b.split('.') {
            if identifier.is_empty() {
                return false;
            }
            for c in identifier.chars() {
                if !c.is_ascii_alphanumeric() && c != '-' {
                    return false;
                }
            }
        }
    }
    
    true
}

fn is_numeric_identifier(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }
    if s == "0" {
        return true;
    }
    if s.starts_with('0') {
        return false;
    }
    s.chars().all(|c| c.is_ascii_digit())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::theme::manifest::Components;
    use tempfile::tempdir;

    fn get_minimal_manifest() -> ThemeManifest {
        ThemeManifest {
            name: "minimal-theme".to_string(),
            version: "0.1.0".to_string(),
            display_name: None,
            description: None,
            author: None,
            homepage: None,
            license: None,
            supports: vec![DesktopEnvironment::KdePlasma6],
            dependencies: None,
            components: None,
        }
    }

    #[test]
    fn test_validate_valid() {
        let dir = tempdir().unwrap();
        let manifest = get_minimal_manifest();
        assert!(validate(&manifest, dir.path()).is_ok());
    }

    #[test]
    fn test_validate_invalid_name() {
        let dir = tempdir().unwrap();
        let mut manifest = get_minimal_manifest();

        manifest.name = "A-invalid".to_string();
        assert!(validate(&manifest, dir.path()).is_err());

        manifest.name = "a".to_string(); // too short
        assert!(validate(&manifest, dir.path()).is_err());

        manifest.name = "invalid_name".to_string(); // underscores not allowed
        assert!(validate(&manifest, dir.path()).is_err());
    }

    #[test]
    fn test_validate_invalid_semver() {
        let dir = tempdir().unwrap();
        let mut manifest = get_minimal_manifest();

        manifest.version = "1.0".to_string();
        assert!(validate(&manifest, dir.path()).is_err());

        manifest.version = "1.0.01".to_string();
        assert!(validate(&manifest, dir.path()).is_err());
    }

    #[test]
    fn test_validate_description_length() {
        let dir = tempdir().unwrap();
        let mut manifest = get_minimal_manifest();

        manifest.description = Some("a".repeat(201));
        assert!(validate(&manifest, dir.path()).is_err());

        manifest.description = Some("a".repeat(200));
        assert!(validate(&manifest, dir.path()).is_ok());
    }

    #[test]
    fn test_validate_missing_env() {
        let dir = tempdir().unwrap();
        let mut manifest = get_minimal_manifest();

        manifest.supports = vec![DesktopEnvironment::Unknown("gnome".to_string())];
        assert!(validate(&manifest, dir.path()).is_err());
    }

    #[test]
    fn test_validate_component_paths() {
        let dir = tempdir().unwrap();
        let mut manifest = get_minimal_manifest();

        manifest.components = Some(Components {
            plasma_style: Some("./plasma".to_string()),
            color_scheme: None,
            icon_theme: None,
            kvantum_theme: None,
            gtk_theme: None,
            wallpaper: None,
            fonts: None,
            konsole_profile: None,
            cursor_theme: None,
        });

        // Path does not exist
        assert!(validate(&manifest, dir.path()).is_err());

        // Create the directory
        std::fs::create_dir(dir.path().join("plasma")).unwrap();
        assert!(validate(&manifest, dir.path()).is_ok());
    }
}
