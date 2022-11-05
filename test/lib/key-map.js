import { assert } from 'chai';

const { KeySpec } = await import('../../build/lib/key-spec.js');
const { KeyMap  } = await import('../../build/lib/key-map.js');

describe(`KeyMap.multi_mapper()`, function () {

    const km   = new KeyMap({ "command":   [ 'Ctrl-x a' ], "xyzzy": [ 'x' ] });
    const km0  = new KeyMap({ "command0":  [ 'Ctrl-x b 0' ] });
    const km1  = new KeyMap({ "command1":  [ 'Ctrl-x b 1' ] });
    const kmo  = new KeyMap({ "override":  [ 'Ctrl-x a', 'Ctrl-x b 0', 'Ctrl-x b 1' ] });
    const kmo2 = new KeyMap({ "override2": [ 'Ctrl-x a', 'Ctrl-x b 0', 'Ctrl-x b 1' ] });

    // const kmm   = km.get_mapper();
    // const kmm0  = km0.get_mapper(kmm);
    // const kmm1  = km1.get_mapper(kmm);
    // const kmmo  = kmo.get_mapper(kmm);
    // const kmmo2 = kmo2.get_mapper(kmmo);

    const mappers = {
        kmm:   KeyMap.multi_mapper(km),
        kmm0:  KeyMap.multi_mapper(km, km0),
        kmm1:  KeyMap.multi_mapper(km, km1),
        kmmo:  KeyMap.multi_mapper(km, kmo),
        kmmo2: KeyMap.multi_mapper(km, kmo, kmo2),
    };

    for ( const [ expected_result, mapper_name, key_strings ] of [
        [ 'command',   'kmm',   [ 'Ctrl-x', 'a' ] ],
        [ 'xyzzy',     'kmm',   [ 'x' ] ],
        [ 'command0',  'kmm0',  [ 'Ctrl-x', 'b', '0' ] ],
        [ 'xyzzy',     'kmm0',  [ 'x' ] ],
        [ 'command1',  'kmm1',  [ 'Ctrl-x', 'b', '1' ] ],
        [ 'xyzzy',     'kmm1',  [ 'x' ] ],
        [ 'override',  'kmmo',  [ 'Ctrl-x', 'a' ] ],
        [ 'override',  'kmmo',  [ 'Ctrl-x', 'b', '0' ] ],
        [ 'override',  'kmmo',  [ 'Ctrl-x', 'b', '1' ] ],
        [ 'xyzzy',     'kmmo',  [ 'x' ] ],
        [ 'override2', 'kmmo2', [ 'Ctrl-x', 'a' ] ],
        [ 'override2', 'kmmo2', [ 'Ctrl-x', 'b', '0' ] ],
        [ 'override2', 'kmmo2', [ 'Ctrl-x', 'b', '1' ] ],
        [ 'xyzzy',     'kmmo2', [ 'x' ] ],
    ] ) {

        const mapper = mappers[mapper_name];
        const result = key_strings.reduce((submapper, key_string) => submapper.consume(key_string), mapper);

        describe(`${mapper_name} with keys ${key_strings}`, function () {
            it(`should return "${expected_result}"`, function () {
                assert.equal(result, expected_result);
            });
        });

    }
});
