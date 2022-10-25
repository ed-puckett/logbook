const {
    asyncify_event_source,
} = await import('../lib/iterable-util.js');


export class InteractionElement extends Element {
    constructor() {
        super();
        // ...
    }

    // === WEB COMPONENT LIFECYCLE ===

    // connectedCallback:
    //     Invoked each time the custom element is appended into a document-connected element.
    //     This will happen each time the node is moved, and may happen before the element's contents have been fully parsed.
    //     Note: connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
    // 
    // disconnectedCallback:
    //     Invoked each time the custom element is disconnected from the document's DOM.
    // 
    // adoptedCallback:
    //     Invoked each time the custom element is moved to a new document.
    // 
    // attributeChangedCallback:
    //     Invoked each time one of the custom element's attributes is added, removed, or changed.
    //     Which attributes to notice change for is specified in a static get observedAttributes method
    // 
    // static get observedAttributes() {
    //     return [ 'attr1', ... ];
    // }


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
    }

    before_update() {
    }

    on_update() {
    }
}
