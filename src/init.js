// ensure that the various custom elements have been defined
import { ToggleSwitchElement } from './toggle-switch-element/_.js';
import { ToolBarElement      } from './tool-bar-element/_.js';
import { EditorCellElement   } from './editor-cell-element/_.js';
import { EvalCellElement     } from './eval-cell-element/_.js';

import {
    LogbookManager,
} from './logbook-manager.js';

window.addEventListener('load', async (load_event) => {
    LogbookManager.singleton;  // accessing this will trigger document initialization
}, {
    once: true,
});
