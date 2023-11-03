import {
    Renderer,
} from './renderer.js';

import {
    LogbookManager,
} from '../logbook-manager.js';

import {
    katex,
} from './katex/_.js';


export class TeXRenderer extends Renderer {
    static type = 'tex';

    /** Render the given TeX source to ocx.
     * @param {OutputContext} ocx,
     * @param {String} tex,
     * @param {Object|undefined|null} options: {
     *     style?:        Object,   // css style to be applied to output element
     *     inline?:       Boolean,  // render inline vs block?
     *     eval_context?: Object,   // eval_context for evaluation; default: from LogbookManager global state
     * }
     * @return {Element} element to which output was rendered
     * @throws {Error} if error occurs
     */
    async render(ocx, tex, options=null) {
        tex ??= '';

        const {
            style,
            inline,
            eval_context = LogbookManager.global_state_for_type(this.type),
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
            macros: eval_context,  // for persistent \gdef macros
        });
        parent.innerHTML = mathml;

        return parent;
    }
}
