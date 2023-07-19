const current_script_url = import.meta.url;  // save for later

import {
    load_script,
} from '../ui/dom-util.js';e

import {
    assets_server_url,
} from '../../src/assets-server-url.js';


await load_script(document.head, new URL('../../node_modules/js-sha256/build/sha256.min.js', assets_server_url(current_script_url)));

export const sha256 = globalThis.sha256;
