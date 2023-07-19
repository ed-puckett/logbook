import {
    Chart,
} from './chart.js';

import {
    Renderer,
} from './renderer.js';


export class ChartRenderer extends Renderer {
    static type = 'chart';

    // Format of config object: see Chart.js documentation

    // may throw an error
    async render(output_context, config, options) {
        const style = options?.style;

        // Re: Chart.js:
        // Wrap the canvas element in a div to prevent quirky behavious of Chart.js size handling.
        // See: https://stackoverflow.com/questions/19847582/chart-js-canvas-resize.
        // (Note: doing this for all text/graphics types)

        const parent = output_context.create_child({
            attrs: {
                'data-type': this.type,
            },
        });
        const canvas = output_context.constructor.create_element_child(parent, {
            tag: 'canvas',
            style,
        });
        const ctx = canvas.getContext('2d');
        // eliminate animation so that the canvas.toDataURL() call below will have something to render:
        Chart.defaults.global.animation.duration = 0;
        const chart_object = new Chart(ctx, config);  // simply for effect, chart_object not used...

        return parent;
    }
}
