#!/bin/bash

set -e  # abort on error

declare THIS_FILE=${BASH_SOURCE##*/}
declare THIS_FILE_DIR=$([[ -z "${BASH_SOURCE%/*}" ]] && echo '' || { cd "${BASH_SOURCE%/*}"; pwd; })

declare ROOT_DIR="${THIS_FILE_DIR}/.."
declare DIST_DIR="${ROOT_DIR}/dist"

declare -a FILES_TO_COPY=(
    'src/index.html'
    'src/favicon.ico'
    'src/renderer/javascript-renderer/eval-worker/web-worker.js'
    'node_modules/sprintf-js/dist/sprintf.min.js'
    'node_modules/sprintf-js/dist/sprintf.min.js.map'
    'node_modules/marked/marked.min.js'
    'node_modules/texzilla/TeXZilla.js'
    'node_modules/rxjs/dist/bundles/rxjs.umd.min.js'
    'node_modules/rxjs/dist/bundles/rxjs.umd.min.js.map'
    'node_modules/chart.js/dist/Chart.bundle.min.js'
    'node_modules/d3/dist/d3.min.js'
    'node_modules/plotly.js-dist/plotly.js'
    'node_modules/@hpcc-js/wasm/dist/graphviz.umd.js'
    'node_modules/@hpcc-js/wasm/dist/graphviz.umd.js.map'
    'node_modules/d3-graphviz/build/d3-graphviz.min.js'
)

cd "${ROOT_DIR}"

\rm -fr "dist"
mkdir -p "dist"

npx webpack --config ./webpack.config.js

#!!!/usr/bin/env node -e 'require("fs/promises").readFile("README.md").then(t => console.log(`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n$${require("marked").marked(t.toString())}\n</body>\n</html>`))' > "${DIST_DIR}/help.html"

echo "copying files...."
for file_index in "${!FILES_TO_COPY[@]}"; do
    declare file="${FILES_TO_COPY[file_index]}"
    cp "${file}" "${DIST_DIR}"
done

echo "done"
