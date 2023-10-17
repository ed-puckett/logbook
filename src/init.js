// ensure that the various custom elements have been defined
// this is not entirely necessary but gets stylesheets, etc loaded right away
import './toggle-switch-element/_.js';
import './tool-bar-element/_.js';
import './editor-cell-element/_.js';
import './eval-cell-element/_.js';

import {
    LogbookManager,
} from './logbook-manager.js';


const view_param_name         = 'view';
const view_param_value_edit   = 'edit';
const view_param_value_output = 'output';

if (document.readyState === 'interactive' || document.readyState === 'complete') {
    trigger_document_initialization();
} else {
    window.addEventListener('load', (load_event) => {
        trigger_document_initialization();
    }, {
        once: true,
    });
}

function trigger_document_initialization() {
    LogbookManager.singleton;  // accessing this getter will trigger document initialization

    // update view according to parameter
    const view_value = new URLSearchParams(document.location.search).get(view_param_name)  // from URL search
          ?? document.body?.getAttribute(view_param_name)                                  // from document.body
          ?? document.documentElement.getAttribute(view_param_name);                       // from document.documentElement

    switch (view_value) {
        case view_param_value_edit:   LogbookManager.singleton.expand_input_output_split();   break;
        case view_param_value_output: LogbookManager.singleton.collapse_input_output_split(); break;

        default: {
            if (view_value) {
                console.warn(`ignored unknown "${view_param_name}" parameter "${view_value}"`);
            }
        }
        break;
    }

    globalThis.logbook_manager = LogbookManager.singleton;//!!!
}
