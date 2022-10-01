const {
    generate_object_id,
} = await import('../uuid.js');

export class Change {
    // STATIC

    static stack = [];
    static current = -1;
    static neutral = undefined;
    static _inhibit_add_change = false;

    static toString(multiline=false) {
        return `[${this.name}_class stack:[${this.stack.map(c => `${multiline ? '\n    ' : ''}${c.toString()}`)}],${multiline ? '\n    ' : ' '}current:${this.current}, neutral:${this.neutral}, _inhibit_add_change:${this._inhibit_add_change}]`;
    }

    static in_neutral_state() {
        return (this.neutral === this.current);
    }

    static add_change(change, do_change=false) {
        if (!this._inhibit_add_change) {  // otherwise in the process of an undo/redo, so don't add new change
            // remove everything from stack after current
            this.stack.splice(this.current+1, this.stack.length-(this.current+1));
            this.current = this.stack.length-1;  // last change on stack
            if (typeof this.neutral === 'number' && this.neutral > this.current) {
                // neutral position was within the removed range
                this.neutral = undefined;  // no neutral position
            }

            let coalesced;
            if ( this.neutral !== this.current &&  // don't coalesce into the neutral change
                 this.current >= 0 ) {
                coalesced = this.stack[this.current].coalesce(change);
            }

            if (coalesced) {
                // replace current change with coalesced...
                this.stack[this.current] = coalesced;
            } else {
                // add the new change:
                // add new change to stack (will be at position current+1)
                this.stack.push(change);
                // update current
                this.current = this.stack.length-1;  // last change on stack
            }

            if (do_change) {
                change.do_change();
            }

            change.logbook.update_global_view_properties();
        }
    }

    static reset(logbook, set_unmodified=true) {
        this.stack   = [];
        this.current = -1;
        this.neutral = undefined;
        if (set_unmodified) {
            this.set_unmodified(logbook);
        }
        logbook.update_global_view_properties();
    }

    static update_for_clear(logbook) {
        this.reset(logbook, true);
    }
    static update_for_open(logbook, as_import=false) {
        this.reset(logbook, !as_import);
    }
    static update_for_save(logbook) {
        this.set_unmodified(logbook);
    }

    static get_modified_state() {
        return (this.neutral !== this.current);
    }
    // warning: this.set_modified_state(logbook, this.get_modified_state())
    // does not necessarily restore the original state
    static set_modified_state(logbook, state) {
        if (state) {
            this.neutral = undefined;
        } else {
            this.neutral = this.current;
        }
        logbook.update_global_view_properties();
    }
    static set_modified(logbook) {
        this.set_modified_state(logbook, true);
    }
    static set_unmodified(logbook) {
        this.set_modified_state(logbook, false);
    }

    static can_perform_undo() {
        return (this.current >= 0);
    }

    static perform_undo(logbook) {
        if (this.can_perform_undo()) {
            try {
                this._inhibit_add_change = true;
                const change = this.stack[this.current--];
                if (change.is_ephemeral) {
                    // remove the ephemeral change
                    this.stack.splice(this.current+1, 1);
                }
                change.undo_change();
            } finally {
                // Reset _inhibit_add_change asynchronously so that any
                // CodeMirror change events resulting from the this operation
                // are sent (and inhibited) before.
                setTimeout(() => { this._inhibit_add_change = false });
            }
            logbook.update_global_view_properties();
        }
    }

    static can_perform_redo() {
        return (this.current < this.stack.length-1);
    }

    static perform_redo(logbook) {
        if (this.can_perform_redo()) {
            try {
                this._inhibit_add_change = true;
                const change = this.stack[++this.current];
                change.redo_change();
            } finally {
                // Reset _inhibit_add_change asynchronously so that any
                // CodeMirror change events resulting from the this operation
                // are sent (and inhibited) before.
                setTimeout(() => { this._inhibit_add_change = false });
            }
            logbook.update_global_view_properties();
        }
    }

    // INSTANCE

    // If this change has is_ephemeral, then when their undo method is called,
    // the change is removed from the undo stack after its undo action is
    // performed.
    constructor(logbook, is_ephemeral=false) {
        this.logbook      = logbook;
        this.is_ephemeral = is_ephemeral;  // if ephemeral, then undo removes from stack
        this.timestamp    = Date.now()
    }

    toString() {
        return `[${this.constructor.name} timestamp:${this.timestamp}]`;
    }

    coalesce(change) {
        return null;  // default: unable to coalesce
    }

    undo_change() {
        throw new Error('unimplemented method');
    }

    redo_change() {
        throw new Error('unimplemented method');
    }

    do_change() {  // alias for redo_change()
        this.redo_change();
    }
}

// WARNING!
// These change implementations assume that they are called in the proper order.
// Inconsistent state can result from not doing so.

export class EditChange extends Change {
    constructor(logbook, ie_id, changes) {  // changes: { from, to, text, removed, origin }[]  // (from CodeMirror changes event)
        super(logbook);
        this.ie_id   = ie_id;
        this.changes = changes;
    }

    coalesce(change) {
        const max_latency_ms = 1000;
        if (! (change instanceof EditChange)) {
            return null;
        } else if ((change.timestamp - this.timestamp) > max_latency_ms) {
            return null;
        } else if (!this.changes.every(c => c.origin === '+input') || !change.changes.every(c => c.origin === '+input')) {
            return null;
        } else {
            const coalesced = new EditChange(this.logbook, this.ie_id, [ ...this.changes, ...change.changes ]);
            coalesced.timestamp = this.timestamp;
            return coalesced;
        }
    }

    undo_change() {
        const cm = this.logbook.get_internal_state_for_ie_id(this.ie_id).cm;
        for (let i = this.changes.length; --i >= 0; ) {  // apply in reverse order
            const { from, to, text, removed } = this.changes[i];
            this._apply_one_change(cm, from, text, removed);
        }
    }

    redo_change() {
        this.logbook.set_current_ie(document.getElementById(this.ie_id));
        const cm = this.logbook.get_internal_state_for_ie_id(this.ie_id).cm;
        for (const { from, to, text, removed } of this.changes) {
            this._apply_one_change(cm, from, removed, text);
        }
    }

    _apply_one_change(cm, pos, strings_to_remove, strings_to_add) {
        this.logbook.set_current_ie(document.getElementById(this.ie_id));
        const from = { line: pos.line, ch: pos.ch };
        const to = (strings_to_remove.length <= 1)
              ? {
                  line: pos.line,
                  ch:   pos.ch + (strings_to_remove[strings_to_remove.length - 1] ?? '').length,
              }
              : {
                  line: pos.line + strings_to_remove.length - 1,
                  ch:   strings_to_remove[strings_to_remove.length - 1].length,
              };
        cm.replaceRange(strings_to_add, from, to);
    }
}

export class MoveIEChange extends Change {
    constructor(logbook, old_position, new_position) {
        super(logbook);
        this.old_position = old_position;
        this.new_position = new_position;
    }

    undo_change() {
        this._move(this.new_position, this.old_position);
    }

    redo_change() {
        this._move(this.old_position, this.new_position);
    }

    _move(from, to) {
        if (from !== to) {
            const ie = document.getElementById(this.logbook.lb_state.order[from]);
            this.logbook.set_current_ie(ie);
            const next_ie = (from > to)
                  ? document.getElementById(this.logbook.lb_state.order[to])
                  : ( (to >= (this.logbook.lb_state.order.length - 1))
                      ? null
                      : document.getElementById(this.logbook.lb_state.order[to + 1]) );
            interaction_area.insertBefore(ie, next_ie);  // inserts at end when next_ie === null
            this.logbook.update_lb_state_order();
            this.logbook.current_ie.scrollIntoView(false);
            this.logbook.focus_to_current_ie();
        }
    }
}

export class AddNewIEChange extends Change {
    constructor(logbook, position) {
        super(logbook);
        this.position = position;
        this.ie_id    = generate_object_id();
        this.ie       = undefined;  // will be set in redo_change() aka do_change()
    }

    undo_change() {
        // assuming redo_change() will have already been called and
        // therefore this.ie will be set
        new DeleteIEChange(this.logbook, this.ie).do_change();  // not added to stack, just using the implementation...
    }

    redo_change() {
        const reference_ie_id = this.logbook.lb_state.order[this.position];  // undefined if this.position >= this.logbook.lb_state.order.length
        const reference_ie    = reference_ie_id ? document.getElementById(reference_ie_id) : undefined;
        // the first time this function is called, this.ie will be undefined
        // and then will be set, and then remain thereafter
        this.ie = this.logbook.add_new_ie(reference_ie, false, this.ie_id, this.ie);  // will append if reference_ie is undefined
        this.logbook.set_current_ie(this.ie);
    }
}

export class DeleteIEChange extends Change {
    constructor(logbook, ie) {
        super(logbook);
        this.ie       = ie;
        this.position = this.logbook.lb_state.order.indexOf(ie.id);
    }

    undo_change() {
        const reference_ie_id = this.logbook.lb_state.order[this.position];
        const reference_ie    = reference_ie_id ? document.getElementById(reference_ie_id) : undefined;
        const ie = this.logbook.add_new_ie(reference_ie, false, undefined, this.ie);
        this.logbook.set_current_ie(ie);
    }

    redo_change() {
        this.logbook.set_current_ie(this.ie);
        let next_ie = this.ie.nextElementSibling;
        if (!next_ie) {
            next_ie = this.ie.previousElementSibling;
        }
        const id = this.ie.id;
        const order_index = this.logbook.lb_state.order.indexOf(id);
        if (order_index === -1) {
            throw new Error('unexpected: when deleting element, id not found in logbook state!');
        }
        this.logbook.lb_state.order.splice(order_index, 1);
        delete this.logbook.lb_state.elements[id];
        this.logbook.get_internal_state_for_ie_id(this.ie.id).cm.toTextArea();  // remove editor from textarea
        this.logbook.remove_internal_state_for_ie_id(this.ie.id);
        interaction_area.removeChild(this.ie);
        if (this.ie === this.logbook.current_ie) {
            this.logbook.current_ie = undefined;  // prevent attempted access
            this.logbook.set_current_ie(next_ie);  // next_ie may be null or undefined
        }
    }
}

export class StateChange extends Change {
    constructor(logbook, old_state, new_state) {
        super(logbook);
        this.old_state = old_state;
        this.new_state = new_state;
    }

    undo_change() {
        Object.assign(this.logbook.lb_state, this.old_state);
        this.logbook.update_global_view_properties();
    }

    redo_change() {
        Object.assign(this.logbook.lb_state, this.new_state);
        this.logbook.update_global_view_properties();
    }
}

// This Change extension clears the output of its associated ie
// for both undo and redo.  It does not store/restore old state
// in the interest of conserving memory.  Instead, it simply
// resets the output....
// OutputIEChange changes are ephemeral.
export class OutputIEChange extends Change {
    constructor(logbook, ie_id) {
        super(logbook);
        this.ie_id = ie_id;
    }

    undo_change() {
        this.logbook.reset_output(document.getElementById(this.ie_id));
    }

    redo_change() {
        this.logbook.reset_output(document.getElementById(this.ie_id));
    }
}


// === interface ===

export function add_edit_change(logbook, ie_id, changes) {
    Change.add_change(new EditChange(logbook, ie_id, changes));
}

export function perform_move_ie_change(logbook, old_position, new_position) {
    Change.add_change(new MoveIEChange(logbook, old_position, new_position), true);
}

export function perform_move_up_ie_change(logbook, ie_id) {  // returns true iff move was possible
    const order = logbook.lb_state.order;
    const ie_position = order.indexOf(ie_id);
    if (ie_position <= 0) {
        return false;
    } else {
        perform_move_ie_change(logbook, ie_position, ie_position-1);
        return true;
    }
}

export function perform_move_down_ie_change(logbook, ie_id) {  // returns true iff move was possible
    const order = logbook.lb_state.order;
    const ie_position = order.indexOf(ie_id);
    if (ie_position >= order.length-1) {
        return false;
    } else {
        perform_move_ie_change(logbook, ie_position, ie_position+1);
        return true;
    }
}

export function perform_add_new_ie_at_position_change(logbook, position) {
    Change.add_change(new AddNewIEChange(logbook, position), true);
}

export function perform_add_new_before_ie_change(logbook, ie_id) {
    const ie_position = logbook.lb_state.order.indexOf(ie_id);
    perform_add_new_ie_at_position_change(logbook, ie_position);
}

export function perform_add_new_after_ie_change(logbook, ie_id) {
    const ie_position = logbook.lb_state.order.indexOf(ie_id);
    perform_add_new_ie_at_position_change(logbook, ie_position+1);
}

export function perform_delete_ie_change(logbook, ie) {
    Change.add_change(new DeleteIEChange(logbook, ie), true);
}

export function perform_state_change(logbook, old_state, new_state) {
    Change.add_change(new StateChange(logbook, old_state, new_state), true);
}

export function add_ie_output_change(logbook, ie_id) {
    Change.add_change(new OutputIEChange(logbook, ie_id));
}
