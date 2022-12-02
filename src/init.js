const {
    create_element,
    show_initialization_failed,
} = await import('../lib/ui/dom-util.js');

const {
    default_key_map_bindings,
    default_key_map_insert_self_recognizer,
    create_default_command_engine_bindings,
} = await import('./defaults.js');


try {  // catch and handle any errors during initialization

    // === CONTENT SECURITY POLICY ===

    // set a Content-Security-Policy that will permit us
    // to dynamically load associated content

    const csp_header_content = [
        //!!! audit this !!!
        "default-src 'self' 'unsafe-eval'",
        "style-src   'self' 'unsafe-inline' *",
        "script-src  'self' 'unsafe-inline' 'unsafe-eval' *",
        "img-src     'self' data: blob: *",
        "media-src   'self' data: blob: *",
        "connect-src data:",
    ].join('; ');

    create_element(document.head, 'meta', {
        "http-equiv": "Content-Security-Policy",
        "content":    csp_header_content,
    });


    // === LOAD CORE MODULES ===

    const start = (new URL(import.meta.url)).searchParams.get('start') ?? 'logbook';
console.log('start', start, (new URL(import.meta.url)).searchParams);//!!!

    if (start !== 'logbook') {
        show_initialization_failed(new Error('start parameter must be "logbook"'));
    } else {
//        await import(new URL('./main/_.js', import.meta.url));
        var { KeySpec, KeyMap } = await import('../lib/ui/key/_.js');
        var { ChangeManager } = await import('../lib/ui/change-manager.js');
        var { KeyEventManager, CommandEngine } = await import('../lib/ui/interaction-element/_.js');
        var ie = document.createElement('interaction-element');
        ie.innerText = '[[[ ie ]]]';
        ie.setAttribute('tabindex', 0);  // permit focus
        document.body.innerText = '';
        document.body.appendChild(ie);
        var change_manager = new ChangeManager(document.body);
        ie.focus();
        var key_map = new KeyMap(default_key_map_bindings, default_key_map_insert_self_recognizer);
        ie.set_key_map(key_map);
        const command_engine = new CommandEngine(ie, create_default_command_engine_bindings(change_manager));
        ie.set_command_engine(command_engine);
        // KeyEventManager.command_events.subscribe(event => console.log('>>>', event.key_spec.key, event));
        // ie.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', shiftKey: true }));
    }

} catch (error) {

    show_initialization_failed(error);

}
