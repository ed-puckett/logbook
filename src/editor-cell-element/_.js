const current_script_url = import.meta.url;  // save for later

import {
    manage_selection_for_insert,
    manage_selection_for_delete,
    insert_at,
    delete_nearest_leaf,
    validate_parent_and_before_from_options,
    create_element,
} from '../../lib/ui/dom-util.js';

import {
    LogbookManager,
} from '../logbook-manager.js';

import {
    EventListenerManager,
} from '../../lib/sys/event-listener-manager.js';

import {
    KeyEventManager,
    KeyMap,
} from '../../lib/ui/key/_.js';

import {
    get_global_initial_key_map_bindings,
    get_global_command_bindings,
} from '../global-bindings.js';

import {
    ToolBarElement,
} from '../tool-bar-element/_.js';

import {
    beep,
} from '../../lib/ui/beep.js';

// import {
//     assets_server_url,
// } from '../assets-server-url.js';
// import {
//     create_stylesheet_link,
// } from '../../lib/ui/dom-util.js';
// create_stylesheet_link(document.head, new URL('./style.css', assets_server_url(current_script_url)));
import './style.css';  // webpack implementation


export class EditorCellElement extends HTMLElement {
    static custom_element_name = 'editor-cell';

    static attribute__active  = 'data-active';
    static attribute__visible = 'data-visible';

    constructor() {
        super();
        this.#event_listener_manager = new EventListenerManager();

        this.#key_event_manager = new KeyEventManager(this, this.#command_observer.bind(this));
        this.#connect_focus_listeners();

        this.#command_bindings = this.get_command_bindings();

        const key_map = new KeyMap(this.constructor.get_initial_key_map_bindings(), this.constructor.key_map_insert_self_recognizer);
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
            this._tool_bar = ToolBarElement.create_for(this, {
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
            editable = LogbookManager.singleton.editable,
            innerText,
        } = (options ?? {});

        const cell = create_element({
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
        const { parent, before } = validate_parent_and_before_from_options(options);
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

    inject_key_event(key_event) {
        if (!this.contains(key_event.target)) {
            // try to set target to the currently active cell
            const active_cell = LogbookManager.singleton.active_cell;
            if (active_cell) {
                // this is a clumsy clone of event, but it will only be used internally from this point
                // the goal is to clone the event but change target and currentTarget
                key_event = {
                    ...key_event,  // captures almost nothing, e.g., just the "isTrusted" property

                    key:           key_event.key,       // non-enumerable getter
                    metaKey:       key_event.metaKey,   // non-enumerable getter
                    ctrlKey:       key_event.ctrlKey,   // non-enumerable getter
                    shiftKey:      key_event.shiftKey,  // non-enumerable getter
                    altKey:        key_event.altKey,    // non-enumerable getter

                    preventDefault:  event.preventDefault.bind(event),
                    stopPropagation: event.stopPropagation.bind(event),

                    target:        active_cell,
                    currentTarget: active_cell,
                };
            }
        }
        this.#key_event_manager.inject_key_event(key_event);
    }

    /** return the initial key map bindings
     *  @return {Object} mapping from command strings to arrays of triggering key sequences
     */
    static get_initial_key_map_bindings() {
        return {
            ...get_global_initial_key_map_bindings(),

//!!! the following are "implemented" via setting the contenteditable attribute on the element
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
     * The bindings are obtained by merging local command bindings with LogbookManager.singleton
     * command bindings.
     */
    get_command_bindings() {
        const command_bindings = {
            ...get_global_command_bindings(),

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
                beep();
            }
        } catch (error) {
            console.error('error processing command', command_context, error);
            beep();
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
        if (!this.editable) {
            return false;
        }
        const key_spec = command_context.key_spec;
        const text = key_spec?.key ?? key_spec?.canonical ?? '';
        if (!text) {
            return false;
        }
        return manage_selection_for_insert(
            (point) => insert_at(point, text)
        );
    }

    command_handler__insert_line_break(command_context) {
        if (!this.editable) {
            return false;
        }
        return manage_selection_for_insert(
//            (point) => insert_at(point, document.createElement('br'))
            (point) => insert_at(point, '\n')
        );
    }

    create_command_handler___delete(options) {
        if (!this.editable) {
            return false;
        }
        return (command_context) => {
            return manage_selection_for_delete(
                (point) => delete_nearest_leaf(point, options)
            );
        };
    }

    command_handler__cut(command_context) {
        if (!this.editable) {
            return false;
        }
        document.execCommand('cut');  // updates selection
        return true;
    }

    command_handler__copy(command_context) {
        document.execCommand('copy');  // updates selection
        return true;
    }

    async command_handler__paste(command_context) {
        if (!this.editable) {
            return false;
        }
        //!!! THIS NO LONGER WORKS: return document.execCommand('paste');  // updates selection
        //!!! Also, the following does not work on Firefox:
        const text = await navigator.clipboard.readText();
        if (!text) {
            return false;
        } else {
            return manage_selection_for_insert(
                (point) => insert_at(point, text)
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


    // === ACTIVE/VISIBLE ATTRIBUTES ===

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


    // === FOCUS LISTENERS / ACTIVE ===

    #connect_focus_listeners() {
        function focus_handler(event) {
            // LogbookManager.singleton.set_active_cell() clears/sets the "active" attributes of cells
            LogbookManager.singleton.set_active_cell(this);
        }
        const listener_specs = [
            [ this, 'focus', focus_handler, { capture: true } ],
        ];
        for (const [ target, type, listener, options ] of listener_specs) {
            this.#event_listener_manager.add(target, type, listener, options);
        }
    }


    // === WEB COMPONENT LIFECYCLE ===

    // connectedCallback:
    //     Invoked each time the custom element is appended into a document-connected element.
    //     This will happen each time the node is moved, and may happen before the element's contents have been fully parsed.
    //     Note: connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
    connectedCallback() {
        this.#event_listener_manager.attach();
        this.#key_event_manager.attach();
    }

    // disconnectedCallback:
    //     Invoked each time the custom element is disconnected from the document's DOM.
    disconnectedCallback() {
        this.#key_event_manager.detach();
        this.#event_listener_manager.detach();
    }

    // adoptedCallback:
    //     Invoked each time the custom element is moved to a new document.
    adoptedCallback() {
        this.#event_listener_manager.attach();
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
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
EditorCellElement._init_static();
