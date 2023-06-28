const current_script_url = import.meta.url;  // save for later

import {
    EditorCellElement,  // also ensures that the "editor-cell" custom element has been defined
} from './editor-cell-element/_.js';

import {
    EvalCellElement,  // also ensures that the "eval-cell" custom element has been defined
} from './eval-cell-element/_.js';

import {
    StatusBarElement,  // also ensures that the "status-bar" custom element has been defined
} from './status-bar-element/_.js';

import {
    Subscribable,
} from '../lib/sys/subscribable.js';

import {
    show_initialization_failed,
    create_element,
    clear_element,
    create_stylesheet_link,
} from '../lib/ui/dom-util.js';

import {
    MenuBar,
} from '../lib/ui/menu/_.js';

import {
    ChangeManager,
} from '../lib/ui/change-manager.js';

import {
    fs_interface,
} from '../lib/sys/fs-interface.js';

import {
    SettingsDialog,
} from './settings-dialog/_.js';

import {
    beep,
} from '../lib/ui/beep.js';


// Note: Each eval-cell maintains its own key_event_manager and key maps.
// Therefore the (active) eval-cell is the locus for incoming commands,
// whether from the menu or the keyboard.  The eval-cell in effect "precompiles"
// command dispatch in eval_cell.get_command_bindings().


class LogbookManager {
    constructor() {
        this.#editable = false;
        this.#active_cell = null;
        this.#initialize_logbook_called = false;
        this.reset_global_eval_context();
        this.#eval_states = new Subscribable();
        //!!! this.#eval_states_subscription is never unsubscribed
        this.#eval_states_subscription = this.#eval_states.subscribe(this.#eval_states_observer.bind(this));

    }
    #editable;
    #active_cell;
    #initialize_logbook_called;
    #controls_element;  // element inserted into document by initialize_logbook() to hold menus, etc
    #content_element;   // element wrapped around original body content by initialize_logbook()
    #eval_states;
    #eval_states_subscription;
    #menubar;
    #menubar_commands_subscription;
    #menubar_selects_subscription;
    #status_bar;
    #global_eval_context;  // persistent eval_context for eval commands
    #global_change_manager;
    #file_handle;

    get editable (){ return this.#editable }
    set_editable(editable) {
        editable = !!editable;
        this.#editable = editable;
        this.#status_bar.set_for('editable', editable);
        this.#menubar.set_menu_state('toggle-editable', { checked: editable });
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
    async clear() {
        clear_element(this.content_element);
        const first_cell = await this.create_cell();
        first_cell.focus();
    }

    stop() {
        for (const cell of this.constructor.get_cells()) {
            cell.stop();
        }
    }

    async initialize_logbook() {
        if (this.#initialize_logbook_called) {
            throw new Error('initialize_logbook() called more than once');
        }
        this.#initialize_logbook_called = true;

        try {

            // establish this.#content_element / this.content_element
            await this.#initialize_document_structure();

            // add top-level stylesheets
            create_stylesheet_link(document.head, new URL('style.css', current_script_url));
            create_stylesheet_link(document.head, new URL('style-hacks.css', current_script_url));

            await this.#setup_csp();
            await this.#setup_controls();

            // validate structure of document
            const cells = this.constructor.get_cells();
            if (cells.length > 0) {
                //!!! improve this !!!
            }

            // set up active cell
            // ... find the first incoming "active" cell, or the first cell, or create a new cell
            const active_cell = cells.find(cell => cell.active) ?? cells[0] ?? await this.create_cell();
            this.set_active_cell(active_cell);  // also resets "active" status on all cells except for active_cell
            active_cell.focus();

            this.set_editable(this.editable);  // update all cells consistently

            // set baseline for undo/redo
            // use setTimeout() so that pending mutations are processed
            // before resetting
//!!! horrible kludge with setTimeout() to wait until DOM changes have completed....
while (!document.getElementById(active_cell.id)) { console.warn('--- WAITING---'); await new Promise(resolve => queueMicrotask(resolve)); }//!!!
            await new Promise(resolve => setTimeout(resolve, 200));//!!!
            //!!! setting up later now, still ok?
            // Set up this.#global_change_manager now so that it is available
            // during initialization of cells.  It will be reset when document
            // initialization is complete.
            this.#global_change_manager = new ChangeManager(this.content_element, {
                neutral_changes_observer: this.#neutral_changes_observer.bind(this),
            });
            this.#global_change_manager.set_neutral();
            // add "save before quit" prompt for when document is being closed while modified
            window.addEventListener('beforeunload', (event) => {
                if (!this.#global_change_manager.is_neutral) {
                    event.preventDefault();
                    return (event.returnValue = '');
                }
            });  //!!! event handler never removed

        } catch (error) {

            show_initialization_failed(error);

        }
    }

    /** create a new cell in the document
     *  @param (Object|null|undefined} options
     *  @return {EvalCellElement} cell
     * options is passed to EvalCellElement.create_cell() but
     * with parent overridden to this.content_element.
     */
    async create_cell(options=null) {
        return EvalCellElement.create_cell({
            ...(options ?? {}),
            parent: this.content_element,
        });
    }

    /** return an ordered list of the cells in the document
     *  @return {Array} all cells in the document
     */
    static get_cells() {
        return [
            ...document.getElementsByTagName(EditorCellElement.custom_element_name),
            ...document.getElementsByTagName(EvalCellElement.custom_element_name),
        ];
    }


    // === DOCUMENT UTILITIES FOR LOAD/SAVE ===

    static controls_element_id = 'controls';
    static content_element_id  = 'content';

    // put everything this the body into a top-level content element
    async #initialize_document_structure() {
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

        // add a status-bar element to each pre-existing cell
        for (const cell of this.constructor.get_cells()) {
            await cell.establish_status_bar();
        }
    }

    #save_serializer() {
        const queried_content_element = document.getElementById(this.constructor.content_element_id);
        if (!queried_content_element || queried_content_element !== this.content_element) {
            throw new Error('bad format for document');
        }
        const contents = [ ...this.content_element?.querySelectorAll(`${EvalCellElement.custom_element_name}, .${EvalCellElement.output_element_class}`) ]
              .map(e => e.outerHTML)
              .join('\n');
        return `\
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <script type="module" src="/src/init.js"></script>
</head>
<body>
${contents}
</body>
</html>
`;
}

    async #setup_csp() {
/* !!! necessary? !!!

        // === CONTENT SECURITY POLICY ===

        // set a Content-Security-Policy that will permit us
        // to dynamically load associated content

        const csp_header_content = [
            //!!! audit this !!!
            "default-src 'self' 'unsafe-eval'",
            "style-src   'self' 'unsafe-inline' *",
            "script-src  'self' 'unsafe-inline' 'unsafe-eval' *",
            "img-src     'self' data: blob: *",
            "media-src   'self' data: blob: *",
            "connect-src data:",
        ].join('; ');

        create_element({
            parent: document.head,
            tag:    'meta',
            attrs: {
                "http-equiv": "Content-Security-Policy",
                "content":    csp_header_content,
            },
        });
*/
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

    async #setup_controls() {
        if (!this.controls_element) {
            throw new Error(`bad format for document: controls element does not exist`);
        }
        const get_command_bindings = () => EvalCellElement.get_initial_key_map_bindings();
        const get_recents = null;//!!! implement this
        this.#menubar = await MenuBar.create(this.controls_element, this.constructor.#get_menubar_spec(), get_command_bindings, get_recents);
        //!!! this.#menubar_commands_subscription is never unsubscribed
        this.#menubar_commands_subscription = this.#menubar.commands.subscribe(this.#menubar_commands_observer.bind(this));
        //!!! this.#menubar_selects_subscription is never unsubscribed
        this.#menubar_selects_subscription = this.#menubar.selects.subscribe(this.update_menu_state.bind(this));

        // add a status-bar element to the main document
        this.#status_bar = await StatusBarElement.create_for(this.controls_element, {
            editable: { initial: this.editable,  on: (event) => this.set_editable(!this.editable) },
            autoeval: { initial: this.autoeval,  on: (event) => this.set_autoeval(!this.autoeval) },//!!!
            modified: true,
            running:  true,
        });
        this.#controls_element.appendChild(this.#status_bar);
    }

    #menubar_commands_observer(command_context) {
        const target = this.active_cell;
        if (!target) {
            beep();
        } else if (!(target instanceof EditorCellElement)) {
            beep();
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
        this.#status_bar.set_for('modified', !is_neutral);
        this.#menubar.set_menu_state('save', { checked: !is_neutral });
    }


    // === EVAL STATES ===

    emit_eval_state(cell, eval_state) {
        this.#eval_states.dispatch({ cell, eval_state });
    }

    #eval_states_observer(data) {
console.log('#eval_states_observer', data);//!!!
        // data is ignored
        const {
            cell,
            eval_state,
        } = data;
        const something_running = this.constructor.get_cells().some(cell => cell.can_stop);
        this.#status_bar.set_for('running', something_running);
    }


    // === COMMAND HANDLERS ===

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__create_cell(command_context) {
        let before = null;
        const next_cell = command_context.target?.adjacent_cell?.(true);
        if (next_cell) {
            before = next_cell.get_dom_extent().first;
        }
        const cell = await this.create_cell({ before });
        if (!cell) {
            return false;
        } else {
            cell.focus();
            return true;
        }
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__reset(command_context) {
        this.reset();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__clear(command_context) {
        await this.clear();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__save(command_context) {
        const save_result = await fs_interface.save(this.#save_serializer.bind(this), {
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
        await fs_interface.save(this.#save_serializer.bind(this), {
            prompt_options: {
                suggestedName: this.get_suggested_file_name(),//!!!
            },
        });
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__show_settings_dialog(command_context) {
        SettingsDialog.run();
        return true;
    }

    /** eval target cell and refocus to next cell (or a new one if at the end of the document)
     *  @return {Boolean} true iff command successfully handled
     */
    async command_handler__eval_and_refocus(command_context) {
        const cell = command_context.target;
        if (!cell || !(cell instanceof EvalCellElement)) {
            return false;
        } else {
            await cell.eval({
                eval_context: this.global_eval_context,
            });
            const next_cell = cell.adjacent_cell(true) ?? await this.create_cell();
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
        if (!cell || !(cell instanceof EvalCellElement)) {
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
        if (!cell || !(cell instanceof EvalCellElement)) {
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
    async command_handler__stop(command_context) {
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
    async command_handler__stop_all(command_context) {
        this.stop();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__focus_up(command_context) {
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
    async command_handler__focus_down(command_context) {
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
    async command_handler__move_up(command_context) {
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
    async command_handler__move_down(command_context) {
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
    async command_handler__add_before(command_context) {
        const cell = command_context.target;
        const new_cell = await this.create_cell({
            before: cell.get_dom_extent().first,
        });
        new_cell.focus();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__add_after(command_context) {
        const cell = command_context.target;
        const new_cell = await this.create_cell({
            before: cell.get_dom_extent().last.nextSibling,
            parent: cell.parentElement,  // necessary if before is null
        });
        new_cell.focus();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__delete(command_context) {
        const cell = command_context.target;
        let next_cell = cell.adjacent_cell(true) ?? cell.adjacent_cell(false);
        cell.remove_cell();
        if (!next_cell) {
            next_cell = await this.create_cell();
        }
        next_cell.focus();
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__toggle_editable(command_context) {
        this.set_editable(!this.editable);
        return true;
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__undo(command_context) {
        return this.#global_change_manager?.perform_undo();
    }

    /** @return {Boolean} true iff command successfully handled
     */
    async command_handler__redo(command_context) {
        return this.#global_change_manager?.perform_redo();
    }
}


export const logbook_manager = new LogbookManager();
globalThis.logbook_manager = logbook_manager;//!!!
