use themectl_utils::{ThemectlError, Result};
use themectl_spec::{ThemeManifest, Signature};
use ed25519_dalek::{VerifyingKey, Signature as DalekSignature, Signer, Verifier};
use sha2::{Sha256, Digest};
use std::fs;
use std::path::{Path, PathBuf};

/// Recursively gathers all file paths in a directory.
fn gather_files(dir: &Path) -> Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                files.extend(gather_files(&path)?);
            } else {
                files.push(path);
            }
        }
    }
    Ok(files)
}

/// Computes a canonical SHA-256 hash of the theme directory.
/// Files are processed in deterministic order (sorted relative paths).
/// For `theme.yaml`, the `signature` block is excluded/cleared to ensure stability.
pub fn compute_theme_hash(theme_dir: &Path) -> Result<[u8; 32]> {
    let mut files = gather_files(theme_dir)?;
    
    // Sort by relative path to make it deterministic
    files.sort_by(|a, b| {
        let rel_a = a.strip_prefix(theme_dir).unwrap_or(a);
        let rel_b = b.strip_prefix(theme_dir).unwrap_or(b);
        rel_a.cmp(rel_b)
    });

    let mut hasher = Sha256::new();

    for file_path in files {
        let rel_path = file_path.strip_prefix(theme_dir).unwrap_or(&file_path);
        let rel_path_str = rel_path.to_string_lossy();
        
        // Skip theme.lock and any temporary backup/hidden files if necessary,
        // but let's hash everything except maybe theme.lock if we want to exclude it.
        // Let's exclude "theme.lock" from the signature hash because it represents environment info
        // and shouldn't invalidate the theme asset signature if generated or modified.
        if rel_path_str == "theme.lock" {
            continue;
        }

        // Feed relative path to prevent file renaming attacks
        hasher.update(rel_path_str.as_bytes());
        hasher.update(b"\0");

        if rel_path_str == "theme.yaml" {
            let manifest_content = fs::read_to_string(&file_path)?;
            let mut manifest: ThemeManifest = serde_yaml::from_str(&manifest_content)?;
            // Clear signature block for canonical hash
            manifest.signature = None;
            // Serialize to a canonical JSON string (standardized spacing/keys)
            let canonical_json = serde_json::to_string(&manifest)
                .map_err(|e| ThemectlError::InvalidManifest(format!("Failed to canonicalize manifest: {}", e)))?;
            hasher.update(canonical_json.as_bytes());
        } else {
            let file_bytes = fs::read(&file_path)?;
            hasher.update(&file_bytes);
        }
    }

    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    Ok(hash)
}

/// Verifies that the theme signature is cryptographically valid.
pub fn verify_theme_signature(theme_dir: &Path, signature: &Signature) -> Result<()> {
    if signature.algorithm != "ed25519" {
        return Err(ThemectlError::InvalidManifest(format!(
            "Unsupported signature algorithm: {}",
            signature.algorithm
        )));
    }

    let pub_key_bytes = hex::decode(&signature.public_key).map_err(|e| {
        ThemectlError::InvalidManifest(format!("Invalid hex in public_key: {}", e))
    })?;

    let sig_bytes = hex::decode(&signature.signature).map_err(|e| {
        ThemectlError::InvalidManifest(format!("Invalid hex in signature: {}", e))
    })?;

    let pub_key_arr: [u8; 32] = pub_key_bytes.try_into().map_err(|_| {
        ThemectlError::InvalidManifest("Public key must be 32 bytes".to_string())
    })?;

    let sig_arr: [u8; 64] = sig_bytes.try_into().map_err(|_| {
        ThemectlError::InvalidManifest("Signature must be 64 bytes".to_string())
    })?;

    let verifying_key = VerifyingKey::from_bytes(&pub_key_arr).map_err(|e| {
        ThemectlError::InvalidManifest(format!("Failed to parse public key: {}", e))
    })?;

    let dalek_sig = DalekSignature::from_bytes(&sig_arr);

    let theme_hash = compute_theme_hash(theme_dir)?;

    verifying_key.verify(&theme_hash, &dalek_sig).map_err(|e| {
        ThemectlError::InvalidManifest(format!("Cryptographic signature verification failed: {}", e))
    })?;

    Ok(())
}

/// Helper function to cryptographically sign a theme directory.
/// Returns the generated Signature struct.
pub fn sign_theme_dir(theme_dir: &Path, signing_key: &ed25519_dalek::SigningKey) -> Result<Signature> {
    let theme_hash = compute_theme_hash(theme_dir)?;
    let sig = signing_key.sign(&theme_hash);
    
    Ok(Signature {
        algorithm: "ed25519".to_string(),
        public_key: hex::encode(signing_key.verifying_key().to_bytes()),
        signature: hex::encode(sig.to_bytes()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use themectl_spec::{DesktopEnvironment, ThemeManifest};
    use ed25519_dalek::SigningKey;
    use rand::rngs::OsRng;
    use tempfile::tempdir;

    #[test]
    fn test_signature_sign_and_verify() {
        let dir = tempdir().unwrap();
        let theme_path = dir.path().join("my-theme");
        fs::create_dir(&theme_path).unwrap();

        let manifest = ThemeManifest {
            id: Some("org.test.theme".to_string()),
            name: "test-theme".to_string(),
            version: "1.0.0".to_string(),
            display_name: None,
            description: None,
            author: None,
            homepage: None,
            license: None,
            supports: vec![DesktopEnvironment::KdePlasma6],
            targets: None,
            compatibility: None,
            dependencies: None,
            components: None,
            signature: None,
        };

        // Write theme.yaml
        let manifest_str = serde_yaml::to_string(&manifest).unwrap();
        fs::write(theme_path.join("theme.yaml"), manifest_str).unwrap();

        // Write another asset file
        fs::write(theme_path.join("asset.txt"), "hello world").unwrap();

        // Generate keypair
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);

        // Sign
        let signature = sign_theme_dir(&theme_path, &signing_key).unwrap();

        // Verify
        assert!(verify_theme_signature(&theme_path, &signature).is_ok());

        // Modify asset.txt and verify it fails
        fs::write(theme_path.join("asset.txt"), "hello modified world").unwrap();
        assert!(verify_theme_signature(&theme_path, &signature).is_err());
    }
}
