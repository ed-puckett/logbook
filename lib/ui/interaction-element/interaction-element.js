// *** DO NOT IMPORT THIS MODULE DIRECTLY, INSTEAD IMPORT ./_.js ***

const {
    KeyEventManager,
} = await import('./key-event-manager.js');

const {
    CommandEngine,
} = await import('./command-engine.js');


export class InteractionElement extends HTMLElement {
    constructor() {
        super();
        this.#key_event_manager = new KeyEventManager(this, this.#command_event_handler.bind(this));
        this.#command_engine    = new CommandEngine(this);
    }
    #key_event_manager;
    #command_engine;

    get command_engine                         (){ return this.#command_engine; }
    set_command_engine(new_command_engine=null)  { this.#command_engine = new_command_engine; }

    get key_map                  (){ return this.#key_event_manager.key_map; }
    set_key_map(new_key_map=null)  { this.#key_event_manager.set_key_map(new_key_map); }

    get_ancestor_interaction_element() {
        for (let n = this.parentNode; n; n = n.parentNode) {
            if (n instanceof InteractionElement) {
                return n;
            }
        }
        return null;
    }


    // === WEB COMPONENT LIFECYCLE ===

    // connectedCallback:
    //     Invoked each time the custom element is appended into a document-connected element.
    //     This will happen each time the node is moved, and may happen before the element's contents have been fully parsed.
    //     Note: connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
    connectedCallback() {
        this.#key_event_manager.attach();
        this.on_connect();
    }

    // disconnectedCallback:
    //     Invoked each time the custom element is disconnected from the document's DOM.
    disconnectedCallback() {
        this.#key_event_manager.detach();
        this.on_disconnect();
    }

    // adoptedCallback:
    //     Invoked each time the custom element is moved to a new document.
    adoptedCallback() {
        this.#key_event_manager.attach();
        this.on_connect();
        //!!!
    }

    // attributeChangedCallback:
    //     Invoked each time one of the custom element's attributes is added, removed, or changed.
    //     Which attributes to notice change for is specified in a static get observedAttributes method
    attributeChangedCallback(name, old_value, new_value) {
        switch (name) {
            case 'xyzzy': {
                //!!!
            }
            break;
        }
        //!!!
    }

    static get observedAttributes() {
         return [
             'xyzzy',//!!!
         ];
    }


    // === STATE ===

    #apply_state_update(updater) {
        //!!!
    }

    async update(updater=null) {
        if (state_reducer) {
            this.state = state_reducer(state_reducer);
        }
        if (this.before_render(new_state_values) !== false) {
            this.render();
        }
        //!!!
    }


    // === LIFECYCLE ===

    on_connect() {
    }

    on_disconnect() {
    }

    before_render() {
        // return false (and only false) to prevent render
        // returning nothing or undefined permits render
        //!!!
    }

    render() {
        //!!!
    }

    before_update() {
        //!!!
    }

    on_update() {
        //!!!
    }


    // === INTERNAL ===

    #command_event_handler(event) {
        this.command_engine.perform(event.command, event).catch(error => console.error('error processing command', event, error));  //!!! needs improvement; check return value, etc
    }

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        globalThis.customElements.define('interaction-element', this);
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
InteractionElement._init_static();
