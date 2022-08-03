# Assembler Explorer

<img src="static/favicon.svg" align="right" width="64px"/>

Interactive in-browser assembler and disassembler using
[Capstone](https://github.com/capstone-engine/capstone)
and [Keystone](https://github.com/keystone-engine/keystone).
This tool focuses on simplicity and ease of use.

## How to build and deploy

Clone this repository with its submodules.
Building Capstone and Keystone for WebAssembly requires
[emscripten](https://emscripten.org/), [cmake](https://cmake.org/) and
[Python](https://www.python.org/).

Run `make` to build Capstone and Keystone.

Run `make serve` to launch a development server on `0.0.0.0:8000`.
You may deploy the content of `static` folder to a static web server.

## How to contribute

Please check your code using [standardjs](https://standardjs.com/).

This project is licensed under [the GPLv2 license](COPYING).
