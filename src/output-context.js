import {
    clear_element,
    scroll_element_into_view,
    set_element_attrs,
    update_element_style,
    create_element,
    create_element_child_text_node,
    normalize_element_text,
} from '../lib/ui/dom-util.js';

import {
    Subscribable,
} from '../lib/sys/subscribable.js';

import {
    Stoppable,
} from '../lib/sys/stoppable.js';

import {
    Renderer,
} from './renderer/_.js';

import {
    delay_ms        as util_delay_ms,
    next_tick       as util_next_tick,
    next_micro_tick as util_next_micro_tick,
} from '../lib/ui/dom-util.js';

import {
    sprintf as lib_sprintf,
} from '../lib/sys/sprintf.js';


export class OutputContext {
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
        this.#new_stoppables = new Subscribable();
        this.#stopped = false;
    }
    #new_stoppables;
    #stopped;

    get new_stoppables (){ return this.#new_stoppables; }

    get stopped (){ return this.#stopped; }  // once stopped, always stopped
    stop() {
        this.#stopped = true;
    }


    // === STATIC UTILITY ===

    static sprintf(format, ...args) {
        return lib_sprintf(format, ...args);
    }

    static async sleep(s) {
        return util_delay_ms(1000*s);
    }

    static async delay_ms(ms) {
        return util_delay_ms(ms);
    }

    static async next_tick() {
        return util_next_tick();
    }

    static async next_micro_tick() {
        return util_next_micro_tick();
    }


    // === STATIC OPERATIONS ===

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
        return clear_element(element);
    }

    /** scroll element into view
     *  @param {Element} element
     *  @return {Element} element
     */
    static scroll_element_into_view(element) {
        return scroll_element_into_view(element);  // from dom-util.js
    }

    /** set attributes on an element which are taken from an object.
     *  @param {Element} element
     *  @param {Object|undefined|null} attrs
     *  @return {Element} element
     *  Attribute values obtained by calling toString() on the values in attrs
     *  except that values which are undefined are translated to ''.
     */
    static set_element_attrs(element, attrs) {
        return set_element_attrs(element, attrs);  // from dom-util.js
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
        return update_element_style(element, spec);  // from dom-util.js
    }

    /** create a new child element of the given element with the given characteristics
     *  @param {Object|undefined|null} options: {
     *      parent?:    HTMLElement|null,  // parent element, null or undefined for none; may be simply an Element if style not specified
     *      before?:    Node|null,         // sibling node before which to insert; append if null or undefined
     *      tag?:       string,            // tag name for new element; default: 'div'
     *      namespace?: string,            // namespace for new element creation
     *      attrs?:     object,            // attributes to set on new element
     *      style?:     object,            // style properties for new element
     *      set_id?:    Boolean            // if true, allocate and set an id for the element (if id not specified in attrs)
     *      children?:  ELDEF[],           // array of children to create (recursive)
     *  }
     *  @return {Element} the new element
     * A unique id will be assigned to the element unless that element already has an id attribute
     * specified (in attrs).
     * Attributes specified in attrs with a value of either null or undefined are ignored.  This is
     * how to prevent generation of an id: specify a value of null or undefined for id.
     * The before node, if specified, must have a parent that must match parent if parent is specified.
     * If neither parent nor before is specified, the new element will have no parent.
     * Warning: '!important' in style specifications does not work!  (Should use priority method.)
     * The definitions in "children", if specified, should not contain "parent" or "before".
     * attrs may contain a "class" property, and this should be a string or an array of strings,
     * each of which must not contain whitespace.
     */
    static create_element(options=null) {
        return create_element(options);  // from dom-util.js
    }

    /** create a new child element of the given element with the given characteristics
     *  @param {Object|undefined|null} options: {
     *      parent?:    HTMLElement|null,  // parent element, null or undefined for none; may be simply an Element if style not specified
     *      before?:    Node|null,         // sibling node before which to insert; append if null or undefined
     *      tag?:       string,            // tag name for new element; default: 'div'
     *      namespace?: string,            // namespace for new element creation
     *      attrs?:     object,            // attributes to set on new element
     *      style?:     object,            // style properties for new element
     *      set_id?:    Boolean            // if true, allocate and set an id for the element (if id not specified in attrs)
     *      children?:  ELDEF[],           // array of children to create (recursive)
     *  }
     *  @return {Element} the new element
     * A unique id will be assigned to the element unless that element already has an id attribute
     * specified (in attrs).
     * Attributes specified in attrs with a value of either null or undefined are ignored.  This is
     * how to prevent generation of an id: specify a value of null or undefined for id.
     * The before node, if specified, must have a parent that must match parent if parent is specified.
     * If neither parent nor before is specified, the new element will have no parent.
     * Warning: '!important' in style specifications does not work!  (Should use priority method.)
     * The definitions in "children", if specified, should not contain "parent" or "before".
     * attrs may contain a "class" property, and this should be a string or an array of strings,
     * each of which must not contain whitespace.
     */
    static create_element_child(element, options=null) {
        return create_element({
            parent: element,
            ...(options ?? {}),
        });  // from dom-util.js
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
        return create_element_child_text_node(element, text, options);  // from dom-util.js
    }

    /** normalize the text node children of element, meaning that text nodes
     *  are non-empty and no text nodes are adjacent.
     *  @param {Element} element
     *  @return {Element} element
     */
    static normalize_element_text(element) {
        return normalize_element_text(element);  // from dom-util.js
    }


    // === ABORT IF STOPPED ===

    /** abort by throwing an error if this.stopped, otherwise do nothing.
     */
    abort_if_stopped(operation) {
        if (this.stopped) {
            operation ??= 'operation';
            throw new Error(`${operation} invoked on stopped output context`);
        }
    }

    /** wrap the given function so that when it is called,
     *  this.abort_if_stopped() will be called first to
     *  terminate rendering.
     */
    AIS(f) {
        if (typeof f !== 'function') {
            throw new Error('f must be a function');
        }
        const AsyncFunction = (async () => {}).constructor;
        if (f instanceof AsyncFunction) {
            return async (...args) => {
                this.abort_if_stopped(f.name);
                const result = await f.apply(null, args);
                this.abort_if_stopped(f.name);
                return result;
            };
        } else {
            return (...args) => {
                this.abort_if_stopped(f.name);
                const result = f.apply(null, args);
                this.abort_if_stopped(f.name);
                return result;
            };
        }
    }


    // === UTILITY ===

    /** @param {String} format
     *  @param {any[]} args
     *  @return {String} formatted string
     */
    sprintf(format, ...args) {
        this.abort_if_stopped();
        return this.constructor.sprintf(format, ...args);
    }

    /** @param {Number} s delay in seconds
     *  @return {Promise} promise which will resolve after s seconds
     */
    async sleep(s) {
        this.abort_if_stopped();
        return this.constructor.delay_ms(1000*s);
    }

    /** @param {Number} ms delay in milliseconds
     *  @return {Promise} promise which will resolve after ms milliseconds
     */
    async delay_ms(ms) {
        this.abort_if_stopped();
        return this.constructor.delay_ms(ms);
    }

    /** @return {Promise} promise which will resolve after next "tick"
     * setTimeout() is used.
     */
    async next_tick() {
        this.abort_if_stopped();
        return this.constructor.next_tick();
    }

    /** @return {Promise} promise which will resolve after next "tick"
     * queueMicrotask() is used.
     */
    async next_micro_tick() {
        this.abort_if_stopped();
        return this.constructor.next_micro_tick();
    }


    // === BASIC OPERATIONS ===

    /** remove all child elements and nodes of this.element via this.constructor.clear_element()
     *  @return this
     */
    clear() {
        this.abort_if_stopped();
        this.constructor.clear_element(this.element);
        return this;
    }

    /** scroll this.element into view via this.constructor.scroll_element_into_view()
     *  @return this
     */
    scroll_into_view() {
        this.abort_if_stopped();
        this.constructor.scroll_element_into_view(this.element);
        return this;
    }

    /** set attributes on an element which are taken from an object, via this.constructor.set_element_attrs()
     *  @return this
     */
    set_attrs(attrs) {
        this.abort_if_stopped();
        this.constructor.set_element_attrs(this.element, attrs);
        return this;
    }

    /** add/remove style properties on this.element via this.constructor.update_element_style()
     *  @return this
     */
    update_style(spec) {
        this.abort_if_stopped();
        this.constructor.update_element_style(this.element, spec);
        return this;
    }

    /** create a new child element of this.element via this.constructor.create_element_child()
     *  @return {HTMLElement} the new child element
     */
    create_child(options=null) {
        this.abort_if_stopped();
        return this.constructor.create_element_child(this.element, options);
    }

    /** create a new OutputContext from a new child element of this.element created via this.create_child()
     *  @return {OutputContext} the new child OutputContext
     */
    create_child_ocx(options=null) {
        this.abort_if_stopped();
        options ??= {};
        const parent_style_attr = this.element.getAttribute('style');
        if (parent_style_attr) {
            options.attrs = {
                ...(options.attrs ?? {}),
                style: parent_style_attr,  // inherit parent's style attribute (vs style)
            };
        }
        return new this.constructor(this.create_child(options));
    }

    /** create or update a child text node of this.element via this.constructor.create_element_child_text_node()
     *  @return {Node|null} the new or modified text node, or null if the converted text is ''
     */
    create_child_text_node(text, options=null) {
        this.abort_if_stopped();
        return this.constructor.create_element_child_text_node(this.element, text, options);
    }

    /** normalize this.element via this.constructor.normalize_element_text()
     *  @return this
     */
    normalize_text() {
        this.abort_if_stopped();
        this.constuctor.normalize_element_text(this.element);
        return this;
    }


    // === ADVANCED OPERATIONS ===

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async render(type, value, options=null) {
        const ocx = options?.ocx ?? this;
        const renderer = ocx.renderer_for_type(type);
        return ocx.invoke_renderer(renderer, value, options)
            .catch(error => ocx.render_error(error));
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async render_text(text, options=null) {
        const ocx = options?.ocx ?? this;
        text ??= '';
        if (typeof text !== 'string') {
            text = text?.toString() ?? '';
        }
        return ocx.render('text', text, options);
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async render_error(error, options=null) {
        const ocx = options?.ocx ?? this;
        return ocx.render('error', error, options);
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async render_value(value, options=null) {
        const ocx = options?.ocx ?? this;
        // transform value to text and then render as text
        let text;
        if (typeof value === 'undefined') {
            text = '[undefined]';
        } else if (typeof value?.toString === 'function') {
            text = value.toString();
        } else {
            text = '[unprintable value]';
        }
        return ocx.render_text(text, options);
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async println(text, options=null) {
        const ocx = options?.ocx ?? this;
        return ocx.render_text((text ?? '') + '\n', options);
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async printf(format, ...args) {
        const ocx = this;  // no options...
        if (typeof format !== 'undefined' && format !== null) {
            if (typeof format !== 'string') {
                format = format.toString();
            }
            const text = ocx.constructor.sprintf(format, ...args);
            return ocx.render_text(text).
                catch(error => ocx.render_error(error));
        }
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async print__(options=null) {
        const ocx = options?.ocx ?? this;
        ocx.create_child({ tag: 'hr' });
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     * options: { style?: Object, eval_context?: Object, inline?: Boolean }
     */
    async javascript(code, options=null) {
        const ocx = options?.ocx ?? this;
        return ocx.render('javascript', code, options);
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async markdown(code, options=null) {
        const ocx = options?.ocx ?? this;
        return ocx.render('markdown', code, options);
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async tex(code, options=null) {
        const ocx = options?.ocx ?? this;
        return ocx.render('tex', code, options);
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async image_data(code, options=null) {
        const ocx = options?.ocx ?? this;
        return ocx.render('image_data', code, options);
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async graphviz(code, options=null) {
        const ocx = options?.ocx ?? this;
        return ocx.render('graphviz', code, options);
    }

    /** options may also include a substitute "ocx" which will override the ocx argument
     */
    async plotly(code, options=null) {
        const ocx = options?.ocx ?? this;
        return ocx.render('plotly', code, options);
    }


    // === RENDERER INTERFACE ===

    /** return a new instance of the appropriate Renderer class for the given type
     *  @param {String} type
     *  @return {Renderer} renderer_class
     */
    renderer_for_type(type) {
        this.abort_if_stopped();
        const renderer_class = Renderer.class_from_type(type);
        if (!renderer_class) {
            throw new Error(`unknown output type "${type}"`);
        } else {
            return new renderer_class();
        }
    }

    /** run the given renderer with the given arguments and this ocx
     *  @param {Renderer} renderer instance
     *  @param {any} value
     *  @param {Object} options for renderer
     *  @return {any} return value from renderer
     * A new Stoppable created from renderer is dispatched through #new_stoppables
     */
    async invoke_renderer(renderer, value, options=null) {
        const ocx = options?.ocx ?? this;
        ocx.abort_if_stopped();
        ocx.#new_stoppables.dispatch(new Stoppable(renderer));
        return renderer.render(ocx, value, options)
            .catch(error => {
                renderer.stop();  // stop anything that may have been started
                throw error;      // propagate the error
            })
            .finally(() => ocx.abort_if_stopped());
    }

    /** find a renderer and invoke it for the given arguemnts
     *  @param {String} type
     *  @param {any} value
     *  @param {Object} options for renderer
     *  @return {any} return value from renderer
     */
    async invoke_renderer_for_type(type, value, options=null) {
        const ocx = options?.ocx ?? this;
        ocx.abort_if_stopped();
        const renderer = ocx.renderer_for_type(type);
        return ocx.invoke_renderer(renderer, value, options)
            .finally(() => ocx.abort_if_stopped());
    }
}
