import {
    Renderer,
} from './renderer.js';

import {
    TeXZilla,
} from './texzilla.js';


export class TeXRenderer extends Renderer {
    static type = 'tex';

    // options: { style?: Object, inline?: Boolean, rtl?: Boolean }

    // may throw an error
    async render(output_context, tex, options=null) {
        tex ??= '';

        const {
            style,
            inline,
            rtl,
        } = (options ?? {});

        const parent = output_context.create_child({
            attrs: {
                'data-type': this.type,
            },
            style,
        });
        const exc_on_err = false;
        const mathml = TeXZilla.toMathMLString(tex, !inline, rtl, exc_on_err);
        parent.innerHTML = mathml;

        return parent;
    }
}
