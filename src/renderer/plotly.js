const current_script_url = import.meta.url;  // save for later

import {
    load_script,
} from '../../lib/ui/dom-util.js';

import {
    assets_server_url,
} from '../assets-server-url.js';


await load_script(document.head, new URL('../../node_modules/plotly.js-dist/plotly.js', assets_server_url(current_script_url)));  // defines globalThis.Plotly

export const Plotly = globalThis.Plotly;
