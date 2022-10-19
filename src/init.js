const {
    create_child_element,
    show_initialization_failed,
} = await import('./dom-util.js');

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

    create_child_element(document.head, 'meta', {
        "http-equiv": "Content-Security-Policy",
        "content":    csp_header_content,
    });


    // === LOAD CORE MODULES ===

    const start = (new URL(import.meta.url)).searchParams.get('start') ?? 'logbook';
console.log('start', start, (new URL(import.meta.url)).searchParams);//!!!

    if (start !== 'logbook') {
        show_initialization_failed(new Error('start parameter must be "logbook"'));
    } else {
        await import(new URL('./logbook.js', import.meta.url));
    }

} catch (error) {

    show_initialization_failed(error);

}
