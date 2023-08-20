import {
    EditorCellElement,
} from './editor-cell-element/_.js';

import {
    EvalCellElement,
} from './eval-cell-element/_.js';

import {
    ToolBarElement,
} from './tool-bar-element/_.js';

import {
    get_menubar_spec,
} from './global-bindings.js';

import {
    Subscribable,
} from '../lib/sys/subscribable.js';

import {
    get_config,
    set_config,
} from './config.js';

import {
    show_initialization_failed,
    create_element,
    clear_element,
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

import {
    assets_server_url,
} from './assets-server-url.js';


// import {
//     create_stylesheet_link,
// } from '../lib/ui/dom-util.js';
// {
//     const server_url = assets_server_url(current_script_url);  // current_script_url is from initial import.meta.url
//     create_stylesheet_link(document.head, new URL('./style.css',       server_url));
//     create_stylesheet_link(document.head, new URL('./style-hacks.css', server_url));
// }
import './style.css';        // webpack implementation
import './style-hacks.css';  // webpack implementation


// Note: Each eval-cell maintains its own key_event_manager and key maps.
// Therefore the (active) eval-cell is the locus for incoming commands,
// whether from the menu or the keyboard.  The eval-cell in effect "precompiles"
// command dispatch in eval_cell.get_command_bindings().


export class LogbookManager {
    static get singleton() {
        if (!this.#singleton) {
            this.#singleton = new this();
            this.#singleton.initialize();
        }
        return this.#singleton;
    }
    static #singleton;

    constructor() {
        this.#editable = false;
        this.#active_cell = null;
        this.#initialize_called = false;
        this.reset_global_eval_context();
        this.#eval_states = new Subscribable();
        //!!! this.#eval_states_subscription is never unsubscribed
        this.#eval_states_subscription = this.#eval_states.subscribe(this.#eval_states_observer.bind(this));

    }
    #editable;
    #active_cell;
    #initialize_called;
    #header_element;  // element inserted into document by initialize() to hold menus, etc
    #main_element;    // element wrapped around original body content by initialize()
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

    get header_element (){ return this.#header_element; }
    get main_element   (){ return this.#main_element; }

    get global_eval_context (){ return this.#global_eval_context; }
    reset_global_eval_context() {
        this.#global_eval_context = {};
    }

    async get_config()       { return get_config(); }
    async set_config(config) { return set_config(config); }

    /** reset the document, meaning that all cells will be reset,
     *  and this.global_eval_context will be reset.  Also, the
     *  saved file handle this.#file_handle set to undefined.
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
        clear_element(this.main_element);
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

            // establish this.#main_element / this.main_element
            this.#initialize_document_structure();

            this.#setup_csp();
            this.#setup_header();

            this.set_editable(this.editable);  // update all cells consistently

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

            // Set up this.#global_change_manager now so that it is available
            // during initialization of cells.  It will be reset when document
            // initialization is complete.
            this.#global_change_manager = new ChangeManager(this.main_element, {
                neutral_changes_observer: this.#neutral_changes_observer.bind(this),
            });

            // add "save before quit" prompt for when document is being closed while modified
            window.addEventListener('beforeunload', (event) => {
                if (!this.#global_change_manager.is_neutral()) {
                    event.preventDefault();
                    return (event.returnValue = '');
                }
            });  //!!! event handler never removed

            // make dblclick on top-level tool-bar toggle editable
            document.body.addEventListener('dblclick', (event) => {
                const target_is_tool_bar = event.target instanceof ToolBarElement;  // handle only if target is directly a the tool-bar, not one of its children
                const target_is_header = (event.target === this.header_element);
                if (target_is_tool_bar || target_is_header) {
                    // event will be handled
                    const target_is_top_level_tool_bar = target_is_tool_bar && (event.target.parentElement === this.header_element);
                    if (target_is_header || target_is_top_level_tool_bar) {
                        this.set_editable(!this.editable);
                    } else {  // !target_is_header && !target_is_top_level_tool_bar && target_is_tool_bar
                        const cell = event.target.target;
                        cell.set_visible(!cell.visible);
                    }

                    event.preventDefault();
                    event.stopPropagation();
                }
            }, {
                capture: true,
            });  //!!! event handler never removed

            // send keydown events destined for document.body to the active cell's key_event_manager
            document.body.addEventListener('keydown', (event) => {
                if (event.target === document.body) {
                    this.active_cell?.inject_key_event(event);
                    event.preventDefault();
                    event.stopPropagation();
                }
            });  //!!! event handler never removed

            // set baseline for undo/redo
            // it is important that all async operations have finished before getting here
            this.#global_change_manager.set_neutral();

        } catch (error) {

            show_initialization_failed(error);

        }
    }

    /** create a new cell in the document
     *  @param (Object|null|undefined} options
     *  @return {EvalCellElement} cell
     * options is passed to EvalCellElement.create_cell() but
     * with parent overridden to this.main_element.
     */
    create_cell(options=null) {
        return EvalCellElement.create_cell({
            ...(options ?? {}),
            parent: this.main_element,
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


    // === DOCUMENT UTILITIES ===

    static header_element_tag = 'header';
    static main_element_tag   = 'main';

    // put everything in the body into a new top-level main element
    #initialize_document_structure() {
        if (document.querySelector(this.constructor.header_element_tag)) {
            throw new Error(`bad format for document: element with id ${this.constructor.header_element_tag} already exists`);
        }
        if (document.querySelector(this.constructor.main_element_tag)) {
            throw new Error(`bad format for document: element with id ${this.constructor.main_element_tag} already exists`);
        }

        // establish favicon
        if (!document.querySelector('link[rel="icon"]')) {
            create_element({
                parent: document.head,
                tag:    'link',
                attrs: {
                    rel: 'icon',
                    href: assets_server_url('dist/favicon.ico'),
                },
            });
        }
        // establish body element if not already present
        if (!document.body) {
            document.documentElement.appendChild(document.createElement('body'));
            // document.body is now set
        }
        // create the main element and move the current children of the body to it
        this.#main_element = document.createElement(this.constructor.main_element_tag);
        while (document.body.firstChild) {
            this.#main_element.appendChild(document.body.firstChild);  // moves document.body.firstChild
        }
        // create header element
        this.#header_element = document.createElement(this.constructor.header_element_tag);
        // add header and main elements
        document.body.appendChild(this.#header_element);
        document.body.appendChild(this.#main_element);

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
        const queried_main_element = document.querySelector(this.constructor.main_element_tag);
        if (!queried_main_element || queried_main_element !== this.main_element) {
            throw new Error('bad format for document');
        }
        if (!this.main_element) {
            throw new Error('bad format for document: this.main_element not set');
        }
        const query_selector = [
            EvalCellElement.custom_element_name,
            `.${EvalCellElement.output_element_class}`,
        ].join(' ');
        const contents = [ ...this.main_element.querySelectorAll(query_selector) ]
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

    #setup_csp(enabled=false) {
        if (enabled) {

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
        }
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

    #setup_header() {
        if (!this.header_element) {
            throw new Error(`bad format for document: header element does not exist`);
        }
        const get_command_bindings = () => EvalCellElement.get_initial_key_map_bindings();
        const get_recents = null;//!!! implement this
        this.#menubar = MenuBar.create(this.header_element, get_menubar_spec(), get_command_bindings, get_recents);
        //!!! this.#menubar_commands_subscription is never unsubscribed
        this.#menubar_commands_subscription = this.#menubar.commands.subscribe(this.#menubar_commands_observer.bind(this));
        //!!! this.#menubar_selects_subscription is never unsubscribed
        this.#menubar_selects_subscription = this.#menubar.selects.subscribe(this.update_menu_state.bind(this));

        // add a tool-bar element to the header document
        this.#tool_bar = ToolBarElement.create_for(this.#header_element, {
            editable: { initial: this.editable,  on: (event) => this.set_editable(event.target.get_state()) },
            //!!!autoeval: { initial: this.autoeval,  on: (event) => this.set_autoeval(!this.autoeval) },//!!!
            modified: true,
            running:  true,
        });
        this.#header_element.appendChild(this.#tool_bar);
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


    // === NEUTRAL CHANGES OBSERVER ===

    #neutral_changes_observer(data) {
        const {
            neutral,
        } = data;
        this.#tool_bar.set_for('modified', !neutral);
        this.#menubar.set_menu_state('save', { enabled: !neutral });
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
        if (!this.editable) {
            return false;
        }
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
            const next_cell = cell.adjacent_cell(true) ?? this.create_cell();
            next_cell.focus();
            return true;
        }
    }

    /** reset global eval context and then eval all cells in the document
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
                iter_cell.focus();
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

    /** stop all running evaluations, reset global eval context and then eval all cells in the document
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
            for (const iter_cell of this.constructor.get_cells()) {
                iter_cell.focus();
                await iter_cell.eval({
                    eval_context: this.global_eval_context,
                });
            }
            return true;
        }
    }

    /** stop evaluation for the active cell.
     *  @return {Boolean} true iff command successfully handled
     */
    command_handler__stop(command_context) {
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
        if (!this.editable) {
            return false;
        }
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
        if (!this.editable) {
            return false;
        }
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
        if (!this.editable) {
            return false;
        }
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
        if (!this.editable) {
            return false;
        }
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
        if (!this.editable) {
            return false;
        }
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
    command_handler__undo(command_context) {
        return this.#global_change_manager?.perform_undo();
    }

    /** @return {Boolean} true iff command successfully handled
     */
    command_handler__redo(command_context) {
        return this.#global_change_manager?.perform_redo();
    }
}
