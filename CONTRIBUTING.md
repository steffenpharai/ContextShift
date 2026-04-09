# Contributing to contextshift

Thanks for your interest in contributing!

## Getting started

```bash
git clone https://github.com/steffenpharai/ContextShift.git
cd ContextShift
node test/index.test.js   # run the test suite
```

No build step or dependencies required — contextshift is zero-dependency.

## Adding a new format

1. **Parser** — create `src/parsers/mytool.js` that exports a function taking a string and returning an IR object (see `src/ir.js` for the schema)
2. **Renderer** — add a render function in `src/renderers/index.js` that takes IR and returns `{ filename, content, warnings }`
3. **Register** — add entries to the `PARSERS` map in `src/index.js` and the `RENDERERS` map in `src/renderers/index.js`
4. **Detect** — add filename detection in `cli/index.js` `detectFormat()`
5. **Test** — add test cases in `test/index.test.js`

## Running tests

```bash
node test/index.test.js
```

All tests must pass before submitting a PR.

## Pull requests

- Keep PRs focused — one format or one fix per PR
- Include test cases for new parsers/renderers
- Run the test suite before submitting

## Reporting issues

Open a GitHub issue with:
- The input file (or a minimal reproduction)
- The command you ran
- Expected vs actual output
