import {
    Renderer,
} from './renderer.js';


export class TextRenderer extends Renderer {
    static type = 'text';

    async render(ocx, text, options) {
        if (options?.style) {
            const span = ocx.create_child({
                tag: 'span',
                attrs: {
                    'data-type': this.type,
                },
                style: options.style,
            });
            span.innerText = text;  // innerText sanitizes text
            return span;
        } else {
            return ocx.create_child_text_node(text);  // inserted as pure text
        }
    }
}
