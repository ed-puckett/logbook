import {
    load_script,
} from '../../lib/ui/dom-tools.js';

import {
    assets_server_url,
} from '../assets-server-url.js';


await load_script(document.head, assets_server_url('dist/TeXZilla.js'));  // defines globalThis.TeXZilla

export const TeXZilla = globalThis.TeXZilla;
