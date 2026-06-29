import { invoke } from "@tauri-apps/api/core";
import { 
  InstalledTheme, 
  AvailableTheme, 
  Preview, 
  ApplyResult, 
  Backup, 
  Source, 
  DoctorReport, 
  GuiSettings,
  SignatureStatus,
  SystemComponent,
  CreateThemeInput,
  CreateThemeResult
} from "../types";

export const api = {
  listInstalledThemes: () => invoke<InstalledTheme[]>("list_installed_themes"),
  
  listAvailableThemes: () => invoke<AvailableTheme[]>("list_available_themes"),
  
  getThemeDetails: (name: string) => invoke<InstalledTheme>("get_theme_details", { name }),
  
  installTheme: (source: string, force: boolean) => 
    invoke<string>("install_theme", { source, force }),
  
  applyTheme: (name: string, noBackup: boolean, components: string[] | null) => 
    invoke<ApplyResult>("apply_theme", { name, noBackup, components }),
  
  removeTheme: (name: string, force: boolean) => 
    invoke<void>("remove_theme", { name, force }),
  
  previewTheme: (name: string) => invoke<Preview>("preview_theme", { name }),
  
  verifyTheme: (name: string) => invoke<SignatureStatus>("verify_theme", { name }),
  
  exportTheme: (output: string | null) => invoke<string>("export_theme", { output }),
  
  listBackups: () => invoke<Backup[]>("list_backups"),
  
  restoreBackup: (timestamp: string) => invoke<void>("restore_backup", { timestamp }),
  
  deleteBackup: (timestamp: string) => invoke<void>("delete_backup", { timestamp }),
  
  listSources: () => invoke<Source[]>("list_sources"),
  
  addSource: (url: string, name?: string) => invoke<Source>("add_source", { url, name }),
  
  removeSource: (name: string) => invoke<void>("remove_source", { name }),
  
  refreshSources: () => invoke<Source[]>("refresh_sources"),
  
  runDoctor: () => invoke<DoctorReport>("run_doctor"),
  
  getDoctorReportText: () => invoke<string>("get_doctor_report_text"),
  
  getSettings: () => invoke<GuiSettings>("get_settings"),
  
  saveSettings: (settings: GuiSettings) => invoke<void>("save_settings", { settings }),

  listSystemColorSchemes: () => invoke<SystemComponent[]>("list_system_color_schemes"),
  listSystemPlasmaStyles: () => invoke<SystemComponent[]>("list_system_plasma_styles"),
  listSystemIconThemes: () => invoke<SystemComponent[]>("list_system_icon_themes"),
  listSystemCursorThemes: () => invoke<SystemComponent[]>("list_system_cursor_themes"),
  listSystemKvantumThemes: () => invoke<SystemComponent[]>("list_system_kvantum_themes"),
  listSystemGtkThemes: () => invoke<SystemComponent[]>("list_system_gtk_themes"),
  createTheme: (dto: CreateThemeInput) => invoke<CreateThemeResult>("create_theme", { dto })
};

