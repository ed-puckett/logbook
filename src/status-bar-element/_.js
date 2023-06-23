const current_script_url = import.meta.url;  // save for later

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
                this.#configure(options);
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
            [ 'editable', this.#create__editable.bind(this),  this.constructor.#getter__editable,  this.constructor.#setter__editable ],
            [ 'visible',  this.#create__visible.bind(this),   this.constructor.#getter__visible,   this.constructor.#setter__visible  ],
            [ 'autoeval', this.#create__autoeval.bind(this),  this.constructor.#getter__autoeval,  this.constructor.#setter__autoeval ],
            [ 'type',     this.#create__type.bind(this),      this.constructor.#getter__type,      this.constructor.#setter__type     ],
            [ 'running',  this.#create__running.bind(this),   this.constructor.#getter__running,   this.constructor.#setter__running  ],
            [ 'modified', this.#create__modified.bind(this),  this.constructor.#getter__modified,  this.constructor.#setter__modified ],
            [ 'run',      this.#create__run.bind(this),       this.constructor.#getter__run,       this.constructor.#setter__run      ],

        ];
    }


    // === CONTROL HANDLING ===

    async #create__editable(on_change_handler=null) {
        const control = create_element({
            parent: this,
            tag: 'input',
            attrs: {
                type: 'checkbox',
                title: 'editable...',
            },
        });
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        return control;
    }
    static #getter__editable(control)        { return control.checked; }
    static #setter__editable(control, value) { control.checked = !!value; }

    async #create__visible(on_change_handler=null) {
        const control = create_element({
            parent: this,
            tag: 'input',
            attrs: {
                type: 'checkbox',
                title: 'visible...',
            },
        });
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
        return control;
    }
    static #getter__visible(control)        { return control.checked; }
    static #setter__visible(control, value) { control.checked = !!value; }

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
        return control;
    }
    static #getter__type(control, value) { return control.value; }
    static #setter__type(control, value) {
        if (![ ...control.options ].map(option => option.value).includes(value)) {  //!!! what a kludge...
            throw new Error('setting unknown/illegal value');
        }
        control.value = value;
    }

    async #create__running(on_change_handler=null) { return this.#indicator_control__create_with_class_and_title('running', 'running...', on_change_handler); }
    static #getter__running(control)         { return this.#indicator_control__getter(control); }
    static #setter__running(control, value)  { return this.#indicator_control__setter(control, value); }

    async #create__modified(on_change_handler=null) { return this.#indicator_control__create_with_class_and_title('modified', 'modified...', on_change_handler); }
    static #getter__modified(control)         { return this.#indicator_control__getter(control); }
    static #setter__modified(control, value)  { return this.#indicator_control__setter(control, value); }

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
    #indicator_control__create_with_class_and_title(css_class, title, on_change_handler=null) {
        const control = create_element({
            parent: this,
            attrs: {
                title,
                class: `${this.constructor.indicator_control__class} ${css_class}`,
            },
        });
        if (on_change_handler) {
            this.#event_listener_manager.add(control, 'change', on_change_handler);
        }
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
