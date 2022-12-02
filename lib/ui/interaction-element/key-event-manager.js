// *** DO NOT IMPORT THIS MODULE DIRECTLY, INSTEAD IMPORT ./_.js ***

const { Subscribable } = await import('../../sys/subscribable.js');

const {
    KeySpec,
    KeyMap,
} = await import('../key/_.js');

const {
    beep,
} = await import('../beep.js');


// KeyEventManager is defined here to avoid import cycle if it were defined in a separate module
export class KeyEventManager {
    constructor(element, command_event_handler) {
        if (!InteractionElement) {
            throw new Error('module must be initialized first by calling __patch_module()');
        }
        if (! (element instanceof InteractionElement )) {
            throw new Error('element must be an instance of InteractionElement');
        }
        Object.defineProperties(this, {
            element: {
                value:      element,
                enumerable: true,
            },
            command_event_handler: {
                value:      command_event_handler,
                enumerable: true,
            },
        });
        this.#key_map = this.#create_initial_key_map();
        this.#key_mapper = null;  // set iff attached
        this.#command_event_subscription = null;  // set iff attached
    }
    #key_map;
    #key_mapper;
    #command_event_subscription;

    get key_map (){ return this.#key_map; }

    set_key_map(new_key_map=null) {
        if (new_key_map !== null && typeof new_key_map !== 'undefined' && !(new_key_map instanceof KeyMap)) {
            throw new Error('new_key_map must be null/undefined or an instance of KeyMap');
        }
        const changed = (this.#key_map !== new_key_map);
        this.#key_map = new_key_map;
        if (changed) {
            this.#handle_key_map_change();
        }
    }

    get is_attached (){ return !!this.#key_mapper; }  // this.#key_mapper set iff attached

    get event_target (){ return this.element; }

    attach() {
        if (this.is_attached) {
            throw new Error('attach() called when already attached');
        }

        this.#establish_key_mapper();
        try {
            this.#command_event_subscription = this.constructor.command_events.subscribe(this.command_event_handler);
        } catch (error) {
            this.#command_event_subscription = null;
            this.#key_mapper = null;
            throw error;
        }

        const initial_state = this.#key_mapper;
        let state;         // current "location" in key mapper
        let key_sequence;  // current sequence of key_specs that have been seen

        function reset() {
            state = initial_state;
            key_sequence = [];
        }
        reset();

        const blur_handler = reset;  // attached to this.element

        const key_handler = (event) => {  // attached to this.element
            switch (event.key) {
            case 'Alt':
            case 'AltGraph':
            case 'CapsLock':
            case 'Control':
            case 'Fn':
            case 'FnLock':
            case 'Hyper':
            case 'Meta':
            case 'NumLock':
            case 'ScrollLock':
            case 'Shift':
            case 'Super':
            case 'Symbol':
            case 'SymbolLock':
            case 'OS':  // Firefox quirk
                // modifier key, ignore
                break;

            default: {
                const key_spec = KeySpec.from_keyboard_event(event);
                key_sequence.push(key_spec);
                const mapping_result = state.consume(key_spec);
                if (!mapping_result) {
                    // failed
                    if (state !== initial_state) {
                        // beep only if at least one keypress has already been accepted
                        event.preventDefault();
                        beep();
                    }
                    reset();
                } else {
                    event.preventDefault();
                    if (typeof mapping_result === 'string') {
                        const command = mapping_result;
                        this.constructor.command_events.dispatch({ command, key_spec });
                        reset();
                    } else {
                        state = mapping_result;
                    }
                }
            }
            }
        };

        const listener_specs = [
            [ this.element, 'blur',    blur_handler, { capture: true } ],
            [ this.element, 'keydown', key_handler,  { capture: true } ],
        ];
        const ancestor_interaction_element = this.element.get_ancestor_interaction_element();
        if (ancestor_interaction_element) {
            listener_specs.push([
                ancestor_interaction_element,
                this.constructor.#ancestor_key_map_changed_event_type,
                this.#ancestor_key_map_changed_handler.bind(this),
                { capture: true },
            ]);
        }

        for (const [ target, type, listener, options ] of listener_specs) {
            target.addEventListener(type, listener, options);
        }
        this.constructor.#event_listeners[this.element] = listener_specs;
    }

    detach() {
        // no-op if called when already detached
        const listener_specs = this.constructor.#event_listeners[this.element];
        if (listener_specs) {
            for (const [ target, type, listener, options ] of listener_specs) {
                target.removeEventListener(type, listener, options);
            }
            this.constructor.#event_listeners.delete(this.element);
        }
        if (this.#command_event_subscription) {
            this.#command_event_subscription.unsubscribe();
            this.#command_event_subscription = null;
        }
        this.#key_mapper = null;
    }


    // === INTERNAL ===

    static #event_listeners = new WeakMap();

    #create_initial_key_map() {
        // find a suitable initial KeyMap based on current attribute values
        return new KeyMap();//!!! just return empty KeyMap for now....
    }

    #establish_key_mapper() {
        const ie_stack = [];
        for (let n = this.element; n; n = n.parentNode) {
            if (n instanceof InteractionElement) {
                ie_stack.push(n);
            }
        }
        const key_map_stack = ie_stack.map(ie => ie.key_map);
        this.#key_mapper = KeyMap.multi_mapper(...key_map_stack);
    }

    #rebuild() {
        // If already attached, detach and then re-attach to
        // rebuild the event handlers and state machine.
        // Otherwise, if not attached, just wait until attached
        // next time.
        if (this.is_attached) {
            this.detach();
            this.attach();
        }
    }

    // #handle_key_map_change() and #ancestor_key_map_changed_handler()
    // comprise a protocol for managing key_map changes.  Elements listen
    // for "ancestor_key_map_changed" events from their nearest ancestor
    // (if any) and respond by rebuilding their state and then propagating
    // the event (by firing on this element), which will in turn trigger
    // rebuilding of descendents of this element.
    // The rebuilding process is initiated when a key_map is changed on a
    // particular element: the element calls #handle_key_map_change() which
    // rebuilds the state of this element and then fires the
    // "ancestor_key_map_changed" event on itself to signal its descendents.

    #handle_key_map_change() {
        // rebuild because this key_map changed
        this.#rebuild();
        // fire an "ancestor_key_map_changed" event on this to inform this
        // element's descendent InteractionElements.  Note that this.element
        // is the ancestor for those descendents.
        this.event_target.dispatchEvent(new Event(this.constructor.#ancestor_key_map_changed_event_type));
    }

    static #ancestor_key_map_changed_event_type = 'ancestor_key_map_changed';

    #ancestor_key_map_changed_handler(event) {  // attached to this.event_target
        // rebuild because some ancestor key_map changed
        this.#rebuild();
        // key_map changed for some ancestor, so propagate event
        this.event_target.dispatchEvent(new Event(this.constructor.#ancestor_key_map_changed_event_type));
    };


    // === COMMAND EVENT ===

    static #command_event_type = 'command';
    static get command_event_type (){ return this.#command_event_type; }

    static command_events = new Subscribable();  // emits { command, key_spec }
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
