import {
    Evaluator,
} from './evaluator.js';

import {
    Stoppable,
} from '../../lib/sys/stoppable.js';


export class TeXEvaluator extends Evaluator {
    static handled_input_types = [
        'tex',
    ];

    async _perform_eval() {
        const options = {
            style:  undefined,//!!!
            inline: false,//!!!
            rtl:    false,//!!!
        };
        const renderer = this.output_context.renderer_for_type('tex');
        this.add_stoppable(new Stoppable(renderer));
        return this.output_context.invoke_renderer(renderer, this.input_element.innerText, options);
    }
}
