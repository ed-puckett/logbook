import {
    Renderer,
} from './_.js';


export default class TextRenderer extends Renderer {
    static type = 'text';

    async render(output_context, text, options) {
        if (options?.style) {
            const span = output_context.create_child({
                tag: 'span',
                attrs: {
                    'data-type': this.type,
                },
                style: options.style,
            });
            span.innerText = text;  // innerText sanitizes text
            return span;
        } else {
            return output_context.create_child_text_node(text);  // inserted as pure text
        }
    }
}
