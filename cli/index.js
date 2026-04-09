#!/usr/bin/env node
/**
 * contextshift CLI
 *
 * Examples:
 *   contextshift CLAUDE.md --to cursor
 *   contextshift SOUL.md --to agents --to copilot
 *   contextshift CLAUDE.md --to all
 *   contextshift CLAUDE.md --inspect        # show parsed IR
 */

const fs = require('fs');
const path = require('path');
const { translate, translateAll, parse, RENDERERS } = require('../src/index');

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function c(color, str) { return `${ANSI[color]}${str}${ANSI.reset}`; }

function detectFormat(filename) {
  const base = path.basename(filename).toLowerCase();
  if (base === 'claude.md' || base === 'claude') return 'claude';
  if (base === 'agents.md') return 'agents';
  if (base === 'soul.md') return 'soul';
  if (base === 'gemini.md') return 'gemini';
  if (base.endsWith('.mdc') || base.includes('.cursorrules') || base === '.cursorrules') return 'cursor';
  if (base === 'copilot-instructions.md') return 'copilot';
  if (base === '.windsurfrules') return 'windsurf';
  if (base.includes('cowork')) return 'cowork';
  return null;
}

function usage() {
  console.log(`
${c('bold', 'contextshift')} — translate AI context files between tools

${c('cyan', 'Usage:')}
  contextshift <file> --to <format> [--to <format>] [--out <dir>] [--dry-run]
  contextshift <file> --to all
  contextshift <file> --inspect

${c('cyan', 'Formats:')}
${Object.entries(RENDERERS).map(([k, v]) => `  ${c('green', k.padEnd(12))} ${v.label}`).join('\n')}

${c('cyan', 'Examples:')}
  contextshift CLAUDE.md --to cursor --to copilot
  contextshift SOUL.md --to agents
  contextshift CLAUDE.md --to all --out ./generated
  contextshift CLAUDE.md --inspect
`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    usage();
    process.exit(0);
  }

  const inputFile = args[0];
  const toFormats = [];
  let outDir = null;
  let dryRun = false;
  let inspect = false;
  let toAll = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--to' && args[i + 1]) {
      const fmt = args[++i];
      if (fmt === 'all') { toAll = true; }
      else toFormats.push(fmt);
    } else if (args[i] === '--out' && args[i + 1]) {
      outDir = args[++i];
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--inspect') {
      inspect = true;
    }
  }

  if (!fs.existsSync(inputFile)) {
    console.error(c('red', `Error: file not found: ${inputFile}`));
    process.exit(1);
  }

  const content = fs.readFileSync(inputFile, 'utf-8');
  const from = detectFormat(inputFile);

  if (!from) {
    console.error(c('red', `Could not detect format for "${inputFile}"`));
    console.error(c('gray', `Supported filenames: CLAUDE.md, AGENTS.md, SOUL.md, GEMINI.md, *.mdc, .cursorrules, copilot-instructions.md, .windsurfrules`));
    process.exit(1);
  }

  console.log(c('dim', `Detected: ${from} → ${inputFile}`));

  if (inspect) {
    const ir = parse({ content, from });
    console.log('\n' + c('bold', 'Parsed IR:'));
    console.log(JSON.stringify(ir, null, 2));
    return;
  }

  const targets = toAll ? Object.keys(RENDERERS).filter(k => k !== from) : toFormats;

  if (targets.length === 0) {
    console.error(c('red', 'No target format specified. Use --to <format> or --to all'));
    usage();
    process.exit(1);
  }

  for (const to of targets) {
    if (!RENDERERS[to]) {
      console.error(c('red', `Unknown format: "${to}"`));
      continue;
    }

    try {
      const result = translate({ content, from, to, filename: inputFile });

      if (result.warnings.length > 0) {
        console.log(c('yellow', `⚠  ${to}:`));
        result.warnings.forEach(w => console.log(c('yellow', `   ${w}`)));
      }

      if (dryRun) {
        console.log('\n' + c('bold', `── ${result.filename} ──`) + '\n');
        console.log(result.content);
        console.log();
        continue;
      }

      const dest = outDir
        ? path.join(outDir, result.filename)
        : path.join(path.dirname(inputFile), result.filename);

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, result.content, 'utf-8');
      console.log(c('green', `✓  ${result.filename}`));

      // Cursor produces multiple files
      if (result.files) {
        for (const f of result.files) {
          const fdest = outDir ? path.join(outDir, f.filename) : path.join(path.dirname(inputFile), f.filename);
          fs.mkdirSync(path.dirname(fdest), { recursive: true });
          fs.writeFileSync(fdest, f.content, 'utf-8');
          console.log(c('green', `✓  ${f.filename}`));
        }
      }
    } catch (err) {
      console.error(c('red', `✗  ${to}: ${err.message}`));
    }
  }
}

main();
