mod dto;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::list_installed_themes,
            commands::list_available_themes,
            commands::get_theme_details,
            commands::install_theme,
            commands::apply_theme,
            commands::remove_theme,
            commands::preview_theme,
            commands::verify_theme,
            commands::list_backups,
            commands::restore_backup,
            commands::delete_backup,
            commands::list_sources,
            commands::add_source,
            commands::remove_source,
            commands::refresh_sources,
            commands::run_doctor,
            commands::get_doctor_report_text,
            commands::get_settings,
            commands::save_settings,
            commands::list_system_color_schemes,
            commands::list_system_plasma_styles,
            commands::list_system_icon_themes,
            commands::list_system_cursor_themes,
            commands::list_system_kvantum_themes,
            commands::list_system_gtk_themes,
            commands::create_theme
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
