import {
    load_script,
} from '../../lib/ui/dom-util.js';

import {
    assets_server_url,
} from '../assets-server-url.js';


await load_script(document.head, assets_server_url('dist/plotly.js'));  // defines globalThis.Plotly

export const Plotly = globalThis.Plotly;
