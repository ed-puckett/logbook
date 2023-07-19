.PHONY: all
all: start


######################################################################

SHELL = /bin/bash
MAKEFLAGS += --no-print-directory

DISTDIR = ./dist

SERVER_ADDRESS = 127.0.0.11
SERVER_PORT    = 4320


######################################################################

.DEFAULT: all

.PHONY: clean
clean: kill-server
	@-rm -fr "$(DISTDIR)" >/dev/null 2>&1 || true

.PHONY: full-clean
full-clean: clean
	@-rm -fr ./node_modules >/dev/null 2>&1 || true

./node_modules: ./package.json
	npm install

.PHONY: dist-dir
dist-dir: ./node_modules README.md
	mkdir -p "$(DISTDIR)" && \
	npx webpack --config ./webpack.config.js
	/usr/bin/env node -e 'require("fs/promises").readFile("README.md").then(t => console.log(`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n$${require("marked").marked(t.toString())}\n</body>\n</html>`))' > "$(DISTDIR)/help.html"

.PHONY: demos-dir
demos-dir:
	rm -fr ./demos && \
	( cd ./examples/ && find . -type d -exec mkdir -p ../demos/{} \; ) && \
	( cd ./examples/ && find . -iname '*.logbook' -exec /usr/bin/env node ../build-util/make-demo.mjs {} \; ) && \
	( cd ./demos/ && find . -iname '*.html' | /usr/bin/env node ../build-util/make-demos-index.mjs )

.PHONY: lint
lint: ./node_modules
	./node_modules/.bin/eslint src

.PHONY: test
test:
	npm test

# kill the server by performing a GET on /QUIT
# uses Linux commands: lsof, grep, cut
# server uses python (version 3)
.PHONY: server
server: dist-dir demos-dir
	( python ./build-util/server.py $(SERVER_ADDRESS) $(SERVER_PORT) 2>&1 | tee >(grep -q -m1 '"GET /QUIT'; echo QUITTING; sleep 0.1; kill $$(lsof -itcp:$(SERVER_PORT) -sTCP:LISTEN -Fp | grep ^p | cut -c2-)) )

# uses curl
.PHONY: kill-server
kill-server:
	@if lsof -itcp:$(SERVER_PORT) -sTCP:LISTEN >/dev/null 2>&1; then echo 'sending QUIT to server'; curl -s http://$(SERVER_ADDRESS):$(SERVER_PORT)/QUIT >/dev/null 2>&1; fi

.PHONY: dev-server
dev-server:
	npx nodemon -w src -e js,cjs,mjs,html,css,ico,svg -x "bash -c 'make server' || exit 1"

.PHONY: client
client:
	chromium --new-window http://$(SERVER_ADDRESS):$(SERVER_PORT)/src/index.html &

.PHONY: start
start: dist-dir demos-dir
	if ! lsof -itcp:$(SERVER_PORT) -sTCP:LISTEN; then make server <&- >/dev/null 2>&1 & sleep 1; fi; make client
