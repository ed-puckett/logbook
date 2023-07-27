import {
    LogbookManager,
} from './logbook-manager.js';

import {
    SettingsDialog,
} from './settings-dialog/_.js';


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

        'toggle-cell-visible': [ 'Alt-M v' ],
        'toggle-editable':     [ 'Alt-M e' ],

        'undo':                [ 'CmdOrCtrl-Z' ],
        'redo':                [ 'CmdOrCtrl-Shift-Z' ],
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

        'toggle-editable':  command_handler__toggle_editable,

        'undo':             command_handler__undo,
        'redo':             command_handler__redo,
    };

    return command_bindings;
}


// === COMMAND HANDLERS ===

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__create_cell(command_context) {
    let before = null;
    const next_cell = command_context.target?.adjacent_cell?.(true);
    if (next_cell) {
        before = next_cell.get_dom_extent().first;
    }
    const cell = LogbookManager.singleton.create_cell({ before });
    if (!cell) {
        return false;
    } else {
        cell.focus();
        return true;
    }
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__reset(command_context) {
    LogbookManager.singleton.reset();
    return true;
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__clear(command_context) {
    LogbookManager.singleton.clear();
    return true;
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
    const cell = command_context.target;
    if (!cell || !(cell instanceof EvalCellElement)) {
        return false;
    } else {
        await cell.eval({
            eval_context: LogbookManager.singleton.global_eval_context,
        });
        const next_cell = cell.adjacent_cell(true) ?? LogbookManager.singleton.create_cell();
        next_cell.focus();
        return true;
    }
}

/** reset global eval context and then eval all cells in the document
 *  from the beginning up to but not including the target cell.
 *  @return {Boolean} true iff command successfully handled
 */
export async function command_handler__eval_before(command_context) {
    const cell = command_context.target;
    if (!cell || !(cell instanceof EvalCellElement)) {
        return false;
    } else {
        LogbookManager.singleton.reset_global_eval_context();
        for (const iter_cell of LogbookManager.get_cells()) {
            if (iter_cell === cell) {
                break;
            }
            await iter_cell.eval({
                eval_context: LogbookManager.singleton.global_eval_context,
            });
        }
        return true;
    }
}

/** stop all running evaluations, reset global eval context and then eval all cells in the document
 *  from first to last, and set focus to the last.
 *  @return {Boolean} true iff command successfully handled
 */
export async function command_handler__eval_all(command_context) {
    const cell = command_context.target;
    if (!cell || !(cell instanceof EvalCellElement)) {
        return false;
    } else {
        LogbookManager.singleton.stop();
        LogbookManager.singleton.reset_global_eval_context();
        let final_cell;
        for (const iter_cell of LogbookManager.get_cells()) {
            await iter_cell.eval({
                eval_context: LogbookManager.singleton.global_eval_context,
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
export function command_handler__stop(command_context) {
    const cell = command_context.target;
    if (!cell || !(cell instanceof EvalCellElement)) {
        return false;
    } else {
        cell.stop();
        return true;
    }
}

/** stop all running evaluations.
 *  @return {Boolean} true iff command successfully handled
 */
export function command_handler__stop_all(command_context) {
    LogbookManager.singleton.stop();
    return true;
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__focus_up(command_context) {
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
export function command_handler__focus_down(command_context) {
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
export function command_handler__move_up(command_context) {
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
export function command_handler__move_down(command_context) {
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
export function command_handler__add_before(command_context) {
    const cell = command_context.target;
    const new_cell = LogbookManager.singleton.create_cell({
        before: cell.get_dom_extent().first,
    });
    new_cell.focus();
    return true;
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__add_after(command_context) {
    const cell = command_context.target;
    const new_cell = LogbookManager.singleton.create_cell({
        before: cell.get_dom_extent().last.nextSibling,
        parent: cell.parentElement,  // necessary if before is null
    });
    new_cell.focus();
    return true;
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__delete(command_context) {
    const cell = command_context.target;
    let next_cell = cell.adjacent_cell(true) ?? cell.adjacent_cell(false);
    cell.remove_cell();
    if (!next_cell) {
        next_cell = LogbookManager.singleton.create_cell();
    }
    next_cell.focus();
    return true;
}

/** @return {Boolean} true iff command successfully handled
 */
export function command_handler__toggle_editable(command_context) {
    LogbookManager.singleton.set_editable(!LogbookManager.singleton.editable);
    return true;
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
