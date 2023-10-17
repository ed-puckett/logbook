import {
    generate_uuid,
} from '../../lib/sys/uuid.js';

import {
    StoppableObjectsManager,
} from '../../lib/sys/stoppable.js';

import {
    OutputContext,
} from '../output-context.js';

import {
    get_evaluator_classes,
} from './_.js';


export class Evaluator extends StoppableObjectsManager {
    /** Call this function instead of constructing an instance with new.
     *  @param {HTMLElement} input_element the source element
     *  @param {HTMLElement} output_element the destination element
     *  @param {undefined|null|Object} eval_context, default {}
     *  @return {Promise} resolves to the new instance after its
     *          _perform_eval method resolves.  Note that the return
     *          of the _perform_eval method does not necessarily mean
     *          that the evaluation is "done".
     * If an object is passed as eval_context, then that object may be modified
     * as a result of the evaluation.  This is the basis for persistence of
     * state across evaluations.
     */
    static async eval(input_element, output_element, eval_context=null) {
        const instance = new this(input_element, output_element, eval_context);
        return instance._perform_eval()
            .catch(error => instance.ocx.invoke_renderer_for_type('error', error));
    }

    // do not call the constructor via new, instead use the static async method Evaluator.eval()
    constructor(input_element, output_element, eval_context) {
        super();
        if (!(input_element instanceof HTMLElement)) {
            throw new Error('input_element must be an instance of HTMLElement');
        }
        if (!(output_element instanceof HTMLElement)) {
            throw new Error('output_element must be an instance of HTMLElement');
        }

        eval_context ??= {};
        if (typeof eval_context !== 'object') {
            throw new Error('eval_context must be undefined, null, or an object');
        }

        const ocx = new OutputContext(output_element);

        Object.defineProperties(this, {
            id: {
                value: generate_uuid(),
                enumerable: true,
            },
            input_element: {
                value: input_element,
                enumerable: true,
            },
            output_element: {
                value: output_element,
                enumerable: true,
            },
            eval_context: {
                value: eval_context,
                enumerable: true,
            },
            ocx: {
                value: ocx,
                enumerable: true,
            },
        });
    }

    async _perform_eval() {
        // to be implemented by subclasses
        // exceptions thrown out of this function will be handled in this.constructor.eval()
        throw new Error('NOT IMPLEMENTED');
    }


    // === RECOGNIZER ===

    /** array of input_type strings for input types handled by this evaluator
     *  must be overridden in subclasses
     */
    static handled_input_types = [];

    /** return an evauluator class for a given input_element
     *  @param {Element} input_element
     *  @return {Class} evaluator class
     */
    static class_for_content(input_element) {
        if (!(input_element instanceof Element)) {
            throw new Error('input_element must be an instance of Element');
        }

        const evaluator_classes = get_evaluator_classes();

        const default_evaluator_class = evaluator_classes[0];

        // check if there is an evaluator that handles the input_element input_type
        const input_type = input_element.input_type;
        if (input_type) {
            // use the first evaluator that handles a specifically-set
            // input_type on the input_element
            for (const evaluator_class of evaluator_classes) {
                if (evaluator_class.handled_input_types.includes(input_type)) {
                    return evaluator_class;
                }
            }
        }

        return default_evaluator_class;
    }
}
