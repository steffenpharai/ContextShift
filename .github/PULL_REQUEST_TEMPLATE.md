## What does this PR do?

<!-- Brief description of the change -->

## Test plan

- [ ] `node test/index.test.js` passes
- [ ] Tested with a real context file (if applicable)

## Checklist

- [ ] New parser/renderer registered in `src/index.js` and `src/renderers/index.js`
- [ ] Format detection added to `cli/index.js` `detectFormat()`
- [ ] Tests added in `test/index.test.js`
- [ ] Warnings emitted for content that can't translate cleanly
