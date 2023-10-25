import {
    Renderer,
} from './renderer.js';


export class TextRenderer extends Renderer {
    static type = 'text';

    static plain_text_css_class = 'plain-text';

    async render(ocx, text, options) {
        const span = ocx.create_child({
            tag: 'span',
            attrs: {
                'data-type': this.type,
                class: this.constructor.plain_text_css_class,
            },
            style: options?.style,
        });
        span.innerText = text;  // innerText sanitizes text
        return span;
    }
}
