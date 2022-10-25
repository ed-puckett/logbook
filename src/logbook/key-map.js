const {
    canonical_key_spec_separator,
    parse_key_spec,
} = await import('./key-spec.js');


// === KEY MAP ===

export class KeyMap {
    #prior;     // prior keymap which this one shadows
    #bindings;  // key/command bindings
    #mapping;   // canonical_key_spec->(command|another_mapping)
    #mapper;    // Mapper instance associated with this KeyMap

    constructor(prior=null, bindings=null) {
        if (prior !== null && typeof prior !== 'undefined' && !(prior instanceof this.constructor)) {
            throw new Error('prior must be null/undefined or a KeyMap instance');
        }
        this.#prior    = prior;
        this.#bindings = bindings;
        this.#mapping  = this.constructor.#create_mapping(bindings);  // set up this.#mapping
        this.#mapper = new this.constructor.Mapper(prior?.mapper, this.#mapping);
    }

    get prior    (){ return this.#prior; }
    get bindings (){ return this.#bindings; }
    get mapper   (){ return this.#mapper; }

    static #create_mapping(bindings) {
        const mapping = {}
        for (const command in bindings) {
            if (command.length <= 0) {
                throw new Error('bindings keys (commands) must not be empty strings');
            }
            for (const key_sequence of bindings[command]) {
                let seq_mapping = mapping;  // current mapping being acted upon by current key_spec of sequence
                const seq_key_specs = key_sequence.split(canonical_key_spec_separator);
                for (let i = 0; i < seq_key_specs.length; i++) {
                    const key_spec = seq_key_specs[i];
                    const is_last = (i >= seq_key_specs.length-1);
                    const canonical_key_spec = parse_key_spec(key_spec);
                    const existing = seq_mapping[canonical_key_spec];
                    if (typeof existing === 'string' || (typeof existing === 'object' && is_last)) {
                        // something else already mapped here...
                        const seq_so_far = seq_key_specs.slice(0, i+1).join(canonical_key_spec_separator);
                        throw new Error(`duplicate bindings specified for key sequence: ${seq_so_far}`);
                    }
                    if (!is_last) {
                        seq_mapping = existing ?? (seq_mapping[canonical_key_spec] = {});
                    } else {
                        seq_mapping[canonical_key_spec] = command;  // and then we're done...
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

        // returns a string (complete), or undefined (failed), or a new Mapper instance
        consume(key_spec) {
            const canonical_key_spec = parse_key_spec(key_spec);
            // this.#mapping takes precedence over this.#prior_mapper
            const mapping_result = this.#mapping?.[canonical_key_spec];  // returns: undefined, string, or another mapping (object)
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
    };
}
