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
    indentUnit,
    getIndentUnit,
    indentString,
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

import {
    settings_updated_events,
    get_settings,
} from '../settings/_.js';


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
            basicSetup,
            javascript(),
        ],
    });

    const view = new EditorView({
        state,
        parent: cell,
    });

    return view;
}

settings_updated_events.subscribe(() => {
    const settings = get_settings();
    
});
