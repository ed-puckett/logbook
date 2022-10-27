// === KEYSPEC ===

export class KeySpec {
    constructor(key_string) {
        if (typeof key_string !== 'string' || key_string.length <= 0) {
            throw new Error('key_string must be a non-empty string');
        }
        this.#key_string = key_string;
        this.canonical;  // force parsing now to detect errors in key_string
    }

    get key_string (){ return this.#key_string; }


    // === CONSTANTS ===

    static canonical_key_modifier_separator = '+';  // separator between modifier codes and key in a canonical key string
    static canonical_key_string_separator   = ' ';  // separator between key_strings in a canonical key binding

    // #basic_modifier_desc_map is the definition from which modifier_desc_map and modifier_code_desc_map are derived
    static #basic_modifier_desc_map = {
        meta:  { code: 'm', event_prop: 'metaKey',  glyph: '\u2318', display_order: 3, alternates: [ 'cmd', 'command' ] },
        ctrl:  { code: 'c', event_prop: 'ctrlKey',  glyph: '\u2303', display_order: 1, alternates: [ 'control' ] },
        shift: { code: 's', event_prop: 'shiftKey', glyph: '\u21E7', display_order: 2, alternates: [] },
        alt:   { code: 'a', event_prop: 'altKey',   glyph: '\u2325', display_order: 4, alternates: [] },
    };

    static #other_key_glyphs = {
        arrowleft:  '\u2190',
        arrowup:    '\u2191',
        arrowright: '\u2192',
        arrowdown:  '\u2193',
        enter:      'Enter',
        backspace:  'Backspace',
        delete:     'Delete',
    };


    // === PARSING ===

    static from_keyboard_event(keyboard_event) {
        const modifier_descs = [];
        for (const modifier in this.#basic_modifier_desc_map) {
            const desc = this.#basic_modifier_desc_map[modifier];
            if (keyboard_event[desc.event_prop]) {
                modifier_descs.push(desc);
            }
        }
        const modifier_strings = modifier_descs
              .sort((a, b) => (a.display_order - b.display_order))
              .map(desc => this.#modifier_code_to_modifier[desc.code]);
        const key = event.key.toLowerCase();
        const key_string = `${modifier_strings}${this.#canonical_key_modifier_separator}${key}`;
        return new KeySpec(key_string);
    }

    get canonical (){
        if (!this.#canonical) {
            // cache result
            const modifiers = this.#key_string.split(/\s*[+-]\s*/).map(s => s.toLowerCase());
            if (modifiers.length < 1 || modifiers.some(s => s.length <= 0)) {
                throw new Error(`invalid key_string ${this.#key_string}`);
            }
            let key = modifiers[modifiers.length-1];  // note: already converted to lowercase above
            if (['up', 'down', 'left', 'right'].includes(key)) {
                key = `arrow${key}`;
            }
            modifiers.splice(modifiers.length-1, 1);
            const modifier_descs = [];
            for (const modifier of modifiers) {
                const desc = this.constructor.#key_string_modifier_to_desc(modifier);
                if (!desc) {
                    throw new Error(`invalid modifier "${modifier}" in key_string ${this.#key_string}`);
                }
                if (desc.code in modifier_descs) {
                    throw new Error(`redundant modifier "${modifier}" in key_string ${this.#key_string}`);
                }
                modifier_descs.push(desc);
            }
            const canonical_modifiers = modifier_descs
                  .sort((a, b) => (a.display_order - b.display_order))
                  .map(desc => desc.code)
                  .join('');
            this.#canonical = `${canonical_modifiers}${this.canonical_key_modifier_separator}${key}`;
        }
        return this.#canonical;
    }
    #canonical;  // memoization

    get glyphs (){
        if (!this.#glyphs) {
            // cache result
            const canonical_key_string = new this(this.#key_string).canonical;
            const [ cks_modifier_codes, cks_key ] = canonical_key_string.split(this.constructor.canonical_key_modifier_separator);
            const sorted_cks_modifier_codes = [ ...cks_modifier_codes ]
                  .sort((a, b) => (this.constructor.#modifier_code_to_display_order[a] - this.constructor.#modifier_code_to_display_order[b]));
            const result_segments = [];
            for (const code of sorted_cks_modifier_codes) {
                result_segments.push(this.constructor.#modifier_code_to_glyph[code]);
            }
            if (cks_key in this.constructor.#other_key_glyphs) {
                result_segments.push(this.constructor.#other_key_glyphs[cks_key]);
            } else if (cks_key.match(/^[a-zA-Z]$/) || cks_key.match(/^[fF][0-9]{1,2}$/)) {
                result_segments.push(cks_key.toUpperCase());
            } else {
                result_segments.push(cks_key);
            }
            this.#glyphs = result_segments.join('');
        }
        return this.#glyphs;
    }
    #glyphs;  // memoization


    // === INTERNAL ===

    // modifier_desc: {
    //     modifier:       string,  // modifier string
    //     basic_modifier: string,  // canonical modifier string
    //     code:           string,  // canonical code for modifier
    //     event_prop:     string,  // corresponding property in KeyboardEvent object
    //     alternates:     string,  // all alternates, including basic_modifier
    // }
    static #modifier_desc_map;       // modifier_string->modifier_desc; initialized in this._init_static()
    static #modifier_code_desc_map;  // modifier_code->modifier_desc; initialized in this._init_static()

    static #is_on_macos;  // initialized in this._init_static()

    static #key_string_modifier_to_desc(modifier) {
        modifier = modifier.toLowerCase();
        if (['cmdorctrl', 'commandorctrl'].includes(modifier)) {
            const CmdOrCtrl = this.#is_on_macos ? 'meta' : 'ctrl';
            modifier = CmdOrCtrl.toLowerCase();
        }
        return this.modifier_desc_map[modifier];
    }

    static #modifier_code_to_modifier;       // code->modifier; initialized in this.#_init_static()
    static #modifier_code_to_glyph;          // code->glyph; initialized in this.#_init_static()
    static #modifier_code_to_display_order;  // code->number; initialized in this.#_init_static()

    static #build_modifier_desc_map() {
        // validate this.#basic_modifier_desc_map:
        {
            const disallowed_modifier_codes = ('+-' + this.canonical_key_modifier_separator + this.canonical_key_string_separator);

            const keys = Object.keys(this.#basic_modifier_desc_map);
            if (keys.some(k => k !== k.toLowerCase())) {
                throw new Error('KeySpec.#basic_modifier_desc_map keys must be lowercase');
            }
            const all_alternates = keys.map(k => this.#basic_modifier_desc_map[k].alternates).reduce((acc, a) => [...acc, ...a]);
            if (all_alternates.some(k => k !== k.toLowerCase())) {
                throw new Error('KeySpec.#basic_modifier_desc_map alternates must be lowercase');
            }
            if (new Set([...keys, ...all_alternates]).size !== (keys.length + all_alternates.length)) {
                throw new Error('KeySpec.#basic_modifier_desc_map keys and alternates must all be distinct');
            }
            const codes = keys.map(k => this.#basic_modifier_desc_map[k].code)
            for (const code of codes) {
                if (code.length !== 1) {
                    throw new Error('KeySpec.#basic_modifier_desc_map codes must be single characters');
                }
                if (disallowed_modifier_codes.includes(code)) {
                    throw new Error(`KeySpec.#basic_modifier_desc_map codes are not allowed to be any of following: ${disallowed_modifier_codes}`);
                }
            }
            if (new Set(codes).size !== codes.length) {
                throw new Error('KeySpec.#basic_modifier_desc_map code values must be distinct');
            }
            const props = keys.map(k => this.#basic_modifier_desc_map[k].event_prop)
            if (new Set(props).size !== props.length) {
                throw new Error('KeySpec.#basic_modifier_desc_map event_prop values must be distinct');
            }
        }
        // validation passed; build the map
        const mdm = {};
        function create_extended_desc(basic_modifier_key, modifier_key, desc) {
            const ext_desc = {
                modifier: modifier_key,
                basic_modifier: basic_modifier_key,
                ...desc,
                alternates: [ ...new Set([ basic_modifier_key, modifier_key, ...desc.alternates ]) ],
            };
            return Object.freeze(ext_desc);
        }
        for (const bmdm_key in this.#basic_modifier_desc_map) {
            const desc = this.#basic_modifier_desc_map[bmdm_key];
            mdm[bmdm_key] = create_extended_desc(bmdm_key, bmdm_key, desc);
            for (const alt_key of desc.alternates) {
                mdm[alt_key] = create_extended_desc(bmdm_key, alt_key, desc);
            }
        }
        return Object.freeze(mdm);
    }

    // Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
    static _init_static() {
        this.#is_on_macos = (navigator.platform ?? navigator.userAgentData.platform ?? '').toLowerCase().startsWith('mac');

        this.#modifier_code_to_modifier = {};  // code->modifier
        for (const modifier in this.#basic_modifier_desc_map) {
            const desc = this.#basic_modifier_desc_map[modifier];
            this.#modifier_code_to_modifier[desc.code] = modifier;
        }

        this.#_modifier_code_to_glyph =  // code->glyph
            Object.fromEntries(
                Object.entries(this.#basic_modifier_desc_map)
                    .map(([modifier_key, { code, glyph }]) => [ code, glyph ])
            );

        this.#modifier_code_to_display_order =  // code->number
            Object.fromEntries(
                Object.entries(this.#basic_modifier_desc_map)
                    .map(([modifier_key, { code, display_order }]) => [ code, display_order ])
            );

        this.#modifier_desc_map = build_modifier_desc_map();  // modifier_string->modifier_desc

        this.#modifier_code_desc_map =  // modifier_code->modifier_desc
            Object.freeze(
                Object.fromEntries(
                    Object.keys(this.#basic_modifier_desc_map)
                        .map(k => modifier_desc_map[k])
                        .map(desc => [ desc.code, desc ])
                )
            );
    }
}

// Safari does not support static initialization blocks in classes (at the time of writing), so do it this way:
KeySpec._init_static();

//!!! need to compare key case-insensitive if modifiers exist, otherwise case-sensitive (?)
