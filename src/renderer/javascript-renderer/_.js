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
// The return value is undefined; this makes ${vars(...)} in a template
// string literal or in markup not insert anything into the output.
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
    EvalWorker,
} from './eval-worker/_.js';

import {
    OutputContext,
} from '../../output-context.js';

import {
    Stoppable,
} from '../../../lib/sys/stoppable.js';

import {
    sprintf,
} from '../../../lib/sys/sprintf.js';

import {
    load_d3,
} from '../d3.js';

import {
    delay_ms        as util_delay_ms,
    next_tick       as util_next_tick,
    next_micro_tick as util_next_micro_tick,
} from '../../../lib/ui/dom-util.js';


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
            const parent = ocx.create_child({
                tag: inline ? 'span' : 'div',
                attrs: {
                    'data-type': this.type,
                },
                style,
            });
            ocx = new OutputContext(parent);
        }

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

        const d3 = await load_d3();

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
            return undefined;
        }

        async function delay_ms(ms) {
            return util_delay_ms(ms);
        }

        async function next_tick() {
            return util_next_tick();
        }

        async function next_micro_tick() {
            return util_next_micro_tick();
        }

        async function sleep(s) {
            return util_delay_ms(1000*s);
        }

        /** options may also include a substitute "ocx" which will override the ocx argument
         */
        async function orender(ocx, type, value, options=null) {
            ocx = options?.ocx ?? ocx;
            const renderer = ocx.renderer_for_type(type);
            self.add_stoppable(new Stoppable(renderer));
            return ocx.invoke_renderer(renderer, value, options)
                  .catch(error => ocx.invoke_renderer_for_type('error', error));
        }

        async function orender_text(ocx, text, options=null) {
            text ??= '';
            if (typeof text !== 'string') {
                text = text?.toString() ?? '';
            }
            return orender(ocx, 'text', text, options);
        }

        const orender_error = orender.bind(null, ocx, 'error');

        async function orender_value(ocx, value, options=null) {
            // transform value to text and then render as text
            let text;
            if (typeof value === 'undefined') {
                text = '[undefined]';
            } else if (typeof value?.toString === 'function') {
                text = value.toString();
            } else {
                text = '[unprintable value]';
            }
            return orender_text(ocx, text, options);
        }

        async function oprintln(ocx, text, options=null) {
            return orender_text(ocx, (text ?? '') + '\n', options);
        }

        async function oprint__(ocx, options=null) {
            ocx = options?.ocx ?? ocx;
            ocx.create_child({
                tag: 'hr',
                attrs: {
                    id: undefined,  // prevent generation of id
                },
            });
        }

        async function oprintf(ocx, format, ...args) {
            if (typeof format !== 'undefined' && format !== null) {
                if (typeof format !== 'string') {
                    format = format.toString();
                }
                const text = sprintf(format, ...args);
                return orender_text(ocx, text).
                    catch(error => ocx.invoke_renderer_for_type('error', error));
            }
        }

        async function ojavascript(ocx, code, options=null) {  // options: { style?: Object, eval_context?: Object, inline?: Boolean }
            return orender(ocx, 'javascript', code, options);
        }
        async function omarkdown(ocx, code, options=null) {
            return orender(ocx, 'markdown', code, options);
        }
        async function otex(ocx, code, options=null) {
            return orender(ocx, 'tex', code, options);
        }
        async function oimage_data(ocx, code, options=null) {
            return orender(ocx, 'image_data', code, options);
        }
        async function ographviz(ocx, code, options=null) {
            return orender(ocx, 'graphviz', code, options);
        }
        async function oplotly(ocx, code, options=null) {
            return orender(ocx, 'plotly', code, options);
        }

        // wrapper to abort the given function if the renderer is stopped
        // this is the strategy for terminating a running evaluation...
        function AIS(f) {
            if (typeof f !== 'function') {
                throw new Error('f must be a function');
            }
            const AsyncFunction = (async () => {}).constructor;
            if (f instanceof AsyncFunction) {
                return async (...args) => {
                    abort_if_stopped(f.name ?? 'FUNCTION');
                    return f.apply(this, args);
                };
            } else {
                return (...args) => {
                    abort_if_stopped(f.name ?? 'FUNCTION');
                    return f.apply(this, args);
                };
            }
        }
        function abort_if_stopped(operation) {
            if (self.stopped) {
                throw new Error(`${operation} called after ${self.constructor.name} stopped`);
            }
        }

        const ephemeral_eval_context = {
            ocx,
            // Renderer, etc classes
            Renderer,
            // external
            sprintf:         AIS(sprintf),
            // utility functions defined above
            is_stopped,
            create_worker:   AIS(create_worker),
            import_lib:      AIS(import_lib),
            vars:            AIS(vars),
            delay_ms:        AIS(delay_ms),
            next_tick:       AIS(next_tick),
            next_micro_tick: AIS(next_micro_tick),
            sleep:           AIS(sleep),
            // output functions defined above
            orender:         AIS(orender),
            render:          AIS(orender.bind(null, ocx)),
            orender_text:    AIS(orender_text),
            render_text:     AIS(orender_text.bind(null, ocx)),
            orender_error:   AIS(orender_error),
            render_error:    AIS(orender_error.bind(null, ocx)),
            orender_value:   AIS(orender_value),
            render_value:    AIS(orender_value.bind(null, ocx)),
            oprintln:        AIS(oprintln),
            println:         AIS(oprintln.bind(null, ocx)),
            oprint__:        AIS(oprint__),
            print__:         AIS(oprint__.bind(null, ocx)),
            oprintf:         AIS(oprintf),
            printf:          AIS(oprintf.bind(null, ocx)),
            // graphics, etc
            omarkdown:       AIS(omarkdown),
            markdown:        AIS(omarkdown.bind(null, ocx)),
            otex:            AIS(otex),
            tex:             AIS(otex.bind(null, ocx)),
            oimage_data:     AIS(oimage_data),
            image_data:      AIS(oimage_data.bind(null, ocx)),
            ographviz:       AIS(ographviz),
            graphviz:        AIS(ographviz.bind(null, ocx)),
            oplotly:         AIS(oplotly),
            plotly:          AIS(oplotly.bind(null, ocx)),
            d3,  // for use with Plotly
            // code
            ojavascript:     AIS(ojavascript),
            javascript:      AIS(ojavascript.bind(null, ocx)),
            source_code,  // this evaluation's source code
        };

        return ephemeral_eval_context;
    }
}
