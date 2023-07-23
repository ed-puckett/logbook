// const current_script_url = import.meta.url;  // save for later
// import {
//     load_script,
// } from '../ui/dom-util.js';
// import {
//     assets_server_url,
// } from '../../src/assets-server-url.js';
// // await load_script(document.head, new URL('../../node_modules/sprintf-js/dist/sprintf.min.js', assets_server_url(current_script_url)));

import '../../node_modules/sprintf-js/dist/sprintf.min.js';  // webkit implementaion

export const sprintf = globalThis.sprintf;
