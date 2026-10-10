// Kameti Khata — all data lives in the webview's local storage.
// The native side only provides: save-file dialog, file writing for
// backups/receipts, and opening wa.me links in WhatsApp / the browser.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running Kameti Khata");
}
