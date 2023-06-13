import {
    Renderer,
} from './_.js';

import {
    Plotly,
} from './plotly.js';


export default class PlotlyRenderer extends Renderer {
    static type = 'plotly';

    // Format of config object: { data, layout, config, frames }
    // (the sub-objects layout, config and frames are optional)

    // may throw an error
    async render(output_context, config, options) {
        const style = options?.style;

        const parent = output_context.create_child({
            attrs: {
                'data-type': this.type,
            },
        });
        const output_element = output_context.constructor.create_element_child(parent, {
            style,
        });
        await Plotly.newPlot(output_element, config);  // render to the output_element

        return parent;
    }
}
