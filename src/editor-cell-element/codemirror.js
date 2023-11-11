import {
    basicSetup,
} from 'codemirror';

import {
    EditorState,
} from "@codemirror/state";

import {
    EditorView,
    keymap,
} from "@codemirror/view";

import {
    defaultKeymap,
} from "@codemirror/commands";

import {
    javascript,
} from "@codemirror/lang-javascript";

import {
    EditorCellElement,
} from './_.js';

import {
    clear_element,
} from '../../lib/ui/dom-tools.js';


export function create_codemirror_view(cell) {
    if (!(cell instanceof EditorCellElement)) {
        throw new Error('cell must be an instance of EditorCellElement');
    }

    const text = cell.get_text();
    clear_element(cell);

    const state = EditorState.create({
        doc: text,
        extensions: [
            keymap.of(defaultKeymap),
        ],
    });

    const view = new EditorView({
        state,
        parent: cell,
        extensions: [
            basicSetup,
            javascript(),
        ],
    });

    return view;
}
