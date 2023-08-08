import {
    d3,
} from './d3.js';

import {
    load_script,
} from '../../lib/ui/dom-util.js';

import {
    assets_server_url,
} from '../assets-server-url.js';


await load_script(document.head, assets_server_url('dist/graphviz.umd.js'));
await load_script(document.head, assets_server_url('dist/d3-graphviz.min.js'));

export async function render(element_selector, dot, options) {
    const {
        transition = "main",
        ease       = d3.easeLinear,
        delay      = 500,
        duration   = 1500,
        logEvents  = true,
    } = (options ?? {});
    return new Promise((resolve, reject) => {
        try {
            function reject_with_string(...args) {
                reject(new Error(args[0]));
            }
            const graphviz = d3.select(element_selector).graphviz({
                useWorker:       false,
                useSharedWorker: false,
            });
            graphviz
                .transition(function () {
                    return d3.transition(transition)
                        .ease(ease)
                        .delay(delay)
                        .duration(duration);
                })
                .logEvents(logEvents)
                .onerror(reject_with_string)
                .on("initEnd", function () {
                    graphviz
                        .renderDot(dot)
                        .onerror(reject_with_string)
                        .on("end", resolve);
                });
        } catch (error) {
            reject(error);
        }
    });
}
