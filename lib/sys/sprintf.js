const current_script_url = import.meta.url;  // save for later

import {
    load_script,
} from '../ui/dom-util.js';


await load_script(document.head, new URL('../../node_modules/sprintf-js/dist/sprintf.min.js', current_script_url));

export const sprintf = globalThis.sprintf;
