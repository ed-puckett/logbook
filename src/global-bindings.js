import {
    LogbookManager,
} from './logbook-manager.js';

import {
    SettingsDialog,
} from './settings/_.js';

import {
    beep,
} from '../lib/ui/beep.js';


/** return the initial menu specification
 *  @return {Object} menu specification
 */
export function get_menubar_spec() {
    return [
        { label: 'File', collection: [
            { label: 'Recent logbooks', id: 'recents', collection: [
                // ...
            ] },
            '---',
            { label: 'Reset cells',    item: { command: 'reset',            }, id: 'reset' },
            { label: 'Clear document', item: { command: 'clear',            }, id: 'clear' },
            '---',
            { label: 'Save',           item: { command: 'save',             }, id: 'save' },
            { label: 'Save as...',     item: { command: 'save-as',          } },
            '---',
            { label: 'Settings...',    item: { command: 'settings',         } },
        ] },

        { label: 'Edit', collection: [
            { label: 'Undo',           item: { command: 'undo',             }, id: 'undo' },
            { label: 'Redo',           item: { command: 'redo',             }, id: 'redo' },
        ] },

        { label: 'Cell', collection: [
            { label: 'Eval',           item: { command: 'eval-and-refocus', }, id: 'eval-and-refocus' },
            { label: 'Eval and stay',  item: { command: 'eval',             }, id: 'eval' },
            { label: 'Eval before',    item: { command: 'eval-before',      }, id: 'eval-before' },
            { label: 'Eval all',       item: { command: 'eval-all',         }, id: 'eval-all' },
            '---',
            { label: 'Stop cell',      item: { command: 'stop',             }, id: 'stop' },
            { label: 'Stop all',       item: { command: 'stop-all',         }, id: 'stop-all' },
            '---',
            { label: 'Reset cell',     item: { command: 'reset-cell',       }, id: 'reset-cell' },
            '---',
            { label: 'Focus up',       item: { command: 'focus-up',         }, id: 'focus-up' },
            { label: 'Focus down',     item: { command: 'focus-down',       }, id: 'focus-down' },
            '---',
            { label: 'Move up',        item: { command: 'move-up',          }, id: 'move-up' },
            { label: 'Move down',      item: { command: 'move-down',        }, id: 'move-down' },
            { label: 'Add before',     item: { command: 'add-before',       }, id: 'add-before' },
            { label: 'Add after',      item: { command: 'add-after',        }, id: 'add-after' },
            { label: 'Delete',         item: { command: 'delete',           }, id: 'delete' },
        ] },

        { label: 'Help', collection: [
            { label: 'Help...',        item: { command: 'help',             } },
        ] },
    ];
}


/** return the initial key map bindings
 *  @return {Object} mapping from command strings to arrays of triggering key sequences
 */
export function get_global_initial_key_map_bindings() {
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

//!!!        'undo':                [ 'CmdOrCtrl-Z' ],
//!!!        'redo':                [ 'CmdOrCtrl-Shift-Z' ],
    };
}

/** return global command bindings
 *  @return {Object} mapping from command strings to functions implementing that command
 * The bindings are obtained by merging local command bindings with LogbookManager.singleton
 * command bindings.
 */
export function get_global_command_bindings() {
    const command_bindings = {
        'create-cell':      command_handler__create_cell,

        'reset':            command_handler__reset,
        'clear':            command_handler__clear,

        'save':             command_handler__save,
        'save-as':          command_handler__save_as,

        'settings':         command_handler__show_settings_dialog,

        // binding for plain old 'eval' is defined by EvalCellElement
        'eval-and-refocus': command_handler__eval_and_refocus,
        'eval-before':      command_handler__eval_before,
        'eval-all':         command_handler__eval_all,

        'stop':             command_handler__stop,
        'stop-all':         command_handler__stop_all,

        'focus-up':         command_handler__focus_up,
        'focus-down':       command_handler__focus_down,

        'move-up':          command_handler__move_up,
        'move-down':        command_handler__move_down,
        'add-before':       command_handler__add_before,
        'add-after':        command_handler__add_after,
        'delete':           command_handler__delete,

        'undo':             command_handler__undo,
        'redo':             command_handler__redo,
    };

    return command_bindings;
}


// === COMMAND HANDLERS ===

// Note that these functions prevent us from having to access LogbookManager statically.
// LogbookManager and this module depend upon each other.

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__create_cell(command_context) {
    return LogbookManager.singleton.command_handler__create_cell(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__reset(command_context) {
    return LogbookManager.singleton.command_handler__reset(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__clear(command_context) {
    return LogbookManager.singleton.command_handler__clear(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export async function command_handler__save(command_context) {
    return LogbookManager.singleton.command_handler__save(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export async function command_handler__save_as(command_context) {
    return LogbookManager.singleton.command_handler__save_as(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__show_settings_dialog(command_context) {
    SettingsDialog.run();
    return true;
}

/** eval target cell and refocus to next cell (or a new one if at the end of the document)
 *  @return {Boolean} true iff command successfully handled
 */
export async function command_handler__eval_and_refocus(command_context) {
    return LogbookManager.singleton.command_handler__eval_and_refocus(command_context);
}

/** reset global eval context and then eval all cells in the document
 *  from the beginning up to but not including the target cell.
 *  @return {Boolean} true iff command successfully handled
 */
export async function command_handler__eval_before(command_context) {
    return LogbookManager.singleton.command_handler__eval_before(command_context);
}

/** stop all running evaluations, reset global eval context and then eval all cells in the document
 *  from first to last, and set focus to the last.
 *  @return {Boolean} true iff command successfully handled
 */
export async function command_handler__eval_all(command_context) {
    return LogbookManager.singleton.command_handler__eval_all(command_context);
}

/** stop evaluation for the active cell.
 *  @return {Boolean} true iff command successfully handled
 */
export function command_handler__stop(command_context) {
    return LogbookManager.singleton.command_handler__stop(command_context);
}

/** stop all running evaluations.
 *  @return {Boolean} true iff command successfully handled
 */
export function command_handler__stop_all(command_context) {
    return LogbookManager.singleton.command_handler__stop_all(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__focus_up(command_context) {
    return LogbookManager.singleton.command_handler__focus_up(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__focus_down(command_context) {
    return LogbookManager.singleton.command_handler__focus_down(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__move_up(command_context) {
    return LogbookManager.singleton.command_handler__move_up(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__move_down(command_context) {
    return LogbookManager.singleton.command_handler__move_down(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__add_before(command_context) {
    return LogbookManager.singleton.command_handler__add_before(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__add_after(command_context) {
    return LogbookManager.singleton.command_handler__add_after(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__delete(command_context) {
    return LogbookManager.singleton.command_handler__delete(command_context);
}


/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__undo(command_context) {
    return LogbookManager.singleton.command_handler__undo(command_context);
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__redo(command_context) {
    return LogbookManager.singleton.command_handler__redo(command_context);
}
