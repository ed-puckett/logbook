import {
    load_script,
} from '../../lib/ui/dom-tools.js';

import {
    assets_server_url,
} from '../assets-server-url.js';

export * as codemirror from 'codemirror';

//let codemirror = CodeMirror;  // loaded on demand

/** return the codemirror object which will be lazily loaded because codemirror is large
 */
/*
export async function load_codemirror() {
    if (!codemirror) {
        await load_script(document.head, assets_server_url('dist/codemirror-dist/index.js'), { type: 'module' });  // defines globalThis.codemirror
        codemirror = globalThis.codemirror;
console.log('>>>', codemirror);//!!!
    }
    return codemirror;
}
*/
