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
// These values include output_context (which provides utilities for
// manipulation of the output of the cell), various graphics, etc functions.
// Also included are:
//
//     println:        prints its argument followed by newline
//     printf:         implementation of std C printf()
//     sprintf:        implementation of std C sprintf()
//     settings:       current settings
//     theme_settings: current theme_settings
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
    get_settings,
} from '../../settings.js';

import {
    get_theme_settings,
} from '../../theme-settings.js';

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
    async render(output_context, code, options=null) {
        const {
            style,
            eval_context = LogbookManager.singleton.global_eval_context,
            inline,
        } = (options ?? {});

        // if !style && inline, then use the given output_context,
        // otherwise, if style || !inline, create a new output_context
        if (style || !inline) {
            const parent = output_context.create_child({
                tag: inline ? 'span' : 'div',
                attrs: {
                    'data-type': this.type,
                },
                style,
            });
            output_context = new OutputContext(parent);
        }

        const ephemeral_eval_context = this.#create_ephemeral_eval_context(eval_context, output_context);
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

    #create_ephemeral_eval_context(eval_context, output_context) {
        const self = this;

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

        async function render(type, value, options=null) {
            const renderer = output_context.renderer_for_type(type);
            self.add_stoppable(new Stoppable(renderer));
            return output_context.invoke_renderer(renderer, value, options)
                  .catch(error => output_context.invoke_renderer_for_type('error', error));
        }

        async function render_text(text, options=null) {
            text ??= '';
            if (typeof text !== 'string') {
                text = text?.toString() ?? '';
            }
            return render('text', text, options);
        }

        const render_error = render.bind(null, 'error');

        async function render_value(value) {
            // transform value to text and then render as text
            let text;
            if (typeof value === 'undefined') {
                text = '[undefined]';
            } else if (typeof value?.toString === 'function') {
                text = value.toString();
            } else {
                text = '[unprintable value]';
            }
            return render_text(text);
        }

        async function println(text) {
            return render_text((text ?? '') + '\n');
        }

        async function print__() {
            output_context.create_child({
                tag: 'hr',
                attrs: {
                    id: undefined,  // prevent generation of id
                },
            });
        }

        async function printf(format, ...args) {
            if (typeof format !== 'undefined' && format !== null) {
                if (typeof format !== 'string') {
                    format = format.toString();
                }
                const text = sprintf(format, ...args);
                return render_text(text).
                    catch(error => output_context.invoke_renderer_for_type('error', error));
            }
        }

        async function javascript(code, options) {  // options: { style?: Object, eval_context?: Object, inline?: Boolean }
            return render('javascript', code, options);
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
                }
            } else {
                return (...args) => {
                    abort_if_stopped(f.name ?? 'FUNCTION');
                    return f.apply(this, args);
                }
            }
        }
        function abort_if_stopped(operation) {
            if (self.stopped) {
                throw new Error(`${operation} called after ${self.constructor.name} stopped`);
            }
        }

        const ephemeral_eval_context = {
            // external
            settings:        get_settings(),
            theme_settings:  get_theme_settings(),
            sprintf:         AIS(sprintf),
            // functions defined above
            is_stopped,
            create_worker:   AIS(create_worker),
            import_lib:      AIS(import_lib),
            vars:            AIS(vars),
            delay_ms:        AIS(delay_ms),
            next_tick:       AIS(next_tick),
            next_micro_tick: AIS(next_micro_tick),
            sleep:           AIS(sleep),
            render:          AIS(render),
            render_text:     AIS(render_text),
            render_error:    AIS(render_error),
            render_value:    AIS(render_value),
            println:         AIS(println),
            print__:         AIS(print__),
            printf:          AIS(printf),
            // graphics, etc
            markdown:        AIS(render.bind(null, 'markdown')),
            tex:             AIS(render.bind(null, 'tex')),
            image_data:      AIS(render.bind(null, 'image-data')),
            chart:           AIS(render.bind(null, 'chart')),
            graphviz:        AIS(render.bind(null, 'graphviz')),
            plotly:          AIS(render.bind(null, 'plotly')),
            // code
            javascript:      AIS(javascript),
        };

        return ephemeral_eval_context;
    }
}
