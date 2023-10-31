import {
    Renderer,
} from './renderer.js';

import {
    marked,
} from './marked.js';

import {
    katex,
} from './katex/_.js';

import {
    OutputContext,
} from '../output-context.js';

import {
    OpenPromise,
} from '../../lib/sys/open-promise.js';


// TeX handling adapted from: marked-katex-extension/index.js
// https://github.com/UziTech/marked-katex-extension/blob/main/src/index.js
// See also: https://marked.js.org/using_pro#async

const extension_name__inline    = 'inline-tex';
const extension_name__block     = 'block-tex';
const extension_name__eval_code = 'eval-code';

export class MarkdownRenderer extends Renderer {
    static type = 'markdown';

    // options: { style?: Object }

    // may throw an error
    async render(ocx, markdown, options=null) {

        markdown ??= '';

        const {
            style,
        } = (options ?? {});

        const parent = ocx.create_child({
            attrs: {
                'data-type': this.type,
            },
            style,
        });

        const main_renderer = this;  // used below in extensions code

        // sequencer_promise is used to evaluate the async walkTokens one
        // token at a time, in sequence.  Normally, marked runs the
        // async walkTokens on all tokens in concurrently.
        // This is important because our renderers may be stateful.
        let sequencer_promise = Promise.resolve();

        const marked_options = {
            async: true,  // needed to tell the marked parser operate asynchronously, and to return a promise
            async walkTokens(token) {
                const prior_sequencer_promise = sequencer_promise;
                const new_sequencer_promise = new OpenPromise();
                sequencer_promise = new_sequencer_promise;
                await prior_sequencer_promise;

                if (token.type === extension_name__eval_code) {
                    const output_element = document.createElement('div');
                    const ocx = new OutputContext(output_element);
                    let renderer;
                    try {
                        renderer = ocx.renderer_for_type(token.output_type);
                    } catch (error) {
                        await ocx.render_error(error);
                    }
                    if (renderer) {
                        ocx.new_stoppables.subscribe((new_stoppable) => {
                            main_renderer.add_stoppable(new_stoppable);
                        });  //!!! never unsubscribed

                        const options = {
                            //!!!
                        };
                        await ocx.invoke_renderer(renderer, token.text, options)
                            .catch(error => ocx.render_error(error));
                        renderer?.stop();  // stop background processing, if any
                    }
                    token.html = output_element.innerHTML;
                }

                new_sequencer_promise.resolve();  // permit next token to be processed
            }
        };

        const markup = await marked.parse(markdown, marked_options);  // using extensions, see below
        parent.innerHTML = markup;

        return parent;
    }
}

marked.use({
    extensions: [
        {
            name: extension_name__inline,
            level: 'inline',
            start(src) { return src.indexOf('$'); },
            tokenizer(src, tokens) {
                const match = src.match(/^\$+([^$]+?)\$+/);
                if (match) {
                    return {
                        type: extension_name__inline,
                        raw:  match[0],
                        text: match[1].trim(),
                    };
                }
            },
            renderer(token) {
                return katex.renderToString(token.text, {
                    displayMode:  false,
                    throwOnError: false,
                });
            },
        },
        {
            name: extension_name__block,
            level: 'block',
            start(src) { return src.indexOf('$$'); },
            tokenizer(src, tokens) {
                const match = src.match(/^\$\$([^$]+?)\$\$/);
                if (match) {
                    return {
                        type: extension_name__block,
                        raw:  match[0],
                        text: match[1].trim(),
                    };
                }
            },
            renderer(token) {
                const mathml = katex.renderToString(token.text, {
                    displayMode:  true,
                    throwOnError: false,
                });
                return `<p>${mathml}</p>`;
            },
        },
        {
            name: extension_name__eval_code,
            level: 'block',
            start(src) { return src.match(/^[`]{3}[ ]*[!]/)?.index; },
            tokenizer(src, tokens) {
                const match = src.match(/^[`]{3}[ ]*[!]([ \t]*[^\n]*[ \t]*)?[\n](.*?)[`]{3}/s);
                if (match) {
                    const output_type = (match[1]?.trim() ?? '') || 'javascript';
                    return {
                        type: extension_name__eval_code,
                        output_type,
                        raw:  match[0],
                        text: match[2],
                        html: '',  // filled in later by walkTokens
                    };
                }
            },
            renderer(token) {
                return token.html;
            },
        },
    ],
});
