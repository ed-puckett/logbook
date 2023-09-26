import {
    Evaluator,
} from './evaluator.js';

import {
    Stoppable,
} from '../../lib/sys/stoppable.js';


export class JavaScriptEvaluator extends Evaluator {
    static handled_input_types = [
        'javascript',
    ];

    async _perform_eval() {
        const options = {
            style:  undefined,//!!!
            eval_context: this.eval_context,
        };
        const renderer = this.output_context.renderer_for_type('javascript');
        this.add_stoppable(new Stoppable(renderer));
        const code = this.input_element.innerText;  // .textContent does not preserve newlines
        return this.output_context.invoke_renderer(renderer, code, options);
    }
}
