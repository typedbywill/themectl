use colored::Colorize;

fn main() {
    if let Err(e) = themectl::run_cli() {
        eprintln!("{} {}", "✗ Error:".red(), e);
        if let Some(ctx) = e.context() {
            eprintln!("{}", ctx);
        }

        match &e {
            themectl::error::ThemectlError::ThemeNotCompatible { name: _, desktop: _ } => {
                eprintln!("\n  Hint: Run 'themectl list' to see available themes.");
            }
            themectl::error::ThemectlError::ThemeNotFound(_) => {
                eprintln!("\n  Hint: Search remote repositories with 'themectl list --available' or add new sources.");
            }
            _ => {}
        }
        std::process::exit(1);
    }
}
