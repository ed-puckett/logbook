import {
    StoppableObjectsManager,
} from '../../lib/sys/stoppable.js';

import {
    renderer_class_from_type,
    get_renderer_classes,
    set_renderer_classes,
    reset_to_initial_renderer_classes,
    add_renderer_class,
    remove_renderer_class,
} from './_.js';


export class Renderer extends StoppableObjectsManager {
    /** type which instances handle, to be overridden in subclasses
     */
    static type;

    /** get the type specified by the class
     */
    get type (){ return this.constructor.type; }

    /** implementation of rendering, to be implemented by subclasses
     */
    async render(ocx, value, options) {
        throw new Error('NOT IMPLEMENTED');
    }

    static reset_classes()             { reset_to_initial_renderer_classes(); }

    static class_from_type(type)       { return renderer_class_from_type(type); }
    static get_classes()               { return get_renderer_classes(); }
    static set_classes(new_classes)    { set_renderer_classes(new_classes); }
    static add_class(rc)               { add_renderer_class(rc); }
    static remove_class(rc)            { remove_renderer_class(rc); }

    static get_class_types()           { return get_renderer_classes().map(rc => rc.type); }
    static remove_class_for_type(type) { return this.remove_class(this.class_from_type(type)); }
}
