/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x  // center x
 * @param {Number} y  // center y
 * @param {Number} r  // radius
 * @param {Object} options: {
 *     a0?:               Number,   // default: 0
 *     a1?:               Number,   // default: 2*Math.PI
 *     counterclockwise?: Boolean,  // default: false
 *     no_close_path?:    Boolean,  // default: false
 *     no_fill?:          Boolean,  // default: false
 *     no_stroke?:        Boolean,  // default: false
 * }
 */
export function draw_arc(ctx, x, y, r, options=null) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    const {
        a0               = 0,
        a1               = 2*Math.PI,
        counterclockwise = false,
        no_close_path    = false,
        no_fill          = false,
        no_stroke        = false,
    } = (options ?? {});

    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1, counterclockwise);
    if (!no_close_path) {
        ctx.closePath();
    }
    if (!no_fill) {
        ctx.fill();
    }
    if (!no_stroke) {
        ctx.stroke();
    }
}

export const default_dot_size_to_line_width_ratio = 2.1;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x  // center x
 * @param {Number} y  // center y
 * @param {Object} options: {
 *     r?:                Number,   // default: (default_dot_size_to_line_width_ratio * ctx.lineWidth)
 *     a0?:               Number,   // default: 0
 *     a1?:               Number,   // default: 2*Math.PI
 *     counterclockwise?: Boolean,  // default: false
 *     no_close_path?:    Boolean,  // default: false
 *     no_fill?:          Boolean,  // default: false
 *     no_stroke?:        Boolean,  // default: false
 * }
 */
export function draw_dot(ctx, x, y, options=null) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    const {
        r = (default_dot_size_to_line_width_ratio * ctx.lineWidth),
    } = (options ?? {});

    draw_arc(ctx, x, y, r, options);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x0  // start x
 * @param {Number} y0  // start y
 * @param {Number} x1  // end x
 * @param {Number} y1  // end y
 */
export function draw_line(ctx, x0, y0, x1, y1) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x0  // start x
 * @param {Number} y0  // start y
 * @param {Number} x1  // end x
 * @param {Number} y1  // end y
 * @return {Function} F:[0, 1] => [x, y]
 */
export function parametric_line_fn(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const plf = (t) => [
        x0 + t*dx,
        y0 + t*dy,
    ];
    plf.dx = dx;
    plf.dy = dy;
    return plf;
}

export const default_tick_length_to_line_width_ratio = 8;

export function draw_tick(ctx, x, y, hx, hy, l=undefined) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    const hmag = Math.sqrt(hx*hx + hy*hy);
    l ??= default_tick_length_to_line_width_ratio * ctx.lineWidth;
    const px = -l*hy/hmag;
    const py =  l*hx/hmag;
    draw_line(ctx, x-px/2, y-py/2, x+px/2, y+py/2);
}

export function draw_ticks(ctx, x0, y0, x1, y1, inc, skip_first=false) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    if (typeof inc !== 'number' || inc <= 0) {
        throw new Error('inc must be a positive number');
    }
    const dx = x1 - x0;
    const dy = y1 - y0;
    const mag = Math.sqrt(dx*dx + dy*dy);
    const x_inc = inc*dx/mag;
    const y_inc = inc*dy/mag;
    for (let x = x0, y = y0, first = true; x <= x1 && y <= y1; x += x_inc, y += y_inc, first = false) {
        if (skip_first && first) {
            continue;
        }
        draw_tick(ctx, x, y, dx, dy);
    }
}
