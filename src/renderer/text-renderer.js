import {
    Renderer,
} from './renderer.js';


export class TextRenderer extends Renderer {
    static type = 'text';

    static plain_text_css_class = 'plain-text';

    /** Render the given text to ocx.
     * @param {OutputContext} ocx,
     * @param {String} text,
     * @param {Object|undefined|null} options: {
     *     style?:        Object,   // css style to be applied to output element
     *     inline?:       Boolean,  // render inline vs block?
     *     eval_context?: Object,   // eval_context for evaluation; default: from LogbookManager global state
     * }
     * @return {Element} element to which output was rendered
     * @throws {Error} if error occurs
     */
    async render(ocx, text, options=null) {
        const style = options?.style;
        // options.inline and options.eval_context ignored...

        const span = ocx.create_child({
            tag: 'span',
            attrs: {
                'data-type': this.type,
                class: this.constructor.plain_text_css_class,
            },
            style,
        });
        span.innerText = text;  // innerText sanitizes text
        return span;
    }
}
