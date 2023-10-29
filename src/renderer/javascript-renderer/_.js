const current_script_url = import.meta.url;  // save for later

import {
    assets_server_url,
} from '../../assets-server-url.js';

const lib_dir_path = '../../../lib/';//!!!
const lib_dir_url = new URL(lib_dir_path, assets_server_url(current_script_url));

// provide an implementation of dynamic import that is safe from modification by webpack
const dynamic_import = new Function('path', 'return import(path);');


// ======================================================================
//!!!
// CODE EVALUATION
// ---------------
// Within the code given for evaluation, "this" references the eval_context
// passed to the eval() method.  This object will be obtained from the
// logbook, and will persist until the logbook is opened to a new file or
// is cleared.
//
// vars(...objects) assigns new properties to eval_context (i.e., "this"
// within the code), and those properties persist across all cells.
// The return value is a array of the arguments which will be unmodified.
//
// A return statement within a cell terminates the evaluation (except
// for asynchronous parts that have already been evaluated), and the
// value passed to the return statement becomes the synchronous result
// of the evaluation.
//
// ephemeral_eval_context
// ----------------------
// During evaluation, a number of other values are available "globally",
// though these values do not persist after the particular evaluation
// (except for references from async code started during the evaluation).
// These values include ocx (an instance of OutputContext which provides
// utilities for manipulation of the output of the cell), various graphics,
// etc functions.  Also included are:
//
//     println:        prints its argument followed by newline
//     printf:         implementation of std C printf()
//     sprintf:        implementation of std C sprintf()
//     import_lib:     import other libraries from the lib/ directory
//     vars:           export new "global" properties
//     is_stopped:     determine if the evaluation has been stopped
//     delay_ms:       return a Promise that resolves after a specified delay
//     create_worker:  create a new EvalWorker instance
//
// These all continue to be available even after the evaluation has
// returned if there are any async operations still active.
// See the method #create_ephemeral_eval_context().
// ======================================================================

const AsyncGeneratorFunction = Object.getPrototypeOf(async function* () {}).constructor;

import {
    LogbookManager,
} from '../../logbook-manager.js';

import {
    Renderer,
} from '../renderer.js';

import {
    TextRenderer,
} from '../text-renderer.js';

import {
    EvalWorker,
} from './eval-worker/_.js';

import {
    OutputContext,
} from '../../output-context.js';

import {
    Stoppable,
} from '../../../lib/sys/stoppable.js';

import {
    load_Plotly,
} from '../plotly.js';

import {
    load_d3,
} from '../d3.js';

import * as canvas_tools from '../../../lib/ui/canvas-tools.js';


export class JavaScriptRenderer extends Renderer {
    static type = 'javascript';

    // options: { style?: Object, eval_context?: Object, inline?: Boolean }

    // may throw an error
    // if eval_context is not given in options, then LogbookManager.singleton.global_eval_context is used
    async render(ocx, code, options=null) {
        const {
            style,
            eval_context = LogbookManager.singleton.global_eval_context,
            inline,
        } = (options ?? {});

        // if !style && inline, then use the given ocx,
        // otherwise, if style || !inline, create a new ocx
        if (style || !inline) {
            ocx = ocx.create_child_ocx({
                tag: inline ? 'span' : 'div',
                attrs: {
                    'data-type': this.type,
                },
                style,
            });
        }

        ocx.new_stoppables.subscribe((new_stoppable) => {
            this.add_stoppable(new_stoppable);
        });  //!!! never unsubscribed

        this.stop_states.subscribe(({ stopped }) => {
            if (stopped) {
                // this will cause abort when calling methods of ocx.
                // because we cannot control the JavaScript interpreter,
                // we have to make do with this "polling" type of approach.
                ocx.stop();
            }
        });  //!!! never unsubscribed

        const ephemeral_eval_context = await this.#create_ephemeral_eval_context(eval_context, ocx, code);
        const ephemeral_eval_context_entries = Object.entries(ephemeral_eval_context);

        // create an async generator with the given code as the heart of its
        // body, and with parameters being the keys of ephemeral_eval_context.
        // Then, the code will be evaluated by applying the function to the
        // corresponding values from ephemeral_eval_context.  Note that
        // evaluation will be performed in the JavaScript global environment.
        const eval_fn_params = ephemeral_eval_context_entries.map(([k, _]) => k);
        const eval_fn_args   = ephemeral_eval_context_entries.map(([_, v]) => v);

        // evaluate the code:
        const eval_fn_this = eval_context;
        const eval_fn_body = code;
        const eval_fn = new AsyncGeneratorFunction(...eval_fn_params, eval_fn_body);
        const result_stream = eval_fn.apply(eval_fn_this, eval_fn_args);

        // note that using for await ... of misses the return value and we
        // want to process that, too.  Therefore, instead of the following,
        // we consume the stream "manually".
        //
        // for await (const result of result_stream) {
        //     if (typeof result !== 'undefined') {
        //         await ephemeral_eval_context.render_value(result);
        //     }
        // }

        for (;;) {
            const { value, done } = await result_stream.next();

            // output any non-undefined values that were received either from
            // a return or a yield statement in the code
            if (typeof value !== 'undefined') {
                if (done) {
                    // this was the return value, so precede with a special demarcation
                    await ephemeral_eval_context.render_text('\n>>> ');
                }

                await ephemeral_eval_context.render_value(value);
            }

            if (done) {
                break;
            }
        }
    }

    async #create_ephemeral_eval_context(eval_context, ocx, source_code='') {
        const self = this;

        const Plotly = await load_Plotly();
        const d3     = await load_d3();

        function is_stopped() {
            return self.stopped;
        }

        async function create_worker(options) {
            const worker = new EvalWorker(options);
            self.add_stoppable(new Stoppable(worker, worker => worker.terminate()));
            return worker;
        }

        async function import_lib(lib_path) {
            return dynamic_import(new URL(lib_path, lib_dir_url));
        }

        function vars(...objects) {
            Object.assign(eval_context, ...objects);
            return objects;
        }

        const ephemeral_eval_context = {
            ocx,
            source_code,  // this evaluation's source code

            // Renderer, etc classes
            Renderer,
            Plotly,
            d3,  // for use with Plotly

            // utility functions defined above
            is_stopped,
            create_worker:   ocx.AIS(create_worker),
            import_lib:      ocx.AIS(import_lib),
            vars:            ocx.AIS(vars),

            // external
            sprintf:         ocx.sprintf.bind(ocx),

            // sprintf, sleep, etc
            sleep:           ocx.sleep.bind(ocx),
            delay_ms:        ocx.delay_ms.bind(ocx),
            next_tick:       ocx.next_tick.bind(ocx),
            next_micro_tick: ocx.next_micro_tick.bind(ocx),

            // output functions defined by ocx
            render:          ocx.render.bind(ocx),
            render_text:     ocx.render_text.bind(ocx),
            render_error:    ocx.render_error.bind(ocx),
            render_value:    ocx.render_value.bind(ocx),
            println:         ocx.println.bind(ocx),
            printf:          ocx.printf.bind(ocx),
            print__:         ocx.print__.bind(ocx),

            // code and graphics rendering defined by ocx
            javascript:      ocx.javascript.bind(ocx),
            markdown:        ocx.markdown.bind(ocx),
            tex:             ocx.tex.bind(ocx),
            image_data:      ocx.image_data.bind(ocx),
            graphviz:        ocx.graphviz.bind(ocx),
            plotly:          ocx.plotly.bind(ocx),
            canvas_image:    ocx.canvas_image.bind(ocx),
            canvas_tools,
        };

        return ephemeral_eval_context;
    }
}
