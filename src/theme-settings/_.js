const current_script_url = import.meta.url;  // save for later

import {
    Subscribable,
} from '../../lib/sys/subscribable.js';

import {
    create_stylesheet_link,
} from '../../lib/ui/dom-util.js';


// === THEME SETTINGS INTERFACE ===

const dark_mode_media_query_list = globalThis.matchMedia("(prefers-color-scheme: dark)");

export function get_theme_settings() {
    // return a new copy to insulate receivers from each others' modifications
    return {
        shouldUseDarkColors: dark_mode_media_query_list.matches,
    };
}

dark_mode_media_query_list.addEventListener('change', function (event) {
    theme_settings_updated_events.dispatch();
});


// === EVENT INTERFACE ===

export const theme_settings_updated_events = new Subscribable();


// === DOCUMENT DARK THEME SETTING ===

// add theme-settings/theme-colors.css stylesheet
const theme_colors_stylesheet_url = new URL('theme-colors.css', current_script_url);
create_stylesheet_link(document.head, theme_colors_stylesheet_url);

const dark_mode_class = 'dark';

const root_element = document.documentElement;

export function update_document_dark_state(dark_state) {
    if (dark_state) {
        root_element.classList.add(dark_mode_class);
    } else {
        root_element.classList.remove(dark_mode_class);
    }
}
