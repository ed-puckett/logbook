const {
    KeySpec,
} = await import('./key-spec.js');


// === KEY MAP ===

export class KeyMap {
    constructor(prior=null, bindings=null) {
        if (prior !== null && typeof prior !== 'undefined' && !(prior instanceof this.constructor)) {
            throw new Error('prior must be null/undefined or a KeyMap instance');
        }
        this.#prior    = prior;
        this.#bindings = bindings;
        this.#mapping  = this.constructor.#create_mapping(bindings);  // set up this.#mapping
        this.#mapper   = new this.constructor.Mapper(prior?.mapper, this.#mapping);
    }

    #prior;     // prior keymap which this one shadows
    #bindings;  // key/command bindings
    #mapping;   // canonical_key_string->(command|another_mapping)
    #mapper;    // Mapper instance associated with this KeyMap

    get prior    (){ return this.#prior; }
    get bindings (){ return this.#bindings; }
    get mapper   (){ return this.#mapper; }

    static #create_mapping(bindings) {
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
        #prior_mapper;
        #mapping;

        constructor(prior_mapper, mapping) {
            if (prior_mapper !== null && typeof prior_mapper !== 'undefined' && !(prior_mapper instanceof this.constructor)) {
                throw new Error('prior_mapper must be null/undefined or a Mapper instance');
            }
            if (mapping !== null && typeof mapping !== 'undefined' && typeof mapping !== 'object') {
                throw new Error('mapping must be null/undefined or an object');
            }
            if (!prior_mapper && !mapping) {
                throw new Error('at least one of prior_mapper or mapping must be given');
            }
            this.#prior_mapper = prior_mapper;
            this.#mapping      = mapping;
        }

        // returns a command string (complete), or undefined (failed), or a new Mapper instance (waiting for next key in sequence)
        consume(key_spec) {
            const canonical_key_string = key_spec.canonical;
            // this.#mapping takes precedence over this.#prior_mapper
            const mapping_result = this.#mapping?.[canonical_key_string];  // returns: undefined, string, or another mapping (object)
            if (typeof mapping_result === 'string') {
                return mapping_result;
            }
            const prior_mapper_result = this.#prior_mapper?.consume(key_spec);
            if (typeof prior_mapper_result === 'string') {
                return prior_mapper_result;
            }
            if (!mapping_result && !prior_mapper_result) {
                return undefined;  // indicate: failed
            }
            return mapping_result
                ? new Mapper(prior_mapper_result, mapping_result)
                : prior_mapper_result;  // no need to compose with mapping_result (which is undefined)
        }

        consume_key_string(key_string) {
            return this.consume(new KeySpec(key_string));
        }
    };
}
