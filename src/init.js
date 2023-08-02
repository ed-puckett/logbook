// ensure that the various custom elements have been defined
// this is not entirely necessary but gets stylesheets, etc loaded right away
import './toggle-switch-element/_.js';
import './tool-bar-element/_.js';
import './editor-cell-element/_.js';
import './eval-cell-element/_.js';

import {
    LogbookManager,
} from './logbook-manager.js';

if (document.readyState === 'interactive') {
    trigger_document_initialization();
} else {
    window.addEventListener('load', (load_event) => {
        trigger_document_initialization();
    }, {
        once: true,
    });
}

function trigger_document_initialization() {
    LogbookManager.singleton;  // accessing this will trigger document initialization
globalThis.logbook_manager = LogbookManager.singleton;//!!!
}
