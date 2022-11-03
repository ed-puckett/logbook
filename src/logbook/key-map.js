const {
    KeySpec,
} = await import('./key-spec.js');


// === KEY MAP ===

export class KeyMap {
    constructor(bindings) {
        this.#bindings = bindings;
        this.#mapping  = this.constructor.#create_mapping(bindings);
    }
    #bindings;  // key/command bindings
    #mapping;   // canonical_key_string->(command|another_mapping)

    get bindings (){ return this.#bindings; }

    get_mapper(fallback_mapper=null) {
        return new this.constructor.Mapper(this.#mapping, fallback_mapper);
    }

    static multi_mapper(...key_maps) {
        if (key_maps.length <= 0) {
            throw new Error('at least one KeyMap instance must be given');
        }
        if (!key_maps.every(m => m instanceof this)) {
            throw new Error('arguments must all be KeyMap instances');
        }
        return key_maps.reduce((mapper, key_map) => key_map.get_mapper(mapper), null);
    }

    static #create_mapping(bindings) {
        if (bindings !== null && typeof bindings !== 'undefined' && typeof bindings !== 'object') {
            throw new Error('bindings must be null/undefined or an object');
        }
        const mapping = {};
        for (const command in bindings) {
            if (command.length <= 0) {
                throw new Error('bindings keys (commands) must not be empty strings');
            }
            for (const key_sequence of bindings[command]) {
                let seq_mapping = mapping;  // current mapping being acted upon by current key_string of sequence
                const seq_key_strings = key_sequence.split(KeySpec.canonical_key_string_separator);
                for (let i = 0; i < seq_key_strings.length; i++) {
                    const key_string = seq_key_strings[i];
                    const is_last = (i >= seq_key_strings.length-1);
                    const canonical_key_string = new KeySpec(key_string).canonical;
                    const existing = seq_mapping[canonical_key_string];
                    if (typeof existing === 'string' || (typeof existing === 'object' && is_last)) {
                        // something else already mapped here...
                        const seq_so_far = seq_key_strings.slice(0, i+1).join(canonical_key_string_separator);
                        throw new Error(`duplicate bindings specified for key sequence: ${seq_so_far}`);
                    }
                    if (!is_last) {
                        seq_mapping = existing ?? (seq_mapping[canonical_key_string] = {});
                    } else {
                        seq_mapping[canonical_key_string] = command;  // and then we're done...
                    }
                }
            }
        }
        return mapping;
    }

    static Mapper = class Mapper {
        constructor(mapping, fallback_mapper=null) {
            if (mapping !== null && typeof mapping !== 'undefined' && typeof mapping !== 'object') {
                throw new Error('mapping must be null/undefined or an object');
            }
            if (fallback_mapper !== null && typeof fallback_mapper !== 'undefined' && !(fallback_mapper instanceof this.constructor)) {
                throw new Error('fallback_mapper must be null/undefined or a KeyMap instance');
            }
            if (!mapping && !fallback_mapper) {
                throw new Error('at least one of mapping or fallback_mapper must be given');
            }
            this.#mapping         = mapping;
            this.#fallback_mapper = fallback_mapper;
        }
        #mapping;
        #fallback_mapper;

        // returns a command string (complete), or undefined (failed), or a new Mapper instance (waiting for next key in sequence)
        consume(key_string_or_key_spec) {
            const key_spec = (key_string_or_key_spec instanceof KeySpec)
                  ? key_string_or_key_spec
                  : new KeySpec(key_string_or_key_spec);
            const canonical_key_string = key_spec.canonical;
            // this.#mapping takes precedence over this.#fallback_mapper
            const mapping_result = this.#mapping?.[canonical_key_string];  // returns: undefined, string, or another mapping (object)
            if (typeof mapping_result === 'string') {
                return mapping_result;
            }
            const fallback_mapper_result = this.#fallback_mapper?.consume(key_spec);
            if (typeof fallback_mapper_result === 'string') {
                return fallback_mapper_result;
            }
            if (!mapping_result && !fallback_mapper_result) {
                return undefined;  // indicate: failed
            }
            return mapping_result
                ? new Mapper(mapping_result, fallback_mapper_result)
                : fallback_mapper_result;  // no need to compose with mapping_result (which is undefined)
        }
    };
}
