/** Draw an arc centered a (x, y) with radius r.
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

/** Ratio of default dot size to current line width (ctx.lineWidth),
 * used by draw_dot().
 */
export const default_dot_size_to_line_width_ratio = 3;

/** Draw a dot at (x, y).
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
 * The dot is filled with the same color as the stroke: ctx.strokeStyle.
 */
export function draw_dot(ctx, x, y, options=null) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    const {
        r = (default_dot_size_to_line_width_ratio * ctx.lineWidth),
    } = (options ?? {});

    const old_fill_style = ctx.fillStyle;
    ctx.fillStyle = ctx.strokeStyle;
    try {
        draw_arc(ctx, x, y, r, options);
    } finally {
        ctx.fillStyle = old_fill_style;
    }
}

/** Return the angle in radians to the x-axis represented by the vector (dx, dy).
 * @param  {Number} dx
 * @param  {Number} dy
 * @return {Number} angle in radians in the range [-Math.PI/2, Math.PI/2]
 * heading_angle(0, 0) returns 0.
 */
export function heading_angle(dx, dy) {
    if (dx === 0) {
        return (dy < 0) ? -Math.PI/2 : (dy > 0) ? Math.PI/2 : 0;
    } else {
        return Math.atan(dy/dx);
    }
}

/** Draw a line from (x0, y0) to (x1, y1).
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

/** Ratio of default tick length to current line width (ctx.lineWidth),
 * used by draw_tick().
 */
export const default_tick_length_to_line_width_ratio = 8;

/** Draw a tick mark at (x, y) perpendicular to the vector (hx, hy).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x   // center x
 * @param {Number} y   // center y
 * @param {Number} hx  // heading x
 * @param {Number} hy  // heading y
 * @param {Object} options: {
 *     len?: Number,  // tick length; default: (default_tick_length_to_line_width_ratio * ctx.lineWidth)
 * }
 * The tick is drawn perpendicular to the given heading (hx, hy).
 */
export function draw_tick(ctx, x, y, hx, hy, options=null) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    const {
        len = (default_tick_length_to_line_width_ratio * ctx.lineWidth),
    } = (options ?? {});
    const hmag = Math.sqrt(hx*hx + hy*hy);
    const px = -len*hy/hmag;
    const py =  len*hx/hmag;
    draw_line(ctx, x-px/2, y-py/2, x+px/2, y+py/2);
}

/** Draw ticks along the line segment from (x0, y0) to (x1, y1).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x0   // start x
 * @param {Number} y0   // start y
 * @param {Number} x1   // end x
 * @param {Number} y1   // end y
 * @param {Number} inc  // distance between ticks
 * @param {Object} options: {
 *     draw_initial: Boolean,  // also draw initial tick at (x0, y0)?
 *     ...{ options for draw_tick() }
 * }
 */
export function draw_ticks(ctx, x0, y0, x1, y1, inc, options=null) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    if (typeof inc !== 'number' || inc <= 0) {
        throw new Error('inc must be a positive number');
    }
    const {
        draw_initial = false,
    } = (options ?? {});
    const dx = x1 - x0;
    const dy = y1 - y0;
    const mag = Math.sqrt(dx*dx + dy*dy);
    const x_inc = inc*dx/mag;
    const y_inc = inc*dy/mag;
    for (let x = x0, y = y0, first = true; x <= x1 && y <= y1; x += x_inc, y += y_inc, first = false) {
        if (draw_initial || !first) {
            draw_tick(ctx, x, y, dx, dy, options);
        }
    }
}

/** Draw text flipped top-to-bottom and centered at (x, y).
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} text,  // text to draw
 * @param {Number} x      // center x
 * @param {Number} y      // center y
 * @param {Object} options: {
 *     stroke_only?: Boolean,  // only stroke if true, otherwise fill
 *     angle?:       Number,   // orientation angle (radians)
 *     dxr?:         Number,   // x offset as a ratio to text width;  0: none, 1: offset by full width
 *     dyr?:         Number,   // y offset as a ratio to text height; 0: none, 1: offset by full height
 * }
 * The height used for the dyr calculation is (actualBoundingBoxAscent - actualBoundingBoxDescent).
 * With dxr = dyr = 0 (or undefined), the text will be output centered on (x, y)
 */
export function draw_flipped_text(ctx, text, x, y, options=null) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    const {
        stroke_only,
        angle,
        dxr,
        dyr,
    } = (options ?? {});
    const initial_transform = ctx.getTransform();
    try {
        const metrics = ctx.measureText(text);
        const height = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent);
        ctx.translate(x, y);
        ctx.scale(1, -1);  // flip
        if (angle) {  // note: angle === 0 fails this test, but that is consistent with not rotating
            ctx.rotate(-angle);
        }
        ctx.translate(-metrics.width/2, height/2);  // center
        if (dxr) {
            ctx.translate(dxr*metrics.width, 0);
        }
        if (dyr) {
            ctx.translate(0, -dyr*height);
        }
        ctx[stroke_only ? 'strokeText' : 'fillText'](text, 0, 0);
    } finally {
        ctx.setTransform(initial_transform);
    }
}

/** Ratio of default arrowhead length to current line width (ctx.lineWidth),
 * used by draw_arrowhead() and draw_arrow().
 */
export const default_arrowhead_length_to_line_width_ratio = 10;

/** Draw an arrowhead with tip at (x, y) pointing in direction (hx, hy).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x   // tip x
 * @param {Number} y   // tip y
 * @param (Number} hx  // heading x
 * @param (Number} hy  // heading y
 * @param {Object} options: {
 *     tip_angle?: Number,          // angle of tip of arrowhead; default: Math.PI/6
 *     len?:       Number,          // length of arrowhead lines; default: (default_arrowhead_length_to_line_width_ratio * ctx.lineWidth)
 *     reversed?:  Boolean,         // reverse direction of arrow?
 *     tick?:      Boolean|Number,  // also draw tick at (x, y)?  If a number, then the length of the tick
 * }
 */
export function draw_arrowhead(ctx, x, y, hx, hy, options=null) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    const TWOPI = 2*Math.PI;
    const {
        len       = (default_arrowhead_length_to_line_width_ratio * ctx.lineWidth),
        reversed  = false,
        tick      = false,
    } = (options ?? {});
    let tip_angle = options?.tip_angle ?? Math.PI/6;
    tip_angle -= Math.floor(tip_angle/TWOPI);  // normalize tip_angle between [0, TWOPI]
    if (reversed) {
        tip_angle = TWOPI - tip_angle;
    }
    //!!!
    if (tick) {  // note: tick === 0 fails this test, but that is consistent with not drawing
        const tick_options = {};
        if (typeof tick === 'number') {
            tick_options.len = tick;
        }
        draw_tick(ctx, x, y, hx, hy, tick_options);
    }
}

/** Draw a line with arrowhead from (x0, y0) to (x1, y1).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x0  // start x
 * @param {Number} y0  // start y
 * @param {Number} x1  // end x
 * @param {Number} y1  // end y
 * @param {Object} options: {
 *     double?: Boolean,  // draw arrowheads at each end?
 *     ...{ options for draw_arrowhead() }
 * }
 */
export function draw_arrow(ctx, x0, y0, x1, y1, options=null) {
    if (!(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('ctx must be an instance of CanvasRenderingContext2D');
    }
    const {
        double,
    } = (options ?? {});
    draw_line(ctx, x0, y0, x1, y1);
    const hx = (x1 - x0);
    const hy = (y1 - y0);
    draw_arrowhead(ctx, x1, y1, hx, hy, options);
    if (double) {
        draw_arrowhead(ctx, x0, y0, -hx, -hy, options);
    }
}
