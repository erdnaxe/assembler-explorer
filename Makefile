TARGET = \
	static/libcapstone.js \
	static/libcapstone-const.js \
	static/libkeystone.js \
	static/libkeystone-const.js

EMCC_OPTIONS = -Os -sALLOW_MEMORY_GROWTH -sEXPORT_ES6 -sSTRICT \
	-sENVIRONMENT=web -sFILESYSTEM=0 --cache ~/.cache/emscripten

all: $(TARGET)

clean:
	rm -fv $(TARGET)

static/libcapstone.js: capstone
	mkdir -p capstone/build
	emcmake cmake capstone -B capstone/build -DCMAKE_BUILD_TYPE=Release \
		-DCAPSTONE_BUILD_TESTS=OFF -DCAPSTONE_ARCHITECTURE_DEFAULT=ON
	emmake make -C capstone/build capstone
	emcc capstone/build/libcapstone.a -o $@ ${EMCC_OPTIONS} -sEXPORT_NAME=loadCapstoneModule \
		-sEXPORTED_FUNCTIONS="[_malloc,_free,_cs_open,_cs_disasm,_cs_free,_cs_close,_cs_option,_cs_errno,_cs_strerror]" \
		-sEXPORTED_RUNTIME_METHODS="[getValue,UTF8ToString,writeArrayToMemory]"

static/libcapstone-const.js: capstone/bindings/python/capstone
	cat capstone/bindings/python/capstone/*.py | sed -n 's/^\([A-Z0-9_]*\) = \([A-Z0-9_x|< ()]*\)\(#.*\)\{0,1\}$$/export let \1 = \2/p' > $@

static/libkeystone.js: keystone
	mkdir -p keystone/build
	emcmake cmake keystone -B keystone/build -DCMAKE_BUILD_TYPE=Release \
		-DBUILD_LIBS_ONLY=ON -DBUILD_SHARED_LIBS=OFF -DLLVM_TARGETS_TO_BUILD="all"
	emmake make -C keystone/build keystone
	em++ keystone/build/llvm/lib/libkeystone.a -o $@ ${EMCC_OPTIONS} -sEXPORT_NAME=loadKeystoneModule \
		-sEXPORTED_FUNCTIONS="[_malloc,_free,_ks_open,_ks_asm,_ks_free,_ks_close,_ks_option,_ks_errno,_ks_strerror]" \
		-sEXPORTED_RUNTIME_METHODS="[getValue,UTF8ToString,allocateUTF8]"

static/libkeystone-const.js: keystone/bindings/nodejs/consts
	cat keystone/bindings/nodejs/consts/[^index]* | sed -n 's/module\.exports\./export let KS_/p' > $@

serve: $(TARGET)
	python -m http.server --directory static
