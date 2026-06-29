use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct InstalledThemeDto {
    pub name: String,
    pub version: String,
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub author: Option<String>,
    pub license: Option<String>,
    pub homepage: Option<String>,
    pub is_applied: bool,
    pub installed_at: String,
    pub source_url: Option<String>,
    pub components: ComponentsDto,
    pub dependencies: Option<DependenciesDto>,
    pub signature_status: SignatureStatus,
    pub supports: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ComponentsDto {
    pub plasma_style: bool,
    pub color_scheme: bool,
    pub icon_theme: bool,
    pub kvantum_theme: bool,
    pub gtk_theme: bool,
    pub wallpaper: bool,
    pub fonts: bool,
    pub konsole_profile: bool,
    pub cursor_theme: bool,
}

#[derive(Debug, Clone, Serialize)]
pub enum SignatureStatus {
    Verified,
    Unsigned,
    Invalid(String),
}

#[derive(Debug, Clone, Serialize)]
pub struct DependencyItemDto {
    pub name: String,
    pub kind: String,       // "package" | "font" | "icon" | "system"
    pub installed: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct DependenciesDto {
    pub items: Vec<DependencyItemDto>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AvailableThemeDto {
    pub name: String,
    pub display_name: Option<String>,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub license: Option<String>,
    pub screenshots: Vec<String>,
    pub download_url: String,
    pub source_name: String,
    pub size_bytes: Option<u64>,
    pub is_installed: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct PreviewDto {
    pub theme_name: String,
    pub changes: Vec<PreviewChange>,
    pub missing_deps: Vec<DependencyItemDto>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PreviewChange {
    pub component: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApplyResultDto {
    pub applied: Vec<String>,
    pub skipped: Vec<String>,
    pub warnings: Vec<String>,
    pub backup_timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupDto {
    pub timestamp: String,
    pub created_at: String,    // ISO format for frontend display
    pub theme_applied: Option<String>,
    pub plasma_style: Option<String>,
    pub color_scheme: Option<String>,
    pub icon_theme: Option<String>,
    pub is_current: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct SourceDto {
    pub name: String,
    pub url: String,
    pub last_refreshed: Option<String>,
    pub theme_count: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct DoctorReportDto {
    pub desktop: String,
    pub plasma_version: Option<String>,
    pub distros: Vec<String>,
    pub tools: Vec<ToolStatusDto>,
    pub applied_theme: Option<String>,
    pub dependency_status: Vec<DependencyItemDto>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ToolStatusDto {
    pub name: String,
    pub installed: bool,
    pub category: String,   // "core" | "optional"
}

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct GuiSettingsDto {
    pub theme_directory: String,
    pub backup_directory: String,
    pub max_backups: u32,
    pub allow_unsigned_themes: bool,
    pub auto_backup_before_apply: bool,
    pub auto_refresh_repositories: bool,
    pub auto_remove_old_backups: bool,
    pub signature_policy: String,
}
