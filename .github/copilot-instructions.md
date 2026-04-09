## Architecture
Parser/renderer pipeline with a neutral Intermediate Representation (IR) as the contract:

```
Source file → Parser → IR → Renderer → Target file
```

**IR** (`src/ir.js`): The universal schema. All parsers produce it, all renderers consume it. Key fields: projectName, conventions, commands, prohibitions, scopedRules, personality, safetyRules.

**Parsers** (`src/parsers/`):
- `claude.js` — handles CLAUDE.md, AGENTS.md, GEMINI.md, copilot-instructions.md, cowork-instructions.md (all markdown-based, same parser)
- `soul.js` — handles SOUL.md (personality-first, different section classification)
- `cursor.js` — handles .cursor/rules/*.mdc (YAML frontmatter with globs)
- `markdown-utils.js` — shared utilities: `splitSections`, `extractBullets`, `extractCommands`, `classifyHeading` (keyword-based heading-to-IR-field mapping)

**Renderers** (`src/renderers/index.js`): One render function per format. Each returns `{ filename, content, warnings }`. Warnings flag what couldn't translate cleanly (e.g., commands dropped for Copilot, personality dropped for AGENTS.md).

**CLI** (`cli/index.js`): Argument parser, format auto-detection from filename, --to/--inspect/--dry-run flags.

**Main API** (`src/index.js`): Exports `translate()`, `translateAll()`, `parse()`. Routes through PARSERS and RENDERERS registries.
