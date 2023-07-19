// Renderer is defined in a separate file to break dependency cycle in get_renderer_classes()
export {
    Renderer,
} from './renderer.js';

import { TextRenderer       } from './text-renderer.js';
import { ErrorRenderer      } from './error-renderer.js';
import { MarkdownRenderer   } from './markdown-renderer.js';
import { TeXRenderer        } from './tex-renderer.js';
import { JavaScriptRenderer } from './javascript-renderer/_.js';
import { ImageDataRenderer  } from './image-data-renderer.js';
import { ChartRenderer      } from './chart-renderer.js';
import { GraphvizRenderer   } from './graphviz-renderer.js';
import { PlotlyRenderer     } from './plotly-renderer.js';

export function get_renderer_classes() {
    return [
        TextRenderer,
        ErrorRenderer,
        MarkdownRenderer,
        TeXRenderer,
        JavaScriptRenderer,
        ImageDataRenderer,
        ChartRenderer,
        GraphvizRenderer,
        PlotlyRenderer,
    ];
}
