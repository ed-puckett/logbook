const current_script_url = import.meta.url;  // save for later

import { fileURLToPath } from "node:url";

const build_dir_path = fileURLToPath(new URL("./build", current_script_url));

//////////////////////////////////////////////////////////////////////

import path from 'path';
//console.log(current_script_url, path.resolve('build'), import.meta.resolve, ('build'));

const config = {
    entry: './src/init.js',
    output: {
        filename: 'main.js',
        path: build_dir_path,
    },
};

export default config;
