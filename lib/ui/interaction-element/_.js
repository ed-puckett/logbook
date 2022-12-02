// === INTERACTION ELEMENT AND ITS DEPENDENTS ===

// Import this file rather than importing individual files in this directory
// this file implements a kludge to get around circular dependecies.
// The dependent files do not import ./interaction-element.js but
// instead provide a __patch_module() function by which the InteractionElement
// class object is provided to the module after it has been loaded.

const mod_ie = await import('./interaction-element.js');

const dependents = {
    mod_kem: await import('./key-event-manager.js'),
    mod_ce:  await import('./command-engine.js'),
};

// patch the dependent modules
for (const m in dependents) {
    const dependent = dependents[m];
    dependent.__patch_module(mod_ie.InteractionElement);
}

// Es6 modules do not provide a means to programmatically specify
// exports.  The closest I have come is gathering the exports into
// an object and then export that object as the "default" export
// and then have users of the module destructure the "default"
// import.  This feels kludgey because it makes this module behave
// differently than others, so instead just generate static exports.
// Note that the dependents each have just one export, so this is
// fairly straightforward.
export const InteractionElement = mod_ie.InteractionElement;
export const KeyEventManager    = dependents.mod_kem.KeyEventManager;
export const CommandEngine      = dependents.mod_ce.CommandEngine;
