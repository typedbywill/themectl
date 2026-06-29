use crate::error::{ThemectlError, Result};
use std::process::Command;

/// Checks if an executable is available on the system PATH.
pub fn check_tool(name: &str) -> bool {
    Command::new("which")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Runs an external command, returning its stdout as a trimmed String.
pub fn run(program: &str, args: &[&str]) -> Result<String> {
    let output = Command::new(program)
        .args(args)
        .output()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                ThemectlError::ToolNotFound(program.to_string())
            } else {
                ThemectlError::Io(e)
            }
        })?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(ThemectlError::ToolNotFound(format!(
            "Command '{}' failed with exit status {:?}: {}",
            program, output.status.code(), stderr
        )))
    }
}

/// A specific wrapper to read KDE configurations using kreadconfig5.
pub fn kreadconfig5(file: &str, group: &str, key: &str) -> Result<String> {
    run("kreadconfig5", &["--file", file, "--group", group, "--key", key])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_check_tool() {
        // 'sh' or 'ls' is always present on unix
        assert!(check_tool("sh") || check_tool("ls"));
        assert!(!check_tool("nonexistent-tool-xyz"));
    }

    #[test]
    fn test_run_success() {
        let out = run("echo", &["hello", "world"]).unwrap();
        assert_eq!(out, "hello world");
    }

    #[test]
    fn test_run_nonexistent() {
        let err = run("nonexistent-tool-xyz", &[]).unwrap_err();
        assert!(matches!(err, ThemectlError::ToolNotFound(_)));
    }
}
