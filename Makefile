.PHONY: all
all: start


######################################################################

SHELL = /bin/bash
MAKEFLAGS += --no-print-directory

DIST_DIR = ./dist

SERVER_ADDRESS = 127.0.0.11
SERVER_PORT    = 4320


######################################################################

.DEFAULT: all

.PHONY: clean
clean: kill-server
	@-rm -fr "$(DIST_DIR)" >/dev/null 2>&1 || true

.PHONY: full-clean
full-clean: clean
	@-rm -fr ./node_modules >/dev/null 2>&1 || true

./package-lock.json: ./package.json
	npm install
	touch ./package-lock.json

./node_modules: ./package-lock.json
	npm install
	touch ./node_modules

.PHONY: install
install: ./node_modules $(DIST_DIR)/main.js

.PHONY: dist-dir
dist-dir: $(DIST_DIR)/main.js

$(DIST_DIR)/main.js: ./src ./lib ./node_modules README.md
	./build-util/build-dist.sh

.PHONY: lint
lint: ./node_modules
	./node_modules/.bin/eslint --config .eslintrc.cjs src lib

.PHONY: test
test:
	npm test

# kill the server by performing a GET on /QUIT
# uses Linux commands: lsof, grep, cut
# server uses python (version 3)
.PHONY: server
server: dist-dir
	( python ./build-util/server.py $(SERVER_ADDRESS) $(SERVER_PORT) 2>&1 | tee >(grep -q -m1 '"GET /QUIT'; echo QUITTING; sleep 0.1; kill $$(lsof -itcp:$(SERVER_PORT) -sTCP:LISTEN -Fp | grep ^p | cut -c2-)) )

# uses curl
.PHONY: kill-server
kill-server:
	@if lsof -itcp:$(SERVER_PORT) -sTCP:LISTEN >/dev/null 2>&1; then echo 'sending QUIT to server'; curl -s http://$(SERVER_ADDRESS):$(SERVER_PORT)/QUIT >/dev/null 2>&1; fi

.PHONY: dev-server
dev-server:
	npx nodemon --watch src --watch lib --watch node_modules  --ext js,cjs,mjs,html,css,ico,svg  --exec "bash -c 'make server' || exit 1"

.PHONY: client
client:
	chromium --new-window http://$(SERVER_ADDRESS):$(SERVER_PORT)/src/index.html &

.PHONY: start
start: dist-dir
	if ! lsof -itcp:$(SERVER_PORT) -sTCP:LISTEN; then make server <&- >/dev/null 2>&1 & sleep 1; fi; make client
