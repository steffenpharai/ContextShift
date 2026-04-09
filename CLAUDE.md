# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

contextshift — CLI tool and Node.js library that translates AI context files between tools (CLAUDE.md, AGENTS.md, SOUL.md, .cursorrules, copilot-instructions.md, .windsurfrules, GEMINI.md, cowork-instructions.md). Zero dependencies.

## Commands

- `node test/index.test.js` — run the test suite (custom harness, no framework)
- `npx contextshift CLAUDE.md --to cursor --dry-run` — test a translation without writing files

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

## Key design decisions

- `classifyHeading()` in `markdown-utils.js` uses regex keyword matching to map section headings to IR fields — this is the core heuristic that determines parsing quality
- Windsurf parser is inline in `src/index.js` (just splits lines into conventions) since the format has no structure
- `mergeIR()` in `src/ir.js` concatenates array fields and takes override-wins for scalar fields — used for combining global + project CLAUDE.md files
- Copilot renderer enforces an 8000-char budget and drops lower-priority content
- Cursor renderer produces multiple .mdc files (one global + one per scoped rule)
