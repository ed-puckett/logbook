// *** DO NOT IMPORT THIS MODULE DIRECTLY, INSTEAD IMPORT ./_.js ***

export class CommandEngine {
    constructor(element, bindings=null) {
        if (!InteractionElement) {
            throw new Error('module must be initialized first by calling __patch_module()');
        }
        if (! (element instanceof Element)) {
            throw new Error('element must be an instance of Element');
        }
        if (bindings) {
            if (typeof bindings !== 'object') {
                throw new Error('bindings must be an object');
            }
            for (const k in bindings) {
                if (typeof bindings[k] !== 'function') {
                    throw new Error('bindings must be an object with function values');
                }
            }
        }
        Object.defineProperties(this, {
            element: {
                value:      element,
                enumerable: true,
            },
        });
        this.#bindings = bindings;
    }
    #bindings;

    async perform(command, context=null) {
        const bindings_fn = this.#bindings?.[command];
        if (bindings_fn) {
            bindings_fn(command, context, this);
            return true;  // indicate: command handled
        } else {
            // not handled here; try ancestor, if any
            const ancestor = this.element.get_ancestor_interaction_element();
            if (ancestor?.command_engine) {
                return ancestor.command_engine.perform(command, context);
            } else {
                return false;  // indicate: command not handled
            }
        }
    }
}


// === MODULE INITIALIZATION ===

// Rather than (circularly) import InteractionElement, provide
// a means for this module to be patched after importing:

let InteractionElement;

export function __patch_module(ie_class) {
    if (typeof ie_class !== 'function' || ie_class?.name !== 'InteractionElement') {
        throw new Error('ie_class must be the InteractionElement class object');
    }
    if (InteractionElement) {
        throw new Error('__patch_module() must be called exactly once');
    }
    InteractionElement = ie_class;
}
