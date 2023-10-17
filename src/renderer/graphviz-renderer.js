import {
    Renderer,
} from './renderer.js';

import {
    render as graphviz_render,
} from './graphviz.js';


export class GraphvizRenderer extends Renderer {
    static type = 'graphviz';

    // Format of config object: {
    //     node_config?: string,
    //     nodes[]?: (string | [ string/*name*/, string/*node_options*/ ])[],
    //     edges[]?: [ string/*from*/, string/*to*/, { label?: string, ... }? ][],
    // }

    // may throw an error
    async render(ocx, config, options) {
        const style = options?.style;

        const element = ocx.create_child({
            attrs: {
                'data-type': this.type,
            },
            style,
            set_id: true,  // required for selector below
        });
        const element_selector = `#${element.id}`;

        const dot_stmts = [];
        if (config?.node_config) {
            dot_stmts.push(`node ${config.node_config}`);
        }
        for (const node_spec of (config?.nodes ?? [])) {
            if (typeof node_spec === 'string') {
                const name = node_spec;
                dot_stmts.push(name);
            } else {
                const [ name, node_options ] = node_spec;
                dot_stmts.push(`${name} [${node_options}]`);
            }
        }
        for (const [ from, to, edge_options ] of (config?.edges ?? [])) {
            dot_stmts.push(`${from}->${to}${edge_options ? `[${edge_options}]` : ''}`);
        }
        const dot = `digraph { ${dot_stmts.join(';')} }`;

        // create and run the renderer
        await graphviz_render(element_selector, dot, {});

        return element;
    }
}
