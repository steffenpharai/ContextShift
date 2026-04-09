# contextshift

**Translate AI context files between tools — CLAUDE.md, AGENTS.md, SOUL.md, .cursorrules, copilot-instructions.md, and more.**

Every AI coding tool now reads a config file. They all encode the same thing — your project, your conventions, your rules — in completely incompatible formats. When you switch tools or use multiple tools in parallel, your context gets stranded.

`contextshift` solves this. Paste in any format, get out any other format. No rewrites. No starting over.

---

## Supported formats

| Key | Tool | File |
|-----|------|------|
| `claude` | Claude Code | `CLAUDE.md` |
| `agents` | Codex CLI | `AGENTS.md` |
| `gemini` | Gemini CLI | `GEMINI.md` |
| `cursor` | Cursor | `.cursor/rules/*.mdc` |
| `copilot` | GitHub Copilot | `.github/copilot-instructions.md` |
| `windsurf` | Windsurf | `.windsurfrules` |
| `soul` | OpenClaw | `SOUL.md` |
| `cowork` | Claude Cowork | `cowork-instructions.md` |

---

## Install

```bash
npm install -g contextshift
```

Or use without installing:

```bash
npx contextshift CLAUDE.md --to cursor
```

---

## CLI

```bash
# Translate to a single format
contextshift CLAUDE.md --to cursor

# Translate to multiple formats at once
contextshift CLAUDE.md --to agents --to copilot --to windsurf

# Translate to every supported format
contextshift CLAUDE.md --to all

# Write output to a specific directory
contextshift CLAUDE.md --to all --out ./generated

# Preview without writing files
contextshift CLAUDE.md --to cursor --dry-run

# Inspect what contextshift parsed from your file
contextshift CLAUDE.md --inspect

# SOUL.md → Codex CLI after the April 4 OpenClaw/Claude ban
contextshift SOUL.md --to agents
```

---

## Node.js API

```js
const { translate, translateAll, parse } = require('contextshift');

// Translate one format to another
const result = translate({
  content: fs.readFileSync('CLAUDE.md', 'utf-8'),
  from: 'claude',
  to: 'cursor',
});

console.log(result.filename);  // '.cursor/rules/global.mdc'
console.log(result.content);   // rendered file content
console.log(result.warnings);  // what couldn't be translated cleanly
console.log(result.ir);        // the intermediate representation

// Translate to all formats at once
const all = translateAll({
  content: fs.readFileSync('CLAUDE.md', 'utf-8'),
  from: 'claude',
});
// all.agents.content, all.cursor.content, all.soul.content ...

// Inspect the parsed intermediate representation
const ir = parse({
  content: fs.readFileSync('SOUL.md', 'utf-8'),
  from: 'soul',
});
// ir.personality, ir.prohibitions, ir.conventions ...
```

---

## How it works

Every context file format encodes the same underlying intent:
- **What is this project?** (name, stack, architecture)
- **How should you write code?** (conventions, style)
- **What must you never do?** (prohibitions, safety rules)
- **How should you communicate?** (personality, tone)

`contextshift` parses your file into a **neutral intermediate representation (IR)**, then renders the IR into the target format — adapting structure, syntax, and constraints for each platform.

```
CLAUDE.md ─── parse ──→ IR ──→ render ──→ .cursor/rules/global.mdc
                                    └──→ AGENTS.md
                                    └──→ copilot-instructions.md
                                    └──→ SOUL.md
```

What can't translate cleanly is flagged as a **warning**, not silently dropped. You always know what was lost.

---

## Translation fidelity

Some things translate cleanly. Others don't. Here's what to expect:

| Content type | Fidelity | Notes |
|---|---|---|
| Project name, stack, architecture | ✅ Full | Universal across all formats |
| Code conventions | ✅ Full | Syntax adapts per format |
| Prohibitions ("never do X") | ✅ Full | |
| Commands (`npm run test`) | ⚠️ Partial | Copilot and Windsurf have no command support |
| Path-scoped rules | ⚠️ Partial | Only Claude Code and Cursor support scoping |
| Personality / tone | ⚠️ Partial | Only SOUL.md and Cowork use this |
| MCP server config | ❌ Not portable | Tool-specific infrastructure |
| Claude Code hooks | ❌ Not portable | No equivalent in other formats |

Warnings are always printed. Nothing is silently discarded.

---

## GitHub Action — keep all formats in sync

Add this to `.github/workflows/contextshift.yml` to auto-generate all context files on every push to `main`:

```yaml
name: Sync context files
on:
  push:
    branches: [main]
    paths: ['CLAUDE.md']

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g contextshift
      - run: contextshift CLAUDE.md --to all --out .
      - uses: EndBug/add-and-commit@v9
        with:
          message: 'chore: sync context files from CLAUDE.md [skip ci]'
          add: 'AGENTS.md GEMINI.md .cursorrules .github/copilot-instructions.md .windsurfrules'
```

---

## Adding a new format

`contextshift` uses a parser/renderer architecture. Adding a new tool takes two files:

1. **Parser** — `src/parsers/mytool.js` — reads the format into IR
2. **Renderer** — add a function to `src/renderers/index.js` — writes IR to the format
3. Register both in `src/index.js`

The [IR schema](src/ir.js) is the contract between parsers and renderers.

Pull requests for new formats are welcome.

---

## Why this exists

As of April 2026:

- 8+ AI coding tools each have their own context file format
- Anthropic blocked Claude subscription tokens from OpenClaw on April 4, 2026 — thousands of users needed to migrate their `SOUL.md` files immediately, with no tooling to help
- Developers routinely run multiple tools in parallel (Claude Code in terminal, Cursor in IDE) and maintain diverging context files by hand
- Claude Code's own docs confirm it reads `AGENTS.md` as a fallback — the ecosystem is already trying to converge

`contextshift` is the missing bridge.

---

## Contributing

```bash
git clone https://github.com/steffenpharai/ContextShift.git
cd ContextShift
node test/index.test.js   # run the test suite
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

Issues and PRs welcome. Especially:
- New format parsers and renderers
- Better heuristics for section classification
- Real-world CLAUDE.md / SOUL.md test fixtures

---

## License

MIT
