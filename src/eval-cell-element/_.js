const current_script_url = import.meta.url;  // save for later

import {
    create_element,
    clear_element,
    validate_parent_and_before_from_options,
} from '../../lib/ui/dom-util.js';

import {
    LogbookManager,
} from '../logbook-manager.js';

import {
    EditorCellElement,
} from '../editor-cell-element/_.js';

import {
    Evaluator,
} from '../evaluator/_.js';

import {
    Stoppable,
} from '../../lib/sys/stoppable.js';

import {
    ToolBarElement,
} from '../tool-bar-element/_.js';

import {
    assets_server_url,
} from '../assets-server-url.js';

// import {
//     create_stylesheet_link,
// } from '../../lib/ui/dom-util.js';
// create_stylesheet_link(document.head, new URL('./style.css', assets_server_url(current_script_url)));
import './style.css';  // webpack implementation


export class EvalCellElement extends EditorCellElement {
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
        this.#output_element_dblclick_handler_bound    = this.#output_element_dblclick_handler.bind(this);
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
                current_output_element.removeEventListener('dblclick',    this.#output_element_dblclick_handler_bound);
                current_output_element.removeEventListener('pointerdown', this.#output_element_pointerdown_handler_bound);
            }
            if (element) {
                element.addEventListener('pointerdown', this.#output_element_pointerdown_handler_bound);
                element.addEventListener('dblclick',    this.#output_element_dblclick_handler_bound);
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
            output_element = create_element({
                tag: 'output',
                parent,
                before,
            });
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

    #output_element_dblclick_handler(event) {
        this.set_visible(!this.visible);
        event.preventDefault();
        event.stopPropagation();
    }
    #output_element_dblclick_handler_bound;  // initialized in constructor


    // === OUTPUT ELEMENT AWARE OVERRIDES ===

    /** move (or remove) this cell within the DOM
     *  @param {null|undefined|Object} options: {
     *      parent?: Node,  // default: null  // new parent, or null/undefined to remove
     *      before?: Node,  // default: null  // new before node
     *  }
     */
    move_cell(options=null) {
        const { parent, before } = validate_parent_and_before_from_options(options);
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

    /** reset the cell; remove the output_element, if any
     *  @return {EvalCellElement} this
     */
    reset() {
        super.reset();
        const output_element = this.output_element;
        if (output_element) {
            this.output_element = null;  // unhook from cell
            output_element.remove();
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

        const evaluator_class = evaluator_class_from_options ?? Evaluator.class_for_content(this);

        if (!(evaluator_class === Evaluator || evaluator_class.prototype instanceof Evaluator)) {
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
        clear_element(output_element);

        // allocate the evaluator, store it, then eval
        const evaluator = new evaluator_class(this, output_element, eval_context);

        this.#evaluator_stoppable = new Stoppable(evaluator);  // already cleared by this.stop() above
        this.#evaluator_foreground = true;
        this._tool_bar?.set_for('running', true);
        LogbookManager.singleton.emit_eval_state(this, true);

        return evaluator._perform_eval()
            .then(() => {
                this.#evaluator_foreground = undefined;
                this._tool_bar?.set_for('running', false);
                LogbookManager.singleton.emit_eval_state(this, false);
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
        LogbookManager.singleton.emit_eval_state(this, false);
    }

    establish_tool_bar() {  // override of EditorCellElement.establish_tool_bar()
        if (!this._tool_bar) {
            let initial_type = this.input_type || undefined;
            this._tool_bar = ToolBarElement.create_for(this, {
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
            eval_context: LogbookManager.singleton.global_eval_context,
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
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
EvalCellElement._init_static();
