const current_script_url = import.meta.url;  // save for later

import {
    ToggleSwitchElement,
} from '../toggle-switch-element/_.js';

import {
    EventListenerManager,
} from '../../lib/sys/event-listener-manager.js';

import {
    get_evaluator_classes,
} from '../evaluator/_.js';

import {
    create_element,
    clear_element,
    create_stylesheet_link,
} from '../../lib/ui/dom-util.js';


export class StatusBarElement extends HTMLElement {
    static custom_element_name = 'status-bar';

    static indicator_control__class            = 'status-bar-indicator';
    static indicator_control__attribute__value = 'data-indicator-value';

    static toggle_switch__editable__class = 'status-bar-toggle-editable';
    static toggle_switch__visible__class  = 'status-bar-toggle-visible';
    static toggle_switch__autoeval__class = 'status-bar-toggle-autoeval';

    /** create a new StatusBarElement in the document, then set target with options
     *  @param {any} target
     *  @param {Object|null|undefined} options to be passed to set_target()
     *  @return {StatusBarElement} status bar element
     */
    static async create_for(target, options) {
        const status_bar = document.createElement(this.custom_element_name);
        if (!status_bar) {
            throw new Error('error creating status bar');
        }
        try {
            await status_bar.set_target(target, options);
            return status_bar;
        } catch (error) {
            status_bar.remove();
            throw error;
        }
    }

    constructor() {
        super();
        this.#target = null;
        this.#event_listener_manager = new EventListenerManager();
        this.#reset_configuration();
        this.addEventListener('pointerdown', (event) => {
            this.#target.focus();
            if (event.target instanceof StatusBarElement) {
                // stop event only if target is directly a StatusBarElement, not one of its children
                event.preventDefault();
                event.stopPropagation();
            }
        });  // this listener is never removed
    }
    #event_listener_manager;
    #controls;  // name -> { name?, control?, get?, set?}

    set_type(type) {
        this.set_for('type', type);
    }


    // === TARGET ===

    #target;

    /** @return {any} current target
     */
    get target (){ return this.#target; }

    /** set the target for this status bar
     *  @param {any} target
     *  @param {Object|null|undefined} options: {
     *      editable?: { initial?, on? },
     *      visible?,  { initial?, on? },
     *      autoeval?, { initial?, on? },
     *      type?,     { initial?, on? },
     *      running?,  { initial?, on? },
     *      modified?, { initial?, on? },
     *      run?,      { initial?, on? },
     *  }
     * A prior target, if any, is silently replaced.
     */
    async set_target(target, options=null) {
        if (target !== null && typeof target !== 'undefined' && !(target instanceof EventTarget)) {
            throw new Error('target must be null, undefined, or and instance of EventTarget');
        }
        if (!target) {
            this.#target = null;
            this.#reset_configuration();
        } else {
            if (this.#target !== target) {
                this.#target = target;
                await this.#configure(options);
            }
        }
    }

    get_for(name, value) {
        return this.#controls[name]?.get?.();
    }
    set_for(name, value) {
        this.#controls[name]?.set?.(value);
    }


    // === CONFIGURATION ===

    /** set up controls, etc according to options
     *  @param {Object|null|undefined} options from set_target()
     */
    async #configure(options=null) {
        options ??= {};
        this.#reset_configuration();
        try {
            for (const [ name, create, getter, setter ] of this.#get_control_setup()) {
                let control_options = options[name];
                if (control_options) {
                    if (typeof control_options !== 'object') {
                        control_options = {};
                    }

                    const control = await create(control_options.on);
                    if ('initial' in control_options) {
                        setter(control, control_options.initial);
                    }

                    this.#controls[name] = {
                        name,
                        control,
                        get: getter.bind(StatusBarElement, control),
                        set: setter.bind(StatusBarElement, control),
                    };
                }
            }
        } catch (error) {
            this.#reset_configuration();
            throw error;
        }
    }

    #reset_configuration() {
        this.#event_listener_manager.remove_all();
        clear_element(this);
        this.#controls = {};
    }

    /** @return array of { name, create, getter, setter }
     */
    #get_control_setup() {
        return [
            // the order of this array determines order of control creation

            // NAME       CREATE_FN,                          GETTER_FN                            SETTER_FN
            [ 'running',  this.#create__running.bind(this),   this.constructor.#getter__running,   this.constructor.#setter__running  ],
            [ 'modified', this.#create__modified.bind(this),  this.constructor.#getter__modified,  this.constructor.#setter__modified ],
            [ 'editable', this.#create__editable.bind(this),  this.constructor.#getter__editable,  this.constructor.#setter__editable ],
            [ 'visible',  this.#create__visible.bind(this),   this.constructor.#getter__visible,   this.constructor.#setter__visible  ],
            [ 'autoeval', this.#create__autoeval.bind(this),  this.constructor.#getter__autoeval,  this.constructor.#setter__autoeval ],
            [ 'run',      this.#create__run.bind(this),       this.constructor.#getter__run,       this.constructor.#setter__run      ],
            [ 'type',     this.#create__type.bind(this),      this.constructor.#getter__type,      this.constructor.#setter__type     ],

        ];
    }


    // === CONTROL HANDLING ===

    async #create__editable(on_change_handler=null) {
        const control = ToggleSwitchElement.create({
            parent: this,
            class:  this.constructor.toggle_switch__editable__class,
            title_for_on:  'edit mode on',
            title_for_off: 'edit mode off',
        });
        control.innerHTML = `\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" enable-background="new 0 0 50 50">
<!--
    From: Alexander Madyankin, Roman Shamin, MIT <http://opensource.org/licenses/mit-license.php>, via Wikimedia Commons
    https://commons.wikimedia.org/wiki/File:Ei-pencil.svg
-->
<path class="accent-fill" d="M9.6 40.4l2.5-9.9L27 15.6l7.4 7.4-14.9 14.9-9.9 2.5zm4.3-8.9l-1.5 6.1 6.1-1.5L31.6 23 27 18.4 13.9 31.5z" fill="#fff" fill-rule="evenodd"/>
<path class="accent-fill" d="M17.8 37.3c-.6-2.5-2.6-4.5-5.1-5.1l.5-1.9c3.2.8 5.7 3.3 6.5 6.5l-1.9.5z" fill="#fff" fill-rule="evenodd"/>
<path class="accent-fill" d="M29.298 19.287l1.414 1.414-13.01 13.02-1.414-1.412z" fill="#fff" fill-rule="evenodd"/>
<path class="accent-fill" d="M11 39l2.9-.7c-.3-1.1-1.1-1.9-2.2-2.2L11 39z" fill="#fff" fill-rule="evenodd"/>
<path class="accent-fill" d="M35 22.4L27.6 15l3-3 .5.1c3.6.5 6.4 3.3 6.9 6.9l.1.5-3.1 2.9zM30.4 15l4.6 4.6.9-.9c-.5-2.3-2.3-4.1-4.6-4.6l-.9.9z" fill="#fff" fill-rule="evenodd"/>
</svg>
`;
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        return control;
    }
    static #getter__editable(control)        { return control.get_state(); }
    static #setter__editable(control, value) { control.set_state(value); }

    async #create__visible(on_change_handler=null) {
        const control = ToggleSwitchElement.create({
            parent: this,
            class:  this.constructor.toggle_switch__visible__class,
            title_for_on:  'visible',
            title_for_off: 'not visible',
        });
        control.innerHTML = `\
<?xml version="1.0" encoding="UTF-8"?>
<!--
    From: Vectorization:  Mrmw, CC0, via Wikimedia Commons
    https://commons.wikimedia.org/wiki/File:ISO_7000_-_Ref-No_2030.svg
-->
<svg
  xmlns="http://www.w3.org/2000/svg"
  version="1.1"
  viewBox="0 0 200 200" 
>
  <path class="accent-stroke" d="m100 49.738a97.452 97.452 0 0 0-78.246 39.775 97.452 97.452 0 0 0 78.246 39.773 97.452 97.452 0 0 0 78.396-39.975 97.452 97.452 0 0 0-78.396-39.574z" stroke="#000" stroke-width="5" fill="transparent"/>
  <circle class="accent-stroke accent-fill" cx="100" cy="89.438" r="19.85" stroke="#000" stroke-width="5"/>
</svg>
`;
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        return control;
    }
    static #getter__visible(control)        { return control.get_state(); }
    static #setter__visible(control, value) { control.set_state(value); }

    async #create__autoeval(on_change_handler=null) {
        const control = create_element({
            parent: this,
            tag: 'input',
            attrs: {
                type: 'checkbox',
                title: 'autoeval...',
            },
        });
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        this.#event_listener_manager.add(control, 'change', (event) => {
            control.title = control.checked ? 'autoeval off...' : 'autoeval on...';
        });
        return control;
    }
    static #getter__autoeval(control)        { return control.checked; }
    static #setter__autoeval(control, value) { control.checked = !!value; }

    async #create__type(on_change_handler=null) {
        const control = create_element({
            parent: this,
            tag: 'select',
            attrs: {
                title: 'type...',
            },
        });

        const types = new Set((await get_evaluator_classes()).map(e => e.handled_input_types).flat()).values();
        let subsequent = false;
        for (const type of types) {
            create_element({
                parent: control,
                tag: 'option',
                attrs: {
                    title: 'type...',
                    label: type,
                    ...(subsequent ? {} : { selected: !subsequent }),  // first entry is default
                    value: type,
                },
            });
            subsequent = true;
        }

        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        this.#event_listener_manager.add(control, 'change', (event) => {
            control.title = `type ${control.value}`;
        });
        return control;
    }
    static #getter__type(control)        { return control.value; }
    static #setter__type(control, value) {
        if (![ ...control.options ].map(option => option.value).includes(value)) {  //!!! what a kludge...
            throw new Error('setting unknown/illegal value');
        }
        control.value = value;
    }

    async #create__running(on_change_handler=null) {
        return this.#indicator_control__create_with_class_and_title('running', 'running...', 'done...', on_change_handler);
    }
    static #getter__running(control)        { return this.#indicator_control__getter(control); }
    static #setter__running(control, value) { this.#indicator_control__setter(control, value); }

    async #create__modified(on_change_handler=null) {
        return this.#indicator_control__create_with_class_and_title('modified', 'modified...', 'not modified...', on_change_handler);
    }
    static #getter__modified(control)        { return this.#indicator_control__getter(control); }
    static #setter__modified(control, value) { this.#indicator_control__setter(control, value); }

    async #create__run(on_change_handler=null) {
        //!!!
    }
    static #getter__run(control) {
        //!!!
    }
    static #setter__run(control, value) {
        //!!!
    }

    // indicator control getter/setter
    #indicator_control__create_with_class_and_title(css_class, title_for_on, title_for_off, on_change_handler=null) {
        const control = create_element({
            parent: this,
            attrs: {
                title: title_for_off,
                class: `${this.constructor.indicator_control__class} ${css_class}`,
            },
        });
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        this.#event_listener_manager.add(control, 'change', (event) => {
            control.title = this.constructor.#indicator_control__getter(control) ? title_for_on : title_for_off;
        });
        return control;
    }
    static #indicator_control__getter(control) {
        return !!control.getAttribute(this.indicator_control__attribute__value);
    }
    static #indicator_control__setter(control, value) {
        const current_value = this.#indicator_control__getter(control);
        if (value !== current_value) {
            control.setAttribute(this.indicator_control__attribute__value, (value ? 'on' : ''));
            // dispatch "change" event
            const event = new Event('change', {});
            control.dispatchEvent(event);
        }
    }


    // === WEB COMPONENT LIFECYCLE ===

    // connectedCallback:
    //     Invoked each time the custom element is appended into a document-connected element.
    //     This will happen each time the node is moved, and may happen before the element's contents have been fully parsed.
    //     Note: connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
    connectedCallback() {
console.log('COMPONENT CONNECTED', this);//!!!
        this.#event_listener_manager.reattach();
    }

    // disconnectedCallback:
    //     Invoked each time the custom element is disconnected from the document's DOM.
    disconnectedCallback() {
console.log('COMPONENT DISCONNECTED', this);//!!!
        // event handlers have been disconnected, but just leave things alone so we can reconnect
    }

    // adoptedCallback:
    //     Invoked each time the custom element is moved to a new document.
    adoptedCallback() {
console.log('COMPONENT ADOPTED', this);//!!!
        this.#event_listener_manager.reattach();
    }

    // attributeChangedCallback:
    //     Invoked each time one of the custom element's attributes is added, removed, or changed.
    //     Which attributes to notice change for is specified in a static get observedAttributes method
    attributeChangedCallback(name, old_value, new_value) {
console.log('COMPONENT ATTRIBUTE CHANGED', this, { name, old_value, new_value });//!!!
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
        //!!! should we assume that the document is ready here?
        create_stylesheet_link(document.head, new URL('style.css', current_script_url));
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
StatusBarElement._init_static();
