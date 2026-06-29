use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(name = "themectl", version, about = "Linux Theme Manager (MVP)")]
pub struct Cli {
    #[arg(short, long, global = true, help = "Show verbose logs")]
    pub verbose: bool,

    #[arg(long, global = true, help = "Disable color output")]
    pub no_color: bool,

    #[arg(long, global = true, help = "Simulate operations without making changes")]
    pub dry_run: bool,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    #[command(about = "Install a theme from a local file, URL or configured repository")]
    Install {
        source: String,
        #[arg(long, help = "Override theme name during installation")]
        name: Option<String>,
        #[arg(long, help = "Reinstall theme if already installed")]
        force: bool,
    },
    #[command(about = "Apply a theme to the current desktop")]
    Apply {
        name: String,
        #[arg(long, help = "Skip creating backup before applying")]
        no_backup: bool,
        #[arg(long, value_delimiter = ',', help = "Comma-separated list of components to apply")]
        components: Option<Vec<String>>,
    },
    #[command(about = "Rollback configuration to a previous snapshot")]
    Rollback {
        #[arg(long, help = "Rollback to a specific timestamp")]
        to: Option<String>,
        #[arg(long, help = "List all available backups")]
        list: bool,
    },
    #[command(about = "List installed or available themes")]
    List {
        #[arg(long, help = "List installed themes (default)")]
        installed: bool,
        #[arg(long, help = "List themes available in repositories")]
        available: bool,
    },
    #[command(about = "Uninstall a theme")]
    Remove {
        name: String,
        #[arg(long, help = "Force removal even if the theme is currently applied")]
        force: bool,
    },
    #[command(about = "Manage theme sources/repositories")]
    Source {
        #[command(subcommand)]
        subcommand: SourceSubcommands,
    },
    #[command(about = "Export current desktop appearance as a theme package")]
    Export {
        #[arg(long, help = "Output archive file path")]
        output: Option<String>,
    },
    #[command(about = "Show details of an installed theme")]
    Info {
        name: String,
    },
}

#[derive(Subcommand, Debug)]
pub enum SourceSubcommands {
    #[command(about = "Add a repository source")]
    Add {
        url: String,
        #[arg(long, help = "Optional custom name for the repository")]
        name: Option<String>,
    },
    #[command(about = "Remove a repository source")]
    Remove {
        name_or_url: String,
    },
    #[command(about = "List all configured repositories")]
    List,
    #[command(about = "Refresh local cache of configured repositories")]
    Refresh,
}
