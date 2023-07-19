import {
    Renderer,
} from './renderer.js';


export class ImageDataRenderer extends Renderer {
    static type = 'image-data';

    // Format of config object: {
    //     x?:         number,  // default value: 0
    //     y?:         number,  // default value: 0
    //     image_data: ImageData,
    // }
    // (or an array of these objects)

    // may throw an error
    async render(output_context, config, options) {
        const style = options?.style;

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
        const iter_config = Array.isArray(config) ? config : [ config ];
        for (const { x = 0, y = 0, image_data } of iter_config) {
            ctx.putImageData(image_data, x, y);
        }

        return parent;
    }
}
