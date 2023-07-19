/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 5979:
/***/ ((module) => {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(() => {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = () => ([]);
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = 5979;
module.exports = webpackEmptyAsyncContext;

/***/ }),

/***/ 9886:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   w: () => (/* binding */ EventListenerManager)
/* harmony export */ });
class EventListenerManager {
    constructor() {
        this.#specs = [];
    }
    #specs;  // array of { element, type, listener, options }

    empty (){ return this.#specs.length <= 0; }

    add(target, type, listener, options) {
        //!!! options is not copied, and yet is used later
        //!!! could use structuredClone(), but would that prevent remove() from finding?
        const spec = { target, type, listener, options };
        this.constructor.#validate_spec(spec);
        if (this.#first_spec_index_of(spec) !== -1) {
            throw new Error('equivalent event handler already added');
        }
        target.addEventListener(type, listener, options);
        this.#specs.push(spec);
    }

    remove(target, type, listener, options) {
        const spec = { target, type, listener, options };
        this.constructor.#validate_spec(spec);
        const index = this.#first_spec_index_of(spec);
        if (index === -1) {
            throw new Error('specified event handler not found');
        }
        this.#specs.splice(index, 1);
        target.removeEventListener(target, type, options);
    }

    remove_all() {
        for (const spec of this.#specs) {
            const { target, type, listener, options } = spec;
            target.removeEventListener(type, listener, options);
        }
        this.#specs.splice(0);  // remove all entries
    }

    reattach() {
        for (const spec of this.#specs) {
            const { target, type, listener, options } = spec;
            target.removeEventListener(type, listener, options);
            target.addEventListener(type, listener, options);
        }
    }


    // === INTERNAL ===

    // returns -1 if not found, otherwise a positive integer
    #first_spec_index_of(search_spec) {
        for (let i = 0; i < this.#specs.length; i++) {
            if (this.constructor.#same_specs(search_spec, this.#specs[i])) {
                return i;
            }
        }
        return -1;
    }

    // returns true iff spec is for a listener that uses "capture"
    static #validate_spec(spec) {
        if (typeof spec !== 'object') {
            throw new Error('spec must be an object');
        }
        let uses_capture = false;
        const { target, type, listener, options } = spec;
        if (!(target instanceof EventTarget)) {
            throw new Error('target must be an instance of EventTarget');
        }
        if (typeof type !== 'string') {
            throw new Error('type in spec must be a string');
        }
        if (typeof listener !== 'function') {
            throw new Error('listener in spec must be a function');
        }
        // removeEventListener() only pays attention to the "capture" effect
        // of a handler when determining which handler to remove.
        if (typeof options === 'boolean') {
            uses_capture = options;
        } else if (typeof options === 'object') {
            uses_capture = !!options.capture;
        } else if (typeof options !== 'undefined') {
            throw new Error('options in spec must be a undefined, boolean, or an object');
        }
        return uses_capture;
    }

    // return truthy iff spec1 and spec2 are the same for the purposes of removal
    static #same_specs(spec1, spec2) {
        const uses_capture1 = this.#validate_spec(spec1);
        const uses_capture2 = this.#validate_spec(spec2);
        if (uses_capture1 !== uses_capture2) {
            return false;
        } else {
            return (spec1.target === spec2.target && spec1.type === spec2.type && spec1.listener === spec2.listener);
        }
        //!!! should other members of options be checked (e.g., "once")?
    }
}


/***/ }),

/***/ 345:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   H: () => (/* binding */ fs_interface)
/* harmony export */ });
/* harmony import */ var _open_promise_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4889);





class FsInterface {
    // Determine if the File System Access API is available
    static fsaapi_available = ( globalThis.FileSystemHandle &&
                                globalThis.FileSystemFileHandle &&
                                globalThis.FileSystemDirectoryHandle &&
                                typeof globalThis.showOpenFilePicker  === 'function' &&
                                typeof globalThis.showSaveFilePicker  === 'function' &&
                                typeof globalThis.showDirectoryPicker === 'function'    );

    static ensure_fsaapi_available() {
        if (!this.fsaapi_available) {
            throw new Error('unexpected: File System API is not available');
        }
    }

    get fsaapi_available (){ return this.constructor.fsaapi_available; }

    /** Verify permission to access the given FileSystemHandle, prompting the user if necessary
     *  @param {FileSystemHandle} file_handle
     *  @param {boolean} for_writing
     *  @return {Promise} resolves if permission granted, rejects if permission not granted
     */
    async verify_permission(file_handle, for_writing=false) {
        this.constructor.ensure_fsaapi_available();
        const options = {};
        if (for_writing) {
            options.writable = true;  // File System API legacy
            options.mode = 'readwrite';
        }
        return ( await file_handle.queryPermission(options)   === 'granted' ||
                 await file_handle.requestPermission(options) === 'granted'    );
    }

    /** Save text to the file associated with a FileSystemFileHandle,
     *  with the FileSystemFileHandle possibly gotten from prompting user.
     *  @param {function} get_text nullary function to obtain text to be saved
     *  @param {Object} options: {
     *             file_handle?:    FileSystemFileHandle,  // if given, then open from file_handle without dialog
     *             prompt_options?: Object,                // if given, then options for showSaveFilePicker() dialog
     *         }
     *  @return {Promise} resolves to { canceled: true }|{ file_handle: FileSystemFileHandle, stats: Object }
     *          where stats is as returned by get_fs_stats_for_file()
     */
    async save(get_text, options) {
        if (!this.fsaapi_available) {
            return this.legacy_save(get_text, options);
        }

        options = options ?? {};

        let file_handle = options.file_handle;
        if (!file_handle) {
            const prompt_result = await this.prompt_for_save(options.prompt_options);
            if (prompt_result.canceled) {
                return { canceled: true };
            }
            file_handle = prompt_result.file_handle;
        }

        await this.verify_permission(file_handle, true);
        const text = get_text();
        const writable = await file_handle.createWritable();
        await writable.write(text);
        await writable.close();
        const stats = await this.get_fs_stats_for_file_handle(file_handle);

        return { file_handle, stats };
    }

    /** Load text from the file associated with a FileSystemFileHandle,
     *  with the FileSystemFileHandle possibly gotten from prompting user.
     *  @param {Object} options {
     *             file_handle?:    FileSystemFileHandle,  // if given, then open from file_handle without dialog
     *             prompt_options?: Object,                // if given, then options for showOpenFilePicker() dialog
     *         }
     *  @return {Promise} resolves to { canceled: true }|{ file_handle: FileSystemFileHandle, text: string, stats: Object }
     *          where stats is as returned by get_fs_stats_for_file()
     */
    async open(options) {
        if (!this.fsaapi_available) {
            return this.legacy_open(options);
        }

        options = options ?? {};

        let file_handle = options.file_handle;
        if (!file_handle) {
            const prompt_result = await this.prompt_for_open(options.prompt_options);
            if (prompt_result.canceled) {
                return { canceled: true };
            }
            file_handle = prompt_result.file_handle;
        }

        await this.verify_permission(file_handle, false);
        const file = await file_handle.getFile();
        const text = await file.text();
        const stats = this.get_fs_stats_for_file(file);

        return { file_handle, text, stats };
    }

    /** Return stats for the file associated with a FileSystemFileHandle
     *  @param {FileSystemFileHandle} file_handle
     *  @return {Promise} resolves to stats as returned by get_fs_stats_for_file()
     */
    async get_fs_stats_for_file_handle(file_handle) {
        this.constructor.ensure_fsaapi_available();
        await this.verify_permission(file_handle);
        const file = await file_handle.getFile();
        return this.get_fs_stats_for_file(file);
    }

    /** Return stats for the file
     *  @param {File} file
     *  @return {object} stats: {
     *              lastModified:  number,  // the "last modified" time of the file in milliseconds since the UNIX epoch (January 1, 1970 at Midnight UTC)
     *              last_modified: number,  // synonym for lastModified
     *              name:          string,  // name of file
     *              size:          number,  // size of file in bytes
     *              type:          string,  // MIME type of file contents
     *          }
     */
    get_fs_stats_for_file(file) {
        const {
            lastModified,
            lastModified: last_modified,
            name,
            size,
            type,
        } = file;

        return {
            lastModified,
            last_modified,
            name,
            size,
            type,
        };
    }

    /** Show a file picker for the user to select a file for saving
     *  @param {object|undefined} options for showSaveFilePicker()
     *  @return {Promise} resolves to { canceled: true }|{ file_handle: FileSystemFileHandle }
     */
    async prompt_for_save(options=undefined) {
        this.constructor.ensure_fsaapi_available();
        const result = await this._prompt(globalThis.showSaveFilePicker, options);
        return result
            ? { file_handle: result }
            : { canceled: true };
    }

    /** Show a file picker for the user to select a file for loading
     *  @param {object|undefined} options for showOpenFilePicker()
     *  @return {Promise} resolves to { canceled: true }|{ file_handle: FileSystemFileHandle }
     */
    async prompt_for_open(options=undefined) {
        this.constructor.ensure_fsaapi_available();
        options = options ?? {};
        const result = await this._prompt(globalThis.showOpenFilePicker, { ...options, multiple: false });
        return result
            ? { file_handle: result[0] }
            : { canceled: true };
    }

    async _prompt(picker, options) {
        options = options ?? {};
        let result;
        try {
            return await picker(options);
        } catch (err) {
            // Chromium no longer throws AbortError, instead it throws
            // a DOMException, so just count any exception as "canceled"
            return undefined;  // indicate: canceled
        }
    }

    // === LEGACY ===

    /** Save text to a file chosen by the user with the legacy File API.
     *  @param {function} get_text nullary function to obtain text to be saved
     *  @param {Object} options {
     *             prompt_options?: Object,  // if given, then options for showSaveFilePicker() dialog (will be converted)
     *         }
     *  @return {Promise} resolves to { canceled: true }|{ stats: Object }
     *          where stats is as returned by get_fs_stats_for_file()
     */
    async legacy_save(get_text, options) {
        return new Promise((resolve, reject) => {
            const text = get_text();
            const a_el = document.createElement('a');
            a_el.download = options?.name ?? 'Untitled.logbook';
            a_el.href = URL.createObjectURL(new Blob([text], { type: 'text/plain'}));
            // document.body.addEventListener('focus', ...) does not get activated, even if capture is set
            document.body.onfocus = (event) => {
                document.body.onfocus = null;
                URL.revokeObjectURL(a_el.href);
                a_el.href = null;
                resolve({});//!!! no stats
            };
            a_el.click();
        });
    }

    /** Load text from the file associated with a FileSystemFileHandle,
     *  with the FileSystemFileHandle possibly gotten from prompting user.
     *  @param {Object} options {
     *             prompt_options?: Object,  // if given, then options for showOpenFilePicker() dialog (will be converted)
     *         }
     *  @return {Promise} resolves to { canceled: true }|{ text: string, stats: Object }
     *          where stats is as returned by get_fs_stats_for_file()
     */
    async legacy_open(options) {
        const accept = this._convert_options_for_legacy(options);

        // For browsers that do not support the File System Access API (e.g., Firefox)
        // opening files is implemented by a file-type input element.  There is a
        // problem with that, though: if the user activates the file open panel and
        // then cancels, no event is emitted that we can use to subsequently remove
        // the input element.
        // Another issue is that the input element will not activate in Firefox (at
        // the time of writing) unless the input element is part of the DOM.
        // Fortunately, the input element need not be displayed in order for it to
        // work.
        // Therefore, once we create the input element, we just leave it in the DOM,
        // hidden, and reuse it whenever necessary.

        let i_el = document.getElementById(this.constructor.legacy_file_input_element_id);
        if (!i_el) {
            i_el = document.createElement('input');
            i_el.id = this.constructor.legacy_file_input_element_id;
            i_el.classList.add('hidden-fs-interface-element');  // css class definition in notebook/notebook.css
            i_el.type = 'file';
            if (accept) {
                i_el.accept = accept;
            }
            document.body.insertBefore(i_el, document.body.firstChild);  // put at beginning of document body
        }

        const op = new _open_promise_js__WEBPACK_IMPORTED_MODULE_0__/* .OpenPromise */ .i();

        i_el.onchange = async (event) => {
            if (i_el.files.length <= 0) {
                op.resolve({ canceled: true });
            } else {
                const file = i_el.files[0];
                const text  = await file.text();
                const stats = this.get_fs_stats_for_file(file);
                op.resolve({
                    text,
                    stats,
                });
            }
        }

        // activate the file open panel
        i_el.click();

        return op.promise;
    }

    static legacy_file_input_element_id = 'legacy_file_input_element_id';

    _convert_options_for_legacy(options) {
        options = options ?? {};
        const options_accept = options?.prompt_options?.types?.[0]?.accept;
        const accept = !options_accept ? undefined : Object.keys(options_accept);
        return accept;
    }
}

const fs_interface = new FsInterface();


/***/ }),

/***/ 2007:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $: () => (/* binding */ set_obj_path),
/* harmony export */   Z: () => (/* binding */ get_obj_path)
/* harmony export */ });
function get_obj_path(obj, path) {
    for (const segment of path) {
        obj = (obj ?? {})[segment];
    }
    return obj;
}

function set_obj_path(obj, path, value) {
    if (path.length < 1) {
        throw new Error('path must contain at least one segment');
    }
    for (const segment of path.slice(0, -1)) {
        if (typeof obj[segment] === 'undefined') {
            obj[segment] = {};
        }
        obj = obj[segment];
    }
    obj[path.slice(-1)[0]] = value;
}


/***/ }),

/***/ 4889:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   i: () => (/* binding */ OpenPromise)
/* harmony export */ });
/** a Promise-like object with its resolve and reject methods exposed externally
 */
class OpenPromise {
    constructor() {
        let resolve, reject;
        const promise = new Promise((o, x) => { resolve = o; reject = x; });
        Object.defineProperties(this, {
            promise: {
                value: promise,
            },
            resolve: {
                value: resolve,
            },
            reject: {
                value: reject,
            },
            then: {
                value: promise.then.bind(promise),
            },
            catch: {
                value: promise.catch.bind(promise),
            },
            finally: {
                value: promise.finally.bind(promise),
            },
        });
    }

    async await() { return await this.promise; }
}


/***/ }),

/***/ 6660:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Z: () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/lib/sys/rxjs.js";  // save for later






// The "esm" distribution of rxjs is suitable for nodejs but not for
// within browsers (at least currently) because it internally imports
// files without specifying their ".js" extensions assuming that the
// extension will be implicitly added.  Imports in browsers require
// an explicit full path.
// Therefore, load the bundle version (which stores the result in
// globalThis.rxjs) and deal with it that way
// DOES NOT WORK: import * as rxjs from '../../node_modules/rxjs/dist/esm/index.js';

const rxjs_url = new URL('../../node_modules/rxjs/dist/bundles/rxjs.umd.min.js', (0,_src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__/* .assets_server_url */ .h)(current_script_url));
await (0,_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .load_script */ .h0)(document.head, rxjs_url);

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ ...globalThis.rxjs });
globalThis.rxjs = undefined;  // remove from global environment

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 6227:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   g: () => (/* binding */ sprintf)
/* harmony export */ });
/* harmony import */ var _ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/lib/sys/sprintf.js";  // save for later






await (0,_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .load_script */ .h0)(document.head, new URL('../../node_modules/sprintf-js/dist/sprintf.min.js', (0,_src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__/* .assets_server_url */ .h)(current_script_url)));

const sprintf = globalThis.sprintf;

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 4429:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   T: () => (/* binding */ StoppableObjectsManager),
/* harmony export */   X: () => (/* binding */ Stoppable)
/* harmony export */ });
class Stoppable {
    /** create a new Stoppable object
     *  @param {Object} target object that may be stopped
     *  @param {Function} stopper function that takes target and stops it; default: (target) => target.stop()
     *  @param {Boolean} multiple_stops whether or not target's stop method may be called multiple times
     */
    constructor(target, stopper=null, multiple_stops=false) {
        if (target === null || typeof target === 'undefined') {
            throw new Error('target must not be null or undefined');
        }
        stopper ??= (target) => target.stop();  // default
        if (typeof stopper !== 'function') {
            throw new Error('stopper must be a function taking target as a parameter');
        }
        Object.defineProperties(this, {
            target: {
                value: target,
                enumerable: true,
            },
            stopper: {
                value: stopper,
                enumerable: true,
            },
            multiple_stops: {
                value: multiple_stops,
                enumerable: true,
            },
        });
        this.#stop_count = 0;
    }
    #stop_count;

    get stop_count (){ return this.#stop_count; }

    get stopped (){ return this.#stop_count > 0; }

    /** @return {Boolean} true iff stopper called on target,
     */
    stop() {
        if (!this.multiple_stops && this.stopped) {
            return false;  // indicate: stop not called
        } else {
            this.stopper(this.target);
            this.#stop_count++;
            return true;  // indicate: stop called
        }
    }
}

class StoppableObjectsManager {
    constructor() {
        this.#stoppable_objects = [];
        this.#stopped = false;
    }
    #stoppable_objects;  // array of Stoppable objects
    #stopped;  // true iff this.stop() has been called, false otherwise

    get stopped (){ return this.#stopped; }

    /** add a Stoppable to this.#stoppable_objects
     *  @param {Stoppable} stoppable
     */
    add_stoppable(stoppable) {
        if (!(stoppable instanceof Stoppable)) {
            throw new Error('stoppable must be an instance of Stoppable');
        }
        this.#stoppable_objects.push(stoppable);
    }

    /** remove a Stoppable object from this.#stoppable_objects
     *  @param {Stoppable} stoppable
     *  @return {Boolean} found and removed?
     */
    remove_stoppable(stoppable) {
        const index = this.#stoppable_objects.indexOf(stoppable);
    }

    /** stop and remove all stoppables from this.#stoppable_objects
     */
    stop() {
        this.#stopped = true;
        while (this.#stoppable_objects.length > 0) {
            const stoppable = this.#stoppable_objects.pop();
            stoppable.stop();
        }
    }
}


/***/ }),

/***/ 6092:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   l: () => (/* binding */ Subscribable)
/* harmony export */ });
/* harmony import */ var _lib_sys_rxjs_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6660);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_lib_sys_rxjs_js__WEBPACK_IMPORTED_MODULE_0__]);
_lib_sys_rxjs_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];



class Subscribable extends _lib_sys_rxjs_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Z.Subject {
    dispatch(event_data) {
        this.next(event_data);
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 2176:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   j: () => (/* binding */ deep_freeze)
/* harmony export */ });
function deep_freeze(object) {
    for (const [ key, value ] of Object.entries(object)) {
        if (typeof value === 'object' || Array.isArray(value)) {
            deep_freeze(object[key]);
        }
    }
    return Object.freeze(object);
}


/***/ }),

/***/ 1896:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  pk: () => (/* binding */ generate_object_id),
  kE: () => (/* binding */ generate_uuid),
  k$: () => (/* binding */ uuidv4)
});

;// CONCATENATED MODULE: ./node_modules/uuid/dist/esm-browser/native.js
const randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
/* harmony default export */ const esm_browser_native = ({
  randomUUID
});
;// CONCATENATED MODULE: ./node_modules/uuid/dist/esm-browser/rng.js
// Unique ID creation requires a high quality random # generator. In the browser we therefore
// require the crypto API and do not support built-in fallback to lower quality random number
// generators (like Math.random()).
let getRandomValues;
const rnds8 = new Uint8Array(16);
function rng() {
  // lazy load so that environments that need to polyfill have a chance to do so
  if (!getRandomValues) {
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);

    if (!getRandomValues) {
      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
    }
  }

  return getRandomValues(rnds8);
}
;// CONCATENATED MODULE: ./node_modules/uuid/dist/esm-browser/stringify.js

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */

const byteToHex = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}

function unsafeStringify(arr, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

function stringify(arr, offset = 0) {
  const uuid = unsafeStringify(arr, offset); // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields

  if (!validate(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }

  return uuid;
}

/* harmony default export */ const esm_browser_stringify = ((/* unused pure expression or super */ null && (stringify)));
;// CONCATENATED MODULE: ./node_modules/uuid/dist/esm-browser/v4.js




function v4(options, buf, offset) {
  if (esm_browser_native.randomUUID && !buf && !options) {
    return esm_browser_native.randomUUID();
  }

  options = options || {};
  const rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    offset = offset || 0;

    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }

    return buf;
  }

  return unsafeStringify(rnds);
}

/* harmony default export */ const esm_browser_v4 = (v4);
;// CONCATENATED MODULE: ./lib/sys/uuid.js


const uuidv4 = esm_browser_v4;

function generate_object_id() {
    // html element ids cannot start with a number
    // (if it does, document.querySelector throws error: '... is not a valid selector')
    return `id-${uuidv4()}`;
}

function generate_uuid() {
    return uuidv4();
}


/***/ }),

/***/ 1951:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   V: () => (/* binding */ beep)
/* harmony export */ });
/* unused harmony export beep_data_uri */
// from https://stackoverflow.com/questions/879152/how-do-i-make-javascript-beep

const beep_data_uri = 'data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=';

async function beep() {
    const snd = new Audio(beep_data_uri);
    return snd.play();
}


/***/ }),

/***/ 3688:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   a: () => (/* binding */ ChangeManager)
/* harmony export */ });
/* harmony import */ var _dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _sys_subscribable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6092);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_1__]);
_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];





class ChangeManager {
    /** @param {Node} target,
     *  @param {Object|null|undefined} options: {
     *      neutral_changes_observer?: Function,
     *  }
     */
    constructor(target, options=null) {
        if (!(target instanceof Node)) {
            throw new Error('target must be an instance of Node');
        }
        options ??= {};
        if (typeof options !== 'object') {
            throw new Error('options must be null, undefined, or an object');
        }

        const {
            neutral_changes_observer,
        } = options;
        if (typeof neutral_changes_observer !== 'function') {
            throw new Error('neutral_changes_observer must be a function');
        }

        this.#target  = target;
        this.#stack   = [];
        this.#current = -1;
        this.#neutral = undefined;
        this.#inhibit = false;
        this.#mutation_observer = new MutationObserver(this.#mutation_handler.bind(this));

        Object.defineProperties(this, {
            neutral_changes: {  // fires when neutral status changes; emits { is_neutral, change_manager }
                value: new _sys_subscribable_js__WEBPACK_IMPORTED_MODULE_1__/* .Subscribable */ .l(),
                enumerable: true,
            },
        });

        if (neutral_changes_observer) {
            this.#neutral_changes_subscription = this.neutral_changes.subscribe(neutral_changes_observer);  //!!! never unsubscribed....
        }

        this.#mutation_observer.observe(this.#target, {
            childList:             true,
            subtree:               true,
            attributeFilter:       undefined,  // undefined: track all attributes
            attributeOldValue:     true,       // implies attributes: true
            characterDataOldValue: true,       // implies characterData: true
        });
    }

    get is_connected (){ !!this.#mutation_observer; }

    disconnect() {
        if (this.#mutation_observer) {
            this.#mutation_observer.disconnect();
            this.#mutation_observer = undefined;
            this.#inhibit = false;
            this.#neutral = undefined;
            this.#current = -1;
            this.#stack   = [];
        }
    }

    get is_neutral (){ return (this.#neutral === this.#current); }

    set_neutral() {
        this.#neutral = this.#current;
        this.#dispatch_neutral_change_if_needed();
    }

    reset_neutral() {
        this.#neutral = undefined;
        this.#dispatch_neutral_change_if_needed();
    }

    reset(set_neutral_too=false) {
        this.#stack.splice(0);  // clear stack
        this.#current = -1;
        this.#neutral = undefined;
        this.#inhibit = false;

        if (set_neutral_too) {
            this.set_neutral();  // will call this.#dispatch_neutral_change_if_needed();
        } else {
            this.#dispatch_neutral_change_if_needed();
        }
    }

    get can_perform_undo (){ return (this.#current >= 0); }

    perform_undo() {
//console.log('UNDO', this);//!!!
        if (!this.can_perform_undo) {
            return false;
        } else {
            try {
                this.#inhibit = true;  // inhibit adding the following changes to the stack
                const change = this.#stack[this.#current--];
                (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .set_selection_focus */ .xe)(change.focus_node, change.focus_offset);
                for (let i = change.mutations.length; --i >= 0; ) {
                    this.#perform_mutation_reverse(change.mutations[i]);
                }
                this.#dispatch_neutral_change_if_needed();
                return true;  // indicate: success
            } finally {
                // reset on next tick
                queueMicrotask(() => { this.#inhibit = false });
            }
        }
    }

    get can_perform_redo (){ return (this.#current < this.#stack.length-1); }

    perform_redo() {
//console.log('REDO', this);//!!!
        if (!this.can_perform_redo) {
            return false;
        } else {
            try {
                this.#inhibit = true;  // inhibit adding the following changes to the stack
                const change = this.#stack[++this.#current];
                for (let i = 0; i < change.mutations.length; i++) {
                    this.#perform_mutation_forward(change.mutations[i]);
                }
                this.#dispatch_neutral_change_if_needed();
                return true;  // indicate: success
            } finally {
                // reset on next tick
                queueMicrotask(() => { this.#inhibit = false; });
            }
        }
    }


    // === INTERNAL ===

    static MutationData = class MutationData {
        constructor(mutation, extra_props=null) {
            if (extra_props) {
                Object.assign(this, extra_props);
            }
            Object.defineProperties(this, {
                mutation: {
                    value:      mutation,
                    enumerable: true,
                },
            });
        }
    }

    #target;   // the specified target
    #stack;    // array of { timestamp: Number, mutations: Array<MutationData> }
    #current;  // current position in stack (-1 if no entries)
    #neutral;  // numeric stack index of "neutral" position, undefined if none
    #inhibit;  // inhibit mutation collection (while performing undo/redo)
    #mutation_observer;
    #neutral_changes_subscription;

    #perform_mutation_reverse(mutation_data) {
        if (!(mutation_data instanceof this.constructor.MutationData)) {
            throw new Error('mutation_data must be an instance of ChangeManager.MutationData');
        }

        const { mutation } = mutation_data;
        switch (mutation.type) {
        default: {
            throw new Error(`unknown MutationRecord type: ${mutation.type}`);
        }

        case 'attributes': {
            if ('attributeNamespace' in mutation) {
                (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .safe_setAttributeNS */ .IX)(mutation.target, mutation.attributeNamespace, mutation.attributeName, mutation.oldValue);
            } else{
                mutation.target.setAttribute(mutation.attributeName, mutation.oldValue);
            }
            break;
        }

        case 'characterData': {
            mutation.target.data = mutation.oldValue;
            break;
        }

        case 'childList': {
            for (let i = mutation.addedNodes.length; --i >= 0; ) {
                mutation.target.removeChild(mutation.addedNodes[i]);
            }
            for (let i = mutation.removedNodes.length; --i >= 0; ) {
                mutation.target.insertBefore(mutation.removedNodes[i], mutation.nextSibling);
            }
            break;
        }
        }
    }

    #perform_mutation_forward(mutation_data) {
        if (!(mutation_data instanceof this.constructor.MutationData)) {
            throw new Error('mutation_data must be an instance of ChangeManager.MutationData');
        }

        const { mutation } = mutation_data;
        switch (mutation.type) {
        default: {
            throw new Error(`unknown MutationRecord type: ${mutation.type}`);
        }

        case 'attributes': {
            // note that mutation_data.newValue is set by us in #mutation_handler()
            if ('attributeNamespace' in mutation) {
                (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .safe_setAttributeNS */ .IX)(mutation.target, mutation.attributeNamespace, mutation.attributeName, mutation_data.newValue);
            } else{
                mutation.target.setAttribute(mutation.attributeName, mutation_data.newValue);
            }
            break;
        }

        case 'characterData': {
            // note that mutation_data.newValue is set by us in #mutation_handler()
            mutation.target.data = mutation_data.newValue;
            break;
        }

        case 'childList': {
            for (let i = 0; i < mutation.removedNodes.length; i++) {
                mutation.target.removeChild(mutation.removedNodes[i]);
            }
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                mutation.target.insertBefore(mutation.addedNodes[i], mutation.nextSibling);
            }
            break;
        }
        }
    }

    #mutation_handler(mutation_list, observer) {
//console.log('mutation_handler', mutation_list);//!!!
        if (!this.#inhibit) {
            // map mutation_list to form an array of MutationData objects
            // "attributes" and "characterData" records store newValue in the MutationData
            const mutations = mutation_list.map(mutation => {
                const extra_props = {
                    newValue: undefined,  // set for 'attributes' and 'characterData' mutations
                };
                switch (mutation.type) {
                case 'attributes': {
                    // Add a newValue field to extra_props.
                    // This is for when we want to "redo" this mutation.
                    const newValue = ('attributeNamespace' in mutation)
                          ? mutation.target.getAttributeNS(mutation.attributeNamespace, mutation.attributeName)
                          : mutation.target.getAttribute(mutation.attributeName);
                    extra_props.newValue = newValue;
                    break;
                }
                case 'characterData': {
                    // Add a newValue field to extra_props.
                    // This is for when we want to "redo" this mutation.
                    const newValue = mutation.target.data;
                    extra_props.newValue = newValue;
                    break;
                }
                }
                return new this.constructor.MutationData(mutation, extra_props);
            });
            const selection = window.getSelection();
            const new_change = {
                timestamp:    Date.now(),
                focus_node:   selection.focusNode,
                focus_offset: selection.focusOffset,
                mutations,
            };
            // remove everything from stack after current
            this.#stack.splice(this.#current+1, this.#stack.length-(this.#current+1));
            this.#current = this.#stack.length-1;  // last change on stack
            if (typeof this.#neutral === 'number' && this.#neutral > this.#current) {
                // neutral position was within the removed range
                this.#neutral = undefined;  // no neutral position
            }

            // add the new change:
            // add new change to stack (will be at position current+1)
            this.#stack.push(new_change);
            // update current
            this.#current = this.#stack.length-1;  // last change on stack
        }
        this.#dispatch_neutral_change_if_needed();
    }

    #dispatch_neutral_change() {
        this.neutral_changes.dispatch({
            is_neutral: this.is_neutral,
            change_manager: this,
        })
    }
    #last_is_neutral;
    #dispatch_neutral_change_if_needed() {
        const is_neutral = this.is_neutral;
        if (typeof this.#last_is_neutral === undefined || this.#last_is_neutral !== is_neutral) {
            this.#dispatch_neutral_change();
        }
        this.#last_is_neutral = is_neutral;
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 7569:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   L_: () => (/* binding */ create_control_element),
/* harmony export */   Vq: () => (/* binding */ Dialog),
/* harmony export */   aR: () => (/* binding */ AlertDialog),
/* harmony export */   cK: () => (/* binding */ create_select_element)
/* harmony export */ });
/* unused harmony export ConfirmDialog */
/* harmony import */ var _dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _sys_uuid_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1896);
/* harmony import */ var _sys_open_promise_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4889);
/* harmony import */ var _src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/lib/ui/dialog/_.js";  // save for later










// === STYLESHEET AND POLYFILL ===

(0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_stylesheet_link */ .KP)(document.head, new URL('./dialog.css', (0,_src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__/* .assets_server_url */ .h)(current_script_url)));


// === DIALOG BASE CLASS ===

const _dialog_element_to_instance_map = new WeakMap();

class Dialog {
    /** run a new instance of this dialog class
     *  @param {string} message to be passed to instance run() method
     *  @param {Object|undefined|null} options to be passed to instance run() method
     *  @return {Promise}
     */
    static run(message, options) { return new this().run(message, options); }

    static is_modal_active() {
        return [ ...document.querySelectorAll(`dialog.${this._modal_dialog_css_class}`) ].some(d => d.open);
    }

    /** Return the dialog instance associated with an element, if any.
     *  @param {Element} element an HTML element in the DOM
     *  @return {Element|null} null if element is not a dialog or a child
     *          of a dialog, otherwise the associated Dialog instance.
     */
    static instance_from_element(element) {
        return _dialog_element_to_instance_map.get(element.closest('dialog'));
    }

    static _modal_dialog_css_class = 'modal_dialog';

    constructor() {
        this._completed = false;
        this._promise = new _sys_open_promise_js__WEBPACK_IMPORTED_MODULE_2__/* .OpenPromise */ .i();
        this._promise.promise.finally(() => {
            try {
                this._destroy_dialog_element();
            } catch (error) {
                console.warn('ignoring error when finalizing dialog promise', error);
            }
        });
        try {
            this._dialog_element_id = `dialog-${(0,_sys_uuid_js__WEBPACK_IMPORTED_MODULE_3__/* .uuidv4 */ .k$)()}`;
            this._create_dialog_element();
            _dialog_element_to_instance_map.set(this._dialog_element, this);
        } catch (error) {
            this._cancel(error);
        }
    }

    get promise (){ return this._promise.promise; }

    run(...args) {
        this._populate_dialog_element(...args);
        this._dialog_element.showModal();
        return this.promise;
    }


    // === INTERNAL METHODS ===

    // To be overridden to provide the content of the dialog.
    // this.dialog_element will have already been set and will be part of the DOM.
    _populate_dialog_element(...args) {
        throw new Error('unimplemented');
    }

    // to be called when dialog is complete
    _complete(result) {
        this._completed = true;
        this._promise.resolve(result);
    }

    // to be called when dialog is canceled
    _cancel(error) {
        this._promise.reject(error ?? new Error('canceled'));
    }

    // expects this._dialog_element_id is already set, sets this._dialog_element
    _create_dialog_element() {
        if (typeof this._dialog_element_id !== 'string') {
            throw new Error('this._dialog_element_id must already be set to a string before calling this method');
        }
        if (typeof this._dialog_element !== 'undefined') {
            throw new Error('this._dialog_element must be undefined when calling this method');
        }
        const content_element = document.getElementById('content') ??
              (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({ parent: document.body, attrs: { id: 'content' } });
        if (content_element.tagName !== 'DIV' || content_element.parentElement !== document.body) {
            throw new Error('pre-existing #content element is not a <div> that is a direct child of document.body');
        }
        const ui_element = document.getElementById('ui') ??
              (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
                  before: content_element.firstChild,  // prepend
                  attrs:  { id: 'ui' },
              });
        if (ui_element.tagName !== 'DIV' || ui_element.parentElement !== content_element) {
            throw new Error('pre-existing #ui element is not a <div> that is a direct child of the #content element');
        }
        if (document.getElementById(this._dialog_element_id)) {
            throw new Error(`unexpected: dialog with id ${this._dialog_element_id} already exists`);
        }
        const dialog_element = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
            parent: ui_element,
            tag:    'dialog',
            attrs: {
                id: this._dialog_element_id,
                class: this.constructor._modal_dialog_css_class,
            },
        });
        this._dialog_text_container = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
            parent: dialog_element,
            attrs: {
                class: 'dialog_text',
            },
        });
        this._dialog_form = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
            parent: dialog_element,
            tag:    'form',
            attrs: {
                method: 'dialog',
            },
        });
        this._dialog_element = dialog_element;
    }

    _destroy_dialog_element() {
        if (this._dialog_element) {
            _dialog_element_to_instance_map.delete(this._dialog_element);
            this._dialog_element.remove();
        }
        this._dialog_element.oncancel = null;
        this._dialog_element.onclose = null;
        this._dialog_element = undefined;
    }
}

class AlertDialog extends Dialog {
    _populate_dialog_element(message, options) {
        const {
            accept_button_label = 'Ok',
        } = (options ?? {});
        this._dialog_text_container.innerText = message;
        const accept_button = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
            parent: this._dialog_form,
            tag:    'input',
            attrs: {
                type: 'submit',
                value: accept_button_label,
            },
        });
        this._dialog_element.onclose = (event) => this._complete();
    }
}

class ConfirmDialog extends (/* unused pure expression or super */ null && (Dialog)) {
    _populate_dialog_element(message, options) {
        const {
            decline_button_label = 'No',
            accept_button_label  = 'Yes',
        } = (options ?? {});
        this._dialog_text_container.innerText = message;
        const decline_button = create_element({
            parent: this._dialog_form,
            tag:    'input',
            attrs: {
                type: 'button',
                value: decline_button_label,
            },
        });
        decline_button.innerText = decline_button_label;
        decline_button.onclick = (event) => this._complete(false);
        const accept_button = create_element({
            parent: this._dialog_form,
            tag:    'input',
            attrs: {
                type: 'submit',
                value: accept_button_label,
            },
        });
        this._dialog_element.oncancel = (event) => this._complete(false);
        this._dialog_element.onclose = (event) => this._complete(this._dialog_element.returnValue === accept_button_label);
    }
}


// === UTILITY FUNCTIONS ===

/** create a new HTML control as a child of the given parent with an optional label element
 *  @param {HTMLElement} parent
 *  @param {string} id for control element
 *  @param {Object|undefined|null} options: {
 *             tag?:         string,   // tag name for element; default: 'input'
 *             type?:        string,   // type name for element; default: 'text' (only used if tag === 'input')
 *             label?:       string,   // if !!label, then create a label element
 *             label_after?: boolean,  // if !!label_after, the add label after element, otherwise before
 *             attrs?:       object,   // attributes to set on the new control element
 *         }
 *  @return {Element} the new control element
 */
function create_control_element(parent, id, options) {
    if (typeof id !== 'string' || id === '') {
        throw new Error('id must be a non-empty string');
    }
    const {
        tag  = 'input',
        type = 'text',
        label,
        label_after,
        attrs = {},
    } = (options ?? {});

    if ('id' in attrs || 'type' in attrs) {
        throw new Error('attrs must not contain "id" or "type"');
    }
    const control_opts = {
        id,
        ...attrs,
    };
    if (tag === 'input') {
        control_opts.type = type;
    }
    const control = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
        tag,
        attrs: control_opts,
    });
    let control_label;
    if (label) {
        control_label = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
            tag: 'label',
            attrs: {
                for: id,
            },
        });
        control_label.innerText = label;
    }

    if (label_after) {
        parent.appendChild(control);
        parent.appendChild(control_label);
    } else {
        parent.appendChild(control_label);
        parent.appendChild(control);
    }

    return control;
}

/** create a new HTML <select> and associated <option> elements
 *  as a child of the given parent with an optional label element
 *  @param {HTMLElement} parent
 *  @param {string} id for control element
 *  @param {Object|undefined|null} opts: {
 *             tag?:         string,    // tag name for element; default: 'input'
 *             label?:       string,    // if !!label, then create a label element
 *             label_after?: boolean,   // if !!label_after, the add label after element, otherwise before
 *             attrs?:       object,    // attributes to set on the new <select> element
 *             options?:     object[],  // array of objects, each of which contain "value" and "label" keys (value defaults to label)
 *                                      // values are the option attributes.  If no "value"
 *                                      // attribute is specified then the key is used.
 *         }
 * Note: we are assuming that opts.options is specified with an key-order-preserving object.
 *  @return {Element} the new <select> element
 */
function create_select_element(parent, id, opts) {
    opts = opts ?? {};
    if ('tag' in opts || 'type' in opts) {
        throw new Error('opts must not contain "tag" or "type"');
    }
    const option_elements = [];
    if (opts.options) {
        for (const { value, label } of opts.options) {
            const option_attrs = { value: (value ?? label) };
            const option_element = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
                tag: 'option',
                attrs: option_attrs,
            });
            option_element.innerText = label;
            option_elements.push(option_element);
        }
    }
    const select_opts = {
        ...opts,
        tag: 'select',
    };
    const select_element = create_control_element(parent, id, select_opts);
    for (const option_element of option_elements) {
        select_element.appendChild(option_element);
    }
    return select_element;
}


/***/ }),

/***/ 984:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Aj: () => (/* binding */ validate_parent_and_before_from_options),
/* harmony export */   Dz: () => (/* binding */ set_element_attrs),
/* harmony export */   Hp: () => (/* binding */ update_element_style),
/* harmony export */   IX: () => (/* binding */ safe_setAttributeNS),
/* harmony export */   KP: () => (/* binding */ create_stylesheet_link),
/* harmony export */   Ru: () => (/* binding */ show_initialization_failed),
/* harmony export */   Sh: () => (/* binding */ manage_selection_for_insert),
/* harmony export */   T1: () => (/* binding */ create_element),
/* harmony export */   Xc: () => (/* binding */ create_element_child_text_node),
/* harmony export */   cj: () => (/* binding */ manage_selection_for_delete),
/* harmony export */   gX: () => (/* binding */ clear_element),
/* harmony export */   h0: () => (/* binding */ load_script),
/* harmony export */   li: () => (/* binding */ delay_ms),
/* harmony export */   pX: () => (/* binding */ next_micro_tick),
/* harmony export */   r1: () => (/* binding */ delete_nearest_leaf),
/* harmony export */   rb: () => (/* binding */ normalize_element_text),
/* harmony export */   rf: () => (/* binding */ next_tick),
/* harmony export */   v0: () => (/* binding */ scroll_element_into_view),
/* harmony export */   xe: () => (/* binding */ set_selection_focus),
/* harmony export */   yU: () => (/* binding */ insert_at)
/* harmony export */ });
/* unused harmony exports escape_unescaped_$, escape_for_html, make_string_literal, with_designMode, find_matching_ancestor, create_inline_stylesheet, create_script, create_inline_script, load_script_and_wait_for_condition, find_child_offset, save_current_selection, restore_selection, move_point_forward, move_point_reverse, move_point, is_text_direction_ltr */
/* harmony import */ var _sys_uuid_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1896);
/* harmony import */ var _beep_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1951);
/* harmony import */ var _src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/lib/ui/dom-util.js";  // save for later








// === ESCAPE TEXT AND HTML ===

function escape_unescaped_$(s) {
    // Note: add $ to the end and then remove the last two characters ('\\$') from
    // the result.  Why?  Because the RE does not work correctly when the remaining
    // part after a match does not contain a non-escaped $.  This workaround works
    // correctly even if s ends with \.
    const re = /((\\?.)*?)\$/g;
    return (s + '$').replace(re, (...args) => `${args[1]}\\$`).slice(0, -2);
}

/** escape_for_html(s)
 *  convert all '<' and '>' to their corresponding HTML entities
 *  @param {string} string to be converted
 *  @return {string} converted string
 */
function escape_for_html(s) {
    return s.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** make_string_literal(s)
 *  @param {string} s
 *  @return {string} string representation of a string literal for s
 */
function make_string_literal(s) {
    return `'${[ ...s ].map(s => s === "'" ? "\\'" : s).join('')}'`;
}


// === INITIALIZATION FAILED DISPLAY ===

function show_initialization_failed(error) {
    console.error('initialization failed', error.stack);
    document.body.innerText = '';  // completely reset body
    document.body.classList.add('error');
    const error_h1 = document.createElement('h1');
    error_h1.textContent = 'Initialization Failed';
    const error_pre = document.createElement('pre');
    error_pre.textContent = error.stack;
    document.body.appendChild(error_h1);
    document.body.appendChild(error_pre);
}


// === TIMEOUT / NEXT TICK UTILITIES ===

async function delay_ms(ms, resolve_result=undefined) {
    return new Promise(resolve => setTimeout(resolve, (ms ?? 0), resolve_result));
}

async function next_tick() {
    return new Promise(resolve => setTimeout(resolve));
}

async function next_micro_tick() {
    return new Promise(resolve => queueMicrotask(resolve));
}


// === DOCUMENT UTILITIES ===

/** temporarily set document.designMode while executing thunk
 *  @param {Boolean} on
 *  @param {Function} thunk zero-parameter function to execute with temporary setting
 *  @return {any} return value of thunk()
 * thunk may be an async function or a regular function.
 */
async function with_designMode(on, thunk) {
    return new Promise((resolve, reject) => {
        const original_setting = document.designMode;
        document.designMode = (on ? 'on' : 'off');
        delay_ms(0)
            .then(() => thunk())
            .then(thunk_result => delay_ms(0, thunk_result))
            .then(resolve)
            .finally(() => {
                document.designMode = original_setting;
            });
    });
}


// === ELEMENT UTILITIES ===

/** find the nearest ancestor of node that matches selector
 *  @param {Node} node for which to find nearest ancestor
 *  @param {String} selector to match
 *  @param {Boolean} strict_ancestor if true, then don't return node even if it matches
 *  @return {Element} the ancestor or null if none found
 */
function find_matching_ancestor(node, selector, strict_ancestor=false) {
    for (let scan = (strict_ancestor ? node.parentNode : node); scan; scan = scan.parentNode) {
        if (scan instanceof Element) {
            if (scan.matches(selector)) {
                return scan;
            }
        }
    }
    return null;  // indicate: not found
}

/** remove all child elements and nodes of element
 *  @param {Node} element
 *  @return {Node} element
 */
function clear_element(element) {
    if (element instanceof HTMLElement) {
        element.innerText = '';  // removes all child elements and nodes, and their event handlers
    } else if (element instanceof Node) {
        while (element.firstChild) {
            // note that removeChild() does not remove the
            // event handlers from the removed node, but
            // we are letting the node go so it will be
            // garbage-collected soon....
            element.removeChild(element.firstChild);
        }
    } else {
        throw new Error('element must be an instance of Node');
    }
    return element;
}

/** scroll element into view
 *  @param {Element} element
 *  @return {Element} element
 */
function scroll_element_into_view(element) {
    const element_rect = element.getBoundingClientRect();
    if (element_rect.bottom > window.innerHeight) {
        window.scrollBy(0, (element_rect.bottom - window.innerHeight));
    }
    return element;
}

/** set attributes on an element which are taken from an object.
 *  @param {Element} element
 *  @param {Object|undefined|null} attrs
 *  @return {Element} element
 * Attributes specified in attrs with a value of either null or undefined are cause
 * the corresponding property to be removed.
 * Attribute values obtained by calling toString() on the values in attrs
 * except that values which are undefined are translated to ''.
 */
function set_element_attrs(element, attrs) {
    if (attrs) {
        if ('id' in attrs && document.getElementById(_attr_value(attrs.id))) {
            throw new Error(`element already exists with id ${attrs.id}`);
        }
        for (const k in attrs) {
            const v = attrs[k];
            if (v !== null && typeof v !== 'undefined') {
                element.setAttribute(k, _attr_value(v));
            } else {
                element.removeAttribute(k);
            }
        }
    }
    return element;
}

/** add/remove style properties on element
 *  @param {HTMLElement} element
 *  @param {Object} spec collection of properties to add or remove.
 *                  If the value of an entry is null or undefined, then
 *                  the corresponding property is removed.  If the value
 *                  of an entry is null, then the property is removed.
 *                  If the value of an entry is undefined, then that
 *                  entry is ignored.  Otherwise, the value of the
 *                  corresponding property is set.
 *  @return {HTMLElement} element
 */
function update_element_style(element, spec) {
    for (const name in spec) {
        const value = spec[name];
        if (typeof value !== 'undefined') {
            if (value === null) {
                element.style.removeProperty(name);
            } else {
                element.style.setProperty(name, value);
            }
        }
    }
    return element;
}

function _attr_value(v) {
    return (typeof v === 'undefined') ? '' : v.toString();
}


/** safely set namespaced attributes
 *  @param {Element} element on which to set attribute
 *  @param {String|null} namespace
 *  @param {String} name of attribute
 *  @param {any} value
 * According to MDN, https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttributeNS :
 *     setAttributeNS is the only method for namespaced attributes which
 *     expects the fully qualified name, i.e. "namespace:localname".
 */
function safe_setAttributeNS(element, namespace, name, value) {
    //!!! is this a correct implementation???
    if (namespace && !name.includes(':')) {
        // use the last non-empty component of the namespace
        //!!! is this correct?
        const namespace_components = new URL(namespace).pathname.split('/');
        const namespace_specfier = namespace_components.findLast(s => s.length > 0);
        name = `${namespace_specfier}:${name}`;
    }
    element.setAttributeNS(namespace, name, value);
}


/** validate the "parent" and "before" properties from options and return their validated values.
 *  @param {null|undefined|Object} options
 *  @param {Class} required_parent_class (default Element)
 *  @return {Object} result: { parent: Node|null, before: Node|null }
 */
function validate_parent_and_before_from_options(options, required_parent_class=null) {
    const {
        parent: parent_from_options = null,
        before = null,
    } = (options ?? {});

    let parent = parent_from_options;
    if (before && !(before instanceof Node)) {
        throw new Error('before must be null, undefined, or an instance of Node');
    }

    if (before && !before.parentNode) {
        throw new Error('before must have a parent');
    }

    // resolve parent and before
    if (parent) {
        if (before && before.parentElement !== parent) {
            throw new Error('inconsistent parent and before nodes specified');
        }
    } else {
        if (before) {
            parent = before.parentNode;
        }
    }

    required_parent_class ??= Element;
    if (parent && !(parent instanceof required_parent_class)) {
        throw new Error(`parent must be null, undefined, or an instance of ${required_parent_class.name}`);
    }

    return { parent, before };
}

/** create_element(options)
 *  create a new element with the given characteristics
 *  @param {Object|undefined|null} options: {
 *      parent?:    HTMLElement|null,  // parent element, null or undefined for none; may be simply an Element if style not specified
 *      before?:    Node|null,         // sibling node before which to insert; append if null or undefined
 *      tag?:       string,            // tag name for new element; default: 'div'
 *      namespace?: string,            // namespace for new element creation
 *      attrs?:     object,            // attributes to set on new element
 *      style?:     object,            // style properties for new element
 *  }
 *  @return {Element} the new element
 * A unique id will be assigned to the element unless that element already has an id attribute
 * specified (in attrs).
 * Attributes specified in attrs with a value of either null or undefined are ignored.  This is
 * how to prevent generation of an id: specify a value of null or undefined for id.
 * The before node, if specified, must have a parent that must match parent if parent is specified.
 * If neither parent nor before is specified, the new element will have no parent.
 * Warning: '!important' in style specifications does not work!  (Should use priority method.)
 */
function create_element(options) {
    const {
        tag = 'div',
        namespace,
        attrs,
        style,
    } = (options ?? {});

    const required_parent_class = style ? HTMLElement : Element;

    const {
        parent,
        before,
    } = validate_parent_and_before_from_options(options, required_parent_class);

    const element = namespace
          ? document.createElementNS(namespace, tag)
          : document.createElement(tag);

    let element_id_specified = false;
    if (attrs) {
        for (const k in attrs) {
            const v = attrs[k];
            if (v !== null && typeof v !== 'undefined') {
                element.setAttribute(k, v);
            }
            if (k == 'id') {
                element_id_specified = true;
            }
        }
    }
    if (!element_id_specified) {
        element.id = (0,_sys_uuid_js__WEBPACK_IMPORTED_MODULE_1__/* .generate_object_id */ .pk)();
    }

    if (style) {
        update_element_style(element, style);
    }

    if (parent) {
        parent.insertBefore(element, before);
    }

    return element;
}

/** create or update a child text node of the given element
 *  @param {HTMLElement} element  //!!! might be sufficient to be a Node
 *  @param {any} text to be contained in the new text node
 *  @param {Object|undefined|null} options: {
 *             before?: null|Node,  // child node or element before which to insert; append if null or undefined
 *             prevent_coalesce_next?: boolean,
 *         }
 *  @return {Node|null} the new or modified text node, or null if the converted text is ''
 *
 * Text will be converted to a string (if not already a string).  A text value
 * of null or undefined is equivalent to ''.
 *
 * The text will be coalesced into the immediately previous text node, if any.
 * Otherwise, if the next node is a text node the text will be coealesced
 * into the beginning text of it unless options.prevent_coalesce_next.
 * options.prevent_coalesce_next makes sure that the same options.before
 * node can be used repeatedly with the expected results.  However,
 * options.prevent_coalesce_next may leave element non-normalized.
 * On the other hand, if !options.prevent_coalesce_next, the element
 * will not become non-normalized (but may be non-normalized if it
 * already was).
 * Note that the text is inserted into the document purely as text, and
 * no escaping or cleaning for HTML is performed (it should not be necessary).
 */
function create_element_child_text_node(element, text, options=null) {
    if (!(element instanceof HTMLElement)) {
        throw new Error('element must be an instance of HTMLElement');
    }

    const {
        before = null,
        prevent_coalesce_next,
    } = (options ?? {});

    if (before !== null && !(before instanceof Node)) {
        throw new Error('before must be null or an instance of Node');
    }
    if (before && before.parentNode !== element) {
        throw new Error('before must be a child of element');
    }

    if (typeof text !== 'string') {
        text = `${text ?? ''}`;
    }
    if (!text) {
        return null;
    }

    let node;  // this will be the node that contains the text
    if (!node) {
        const previous = before ? before.previousSibling : element.lastChild;
        if (previous?.nodeType === Node.TEXT_NODE) {
            previous.nodeValue += text;
            node = previous;
        }
    }
    if (!node && before && !prevent_coalesce_next) {  // if no before then there will be no next node
        const next = before;
        if (next.nodeType === Node.TEXT_NODE) {
            next.nodeValue = text + next.nodeValue;
            node = next;
        }
    }
    if (!node) {
        node = document.createTextNode(text);
        element.insertBefore(node, before);
    }

    return node;
}

/** normalize the text node children of element, meaning that text nodes
 *  are non-empty and no text nodes are adjacent.
 *  @param {Element} element
 *  @return {Element} element
 */
function normalize_element_text(element) {
    element.normalize();
    return element;
}

/** create_stylesheet_link(parent, stylesheet_url, attrs)
 *  @param {Element} parent
 *  @param {string} stylesheet_url
 *  @param {Object|undefined|null} attrs
 *  @param {boolean} permit_duplication if true then do not recreate element if already present
 *  @return {HTMLElement} the new <link> element
 */
function create_stylesheet_link(parent, stylesheet_url, attrs=null, permit_duplication=false) {
    if (!(parent instanceof Element)) {
        throw new Error('parent must be an Element');
    }
    attrs = attrs ?? {};
    if ('rel' in attrs || 'href' in attrs) {
        throw new Error('attrs must not contain "rel" or "href"');
    }
    let link_element;
    if (!permit_duplication) {
        // note that the duplication does not take into account attrs
        link_element = parent.querySelector(`link[rel="stylesheet"][href="${stylesheet_url.toString().replaceAll('"', '\\"')}"]`);
        // make sure link_element that was found is a direct child of parent
        if (link_element?.parentElement !== parent) {
            link_element = null;
        }
    }
    return link_element ?? create_element({
        parent,
        tag: 'link',
        attrs: {
            rel: "stylesheet",
            href: stylesheet_url,
            ...attrs,
        },
    });
}

/** create_inline_stylesheet(parent, stylesheet_text, attrs)
 *  @param {Element} parent
 *  @param {string} stylesheet_text
 *  @param {Object|undefined|null} attrs
 *  @return {HTMLStyleElement} the new <style> element
 */
function create_inline_stylesheet(parent, stylesheet_text, attrs) {
    if (!(parent instanceof Element)) {
        throw new Error('parent must be an Element');
    }
    const style_el = create_element({
        tag: 'style',
        attrs,
    });
    style_el.appendChild(document.createTextNode(stylesheet_text));
    parent.appendChild(style_el);
    return style_el;
}

/** create_script(parent, script_url, attrs=null, permit_duplication=false)
 *  @param {Element} parent
 *  @param {string} script_url
 *  @param {Object|undefined|null} attrs
 *  @param {boolean} permit_duplication if true then do not recreate element if already present
 *  @return {HTMLStyleElement} the new <style> element
 */
function create_script(parent, script_url, attrs=null, permit_duplication=false) {
    if (!(parent instanceof Element)) {
        throw new Error('parent must be an Element');
    }
    attrs = attrs ?? {};
    if ('src' in attrs) {
        throw new Error('attrs must not contain "src"');
    }
    let script_element;
    if (!permit_duplication) {
        // note that the duplication does not take into account attrs
        script_element = parent.querySelector(`script[src="${script_url.toString().replaceAll('"', '\\"')}"]`);
        // make sure script_element that was found is a direct child of parent
        if (script_element?.parentElement !== parent) {
            script_element = null;
        }
    }
    return script_element ?? create_element({
        parent,
        tag: 'script',
        attrs: {
            src: script_url,
            ...attrs,
        },
    });
}

/** create_inline_script(parent, script_text, attrs)
 *  @param {Element} parent
 *  @param {string} script_text
 *  @param {Object|undefined|null} attrs
 *  @return {HTMLScriptElement} the new <script> element
 */
function create_inline_script(parent, script_text, attrs) {
    if (!(parent instanceof Element)) {
        throw new Error('parent must be an Element');
    }
    if (attrs && 'src' in attrs) {
        throw new Error('attrs must not contain "src"');
    }
    const script_el = create_element({
        tag: 'script',
        attrs,
    });
    script_el.appendChild(document.createTextNode(script_text));
    parent.appendChild(script_el);
    return script_el;
}


// === SCRIPT LOADING ===

const _script_promise_data = {};  // map: url -> { promise?: Promise, resolve?: any=>void, reject?: any=>void }

// _establish_script_promise_data(script_url) returns
// { promise_data, initial } where promise_data is
// _script_promise_data[script_url] and initial is true
// iff the promise was newly created.
function _establish_script_promise_data(full_script_url) {
    const data_key = full_script_url.toString();
    let promise_data = _script_promise_data[data_key];
    let initial;
    if (promise_data) {
        initial = false;
    } else {
        promise_data = {};
        promise_data.promise = new Promise((resolve, reject) => {
            promise_data.resolve = resolve;
            promise_data.reject  = reject;
        });
        _script_promise_data[data_key] = promise_data;
        initial = true;
    }
    return { initial, promise_data };
}

/** async function load_script(parent, script_url, attrs=null, permit_duplication=false)
 *  @param {Node} parent the parent element for script
 *  @param {string} script_url url of script to load (the script tag will be created without defer or async attributes)
 *  @param {Object|undefined|null} attrs
 *  @param {boolean} permit_duplication if true then do not recreate element if already present
 *  @return {Promise}
 *  Use this to load a script and wait for its 'load' event.
 *  Only the first invokation for a particular script_url will create
 *  the script element.  Others will simply wait for the script to load
 *  or for error.
 */
async function load_script(parent, script_url, attrs=null, permit_duplication=false) {
    const full_script_url = new URL(script_url, (0,_src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_0__/* .assets_server_url */ .h)(current_script_url));
    const { promise_data, initial } = _establish_script_promise_data(full_script_url);
    if (initial) {
        let script_el;
        function script_load_handler(event) {
            promise_data.resolve?.();
            reset();
        }
        function script_load_error_handler(event) {
            promise_data.reject?.(new Error(`error loading script ${full_script_url}`));
            reset();
        }
        function reset() {
            if (script_el) {
                script_el.removeEventListener('load',  script_load_handler);
                script_el.removeEventListener('error', script_load_error_handler);
            }
            promise_data.resolve = null;
            promise_data.reject  = null;
        }
        try {
            script_el = create_script(parent, full_script_url, attrs, permit_duplication);
            script_el.addEventListener('load',  script_load_handler,       { once: true });
            script_el.addEventListener('error', script_load_error_handler, { once: true });
        } catch (err) {
            promise_data.reject?.(err);
            reset();
        }
    }
    return promise_data.promise;
}

/** async function load_script_and_wait_for_condition(parent, script_url, condition_poll_fn, attrs=null, permit_duplication=false)
 *  @param {Node} parent the parent element for script
 *  @param {string} script_url url of script to load (the script tag will be created without defer or async attributes)
 *  @param {() => boolean} condition_poll_fn function that will return true when script has loaded
 *  @param {Object|undefined|null} attrs
 *  @param {boolean} permit_duplication if true then do not recreate element if already present
 *  @return {Promise}
 *  Use this to load a script where you want to poll for condition
 *  that will be triggered asynchronously by the script, in which
 *  case waiting for the load event will not work because it fires
 *  when script execution completes but not when some later condition
 *  is triggered asynchronously by the script.
 *  Only the first invokation for a particular script_url will create
 *  the script element.  Others will simply wait for the script to load
 *  or for error.
 */
async function load_script_and_wait_for_condition(parent, script_url, condition_poll_fn, attrs=null, permit_duplication=false) {
    const full_script_url = new URL(script_url, assets_server_url(current_script_url));
    const { promise_data, initial } = _establish_script_promise_data(full_script_url);
    if (initial) {
        let script_el;
        let wait_timer_id;
        function script_load_error_handler(event) {
            promise_data.reject?.(new Error(`error loading script ${full_script_url}`));
            reset();
        }
        function wait() {
            if (condition_poll_fn()) {
                promise_data.resolve?.();
                reset();
            } else {
                wait_timer_id = setTimeout(wait);  // check again on next tick
            }
        }
        function reset() {
            if (typeof wait_timer_id !== 'undefined') {
                clearTimeout(wait_timer_id);
                wait_timer_id = undefined;
            }
            if (script_el) {
                script_el.removeEventListener('error', script_load_error_handler);
            }
            promise_data.resolve = null;
            promise_data.reject  = null;
        }
        try {
            script_el = create_script(parent, full_script_url, attrs, permit_duplication);
            script_el.addEventListener('error', script_load_error_handler, { once: true });
            wait();
        } catch (err) {
            promise_data.reject?.(err);
            reset();
        }
    }
    return promise_data.promise;
}


// === NODE OFFSET IN PARENT ===

function find_child_offset(child) {
    const parent_child_nodes = child?.parentNode?.childNodes;
    if (!parent_child_nodes) {
        return undefined;
    } else {
        return Array.prototype.indexOf.call(parent_child_nodes, child);
    }
}


// === SELECTION/POINT ===

function set_selection_focus(node, offset) {
    window.getSelection().setBaseAndExtent(node, offset, node, offset);
}

function save_current_selection() {
    const selection = window.getSelection();
    const {
        anchorNode,
        anchorOffset,
        focusNode,
        focusOffset,
    } = selection;
    const ranges = []
    for (let i = 0; i < selection.rangeCount; i++) {
        ranges.push(selection.getRangeAt(i).cloneRange());
    }
    return {
        anchorNode,
        anchorOffset,
        focusNode,
        focusOffset,
        ranges,
    }
}

function restore_selection(saved) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    for (const range of saved.ranges) {
        selection.addRange(range);
    }
    selection.setBaseAndExtent(
        saved.anchorNode, saved.anchorOffset,
        saved.focusNode, saved.focusOffset
    );
}

function manage_selection_for_insert(updater) {
    const selection = window.getSelection();
    selection?.deleteFromDocument();  // delete current selection, if any
    let point = {
        node:   selection?.focusNode   ?? null,
        offset: selection?.focusOffset ?? 0,
    };
    point = updater(point);
    if (!point) {
        throw new Error('updater must return { node, offset } for the new point');
    }
    selection.setBaseAndExtent(point.node, point.offset, point.node, point.offset);
    return true;  // indicate: success
}

function manage_selection_for_delete(updater) {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
        selection.deleteFromDocument();
        // leave selection in the resultant collapsed state
    } else {
        let point = {
            node:   selection?.focusNode   ?? null,
            offset: selection?.focusOffset ?? 0,
        };
        point = updater(point);
        if (!point) {
            (0,_beep_js__WEBPACK_IMPORTED_MODULE_2__/* .beep */ .V)();  // there was nothing to delete
        } else {
            selection.setBaseAndExtent(point.node, point.offset, point.node, point.offset);
        }
    }
    return true;  // indicate: success
}

// modifies point, returns true iff successful
function move_point_forward(point) {
    if (!point?.node) {
        return false;  // nowhere to move from
    }
//!!! check this:
    const child_count = (point.node.nodeType === Node.TEXT_NODE) ? point.node.length : point.node.childNodes.length;
    if (point.offset < child_count) {
        point.offset++;  // new point is within same (Text) node
        return true;
    } else {
        const tree_walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
        tree_walker.currentNode = point.node;
        point.node = tree_walker.nextNode();
        if (!point.node) {
            point.offset = 0;
            return false;
        }
        if (point.node.nodeType === Node.TEXT_NODE) {
            point.offset = 0;
        } else {
            // must point to this Element node from its parent
            point.offset = find_child_offset(point.node);
            point.node = point.node.parentNode;
        }
        return true;
    }
}

// modifies point, returns true iff successful
function move_point_reverse(point) {
    if (!point?.node) {
        return false;  // nowhere to move from
    }
    if (point.offset > 0) {
        point.offset--;  // new point is within same node
        return true;
    } else {
        const tree_walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
        tree_walker.currentNode = point.node;
        point.node = tree_walker.previousNode();
        if (!point.node) {
            point.offset = 0;
            return false;
        }
        if (point.node.nodeType === Node.TEXT_NODE) {
            point.offset = point.node.length;
        } else {
            // must point to this Element node from its parent
            point.offset = find_child_offset(point.node);
            point.node = point.node.parentNode;
        }
        return true;
    }
}

// modifies point, returns true iff successful
function move_point(point, reverse=false) {
    return (reverse ? move_point_reverse : move_point_forward)(point);
}

// returns new point { node, offset } if successful, otherwise null
function insert_at(point, thing) {
    if (typeof point !== 'object') {
        throw new Error('point must be an object');
    }
    let { node, offset } = point;
    if (!node) {
        return null;
    }
    if (typeof thing !== 'undefined' && thing !== null) {
        if (typeof thing === 'string') {
            if (node instanceof Text) {
                node.data = `${node.data.substring(0, offset)}${thing}${node.data.substring(offset)}`;
                // update offset
                offset += thing.length;
            } else {
                const text_node = document.createTextNode(thing);
                node.insertBefore(text_node, node.childNodes[offset]);
                // update offset
                offset++;
            }
        } else if (thing instanceof Node) {
            // note that thing may be a DocumentFragment here
            if (node instanceof Text) {
                //!!! could be more careful not to create empty text nodes here
                const next_node = node.splitText(offset);
                node.parentNode.insertBefore(thing, next_node);
                // update node, offset
                node = next_node;
                offset = 0;
            } else {
                node.insertBefore(thing, node.childNodes[offset]);
                offset++;
            }
        } else {
            throw new Error('thing must be a string or an instance of Node');
        }
    }
    return { node, offset };
}

// returns new point { node, offset } if successful, otherwise null
function delete_nearest_leaf(point, options=null) {
    const { element_too, reverse } = options ?? {};

    // validate point
    let { node, offset } = point ?? {};
    if ( !(node instanceof Node) ||
         (node.nodeType !== Node.TEXT_NODE && node.nodeType !== Node.ELEMENT_NODE) ||
         typeof offset !== 'number' ||
         offset < 0 ||
         offset > ((node.nodeType === Node.TEXT_NODE) ? node.length : node.childNodes.length)
       ) {
        throw new Error('invalid point');
    }

    for (;;) {
        // if node is a non-empty Text and offset is within range then handle directly here
        if (node.nodeType === Node.TEXT_NODE && node.length > 0) {
            if (reverse) {
                if (offset > 0) {
                    offset--;
                    node.data = node.data.substring(0, offset) + node.data.substring(offset+1);
                    return { node, offset };
                }
            } else {
                if (offset < node.length) {
                    node.data = node.data.substring(0, offset) + node.data.substring(offset+1);
                    return { node, offset };
                }
            }
        }

        // At this point node is a Text node only if the deletion is to happen
        // outside it (i.e., the offset was out of the node's bounds), in which
        // case the we assume the offset indicated just one character outside
        // (otherwise, the original point was invalid).
        if (node.nodeType === Node.ELEMENT_NODE) {
            // shift to node at given offset
            node = node.childNodes[offset];
            if (!node) {
                return { node, offset: 0 };
            }
            if (reverse) {
                const child_count = (node.nodeType === Node.TEXT_NODE) ? node.length : node.childNodes.length;
                offset = child_count;
            } else {
                offset = 0;
            }
            continue;  // reprocess with new node, offset
        }

        break;
    }

    // if node is an empty (leaf) Element then handle directly here
    if (node.nodeType === Node.ELEMENT_NODE && !node.hasChildNodes()) {
        const new_point = { node: node.parentNode, offset: find_child_offset(node) };
        node.parentNode.removeChild(node);
        return new_point;
    }

    // use a TreeWalker to find a non-empty Text or a leaf Element
    const tree_walker_filter = element_too
          ? NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT
          : NodeFilter.SHOW_TEXT;
    const tree_walker = document.createTreeWalker(document.body, tree_walker_filter, {
        acceptNode(node) {
            // accept only non-empty Text nodes or empty (leaf) Element nodes
            // (the characters in Text nodes are "leaf" items)
            if ( (node.nodeType === Node.TEXT_NODE    && node.length > 0) ||
                 (node.nodeType === Node.ELEMENT_NODE && (!node.hasChildNodes() || [ ...node.childNodes ].every(n => n.nodeType === Node.TEXT_NODE && n.length <= 0)))
               ) {
                return NodeFilter.FILTER_ACCEPT;
            } else {
                return NodeFilter.FILTER_SKIP;
            }
        }
    });
    tree_walker.currentNode = node;
    node = reverse ? tree_walker.previousNode() : tree_walker.nextNode();
    if (!node) {
        return null;  // nothing found
    } else {
        if (node.nodeType === Node.TEXT_NODE) {
            offset = reverse ? node.length-1 : 0;
            node.data = node.data.substring(0, offset) + node.data.substring(offset+1);
            return { node, offset };
        } else {
            const new_point = { node: node.parentNode, offset: find_child_offset(node) };
            node.parentNode.removeChild(node);
            return new_point;
        }
    }
}


// === MISC ===

function is_text_direction_ltr(element) {
    const dir_str = document.defaultView?.getComputedStyle?.(element)?.direction;
    switch (dir_str) {
    case 'ltr':  return true;
    case 'rtl':  return false;
    case 'auto': return true;
    default:     throw new Error('unexpected direction value');
    }
}


/***/ }),

/***/ 2050:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Qm: () => (/* reexport safe */ _key_event_manager_js__WEBPACK_IMPORTED_MODULE_2__.Q),
/* harmony export */   d4: () => (/* reexport safe */ _key_map_js__WEBPACK_IMPORTED_MODULE_1__.d),
/* harmony export */   k7: () => (/* reexport safe */ _key_spec_js__WEBPACK_IMPORTED_MODULE_0__.k)
/* harmony export */ });
/* harmony import */ var _key_spec_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6306);
/* harmony import */ var _key_map_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8395);
/* harmony import */ var _key_event_manager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9091);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_key_event_manager_js__WEBPACK_IMPORTED_MODULE_2__]);
_key_event_manager_js__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
// aggregation module: key





__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 9091:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Q: () => (/* binding */ KeyEventManager)
/* harmony export */ });
/* harmony import */ var _key_spec_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6306);
/* harmony import */ var _key_map_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8395);
/* harmony import */ var _sys_event_listener_manager_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(9886);
/* harmony import */ var _beep_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(1951);
/* harmony import */ var _sys_subscribable_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6092);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_2__]);
_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];











class KeyEventManager {
    /** KeyEventManager constructor
     *  @param {EventTarget} event_target the source of events
     *  @param {Function} command_observer function to handle command events
     */
    constructor(event_target, command_observer) {
        if (!(event_target instanceof EventTarget)) {
            throw new Error('event_target must be and instance of EventTarget');
        }
        if (typeof command_observer !== 'function') {
            throw new Error('command_observer must be a function');
        }

        this.#event_listener_manager = new _sys_event_listener_manager_js__WEBPACK_IMPORTED_MODULE_3__/* .EventListenerManager */ .w();

        const commands = new _sys_subscribable_js__WEBPACK_IMPORTED_MODULE_2__/* .Subscribable */ .l();  // emits command_context: { command: string, event: Event, target: Element, key_spec: KeySpec }
        this.#commands_subscription = commands.subscribe(command_observer);
        // note: we do not unsubscribe

        this.#key_map_stack = [];    // stack grows from the front, i.e., the first item is the last pushed
        this.#key_mapper    = null;  // set iff attached

        Object.defineProperties(this, {
            event_target: {
                value:      event_target,
                enumerable: true,
            },
            command_observer: {
                value:      command_observer,
                enumerable: true,
            },
            commands: {
                value:      commands,
                enumerable: true,
            },
        });
    }
    #event_listener_manager;
    #commands_subscription;
    #key_map_stack;
    #key_mapper;  // set iff attached

    reset_key_map_stack() {
        if (this.#key_map_stack.length > 0) {
            this.#key_map_stack.splice(0);  // clear stack
            this.#rebuild();
        }
    }
    push_key_map(key_map) {
        if (!(key_map instanceof _key_map_js__WEBPACK_IMPORTED_MODULE_1__/* .KeyMap */ .d)) {
            throw new Error('key_map must be an instance of KeyMap');
        }
        if (this.#key_map_stack.indexOf(key_map) !== -1) {
            throw new Error('key_map already exists in stack');
        }
        this.#key_map_stack.unshift(key_map);
        this.#rebuild();
    }
    pop_key_map() {
        const popped_key_map = this.#key_map_stack.shift();
        if (popped_key_map) {
            this.#rebuild();
        }
        return popped_key_map;
    }
    remove_key_map(key_map, remove_subsequent_too=false) {
        const index = this.#key_map_stack.indexOf(key_map);
        if (index === -1) {
            return false;
        } else {
            if (remove_subsequent_too) {
                this.#key_map_stack.splice(0, index+1);  // delete this and newer items
            } else {
                this.#key_map_stack.splice(index, 1);  // delete only this item
            }
            this.#rebuild();
            return true;
        }
    }

    get is_attached (){ return !!this.#key_mapper; }  // this.#key_mapper set iff attached

    /** attach to event_target and start listening for events.
     *  @return {Boolean} true iff successful
     */
    attach() {
        if (this.is_attached) {
            throw new Error('attach() called when already attached');
        }
        if (!this.#event_listener_manager.empty) {
            throw new Error('unexpected: attach() called with event listeners already present');
        }

        // this.#key_mapper is null
        if (this.#key_map_stack.length <= 0) {
            return false;  // indicate: attach failed
        }

        this.#key_mapper = _key_map_js__WEBPACK_IMPORTED_MODULE_1__/* .KeyMap */ .d.multi_mapper(...this.#key_map_stack);

        const initial_state = this.#key_mapper;
        let state;         // current "location" in key mapper
        let key_sequence;  // current sequence of key_specs that have been seen

        function reset() {
            state = initial_state;
            key_sequence = [];
        }
        reset();

        const blur_handler = reset;  // attached to this.event_target

        const key_handler = (event) => {  // attached to this.event_target
            switch (event.key) {
            case 'Alt':
            case 'AltGraph':
            case 'CapsLock':
            case 'Control':
            case 'Fn':
            case 'FnLock':
            case 'Hyper':
            case 'Meta':
            case 'NumLock':
            case 'ScrollLock':
            case 'Shift':
            case 'Super':
            case 'Symbol':
            case 'SymbolLock':
            case 'OS':  // Firefox quirk
                // modifier key, ignore
                break;

            default: {
                const key_spec = _key_spec_js__WEBPACK_IMPORTED_MODULE_0__/* .KeySpec */ .k.from_keyboard_event(event);
                key_sequence.push(key_spec);
                const mapping_result = state.consume(key_spec);
                if (!mapping_result) {
                    // failed
                    if (state !== initial_state) {
                        // beep only if at least one keypress has already been accepted
                        event.preventDefault();
                        (0,_beep_js__WEBPACK_IMPORTED_MODULE_4__/* .beep */ .V)();
                    }
                    // if still in initial_state, then no event.preventDefault()
                    reset();
                } else {
                    event.preventDefault();
                    if (typeof mapping_result === 'string') {
                        const command = mapping_result;
                        const command_context = { command, event, target: event.target, key_spec };
                        this.commands.dispatch(command_context);
                        reset();
                    } else {
                        state = mapping_result;
                    }
                }
                break;
            }
            }
        };

        const listener_specs = [
            [ this.event_target, 'blur',    blur_handler, { capture: true } ],
            [ this.event_target, 'keydown', key_handler,  { capture: true } ],
        ];
        for (const [ target, type, listener, options ] of listener_specs) {
            this.#event_listener_manager.add(target, type, listener, options);
        }

        return true;  // indicate: successfully attached
    }

    /** detach from event_target and stop listening for events.
     *  no-op if called when already detached.
     */
    detach() {
        this.#event_listener_manager.remove_all();
        this.#key_mapper = null;
    }


    // === INTERNAL ===

    #rebuild() {
        // rebuild the event handlers and state machine.
        const was_attached = this.is_attached;
        this.detach();
        if (was_attached) {
            this.attach();  // will fail if key_map stack is empty
        }
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 8395:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   d: () => (/* binding */ KeyMap)
/* harmony export */ });
/* harmony import */ var _key_spec_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6306);



class KeyMap {
    constructor(bindings=null, recognizer=null) {
        Object.defineProperties(this, {
            bindings: {  // key/command bindings
                value:      bindings,
                enumerable: true,
            },
            mapping: {  // canonical_key_string->(false|command|another_mapping)
                value:      this.constructor.#create_mapping(bindings),
                enumerable: true,
            },
            recognizer: {  // key_spec => (false|command)
                value:      recognizer,
                enumerable: true,
            },
        });
    }

    create_mapper(fallback_mapper=null) {
        return new this.constructor.Mapper(this.mapping, this.recognizer, fallback_mapper);
    }

    static multi_mapper(...key_maps) {
        if (key_maps.length <= 0) {
            throw new Error('at least one KeyMap instance must be given');
        }
        if (!key_maps.every(m => m instanceof this)) {
            throw new Error('arguments must all be KeyMap instances');
        }
        return key_maps.reduce((mapper, key_map) => key_map.create_mapper(mapper), null);
    }

    static #create_mapping(bindings) {
        if (bindings !== null && typeof bindings !== 'undefined' && typeof bindings !== 'object') {
            throw new Error('bindings must be null/undefined or an object');
        }
        const mapping = {};
        for (const command in bindings) {
            if (command.length <= 0) {
                throw new Error('bindings keys (command names) must not be empty strings');
            }
            for (const key_sequence of bindings[command]) {
                let seq_mapping = mapping;  // current mapping being acted upon by current key_string of sequence
                const seq_key_strings = key_sequence.split(_key_spec_js__WEBPACK_IMPORTED_MODULE_0__/* .KeySpec */ .k.canonical_key_string_separator);
                for (let i = 0; i < seq_key_strings.length; i++) {
                    const key_string = seq_key_strings[i];
                    const is_last = (i >= seq_key_strings.length-1);
                    const canonical_key_string = new _key_spec_js__WEBPACK_IMPORTED_MODULE_0__/* .KeySpec */ .k(key_string).canonical;
                    const existing = seq_mapping[canonical_key_string];
                    if (typeof existing === 'string' || (typeof existing === 'object' && is_last)) {
                        // something else already mapped here...
                        const seq_so_far = seq_key_strings.slice(0, i+1).join(_key_spec_js__WEBPACK_IMPORTED_MODULE_0__/* .KeySpec */ .k.canonical_key_string_separator);
                        throw new Error(`duplicate bindings specified for key sequence: ${seq_so_far}`);
                    }
                    if (!is_last) {
                        seq_mapping = existing ?? (seq_mapping[canonical_key_string] = {});
                    } else {
                        seq_mapping[canonical_key_string] = command;  // and then we're done...
                    }
                }
            }
        }
        return mapping;
    }

    static Mapper = class Mapper {
        constructor(mapping, recognizer, fallback_mapper=null) {
            if (mapping !== null && typeof mapping !== 'undefined' && typeof mapping !== 'object') {
                throw new Error('mapping must be null/undefined or an object');
            }
            if (recognizer !== null && typeof recognizer !== 'undefined' && typeof recognizer !== 'function') {
                throw new Error('recognizer must be null/undefined or a function');
            }
            if (fallback_mapper !== null && typeof fallback_mapper !== 'undefined' && !(fallback_mapper instanceof this.constructor)) {
                throw new Error('fallback_mapper must be null/undefined or a KeyMap instance');
            }
            if (!mapping && !fallback_mapper) {
                throw new Error('at least one of mapping or fallback_mapper must be given');
            }
            Object.defineProperties(this, {
                mapping: {
                    value:      mapping,
                    enumerable: true,
                },
                recognizer: {
                    value:      recognizer,
                    enumerable: true,
                },
                fallback_mapper: {
                    value:      fallback_mapper,
                    enumerable: true,
                },
            });
        }

        // returns a command string (complete), or undefined (failed), or a new Mapper instance (waiting for next key in sequence)
        consume(key_string_or_key_spec) {
            const key_spec = (key_string_or_key_spec instanceof _key_spec_js__WEBPACK_IMPORTED_MODULE_0__/* .KeySpec */ .k)
                  ? key_string_or_key_spec
                  : new _key_spec_js__WEBPACK_IMPORTED_MODULE_0__/* .KeySpec */ .k(key_string_or_key_spec);
            const recognizer_result = this.recognizer?.(key_spec);
            // this.recognizer takes precedence over this.mapping
            if (typeof recognizer_result === 'string') {
                return recognizer_result;
            }
            // this.mapping takes precedence over this.fallback_mapper
            const canonical_key_string = key_spec.canonical;
            const mapping_result = this.mapping?.[canonical_key_string];  // returns: undefined, string, or another mapping (object)
            if (typeof mapping_result === 'string') {
                return mapping_result;
            }
            const fallback_mapper_result = this.fallback_mapper?.consume(key_spec);
            if (typeof fallback_mapper_result === 'string') {
                return fallback_mapper_result;
            }
            if (!mapping_result && !fallback_mapper_result) {
                return undefined;  // indicate: failed
            }
            return mapping_result
                ? new Mapper(mapping_result, null, fallback_mapper_result)
                : fallback_mapper_result;  // no need to compose with mapping_result (which is undefined)
        }
    };
}


/***/ }),

/***/ 6306:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   k: () => (/* binding */ KeySpec)
/* harmony export */ });
class KeySpec {
    constructor(key_string, context=null) {
        if (typeof key_string !== 'string' || key_string.length <= 0) {
            throw new Error('key_string must be a non-empty string');
        }
        Object.defineProperties(this, {
            key_string: {
                value:      key_string,
                enumerable: true,
            },
            context: {
                value:      context,
                enumerable: true,
            },
        });
        this.#init();
    }


    // === CONSTANTS ===

    static canonical_key_modifier_separator = '+';  // separator between modifier codes and key in a canonical key string
    static canonical_key_string_separator   = ' ';  // separator between key_strings in a canonical key binding

    // #basic_modifier_desc_map is the definition from which #modifier_desc_map and #modifier_code_desc_map are derived
    static #basic_modifier_desc_map = {
        meta:  { code: 'm', event_prop: 'metaKey',  glyph: '\u2318', display_order: 3, alternates: [ 'cmd', 'command' ] },
        ctrl:  { code: 'c', event_prop: 'ctrlKey',  glyph: '\u2303', display_order: 1, alternates: [ 'control' ] },
        shift: { code: 's', event_prop: 'shiftKey', glyph: '\u21E7', display_order: 2, alternates: [] },
        alt:   { code: 'a', event_prop: 'altKey',   glyph: '\u2325', display_order: 4, alternates: [] },
    };

    static #other_key_glyphs = {
        arrowleft:  '\u2190',
        arrowup:    '\u2191',
        arrowright: '\u2192',
        arrowdown:  '\u2193',
        enter:      'Enter',
        backspace:  'Backspace',
        delete:     'Delete',
    };


    // === PARSING ===

    static from_keyboard_event(keyboard_event) {
        const modifier_descs = [];
        for (const modifier in this.#basic_modifier_desc_map) {
            const desc = this.#basic_modifier_desc_map[modifier];
            if (keyboard_event[desc.event_prop]) {
                modifier_descs.push(desc);
            }
        }
        const modifier_strings = modifier_descs
              .map(desc => this.#modifier_code_to_modifier[desc.code]);
        let key = event.key;
        const key_string = [ ...modifier_strings, key ].join(this.canonical_key_modifier_separator);
        // attaching keyboard_event as context enables commands like "insert-self"
        return new this(key_string, keyboard_event);
    }

    get glyphs (){
        if (typeof this.#glyphs === 'undefined') {
            // cache result
            const key = this.key;
            const klc = key.toLowerCase();
            const result_segments = this.modifier_descs.map(desc => desc.glyph);
            if (klc in this.constructor.#other_key_glyphs) {
                result_segments.push(this.constructor.#other_key_glyphs[klc]);
            } else if (key.match(/^[a-zA-Z]$/) || key.match(/^[fF][0-9]{1,2}$/)) {
                result_segments.push(key.toUpperCase());
            } else {
                result_segments.push(key);
            }
            this.#glyphs = result_segments.join('');
        }
        return this.#glyphs;
    }
    #glyphs;  // memoization


    // === INTERNAL ===

    #init() {
        const modifiers = this.key_string.split(/[+-]/);
        if (modifiers.length < 1 || modifiers.some(s => s.length <= 0)) {
            // check for case where key is '+' or '-', e.g., "-" or "shift++":
            if (this.key_string.match(/^[+-]$/)) {  // + or - alone?
                modifiers.splice(0);  // remove all entries
                modifiers.push(this.key_string)  // then add back this.key_string
            } else if (this.key_string.match(/[+-][+-]$/)) {  // with modifier?
                // remove last (empty) string:
                modifiers.splice(-1);
                // change new last (empty) string to the '+' or '-' that was specified:
                modifiers[modifiers.length-1] = this.key_string[this.key_string.length-1];
            } else {
                throw new Error(`invalid key_string ${this.key_string}`);
            }
        }
        let key = modifiers.at(-1);  // note: not converted to lowercase
        modifiers.splice(-1);  // remove key from modifiers
        for (let i = 0; i < modifiers.length; i++) {
            modifiers[i] = modifiers[i].toLowerCase();
        }
        let klc = key.toLowerCase();
        if (['up', 'down', 'left', 'right'].includes(klc)) {
            key = `Arrow${key}`;
            klc = `arrow${klc}`;
        }
        const modifier_descs = [];
        for (const modifier of modifiers) {
            const desc = this.constructor.#key_string_modifier_to_desc(modifier);
            if (!desc) {
                throw new Error(`invalid modifier "${modifier}" in key_string ${this.key_string}`);
            }
            if (desc.code in modifier_descs) {//!!! incorrect comparison
                throw new Error(`redundant modifier "${modifier}" in key_string ${this.key_string}`);
            }
            modifier_descs.push(desc);
        }
        modifier_descs.sort((a, b) => (a.display_order - b.display_order));  // sort in-place
        const modifier_flags = Object.values(modifier_descs)
              .reduce((flags, desc) => (flags | this.constructor.#modifier_to_flag[desc.code]), 0);
        const canonical_modifiers = modifier_descs
              .map(desc => desc.code)
              .join('');
        // determine is_printable
        let is_printable = true;
        if ((modifier_flags & ~this.constructor.shift_flag) !== 0) {
            // not printable if any modifier other than shift is applied
            is_printable = false;
        } else {
            // \p{C}: see https://unicode.org/reports/tr18/#General_Category_Property ("Control" characters)
            is_printable = !(key.length !== 1 || key.match(/^[\p{C}]$/u));
        }
        // note: preserve alphabetic case if is_printable, otherwise use lower-cased key
        const canonical = `${canonical_modifiers}${this.constructor.canonical_key_modifier_separator}${is_printable ? key : klc}`;

        Object.freeze(modifiers);
        Object.freeze(modifier_descs);

        Object.defineProperties(this, {
            key: {
                value:      key,
                enumerable: true,
            },
            modifiers: {
                value:      modifiers,
                enumerable: true,
            },
            modifier_descs: {
                value:      modifier_descs,
                enumerable: true,
            },
            modifier_flags: {
                value:      modifier_flags,
                enumerable: true,
            },
            canonical_modifiers: {
                value:      canonical_modifiers,
                enumerable: true,
            },
            canonical: {
                value:      canonical,
                enumerable: true,
            },
            is_printable: {
                value:      is_printable,
                enumerable: true,
            },
        });

        for (const modifier in this.constructor.#basic_modifier_desc_map) {
            Object.defineProperty(this, `has_${modifier}`, {
                value:      this.modifiers.includes(modifier),
                enumerable: true,
            });
        }

    }

    // modifier_desc: {
    //     modifier:       string,  // modifier string
    //     basic_modifier: string,  // canonical modifier string
    //     code:           string,  // canonical code for modifier
    //     event_prop:     string,  // corresponding property in KeyboardEvent object
    //     alternates:     string,  // all alternates, including basic_modifier
    // }
    static #modifier_desc_map;       // modifier_string->modifier_desc; initialized in this._init_static()
    static #modifier_code_desc_map;  // modifier_code->modifier_desc;   initialized in this._init_static()

    static #is_on_macos;  // initialized in this._init_static()

    static #key_string_modifier_to_desc(modifier) {
        modifier = modifier.toLowerCase();
        if (['cmdorctrl', 'commandorctrl'].includes(modifier)) {
            const CmdOrCtrl = this.#is_on_macos ? 'meta' : 'ctrl';
            modifier = CmdOrCtrl.toLowerCase();
        }
        return this.#modifier_desc_map[modifier];
    }

    static #modifier_code_to_modifier;       // code->modifier; initialized in this.#_init_static()
    static #modifier_code_to_glyph;          // code->glyph;    initialized in this.#_init_static()
    static #modifier_code_to_display_order;  // code->number;   initialized in this.#_init_static()

    static #modifier_to_flag;  // (code|full)->bit_field_integer

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        this.#is_on_macos = (globalThis.navigator?.platform ?? globalThis.navigator?.userAgentData?.platform ?? '').toLowerCase().startsWith('mac');

        this.#modifier_code_to_modifier = {};  // code->modifier
        for (const modifier in this.#basic_modifier_desc_map) {
            const desc = this.#basic_modifier_desc_map[modifier];
            this.#modifier_code_to_modifier[desc.code] = modifier;
        }

        this.#modifier_code_to_glyph =  // code->glyph
            Object.fromEntries(
                Object.entries(this.#basic_modifier_desc_map)
                    .map(([modifier_key, { code, glyph }]) => [ code, glyph ])
            );

        this.#modifier_code_to_display_order =  // code->number
            Object.fromEntries(
                Object.entries(this.#basic_modifier_desc_map)
                    .map(([modifier_key, { code, display_order }]) => [ code, display_order ])
            );

        this.#modifier_desc_map = this.#build_modifier_desc_map();  // modifier_string->modifier_desc

        this.#modifier_code_desc_map =  // modifier_code->modifier_desc
            Object.freeze(
                Object.fromEntries(
                    Object.keys(this.#basic_modifier_desc_map)
                        .map(k => this.#modifier_desc_map[k])
                        .map(desc => [ desc.code, desc ])
                )
            );

        let current_bit = 1;
        this.#modifier_to_flag = {};  // (code|full)->bit_field_integer
        for (const modifier in this.#basic_modifier_desc_map) {
            const desc = this.#basic_modifier_desc_map[modifier];
            this.#modifier_to_flag[modifier]  = current_bit;
            this.#modifier_to_flag[desc.code] = current_bit;
            current_bit <<= 1;
        }
        Object.freeze(this.#modifier_to_flag);

        for (const modifier in this.#basic_modifier_desc_map) {
            Object.defineProperty(this, `${modifier}_flag`, {
                value:      this.#modifier_to_flag[modifier],
                enumerable: true,
            });
        }
    }

    static #build_modifier_desc_map() {
        // validate this.#basic_modifier_desc_map:
        {
            const disallowed_modifier_codes = ('+-' + this.canonical_key_modifier_separator + this.canonical_key_string_separator);

            const keys = Object.keys(this.#basic_modifier_desc_map);
            if (keys.some(k => k !== k.toLowerCase())) {
                throw new Error('KeySpec.#basic_modifier_desc_map keys must be lowercase');
            }
            const all_alternates = keys.map(k => this.#basic_modifier_desc_map[k].alternates).reduce((acc, a) => [...acc, ...a]);
            if (all_alternates.some(k => k !== k.toLowerCase())) {
                throw new Error('KeySpec.#basic_modifier_desc_map alternates must be lowercase');
            }
            if (new Set([...keys, ...all_alternates]).size !== (keys.length + all_alternates.length)) {
                throw new Error('KeySpec.#basic_modifier_desc_map keys and alternates must all be distinct');
            }
            const codes = keys.map(k => this.#basic_modifier_desc_map[k].code)
            for (const code of codes) {
                if (code.length !== 1) {
                    throw new Error('KeySpec.#basic_modifier_desc_map codes must be single characters');
                }
                if (disallowed_modifier_codes.includes(code)) {
                    throw new Error(`KeySpec.#basic_modifier_desc_map codes are not allowed to be any of following: ${disallowed_modifier_codes}`);
                }
            }
            if (new Set(codes).size !== codes.length) {
                throw new Error('KeySpec.#basic_modifier_desc_map code values must be distinct');
            }
            const props = keys.map(k => this.#basic_modifier_desc_map[k].event_prop)
            if (new Set(props).size !== props.length) {
                throw new Error('KeySpec.#basic_modifier_desc_map event_prop values must be distinct');
            }
        }
        // validation passed; build the map
        const mdm = {};
        function create_extended_desc(basic_modifier_key, modifier_key, desc) {
            const ext_desc = {
                modifier: modifier_key,
                basic_modifier: basic_modifier_key,
                ...desc,
                alternates: [ ...new Set([ basic_modifier_key, modifier_key, ...desc.alternates ]) ],
            };
            return Object.freeze(ext_desc);
        }
        for (const bmdm_key in this.#basic_modifier_desc_map) {
            const desc = this.#basic_modifier_desc_map[bmdm_key];
            mdm[bmdm_key] = create_extended_desc(bmdm_key, bmdm_key, desc);
            for (const alt_key of desc.alternates) {
                mdm[alt_key] = create_extended_desc(bmdm_key, alt_key, desc);
            }
        }
        return Object.freeze(mdm);
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
KeySpec._init_static();


/***/ }),

/***/ 3231:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   j: () => (/* binding */ MenuBar)
/* harmony export */ });
/* harmony import */ var _sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6092);
/* harmony import */ var _sys_uuid_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(1896);
/* harmony import */ var _dom_util_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(984);
/* harmony import */ var _key_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2050);
/* harmony import */ var _src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6973);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__, _key_js__WEBPACK_IMPORTED_MODULE_2__]);
([_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__, _key_js__WEBPACK_IMPORTED_MODULE_2__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
const current_script_url = "file:///home/ed/code/logbook/lib/ui/menu/_.js";  // save for later












// === MENUBAR CLASS ===

// css classification classes: menubar, menu, menuitem
// other css classes: disabled, selected, active
// also: menuitem-label, menuitem-separator, menuitem-annotation, collection, collection-arrow

class MenuBar {
    static menu_element_tag_name     = 'menu';
    static menuitem_element_tag_name = 'li';

    static find_previous_menuitem(menuitem) {
        let mi = menuitem.previousElementSibling;
        while (mi && (!mi.classList.contains('menuitem') || mi.classList.contains('disabled'))) {
            mi = mi.previousElementSibling;
        }
        return mi;
    }

    static find_next_menuitem(menuitem) {
        let mi = menuitem.nextElementSibling;
        while (mi && (!mi.classList.contains('menuitem') || mi.classList.contains('disabled'))) {
            mi = mi.nextElementSibling;
        }
        return mi;
    }

    /** call this static method, not the constructor directly
     *  @param {Element} parent
     *  @param {Object} menubar_spec: {
     *      ...
     *  }
     *  @param {Function|null|undefined} get_command_bindings
     *  @return {MenuBar} menu bar instance
     */
    static create(parent, menubar_spec, get_command_bindings) {
        const menubar = new this(parent, menubar_spec, get_command_bindings);
        return menubar;
    }

    constructor(parent, menubar_spec, get_command_bindings) {
        if (!(parent instanceof Element)) {
            throw new Error('parent must be an instance of Element');
        }
        if (get_command_bindings !== null && typeof get_command_bindings !== 'undefined' && typeof get_command_bindings !== 'function') {
            throw new Error('get_command_bindings must be null, undefined, or a function');
        }

        get_command_bindings ??= () => [];

        const commands = new _sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__/* .Subscribable */ .l();  // emits command_context: { command: string, event: Event, target: Element }
        const selects  = new _sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__/* .Subscribable */ .l();  // emits { select: Boolean, target: Element }  // select: true is sent before, select: false is sent after

        Object.defineProperties(this, {
            get_command_bindings: {
                value:      get_command_bindings,
                enumerable: true,
            },
            commands: {
                value:      commands,
                enumerable: true,
            },
            selects: {
                value:      selects,
                enumerable: true,
            },
        });

        this.#menu_id_to_element = {};
        this.#menubar_container = this.#build_menubar(parent, menubar_spec);
    }
    #menu_id_to_element;
    #menubar_container;

    get element (){ return this.#menubar_container; }

    #get_menu_element(menu_id) {
        const element = this.#menu_id_to_element[menu_id];
        if (!element) {
            throw new Error(`no element found for menu id "${menu_id}"`);
        }
        if (!element.classList.contains('menuitem')) {
            throw new Error(`element for menu id "${menu_id}" is not a menuitem`);
        }
        return element;
    }

    /** activate menu
     *  @param {Object} options: {
     *      set_focus?: Boolean,  // set focus, too?
     *  }
     */
    async activate(options=null) {
        if (!(this.#menubar_container instanceof Element) || !this.#menubar_container.classList.contains('menubar')) {
            throw new Error('this.#menubar_container must be an Element with class "menubar"');
        }
        const {
            set_focus,
        } = (options ?? {});
        if (!this.#menubar_container.querySelector('.selected')) {
            // select the first menuitem of the menubar
            const menubar_first_menuitem = this.#menubar_container.querySelector('.menuitem');
            if (menubar_first_menuitem) {
                this.#select_menuitem(menubar_first_menuitem);
            }
        }
        if (set_focus) {
            return new Promise(resolve => setTimeout(() => {
                this.#menubar_container.focus();
                resolve();
            }));
        }
    }

    /** deactivate menu
     */
    deactivate() {
        this.#deactivate_menu(this.#menubar_container);
    }

    set_menu_state(menu_id, state_specs) {
        state_specs ??= {};
        if (typeof state_specs !== 'object') {
            throw new Error('state_specs must be an object');
        }
        const element = this.#get_menu_element(menu_id);
        for (const [ name, value ] of Object.entries(state_specs ?? {})) {
            switch (name) {
            case 'enabled': {
                if (value) {
                    element.classList.remove('disabled');
                } else {
                    element.classList.add('disabled');
                }
                break;
            }
            case 'checked': {
                if (value) {
                    element.classList.add('checked');
                } else {
                    element.classList.remove('checked');
                }
                break;
            }
            default: {
                throw new Error('unknown state name');
            }
            }
        }
    }


    // === INTERNAL ===

    /** deactivate the menubar or menu that contains the given menuitem
     *  and reset all subordinate state.
     *  @param {Element|undefined|null} menu_element an Element object with class either .menubar or .menu
     *  This is compatible with menuitem elements that are contained
     *  in either a .menubar or .menu element.
     */
    #deactivate_menu(menu_element) {
        if (menu_element) {
            if ( !(menu_element instanceof Element) ||
                 (!menu_element.classList.contains('menubar') && !menu_element.classList.contains('menu')) ) {
                throw new Error('menu_element must be an Element with class "menubar" or "menu"');
            }
            menu_element.classList.remove('active');
            menu_element.classList.remove('selected');
            for (const mi of menu_element.children) {
                mi.classList.remove('selected');
                if (mi.classList.contains('collection')) {
                    this.#deactivate_menu(mi.querySelector('.menu'));
                }
            }
            if (menu_element.classList.contains('menubar')) {
                this.selects.dispatch({ select: false, target: menu_element });
            }
        }
    }

    /** select the given menuitem and deselect all others
     *  @param {Element} menuitem_element
     *  This is compatible with menuitem elements that are contained
     *  in either a .menubar or .menu element.
     */
    #select_menuitem(menuitem_element) {
        if (!menuitem_element.classList.contains('selected')) {
            // change selection only if not already selected
            const container = menuitem_element.closest('.menubar, .menu');
            if (container.classList.contains('menubar') && !this.#menubar_container.querySelector('.selected')) {
                this.selects.dispatch({ select: true, target: menuitem_element });
            }
            // add .selected to menuitem_element
            menuitem_element.classList.add('selected');
            if (menuitem_element.classList.contains('collection')) {
                // make it "active" so that the submenu is displayed
                menuitem_element.querySelector('.menu').classList.add('active');
                // adjust the position of the collection
                const collection = menuitem_element.querySelector('.menu');
                const menuitem_element_br = menuitem_element.getBoundingClientRect();
                if (menuitem_element.parentElement.classList.contains('menubar')) {
                    collection.style.top  = `${menuitem_element_br.y + menuitem_element_br.height}px`;
                    collection.style.left = `${menuitem_element_br.x}px`;
                } else {
                    collection.style.top  = `${menuitem_element_br.y - menuitem_element_br.height}px`;
                    collection.style.left = `${menuitem_element_br.x + menuitem_element_br.width}px`;
                }
            }
            // we updated menuitem_element first so that we don't erroneously
            // fire a selects event with select: false while we deselect all
            // other children now
            for (const mi of container.children) {
                if (mi !== menuitem_element) {
                    this.#deselect_menuitem(mi);
                }
            }
        }
    }

    /** deselect the given menuitem
     *  @param {Element} menuitem_element
     *  This is compatible with menuitem elements that are contained
     *  in either a .menubar or .menu element.
     */
    #deselect_menuitem(menuitem_element) {
        if (menuitem_element.classList.contains('selected')) {
            menuitem_element.classList.remove('selected');
            if (menuitem_element.parentElement.classList.contains('menubar') && !this.#menubar_container.querySelector('.selected')) {
                this.selects.dispatch({ select: false, target: menuitem_element });
            }
        }
        if (menuitem_element.classList.contains('collection')) {
            this.#deactivate_menu(menuitem_element.querySelector('.menu'));
        }
    }

    /** Return a new menu Element object which represents a separator.
     *  @param {Element} parent
     */
    #build_menu_item_separator(parent) {
        if (!(parent instanceof Element)) {
            throw new Error('parent must be an instance of Element');
        }
        const element = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_element */ .T1)({
            parent,
            tag: this.constructor.menuitem_element_tag_name,
            attrs: {
                class: 'disabled menuitem menuitem-separator',
            },
        });
    }

    /** Return a new menu Element object for the given menu_spec.
     *  @param {object|string} menu_spec specification for menu item or collection.
     *         If a string, then create a separator (regardless of the string contents).
     *  @param {Element} parent
     *  @param {boolean} (optional) toplevel if the menu is the top-level "menubar" menu
     *         default value: false
     *  @return {Element} new menu Element
     *  Also updates this.#menu_id_to_element
     */
    #build_menu(menu_spec, parent, toplevel=false) {
        if (!(parent instanceof Element)) {
            throw new Error('parent must be an instance of Element');
        }
        if (typeof menu_spec === 'string') {
            return this.#build_menu_item_separator(parent);
        }

        const {
            label,
            collection,
            item,
            id: menu_id,
        } = menu_spec;

        if (typeof label !== 'string') {
            throw new Error('label must be specified as a string');
        }
        if (item && collection) {
            throw new Error('item and collection must not both be specified');
        }
        if (collection) {
            if (!Array.isArray(collection)) {
                throw new Error('collection must be an array');
            }
        }
        if (item) {
            if (typeof item !== 'object' || typeof item.command !== 'string') {
                throw new Error('item must specify an object with a string property "command"');
            }
        }
        if (!['undefined', 'string'].includes(typeof menu_id) || menu_id === '') {
            throw new Error('id must be a non-empty string');
        }

        // both items and collections are menuitem elements, but the collection also has children...
        const element = this.#build_menuitem(label, toplevel);

        if (item) {
            this.#add_item_menuitem_annotations_and_click_handler(element, item.command);
        } else {
            // collection
            element.classList.add('collection');

            const collection_element = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_element */ .T1)({
                parent: element,
                tag:    this.constructor.menu_element_tag_name,
                attrs: {
                    class: 'menu',
                },
            });
            if (!toplevel) {
                (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_element */ .T1)({
                    parent: element,
                    attrs: {
                        class: 'menuitem-annotation collection-arrow',
                    },
                }).innerText = '\u25b8';  // right-pointing triangle
            }
            collection.forEach(spec => this.#build_menu(spec, collection_element));

            if (toplevel) {
                element.addEventListener('click', (event) => {
                    if (event.target.closest('.menuitem') === element) {  // make sure click is not in a child (submenu)
                        if (element.classList.contains('selected')) {
                            this.#deselect_menuitem(element);
                        } else {
                            this.#select_menuitem(element);
                        }
                        event.stopPropagation();
                        event.preventDefault();
                    }
                });
            }
        }

        if (menu_id) {
            this.#menu_id_to_element[menu_id] = element;
        }

        // wait to add to parent until everything else happens without error
        if (parent) {
            parent.appendChild(element);
        }

        return element;
    }

    #build_menuitem(label, toplevel=false) {
        // both items and collections are menuitem elements, but the collection also has children...
        const id = (0,_sys_uuid_js__WEBPACK_IMPORTED_MODULE_4__/* .generate_object_id */ .pk)();
        const menuitem = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_element */ .T1)({
            tag: this.constructor.menuitem_element_tag_name,
            attrs: {
                id,
                class: 'menuitem',
            },
        });

        // add the label
        (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_element */ .T1)({
            parent: menuitem,
            attrs: {
                class: 'menuitem-label',
            },
        }).innerText = label;

        menuitem.addEventListener('mousemove', (event) => {
            // don't pop open top-level menus unless one is already selected
            // this means that the user must click the top-level menu to get things started
            if (!toplevel || this.#menubar_container.querySelector('.selected')) {
                if (!menuitem.classList.contains('disabled')) {
                    this.#select_menuitem(menuitem);
                }
            }
        });
        return menuitem;
    }
    #add_item_menuitem_annotations_and_click_handler(menuitem, command) {
        if (command) {
            const command_bindings = this.get_command_bindings();
            const kbd_bindings = command_bindings[command];
            if (kbd_bindings) {
                const kbd_container = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_element */ .T1)({
                    parent: menuitem,
                    attrs: {
                        class: 'menuitem-annotation',
                    },
                });
                // create <kbd>...</kbd> elements
                kbd_bindings.forEach(binding => {
                    const binding_glyphs = new _key_js__WEBPACK_IMPORTED_MODULE_2__/* .KeySpec */ .k7(binding).glyphs;
                    (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_element */ .T1)({ parent: kbd_container, tag: 'kbd' }).innerText = binding_glyphs;
                });
            }
        }

        menuitem.addEventListener('click', (event) => {
            this.#deactivate_menu(menuitem.closest('.menubar'));
            const command_context = { command, event, target: event.target };
            this.commands.dispatch(command_context);
            event.stopPropagation();
            event.preventDefault();
        });
    }

    #build_menubar(parent, menubar_spec) {
        const menubar_container = (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_element */ .T1)({
            parent,
            tag: this.constructor.menu_element_tag_name,
            attrs: {
                class:    'active menubar',
                role:     'navigation',
                tabindex: 0,
            },
            before: parent.firstChild,  // prepend
        });
        menubar_spec.forEach(spec => this.#build_menu(spec, menubar_container, true));

        // add event listener to close menu when focus is lost
        menubar_container.addEventListener('blur', (event) => {
            this.#deactivate_menu(menubar_container);
        });

        // add keyboard navigation event listener
        menubar_container.addEventListener('keydown', (event) => {
            const selected_elements = menubar_container.querySelectorAll('.selected');
            if (selected_elements.length <= 0) {
                if (! ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) {
                    return;  // do not handle or alter propagation
                } else {
                    // select the first menuitem of the menubar
                    const menubar_first_menuitem = menubar_container.querySelector('.menuitem');
                    if (menubar_first_menuitem) {
                        this.#select_menuitem(menubar_first_menuitem);
                    }
                }
            } else {
                const menuitem = selected_elements[selected_elements.length-1];

                const is_in_menubar = (menuitem.parentElement === menubar_container);

                let key_menu_prev, key_menu_next, key_cross_prev, key_cross_next;
                if (is_in_menubar) {
                    key_menu_prev  = 'ArrowLeft';
                    key_menu_next  = 'ArrowRight';
                    key_cross_prev = 'ArrowUp';
                    key_cross_next = 'ArrowDown';
                } else {
                    key_menu_prev  = 'ArrowUp';
                    key_menu_next  = 'ArrowDown';
                    key_cross_prev = 'ArrowLeft';
                    key_cross_next = 'ArrowRight';
                }

                switch (event.key) {
                case 'Enter':
                case ' ': {
                    menuitem.click();
                    break;
                }
                case 'Escape': {
                    this.#deactivate_menu(menubar_container);
                    break;
                }
                case key_menu_prev: {
                    const mi = this.constructor.find_previous_menuitem(menuitem);
                    if (mi) {
                        this.#select_menuitem(mi);
                    } else if (!is_in_menubar) {
                        menuitem.classList.remove('selected');  // parent menuitem will still be selected
                    }
                    break;
                }
                case key_menu_next: {
                    const mi = this.constructor.find_next_menuitem(menuitem);
                    if (mi) {
                        this.#select_menuitem(mi);
                    }
                    break;
                }
                case key_cross_prev: {
                    if (!is_in_menubar) {
                        const menubar_menuitem = menubar_container.querySelector('.menuitem.selected');
                        const mbi = this.constructor.find_previous_menuitem(menubar_menuitem);
                        if (mbi) {
                            this.#select_menuitem(mbi);
                        }
                    }
                    break;
                }
                case key_cross_next: {
                    let navigated_into_collection = false;
                    if (menuitem.classList.contains('collection')) {
                        // enter collection if possible
                        const mi = menuitem.querySelector('.menuitem:not(.disabled)');
                        if (mi) {
                            this.#select_menuitem(mi);
                            navigated_into_collection = true;
                        }
                    }
                    if (!navigated_into_collection && !is_in_menubar) {
                        const menubar_menuitem = menubar_container.querySelector('.menuitem.selected');
                        const mbi = this.constructor.find_next_menuitem(menubar_menuitem);
                        if (mbi) {
                            this.#select_menuitem(mbi);
                        }
                    }
                    break;
                }

                default:
                    return;  // do not handle or alter propagation
                }
            }

            // if we get here, assume the event was handled and therefore
            // we should stop propagation and prevent default action.
            event.stopPropagation();
            event.preventDefault();
        }, {
            capture: true,
        });

        return menubar_container;
    }


    // === INTERNAL ===

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        //!!! should we assume that the document is ready here?
        (0,_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_stylesheet_link */ .KP)(document.head, new URL('style.css', (0,_src_assets_server_url_js__WEBPACK_IMPORTED_MODULE_3__/* .assets_server_url */ .h)(current_script_url)));
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
MenuBar._init_static();

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 6973:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   h: () => (/* binding */ assets_server_url)
/* harmony export */ });
const current_script_url = "file:///home/ed/code/logbook/src/assets-server-url.js";  // save for later

const assets_server_script = document.querySelector('script');
if (!assets_server_script || !assets_server_script.src) {
    throw new Error('no script for assets server found in document');
}
const assets_server_root = new URL('..', assets_server_script.src);  // assumes script src points to is one directory level below the server root
const local_server_root  = new URL('..', current_script_url);        // assumes this script is located one directory level below server root


function assets_server_url(local_url) {
    if (typeof local_url === 'string') {
        local_url = new URL(local_url);
    }
    if (!(local_url instanceof URL)) {
        throw new Error('local_url must be a string or an instance of URL');
    }

    if ( local_url.protocol !== 'file:' ||
         local_server_root.protocol !== 'file:' ||
         assets_server_root.protocol === 'file:' ||
         !local_url.href.startsWith(local_server_root.href) ) {
        return local_url;  // nothing to do...
    } else {
        const relative = local_url.href.slice(local_server_root.href.length);
        return new URL(assets_server_root.href + relative);
    }
}


/***/ }),

/***/ 3088:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   W: () => (/* binding */ EditorCellElement)
/* harmony export */ });
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(53);
/* harmony import */ var _lib_sys_event_listener_manager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(9886);
/* harmony import */ var _lib_ui_key_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2050);
/* harmony import */ var _lib_ui_change_manager_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3688);
/* harmony import */ var _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3653);
/* harmony import */ var _lib_ui_beep_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(1951);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(6973);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__, _lib_ui_key_js__WEBPACK_IMPORTED_MODULE_2__, _lib_ui_change_manager_js__WEBPACK_IMPORTED_MODULE_3__, _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_4__]);
([_logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__, _lib_ui_key_js__WEBPACK_IMPORTED_MODULE_2__, _lib_ui_change_manager_js__WEBPACK_IMPORTED_MODULE_3__, _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_4__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
const current_script_url = "file:///home/ed/code/logbook/src/editor-cell-element/_.js";  // save for later


















class EditorCellElement extends HTMLElement {
    static custom_element_name = 'editor-cell';

    static attribute__active  = 'data-active';
    static attribute__visible = 'data-visible';

    constructor() {
        super();
        this.#event_listener_manager = new _lib_sys_event_listener_manager_js__WEBPACK_IMPORTED_MODULE_6__/* .EventListenerManager */ .w();

        this.#key_event_manager = new _lib_ui_key_js__WEBPACK_IMPORTED_MODULE_2__/* .KeyEventManager */ .Qm(this, this.#command_observer.bind(this));
        this.#command_bindings  = this.get_command_bindings();

        const key_map = new _lib_ui_key_js__WEBPACK_IMPORTED_MODULE_2__/* .KeyMap */ .d4(this.constructor.get_initial_key_map_bindings(), this.constructor.key_map_insert_self_recognizer);
        this.push_key_map(key_map);

        // _tool_bar is used instead of #tool_bar so that subclasses have access (see establish_tool_bar())
        this._tool_bar = null;
    }
    #event_listener_manager;
    #key_event_manager;
    #command_bindings;


    // === EDITABLE ===

    get editable (){
        if (!this.hasAttribute('contenteditable')) {
            return false;
        } else {
            const contenteditable_value = this.getAttribute('contenteditable');
            return (contenteditable_value !== false.toString());
        }
    }

    set_editable(editable) {
        if (editable) {
            this.setAttribute('contenteditable', true.toString());
        } else {
            this.removeAttribute('contenteditable');
        }
    }


    // === KEY MAP STACK ===

    reset_key_map_stack() {
        this.#key_event_manager.reset_key_map_stack();
    }
    push_key_map(key_map) {
        this.#key_event_manager.push_key_map(key_map);
    }
    pop_key_map() {
        return this.#key_event_manager.pop_key_map();
    }
    remove_key_map(key_map, remove_subsequent_too=false) {
        return this.#key_event_manager.remove_key_map(key_map, remove_subsequent_too);
    }

    static key_map_insert_self_recognizer(key_spec) {
        return (key_spec.is_printable ? 'insert-self' : false);
    }


    // === TOOL BAR ===

    establish_tool_bar() {
        if (!this._tool_bar) {
            this._tool_bar = _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_4__/* .ToolBarElement */ .d.create_for(this, {
                editable: false,
                visible:  { initial: this.visible,  on: (event) => this.set_visible(!this.visible) },
                autoeval: false,
                modified: true,
            });
            this.parentElement.insertBefore(this._tool_bar, this);
        }
    }

    remove_tool_bar() {
        if (this._tool_bar) {
            this._tool_bar.remove();
            this._tool_bar = undefined;
        }
    }


    // === DOM ===

    /** return the first and last elements in the DOM that are associated with this editor-cell
     *  @return {Object|null} null if this is not in the DOM body, otherwise { first: Element, last: Element }
     */
    get_dom_extent() {
        if (document.body === this || !document.body?.contains(this)) {
            return null;  // indicate: not in DOM body
        } else {
            let first = this,
                last  = this;
            if (this._tool_bar) {
                if (first.compareDocumentPosition(this._tool_bar) & Node.DOCUMENT_POSITION_PRECEDING) {
                    first = this._tool_bar;
                }
                if (last.compareDocumentPosition(this._tool_bar) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    last = this._tool_bar;
                }
            }
            return { first, last };
        }
    }

    /** create a new EditorCellElement instance with standard settings
     *  @param {null|undefined|Object} options: {
     *      parent?:   Node,     // default: document.body
     *      before?:   Node,     // default: null
     *      editable:  Boolean,  // set contenteditable?  default: current logbook editable setting
     *      innerText: String,   // cell.innerText to set
     *  }
     *  @return {EditorCellElement} new cell
     */
    static create_cell(options=null) {
        const {
            parent   = document.body,
            before   = null,
            editable = _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.editable,
            innerText,
        } = (options ?? {});

        const cell = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
            parent,
            before,
            tag: this.custom_element_name,
            attrs: {
                tabindex: 0,  // permit focus
            },
        });
        cell.set_editable(editable);

        if (innerText) {
            cell.innerText = innerText;
        }

        cell.establish_tool_bar();

        return cell;
    }

    /** return the next cell in the document with this.tagName, or null if none
     *  @param {Boolean} forward (default false) if true, return the next cell, otherwise previous
     *  @return {null|Element} the adjacent cell, or null if not found
     */
    adjacent_cell(forward=false) {
        // note that this.tagName is a selector for elements with that tag name
        const cells = [ ...document.querySelectorAll(this.tagName) ];
        const index = cells.indexOf(this);
        if (index === -1) {
            return null
        } else {
            if (forward) {
                if (index >= cells.length-1) {
                    return null;
                } else {
                    return cells[index+1];
                }
            } else {
                if (index <= 0) {
                    return null;
                } else {
                    return cells[index-1];
                }
            }
        }
    }

    /** move (or remove) this cell within the DOM
     *  @param {null|undefined|Object} options: {
     *      parent?: Node,  // default: null  // new parent, or null/undefined to remove
     *      before?: Node,  // default: null  // new before node
     *  }
     */
    move_cell(options=null) {
        const { parent, before } = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .validate_parent_and_before_from_options */ .Aj)(options);
        if (!parent) {
            if (this.parentNode) {
                this.remove_cell();
            }
        } else {
            const had_tool_bar = !!this._tool_bar;
            this.remove_tool_bar();
            parent.insertBefore(this, before);
            if (had_tool_bar) {
                this.establish_tool_bar();
            }
        }
    }

    /** remove this cell from the DOM
     */
    remove_cell() {
        this.remove_tool_bar();
        this.remove();
    }

    /** reset the cell; this base class version does nothing
     *  @return {EvalCellElement} this
     */
    reset() {
        return this;
    }


    // === COMMAND HANDLER INTERFACE ===

    /** return the initial key map bindings
     *  @return {Object} mapping from command strings to arrays of triggering key sequences
     */
    static get_initial_key_map_bindings() {
        return {
            ..._logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.constructor.get_global_initial_key_map_bindings(),

//!!!            'insert-line-break':   [ 'Enter' ],

//!!!            'delete-forward':      [ 'Delete' ],
//!!!            'delete-reverse':      [ 'Backspace' ],
//!!!            'delete-text-forward': [ 'Alt-Delete' ],
//!!!            'delete-text-reverse': [ 'Alt-Backspace' ],

//!!!            'cut':                 [ 'CmdOrCtrl-X' ],
//!!!            'copy':                [ 'CmdOrCtrl-C' ],
//!!!            'paste':               [ 'CmdOrCtrl-V' ],
        };
    }

    /** return command bindings for this cell
     *  @return {Object} mapping from command strings to functions implementing that command
     * The bindings are obtained by merging local command bindings with logbook_manager
     * command bindings.
     */
    get_command_bindings() {
        const command_bindings = {
            ..._logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.get_global_command_bindings(),

            'insert-self':         this.command_handler__insert_self.bind(this),
            'insert-line-break':   this.command_handler__insert_line_break.bind(this),

            'delete-text-forward': this.create_command_handler___delete({ element_too: false, reverse: false }),
            'delete-text-reverse': this.create_command_handler___delete({ element_too: false, reverse: true  }),
            'delete-forward':      this.create_command_handler___delete({ element_too: true,  reverse: false }),
            'delete-reverse':      this.create_command_handler___delete({ element_too: true,  reverse: true  }),

            'cut':                 this.command_handler__cut.bind(this),
            'copy':                this.command_handler__copy.bind(this),
            'paste':               this.command_handler__paste.bind(this),

            'reset-cell':          this.command_handler__reset_cell.bind(this),

            'toggle-cell-visible': this.command_handler__toggle_visible.bind(this),
        };

        return command_bindings;
    }

    #command_observer(command_context) {
        try {
            const success = this.perform_command(command_context);
            if (!success) {
                (0,_lib_ui_beep_js__WEBPACK_IMPORTED_MODULE_7__/* .beep */ .V)();
            }
        } catch (error) {
            console.error('error processing command', command_context, error);
            (0,_lib_ui_beep_js__WEBPACK_IMPORTED_MODULE_7__/* .beep */ .V)();
        }
    }

    perform_command(command_context) {
        if (!command_context) {
            return false;  // indicate: command not handled
        } else {
            const target = command_context.target;
            if (!target || !this.contains(target)) {
                return false;  // indicate: command not handled
            } else {
                const bindings_fn = this.#command_bindings[command_context.command];
                if (!bindings_fn) {
                    return false;  // indicate: command not handled
                } else {
                    return bindings_fn(command_context);
                }
            }
        }
    }

    // === COMMAND HANDLERS ===

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__insert_self(command_context) {
        const key_spec = command_context.key_spec;
        const text = key_spec?.key ?? key_spec?.canonical ?? '';
        if (!text) {
            return false;
        } else {
            return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .manage_selection_for_insert */ .Sh)(
                (point) => (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .insert_at */ .yU)(point, text)
            );
        }
    }

    command_handler__insert_line_break(command_context) {
        return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .manage_selection_for_insert */ .Sh)(
//            (point) => insert_at(point, document.createElement('br'))
            (point) => (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .insert_at */ .yU)(point, '\n')
        );
    }

    create_command_handler___delete(options) {
        return (command_context) => {
            return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .manage_selection_for_delete */ .cj)(
                (point) => (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .delete_nearest_leaf */ .r1)(point, options)
            );
        };
    }

    command_handler__cut(command_context) {
        document.execCommand('cut');  // updates selection
        return true;
    }

    command_handler__copy(command_context) {
        document.execCommand('copy');  // updates selection
        return true;
    }

    async command_handler__paste(command_context) {
        //!!! THIS NO LONGER WORKS: return document.execCommand('paste');  // updates selection
        //!!! Also, the following does not work on Firefox:
        const text = await navigator.clipboard.readText();
        if (!text) {
            return false;
        } else {
            return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .manage_selection_for_insert */ .Sh)(
                (point) => (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .insert_at */ .yU)(point, text)
            );
        }
    }

    command_handler__reset_cell(command_context) {
        this.reset();
        return true;
    }

    command_handler__toggle_visible(command_context) {
        this.set_visible(!this.visible);
        return true;
    }


    // === ATTRIBUTES ===

    get active (){ return !!this.hasAttribute(this.constructor.attribute__active); }
    set_active(state=false) {
        if (state) {
            this.setAttribute(this.constructor.attribute__active, true);
        } else {
            this.removeAttribute(this.constructor.attribute__active);
        }
    }

    get visible (){ return !!this.hasAttribute(this.constructor.attribute__visible); }
    set_visible(state=false) {
        state = !!state;
        this._tool_bar.set_for('visible', state);
        if (state) {
            this.setAttribute(this.constructor.attribute__visible, true);
        } else {
            this.removeAttribute(this.constructor.attribute__visible);
        }
    }


    // === FOCUS HANDLERS / ACTIVE ===

    #connect_focus_listeners() {
        if (this.#event_listener_manager.empty()) {
            function focus_handler(event) {
                // logbook_manager.set_active_cell() clears/sets the "active" attributes of cells
                _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.set_active_cell(this);
            }
            const listener_specs = [
                [ this, 'focus', focus_handler, { capture: true } ],
            ];
            for (const [ target, type, listener, options ] of listener_specs) {
                this.#event_listener_manager.add(target, type, listener, options);
            }
        }
    }

    #disconnect_focus_listeners() {
        this.#event_listener_manager.remove_all();
    }


    // === WEB COMPONENT LIFECYCLE ===

    // connectedCallback:
    //     Invoked each time the custom element is appended into a document-connected element.
    //     This will happen each time the node is moved, and may happen before the element's contents have been fully parsed.
    //     Note: connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
    connectedCallback() {
        this.#connect_focus_listeners();
        this.#key_event_manager.attach();
    }

    // disconnectedCallback:
    //     Invoked each time the custom element is disconnected from the document's DOM.
    disconnectedCallback() {
        this.#disconnect_focus_listeners();
        this.#key_event_manager.detach();
    }

    // adoptedCallback:
    //     Invoked each time the custom element is moved to a new document.
    adoptedCallback() {
        this.#connect_focus_listeners();
        this.#key_event_manager.attach();
    }

    // attributeChangedCallback:
    //     Invoked each time one of the custom element's attributes is added, removed, or changed.
    //     Which attributes to notice change for is specified in a static get observedAttributes method
    attributeChangedCallback(name, old_value, new_value) {
        switch (name) {
        case 'xyzzy': {
            //!!!
            break;
        }
        }
        //!!!
    }

    static get observedAttributes() {
        return [
            'xyzzy',//!!!
        ];
    }


    // === INTERNAL ===

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        globalThis.customElements.define(this.custom_element_name, this);
        //!!! should we assume that the document is ready here?
        (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_stylesheet_link */ .KP)(document.head, new URL('style.css', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_5__/* .assets_server_url */ .h)(current_script_url)));
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
EditorCellElement._init_static();

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 6179:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   p: () => (/* binding */ EvalCellElement)
/* harmony export */ });
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(53);
/* harmony import */ var _editor_cell_element_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3088);
/* harmony import */ var _evaluator_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(9026);
/* harmony import */ var _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(4429);
/* harmony import */ var _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3653);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(6973);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__, _editor_cell_element_js__WEBPACK_IMPORTED_MODULE_2__, _evaluator_js__WEBPACK_IMPORTED_MODULE_3__, _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_4__]);
([_logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__, _editor_cell_element_js__WEBPACK_IMPORTED_MODULE_2__, _evaluator_js__WEBPACK_IMPORTED_MODULE_3__, _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_4__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
const current_script_url = "file:///home/ed/code/logbook/src/eval-cell-element/_.js";  // save for later
















class EvalCellElement extends _editor_cell_element_js__WEBPACK_IMPORTED_MODULE_2__/* .EditorCellElement */ .W {
    static custom_element_name = 'eval-cell';

    static #attribute__input_type        = 'data-input-type';
    static #attribute__output_element_id = 'data-output-element-id';

    get input_type (){ return this.getAttribute(this.constructor.#attribute__input_type); }
    set input_type (input_type){
        this.setAttribute(this.constructor.#attribute__input_type, input_type);
        this._tool_bar?.set_type(input_type);
        return input_type;
    }


    constructor() {
        super();
        // create a single bound handler function so that
        // we have a consistent handler function for add
        // and remove
        this.#output_element_pointerdown_handler_bound = this.#output_element_pointerdown_handler.bind(this);
    }


    // === OUTPUT ELEMENT ===

    // CSS class for output elements created by establish_output_element()
    static get output_element_class (){ return 'eval-cell-output'; }

    get output_element_id (){
        return this.getAttribute(this.constructor.#attribute__output_element_id);
    }

    set output_element_id (id){
        if (id === null || typeof id === 'undefined' || id === '') {
            this.setAttribute(this.constructor.#attribute__output_element_id, '');
        } else {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error('element with specified id does not exist');
            }
            if (!(element instanceof HTMLElement)) {
                throw new Error('element specified by id must be an instance of HTMLElement');
            }
            this.setAttribute(this.constructor.#attribute__output_element_id, id);
        }
        return id;
    }

    get output_element (){
        const oid = this.output_element_id;
        if (!oid) {
            return null;
        } else {
            const element = document.getElementById(oid);
            if (!element || !(element instanceof HTMLElement)) {
                console.warn('bad configuration of EvalCellElement: id does not specify an HTMLElement');
                return null;
            } else {
                return element;
            }
        }
    }

    set output_element (element){
        element ??= null;
        if (element && (!element.id || !(element instanceof HTMLElement))) {
            throw new Error('element must be null, undefined, or an instance of HTMLElement with an id');
        }

        // remove handler from old output_element and add handler to new output_element
        const current_output_element = this.output_element;
        if (current_output_element !== element) {
            if (current_output_element) {
                current_output_element.removeEventListener('pointerdown', this.#output_element_pointerdown_handler_bound);
            }
            if (element) {
                element.addEventListener('pointerdown', this.#output_element_pointerdown_handler_bound);
            }
        }

        this.output_element_id = element ? element.id : null;
        return element;
    }

    /** create an output element, if necessary, and set its standard attributes
     *  @return {HTMLElement} output element;
     */
    establish_output_element() {
        let output_element = this.output_element;
        if (!output_element) {
            const dom_extent = this.get_dom_extent();
            const before = dom_extent ? dom_extent.last.nextSibling : this.nextSibling;
            const parent = before?.parentElement ?? this.parentElement;
            output_element = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({ parent, before });
            this.output_element = output_element;
        }
        output_element.classList.add(this.constructor.output_element_class);
        return output_element;
    }

    /** remove the output_element, if any, from this eval-cell and from the DOM
     *  @return {EvalCellElement} this
     */
    remove_output_element() {
        const output_element = this.output_element;
        if (output_element) {
            this.output_element = null;
            output_element.remove();
        }
        return this;
    }

    #output_element_pointerdown_handler(event) {
        if (!this.contains(document.activeElement)) {
            this.focus();
            event.preventDefault();
            event.stopPropagation();
        }
    }
    #output_element_pointerdown_handler_bound;  // initialized in constructor

    // === OUTPUT ELEMENT AWARE OVERRIDES ===

    /** move (or remove) this cell within the DOM
     *  @param {null|undefined|Object} options: {
     *      parent?: Node,  // default: null  // new parent, or null/undefined to remove
     *      before?: Node,  // default: null  // new before node
     *  }
     */
    move_cell(options=null) {
        const { parent, before } = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .validate_parent_and_before_from_options */ .Aj)(options);
        const output_element = this.output_element;
        const output_element_precedes = output_element && !!(this.compareDocumentPosition(output_element) & Node.DOCUMENT_POSITION_PRECEDING);
        super.move_cell(options);
        // if !parent, then cell and output_element will have  been removed
        if (parent && output_element) {
            const element_after_output = output_element_precedes ? this : before;
            parent.insertBefore(output_element, element_after_output);
        }
    }

    /** override of EditorCellElement.remove_cell().
     *  remove this cell and its output_element, if any, from the DOM
     */
    remove_cell() {
        this.remove_output_element();
        super.remove_cell();
    }

    /** reset the cell; clear the output_element, if any
     *  @return {EvalCellElement} this
     */
    reset() {
        super.reset();
        const output_element = this.output_element;
        if (output_element) {
            (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .clear_element */ .gX)(output_element);
        }
        return this;
    }

    // === EVAL ===

    /** evaluate the contents of this element
     *  @param {null|undefined|Object} options: {
     *      evaluator_class?: Evaluator,    // evaluator class to use
     *      output_element?:  HTMLElement,  // output_element for eval(); if given, will be set as this.output_element
     *      eval_context?:    Object,       // default: a new {}; will be "this" during expression evaluation.
     *  }
     *  @return {Promise} promise returned by evaluator_class eval method
     * If evaluator_class is not given, then Evaluator.class_for_content() is called to get one.
     */
    async eval(options=null) {  // options: { evaluator_class?, output_element?, eval_context? }
        const {
            evaluator_class: evaluator_class_from_options,
            output_element:  output_element_from_options,
            eval_context,
        } = (options ?? {});

        const evaluator_class = evaluator_class_from_options ?? _evaluator_js__WEBPACK_IMPORTED_MODULE_3__/* .Evaluator */ .v.class_for_content(this);

        if (!(evaluator_class === _evaluator_js__WEBPACK_IMPORTED_MODULE_3__/* .Evaluator */ .v || evaluator_class.prototype instanceof _evaluator_js__WEBPACK_IMPORTED_MODULE_3__/* .Evaluator */ .v)) {
            throw new Error('evaluator_class must be an instance of Evaluator');
        }

        // stop current evaluator, if any
        this.stop();  // clears this.#evaluator_stoppable

        let output_element;
        if (output_element_from_options) {
            output_element = output_element_from_options;
            this.output_element = output_element;
        } else {
            output_element = this.establish_output_element();
        }
        (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .clear_element */ .gX)(output_element);

        // allocate the evaluator, store it, then eval
        const evaluator = new evaluator_class(this, output_element, eval_context);

        this.#evaluator_stoppable = new _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_6__/* .Stoppable */ .X(evaluator);  // already cleared by this.stop() above
        this.#evaluator_foreground = true;
        this._tool_bar?.set_for('running', true);
        _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.emit_eval_state(this, true);

        return evaluator._perform_eval()
            .then(() => {
                this.#evaluator_foreground = undefined;
                this._tool_bar?.set_for('running', false);
                _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.emit_eval_state(this, false);
            })
            .catch(error => {
                this.stop();  // stop anything that may have been started
                return evaluator.output_context.invoke_renderer_for_type('error', error);
            });
    }
    #evaluator_foreground;  // true iff evaluating and before return
    #evaluator_stoppable;

    /** @return true iff an evaluation is running and has not yet returned
     */
    get evaluator_foreground (){ return !!this.#evaluator_foreground; }

    /** @return true iff an evaluation has run and returned (but may still have pending asynchonous evaluations)
     */
    get can_stop (){ return !!this.#evaluator_stoppable; }

    stop() {
        if (this.#evaluator_stoppable) {
            try {
                this.#evaluator_stoppable.stop();
            } catch (error) {
                console.warn('error stopping evaluator', error, this.#evaluator_stoppable);
                // continue...
            }
        }
        this.#evaluator_stoppable  = undefined;
        this.#evaluator_foreground = undefined;
        this._tool_bar?.set_for('running', false);
        _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.emit_eval_state(this, false);
    }

    establish_tool_bar() {  // override of EditorCellElement.establish_tool_bar()
        if (!this._tool_bar) {
            let initial_type = this.input_type || undefined;
            this._tool_bar = _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_4__/* .ToolBarElement */ .d.create_for(this, {
                editable: false,
                visible:  { initial: this.visible,  on: (event) => this.set_visible(event.target.get_state()) },
                autoeval: false,
                type:     { ...(initial_type ? { initial: initial_type } : {}),  on: (event) => { this.input_type = event.target.value } },//!!!
                running:  true,
                modified: false,
                run:      false,
            });
            this.parentElement.insertBefore(this._tool_bar, this);
        }
    }

    // === DOM ===

    /** return the first and last elements in the DOM that are associated with this eval-cell
     *  @return {Object|null} null if this is not in the DOM body, otherwise { first: Element, last: Element }
     */
    get_dom_extent() {
        if (document.body === this || !document.body?.contains(this)) {
            return null;  // indicate: not in DOM body
        } else {
            let { first, last } = super.get_dom_extent();
            const output_element = this.output_element;
            if (output_element) {
                if (first.compareDocumentPosition(output_element) & Node.DOCUMENT_POSITION_PRECEDING) {
                    first = output_element;
                }
                if (last.compareDocumentPosition(output_element) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    last = output_element;
                }
            }
            return { first, last };
        }
    }


    // === COMMAND HANDLER INTERFACE ===

    /** return the initial key map bindings
     *  @return {Object} mapping from command strings to arrays of triggering key sequences
     */
    static get_initial_key_map_bindings() {
        const key_map_bindings = super.get_initial_key_map_bindings();
        return {
            ...key_map_bindings,

            'eval': [ 'CmdOrCtrl-Enter' ],
        };
    }

    /** return command bindings for this cell
     *  @return {Object} mapping from command strings to functions implementing that command
     */
    get_command_bindings() {
        const command_bindings = super.get_command_bindings();
        return {
            ...command_bindings,

            'eval':                this.command_handler__eval.bind(this),

            'set-mode-markdown':   this.command_handler__set_mode_markdown.bind(this),
            'set-mode-tex':        this.command_handler__set_mode_tex.bind(this),
            'set-mode-javascript': this.command_handler__set_mode_javascript.bind(this),
        };
    }


    // === COMMAND HANDLERS ===

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__eval(command_context) {
        await this.eval({
            eval_context: _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.global_eval_context,
        });
        return true;
    }

    command_handler__set_mode_markdown(command_context) {
        this.input_type = 'markdown';
        return true;
    }
    command_handler__set_mode_tex(command_context) {
        this.input_type = 'tex';
        return true;
    }
    command_handler__set_mode_javascript(command_context) {
        this.input_type = 'javascript';
        return true;
    }


    // === INTERNAL ===

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        // Error when using the "extends" property on Chromium 112.0.5615.49:
        //     caught DOMException: Failed to execute 'define' on 'CustomElementRegistry': "eval-cell" is a valid custom element name at EvalCellElement._init_static
        // This is probably correct.  The documentation for customElements.define() states:
        //     extends: String specifying the name of a built-in element to extend.
        // built-in element, not custom element
        const options = {
            //!!! extends: EditorCellElement.custom_element_name,
        };
        globalThis.customElements.define(this.custom_element_name, this, options);
        //!!! should we assume that the document is ready here?
        (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_stylesheet_link */ .KP)(document.head, new URL('style.css', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_5__/* .assets_server_url */ .h)(current_script_url)));
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
EvalCellElement._init_static();

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 9026:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   P: () => (/* binding */ get_evaluator_classes),
/* harmony export */   v: () => (/* reexport safe */ _evaluator_js__WEBPACK_IMPORTED_MODULE_0__.v)
/* harmony export */ });
/* harmony import */ var _evaluator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9728);
/* harmony import */ var _markdown_evaluator_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6257);
/* harmony import */ var _tex_evaluator_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4687);
/* harmony import */ var _javascript_evaluator_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6781);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_evaluator_js__WEBPACK_IMPORTED_MODULE_0__, _markdown_evaluator_js__WEBPACK_IMPORTED_MODULE_1__, _tex_evaluator_js__WEBPACK_IMPORTED_MODULE_2__, _javascript_evaluator_js__WEBPACK_IMPORTED_MODULE_3__]);
([_evaluator_js__WEBPACK_IMPORTED_MODULE_0__, _markdown_evaluator_js__WEBPACK_IMPORTED_MODULE_1__, _tex_evaluator_js__WEBPACK_IMPORTED_MODULE_2__, _javascript_evaluator_js__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
// Evaluator is defined in a separate file to break dependency cycle in get_evaluator_classes()






/** return an array of all known evaluator classes, with the first entry being considered as the "default"
 *  @return {String[]} array of evaluator classes
 */
function get_evaluator_classes() {
    return [
        _markdown_evaluator_js__WEBPACK_IMPORTED_MODULE_1__/* .MarkdownEvaluator */ .I,  // first entry is the default
        _tex_evaluator_js__WEBPACK_IMPORTED_MODULE_2__/* .TeXEvaluator */ .F,
        _javascript_evaluator_js__WEBPACK_IMPORTED_MODULE_3__/* .JavaScriptEvaluator */ .J,
    ];
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 9728:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   v: () => (/* binding */ Evaluator)
/* harmony export */ });
/* harmony import */ var _lib_sys_uuid_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1896);
/* harmony import */ var _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4429);
/* harmony import */ var _output_context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(266);
/* harmony import */ var _js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9026);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_output_context_js__WEBPACK_IMPORTED_MODULE_0__, _js__WEBPACK_IMPORTED_MODULE_1__]);
([_output_context_js__WEBPACK_IMPORTED_MODULE_0__, _js__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);









class Evaluator extends _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_2__/* .StoppableObjectsManager */ .T {
    /** Call this function instead of constructing an instance with new.
     *  @param {HTMLElement} input_element the source element
     *  @param {HTMLElement} output_element the destination element
     *  @param {undefined|null|Object} eval_context, default {}
     *  @return {Promise} resolves to the new instance after its
     *          _perform_eval method resolves.  Note that the return
     *          of the _perform_eval method does not necessarily mean
     *          that the evaluation is "done".
     * If an object is passed as eval_context, then that object may be modified
     * as a result of the evaluation.  This is the basis for persistence of
     * state across evaluations.
     */
    static async eval(input_element, output_element, eval_context=null) {
        const instance = new this(input_element, output_element, eval_context);
        return instance._perform_eval()
            .catch(error => instance.output_context.invoke_renderer_for_type('error', error));
    }

    // do not call the constructor via new, instead use the static async method Evaluator.eval()
    constructor(input_element, output_element, eval_context) {
        super();
        if (!(input_element instanceof HTMLElement)) {
            throw new Error('input_element must be an instance of HTMLElement');
        }
        if (!(output_element instanceof HTMLElement)) {
            throw new Error('output_element must be an instance of HTMLElement');
        }

        eval_context ??= {};
        if (typeof eval_context !== 'object') {
            throw new Error('eval_context must be undefined, null, or an object');
        }

        const output_context = new _output_context_js__WEBPACK_IMPORTED_MODULE_0__/* .OutputContext */ .l(output_element);

        Object.defineProperties(this, {
            id: {
                value: (0,_lib_sys_uuid_js__WEBPACK_IMPORTED_MODULE_3__/* .generate_uuid */ .kE)(),
                enumerable: true,
            },
            input_element: {
                value: input_element,
                enumerable: true,
            },
            output_element: {
                value: output_element,
                enumerable: true,
            },
            eval_context: {
                value: eval_context,
                enumerable: true,
            },
            output_context: {
                value: output_context,
                enumerable: true,
            },
        });
    }

    async _perform_eval() {
        // to be implemented by subclasses
        // exceptions thrown out of this function will be handled in this.constructor.eval()
        throw new Error('NOT UNIMPLEMENTED');
    }


    // === RECOGNIZER ===

    /** array of input_type strings for input types handled by this evaluator
     *  must be overridden in subclasses
     */
    static handled_input_types = [];

    /** return an evauluator class for a given input_element
     *  @param {Element} input_element
     *  @return {Class} evaluator class
     */
    static class_for_content(input_element) {
        if (!(input_element instanceof Element)) {
            throw new Error('input_element must be an instance of Element');
        }

        const evaluator_classes = (0,_js__WEBPACK_IMPORTED_MODULE_1__/* .get_evaluator_classes */ .P)();

        const default_evaluator_class = evaluator_classes[0];

        // check if there is an evaluator that handles the input_element input_type
        const input_type = input_element.input_type;
        if (input_type) {
            // use the first evaluator that handles a specifically-set
            // input_type on the input_element
            for (const evaluator_class of evaluator_classes) {
                if (evaluator_class.handled_input_types.includes(input_type)) {
                    return evaluator_class;
                }
            }
        }

        return default_evaluator_class;
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 6781:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   J: () => (/* binding */ JavaScriptEvaluator)
/* harmony export */ });
/* harmony import */ var _evaluator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9728);
/* harmony import */ var _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4429);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_evaluator_js__WEBPACK_IMPORTED_MODULE_0__]);
_evaluator_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];





class JavaScriptEvaluator extends _evaluator_js__WEBPACK_IMPORTED_MODULE_0__/* .Evaluator */ .v {
    static handled_input_types = [
        'javascript',
    ];

    async _perform_eval() {
        const options = {
            style:  undefined,//!!!
            eval_context: this.eval_context,
        };
        const renderer = this.output_context.renderer_for_type('javascript');
        this.add_stoppable(new _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_1__/* .Stoppable */ .X(renderer));
        return this.output_context.invoke_renderer(renderer, this.input_element.innerText, options);
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 6257:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   I: () => (/* binding */ MarkdownEvaluator)
/* harmony export */ });
/* harmony import */ var _evaluator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9728);
/* harmony import */ var _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4429);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_evaluator_js__WEBPACK_IMPORTED_MODULE_0__]);
_evaluator_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];





class MarkdownEvaluator extends _evaluator_js__WEBPACK_IMPORTED_MODULE_0__/* .Evaluator */ .v {
    static handled_input_types = [
        'markdown',
    ];

    async _perform_eval() {
        const options = {
            //!!!
        };
        const renderer = this.output_context.renderer_for_type('markdown');
        this.add_stoppable(new _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_1__/* .Stoppable */ .X(renderer));
        return this.output_context.invoke_renderer(renderer, this.input_element.innerText, options);
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 4687:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F: () => (/* binding */ TeXEvaluator)
/* harmony export */ });
/* harmony import */ var _evaluator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9728);
/* harmony import */ var _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4429);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_evaluator_js__WEBPACK_IMPORTED_MODULE_0__]);
_evaluator_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];





class TeXEvaluator extends _evaluator_js__WEBPACK_IMPORTED_MODULE_0__/* .Evaluator */ .v {
    static handled_input_types = [
        'tex',
    ];

    async _perform_eval() {
        const options = {
            style:  undefined,//!!!
            inline: false,//!!!
            rtl:    false,//!!!
        };
        const renderer = this.output_context.renderer_for_type('tex');
        this.add_stoppable(new _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_1__/* .Stoppable */ .X(renderer));
        return this.output_context.invoke_renderer(renderer, this.input_element.innerText, options);
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 7027:
/***/ ((__webpack_module__, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony import */ var _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6179);
/* harmony import */ var _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(53);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_eval_cell_element_js__WEBPACK_IMPORTED_MODULE_0__, _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__]);
([_eval_cell_element_js__WEBPACK_IMPORTED_MODULE_0__, _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);





_logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.initialize();

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 53:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   N: () => (/* binding */ logbook_manager)
/* harmony export */ });
/* harmony import */ var _editor_cell_element_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3088);
/* harmony import */ var _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6179);
/* harmony import */ var _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3653);
/* harmony import */ var _lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6092);
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(984);
/* harmony import */ var _lib_ui_menu_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(3231);
/* harmony import */ var _lib_ui_change_manager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(3688);
/* harmony import */ var _lib_sys_fs_interface_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(345);
/* harmony import */ var _settings_dialog_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(9713);
/* harmony import */ var _lib_ui_beep_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(1951);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(6973);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_editor_cell_element_js__WEBPACK_IMPORTED_MODULE_0__, _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__, _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_2__, _lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_3__, _lib_ui_menu_js__WEBPACK_IMPORTED_MODULE_5__, _lib_ui_change_manager_js__WEBPACK_IMPORTED_MODULE_6__, _settings_dialog_js__WEBPACK_IMPORTED_MODULE_8__]);
([_editor_cell_element_js__WEBPACK_IMPORTED_MODULE_0__, _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__, _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_2__, _lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_3__, _lib_ui_menu_js__WEBPACK_IMPORTED_MODULE_5__, _lib_ui_change_manager_js__WEBPACK_IMPORTED_MODULE_6__, _settings_dialog_js__WEBPACK_IMPORTED_MODULE_8__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
const current_script_url = "file:///home/ed/code/logbook/src/logbook-manager.js";  // save for later
























// Note: Each eval-cell maintains its own key_event_manager and key maps.
// Therefore the (active) eval-cell is the locus for incoming commands,
// whether from the menu or the keyboard.  The eval-cell in effect "precompiles"
// command dispatch in eval_cell.get_command_bindings().


class LogbookManager {
    constructor() {
        this.#editable = false;
        this.#active_cell = null;
        this.#initialize_called = false;
        this.reset_global_eval_context();
        this.#eval_states = new _lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_3__/* .Subscribable */ .l();
        //!!! this.#eval_states_subscription is never unsubscribed
        this.#eval_states_subscription = this.#eval_states.subscribe(this.#eval_states_observer.bind(this));

    }
    #editable;
    #active_cell;
    #initialize_called;
    #controls_element;  // element inserted into document by initialize() to hold menus, etc
    #content_element;   // element wrapped around original body content by initialize()
    #eval_states;
    #eval_states_subscription;
    #menubar;
    #menubar_commands_subscription;
    #menubar_selects_subscription;
    #tool_bar;
    #global_eval_context;  // persistent eval_context for eval commands
    #global_change_manager;
    #file_handle;

    get editable (){ return this.#editable }

    set_editable(editable) {
        editable = !!editable;
        this.#editable = editable;
        this.#menubar.set_menu_state('toggle-editable', { checked: editable });
        this.#tool_bar.set_for('editable', editable);
        for (const cell of this.constructor.get_cells()) {
            cell.set_editable(editable);
        }
    }

    get active_cell (){ return this.#active_cell; }
    set_active_cell(cell) {
        this.#active_cell = (cell ?? null);
        for (const cell of this.constructor.get_cells()) {
            cell.set_active(cell === this.active_cell);
        }
    }

    get controls_element (){ return this.#controls_element; }
    get content_element  (){ return this.#content_element; }

    get global_eval_context (){ return this.#global_eval_context; }
    reset_global_eval_context() {
        this.#global_eval_context = {};
    }

    /** reset the document, meaning that all cells will be reset,
     *  and this.global_eval_context will be reset.  Also,
     *  the saved file handle this.#file_handle set to undefined.
     *  @return {LogbookManager} this
     */
    reset() {
        for (const cell of this.constructor.get_cells()) {
            cell.reset();
        }
        this.reset_global_eval_context();
        this.#file_handle = undefined;
        return this;
    }

    /** clear the current document
     */
    clear() {
        (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_4__/* .clear_element */ .gX)(this.content_element);
        const first_cell = this.create_cell();
        first_cell.focus();
    }

    stop() {
        for (const cell of this.constructor.get_cells()) {
            cell.stop();
        }
    }

    initialize() {
        if (this.#initialize_called) {
            throw new Error('initialize() called more than once');
        }
        this.#initialize_called = true;

        try {

            // establish this.#content_element / this.content_element
            this.#initialize_document_structure();

            // add top-level stylesheets
            const server_url = (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_9__/* .assets_server_url */ .h)(current_script_url);
            (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_4__/* .create_stylesheet_link */ .KP)(document.head, new URL('style.css',       server_url));
            (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_4__/* .create_stylesheet_link */ .KP)(document.head, new URL('style-hacks.css', server_url));

            this.#setup_csp();
            this.#setup_controls();

            // validate structure of document
            const cells = this.constructor.get_cells();
            if (cells.length > 0) {
                //!!! improve this !!!
            }

            // set up active cell
            // ... find the first incoming "active" cell, or the first cell, or create a new cell
            const active_cell = cells.find(cell => cell.active) ?? cells[0] ?? this.create_cell();
            this.set_active_cell(active_cell);  // also resets "active" tool on all cells except for active_cell
            active_cell.focus();

            this.set_editable(this.editable);  // update all cells consistently

            // Set up this.#global_change_manager now so that it is available
            // during initialization of cells.  It will be reset when document
            // initialization is complete.
document.body.innerText;//!!! force layout
            this.#global_change_manager = new _lib_ui_change_manager_js__WEBPACK_IMPORTED_MODULE_6__/* .ChangeManager */ .a(this.content_element, {
                neutral_changes_observer: this.#neutral_changes_observer.bind(this),
            });

            // add "save before quit" prompt for when document is being closed while modified
            window.addEventListener('beforeunload', (event) => {
                if (!this.#global_change_manager.is_neutral) {
                    event.preventDefault();
                    return (event.returnValue = '');
                }
            });  //!!! event handler never removed


            // set baseline for undo/redo
            // it is important that all async operations have finished before getting here
            this.#global_change_manager.set_neutral();

        } catch (error) {

            (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_4__/* .show_initialization_failed */ .Ru)(error);

        }
    }

    /** create a new cell in the document
     *  @param (Object|null|undefined} options
     *  @return {EvalCellElement} cell
     * options is passed to EvalCellElement.create_cell() but
     * with parent overridden to this.content_element.
     */
    create_cell(options=null) {
        return _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__/* .EvalCellElement */ .p.create_cell({
            ...(options ?? {}),
            parent: this.content_element,
        });
    }

    /** return an ordered list of the cells in the document
     *  @return {Array} all cells in the document
     */
    static get_cells() {
        return [
            ...document.getElementsByTagName(_editor_cell_element_js__WEBPACK_IMPORTED_MODULE_0__/* .EditorCellElement */ .W.custom_element_name),
            ...document.getElementsByTagName(_eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__/* .EvalCellElement */ .p.custom_element_name),
        ];
    }


    // === DOCUMENT UTILITIES ===

    static controls_element_id = 'controls';
    static content_element_id  = 'content';

    // put everything this the body into a top-level content element
    #initialize_document_structure() {
        if (document.getElementById(this.constructor.controls_element_id)) {
            throw new Error(`bad format for document: element with id ${this.constructor.controls_element_id} already exists`);
        }
        if (document.getElementById(this.constructor.content_element_id)) {
            throw new Error(`bad format for document: element with id ${this.constructor.content_element_id} already exists`);
        }
        // establish body element if not already present
        if (!document.body) {
            document.documentElement.appendChild(document.createElement('body'));
            // document.body is now set
        }
        // create the content element and move the current children of the body to it
        this.#content_element = document.createElement('div');
        this.#content_element.id = this.constructor.content_element_id;
        while (document.body.firstChild) {
            this.#content_element.appendChild(document.body.firstChild);  // moves document.body.firstChild
        }
        // create controls element
        this.#controls_element = document.createElement('div');
        this.#controls_element.id = this.constructor.controls_element_id;
        // add controls and content elements
        document.body.appendChild(this.#controls_element);
        document.body.appendChild(this.#content_element);

        // add a tool-bar element to each pre-existing cell
        for (const cell of this.constructor.get_cells()) {
            cell.establish_tool_bar();
            // the following will establish the event handlers for cell
            const current_output_element = cell.output_element;
            cell.output_element = null;
            cell.output_element = current_output_element;
        }
    }
    #assets_server_root;
    #local_server_root;

    #save_serializer() {
        const queried_content_element = document.getElementById(this.constructor.content_element_id);
        if (!queried_content_element || queried_content_element !== this.content_element) {
            throw new Error('bad format for document');
        }
        const contents = [ ...this.content_element?.querySelectorAll(`${_eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__/* .EvalCellElement */ .p.custom_element_name}, .${_eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__/* .EvalCellElement */ .p.output_element_class}`) ]
              .map(e => e.outerHTML)
              .join('\n');
        return `\
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <script type="module" src="../src/init.js"></script>
</head>
<body>
${contents}
</body>
</html>
`;
}

    #setup_csp() {
        if (false) {}
    }

    get_suggested_file_name() {
        return window.location.pathname.split('/').slice(-1)[0];
    }


    // === MENU AND COMMAND CONFIGURATION ===

    update_menu_state() {
        const cells        = this.constructor.get_cells();
        const active_cell  = this.active_cell;
        const active_index = cells.indexOf(active_cell);
        const can_undo     = this.#global_change_manager.can_perform_undo;
        const can_redo     = this.#global_change_manager.can_perform_redo;
/*
'toggle-editable'  // directly handled in this.set_editable()
'save'  // directly handled in this.#neutral_changes_observer()
*/
        this.#menubar.set_menu_state('undo', { enabled: can_undo });
        this.#menubar.set_menu_state('redo', { enabled: can_redo });

        this.#menubar.set_menu_state('toggle-cell-visible', { checked: active_cell?.visible });

        this.#menubar.set_menu_state('focus-up',   { enabled: (active_cell && active_index > 0) });
        this.#menubar.set_menu_state('focus-down', { enabled: (active_cell && active_index < cells.length-1) });
        this.#menubar.set_menu_state('move-up',    { enabled: (active_cell && active_index > 0) });
        this.#menubar.set_menu_state('move-down',  { enabled: (active_cell && active_index < cells.length-1) });
        this.#menubar.set_menu_state('delete',     { enabled: !!active_cell });

        this.#menubar.set_menu_state('eval-and-refocus', { enabled: !!active_cell });
        this.#menubar.set_menu_state('eval',             { enabled: !!active_cell });
        this.#menubar.set_menu_state('eval-before',      { enabled: !!active_cell });
        this.#menubar.set_menu_state('eval-all',         { enabled: !!active_cell });
        this.#menubar.set_menu_state('stop',             { enabled: active_cell?.can_stop });
        this.#menubar.set_menu_state('stop-all',         { enabled: cells.some(cell => cell.can_stop) });
/*
recents
*/
        //!!!
    }

    #setup_controls() {
        if (!this.controls_element) {
            throw new Error(`bad format for document: controls element does not exist`);
        }
        const get_command_bindings = () => _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__/* .EvalCellElement */ .p.get_initial_key_map_bindings();
        const get_recents = null;//!!! implement this
        this.#menubar = _lib_ui_menu_js__WEBPACK_IMPORTED_MODULE_5__/* .MenuBar */ .j.create(this.controls_element, this.constructor.#get_menubar_spec(), get_command_bindings, get_recents);
        //!!! this.#menubar_commands_subscription is never unsubscribed
        this.#menubar_commands_subscription = this.#menubar.commands.subscribe(this.#menubar_commands_observer.bind(this));
        //!!! this.#menubar_selects_subscription is never unsubscribed
        this.#menubar_selects_subscription = this.#menubar.selects.subscribe(this.update_menu_state.bind(this));

        // add a tool-bar element to the main document
        this.#tool_bar = _tool_bar_element_js__WEBPACK_IMPORTED_MODULE_2__/* .ToolBarElement */ .d.create_for(this.controls_element, {
            editable: { initial: this.editable,  on: (event) => this.set_editable(event.target.get_state()) },
            //!!!autoeval: { initial: this.autoeval,  on: (event) => this.set_autoeval(!this.autoeval) },//!!!
            modified: true,
            running:  true,
        });
        this.#controls_element.appendChild(this.#tool_bar);
    }

    #menubar_commands_observer(command_context) {
        const target = this.active_cell;
        if (!target) {
            (0,_lib_ui_beep_js__WEBPACK_IMPORTED_MODULE_10__/* .beep */ .V)();
        } else if (!(target instanceof _editor_cell_element_js__WEBPACK_IMPORTED_MODULE_0__/* .EditorCellElement */ .W)) {
            (0,_lib_ui_beep_js__WEBPACK_IMPORTED_MODULE_10__/* .beep */ .V)();
        } else {
            // set target in command_context to be the active cell
            const updated_command_context = {
                ...command_context,
                target,
            };
            target.perform_command(updated_command_context);
        }
    }

    static #get_menubar_spec() {
        return [
            { label: 'File', collection: [
                { label: 'Recent logbooks', id: 'recents', collection: [
                    // ...
                ] },
                '---',
                { label: 'Reset cells',    item: { command: 'reset',               } },
                { label: 'Clear document', item: { command: 'clear',               } },
                '---',
                { label: 'Editable',       item: { command: 'toggle-editable',     }, id: 'toggle-editable' },
                '---',
                { label: 'Save',           item: { command: 'save',                }, id: 'save' },
                { label: 'Save as...',     item: { command: 'save-as',             } },
                '---',
                { label: 'Settings...',    item: { command: 'settings',            } },
            ] },

            { label: 'Edit', collection: [
                { label: 'Undo',           item: { command: 'undo',                }, id: 'undo' },
                { label: 'Redo',           item: { command: 'redo',                }, id: 'redo' },
            ] },

            { label: 'Cell', collection: [
                { label: 'Eval',           item: { command: 'eval-and-refocus',    }, id: 'eval-and-refocus' },
                { label: 'Eval and stay',  item: { command: 'eval',                }, id: 'eval' },
                { label: 'Eval before',    item: { command: 'eval-before',         }, id: 'eval-before' },
                { label: 'Eval all',       item: { command: 'eval-all',            }, id: 'eval-all' },
                '---',
                { label: 'Stop cell',      item: { command: 'stop',                }, id: 'stop' },
                { label: 'Stop all',       item: { command: 'stop-all',            }, id: 'stop-all' },
                '---',
                { label: 'Reset cell',     item: { command: 'reset-cell',          } },
                { label: 'Visible',        item: { command: 'toggle-cell-visible', }, id: 'toggle-cell-visible' },
                '---',
                { label: 'Focus up',       item: { command: 'focus-up',            }, id: 'focus-up' },
                { label: 'Focus down',     item: { command: 'focus-down',          }, id: 'focus-down' },
                '---',
                { label: 'Move up',        item: { command: 'move-up',             }, id: 'move-up' },
                { label: 'Move down',      item: { command: 'move-down',           }, id: 'move-down' },
                { label: 'Add before',     item: { command: 'add-before',          } },
                { label: 'Add after',      item: { command: 'add-after',           } },
                { label: 'Delete',         item: { command: 'delete',              }, id: 'delete' },
            ] },

            { label: 'Help', collection: [
                { label: 'Help...',        item: { command: 'help',                } },
            ] },
        ];
    }

    /** return the initial key map bindings
     *  @return {Object} mapping from command strings to arrays of triggering key sequences
     */
    static get_global_initial_key_map_bindings() {
        return {
            'create-cell':         [ 'CmdOrCtrl-Shift-Alt-N' ],

            'reset':               [ ],
            'clear':               [ ],

            'save':                [ 'CmdOrCtrl-S' ],
            'save-as':             [ 'CmdOrCtrl-Shift-S' ],

            'settings':            [ 'CmdOrCtrl-,' ],

            'eval-and-refocus':    [ 'Shift-Enter' ],
            'eval-before':         [ 'CmdOrCtrl-Shift-Enter' ],
            'eval-all':            [ 'CmdOrCtrl-Shift-Alt-Enter' ],

            'stop':                [ 'CmdOrCtrl-Alt-!' ],
            'stop-all':            [ 'CmdOrCtrl-Shift-Alt-!' ],

            'focus-up':            [ 'Alt-Up' ],
            'focus-down':          [ 'Alt-Down' ],

            'move-up':             [ 'CmdOrCtrl-Alt-Up' ],
            'move-down':           [ 'CmdOrCtrl-Alt-Down' ],
            'add-before':          [ 'CmdOrCtrl-Alt-Shift-Up' ],
            'add-after':           [ 'CmdOrCtrl-Alt-Shift-Down' ],
            'delete':              [ 'CmdOrCtrl-Alt-Backspace' ],

            'set-mode-markdown':   [ 'Alt-M m' ],
            'set-mode-tex':        [ 'Alt-M t' ],
            'set-mode-javascript': [ 'Alt-M j' ],

            'toggle-cell-visible': [ 'Alt-M v' ],
            'toggle-editable':     [ 'Alt-M e' ],

            'undo':                [ 'CmdOrCtrl-Z' ],
            'redo':                [ 'CmdOrCtrl-Shift-Z' ],
        };
    }

    /** return global command bindings
     *  @return {Object} mapping from command strings to functions implementing that command
     * The bindings are obtained by merging local command bindings with logbook_manager
     * command bindings.
     */
    get_global_command_bindings() {
        const command_bindings = {
            'create-cell':      this.command_handler__create_cell.bind(this),

            'reset':            this.command_handler__reset.bind(this),
            'clear':            this.command_handler__clear.bind(this),

            'save':             this.command_handler__save.bind(this),
            'save-as':          this.command_handler__save_as.bind(this),

            'settings':         this.command_handler__show_settings_dialog.bind(this),

            'eval-and-refocus': this.command_handler__eval_and_refocus.bind(this),
            'eval-before':      this.command_handler__eval_before.bind(this),
            'eval-all':         this.command_handler__eval_all.bind(this),

            'stop':             this.command_handler__stop.bind(this),
            'stop-all':         this.command_handler__stop_all.bind(this),

            'focus-up':         this.command_handler__focus_up.bind(this),
            'focus-down':       this.command_handler__focus_down.bind(this),

            'move-up':          this.command_handler__move_up.bind(this),
            'move-down':        this.command_handler__move_down.bind(this),
            'add-before':       this.command_handler__add_before.bind(this),
            'add-after':        this.command_handler__add_after.bind(this),
            'delete':           this.command_handler__delete.bind(this),

            'toggle-editable':  this.command_handler__toggle_editable.bind(this),

            'undo':             this.command_handler__undo.bind(this),
            'redo':             this.command_handler__redo.bind(this),
        };

        return command_bindings;
    }


    // === NEUTRAL CHANGES OBSERVER ===

    #neutral_changes_observer(data) {
        const {
            is_neutral,
        } = data;
        this.#tool_bar.set_for('modified', !is_neutral);
        this.#menubar.set_menu_state('save', { checked: !is_neutral });
    }


    // === EVAL STATES ===

    emit_eval_state(cell, eval_state) {
        this.#eval_states.dispatch({ cell, eval_state });
    }

    #eval_states_observer(data) {
        // data is ignored
        const {
            cell,
            eval_state,
        } = data;
        const something_foreground = this.constructor.get_cells().some(cell => cell.evaluator_foreground);
        this.#tool_bar.set_for('running', something_foreground);
    }


    // === COMMAND HANDLERS ===

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__create_cell(command_context) {
        let before = null;
        const next_cell = command_context.target?.adjacent_cell?.(true);
        if (next_cell) {
            before = next_cell.get_dom_extent().first;
        }
        const cell = this.create_cell({ before });
        if (!cell) {
            return false;
        } else {
            cell.focus();
            return true;
        }
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__reset(command_context) {
        this.reset();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__clear(command_context) {
        this.clear();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__save(command_context) {
        const save_result = await _lib_sys_fs_interface_js__WEBPACK_IMPORTED_MODULE_7__/* .fs_interface */ .H.save(this.#save_serializer.bind(this), {
            file_handle: this.#file_handle,
            prompt_options: {
                suggestedName: this.get_suggested_file_name(),//!!!
            },
        });
        const {
            canceled,
            file_handle,
            stats,
        } = save_result;
        if (!canceled) {
            //!!!
            this.#file_handle = file_handle ?? undefined;
            this.#global_change_manager.set_neutral();
        }
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__save_as(command_context) {
        this.#file_handle = undefined;
        await _lib_sys_fs_interface_js__WEBPACK_IMPORTED_MODULE_7__/* .fs_interface */ .H.save(this.#save_serializer.bind(this), {
            prompt_options: {
                suggestedName: this.get_suggested_file_name(),//!!!
            },
        });
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__show_settings_dialog(command_context) {
        _settings_dialog_js__WEBPACK_IMPORTED_MODULE_8__/* .SettingsDialog */ .D.run();
        return true;
    }

    /** eval target cell and refocus to next cell (or a new one if at the end of the document)
     *  @return {Boolean} true iff command successfully handled
     */
    async command_handler__eval_and_refocus(command_context) {
        const cell = command_context.target;
        if (!cell || !(cell instanceof _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__/* .EvalCellElement */ .p)) {
            return false;
        } else {
            await cell.eval({
                eval_context: this.global_eval_context,
            });
            const next_cell = cell.adjacent_cell(true) ?? this.create_cell();
            next_cell.focus();
            return true;
        }
    }

    /** reset this.global_eval_context and then eval all cells in the document
     *  from the beginning up to but not including the target cell.
     *  @return {Boolean} true iff command successfully handled
     */
    async command_handler__eval_before(command_context) {
        const cell = command_context.target;
        if (!cell || !(cell instanceof _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__/* .EvalCellElement */ .p)) {
            return false;
        } else {
            this.reset_global_eval_context();
            for (const iter_cell of this.constructor.get_cells()) {
                if (iter_cell === cell) {
                    break;
                }
                await iter_cell.eval({
                    eval_context: this.global_eval_context,
                });
            }
            return true;
        }
    }

    /** stop all running evaluations, reset this.global_eval_context and then eval all cells in the document
     *  from first to last, and set focus to the last.
     *  @return {Boolean} true iff command successfully handled
     */
    async command_handler__eval_all(command_context) {
        const cell = command_context.target;
        if (!cell || !(cell instanceof _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__/* .EvalCellElement */ .p)) {
            return false;
        } else {
            this.stop();
            this.reset_global_eval_context();
            let final_cell;
            for (const iter_cell of this.constructor.get_cells()) {
                await iter_cell.eval({
                    eval_context: this.global_eval_context,
                });
                final_cell = iter_cell;
            }
            final_cell.focus();
            return true;
        }
    }

    /** stop evaluation for the active cell.
     *  @return {Boolean} true iff command successfully handled
     */
    command_handler__stop(command_context) {
        const cell = command_context.target;
        if (!cell || !(cell instanceof _eval_cell_element_js__WEBPACK_IMPORTED_MODULE_1__/* .EvalCellElement */ .p)) {
            return false;
        } else {
            cell.stop();
            return true;
        }
    }

    /** stop all running evaluations.
     *  @return {Boolean} true iff command successfully handled
     */
    command_handler__stop_all(command_context) {
        this.stop();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__focus_up(command_context) {
        const focus_cell = command_context.target.adjacent_cell(false);
        if (!focus_cell) {
            return false;
        } else {
            focus_cell.focus();
            return true;
        }
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__focus_down(command_context) {
        const focus_cell = command_context.target.adjacent_cell(true);
        if (!focus_cell) {
            return false;
        } else {
            focus_cell.focus();
            return true;
        }
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__move_up(command_context) {
        const cell = command_context.target;
        if (!cell) {
            return false;
        } else {
            const previous = cell.adjacent_cell(false);
            if (!previous) {
                return false;
            } else {
                cell.move_cell({
                    before: previous.get_dom_extent().first,
                });
                cell.focus();
                return true;
            }
        }
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__move_down(command_context) {
        const cell = command_context.target;
        if (!cell) {
            return false;
        } else {
            const next = cell.adjacent_cell(true);
            if (!next) {
                return false;
            } else {
                cell.move_cell({
                    before: next.get_dom_extent().last.nextSibling,
                    parent: cell.parentElement,  // necessary if before is null
                });
                cell.focus();
                return true;
            }
        }
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__add_before(command_context) {
        const cell = command_context.target;
        const new_cell = this.create_cell({
            before: cell.get_dom_extent().first,
        });
        new_cell.focus();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__add_after(command_context) {
        const cell = command_context.target;
        const new_cell = this.create_cell({
            before: cell.get_dom_extent().last.nextSibling,
            parent: cell.parentElement,  // necessary if before is null
        });
        new_cell.focus();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__delete(command_context) {
        const cell = command_context.target;
        let next_cell = cell.adjacent_cell(true) ?? cell.adjacent_cell(false);
        cell.remove_cell();
        if (!next_cell) {
            next_cell = this.create_cell();
        }
        next_cell.focus();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__toggle_editable(command_context) {
        this.set_editable(!this.editable);
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__undo(command_context) {
        return this.#global_change_manager?.perform_undo();
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__redo(command_context) {
        return this.#global_change_manager?.perform_redo();
    }
}


const logbook_manager = new LogbookManager();
globalThis.logbook_manager = logbook_manager;//!!!

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 266:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   l: () => (/* binding */ OutputContext)
/* harmony export */ });
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4571);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_renderer_js__WEBPACK_IMPORTED_MODULE_1__]);
_renderer_js__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];





class OutputContext {
    constructor(element) {
        if (!(element instanceof HTMLElement)) {
            throw new Error('element must be an instance of HTMLElement');
        }
        Object.defineProperties(this, {
            element: {
                value: element,
                enumerable: true,
            },
        });
    }

    // === STATIC METHODS ===

    static get_svg_string(svg_node) {
        const serializer = new XMLSerializer();
        let svg_string = serializer.serializeToString(svg_node);
        svg_string = svg_string.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink=');  // fix root xlink without namespace
        svg_string = svg_string.replace(/NS\d+:href/g, 'xlink:href');  // Safari NS namespace fix
        return svg_string;
    }

    /** remove all child elements and nodes of element
     *  @param {HTMLElement} element
     *  @return {HTMLElement} element
     */
    static clear_element(element) {
        return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .clear_element */ .gX)(element);
    }

    /** scroll element into view
     *  @param {Element} element
     *  @return {Element} element
     */
    static scroll_element_into_view(element) {
        return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .scroll_element_into_view */ .v0)(element);  // from dom-util.js
    }

    /** set attributes on an element which are taken from an object.
     *  @param {Element} element
     *  @param {Object|undefined|null} attrs
     *  @return {Element} element
     *  Attribute values obtained by calling toString() on the values in attrs
     *  except that values which are undefined are translated to ''.
     */
    static set_element_attrs(element, attrs) {
        return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .set_element_attrs */ .Dz)(element, attrs);  // from dom-util.js
    }

    /** add/remove style properties on element
     *  @param {HTMLElement} element
     *  @param {Object} spec collection of properties to add or remove.
     *                  If the value of an entry is null or undefined, then
     *                  the corresponding property is removed.  If the value
     *                  of an entry is null, then the property is removed.
     *                  If the value of an entry is undefined, then that
     *                  entry is ignored.  Otherwise, the value of the
     *                  corresponding property is set.
     *  @return {HTMLElement} element
     */
    static update_element_style(element, spec) {
        return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .update_element_style */ .Hp)(element, spec);  // from dom-util.js
    }

    /** create a new child element of the given element with the given characteristics
     *  @param {Object|undefined|null} options: {
     *      before?:    Node|null,  // sibling node before which to insert; append if null or undefined
     *      tag?:       string,     // tag name for new element; default: 'div'
     *      namespace?: string,     // namespace for new element creation
     *      attrs?:     object,     // attributes to set on new element
     *      style?:     object,     // style properties for new element
     *  }
     *  @return {HTMLElement} the new element
     * A unique id will be assigned to the element unless that element already has an id attribute
     * specified (in attrs).
     * The before node, if specified, must have a parent that must match parent if parent is specified.
     * If neither parent nor before is specified, the new element will have no parent.
     * Warning: '!important' in style specifications does not work!  (Should use priority method.)
     */
    static create_element_child(element, options=null) {
        return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({ parent: element, ...(options ?? {}) });  // from dom-util.js
    }

    /** create or update a child text node of the given element
     *  @param {HTMLElement} element
     *  @param {any} text to be contained in the new text node
     *  @param {Object|undefined|null} options: {
     *             before?: null|Node,  // child node or element before which to insert; append if null or undefined
     *             prevent_coalesce_next?: boolean,
     *         }
     *  @return {Node|null} the new or modified text node, or null if the converted text is ''
     *
     * Text will be converted to a string (if not already a string).  A text value
     * of null or undefined is equivalent to ''.
     *
     * The text will be coalesced into the immediately previous text node, if any.
     * Otherwise, if the next node is a text node the text will be coealesced
     * into the beginning text of it unless options.prevent_coalesce_next.
     * options.prevent_coalesce_next makes sure that the same options.before
     * node can be used repeatedly with the expected results.  However,
     * options.prevent_coalesce_next may leave element non-normalized.
     * On the other hand, if !options.prevent_coalesce_next, the element
     * will not become non-normalized (but may be non-normalized if it
     * already was).
     */
    static create_element_child_text_node(element, text, options=null) {
        return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element_child_text_node */ .Xc)(element, text, options);  // from dom-util.js
    }

    /** normalize the text node children of element, meaning that text nodes
     *  are non-empty and no text nodes are adjacent.
     *  @param {Element} element
     *  @return {Element} element
     */
    static normalize_element_text(element) {
        return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalize_element_text */ .rb)(element);  // from dom-util.js
    }


    // === INSTANCE METHODS ===

    /** remove all child elements and nodes of this.element via this.constructor.clear_element()
     *  @return this
     */
    clear() {
        this.constructor.clear_element(this.element);
        return this;
    }

    /** scroll this.element into view via this.constructor.scroll_element_into_view()
     *  @return this
     */
    scroll_into_view() {
        this.constructor.scroll_element_into_view(this.element);
        return this;
    }

    /** set attributes on an element which are taken from an object, via this.constructor.set_element_attrs()
     *  @return this
     */
    set_attrs(attrs) {
        this.constructor.set_element_attrs(this.element, attrs);
        return this;
    }

    /** add/remove style properties on this.element via this.constructor.update_element_style()
     *  @return this
     */
    update_style(spec) {
        this.constructor.update_element_style(this.element, spec);
        return this;
    }

    /** create a new child element of this.element via this.constructor.create_element_child()
     *  @return {HTMLElement} the new child element
     */
    create_child(options=null) {
        return this.constructor.create_element_child(this.element, options);
    }

    /** create or update a child text node of this.element via this.constructor.create_element_child_text_node()
     *  @return {Node|null} the new or modified text node, or null if the converted text is ''
     */
    create_child_text_node(text, options=null) {
        return this.constructor.create_element_child_text_node(this.element, text, options);
    }

    /** normalize this.element via this.constructor.normalize_element_text()
     *  @return this
     */
    normalize_text() {
        this.constuctor.normalize_element_text(this.element);
        return this;
    }


    // === RENDERER INTERFACE ===

    /** return a new instance of the appropriate Renderer class for the given type
     *  @param {String} type
     *  @return {Renderer} renderer_class
     */
    renderer_for_type(type) {
        const renderer_class = _renderer_js__WEBPACK_IMPORTED_MODULE_1__/* .Renderer */ .T.class_from_type(type);
        if (!renderer_class) {
            throw new Error(`unknown output type: ${type}`);
        } else {
            return new renderer_class();
        }
    }

    /** run the given renderer with the given arguments and this output_context
     *  @param {Renderer} renderer instance
     *  @param {any} value
     *  @param {Object} options for renderer
     *  @return {any} return value from renderer
     */
    async invoke_renderer(renderer, value, options=null) {
        return renderer.render(this, value, options)
            .catch(error => {
                renderer.stop();  // stop anything that may have been started
                throw error;      // propagate the error
            });
    }

    /** find a renderer and invoke it for the given arguemnts
     *  @param {String} type
     *  @param {any} value
     *  @param {Object} options for renderer
     *  @return {any} return value from renderer
     */
    invoke_renderer_for_type(type, value, options=null) {
        const renderer = this.renderer_for_type(type);
        return this.invoke_renderer(renderer, value, options);
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 4571:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F: () => (/* binding */ get_renderer_classes),
/* harmony export */   T: () => (/* reexport safe */ _renderer_js__WEBPACK_IMPORTED_MODULE_0__.T)
/* harmony export */ });
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3393);
/* harmony import */ var _text_renderer_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1672);
/* harmony import */ var _error_renderer_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9072);
/* harmony import */ var _markdown_renderer_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6187);
/* harmony import */ var _tex_renderer_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(9947);
/* harmony import */ var _javascript_renderer_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(6919);
/* harmony import */ var _image_data_renderer_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(3050);
/* harmony import */ var _chart_renderer_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(8125);
/* harmony import */ var _graphviz_renderer_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(8567);
/* harmony import */ var _plotly_renderer_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(7012);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _text_renderer_js__WEBPACK_IMPORTED_MODULE_1__, _error_renderer_js__WEBPACK_IMPORTED_MODULE_2__, _markdown_renderer_js__WEBPACK_IMPORTED_MODULE_3__, _tex_renderer_js__WEBPACK_IMPORTED_MODULE_4__, _javascript_renderer_js__WEBPACK_IMPORTED_MODULE_5__, _image_data_renderer_js__WEBPACK_IMPORTED_MODULE_6__, _chart_renderer_js__WEBPACK_IMPORTED_MODULE_7__, _graphviz_renderer_js__WEBPACK_IMPORTED_MODULE_8__, _plotly_renderer_js__WEBPACK_IMPORTED_MODULE_9__]);
([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _text_renderer_js__WEBPACK_IMPORTED_MODULE_1__, _error_renderer_js__WEBPACK_IMPORTED_MODULE_2__, _markdown_renderer_js__WEBPACK_IMPORTED_MODULE_3__, _tex_renderer_js__WEBPACK_IMPORTED_MODULE_4__, _javascript_renderer_js__WEBPACK_IMPORTED_MODULE_5__, _image_data_renderer_js__WEBPACK_IMPORTED_MODULE_6__, _chart_renderer_js__WEBPACK_IMPORTED_MODULE_7__, _graphviz_renderer_js__WEBPACK_IMPORTED_MODULE_8__, _plotly_renderer_js__WEBPACK_IMPORTED_MODULE_9__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
// Renderer is defined in a separate file to break dependency cycle in get_renderer_classes()












function get_renderer_classes() {
    return [
        _text_renderer_js__WEBPACK_IMPORTED_MODULE_1__/* .TextRenderer */ .t,
        _error_renderer_js__WEBPACK_IMPORTED_MODULE_2__/* .ErrorRenderer */ .F,
        _markdown_renderer_js__WEBPACK_IMPORTED_MODULE_3__/* .MarkdownRenderer */ .$,
        _tex_renderer_js__WEBPACK_IMPORTED_MODULE_4__/* .TeXRenderer */ ._,
        _javascript_renderer_js__WEBPACK_IMPORTED_MODULE_5__/* .JavaScriptRenderer */ .f,
        _image_data_renderer_js__WEBPACK_IMPORTED_MODULE_6__/* .ImageDataRenderer */ .I,
        _chart_renderer_js__WEBPACK_IMPORTED_MODULE_7__/* .ChartRenderer */ .D,
        _graphviz_renderer_js__WEBPACK_IMPORTED_MODULE_8__/* .GraphvizRenderer */ .L,
        _plotly_renderer_js__WEBPACK_IMPORTED_MODULE_9__/* .PlotlyRenderer */ .G,
    ];
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 8125:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   D: () => (/* binding */ ChartRenderer)
/* harmony export */ });
/* harmony import */ var _chart_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9037);
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3393);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chart_js__WEBPACK_IMPORTED_MODULE_0__, _renderer_js__WEBPACK_IMPORTED_MODULE_1__]);
([_chart_js__WEBPACK_IMPORTED_MODULE_0__, _renderer_js__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);





class ChartRenderer extends _renderer_js__WEBPACK_IMPORTED_MODULE_1__/* .Renderer */ .T {
    static type = 'chart';

    // Format of config object: see Chart.js documentation

    // may throw an error
    async render(output_context, config, options) {
        const style = options?.style;

        // Re: Chart.js:
        // Wrap the canvas element in a div to prevent quirky behavious of Chart.js size handling.
        // See: https://stackoverflow.com/questions/19847582/chart-js-canvas-resize.
        // (Note: doing this for all text/graphics types)

        const parent = output_context.create_child({
            attrs: {
                'data-type': this.type,
            },
        });
        const canvas = output_context.constructor.create_element_child(parent, {
            tag: 'canvas',
            style,
        });
        const ctx = canvas.getContext('2d');
        // eliminate animation so that the canvas.toDataURL() call below will have something to render:
        _chart_js__WEBPACK_IMPORTED_MODULE_0__/* .Chart */ .k.defaults.global.animation.duration = 0;
        const chart_object = new _chart_js__WEBPACK_IMPORTED_MODULE_0__/* .Chart */ .k(ctx, config);  // simply for effect, chart_object not used...

        return parent;
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 9037:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   k: () => (/* binding */ Chart)
/* harmony export */ });
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/src/renderer/chart.js";  // save for later






await (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .load_script */ .h0)(document.head, new URL('../../node_modules/chart.js/dist/Chart.bundle.min.js', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__/* .assets_server_url */ .h)(current_script_url)));  // defines globalThis.Chart

const Chart = globalThis.Chart;

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 5717:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   d3: () => (/* binding */ d3)
/* harmony export */ });
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/src/renderer/d3.js";  // save for later






await (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .load_script */ .h0)(document.head, new URL('../../node_modules/d3/dist/d3.min.js', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__/* .assets_server_url */ .h)(current_script_url)));  // defines globalThis.d3

const d3 = globalThis.d3;

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 9072:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F: () => (/* binding */ ErrorRenderer)
/* harmony export */ });
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3393);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_renderer_js__WEBPACK_IMPORTED_MODULE_0__]);
_renderer_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];



class ErrorRenderer extends _renderer_js__WEBPACK_IMPORTED_MODULE_0__/* .Renderer */ .T {
    static type = 'error';

    static error_element_class      = 'error';
    static error_element_text_color = 'red';//!!! should be configurable

    async render(output_context, error_object, options) {
        const style = options?.style;

        const text_segments = [];
        if (error_object.stack) {
            text_segments.push(error_object.stack);
        } else {
            text_segments.push(error_object.message || 'error');
        }
        const text = text_segments.join('\n');

        const parent = output_context.create_child({
            tag: 'pre',
            attrs: {
                'data-type': this.type,
            },
            style: {
                ...(style ?? {}),
                color: this.constructor.error_element_text_color,
            }
        });
        parent.innerText = text;  // innerText sanitizes text

        return parent;
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 8567:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   L: () => (/* binding */ GraphvizRenderer)
/* harmony export */ });
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3393);
/* harmony import */ var _graphviz_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6105);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _graphviz_js__WEBPACK_IMPORTED_MODULE_1__]);
([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _graphviz_js__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);





class GraphvizRenderer extends _renderer_js__WEBPACK_IMPORTED_MODULE_0__/* .Renderer */ .T {
    static type = 'graphviz';

    // Format of config object: {
    //     node_config?: string,
    //     nodes[]?: (string | [ string/*name*/, string/*node_options*/ ])[],
    //     edges[]?: [ string/*from*/, string/*to*/, { label?: string, ... }? ][],
    // }

    // may throw an error
    async render(output_context, config, options) {
        const style = options?.style;

        const element = output_context.create_child({
            attrs: {
                'data-type': this.type,
            },
            style,
        });
        const element_selector = `#${element.id}`;

        const dot_stmts = [];
        if (config.node_config) {
            dot_stmts.push(`node ${node_config}`);
        }
        for (const node_spec of (config.nodes ?? [])) {
            if (typeof node_spec === 'string') {
                const name = node_spec;
                dot_stmts.push(name);
            } else {
                const [ name, node_options ] = node_spec;
                dot_stmts.push(`${name} [${node_options}]`);
            }
        }
        for (const [ from, to, edge_options ] of (config.edges ?? [])) {
            dot_stmts.push(`${from}->${to}${edge_options ? `[${edge_options}]` : ''}`);
        }
        const dot = `digraph { ${dot_stmts.join(';')} }`;

        // create and run the renderer
        await (0,_graphviz_js__WEBPACK_IMPORTED_MODULE_1__/* .render */ .s)(element_selector, dot, {});

        return element;
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 6105:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   s: () => (/* binding */ render)
/* harmony export */ });
/* harmony import */ var _d3_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5717);
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(984);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6973);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_d3_js__WEBPACK_IMPORTED_MODULE_0__]);
_d3_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
const current_script_url = "file:///home/ed/code/logbook/src/renderer/graphviz.js";  // save for later








await (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .load_script */ .h0)(document.head, new URL('../../node_modules/@hpcc-js/wasm/dist/graphviz.umd.js',   (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_2__/* .assets_server_url */ .h)(current_script_url)));
await (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .load_script */ .h0)(document.head, new URL('../../node_modules/d3-graphviz/build/d3-graphviz.min.js', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_2__/* .assets_server_url */ .h)(current_script_url)));

async function render(element_selector, dot, options) {
    const {
        transition = "main",
        ease       = _d3_js__WEBPACK_IMPORTED_MODULE_0__.d3.easeLinear,
        delay      = 500,
        duration   = 1500,
        logEvents  = true,
    } = (options ?? {});
    try {
        return new Promise((resolve, reject) => {
            function reject_with_string(...args) {
                reject(new Error(args[0]));
            }
            const graphviz = _d3_js__WEBPACK_IMPORTED_MODULE_0__.d3.select(element_selector).graphviz({
                useWorker:       false,
                useSharedWorker: false,
            });
            graphviz
                .transition(function () {
                    return _d3_js__WEBPACK_IMPORTED_MODULE_0__.d3.transition(transition)
                        .ease(ease)
                        .delay(delay)
                        .duration(duration);
                })
                .logEvents(logEvents)
                .onerror(reject_with_string)
                .on("initEnd", function () {
                    graphviz
                        .renderDot(dot)
                        .onerror(reject_with_string)
                        .on("end", resolve);
                });
        });
    } catch (error) {
        reject(error);
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 3050:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   I: () => (/* binding */ ImageDataRenderer)
/* harmony export */ });
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3393);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_renderer_js__WEBPACK_IMPORTED_MODULE_0__]);
_renderer_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];



class ImageDataRenderer extends _renderer_js__WEBPACK_IMPORTED_MODULE_0__/* .Renderer */ .T {
    static type = 'image-data';

    // Format of config object: {
    //     x?:         number,  // default value: 0
    //     y?:         number,  // default value: 0
    //     image_data: ImageData,
    // }
    // (or an array of these objects)

    // may throw an error
    async render(output_context, config, options) {
        const style = options?.style;

        const parent = output_context.create_child({
            attrs: {
                'data-type': this.type,
            },
        });
        const canvas = output_context.constructor.create_element_child(parent, {
            tag: 'canvas',
            style,
        });
        const ctx = canvas.getContext('2d');
        const iter_config = Array.isArray(config) ? config : [ config ];
        for (const { x = 0, y = 0, image_data } of iter_config) {
            ctx.putImageData(image_data, x, y);
        }

        return parent;
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 6919:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   f: () => (/* binding */ JavaScriptRenderer)
/* harmony export */ });
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6973);
/* harmony import */ var _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(53);
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3393);
/* harmony import */ var _eval_worker_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(7783);
/* harmony import */ var _output_context_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(266);
/* harmony import */ var _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(4429);
/* harmony import */ var _lib_sys_sprintf_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(6227);
/* harmony import */ var _settings_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(2724);
/* harmony import */ var _theme_settings_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(7098);
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(984);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__, _renderer_js__WEBPACK_IMPORTED_MODULE_2__, _output_context_js__WEBPACK_IMPORTED_MODULE_4__, _lib_sys_sprintf_js__WEBPACK_IMPORTED_MODULE_5__, _settings_js__WEBPACK_IMPORTED_MODULE_6__, _theme_settings_js__WEBPACK_IMPORTED_MODULE_7__]);
([_logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__, _renderer_js__WEBPACK_IMPORTED_MODULE_2__, _output_context_js__WEBPACK_IMPORTED_MODULE_4__, _lib_sys_sprintf_js__WEBPACK_IMPORTED_MODULE_5__, _settings_js__WEBPACK_IMPORTED_MODULE_6__, _theme_settings_js__WEBPACK_IMPORTED_MODULE_7__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
const current_script_url = "file:///home/ed/code/logbook/src/renderer/javascript-renderer/_.js";  // save for later



const lib_dir_path = '../../../lib/';//!!!
const lib_dir_url = new URL(lib_dir_path, (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_0__/* .assets_server_url */ .h)(current_script_url));


// ======================================================================
//!!!
// CODE EVALUATION
// ---------------
// Within the code given for evaluation, "this" references the eval_context
// passed to the eval() method.  This object will be obtained from the
// logbook, and will persist until the logbook is opened to a new file or
// is cleared.
//
// vars(...objects) assigns new properties to eval_context (i.e., "this"
// within the code), and those properties persist across all cells.
// The return value is undefined; this makes ${vars(...)} in a template
// string literal or in markup not insert anything into the output.
//
// A return statement within a cell terminates the evaluation (except
// for asynchronous parts that have already been evaluated), and the
// value passed to the return statement becomes the synchronous result
// of the evaluation.
//
// ephemeral_eval_context
// ----------------------
// During evaluation, a number of other values are available "globally",
// though these values do not persist after the particular evaluation
// (except for references from async code started during the evaluation).
// These values include output_context (which provides utilities for
// manipulation of the output of the cell), various graphics, etc functions.
// Also included are:
//
//     println:        prints its argument followed by newline
//     printf:         implementation of std C printf()
//     sprintf:        implementation of std C sprintf()
//     settings:       current settings
//     theme_settings: current theme_settings
//     import_lib:     import other libraries from the lib/ directory
//     vars:           export new "global" properties
//     is_stopped:     determine if the evaluation has been stopped
//     delay_ms:       return a Promise that resolves after a specified delay
//     create_worker:  create a new EvalWorker instance
//
// These all continue to be available even after the evaluation has
// returned if there are any async operations still active.
// See the method #create_ephemeral_eval_context().
// ======================================================================

const AsyncGeneratorFunction = Object.getPrototypeOf(async function* () {}).constructor;




















class JavaScriptRenderer extends _renderer_js__WEBPACK_IMPORTED_MODULE_2__/* .Renderer */ .T {
    static type = 'javascript';

    // options: { style?: Object, eval_context?: Object, inline?: Boolean }

    // may throw an error
    // if eval_context is not given in options, then logbook_manager.global_eval_context is used
    async render(output_context, code, options=null) {
        const {
            style,
            eval_context = _logbook_manager_js__WEBPACK_IMPORTED_MODULE_1__/* .logbook_manager */ .N.global_eval_context,
            inline,
        } = (options ?? {});

        // if !style && inline, then use the given output_context,
        // otherwise, if style || !inline, create a new output_context
        if (style || !inline) {
            const parent = output_context.create_child({
                tag: inline ? 'span' : 'div',
                attrs: {
                    'data-type': this.type,
                },
                style,
            });
            output_context = new _output_context_js__WEBPACK_IMPORTED_MODULE_4__/* .OutputContext */ .l(parent);
        }

        const ephemeral_eval_context = await this.#create_ephemeral_eval_context(eval_context, output_context);
        const ephemeral_eval_context_entries = Object.entries(ephemeral_eval_context);

        // create an async generator with the given code as the heart of its
        // body, and with parameters being the keys of ephemeral_eval_context.
        // Then, the code will be evaluated by applying the function to the
        // corresponding values from ephemeral_eval_context.  Note that
        // evaluation will be performed in the JavaScript global environment.
        const eval_fn_params = ephemeral_eval_context_entries.map(([k, _]) => k);
        const eval_fn_args   = ephemeral_eval_context_entries.map(([_, v]) => v);

        // evaluate the code:
        const eval_fn_this = eval_context;
        const eval_fn_body = code;
        const eval_fn = new AsyncGeneratorFunction(...eval_fn_params, eval_fn_body);
        const result_stream = eval_fn.apply(eval_fn_this, eval_fn_args);

        // note that using for await ... of misses the return value and we
        // want to process that, too.  Therefore, instead of the following,
        // we consume the stream "manually".
        //
        // for await (const result of result_stream) {
        //     if (typeof result !== 'undefined') {
        //         await ephemeral_eval_context.render_value(result);
        //     }
        // }

        for (;;) {
            const { value, done } = await result_stream.next();

            // output any non-undefined values that were received either from
            // a return or a yield statement in the code
            if (typeof value !== 'undefined') {
                if (done) {
                    // this was the return value, so precede with a special demarcation
                    await ephemeral_eval_context.render_text('\n>>> ');
                }

                await ephemeral_eval_context.render_value(value);
            }

            if (done) {
                break;
            }
        }
    }

    async #create_ephemeral_eval_context(eval_context, output_context) {
        const self = this;

        function is_stopped() {
            return self.stopped;
        }

        async function create_worker(options) {
            const worker = new _eval_worker_js__WEBPACK_IMPORTED_MODULE_3__/* .EvalWorker */ .V(options);
            self.add_stoppable(new _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_9__/* .Stoppable */ .X(worker, worker => worker.terminate()));
            return worker;
        }

        async function import_lib(lib_path) {
            return __webpack_require__(5979)(new URL(lib_path, lib_dir_url));
        }

        function vars(...objects) {
            Object.assign(eval_context, ...objects);
            return undefined;
        }

        async function delay_ms(ms) {
            return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_8__/* .delay_ms */ .li)(ms);
        }

        async function next_tick() {
            return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_8__/* .next_tick */ .rf)();
        }

        async function next_micro_tick() {
            return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_8__/* .next_micro_tick */ .pX)();
        }

        async function sleep(s) {
            return (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_8__/* .delay_ms */ .li)(1000*s);
        }

        async function render(type, value, options=null) {
            const renderer = output_context.renderer_for_type(type);
            self.add_stoppable(new _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_9__/* .Stoppable */ .X(renderer));
            return output_context.invoke_renderer(renderer, value, options)
                  .catch(error => output_context.invoke_renderer_for_type('error', error));
        }

        async function render_text(text, options=null) {
            text ??= '';
            if (typeof text !== 'string') {
                text = text?.toString() ?? '';
            }
            return render('text', text, options);
        }

        const render_error = render.bind(null, 'error');

        async function render_value(value) {
            // transform value to text and then render as text
            let text;
            if (typeof value === 'undefined') {
                text = '[undefined]';
            } else if (typeof value?.toString === 'function') {
                text = value.toString();
            } else {
                text = '[unprintable value]';
            }
            return render_text(text);
        }

        async function println(text) {
            return render_text((text ?? '') + '\n');
        }

        async function print__() {
            output_context.create_child({
                tag: 'hr',
                attrs: {
                    id: undefined,  // prevent generation of id
                },
            });
        }

        async function printf(format, ...args) {
            if (typeof format !== 'undefined' && format !== null) {
                if (typeof format !== 'string') {
                    format = format.toString();
                }
                const text = (0,_lib_sys_sprintf_js__WEBPACK_IMPORTED_MODULE_5__/* .sprintf */ .g)(format, ...args);
                return render_text(text).
                    catch(error => output_context.invoke_renderer_for_type('error', error));
            }
        }

        async function javascript(code, options) {  // options: { style?: Object, eval_context?: Object, inline?: Boolean }
            return render('javascript', code, options);
        }

        // wrapper to abort the given function if the renderer is stopped
        // this is the strategy for terminating a running evaluation...
        function AIS(f) {
            if (typeof f !== 'function') {
                throw new Error('f must be a function');
            }
            const AsyncFunction = (async () => {}).constructor;
            if (f instanceof AsyncFunction) {
                return async (...args) => {
                    abort_if_stopped(f.name ?? 'FUNCTION');
                    return f.apply(this, args);
                }
            } else {
                return (...args) => {
                    abort_if_stopped(f.name ?? 'FUNCTION');
                    return f.apply(this, args);
                }
            }
        }
        function abort_if_stopped(operation) {
            if (self.stopped) {
                throw new Error(`${operation} called after ${self.constructor.name} stopped`);
            }
        }

        const ephemeral_eval_context = {
            // external
            settings:        (0,_settings_js__WEBPACK_IMPORTED_MODULE_6__/* .get_settings */ .oj)(),
            theme_settings:  (0,_theme_settings_js__WEBPACK_IMPORTED_MODULE_7__/* .get_theme_settings */ .VI)(),
            sprintf:         AIS(_lib_sys_sprintf_js__WEBPACK_IMPORTED_MODULE_5__/* .sprintf */ .g),
            // functions defined above
            is_stopped,
            create_worker:   AIS(create_worker),
            import_lib:      AIS(import_lib),
            vars:            AIS(vars),
            delay_ms:        AIS(delay_ms),
            next_tick:       AIS(next_tick),
            next_micro_tick: AIS(next_micro_tick),
            sleep:           AIS(sleep),
            render:          AIS(render),
            render_text:     AIS(render_text),
            render_error:    AIS(render_error),
            render_value:    AIS(render_value),
            println:         AIS(println),
            print__:         AIS(print__),
            printf:          AIS(printf),
            // graphics, etc
            markdown:        AIS(render.bind(null, 'markdown')),
            tex:             AIS(render.bind(null, 'tex')),
            image_data:      AIS(render.bind(null, 'image-data')),
            chart:           AIS(render.bind(null, 'chart')),
            graphviz:        AIS(render.bind(null, 'graphviz')),
            plotly:          AIS(render.bind(null, 'plotly')),
            // code
            javascript:      AIS(javascript),
        };

        return ephemeral_eval_context;
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 7783:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   V: () => (/* binding */ EvalWorker)
/* harmony export */ });
/* harmony import */ var _lib_sys_uuid_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1896);
/* harmony import */ var _lib_sys_open_promise_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4889);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/src/renderer/javascript-renderer/eval-worker/_.js";  // save for later








class EvalWorker {
    /** @param {null|undefined|Object} options: {
     *      keepalive: Boolean,  // (default false) keep running after eval() or stream_eval() completes
     *  }
     */
    constructor(options=null) {
        const {
            keepalive = false,
        } = (options ?? {});

        this.keepalive = !!keepalive;

        Object.defineProperties(this, {
            id: {
                value: (0,_lib_sys_uuid_js__WEBPACK_IMPORTED_MODULE_1__/* .generate_object_id */ .pk)(),
                enumerable: true,
            },
        });
        this._worker = new Worker(new URL('./web-worker.js', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_0__/* .assets_server_url */ .h)(current_script_url)));
        this._terminated = false;
        this._current_expression = undefined;
    }

    get terminated (){ return this._terminated; }

    terminate() {
        if (!this._terminated) {
            this._reset_event_handlers();
            this._current_expression?.terminate();
            this._current_expression = undefined;
            this._worker.terminate();
            this._worker = undefined;
            this._terminated = true;
        }
    }

    async eval(expression, eval_context) {
        if (this.terminated) {
            throw new Error(`eval worker ${this.id}: worker has been terminated`);
        }
        if (this._current_expression) {
            throw new Error(`eval worker ${this.id}: an expression evaluation is already in process`);
        }

        const result_promise = new _lib_sys_open_promise_js__WEBPACK_IMPORTED_MODULE_2__/* .OpenPromise */ .i();
        let result_promise_fulfilled = false;

        const handle_done = () => {
            this._current_expression = undefined;
            this._reset_event_handlers();
            if (!result_promise_fulfilled) {
                result_promise.reject(new Error(`eval worker ${this.id} / expression ${expression_id}: evaluation terminated`));
            }
            if (!this.keepalive) {
                this.terminate();
            }
        };

        const expression_id = (0,_lib_sys_uuid_js__WEBPACK_IMPORTED_MODULE_1__/* .generate_object_id */ .pk)();

        const worker_message = {
            request: 'eval',
            id: expression_id,
            worker_id: this.id,
            expression,
            eval_context,
        };

        this._current_expression = {
            ...worker_message,
            terminate() {
                handle_done();
            },
        };

        this._worker.onmessage = (event) => {
            const result = event.data;
            if ('value' in result) {
                result_promise.resolve(result.value);
            } else {
                result_promise.reject(result.error);
            }
            result_promise_fulfilled = true;
            handle_done();
        };
        this._worker.onerror = (event) => {
            result_promise.reject(new Error(`eval worker ${this.id} / expression ${expression_id}: error in worker`));
            result_promise_fulfilled = true;
            handle_done();
        };
        this._worker.onmessageerror = (event) => {
            result_promise.reject(new Error(`eval worker ${this.id} / expression ${expression_id}: serialization error in worker`));
            result_promise_fulfilled = true;
            handle_done();
        };

        this._worker.postMessage(worker_message);

        return result_promise.promise;
    }

    // returns an async interator, i.e., this function is an async generator
    stream_eval(expression, eval_context) {
        if (this.terminated) {
            throw new Error(`eval worker ${this.id}: worker has been terminated`);
        }
        if (this._current_expression) {
            throw new Error(`eval worker ${this.id}: an expression evaluation is already in process`);
        }

        // at least one of pending_results and pending_promises should be empty at any given time
        const pending_results  = [];  // values/errors waiting to be consumed
        const pending_promises = [];  // consumed promises waiting for a value/error
        let   done             = false;

        const handle_done = () => {
            done = true;
            this._current_expression = undefined;
            this._reset_event_handlers();
            while (pending_promises.length > 0) {
                pending_promises.shift().resolve({ done: true });
            }
            if (!this.keepalive) {
                this.terminate();
            }
        }

        const handle_result = (result) => {
            if (done) {
                console.warn(`eval worker ${this.id} / expression ${expression_id}: result received after done`, result);
            } else {
                if (pending_promises.length > 0) {
                    if ('value' in result) {
                        pending_promises.shift().resolve({ value: result.value });
                    } else {
                        pending_promises.shift().reject(result.error);
                    }
                } else {
                    pending_results.push(result);
                }

                // errors terminate the stream
                if (result.error) {
                    handle_done();
                }
            }
        }

        const expression_id = (0,_lib_sys_uuid_js__WEBPACK_IMPORTED_MODULE_1__/* .generate_object_id */ .pk)();

        const worker_message = {
            request: 'stream_eval',
            id: expression_id,
            worker_id: this.id,
            expression,
            eval_context,
        };

        this._current_expression = {
            ...worker_message,
            terminate() {
                handle_done();
            },
        };

        this._worker.onmessage = (event) => {
            const result = event.data;
            if (result.done) {
                handle_done();
            } else {
                handle_result(result);
            }
        };
        this._worker.onerror = (event) => {
            handle_result({ error: new Error(`eval worker ${this.id} / expression ${expression_id}: error in worker`) });
            handle_done();
        };
        this._worker.onmessageerror = (event) => {
            handle_result({ error: new Error(`eval worker ${this.id} / expression ${expression_id}: serialization error in worker`) });
            handle_done();
        };

        this._worker.postMessage(worker_message);

        return {
            [Symbol.asyncIterator]() {
                let i = 0;
                return {
                    next() {
                        if (pending_results.length > 0) {
                            const result = pending_results.shift()
                            if ('value' in result) {
                                return Promise.resolve({ value: result.value });
                            } else {
                                return Promise.reject(result.error);
                            }
                        } else if (done) {
                            while (pending_promises.length > 0) {
                                pending_promises.shift().reject(new Error(`eval worker ${this.id} / expression ${expression_id}: no further results available`));
                            }
                            return Promise.resolve({ done: true });
                        } else {
                            const new_promise = new _lib_sys_open_promise_js__WEBPACK_IMPORTED_MODULE_2__/* .OpenPromise */ .i();
                            pending_promises.push(new_promise);
                            return new_promise.promise;
                        }
                    },
                    return() {
                        // This will be reached if the consumer called 'break' or 'return' early in the loop.
                        return { done: true };
                    },
                };
            },
        };
    }

    _reset_event_handlers() {
        if (!this.terminated) {
            this._worker.onmessage      = undefined;
            this._worker.onerror        = undefined;
            this._worker.onmessageerror = undefined;
        }
    }
}


/***/ }),

/***/ 6187:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $: () => (/* binding */ MarkdownRenderer)
/* harmony export */ });
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3393);
/* harmony import */ var _marked_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6243);
/* harmony import */ var _texzilla_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7343);
/* harmony import */ var _output_context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(266);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _marked_js__WEBPACK_IMPORTED_MODULE_1__, _texzilla_js__WEBPACK_IMPORTED_MODULE_2__, _output_context_js__WEBPACK_IMPORTED_MODULE_3__]);
([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _marked_js__WEBPACK_IMPORTED_MODULE_1__, _texzilla_js__WEBPACK_IMPORTED_MODULE_2__, _output_context_js__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);









class MarkdownRenderer extends _renderer_js__WEBPACK_IMPORTED_MODULE_0__/* .Renderer */ .T {
    static type = 'markdown';

    // options: { style?: Object }

    // may throw an error
    async render(output_context, markdown, options=null) {

        markdown ??= '';

        const {
            style,
        } = (options ?? {});

        const parent = output_context.create_child({
            attrs: {
                'data-type': this.type,
            },
            style,
        });
        const markup = await _marked_js__WEBPACK_IMPORTED_MODULE_1__/* .marked */ .T.parse(markdown);  // using extensions, see below
        parent.innerHTML = markup;

        return parent;
    }
}


// === MARKED EXTENSIONS ===

// TeX handling adapted from: marked-katex-extension/index.js
// https://github.com/UziTech/marked-katex-extension/blob/main/src/index.js
// See also: https://marked.js.org/using_pro#async

const extension_name__inline    = 'inline-tex';
const extension_name__block     = 'block-tex';
const extension_name__eval_code = 'eval-code';

_marked_js__WEBPACK_IMPORTED_MODULE_1__/* .marked */ .T.use({
    extensions: [
        {
            name: extension_name__inline,
            level: 'inline',
            start(src) { return src.indexOf('$'); },
            tokenizer(src, tokens) {
                const match = src.match(/^\$+([^$]+?)\$+/);
                if (match) {
                    return {
                        type: extension_name__inline,
                        raw:  match[0],
                        text: match[1].trim(),
                    };
                }
            },
            renderer(token) {
                const inline = true;
                const rtl = false;//!!!
                const exc_on_err = false;
                return _texzilla_js__WEBPACK_IMPORTED_MODULE_2__/* .TeXZilla */ .w.toMathMLString(token.text, !inline, rtl, exc_on_err);
            },
        },
        {
            name: extension_name__block,
            level: 'block',
            start(src) { return src.indexOf('$$'); },
            tokenizer(src, tokens) {
                const match = src.match(/^\$\$([^$]+?)\$\$/);
                if (match) {
                    return {
                        type: extension_name__block,
                        raw:  match[0],
                        text: match[1].trim(),
                    };
                }
            },
            renderer(token) {
                const inline = false;
                const rtl = false;//!!!
                const exc_on_err = false;
                return `<p>${_texzilla_js__WEBPACK_IMPORTED_MODULE_2__/* .TeXZilla */ .w.toMathMLString(token.text, !inline, rtl, exc_on_err)}</p>`;
            },
        },

        {
            name: extension_name__eval_code,
            level: 'block',
            start(src) { return src.match(/^[`]{3}[ ]*[!]/)?.index; },
            tokenizer(src, tokens) {
                const match = src.match(/^[`]{3}[ ]*[!](.*?)[`]{3}/s);
                if (match) {
                    return {
                        type: extension_name__eval_code,
                        raw:  match[0],
                        text: match[1],
                        html: '',  // filled in later by walkTokens
                    };
                }
            },
            renderer(token) {
                return token.html;
            },
        },
    ],

    async: true,  // needed to tell the marked parser operate asynchronously, and to return a promise
    async walkTokens(token) {
        if (token.type === extension_name__eval_code) {
            const output_element = document.createElement('div');
            const output_context = new _output_context_js__WEBPACK_IMPORTED_MODULE_3__/* .OutputContext */ .l(output_element);
            const options = {
                //!!!
            };
            const renderer = output_context.renderer_for_type('javascript');
            await output_context.invoke_renderer(renderer, token.text, options)
                .catch(error => output_context.invoke_renderer_for_type('error', error));
            renderer?.stop();  // stop background processing, if any
            token.html = output_element.innerHTML;
        }
    }
});

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 6243:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   T: () => (/* binding */ marked)
/* harmony export */ });
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/src/renderer/marked.js";  // save for later






await (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .load_script */ .h0)(document.head, new URL('../../node_modules/marked/marked.min.js', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__/* .assets_server_url */ .h)(current_script_url)));

const marked = globalThis.marked;

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 7012:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   G: () => (/* binding */ PlotlyRenderer)
/* harmony export */ });
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3393);
/* harmony import */ var _plotly_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1946);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _plotly_js__WEBPACK_IMPORTED_MODULE_1__]);
([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _plotly_js__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);





class PlotlyRenderer extends _renderer_js__WEBPACK_IMPORTED_MODULE_0__/* .Renderer */ .T {
    static type = 'plotly';

    // Format of config object: { data, layout, config, frames }
    // (the sub-objects layout, config and frames are optional)

    // may throw an error
    async render(output_context, config, options) {
        const style = options?.style;

        const parent = output_context.create_child({
            attrs: {
                'data-type': this.type,
            },
        });
        const output_element = output_context.constructor.create_element_child(parent, {
            style,
        });
        await _plotly_js__WEBPACK_IMPORTED_MODULE_1__/* .Plotly */ .N.newPlot(output_element, config);  // render to the output_element

        return parent;
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 1946:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   N: () => (/* binding */ Plotly)
/* harmony export */ });
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/src/renderer/plotly.js";  // save for later






await (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .load_script */ .h0)(document.head, new URL('../../node_modules/plotly.js-dist/plotly.js', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__/* .assets_server_url */ .h)(current_script_url)));  // defines globalThis.Plotly

const Plotly = globalThis.Plotly;

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 3393:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   T: () => (/* binding */ Renderer)
/* harmony export */ });
/* harmony import */ var _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4429);
/* harmony import */ var _js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4571);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_js__WEBPACK_IMPORTED_MODULE_0__]);
_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];





class Renderer extends _lib_sys_stoppable_js__WEBPACK_IMPORTED_MODULE_1__/* .StoppableObjectsManager */ .T {
    static type = undefined;  // type which instances handle; to be overridden in subclasses

    get type (){ return this.constructor.type }

    async render(output_context, value, options) {
        // to be implemented by subclasses
        throw new Error('NOT UNIMPLEMENTED');
    }

    static class_from_type(type) {
        return this.#establish_type_to_class_mapping()[type];
    }


    // === TYPE TO RENDERER MAPPING ===

    // importing the classes is deferred until this function is called to avoid dependency cycles
    static #establish_type_to_class_mapping() {
        if (!this.#type_to_class_mapping) {
            this.#type_to_class_mapping =
                Object.fromEntries(
                    (0,_js__WEBPACK_IMPORTED_MODULE_0__/* .get_renderer_classes */ .F)().map(renderer_class => {
                        return [ renderer_class.type, renderer_class ];
                    })
                );
        }
        return this.#type_to_class_mapping;
    }
    static #type_to_class_mapping;  // memoization

    // paths to known renderer class implementations, default-exported
    static #renderer_paths = [

        './text-renderer.js',
        './error-renderer.js',
        './markdown-renderer.js',
        './tex-renderer.js',
        './javascript-renderer/_.js',
        './image-data-renderer.js',
        './chart-renderer.js',
        './graphviz-renderer.js',
        './plotly-renderer.js',
    ];
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 9947:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   _: () => (/* binding */ TeXRenderer)
/* harmony export */ });
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3393);
/* harmony import */ var _texzilla_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7343);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _texzilla_js__WEBPACK_IMPORTED_MODULE_1__]);
([_renderer_js__WEBPACK_IMPORTED_MODULE_0__, _texzilla_js__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);





class TeXRenderer extends _renderer_js__WEBPACK_IMPORTED_MODULE_0__/* .Renderer */ .T {
    static type = 'tex';

    // options: { style?: Object, inline?: Boolean, rtl?: Boolean }

    // may throw an error
    async render(output_context, tex, options=null) {
        tex ??= '';

        const {
            style,
            inline,
            rtl,
        } = (options ?? {});

        const parent = output_context.create_child({
            attrs: {
                'data-type': this.type,
            },
            style,
        });
        const exc_on_err = false;
        const mathml = _texzilla_js__WEBPACK_IMPORTED_MODULE_1__/* .TeXZilla */ .w.toMathMLString(tex, !inline, rtl, exc_on_err);
        parent.innerHTML = mathml;

        return parent;
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 1672:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   t: () => (/* binding */ TextRenderer)
/* harmony export */ });
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3393);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_renderer_js__WEBPACK_IMPORTED_MODULE_0__]);
_renderer_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];



class TextRenderer extends _renderer_js__WEBPACK_IMPORTED_MODULE_0__/* .Renderer */ .T {
    static type = 'text';

    async render(output_context, text, options) {
        if (options?.style) {
            const span = output_context.create_child({
                tag: 'span',
                attrs: {
                    'data-type': this.type,
                },
                style: options.style,
            });
            span.innerText = text;  // innerText sanitizes text
            return span;
        } else {
            return output_context.create_child_text_node(text);  // inserted as pure text
        }
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 7343:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   w: () => (/* binding */ TeXZilla)
/* harmony export */ });
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/src/renderer/texzilla.js";  // save for later






await (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .load_script */ .h0)(document.head, new URL('../../node_modules/texzilla/TeXZilla.js', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__/* .assets_server_url */ .h)(current_script_url)));  // defines globalThis.TeXZilla

const TeXZilla = globalThis.TeXZilla;

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 9713:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   D: () => (/* binding */ SettingsDialog)
/* harmony export */ });
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _lib_ui_dialog_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7569);
/* harmony import */ var _lib_sys_obj_path_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2007);
/* harmony import */ var _settings_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2724);
/* harmony import */ var _lib_ui_beep_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(1951);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6973);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_settings_js__WEBPACK_IMPORTED_MODULE_2__]);
_settings_js__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
const current_script_url = "file:///home/ed/code/logbook/src/settings-dialog/_.js";  // save for later














// add the stylesheet
const stylesheet_url = new URL('./settings-dialog.css', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_3__/* .assets_server_url */ .h)(current_script_url));
(0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_stylesheet_link */ .KP)(document.head, stylesheet_url);


// dialog definitiion

const sections = [{
    section: {
        name: 'Editor',
        settings: [{
            id: 'editor_options_indentUnit',
            label: 'Indent',
            type: 'text',
            settings_path: [ 'editor_options', 'indentUnit' ],
            analyze: (value) => (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .analyze_editor_options_indentUnit */ .Xg)(value, 'Indent'),
            convert_to_number: true,
        }, {
            id: 'editor_options_tabSize',
            label: 'Tab size',
            type: 'text',
            settings_path: [ 'editor_options', 'tabSize' ],
            analyze: (value) => (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .analyze_editor_options_tabSize */ .aD)(value, 'Tab size'),
            convert_to_number: true,
        }, {
            id: 'editor_options_indentWithTabs',
            label: 'Indent with tabs',
            type: 'checkbox',
            settings_path: [ 'editor_options', 'indentWithTabs' ],
            analyze: (value) => (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .analyze_editor_options_indentWithTabs */ .hZ)(value, 'Indent with tabs'),
        }, {
            id: 'editor_options_keyMap',
            label: 'Key map',
            type: 'select',
            options: _settings_js__WEBPACK_IMPORTED_MODULE_2__/* .valid_editor_options_keyMap_values */ .$I.map(value => ({ value, label: value })),
            settings_path: [ 'editor_options', 'keyMap' ],
            analyze: (value) => (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .analyze_editor_options_keyMap */ .Br)(value, 'Key map'),
        }],
    },
}, {
    section: {
        name: 'TeX Formatting',
        settings: [{
            id: 'formatting_options_align',
            label: 'Horizontal alignment',
            type: 'select',
            options: _settings_js__WEBPACK_IMPORTED_MODULE_2__/* .valid_formatting_options_align_values */ .Kp.map(value => ({ value, label: value })),
            settings_path: [ 'formatting_options', 'align' ],
            analyze: (value) => (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .analyze_formatting_options_align */ .yj)(value, 'Align'),
        }, {
            id: 'formatting_options_indent',
            label: 'Indentation',
            type: 'text',
            settings_path: [ 'formatting_options', 'indent' ],
            analyze: (value) => (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .analyze_formatting_options_indent */ .fe)(value, 'Indentation'),
        }],
    },
}, {
    section: {
        name: 'Appearance',
        settings: [{
            id: 'theme_colors',
            label: 'Theme',
            type: 'select',
            options: _settings_js__WEBPACK_IMPORTED_MODULE_2__/* .valid_theme_colors_values */ .LI.map(value =>({ value, label: value })),
            settings_path: [ 'theme_colors' ],
            analyze: (value) => (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .analyze_theme_colors */ .K4)(value, 'Theme colors'),
        }],
    },
}];


class SettingsDialog extends _lib_ui_dialog_js__WEBPACK_IMPORTED_MODULE_1__/* .Dialog */ .Vq {
    static settings_dialog_css_class = 'settings-dialog';

    static run(message, options) {
        const pre_existing_element = document.querySelector(`#content #ui .${this.settings_dialog_css_class}`);
        if (pre_existing_element) {
            const pre_existing_instance = _lib_ui_dialog_js__WEBPACK_IMPORTED_MODULE_1__/* .Dialog */ .Vq.instance_from_element(pre_existing_element);
            if (!pre_existing_instance) {
                throw new Error(`unexpected: Dialog.instance_from_element() returned null for element with class ${this.settings_dialog_css_class}`);
            }
            return pre_existing_instance.promise;
        } else {
            return new this().run();
        }
    }

    _populate_dialog_element() {
        const current_settings = (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .get_settings */ .oj)();

        // make this dialog identifiable so that the static method run()
        // can find it if it already exists.
        this._dialog_element.classList.add(this.constructor.settings_dialog_css_class);

        this._dialog_text_container.innerText = 'Settings';

        for (const { section } of sections) {
            const { name, settings } = section;
            const section_div = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({ parent: this._dialog_form, attrs: { class: 'section' } });

            const named_section_div = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({ parent: section_div, attrs: { 'data-section': name } });
            const error_div = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({ parent: section_div, attrs: { class: `error-message` } });

            for (const setting of settings) {
                const { id, label, type, settings_path, options, analyze, convert_to_number } = setting;
                const setting_div = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({ parent: named_section_div, attrs: { 'data-setting': undefined } });
                let control;
                if (type === 'select') {
                    control = (0,_lib_ui_dialog_js__WEBPACK_IMPORTED_MODULE_1__/* .create_select_element */ .cK)(setting_div, id, {
                        label,
                        options,
                    });
                } else {
                    control = (0,_lib_ui_dialog_js__WEBPACK_IMPORTED_MODULE_1__/* .create_control_element */ .L_)(setting_div, id, {
                        label,
                        type,
                    });
                }

                if (type === 'checkbox') {
                    control.checked = (0,_lib_sys_obj_path_js__WEBPACK_IMPORTED_MODULE_4__/* .get_obj_path */ .Z)(current_settings, settings_path);
                } else {
                    control.value = (0,_lib_sys_obj_path_js__WEBPACK_IMPORTED_MODULE_4__/* .get_obj_path */ .Z)(current_settings, settings_path);
                }

                const update_handler = async (event) => {
                    const current_settings = (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .get_settings */ .oj)();

                    const handle_error = async (error_message) => {
                        error_div.classList.add('active');
                        error_div.innerText = error_message;
                        const existing_control = document.getElementById(control.id);
                        if (!this._completed && existing_control) {
                            existing_control.focus();
                            if (existing_control instanceof HTMLInputElement && existing_control.type === 'text') {
                                existing_control.select();
                            }
                            await (0,_lib_ui_beep_js__WEBPACK_IMPORTED_MODULE_5__/* .beep */ .V)();
                        } else {
                            await _lib_ui_dialog_js__WEBPACK_IMPORTED_MODULE_1__/* .AlertDialog */ .aR.run(`settings update failed: ${error_message}`);
                        }
                    };

                    const value = (type === 'checkbox') ? control.checked : control.value;
                    if (analyze) {
                        const complaint = analyze(value)
                        if (complaint) {
                            await handle_error(complaint);
                            return;
                        }
                    }
                    (0,_lib_sys_obj_path_js__WEBPACK_IMPORTED_MODULE_4__/* .set_obj_path */ .$)(current_settings, settings_path, (convert_to_number ? +value : value));

                    try {
                        await (0,_settings_js__WEBPACK_IMPORTED_MODULE_2__/* .update_settings */ .ZA)(current_settings)
                        error_div.classList.remove('active');
                    } catch (error) {
                        await handle_error(error.message);
                    }
                };

                control.addEventListener('change', update_handler);
                control.addEventListener('blur',   update_handler);
            }
        }

        // Done button should not cause Enter to automatically submit the form
        // unless directly clicked.
        const accept_button = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
            parent: this._dialog_form,
            tag:    'input',
            attrs: {
                type: 'button',
                value: 'Done',
            },
        });
        accept_button.onclick = (event) => this._dialog_element.close();

        this._dialog_element.onclose = (event) => this._complete();
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 2724:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $I: () => (/* binding */ valid_editor_options_keyMap_values),
/* harmony export */   Br: () => (/* binding */ analyze_editor_options_keyMap),
/* harmony export */   K4: () => (/* binding */ analyze_theme_colors),
/* harmony export */   Kp: () => (/* binding */ valid_formatting_options_align_values),
/* harmony export */   LI: () => (/* binding */ valid_theme_colors_values),
/* harmony export */   Xg: () => (/* binding */ analyze_editor_options_indentUnit),
/* harmony export */   ZA: () => (/* binding */ update_settings),
/* harmony export */   aD: () => (/* binding */ analyze_editor_options_tabSize),
/* harmony export */   fe: () => (/* binding */ analyze_formatting_options_indent),
/* harmony export */   hZ: () => (/* binding */ analyze_editor_options_indentWithTabs),
/* harmony export */   oj: () => (/* binding */ get_settings),
/* harmony export */   yj: () => (/* binding */ analyze_formatting_options_align)
/* harmony export */ });
/* unused harmony exports initial_settings, settings_updated_events, validate_numeric, analyze_contained, analyze_editor_options, valid_formatting_options_indent_units, analyze_formatting_options, analyze_settings, _reset_settings */
/* harmony import */ var _lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6092);
/* harmony import */ var _lib_sys_util_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2176);
/* harmony import */ var _storage_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6659);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__]);
_lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];







// === INITIAL SETTINGS ===

const initial_settings = {
    editor_options: {
        indentUnit:     2,
        tabSize:        4,
        indentWithTabs: false,
        keyMap:         'default',
    },
    formatting_options: {
        align:  'left',
        indent: '0em',
    },
    theme_colors: 'system',
};
(0,_lib_sys_util_js__WEBPACK_IMPORTED_MODULE_2__/* .deep_freeze */ .j)(initial_settings);


// === EVENT INTERFACE ===

function copy_settings(settings) {
    return JSON.parse(JSON.stringify(settings));
}

const settings_updated_events = new _lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__/* .Subscribable */ .l();


// === GENERIC VALIDATION ===

const numeric_re = /^([+-]?[0-9]+[.][0-9]*[Ee][+-]?[0-9]+|[+-]?[.][0-9]+[Ee][+-]?[0-9]+|[+-]?[0-9]+[Ee][+-]?[0-9]+|[+-]?[0-9]+[.][0-9]*|[+-]?[.][0-9]+|[+-]?[0-9]+)$/;

/** validate test_value for being numeric
 *  @param {string|number} test_value string (or number) to be tested
 *  @param {Object|undefined} options an object that may contain values for any of the following flags:
 *             require_integer
 *             reject_negative
 *             reject_zero
 *             reject_positive
 *  @return {boolean} result of validation
 */
function validate_numeric(test_value, options) {
    const {
        require_integer,
        reject_negative,
        reject_zero,
        reject_positive,
    } = (options ?? {})

    let numeric_value;
    if (typeof test_value === 'number') {
        numeric_value = test_value;
    } else {
        if (typeof test_value !== 'string') {
            return false;
        }
        if (!test_value.trim().match(numeric_re)) {
            return false;
        }
        numeric_value = Number.parseFloat(test_value);
    }

    if ( isNaN(numeric_value)                                  ||
         (require_integer && !Number.isInteger(numeric_value)) ||
         (reject_positive && numeric_value >   0)              ||
         (reject_zero     && numeric_value === 0)              ||
         (reject_negative && numeric_value <   0)                 ) {
        return false;
    }
    return true;
}

/** check if test_value is in a collection of objects
 *  @param {any} test_value value to be tested if it is in collection
 *  @param {Array} collection objects to test membership in
 *  @param {string} name (Optional) name to use for test_value
 *  @return {string|undefined} complaint string if not in collection, or undefined if it is.
 */
function analyze_contained(test_value, collection, name) {
    if (!collection.includes(test_value)) {
        return `${name ?? 'value'} must be one of: ${collection.join(', ')}`;
    }
    return undefined;
}


// === SETTINGS VALIDATION ===

function analyze_editor_options_indentUnit(value, name) {
    if (!validate_numeric(value, { require_integer: true, reject_negative: true })) {
        return `${name ?? 'indentUnit'} must be a non-negative integer`;
    }
    return undefined;
}
function analyze_editor_options_tabSize(value, name) {
    if (!validate_numeric(value, { require_integer: true, reject_negative: true })) {
        return `${name ?? 'tabSize'} must be a non-negative integer`;
    }
    return undefined;
}
function analyze_editor_options_indentWithTabs(value, name) {
    if (typeof value !== 'boolean') {
        return `${name ?? 'indentWithTabs'} must be a boolean value`;
    }
    return undefined;
}
const valid_editor_options_keyMap_values = ['default', 'emacs', 'sublime', 'vim'];
function analyze_editor_options_keyMap(value, name) {
    return analyze_contained(value, valid_editor_options_keyMap_values, (name ?? 'keyMap'));
}

function analyze_editor_options(editor_options, name) {
    if (typeof editor_options !== 'object') {
        return `${name ?? 'editor_options'} must be an object`;
    }
    const keys = Object.keys(editor_options);
    if (!keys.every(k => ['indentUnit', 'tabSize', 'indentWithTabs', 'keyMap'].includes(k))) {
        return `${name ?? 'editor_options'} may only have the keys "indentUnit", "tabSize", "indentWithTabs" and "keyMap"`;
    }
    if ('indentUnit' in editor_options) {
        const complaint = analyze_editor_options_indentUnit(editor_options.indentUnit);
        if (complaint) {
            return complaint;
        }
    }
    if ('tabSize' in editor_options) {
        const complaint = analyze_editor_options_tabSize(editor_options.tabSize);
        if (complaint) {
            return complaint;
        }
    }
    if ('indentWithTabs' in editor_options) {
        const complaint = analyze_editor_options_indentWithTabs(editor_options.indentWithTabs);
        if (complaint) {
            return complaint;
        }
    }
    if ('keyMap' in editor_options) {
        const complaint = analyze_editor_options_keyMap(editor_options.keyMap);
        if (complaint) {
            return complaint;
        }
    }
    return undefined;
}

const valid_formatting_options_align_values = ['left', 'center', 'right'];
/** analyze/validate a formatting_options align property
 *  @param {string} value
 *  @return {string|undefined} returns a complaint string if invalid, or undefined if valid
 */
function analyze_formatting_options_align(value, name) {
    return analyze_contained(value, valid_formatting_options_align_values, (name ?? 'align'));
}
const valid_formatting_options_indent_units = ['pt', 'pc', 'in', 'cm', 'mm', 'em', 'ex', 'mu'];
/** analyze/validate a formatting_options indent property
 *  @param {string} value
 *  @return {string|undefined} returns a complaint string if invalid, or undefined if valid
 */
function analyze_formatting_options_indent(value, name) {
    if (!valid_formatting_options_indent_units.every(s => (s.length === 2))) {
        throw new Error('unexpected: valid units contains a string whose length is not 2');
    }
    const complaint = `${name ?? 'indent'} must be a string containing a non-negative number followed by one of: ${valid_formatting_options_indent_units.join(', ')}`;
    if (typeof value !== 'string') {
        return complaint;
    }
    // all valid units strings are length 2
    value = value.trim();
    const amount_str = value.slice(0, -2);
    const units      = value.slice(-2);
    if ( !validate_numeric(amount_str, { reject_negative: true }) ||
         !valid_formatting_options_indent_units.includes(units) ) {
        return complaint;
    }
    return undefined;
}
/** analyze/validate a formatting_options object
 *  @param {Object} formatting_options: { align?: string, indent?: string }
 *  @return {string|undefined} returns a complaint string if invalid, or undefined if valid
 */
function analyze_formatting_options(formatting_options, name) {
    if (typeof formatting_options !== 'object') {
        return `${name ?? 'formatting_options'} must be an object`;
    }
    const keys = Object.keys(formatting_options);
    if (!keys.every(k => ['align', 'indent'].includes(k))) {
        return `${name ?? 'formatting_options'} may only have the keys "align" and "indent"`;
    }
    if ('align' in formatting_options) {
        const complaint = analyze_formatting_options_align(formatting_options.align);
        if (complaint) {
            return complaint;
        }
    }
    if ('indent' in formatting_options) {
        const complaint = analyze_formatting_options_indent(formatting_options.indent);
        if (complaint) {
            return complaint;
        }
    }
    return undefined;
}

const valid_theme_colors_values = ['system', 'dark', 'light'];
function analyze_theme_colors(value, name) {
    return analyze_contained(value, valid_theme_colors_values, (name ?? 'theme_colors'));
}

function analyze_settings(settings, name) {
    if (typeof settings !== 'object') {
        return `${name ?? 'settings'} must be an object`;
    }
    const keys = Object.keys(settings);
    if (!keys.every(k => ['editor_options', 'formatting_options', 'theme_colors'].includes(k))) {
        return `${name ?? 'settings'} may only have the keys "editor_options", "formatting_options" and "theme_colors"`;
    }
    if (!('editor_options' in settings)) {
        return `${name ?? 'settings'} must contain an editor_options property`;
    } else {
        const complaint = analyze_editor_options(settings.editor_options);
        if (complaint) {
            return complaint;
        }
    }
    if (!('formatting_options' in settings)) {
        return `${name ?? 'settings'} must contain an formmating_options property`;
    } else {
        const complaint = analyze_formatting_options(settings.formatting_options);
        if (complaint) {
            return complaint;
        }
    }
    if (!('theme_colors' in settings)) {
        return `${name ?? 'settings'} must contain an theme_colors property`;
    } else {
        const complaint = analyze_theme_colors(settings.theme_colors);
        if (complaint) {
            return complaint;
        }
    }
    return undefined;
}

// validate initial_settings
(() => {
    const complaint = analyze_settings(initial_settings);
    if (complaint) {
        throw new Error(`initial_settings: ${complaint}`);
    }
})();


// === STORAGE ===

// may throw an error if the settings value is corrupt or circular
async function put_settings_to_storage(settings) {
    return _storage_js__WEBPACK_IMPORTED_MODULE_1__/* .storage_db */ .zS.put(_storage_js__WEBPACK_IMPORTED_MODULE_1__/* .db_key_settings */ .Fx, settings);
}

// may throw an error if settings value corrupt and unable to store initial settings
async function get_settings_from_storage() {
    try {
        const settings = await _storage_js__WEBPACK_IMPORTED_MODULE_1__/* .storage_db */ .zS.get(_storage_js__WEBPACK_IMPORTED_MODULE_1__/* .db_key_settings */ .Fx);
        if (!analyze_settings(settings)) {
            return settings;
        }
        // otherwise, if !settings, fall out to reset...
    } catch (_) {
        // if error, fall out to reset...
    }
    // Either settings_string was null or an error occurred when parsing, so reset
    await put_settings_to_storage(initial_settings);
    return initial_settings;
}

let current_settings = await get_settings_from_storage();
async function _reset_settings() {
    return update_settings(initial_settings);
}
function get_settings() {
    // return a copy to insulate receivers from each other's modifications
    return copy_settings(current_settings);
}

// may throw an error if the new_settings value is corrupt or circular
async function update_settings(new_settings) {
    const complaint = analyze_settings(new_settings);
    if (complaint) {
        throw new Error(complaint);
    }
    await put_settings_to_storage(new_settings);  // may throw an error
    current_settings = new_settings;
    settings_updated_events.dispatch();
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 6659:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  Fx: () => (/* binding */ db_key_settings),
  zS: () => (/* binding */ storage_db)
});

// UNUSED EXPORTS: db_key_recents

;// CONCATENATED MODULE: ./lib/sys/idb.js
const default_database_name       = 'property-database-7a11272a-fce1-4e39-951c-44c375bc75ca';
const default_database_store_name = 'property-database-store-7a11272a-fce1-4e39-951c-44c375bc75ca';

class IndexedDBInterface {
    constructor(database_name=default_database_name, database_store_name=default_database_store_name) {
        Object.defineProperties(this, {
            database_name: {
                value: database_name,
            },
            database_store_name: {
                value: database_store_name,
                enumerable: true,
            },
            _startup_promise: {
                value: new Promise((resolve, reject) => {
                    const request = indexedDB.open(database_name, 1);
                    request.onerror   = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                    request.onupgradeneeded = () => {
                        // create empty object store (first time upgrade)
                        request.result.createObjectStore(database_store_name);
                    };
                }),
            },
        });
    }

    async with_object_store(mode, receiver) {
        const db = await this._startup_promise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.database_store_name, mode);
            transaction.oncomplete = () => resolve();
            transaction.onabort = transaction.onerror = () => reject(transaction.error);
            receiver(transaction.objectStore(this.database_store_name));
        });
    }

    async get(key) {
        let req;
        await this.with_object_store('readonly', store => {
            req = store.get(key);
        });
        return req.result;
    }

    async put(key, value) {
        return this.with_object_store('readwrite', store => {
            store.put(value, key);
        });
    }

    async delete(key) {
        return this.with_object_store('readwrite', store => {
            store.delete(key);
        });
    }

    async clear() {
        return this.with_object_store('readwrite', store => {
            store.clear();
        });
    }

    async keys() {
        let req;
        await this.with_object_store('readonly', store => {
            req = store.getAllKeys();
        });
        return req.result;
    }
}

;// CONCATENATED MODULE: ./src/storage.js



// db_key_settings uses a UUID, but this must be constant,
// not generated each time the system is loaded.
const db_key_settings = 'settings-6c32f9d6-796c-4588-8a4b-35165a13d14d';

// db_key_recents uses a UUID, but this must be constant,
// not generated each time the system is loaded.
const db_key_recents = 'recents-40c4dfe4-2aa5-4ac9-9143-80c93b7e0ed8';

const storage_db = new IndexedDBInterface();


/***/ }),

/***/ 7098:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   VI: () => (/* binding */ get_theme_settings)
/* harmony export */ });
/* unused harmony exports theme_settings_updated_events, update_document_dark_state */
/* harmony import */ var _lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6092);
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(984);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6973);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__]);
_lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
const current_script_url = "file:///home/ed/code/logbook/src/theme-settings/_.js";  // save for later








// === THEME SETTINGS INTERFACE ===

const dark_mode_media_query_list = globalThis.matchMedia("(prefers-color-scheme: dark)");

function get_theme_settings() {
    // return a new copy to insulate receivers from each others' modifications
    return {
        shouldUseDarkColors: dark_mode_media_query_list.matches,
    };
}

dark_mode_media_query_list.addEventListener('change', function (event) {
    theme_settings_updated_events.dispatch();
});


// === EVENT INTERFACE ===

const theme_settings_updated_events = new _lib_sys_subscribable_js__WEBPACK_IMPORTED_MODULE_0__/* .Subscribable */ .l();


// === DOCUMENT DARK THEME SETTING ===

// add theme-settings/theme-colors.css stylesheet
const theme_colors_stylesheet_url = new URL('theme-colors.css', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_2__/* .assets_server_url */ .h)(current_script_url));
(0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_1__/* .create_stylesheet_link */ .KP)(document.head, theme_colors_stylesheet_url);

const dark_mode_class = 'dark';

const root_element = document.documentElement;

function update_document_dark_state(dark_state) {
    if (dark_state) {
        root_element.classList.add(dark_mode_class);
    } else {
        root_element.classList.remove(dark_mode_class);
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 2358:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   O: () => (/* binding */ ToggleSwitchElement)
/* harmony export */ });
/* harmony import */ var _lib_sys_event_listener_manager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9886);
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(984);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6973);
const current_script_url = "file:///home/ed/code/logbook/src/toggle-switch-element/_.js";  // save for later








class ToggleSwitchElement extends HTMLElement {
    static custom_element_name = 'toggle-switch';

    static create(options=null) {
        const {
            parent,
            class: cls,
            title_for_on,
            title_for_off,
            svg,
        } = (options ?? {});
        const control = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_element */ .T1)({
            parent,
            tag: this.custom_element_name,
            attrs: {
                class: cls,
                role: 'switch',
                "aria-checked": false,
                title: title_for_off,
            },
        });
        control.#event_listener_manager.add(control, 'change', (event) => {
            control.title = control.get_state() ? title_for_on : title_for_off;
        });
        return control;
    }

    constructor() {
        super();
//        this.setAttribute('role', 'switch');
//        this.setAttribute('aria-checked', this.get_state());  // ensure 'aria-checked' is set
        this.#event_listener_manager = new _lib_sys_event_listener_manager_js__WEBPACK_IMPORTED_MODULE_2__/* .EventListenerManager */ .w();
        this.#event_listener_manager.add(this, 'click', (event) => {
            this.set_state();
        });
    }
    #event_listener_manager;

    get_state() {
        return (this.getAttribute('aria-checked') === 'true');
    }

    set_state(new_state=null) {
        const old_state = this.get_state();
        new_state ??= !old_state;  // if no argument, then toggle state
        new_state = !!new_state;
        this.setAttribute('aria-checked', new_state);
        if (old_state !== new_state) {
            this.dispatchEvent(new Event('change'));
        }
    }


    // === WEB COMPONENT LIFECYCLE ===

    // connectedCallback:
    //     Invoked each time the custom element is appended into a document-connected element.
    //     This will happen each time the node is moved, and may happen before the element's contents have been fully parsed.
    //     Note: connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
    connectedCallback() {
        this.#event_listener_manager.reattach();
    }

    // disconnectedCallback:
    //     Invoked each time the custom element is disconnected from the document's DOM.
    disconnectedCallback() {
        // event handlers have been disconnected, but just leave things alone so we can reconnect
    }

    // adoptedCallback:
    //     Invoked each time the custom element is moved to a new document.
    adoptedCallback() {
        this.#event_listener_manager.reattach();
    }

    // attributeChangedCallback:
    //     Invoked each time one of the custom element's attributes is added, removed, or changed.
    //     Which attributes to notice change for is specified in a static get observedAttributes method
    attributeChangedCallback(name, old_value, new_value) {
        switch (name) {
        case 'xyzzy': {
            //!!!
            break;
        }
        }
        //!!!
    }

    static get observedAttributes() {
        return [
            'xyzzy',//!!!
        ];
    }


    // === INTERNAL ===

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        globalThis.customElements.define(this.custom_element_name, this);
        //!!! should we assume that the document is ready here?
        (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_0__/* .create_stylesheet_link */ .KP)(document.head, new URL('style.css', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_1__/* .assets_server_url */ .h)(current_script_url)));
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
ToggleSwitchElement._init_static();


/***/ }),

/***/ 3653:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   d: () => (/* binding */ ToolBarElement)
/* harmony export */ });
/* harmony import */ var _toggle_switch_element_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2358);
/* harmony import */ var _lib_sys_event_listener_manager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(9886);
/* harmony import */ var _evaluator_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9026);
/* harmony import */ var _lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(984);
/* harmony import */ var _assets_server_url_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6973);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_evaluator_js__WEBPACK_IMPORTED_MODULE_1__]);
_evaluator_js__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
const current_script_url = "file:///home/ed/code/logbook/src/tool-bar-element/_.js";  // save for later












class ToolBarElement extends HTMLElement {
    static custom_element_name = 'tool-bar';

    static indicator_control__class            = 'tool-bar-indicator';
    static indicator_control__attribute__value = 'data-indicator-value';

    static toggle_switch__editable__class = 'tool-bar-toggle-editable';
    static toggle_switch__visible__class  = 'tool-bar-toggle-visible';
    static toggle_switch__autoeval__class = 'tool-bar-toggle-autoeval';

    /** create a new ToolBarElement in the document, then set target with options
     *  @param {any} target
     *  @param {Object|null|undefined} options to be passed to set_target()
     *  @return {ToolBarElement} tool bar element
     */
    static create_for(target, options) {
        const tool_bar = document.createElement(this.custom_element_name);
        if (!tool_bar) {
            throw new Error('error creating tool bar');
        }
        try {
            tool_bar.set_target(target, options);
            return tool_bar;
        } catch (error) {
            tool_bar.remove();
            throw error;
        }
    }

    constructor() {
        super();
        this.#target = null;
        this.#event_listener_manager = new _lib_sys_event_listener_manager_js__WEBPACK_IMPORTED_MODULE_4__/* .EventListenerManager */ .w();
        this.#reset_configuration();
        this.addEventListener('pointerdown', (event) => {
            this.#target.focus();
            if (event.target instanceof ToolBarElement) {
                // stop event only if target is directly a ToolBarElement, not one of its children
                event.preventDefault();
                event.stopPropagation();
            }
        });  // this listener is never removed
    }
    #event_listener_manager;
    #controls;  // name -> { name?, control?, get?, set?}

    set_type(type) {
        this.set_for('type', type);
    }


    // === TARGET ===

    #target;

    /** @return {any} current target
     */
    get target (){ return this.#target; }

    /** set the target for this tool bar
     *  @param {any} target
     *  @param {Object|null|undefined} options: {
     *      editable?: { initial?, on? },
     *      visible?,  { initial?, on? },
     *      autoeval?, { initial?, on? },
     *      type?,     { initial?, on? },
     *      running?,  { initial?, on? },
     *      modified?, { initial?, on? },
     *      run?,      { initial?, on? },
     *  }
     * A prior target, if any, is silently replaced.
     */
    set_target(target, options=null) {
        if (target !== null && typeof target !== 'undefined' && !(target instanceof EventTarget)) {
            throw new Error('target must be null, undefined, or and instance of EventTarget');
        }
        if (!target) {
            this.#target = null;
            this.#reset_configuration();
        } else {
            if (this.#target !== target) {
                this.#target = target;
                this.#configure(options);
            }
        }
    }

    get_for(name, value) {
        if (!(name in this.#controls)) {
            throw new Error('unknown name');
        }
        return this.#controls[name].get();
    }
    set_for(name, value) {
        if (!(name in this.#controls)) {
            throw new Error('unknown name');
        }
        this.#controls[name].set(value);
    }


    // === CONFIGURATION ===

    /** set up controls, etc according to options
     *  @param {Object|null|undefined} options from set_target()
     */
    #configure(options=null) {
        options ??= {};
        this.#reset_configuration();
        try {
            for (const [ name, create, getter, setter ] of this.#get_control_setup()) {
                let control_options = options[name];
                if (control_options) {
                    if (typeof control_options !== 'object') {
                        control_options = {};
                    }

                    const control = create(control_options.on);
                    if ('initial' in control_options) {
                        setter(control, control_options.initial);
                    }

                    this.#controls[name] = {
                        name,
                        control,
                        get: getter.bind(ToolBarElement, control),
                        set: setter.bind(ToolBarElement, control),
                    };
                }
            }
        } catch (error) {
            this.#reset_configuration();
            throw error;
        }
    }

    #reset_configuration() {
        this.#event_listener_manager.remove_all();
        (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_2__/* .clear_element */ .gX)(this);
        this.#controls = {};
    }

    /** @return array of { name, create, getter, setter }
     */
    #get_control_setup() {
        return [
            // the order of this array determines order of control creation

            // NAME       CREATE_FN,                         GETTER_FN                           SETTER_FN
            [ 'running',  this.#create__running.bind(this),  this.constructor.#getter__running,  this.constructor.#setter__running  ],
            [ 'modified', this.#create__modified.bind(this), this.constructor.#getter__modified, this.constructor.#setter__modified ],
            [ 'editable', this.#create__editable.bind(this), this.constructor.#getter__editable, this.constructor.#setter__editable ],
            [ 'visible',  this.#create__visible.bind(this),  this.constructor.#getter__visible,  this.constructor.#setter__visible  ],
            [ 'autoeval', this.#create__autoeval.bind(this), this.constructor.#getter__autoeval, this.constructor.#setter__autoeval ],
            [ 'run',      this.#create__run.bind(this),      this.constructor.#getter__run,      this.constructor.#setter__run      ],
            [ 'type',     this.#create__type.bind(this),     this.constructor.#getter__type,     this.constructor.#setter__type     ],
        ];
    }


    // === CONTROL HANDLING ===

    #create__editable(on_change_handler=null) {
        const control = _toggle_switch_element_js__WEBPACK_IMPORTED_MODULE_0__/* .ToggleSwitchElement */ .O.create({
            parent: this,
            class:  this.constructor.toggle_switch__editable__class,
            title_for_on:  'edit mode on',
            title_for_off: 'edit mode off',
        });
        control.innerHTML = `\
<?xml version="1.0" encoding="UTF-8"?>
<!--
    Adapted from: https://commons.wikimedia.org/wiki/File:Ei-pencil.svg
    Alexander Madyankin, Roman Shamin, MIT <http://opensource.org/licenses/mit-license.php>, via Wikimedia Commons
-->
<svg
  xmlns="http://www.w3.org/2000/svg"
  version="1.1"
  viewBox="0 0 50 50"
>
  <path class="accent-fill" d="M9.6 40.4 l2.5 -9.9 L27 15.6 l7.4 7.4 -14.9 14.9 -9.9 2.5z m4.3 -8.9 l-1.5 6.1 6.1 -1.5 L31.6 23 27 18.4 13.9 31.5z"/>
  <path class="accent-fill" d="M17.8 37.3 c-.6 -2.5 -2.6 -4.5 -5.1 -5.1 l.5 -1.9 c3.2 .8 5.7 3.3 6.5 6.5 l-1.9 .5z"/>
  <path class="accent-fill" d="M29.298 19.287 l1.414 1.414 -13.01 13.02 -1.414 -1.412z"/>
  <path class="accent-fill" d="M11 39 l2.9 -.7 c-.3 -1.1 -1.1 -1.9 -2.2 -2.2 L11 39z"/>
  <path class="accent-fill" d="M35 22.4 L27.6 15 l3-3 .5.1 c3.6 .5 6.4 3.3 6.9 6.9 l.1 .5 -3.1 2.9z M30.4 15 l4.6 4.6 .9 -.9 c-.5 -2.3 -2.3 -4.1 -4.6 -4.6 l-.9 .9z"/>
</svg>
`;
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        return control;
    }
    static #getter__editable(control)        { return control.get_state(); }
    static #setter__editable(control, value) { control.set_state(value); }

    #create__visible(on_change_handler=null) {
        const control = _toggle_switch_element_js__WEBPACK_IMPORTED_MODULE_0__/* .ToggleSwitchElement */ .O.create({
            parent: this,
            class:  this.constructor.toggle_switch__visible__class,
            title_for_on:  'visible',
            title_for_off: 'not visible',
        });
        control.innerHTML = `\
<?xml version="1.0" encoding="UTF-8"?>
<!--
    Adapted from: https://commons.wikimedia.org/wiki/File:ISO_7000_-_Ref-No_2030.svg
    Vectorization:  Mrmw, CC0, via Wikimedia Commons
-->
<svg
  xmlns="http://www.w3.org/2000/svg"
  version="1.1"
  viewBox="0 0 200 170"
>
  <path class="accent-stroke" stroke="#000" stroke-width="5" fill="transparent"
    d="m100 49.738 a97.452 97.452 0 0 0 -78.246 39.775 97.452 97.452 0 0 0 78.246 39.773 97.452 97.452 0 0 0 78.396 -39.975 97.452 97.452 0 0 0 -78.396 -39.574z"
  />
  <circle class="accent-stroke accent-fill" stroke="#000" stroke-width="5"
    cx="100" cy="89.438" r="19.85"
  />
</svg>
`;
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        return control;
    }
    static #getter__visible(control)        { return control.get_state(); }
    static #setter__visible(control, value) { control.set_state(value); }

    #create__autoeval(on_change_handler=null) {
        const control = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_2__/* .create_element */ .T1)({
            parent: this,
            tag: 'input',
            attrs: {
                type: 'checkbox',
                title: 'autoeval...',
            },
        });
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        this.#event_listener_manager.add(control, 'change', (event) => {
            control.title = control.checked ? 'autoeval off...' : 'autoeval on...';
        });
        return control;
    }
    static #getter__autoeval(control)        { return control.checked; }
    static #setter__autoeval(control, value) { control.checked = !!value; }

    #create__type(on_change_handler=null) {
        const control = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_2__/* .create_element */ .T1)({
            parent: this,
            tag: 'select',
            attrs: {
                title: 'type...',
            },
        });

        const types = new Set((0,_evaluator_js__WEBPACK_IMPORTED_MODULE_1__/* .get_evaluator_classes */ .P)().map(e => e.handled_input_types).flat()).values();
        let subsequent = false;
        for (const type of types) {
            (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_2__/* .create_element */ .T1)({
                parent: control,
                tag: 'option',
                attrs: {
                    title: 'type...',
                    label: type,
                    ...(subsequent ? {} : { selected: !subsequent }),  // first entry is default
                    value: type,
                },
            });
            subsequent = true;
        }

        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        this.#event_listener_manager.add(control, 'change', (event) => {
            control.title = `type ${control.value}`;
        });
        return control;
    }
    static #getter__type(control)        { return control.value; }
    static #setter__type(control, value) {
        if (![ ...control.options ].map(option => option.value).includes(value)) {  //!!! what a kludge...
            throw new Error('setting unknown/illegal value');
        }
        control.value = value;
    }

    #create__running(on_change_handler=null) {
        return this.#indicator_control__create_with_class_and_title('running', 'running...', 'done...', on_change_handler);
    }
    static #getter__running(control)        { return this.#indicator_control__getter(control); }
    static #setter__running(control, value) { this.#indicator_control__setter(control, value); }

    #create__modified(on_change_handler=null) {
        return this.#indicator_control__create_with_class_and_title('modified', 'modified...', 'not modified...', on_change_handler);
    }
    static #getter__modified(control)        { return this.#indicator_control__getter(control); }
    static #setter__modified(control, value) { this.#indicator_control__setter(control, value); }

    #create__run(on_change_handler=null) {
        //!!!
    }
    static #getter__run(control) {
        //!!!
    }
    static #setter__run(control, value) {
        //!!!
    }

    // indicator control getter/setter
    #indicator_control__create_with_class_and_title(css_class, title_for_on, title_for_off, on_change_handler=null) {
        const control = (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_2__/* .create_element */ .T1)({
            parent: this,
            attrs: {
                title: title_for_off,
                class: `${this.constructor.indicator_control__class} ${css_class}`,
            },
        });
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        this.#event_listener_manager.add(control, 'change', (event) => {
            control.title = this.constructor.#indicator_control__getter(control) ? title_for_on : title_for_off;
        });
        return control;
    }
    static #indicator_control__getter(control) {
        return !!control.getAttribute(this.indicator_control__attribute__value);
    }
    static #indicator_control__setter(control, value) {
        const current_value = this.#indicator_control__getter(control);
        if (value !== current_value) {
            control.setAttribute(this.indicator_control__attribute__value, (value ? 'on' : ''));
            // dispatch "change" event
            const event = new Event('change', {});
            control.dispatchEvent(event);
        }
    }


    // === WEB COMPONENT LIFECYCLE ===

    // connectedCallback:
    //     Invoked each time the custom element is appended into a document-connected element.
    //     This will happen each time the node is moved, and may happen before the element's contents have been fully parsed.
    //     Note: connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
    connectedCallback() {
        this.#event_listener_manager.reattach();
    }

    // disconnectedCallback:
    //     Invoked each time the custom element is disconnected from the document's DOM.
    disconnectedCallback() {
        // event handlers have been disconnected, but just leave things alone so we can reconnect
    }

    // adoptedCallback:
    //     Invoked each time the custom element is moved to a new document.
    adoptedCallback() {
        this.#event_listener_manager.reattach();
    }

    // attributeChangedCallback:
    //     Invoked each time one of the custom element's attributes is added, removed, or changed.
    //     Which attributes to notice change for is specified in a static get observedAttributes method
    attributeChangedCallback(name, old_value, new_value) {
        switch (name) {
        case 'xyzzy': {
            //!!!
            break;
        }
        }
        //!!!
    }

    static get observedAttributes() {
        return [
            'xyzzy',//!!!
        ];
    }


    // === INTERNAL ===

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        globalThis.customElements.define(this.custom_element_name, this);
        //!!! should we assume that the document is ready here?
        (0,_lib_ui_dom_util_js__WEBPACK_IMPORTED_MODULE_2__/* .create_stylesheet_link */ .KP)(document.head, new URL('style.css', (0,_assets_server_url_js__WEBPACK_IMPORTED_MODULE_3__/* .assets_server_url */ .h)(current_script_url)));
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
ToolBarElement._init_static();

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/async module */
/******/ 	(() => {
/******/ 		var webpackQueues = typeof Symbol === "function" ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 		var webpackExports = typeof Symbol === "function" ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var webpackError = typeof Symbol === "function" ? Symbol("webpack error") : "__webpack_error__";
/******/ 		var resolveQueue = (queue) => {
/******/ 			if(queue && queue.d < 1) {
/******/ 				queue.d = 1;
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 				if(dep[webpackQueues]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					queue.d = 0;
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						resolveQueue(queue);
/******/ 					}, (e) => {
/******/ 						obj[webpackError] = e;
/******/ 						resolveQueue(queue);
/******/ 					});
/******/ 					var obj = {};
/******/ 					obj[webpackQueues] = (fn) => (fn(queue));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 			ret[webpackQueues] = x => {};
/******/ 			ret[webpackExports] = dep;
/******/ 			return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			var queue;
/******/ 			hasAwait && ((queue = []).d = -1);
/******/ 			var depQueues = new Set();
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = resolve;
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 			module.exports = promise;
/******/ 			body((deps) => {
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn;
/******/ 				var getResult = () => (currentDeps.map((d) => {
/******/ 					if(d[webpackError]) throw d[webpackError];
/******/ 					return d[webpackExports];
/******/ 				}))
/******/ 				var promise = new Promise((resolve) => {
/******/ 					fn = () => (resolve(getResult));
/******/ 					fn.r = 0;
/******/ 					var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 					currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 				});
/******/ 				return fn.r ? promise : getResult();
/******/ 			}, (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue)));
/******/ 			queue && queue.d < 0 && (queue.d = 0);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(7027);
/******/ 	
/******/ })()
;