.PHONY: all
all: dist


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

./package-lock.json ./node_modules: ./package.json
	npm install
	touch ./package-lock.json ./node_modules

.PHONY: install
install: ./node_modules $(DIST_DIR)

.PHONY: lint
lint: ./node_modules
	./node_modules/.bin/eslint --config .eslintrc.cjs src lib

$(DIST_DIR): ./src ./src/* ./src/*/* ./src/*/*/* ./src/*/*/*/* ./lib ./lib/* ./lib/*/* ./lib/*/*/* ./lib/*/*/* ./node_modules README.md
	make lint && ./build-util/build-dist.sh

.PHONY: test
test:
	npm test

# kill the server by performing a GET on /QUIT
# uses Linux commands: lsof, grep, cut
# server uses python (version 3)
.PHONY: server
server: $(DIST_DIR)
	( python ./build-util/server.py $(SERVER_ADDRESS) $(SERVER_PORT) 2>&1 | tee >(grep -q -m1 '"GET /QUIT'; echo QUITTING; sleep 0.1; kill $$(lsof -itcp:$(SERVER_PORT) -sTCP:LISTEN -Fp | grep ^p | cut -c2-)) )

# uses curl
.PHONY: kill-server
kill-server:
	@if lsof -itcp:$(SERVER_PORT) -sTCP:LISTEN >/dev/null 2>&1; then echo 'sending QUIT to server'; curl -s http://$(SERVER_ADDRESS):$(SERVER_PORT)/QUIT >/dev/null 2>&1; fi

.PHONY: dev-server
dev-server:
	npx nodemon --watch src --watch lib --watch package.json --watch node_modules  --ext js,cjs,mjs,html,css,ico,svg  --exec "bash -c 'make server' || exit 1"

.PHONY: client
client:
	chromium --new-window http://$(SERVER_ADDRESS):$(SERVER_PORT)/src/index.html &

.PHONY: start
start: $(DIST_DIR)
	if ! lsof -itcp:$(SERVER_PORT) -sTCP:LISTEN; then make server <&- >/dev/null 2>&1 & sleep 1; fi; make client
