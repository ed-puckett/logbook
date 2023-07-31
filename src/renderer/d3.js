import {
    load_script,
} from '../../lib/ui/dom-util.js';

import {
    assets_server_url,
} from '../assets-server-url.js';


await load_script(document.head, assets_server_url('dist/d3.min.js'));  // defines globalThis.d3

export const d3 = globalThis.d3;
