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
    Renderer,
} from './renderer/_.js';


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
        return create_element({ parent: element, ...(options ?? {}) });  // from dom-util.js
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

    /** create a new OutputContext from a new child element of this.element created via this.constructor.create_element_child()
     *  @return {OutputContext} the new child OutputContext
     */
    create_child_output_context(options=null) {
        options ??= {};
        const parent_style_attr = this.element.getAttribute('style');
        if (parent_style_attr) {
            options.attrs = {
                ...(options.attrs ?? {}),
                style: parent_style_attr,  // inherit parent's style
            };
        }
        return new this.constructor(this.create_child(options));
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
        const renderer_class = Renderer.class_from_type(type);
        if (!renderer_class) {
            throw new Error(`unknown output type "${type}"`);
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
    async invoke_renderer_for_type(type, value, options=null) {
        const renderer = this.renderer_for_type(type);
        return this.invoke_renderer(renderer, value, options);
    }
}
