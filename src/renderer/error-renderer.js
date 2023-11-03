import {
    Renderer,
} from './renderer.js';


export class ErrorRenderer extends Renderer {
    static type = 'error';

    static error_element_class      = 'error';
    static error_element_text_color = 'red';//!!! should be configurable

    /** Render the given error_object to ocx.
     * @param {OutputContext} ocx,
     * @param {Error|String} error_object,
     * @param {Object|undefined|null} options: {
     *     style?:        Object,   // css style to be applied to output element
     *     inline?:       Boolean,  // render inline vs block?
     *     eval_context?: Object,   // eval_context for evaluation; default: from LogbookManager global state
     * }
     * @return {Element} element to which output was rendered
     * @throws {Error} if error occurs
     */
    async render(ocx, error_object, options=null) {
        const style = options?.style;
        // options.inline and options.eval_context ignored...

        const text_segments = [];
        if (error_object instanceof Error) {
            if (error_object.stack) {
                text_segments.push(error_object.stack);
            } else {
                text_segments.push(error_object.message || 'error');
            }
        } else {
            text_segments.push(error_object ?? 'error');
        }
        const text = text_segments.join('\n');

        const parent = ocx.create_child({
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
