export interface Components {
  plasma_style: boolean;
  color_scheme: boolean;
  icon_theme: boolean;
  kvantum_theme: boolean;
  gtk_theme: boolean;
  wallpaper: boolean;
  fonts: boolean;
  konsole_profile: boolean;
  cursor_theme: boolean;
  global_theme: boolean;
}

export type SignatureStatus = 
  | 'Verified'
  | 'Unsigned'
  | { Invalid: string };

export interface DependencyItem {
  name: string;
  kind: 'package' | 'font' | 'icon' | 'system';
  installed: boolean;
}

export interface Dependencies {
  items: DependencyItem[];
}

export interface InstalledTheme {
  name: string;
  version: string;
  display_name: string | null;
  description: string | null;
  author: string | null;
  license: string | null;
  homepage: string | null;
  is_applied: boolean;
  installed_at: string;
  source_url: string | null;
  components: Components;
  dependencies: Dependencies | null;
  signature_status: SignatureStatus;
  supports: string[];
}

export interface AvailableTheme {
  name: string;
  display_name: string | null;
  version: string;
  description: string | null;
  author: string | null;
  license: string | null;
  screenshots: string[];
  download_url: string;
  source_name: string;
  size_bytes: number | null;
  is_installed: boolean;
}

export interface PreviewChange {
  component: string;
  description: string;
}

export interface Preview {
  theme_name: string;
  changes: PreviewChange[];
  missing_deps: DependencyItem[];
}

export interface ApplyResult {
  applied: string[];
  skipped: string[];
  warnings: string[];
  backup_timestamp: string | null;
}

export interface Backup {
  timestamp: string;
  created_at: string;
  theme_applied: string | null;
  plasma_style: string | null;
  color_scheme: string | null;
  icon_theme: string | null;
  is_current: boolean;
}

export interface Source {
  name: string;
  url: string;
  last_refreshed: string | null;
  theme_count: number;
}

export interface ToolStatus {
  name: string;
  installed: boolean;
  category: 'core' | 'optional';
}

export interface DoctorReport {
  desktop: string;
  plasma_version: string | null;
  distros: string[];
  tools: ToolStatus[];
  applied_theme: string | null;
  dependency_status: DependencyItem[];
}

export interface GuiSettings {
  theme_directory: string;
  backup_directory: string;
  max_backups: number;
  allow_unsigned_themes: boolean;
  auto_backup_before_apply: boolean;
  auto_refresh_repositories: boolean;
  auto_remove_old_backups: boolean;
  signature_policy: 'warn' | 'allow' | 'require';
}

export interface SystemComponent {
  name: string;
  path: string;
}

export interface CreateThemeInput {
  name: string;
  display_name: string | null;
  version: string;
  description: string | null;
  author: string | null;
  license: string | null;
  homepage: string | null;
  plasma_style: string | null;
  color_scheme: string | null;
  icon_theme: string | null;
  cursor_theme: string | null;
  kvantum_theme: string | null;
  gtk_theme: string | null;
  wallpaper_path: string | null;
  konsole_profile: string | null;
  dep_packages: string[] | null;
  dep_fonts: string[] | null;
  dep_icons: string[] | null;
  also_pack: boolean;
}

export interface CreateThemeResult {
  theme_name: string;
  theme_path: string;
  package_path: string | null;
}

