# -*- coding: utf-8 -*-
# adapted from: https://gist.github.com/HaiyangXu/ec88cbdce3cdbac7b8d5

import sys
import http.server
import socketserver
from http import HTTPStatus

if len(sys.argv) != 3:
    raise Exception(f"Usage: {sys.argv[0]} address port")

ADDR = sys.argv[1]
PORT = sys.argv[2]

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        '.manifest': 'text/cache-manifest',
        '.text':     'text/plain',
        '.txt':      'text/plain',
        '.html':     'text/html',
        '.htm':      'text/html',
        '.jpeg':     'image/jpg',
        '.jpg':      'image/jpg',
        '.png':      'image/png',
        '.gif':      'image/gif',
        '.svg':      'image/svg+xml',
        '.css':      'text/css',
        '.js':       'application/javascript',
        '.cjs':      'application/javascript',
        '.mjs':      'application/javascript',
        '.wasm':     'application/wasm',
        '.json':     'application/json',
        '.xml':      'application/xml',
        '':          'application/octet-stream',  # default
    }

    # disable directory listing
    def list_directory(self, path):
        self.send_error(HTTPStatus.NOT_FOUND, "directory listing not supported")
        return None

with socketserver.TCPServer((ADDR, int(PORT)), Handler) as httpd:
    print("started server at", ADDR, PORT)
    httpd.serve_forever()
