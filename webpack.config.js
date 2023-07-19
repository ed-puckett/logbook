const current_script_url = import.meta.url;  // save for later

import { fileURLToPath } from "node:url";

const build_dir_path = fileURLToPath(new URL("./build", current_script_url));

const config = {
    entry: './src/init.js',
    output: {
        filename: 'main.js',
        path: build_dir_path,
    },
    optimization: {
        minimize: false,
    },
};

export default config;
