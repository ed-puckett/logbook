import {
    basicSetup,
} from 'codemirror';

import {
    EditorState,
    Compartment,
} from "@codemirror/state";

import {
    EditorView,
    keymap,
} from "@codemirror/view";

import {
    defaultKeymap,
    undoDepth,
    redoDepth,
} from "@codemirror/commands";

import {
    indentUnit,
} from '@codemirror/language';

import {
    javascript,
} from "@codemirror/lang-javascript";

import {
    EditorCellElement,
} from './_.js';

import {
    clear_element,
} from '../../lib/ui/dom-tools.js';

import {
    get_settings,
} from '../settings/_.js';


class CodemirrorInterface {
    constructor(cell) {
        if (!(cell instanceof EditorCellElement)) {
            throw new Error('cell must be an instance of EditorCellElement');
        }

        const text = cell.get_text();

        this.#tab_size_compartment    = new Compartment();
        this.#indent_unit_compartment = new Compartment();

        const state = EditorState.create({
            doc: text,
            extensions: [
                this.#tab_size_compartment.of(EditorState.tabSize.of(8)),
                this.#indent_unit_compartment.of(indentUnit.of(' '.repeat(2))),
                keymap.of(defaultKeymap),
                basicSetup,
                javascript(),
            ],
        });

        clear_element(cell);

        const view = new EditorView({
            parent: cell,
            state,
        });

        Object.defineProperties(this, {
            view: {
                enumerable: true,
                value: view,
            }
        });

        this.update_from_settings();
    }
    #tab_size_compartment;
    #indent_unit_compartment;

    get_text() {
        return this.view.state.doc.toString();
    }

    set_text(text) {
        this.view.dispatch({ from: 0, to: this.view.state.doc.length, insert: text });
    }

    focus() {
        this.view.focus();
    }

    scroll_into_view() {
        this.view.dispatch({ effects: EditorView.scrollIntoView(0) });
    }

    update_from_settings() {
        const {
            tab_size,
            indent,
        } = get_settings().editor_options;
        const indent_unit_string = ' '.repeat(indent);
        this.view.dispatch({ effects: [
            this.#tab_size_compartment.reconfigure(EditorState.tabSize.of(tab_size)),
            this.#indent_unit_compartment.reconfigure(indentUnit.of(indent_unit_string)),
        ]});
        //!!!
    }
}

export function create_codemirror_view(cell) {
    return new CodemirrorInterface(cell);
}
