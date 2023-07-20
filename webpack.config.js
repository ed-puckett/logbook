const current_script_url = import.meta.url;  // save for later

import { fileURLToPath } from "node:url";

const dist_dir_path = fileURLToPath(new URL("./dist", current_script_url));

const config = {
    entry: './src/init.js',

    output: {
        path: dist_dir_path,
        filename: 'main.js',
    },

    optimization: {
        minimize: false,
    },

    stats: {
        errorDetails: true,
    },

    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
};

export default config;
