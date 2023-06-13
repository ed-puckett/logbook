const current_script_url = import.meta.url;  // save for later

import {
    Subscribable,
} from '../../sys/subscribable.js';

import {
    generate_object_id,
} from '../../sys/uuid.js';

import {
    create_element,
    create_stylesheet_link,
} from '../dom-util.js';

import {
    KeySpec,
} from '../key/_.js';


// === MENUBAR CLASS ===

// css classification classes: menubar, menu, menuitem
// other css classes: disabled, selected, active
// also: menuitem-label, menuitem-separator, menuitem-annotation, collection, collection-arrow

export class MenuBar {
    static menu_element_tag_name     = 'menu';
    static menuitem_element_tag_name = 'li';

    static open_recent_command_prefix = 'open_recent_';  // + index (0-based)
    static max_recents = 10;

    static find_previous_menuitem(menuitem) {
        let mi = menuitem.previousElementSibling;
        while (mi && (!mi.classList.contains('menuitem') || mi.classList.contains('disabled'))) {
            mi = mi.previousElementSibling;
        }
        return mi;
    }

    static find_next_menuitem(menuitem) {
        let mi = menuitem.nextElementSibling;
        while (mi && (!mi.classList.contains('menuitem') || mi.classList.contains('disabled'))) {
            mi = mi.nextElementSibling;
        }
        return mi;
    }

    /** call this static method, not the constructor directly
     *  @param {Element} parent
     *  @param {Object} menubar_spec: {
     *      ...
     *  }
     *  @param {Function|null|undefined} get_command_bindings
     *  @param {AsyncFunction|null|undefined} get_recents
     *  @return {MenuBar} menu bar instance
     */
    static async create(parent, menubar_spec, get_command_bindings, get_recents) {
        const menubar = new this(parent, menubar_spec, get_command_bindings, get_recents);
        await menubar.rebuild_recents();
        return menubar;
    }

    constructor(parent, menubar_spec, get_command_bindings, get_recents) {
        if (!(parent instanceof Element)) {
            throw new Error('parent must be an instance of Element');
        }
        if (get_command_bindings !== null && typeof get_command_bindings !== 'undefined' && typeof get_command_bindings !== 'function') {
            throw new Error('get_command_bindings must be null, undefined, or a function');
        }
        if (get_recents !== null && typeof get_recents !== 'undefined' && typeof get_recents !== 'function') {
            throw new Error('get_recents must be null, undefined, or a function');
        }

        get_command_bindings ??= () => [];
        get_recents          ??= async () => [];

        const commands = new Subscribable();  // emits command_context: { command: string, event: Event, target: Element }

        Object.defineProperties(this, {
            get_command_bindings: {
                value:      get_command_bindings,
                enumerable: true,
            },
            get_recents: {
                value:      get_recents,
                enumerable: true,
            },
            commands: {
                value:      commands,
                enumerable: true,
            },
        });

        this.#menu_id_to_element = {};
        this.#menubar_container = this.#build_menubar(parent, menubar_spec);
    }
    #menu_id_to_element;
    #menubar_container;

    get element (){ return this.#menubar_container; }

    async activate(set_focus=false) {
        if (!(this.#menubar_container instanceof Element) || !this.#menubar_container.classList.contains('menubar')) {
            throw new Error('this.#menubar_container must be an Element with class "menubar"');
        }
        if (!this.#menubar_container.querySelector('.selected')) {
            await this.rebuild_recents();

            // select the first menuitem of the menubar
            const menubar_first_menuitem = this.#menubar_container.querySelector('.menuitem');
            if (menubar_first_menuitem) {
                this.#select_menuitem(menubar_first_menuitem);
            }
        }
        if (set_focus) {
            setTimeout(() => this.#menubar_container.focus());
        }
    }

    deactivate() {
        this.#deactivate_menu(this.#menubar_container);
    }

    // create the set_menu_enabled_state() utility function
    set_menu_enabled_state(menu_id, new_enabled_state) {
        const element = this.#menu_id_to_element[menu_id];
        if (!element) {
            throw new Error(`no element found for menu id "${menu_id}"`);
        }
        if (!element.classList.contains('menuitem')) {
            throw new Error(`element for menu id "${menu_id}" is not a menuitem`);
        }
        if (new_enabled_state) {
            element.classList.remove('disabled');
        } else {
            element.classList.add('disabled');
        }
    }

    async rebuild_recents() {
        //!!! we are assuming that the menu is not selected when this method is called and therefore not being careful about display issues...
        const recents_menuitem = this.#menu_id_to_element['recents'];
        const recents_container = recents_menuitem.querySelector('.menu');
        recents_container.innerText = '';  // clear children
        const recents = await this.get_recents();
        for (let i = 0; i < recents.length && i < this.constructor.max_recents; i++) {
            const filename = recents[i].stats.name;
            const command = `${this.constructor.open_recent_command_prefix}${i}`;

            const menuitem = this.#build_menuitem(filename);
            this.#add_item_menuitem_annotations_and_click_handler(menuitem, command);

            recents_container.appendChild(menuitem);
        }
    }

    // === INTERNAL ===

    /** deactivate the menubar or menu that contains the given menuitem
     *  and reset all subordinate state.
     *  @param {Element|undefined|null} menu_element an Element object with class either .menubar or .menu
     *  This is compatible with menuitem elements that are contained
     *  in either a .menubar or .menu element.
     */
    #deactivate_menu(menu_element) {
        if (menu_element) {
            if ( !(menu_element instanceof Element) ||
                 (!menu_element.classList.contains('menubar') && !menu_element.classList.contains('menu')) ) {
                throw new Error('menu_element must be an Element with class "menubar" or "menu"');
            }
            menu_element.classList.remove('active');
            menu_element.classList.remove('selected');
            for (const mi of menu_element.children) {
                mi.classList.remove('selected');
                if (mi.classList.contains('collection')) {
                    this.#deactivate_menu(mi.querySelector('.menu'));
                }
            }
        }
    }

    /** deselect the given menuitem
     *  @param {Element} menuitem_element
     *  This is compatible with menuitem elements that are contained
     *  in either a .menubar or .menu element.
     */
    #deselect_menuitem(menuitem_element) {
        menuitem_element.classList.remove('selected');
        if (menuitem_element.classList.contains('collection')) {
            this.#deactivate_menu(menuitem_element.querySelector('.menu'));
        }
    }

    /** select the given menuitem and deselect all others
     *  @param {Element} menuitem_element
     *  This is compatible with menuitem elements that are contained
     *  in either a .menubar or .menu element.
     */
    #select_menuitem(menuitem_element) {
        if (!menuitem_element.classList.contains('selected')) {
            // change selection only if not already selected
            for (const mi of menuitem_element.closest('.menubar, .menu').children) {
                if (mi === menuitem_element) {
                    mi.classList.add('selected');
                    if (mi.classList.contains('collection')) {
                        // make it "active" so that the submenu is displayed
                        mi.querySelector('.menu').classList.add('active');
                        // adjust the position of the collection
                        const collection = mi.querySelector('.menu');
                        const mi_br = mi.getBoundingClientRect();
                        if (mi.parentElement.classList.contains('menubar')) {
                            collection.style.top  = `${mi_br.y + mi_br.height}px`;
                            collection.style.left = `${mi_br.x}px`;
                        } else {
                            collection.style.top  = `${mi_br.y - mi_br.height}px`;
                            collection.style.left = `${mi_br.x + mi_br.width}px`;
                        }
                    }
                } else {
                    this.#deselect_menuitem(mi);
                }
            }
        }
    }

    /** Return a new menu Element object which represents a separator.
     *  @param {Element} parent
     */
    #build_menu_item_separator(parent) {
        if (!(parent instanceof Element)) {
            throw new Error('parent must be an instance of Element');
        }
        const element = create_element({
            parent,
            tag: this.constructor.menuitem_element_tag_name,
            attrs: {
                class: 'disabled menuitem menuitem-separator',
            },
        });
    }

    /** Return a new menu Element object for the given menu_spec.
     *  @param {object|string} menu_spec specification for menu item or collection.
     *         If a string, then create a separator (regardless of the string contents).
     *  @param {Element} parent
     *  @param {boolean} (optional) toplevel if the menu is the top-level "menubar" menu
     *         default value: false
     *  @return {Element} new menu Element
     *  Also updates this.#menu_id_to_element
     */
    #build_menu(menu_spec, parent, toplevel=false) {
        if (!(parent instanceof Element)) {
            throw new Error('parent must be an instance of Element');
        }
        if (typeof menu_spec === 'string') {
            return this.#build_menu_item_separator(parent);
        }

        const {
            label,
            collection,
            item,
            id: menu_id,
        } = menu_spec;

        if (typeof label !== 'string') {
            throw new Error('label must be specified as a string');
        }
        if (item && collection) {
            throw new Error('item and collection must not both be specified');
        }
        if (collection) {
            if (!Array.isArray(collection)) {
                throw new Error('collection must be an array');
            }
        }
        if (item) {
            if (typeof item !== 'object' || typeof item.command !== 'string') {
                throw new Error('item must specify an object with a string property "command"');
            }
        }
        if (!['undefined', 'string'].includes(typeof menu_id) || menu_id === '') {
            throw new Error('id must be a non-empty string');
        }

        // both items and collections are menuitem elements, but the collection also has children...
        const element = this.#build_menuitem(label, toplevel);

        if (item) {
            this.#add_item_menuitem_annotations_and_click_handler(element, item.command);
        } else {
            // collection
            element.classList.add('collection');

            const collection_element = create_element({
                parent: element,
                tag:    this.constructor.menu_element_tag_name,
                attrs: {
                    class: 'menu',
                },
            });
            if (!toplevel) {
                create_element({
                    parent: element,
                    attrs: {
                        class: 'menuitem-annotation collection-arrow',
                    },
                }).innerText = '\u25b8';  // right-pointing triangle
            }
            collection.forEach(spec => this.#build_menu(spec, collection_element));

            if (toplevel) {
                element.addEventListener('click', (event) => {
                    if (event.target.closest('.menuitem') === element) {  // make sure click is not in a child (submenu)
                        if (element.classList.contains('selected')) {
                            this.#deselect_menuitem(element);
                        } else {
                            this.#select_menuitem(element);
                        }
                        event.stopPropagation();
                        event.preventDefault();
                    }
                });
            }
        }

        if (menu_id) {
            this.#menu_id_to_element[menu_id] = element;
        }

        // wait to add to parent until everything else happens without error
        if (parent) {
            parent.appendChild(element);
        }

        return element;
    }

    #build_menuitem(label, toplevel=false) {
        // both items and collections are menuitem elements, but the collection also has children...
        const id = generate_object_id();
        const menuitem = create_element({
            tag: this.constructor.menuitem_element_tag_name,
            attrs: {
                id,
                class: 'menuitem',
            },
        });

        // add the label
        create_element({
            parent: menuitem,
            attrs: {
                class: 'menuitem-label',
            },
        }).innerText = label;

        menuitem.addEventListener('mousemove', (event) => {
            // don't pop open top-level menus unless one is already selected
            // this means that the user must click the top-level menu to get things started
            if (!toplevel || [ ...menuitem.parentElement.children ].some(c => c.classList.contains('selected'))) {
                if (!menuitem.classList.contains('disabled')) {
                    this.#select_menuitem(menuitem);
                }
            }
        });
        return menuitem;
    }
    #add_item_menuitem_annotations_and_click_handler(menuitem, command) {
        if (command) {
            const command_bindings = this.get_command_bindings();
            const kbd_bindings = command_bindings[command];
            if (kbd_bindings) {
                const kbd_container = create_element({
                    parent: menuitem,
                    attrs: {
                        class: 'menuitem-annotation',
                    },
                });
                // create <kbd>...</kbd> elements
                kbd_bindings.forEach(binding => {
                    const binding_glyphs = new KeySpec(binding).glyphs;
                    create_element({ parent: kbd_container, tag: 'kbd' }).innerText = binding_glyphs;
                });
            }
        }

        menuitem.addEventListener('click', (event) => {
            this.#deactivate_menu(menuitem.closest('.menubar'));
            const command_context = { command, event, target: event.target };
            this.commands.dispatch(command_context);
            event.stopPropagation();
            event.preventDefault();
        });
    }

    #build_menubar(parent, menubar_spec) {
        const menubar_container = create_element({
            parent,
            tag: this.constructor.menu_element_tag_name,
            attrs: {
                class:    'active menubar',
                role:     'navigation',
                tabindex: 0,
            },
            before: parent.firstChild,  // prepend
        });
        menubar_spec.forEach(spec => this.#build_menu(spec, menubar_container, true));

        // add event listener to close menu when focus is lost
        menubar_container.addEventListener('blur', (event) => {
            this.#deactivate_menu(menubar_container);
        });

        // add keyboard navigation event listener
        menubar_container.addEventListener('keydown', (event) => {
            const selected_elements = menubar_container.querySelectorAll('.selected');
            if (selected_elements.length <= 0) {
                if (! ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) {
                    return;  // do not handle or alter propagation
                } else {
                    // select the first menuitem of the menubar
                    const menubar_first_menuitem = menubar_container.querySelector('.menuitem');
                    if (menubar_first_menuitem) {
                        this.#select_menuitem(menubar_first_menuitem);
                    }
                }
            } else {
                const menuitem = selected_elements.at(-1);

                const is_in_menubar = (menuitem.parentElement === menubar_container);

                let key_menu_prev, key_menu_next, key_cross_prev, key_cross_next;
                if (is_in_menubar) {
                    key_menu_prev  = 'ArrowLeft';
                    key_menu_next  = 'ArrowRight';
                    key_cross_prev = 'ArrowUp';
                    key_cross_next = 'ArrowDown';
                } else {
                    key_menu_prev  = 'ArrowUp';
                    key_menu_next  = 'ArrowDown';
                    key_cross_prev = 'ArrowLeft';
                    key_cross_next = 'ArrowRight';
                }

                switch (event.key) {
                case 'Enter':
                case ' ': {
                    menuitem.click();
                    break;
                }
                case 'Escape': {
                    this.#deactivate_menu(menubar_container);
                    break;
                }
                case key_menu_prev: {
                    const mi = this.constructor.find_previous_menuitem(menuitem);
                    if (mi) {
                        this.#select_menuitem(mi);
                    } else if (!is_in_menubar) {
                        menuitem.classList.remove('selected');  // parent menuitem will still be selected
                    }
                    break;
                }
                case key_menu_next: {
                    const mi = this.constructor.find_next_menuitem(menuitem);
                    if (mi) {
                        this.#select_menuitem(mi);
                    }
                    break;
                }
                case key_cross_prev: {
                    if (!is_in_menubar) {
                        const menubar_menuitem = menubar_container.querySelector('.menuitem.selected');
                        const mbi = this.constructor.find_previous_menuitem(menubar_menuitem);
                        if (mbi) {
                            this.#select_menuitem(mbi);
                        }
                    }
                    break;
                }
                case key_cross_next: {
                    let navigated_into_collection = false;
                    if (menuitem.classList.contains('collection')) {
                        // enter collection if possible
                        const mi = menuitem.querySelector('.menuitem:not(.disabled)');
                        if (mi) {
                            this.#select_menuitem(mi);
                            navigated_into_collection = true;
                        }
                    }
                    if (!navigated_into_collection && !is_in_menubar) {
                        const menubar_menuitem = menubar_container.querySelector('.menuitem.selected');
                        const mbi = this.constructor.find_next_menuitem(menubar_menuitem);
                        if (mbi) {
                            this.#select_menuitem(mbi);
                        }
                    }
                    break;
                }

                default:
                    return;  // do not handle or alter propagation
                }
            }

            // if we get here, assume the event was handled and therefore
            // we should stop propagation and prevent default action.
            event.stopPropagation();
            event.preventDefault();
        }, {
            capture: true,
        });

        return menubar_container;
    }


    // === INTERNAL ===

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        //!!! should we assume that the document is ready here?
        create_stylesheet_link(document.head, new URL('style.css', current_script_url));
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
MenuBar._init_static();
