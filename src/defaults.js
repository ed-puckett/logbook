const {
    deep_freeze,
} = await import('../lib/sys/util.js');

const {
    ChangeManager,
} = await import('../lib/ui/change-manager.js');


// === CONFIG ===

export const default_config = {
    placeholder: 'xyzzy',//!!!
}
deep_freeze(default_config);


// === KEY MAP ===

export const default_key_map_bindings = {
    undo: [ 'Ctrl-z' ],
    redo: [ 'Shift-Ctrl-z' ],
};
deep_freeze(default_key_map_bindings);

export function default_key_map_insert_self_recognizer(key_spec) {
    return key_spec.is_printable ? 'insert-self' : false;
}


// === COMMAND ENGINE ===

export function create_default_command_engine_bindings(change_manager) {
    if (change_manager !== null && typeof change_manager !== 'undefined' && !(change_manager instanceof ChangeManager)) {
        throw new Error('change_manager must be null/undefined or an instance of ChangeManager');
    }
    const command_engine_bindings = {
        'insert-self': (command, context, command_engine) => {
            //!!! this needs improvement
            // access textContent instead of innerText to avoid formatting-awareness of innerText's value
            const key_spec = context?.key_spec;
            command_engine.element.innerText = command_engine.element.textContent + (key_spec?.key ?? key_spec?.canonical ?? '');
        },
    };
    if (change_manager) {
        Object.assign(command_engine_bindings, {
            undo: (command, context, command_engine) => {
                change_manager.perform_undo();
            },
            redo: (command, context, command_engine) => {
                change_manager.perform_redo();
            },
        });
    }
    deep_freeze(command_engine_bindings);
    return command_engine_bindings;
}
