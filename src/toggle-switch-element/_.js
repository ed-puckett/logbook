const current_script_url = import.meta.url;  // save for later

import {
    EventListenerManager,
} from '../../lib/sys/event-listener-manager.js';

import {
    create_element,
} from '../../lib/ui/dom-util.js';

import {
    assets_server_url,
} from '../assets-server-url.js';

// import {
//     create_stylesheet_link,
// } from '../../lib/ui/dom-util.js';
// create_stylesheet_link(document.head, new URL('./style.css', assets_server_url(current_script_url)));
/* do not import; stylesheet coalesced into main stylesheet
import './style.css';  // webpack implementation
*/


export class ToggleSwitchElement extends HTMLElement {
    static custom_element_name = 'toggle-switch';

    static create(options=null) {
        const {
            parent,
            class: cls,
            title_for_on,
            title_for_off,
            svg,
        } = (options ?? {});
        const control = create_element({
            parent,
            tag: this.custom_element_name,
            attrs: {
                class: cls,
                role: 'switch',
                "aria-checked": false,
                title: title_for_off,
            },
        });
        control.#event_listener_manager.add(control, 'change', (event) => {
            control.title = control.get_state() ? title_for_on : title_for_off;
        });
        return control;
    }

    constructor() {
        super();
//        this.setAttribute('role', 'switch');
//        this.setAttribute('aria-checked', this.get_state());  // ensure 'aria-checked' is set
        this.#event_listener_manager = new EventListenerManager();
        this.#event_listener_manager.add(this, 'click', (event) => {
            this.set_state();
        });
    }
    #event_listener_manager;

    get_state() {
        return (this.getAttribute('aria-checked') === 'true');
    }

    set_state(new_state=null) {
        const old_state = this.get_state();
        new_state ??= !old_state;  // if no argument, then toggle state
        new_state = !!new_state;
        this.setAttribute('aria-checked', new_state);
        if (old_state !== new_state) {
            this.dispatchEvent(new Event('change'));
        }
    }


    // === WEB COMPONENT LIFECYCLE ===

    // connectedCallback:
    //     Invoked each time the custom element is appended into a document-connected element.
    //     This will happen each time the node is moved, and may happen before the element's contents have been fully parsed.
    //     Note: connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
    connectedCallback() {
        this.#event_listener_manager.attach();
    }

    // disconnectedCallback:
    //     Invoked each time the custom element is disconnected from the document's DOM.
    disconnectedCallback() {
        this.#event_listener_manager.detach();
    }

    // adoptedCallback:
    //     Invoked each time the custom element is moved to a new document.
    adoptedCallback() {
        this.#event_listener_manager.attach();
    }

    // attributeChangedCallback:
    //     Invoked each time one of the custom element's attributes is added, removed, or changed.
    //     Which attributes to notice change for is specified in a static get observedAttributes method
    attributeChangedCallback(name, old_value, new_value) {
        switch (name) {
        case 'xyzzy': {
            //!!!
            break;
        }
        }
        //!!!
    }

    static get observedAttributes() {
        return [
            'xyzzy',//!!!
        ];
    }


    // === INTERNAL ===

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        globalThis.customElements.define(this.custom_element_name, this);
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
ToggleSwitchElement._init_static();
