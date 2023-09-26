// Renderer is defined in a separate file to break dependency cycle in get_renderer_classes()
import {
    Renderer as imported_Renderer,
} from './renderer.js';

export const Renderer = imported_Renderer;  // re-export base class

import { TextRenderer       } from './text-renderer.js';
import { ErrorRenderer      } from './error-renderer.js';
import { MarkdownRenderer   } from './markdown-renderer.js';
import { TeXRenderer        } from './tex-renderer.js';
import { JavaScriptRenderer } from './javascript-renderer/_.js';
import { ImageDataRenderer  } from './image-data-renderer.js';
import { GraphvizRenderer   } from './graphviz-renderer.js';
import { PlotlyRenderer     } from './plotly-renderer.js';

const initial_renderer_classes = [
    TextRenderer,
    ErrorRenderer,
    MarkdownRenderer,
    TeXRenderer,
    JavaScriptRenderer,
    ImageDataRenderer,
    GraphvizRenderer,
    PlotlyRenderer,
];

/**
 * @param {any} thing to test
 * @return {Boolean} whether or not thing is a strict subclass of Renderer
 */
function is_renderer_subclass(thing) {
    return (thing?.prototype instanceof Renderer);
}


// === STATE (INITIALIZED BELOW) ===

let renderer_classes;       // Array of Renderer subclasses, priority order, all with unique type properties
let type_to_class_mapping;  // type->RendererClass, derived from current renderer_classes


// === RENDERER CLASSSES ACCESS/UPDATE ===

export function renderer_class_from_type(type) {
    return type_to_class_mapping[type];
}

export function get_renderer_classes() {
    return [ ...renderer_classes ];
}

export function set_renderer_classes(new_renderer_classes) {  // called in initialization below
    if (!Array.isArray(new_renderer_classes)) {
        throw new Error('new_renderer_classes must be an Array');
    }
    const types_seen = new Set();
    for (const rc of new_renderer_classes) {
        if (!is_renderer_subclass(rc)) {
            throw new Error('new_renderer_classes must be an Array of Renderer subsclasses');
        }
        if (types_seen.has(rc.type)) {
            throw new Error(`new_renderer_classes contains multiple entries with type "${rc.type}"`);
        }
        types_seen.add(rc.type);
    }
    // validation passed, establish new state
    renderer_classes = [ ...new_renderer_classes ];
    type_to_class_mapping =
        Object.fromEntries(
            renderer_classes.map(renderer_class => {
                return [ renderer_class.type, renderer_class ];
            })
        );
}

export function add_renderer_class(renderer_class) {
    if (!is_renderer_subclass(renderer_class)) {
        throw new Error('renderer_class must be a subclass of Renderer');
    }
    const new_renderer_classes = [
        renderer_class,
        ...renderer_classes.filter(rc => rc.type !== renderer_class.type),
    ];
    set_renderer_classes(new_renderer_classes);
}


// === INITIALIZATION ===

set_renderer_classes(initial_renderer_classes);
