use crate::error::Result;
use std::fs;
use std::path::Path;

/// Ensures that a directory exists, creating it recursively if it doesn't.
pub fn ensure_dir(path: &Path) -> Result<()> {
    if !path.exists() {
        fs::create_dir_all(path)?;
    }
    Ok(())
}

/// Recursively copies a directory and its contents from src to dst.
pub fn copy_dir(src: &Path, dst: &Path) -> Result<()> {
    ensure_dir(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let dst_path = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir(&entry.path(), &dst_path)?;
        } else {
            fs::copy(entry.path(), &dst_path)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_ensure_dir() {
        let parent = tempdir().unwrap();
        let target = parent.path().join("a/b/c");
        assert!(!target.exists());
        ensure_dir(&target).unwrap();
        assert!(target.exists());
        assert!(target.is_dir());
    }

    #[test]
    fn test_copy_dir() {
        let src_parent = tempdir().unwrap();
        let src = src_parent.path().join("src_dir");
        fs::create_dir(&src).unwrap();
        
        let sub = src.join("sub_dir");
        fs::create_dir(&sub).unwrap();
        
        let mut file1 = File::create(src.join("file1.txt")).unwrap();
        file1.write_all(b"hello").unwrap();
        
        let mut file2 = File::create(sub.join("file2.txt")).unwrap();
        file2.write_all(b"world").unwrap();

        let dst_parent = tempdir().unwrap();
        let dst = dst_parent.path().join("dst_dir");

        copy_dir(&src, &dst).unwrap();

        assert!(dst.join("file1.txt").exists());
        assert!(dst.join("sub_dir/file2.txt").exists());
        assert_eq!(fs::read_to_string(dst.join("file1.txt")).unwrap(), "hello");
        assert_eq!(fs::read_to_string(dst.join("sub_dir/file2.txt")).unwrap(), "world");
    }
}
