import {
    Renderer,
} from './renderer.js';


export class ErrorRenderer extends Renderer {
    static type = 'error';

    static error_element_class      = 'error';
    static error_element_text_color = 'red';//!!! should be configurable

    async render(ocx, error_object, options) {
        const style = options?.style;

        const text_segments = [];
        if (error_object.stack) {
            text_segments.push(error_object.stack);
        } else {
            text_segments.push(error_object.message || 'error');
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
