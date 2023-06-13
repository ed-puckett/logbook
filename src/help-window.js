const current_script_url = import.meta.url;  // save for later

export function open_help_window() {
    window.open(new URL('../help.html', current_script_url));
}
