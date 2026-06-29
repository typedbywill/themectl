# themectl

> **Install, share and restore complete KDE Plasma themes with a single command.**

`themectl` lets you install, apply, export, and roll back visual themes on KDE Plasma 5/6 from local packages, remote URLs, or curated repositories — all from a single CLI command.

![Build](https://img.shields.io/github/actions/workflow/status/yourusername/themectl/ci.yml?style=flat-square)
![Crates.io](https://img.shields.io/crates/v/themectl-cli?style=flat-square)
![License](https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square)
![Rust](https://img.shields.io/badge/rust-stable-orange?style=flat-square&logo=rust)
![KDE Plasma](https://img.shields.io/badge/KDE%20Plasma-5%20%2F%206-1d99f3?style=flat-square&logo=kde)

---

## Features

- 📦 **Install themes** from local `.theme` files, direct URLs, or configured remote repositories
- 🎨 **Apply themes** atomically to all KDE components at once: Plasma style, color scheme, icons, cursor, Kvantum, GTK, wallpaper, fonts, and Konsole profile
- 🔄 **Rollback** your desktop configuration to any previous snapshot with one command
- 🔐 **Cryptographic verification** — themes are signed with Ed25519; signatures are verified on install
- 📤 **Export** your current desktop appearance as a portable `.theme` package
- 🔎 **Preview** changes before applying them (dry-run mode)
- 🏥 **Doctor** — inspect your environment and detect missing optional dependencies
- 🗂️ **Repository management** — add, refresh, and list remote theme indexes
- 🧩 **Selective component apply** — apply only the components you want (e.g., just the wallpaper or only the color scheme)

---

## Why?

Customizing KDE Plasma often requires manually installing and configuring:

- Plasma themes
- Color schemes
- Icon packs
- Cursor themes
- Kvantum themes
- GTK themes
- Fonts
- Wallpapers
- Konsole profiles

Each component lives in a different directory, requires a different tool to apply, and is completely isolated from the others. Sharing your setup with someone else means sending them a list of instructions, not a file.

`themectl` provides a **single package format** and a **single command** to manage all of them — declaratively, reproducibly, and with rollback support.

---

## Philosophy

- **Declarative** — themes are described in a `theme.yaml` manifest, not scripts
- **Portable** — a single `.theme` file bundles everything needed
- **Secure by default** — Ed25519 signatures are verified before any file is installed
- **Reproducible** — `theme.lock` records the exact environment a theme was designed for
- **Open and federated** — anyone can host a theme repository; there is no central registry

---

## Installation

### From source (requires Rust ≥ 1.75)

```sh
git clone https://github.com/yourusername/themectl
cd themectl
cargo install --path crates/themectl-cli
```

The binary `themectl` will be placed in `~/.cargo/bin/`.

---

## Quick Start

```sh
# Check your environment
themectl doctor

# Add a theme repository
themectl source add https://example.com/themes/index.json

# List available themes from repositories
themectl list --available

# Install a theme by name (from a configured repository)
themectl install nord-plasma

# Or install from a local file
themectl install ./my-theme.theme

# Or install from a URL
themectl install https://example.com/themes/catppuccin.theme

# Apply the installed theme
themectl apply nord-plasma

# Preview what would change without touching anything
themectl apply nord-plasma --dry-run

# Apply only specific components
themectl apply nord-plasma --components wallpaper,color_scheme

# Roll back to the previous snapshot
themectl rollback

# Export your current appearance as a theme package
themectl export --output ./my-desktop.theme
```

---

## Commands

| Command | Description |
|---|---|
| `install <source>` | Install a theme from a local file, URL, or repository |
| `apply <name>` | Apply an installed theme to the desktop |
| `rollback` | Restore the desktop to a previous backup snapshot |
| `list` | List installed or available themes |
| `remove <name>` | Uninstall a theme |
| `source add <url>` | Add a remote repository |
| `source remove <name>` | Remove a repository |
| `source list` | List all configured repositories |
| `source refresh` | Refresh local cache of all repositories |
| `export` | Export your current desktop as a `.theme` package |
| `info <name>` | Show details of an installed theme |
| `doctor` | Check system environment and optional tool availability |
| `verify <name\|path>` | Verify the cryptographic signature of a theme |
| `preview <name\|path>` | Preview what a theme would change (read-only) |

### Global Flags

| Flag | Description |
|---|---|
| `-v, --verbose` | Show verbose output |
| `--no-color` | Disable colored terminal output |
| `--dry-run` | Simulate all operations without making any changes |

### `install` flags

| Flag | Description |
|---|---|
| `--name <name>` | Override the theme name during installation |
| `--force` | Reinstall the theme even if already installed |

### `apply` flags

| Flag | Description |
|---|---|
| `--no-backup` | Skip creating a snapshot before applying |
| `--components <list>` | Comma-separated list of components to apply |

### `rollback` flags

| Flag | Description |
|---|---|
| `--list` | List all available backup snapshots |
| `--to <timestamp>` | Roll back to a specific snapshot by timestamp |

### `remove` flags

| Flag | Description |
|---|---|
| `--force` | Remove even if the theme is currently applied |

---

## Theme Package Format

Themes are distributed as `.theme` files — a gzip-compressed tar archive prefixed with a magic header:

```
THEMECTL\nversion: 1\n
```

Followed by the contents of the theme directory (containing at minimum `theme.yaml`).

### theme.yaml manifest

The manifest is a YAML file describing the theme and all its components:

```yaml
id: org.example.nord-plasma          # optional unique reverse-domain ID
name: nord-plasma
version: 1.2.0
display_name: Nord Plasma
description: A clean Arctic-inspired theme for KDE Plasma 6
author: Jane Doe
homepage: https://github.com/janedoe/nord-plasma
license: MIT

supports:
  - kde-plasma-6
  - kde-plasma-5

targets:
  - kde-plasma

compatibility:
  plasma:
    min: "6.0"
    max: "6.x"
  distro:
    - arch
    - debian
    - fedora

dependencies:
  packages:
    - kvantum
  fonts:
    - JetBrains Mono
  icons:
    - Papirus
  system:
    - fc-cache

components:
  plasma_style: ./plasma/         # path to Plasma desktop theme folder
  color_scheme: ./colors/Nord.colors
  icon_theme: Papirus             # system icon theme name or ./local/path
  kvantum_theme: ./kvantum/Nord
  gtk_theme: ./gtk/Nord
  wallpaper: ./wallpapers/nord.png
  fonts:
    - ./fonts/JetBrainsMono.ttf
  konsole_profile: ./konsole/Nord.profile
  cursor_theme: Breeze            # system cursor theme name or ./local/path

# Optional: cryptographic signature (added by theme signers)
signature:
  algorithm: ed25519
  public_key: "<hex-encoded public key>"
  signature:  "<hex-encoded signature>"
```

#### Components applied per component type

| Component | Tool required | What it does |
|---|---|---|
| `plasma_style` | `plasma-apply-desktoptheme` | Copies and applies Plasma desktop theme |
| `color_scheme` | `plasma-apply-colorscheme` | Copies and applies a `.colors` file |
| `icon_theme` | `kwriteconfig5` | Copies or links icon theme; triggers KWin reload |
| `cursor_theme` | `kwriteconfig5` | Sets cursor theme in `kcminputrc` |
| `kvantum_theme` | `kvantummanager` | Installs Kvantum theme; sets widget style to Kvantum |
| `gtk_theme` | `gsettings` (optional) | Copies GTK theme to `~/.themes`; updates GTK4 settings |
| `wallpaper` | `qdbus` or `dbus-send` | Sets wallpaper via `org.kde.PlasmaShell.evaluateScript` |
| `fonts` | `fc-cache` | Copies fonts to `~/.local/share/fonts`; rebuilds font cache |
| `konsole_profile` | — | Copies Konsole profile to `~/.local/share/konsole` |

### theme.lock

When a theme is exported, `themectl` also generates a `theme.lock` file that records the exact versions of the environment at export time:

```yaml
lock:
  plasma: "6.1.4"
  kvantum: "1.1.2"
  icons: "20231201"
```

This file is excluded from the cryptographic hash, so it can be updated without invalidating the theme signature.

### Package structure

```
my-theme.theme (THEMECTL magic header + gzipped tar)
└── my-theme/
    ├── theme.yaml        ← required manifest
    ├── theme.lock        ← optional environment lock
    ├── plasma/           ← Plasma desktop theme folder
    ├── colors/
    │   └── Nord.colors
    ├── icons/            ← icon theme folder
    ├── kvantum/          ← Kvantum theme folder
    ├── gtk/              ← GTK theme folder
    ├── wallpapers/
    │   └── nord.png
    ├── fonts/
    │   └── *.ttf
    └── konsole/
        └── Nord.profile
```

---

## Security Model

> **Short answer:** downloading a theme with `themectl` is safe. Themes cannot run code.

- **Themes are never executed as scripts** — they contain only declarative assets (YAML, image files, font files, config files) and metadata
- **Theme packages contain only assets and metadata** — no shell scripts, no binaries, no executable code of any kind
- **Signatures are verified before installation** — if a theme includes an Ed25519 signature, it is cryptographically verified against a canonical hash of all package contents before any file is written to disk
- **Invalid signatures abort installation** — a tampered package will be rejected entirely; no partial installation occurs
- **Extraction is protected against path traversal** — the tar unpacker rejects entries with absolute paths or `..` components

Unsigned themes are permitted with an explicit warning. If security is a concern, use `themectl verify <name>` at any time or only install from repositories you trust.

---

## Cryptographic Signing

`themectl` uses **Ed25519** signatures to verify theme integrity. The signature covers a **canonical SHA-256 hash** of all theme files (sorted by relative path), with the `signature` block stripped from `theme.yaml` before hashing (to prevent circular dependency).

- **Signing**: theme authors generate a keypair and sign the theme directory; the resulting `Signature` struct is embedded in `theme.yaml`.
- **Verification**: on `install`, if a signature is present, `themectl` verifies it automatically. On failure, installation is aborted.
- **Unsigned themes**: allowed with a warning (`⚠ Theme has no cryptographic signature. Installing anyway.`).
- **Manual verification**: `themectl verify <name|path>` re-checks a signature at any time.

---

## Contributing

Contributions are welcome! The project is structured as a Cargo workspace — each crate has a focused responsibility, making it easy to work on a single area without touching the rest.

Before submitting a pull request:

```sh
cargo test --workspace   # all tests must pass
cargo clippy --workspace # no new warnings
```

See the [Workspace Architecture](#workspace-architecture) section below for an overview of the codebase.

---

## Workspace Architecture

The project is a Cargo workspace with the following crates:

```
crates/
├── themectl-cli          # Binary: CLI entry point (clap-based)
├── themectl-core         # Orchestration: install, apply, rollback, export, …
├── themectl-spec         # Theme manifest and lockfile types + validator
├── themectl-kde          # KDE-specific: desktop environment detector + apply logic
├── themectl-security     # Ed25519 signing & verification
├── themectl-theme        # .theme package format: pack & unpack
├── themectl-backup       # Snapshot creation, storage, listing, and restoration
├── themectl-repository   # Registry (installed themes) and remote source management
└── themectl-utils        # Shared utilities: error types, filesystem helpers, compat checks
```

### Dependency graph

```
themectl-cli
    └── themectl-core
            ├── themectl-spec
            ├── themectl-utils
            ├── themectl-security
            ├── themectl-theme
            ├── themectl-kde
            ├── themectl-backup
            └── themectl-repository
```

### Data directories

| Path | Purpose |
|---|---|
| `~/.local/share/themectl/themes/` | Installed themes |
| `~/.local/share/themectl/backups/` | Desktop configuration snapshots (max 10, auto-rotated) |
| `~/.local/share/themectl/tmp/` | Temporary download and extraction workspace |
| `~/.local/share/themectl/registry.yaml` | Registry of installed themes and currently applied theme |
| `~/.config/themectl/sources.yaml` | Configured remote repositories |
| `~/.local/share/themectl/cache/<repo>/index.json` | Cached repository index |

---

## Building from Source

**Prerequisites:** Rust stable (≥ 1.75), `cargo`

```sh
# Build all crates
cargo build

# Build the release binary
cargo build --release

# Run tests
cargo test --workspace

# Run the CLI from the workspace root
cargo run -p themectl-cli -- --help
```

---

## License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](./LICENSE) file for details.
