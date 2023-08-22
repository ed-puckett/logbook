import {
    Subscribable,
} from '../../lib/sys/subscribable.js';


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

const dark_mode_class = 'dark';

const root_element = document.documentElement;

export function update_document_dark_state(dark_state) {
    if (dark_state) {
        root_element.classList.add(dark_mode_class);
    } else {
        root_element.classList.remove(dark_mode_class);
    }
}
