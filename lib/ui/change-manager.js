export class ChangeManager {
    constructor(target) {
        if (! (target instanceof Node)) {
            throw new Error('target must be an instance of Node');
        }
        this.#target  = target;
        this.#stack   = [];
        this.#current = -1;
        this.#neutral = undefined;
        this.#inhibit = false;
        this.#mutation_observer = new MutationObserver(this.#mutation_handler.bind(this));
        this.#mutation_observer.observe(this.#target, {
            childList:             true,
            subtree:               true,
            attributeFilter:       undefined,  // undefined: track all attributes
            attributeOldValue:     true,       // implies attributes: true
            characterDataOldValue: true,       // implies characterData: true
        });
    }

    get is_connected (){ !!this.#mutation_observer; }

    disconnect() {
        if (this.#mutation_observer) {
            this.#mutation_observer.disconnect();
            this.#mutation_observer = undefined;
            this.#inhibit = false;
            this.#neutral = undefined;
            this.#current = -1;
            this.#stack   = [];
        }
    }

    get is_neutral (){ return (this.#neutral === this.#current); }
    set_neutral()    { this.#neutral = this.#current; }
    reset_neutral()  { this.#neutral = undefined; }

    get can_perform_undo (){ return (this.#current >= 0); }

    perform_undo() {
        if (this.can_perform_undo) {
            try {
                this.#inhibit = true;  // inhibit adding the following changes to the stack
                const change = this.#stack[this.#current--];
                for (let i = change.mutations.length; --i >= 0; ) {
                    this.#perform_mutation_reverse(change.mutations[i]);
                }
            } finally {
                // reset on next tick
                queueMicrotask(() => { this.#inhibit = false });
            }
        }
    }

    get can_perform_redo (){ return (this.#current < this.#stack.length-1); }

    perform_redo() {
        if (this.can_perform_redo) {
            try {
                this.#inhibit = true;  // inhibit adding the following changes to the stack
                const change = this.#stack[++this.#current];
                for (let i = 0; i < change.mutations.length; i++) {
                    this.#perform_mutation_forward(change.mutations[i]);
                }
            } finally {
                // reset on next tick
                queueMicrotask(() => { this.#inhibit = false });
            }
        }
    }


    // === INTERNAL ===

    #target;   // the specified target
    #stack;    // array of { timestamp: Number, mutations: Array<MutationRecord> }
    #current;  // current position in stack (-1 if no entries)
    #neutral;  // numeric stack index of "neutral" position, undefined if none
    #inhibit;  // inhibit mutation collection (while performing undo/redo)
    #mutation_observer;

    #perform_mutation_reverse(mutation) {
        switch (mutation.type) {
        default: {
            throw new Error(`unknown MutationRecord type: ${mutation.type}`);
        }

        case 'attributes': {
            if ('attributeNamespace' in mutation) {
                mutation.target.setAttributeNS(mutation.attributeNamespace, mutation.attributeName, mutation.oldValue);
            } else{
                mutation.target.setAttribute(mutation.attributeName, mutation.oldValue);
            }
            break;
        }

        case 'characterData': {
            mutation.target.nodeValue = mutation.oldValue;
            break;
        }

        case 'childList': {
            for (let i = mutation.addedNodes.length; --i >= 0; ) {
                mutation.target.removeChild(mutation.addedNodes[i]);
            }
            for (let i = mutation.removedNodes.length; --i >= 0; ) {
                mutation.target.insertBefore(mutation.removedNodes[i], mutation.nextSibling);
            }
            break;
        }
        }
    }

    #perform_mutation_forward(mutation) {
        switch (mutation.type) {
        default: {
            throw new Error(`unknown MutationRecord type: ${mutation.type}`);
        }

        case 'attributes': {
            // note that mutation.newValue is set by us in #mutation_handler()
            if ('attributeNamespace' in mutation) {
                mutation.target.setAttributeNS(mutation.attributeNamespace, mutation.attributeName, mutation.newValue);
            } else{
                mutation.target.setAttribute(mutation.attributeName, mutation.newValue);
            }
            break;
        }

        case 'characterData': {
            // note that mutation.newValue is set by us in #mutation_handler()
            mutation.target.nodeValue = mutation.newValue;
            break;
        }

        case 'childList': {
            for (let i = 0; i < mutation.removedNodes.length; i++) {
                mutation.target.removeChild(mutation.removedNodes[i]);
            }
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                mutation.target.insertBefore(mutation.addedNodes[i], mutation.nextSibling);
            }
            break;
        }
        }
    }

    #mutation_handler(mutation_list, observer) {
        if (!this.#inhibit) {
            // copy mutation_list, and update "attributes" and "characterData" records to include newValue
            const mutations = mutation_list.map(mutation => {
                switch (mutation.type) {
                case 'attributes': {
                    // Add a newValue field to a copy of the record.
                    // This is for when we want to "redo" this mutation.
                    const newValue = ('attributeNamespace' in mutation)
                          ? mutation.target.getAttributeNS(mutation.attributeNamespace, mutation.attributeName)
                          : mutation.target.getAttribute(mutation.attributeName);
                    mutation = { ...mutation, newValue };
                    break;
                }
                case 'characterData': {
                    // Add a newValue field to a copy of the record.
                    // This is for when we want to "redo" this mutation.
                    const newValue = mutation.target.nodeValue;
                    mutation = { ...mutation, newValue };
                    break;
                }
                }
                return mutation;
            });
            const new_change = {
                timestamp: Date.now(),
                mutations,
            };
            // remove everything from stack after current
            this.#stack.splice(this.#current+1, this.#stack.length-(this.#current+1));
            this.#current = this.#stack.length-1;  // last change on stack
            if (typeof this.#neutral === 'number' && this.#neutral > this.#current) {
                // neutral position was within the removed range
                this.#neutral = undefined;  // no neutral position
            }

            // add the new change:
            // add new change to stack (will be at position current+1)
            this.#stack.push(new_change);
            // update current
            this.#current = this.#stack.length-1;  // last change on stack
        }
    }
}
