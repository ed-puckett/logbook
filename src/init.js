import {
    EvalCellElement,  // ensure that the "eval-cell" custom element has been defined
} from './eval-cell-element/_.js';

import {
    logbook_manager,
} from './logbook-manager.js';


await logbook_manager.initialize();
console.log('>>>', 'import.meta.url', import.meta.url, 'location.pathname', location.pathname);//!!!
