import {
    Renderer,
} from './renderer.js';

import {
    load_Plotly,
} from './plotly.js';


export class PlotlyRenderer extends Renderer {
    static type = 'plotly';

    // Format of config object: { data, layout?, config?, frames? } or simply data
    // (the sub-objects layout, config and frames are optional)

    // may throw an error
    async render(ocx, config_, options) {
        if (typeof config_ !== 'object') {
            throw new Error('config_ must be an object');
        }

        let data, layout, config, frames;
        if ('data' in config_ && Array.isArray(config_.data)) {
            ({
                data,
                layout = {},
                config = {},
                frames = [],
            } = config_);
        } else {
            data = config_;
            config = {};
        }
console.log('>>> LAYOUT BEFORE', layout, config_);//!!!
        layout ??= {};
        layout.plot_bgcolor  ??= 'rgba(0, 0, 0, 0)';
        layout.paper_bgcolor ??= 'rgba(0, 0, 0, 0)';
console.log('>>> LAYOUT', layout);//!!!

        config.displayModeBar = false;  // remove icons/links from top-right of plot

        const style = options?.style;

        const parent = ocx.create_child({
            attrs: {
                'data-type': this.type,
            },
        });
        const output_element = ocx.constructor.create_element_child(parent, {
            style,
        });
        const Plotly = await load_Plotly();
        await Plotly.newPlot(output_element, { data, layout, config, frames });  // render to the output_element

        return parent;
    }
}
