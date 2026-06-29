use clap::Parser;
use colored::Colorize;
use themectl_utils::{ThemectlError, Result};
use themectl_core::SourceSubcommand;

mod cli;

fn main() {
    if let Err(e) = run_cli() {
        eprintln!("{} {}", "✗ Error:".red(), e);
        if let Some(ctx) = e.context() {
            eprintln!("{}", ctx);
        }

        match &e {
            ThemectlError::ThemeNotCompatible { name: _, desktop: _ } => {
                eprintln!("\n  Hint: Run 'themectl list' to see available themes.");
            }
            ThemectlError::ThemeNotFound(_) => {
                eprintln!("\n  Hint: Search remote repositories with 'themectl list --available' or add new sources.");
            }
            _ => {}
        }
        std::process::exit(1);
    }
}

fn run_cli() -> Result<()> {
    let cli = cli::Cli::parse();

    if cli.no_color {
        colored::control::set_override(false);
    }

    match cli.command {
        cli::Commands::Install { source, name, force } => {
            themectl_core::install(&source, name.as_deref(), force, cli.dry_run)?;
        }
        cli::Commands::Apply { name, no_backup, components } => {
            themectl_core::apply(&name, no_backup, components, cli.dry_run)?;
        }
        cli::Commands::Rollback { to, list } => {
            themectl_core::rollback(to.as_deref(), list, cli.dry_run)?;
        }
        cli::Commands::List { installed, available } => {
            themectl_core::list(installed, available)?;
        }
        cli::Commands::Remove { name, force } => {
            themectl_core::remove(&name, force, cli.dry_run)?;
        }
        cli::Commands::Source { subcommand } => {
            let core_sub = match subcommand {
                cli::SourceSubcommands::Add { url, name } => SourceSubcommand::Add { url, name },
                cli::SourceSubcommands::Remove { name_or_url } => SourceSubcommand::Remove { name_or_url },
                cli::SourceSubcommands::List => SourceSubcommand::List,
                cli::SourceSubcommands::Refresh => SourceSubcommand::Refresh,
            };
            themectl_core::source(core_sub)?;
        }
        cli::Commands::Export { output } => {
            themectl_core::export(output.as_deref(), cli.dry_run)?;
        }
        cli::Commands::Info { name } => {
            themectl_core::info(&name)?;
        }
        cli::Commands::Doctor => {
            themectl_core::doctor()?;
        }
        cli::Commands::Verify { name_or_path } => {
            themectl_core::verify(&name_or_path)?;
        }
        cli::Commands::Preview { name_or_path } => {
            themectl_core::preview(&name_or_path)?;
        }
    }

    Ok(())
}
