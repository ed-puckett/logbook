import {
    StoppableObjectsManager,
} from '../../lib/sys/stoppable.js';

import {
    get_renderer_classes,
} from './_.js';


export class Renderer extends StoppableObjectsManager {
    static type = undefined;  // type which instances handle; to be overridden in subclasses

    get type (){ return this.constructor.type }

    async render(output_context, value, options) {
        // to be implemented by subclasses
        throw new Error('NOT UNIMPLEMENTED');
    }

    static class_from_type(type) {
        return this.#establish_type_to_class_mapping()[type];
    }


    // === TYPE TO RENDERER MAPPING ===

    // importing the classes is deferred until this function is called to avoid dependency cycles
    static #establish_type_to_class_mapping() {
        if (!this.#type_to_class_mapping) {
            this.#type_to_class_mapping =
                Object.fromEntries(
                    get_renderer_classes().map(renderer_class => {
                        return [ renderer_class.type, renderer_class ];
                    })
                );
        }
        return this.#type_to_class_mapping;
    }
    static #type_to_class_mapping;  // memoization

    // paths to known renderer class implementations, default-exported
    static #renderer_paths = [

        './text-renderer.js',
        './error-renderer.js',
        './markdown-renderer.js',
        './tex-renderer.js',
        './javascript-renderer/_.js',
        './image-data-renderer.js',
        './graphviz-renderer.js',
        './plotly-renderer.js',
    ];
}
