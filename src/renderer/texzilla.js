const current_script_url = import.meta.url;  // save for later

import {
    load_script,
} from '../../lib/ui/dom-util.js';

import {
    assets_server_url,
} from '../assets-server-url.js';


await load_script(document.head, new URL('../../node_modules/texzilla/TeXZilla.js', assets_server_url(current_script_url)));  // defines globalThis.TeXZilla

export const TeXZilla = globalThis.TeXZilla;
