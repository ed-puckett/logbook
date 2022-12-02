const {
    load_script,
} = await import('../ui/dom-util.js');

// The "esm" distribution of rxjs is suitable for nodejs but not for
// within browsers (at least currently) because it internally imports
// files without specifying their ".js" extensions assuming that the
// extension will be implicitly added.  Imports in browsers require a
// explicit full path.
// Therefore, load the bundle version (which stores the result in
// globalThis.rxjs) and deal with it that way
// DOES NOT WORK: import * as rxjs from '../../node_modules/rxjs/dist/esm/index.js';

const rxjs_url = new URL('../../node_modules/rxjs/dist/bundles/rxjs.umd.min.js', import.meta.url);
await load_script(document.head, rxjs_url);

export default { ...globalThis.rxjs };
globalThis.rxjs = undefined;  // remove from global environment
