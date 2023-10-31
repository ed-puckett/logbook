import {
    Renderer,
} from './renderer.js';

import {
    katex,
} from './katex/_.js';


export class TeXRenderer extends Renderer {
    static type = 'tex';

    // options: { style?: Object, inline?: Boolean, rtl?: Boolean }

    // may throw an error
    async render(ocx, tex, options=null) {
        tex ??= '';

        const {
            style,
            inline,
            rtl,
        } = (options ?? {});

        const parent = ocx.create_child({
            attrs: {
                'data-type': this.type,
            },
            style,
        });
        const mathml = katex.renderToString(tex, {
            displayMode:  true,
            throwOnError: false,
        });
        parent.innerHTML = mathml;

        return parent;
    }
}
