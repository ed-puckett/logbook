const current_script_url = import.meta.url;  // save for later

import { fileURLToPath } from "node:url";

const dist_dir_path = fileURLToPath(new URL("./dist", current_script_url));

const webpack_config = {
    entry: './src/init.js',
    mode:  'production',

    optimization: {
        minimize: true,
    },

    stats: {
        errorDetails: true,
    },

    output: {
        path: dist_dir_path,
        filename: 'main.js',
    },

    devtool: 'source-map',

    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
};

export default webpack_config;
