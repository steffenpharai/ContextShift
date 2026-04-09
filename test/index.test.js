/**
 * Basic test suite for contextshift.
 * Run with: node test/index.test.js
 */

const { translate, translateAll, parse } = require('../src/index');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓  ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗  ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FIXTURE_CLAUDE = `
# ShopFront

Next.js 14 e-commerce application with Stripe payments and Prisma ORM.

## Tech Stack
- Next.js 14 App Router
- Stripe for payments
- Prisma + PostgreSQL

## Architecture
- /app — Next.js App Router pages
- /components — UI components
- /lib — utilities

## Code Style & Conventions
- TypeScript strict mode, no \`any\` types
- Use named exports, not default exports
- CSS: Tailwind utility classes only

## Commands
- \`npm run dev\` — Start development server (port 3000)
- \`npm run test\` — Run Jest tests
- \`npm run lint\` — ESLint check

## Never Do
- NEVER commit .env files
- Do not install packages without updating lockfile

## Safety Rules
- Stripe webhook handler must validate signatures
- Always run \`terraform plan\` before proposing apply
`.trim();

const FIXTURE_SOUL = `
# Aria

## Personality
You are Aria, a warm and direct AI assistant. You cut through fluff and give real answers.
You have a dry sense of humor but never at the expense of helpfulness.

## Behavior Rules
- Never share personal data without explicit permission
- Always confirm before taking irreversible actions
- Don't pretend to know things you don't

## Communication Style
Keep responses concise. Use bullet points for lists. Prefer plain language over jargon.
`.trim();

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log('\nParsing tests\n');

test('parseCLAUDE extracts project name', () => {
  const ir = parse({ content: FIXTURE_CLAUDE, from: 'claude' });
  assert(ir.projectName === 'ShopFront', `Expected "ShopFront", got "${ir.projectName}"`);
});

test('parseCLAUDE extracts conventions', () => {
  const ir = parse({ content: FIXTURE_CLAUDE, from: 'claude' });
  assert(ir.conventions.length > 0, 'Expected conventions to be populated');
  assert(ir.conventions.some(c => c.includes('strict')), 'Expected TypeScript strict rule');
});

test('parseCLAUDE extracts commands', () => {
  const ir = parse({ content: FIXTURE_CLAUDE, from: 'claude' });
  assert(ir.commands.length >= 2, `Expected >=2 commands, got ${ir.commands.length}`);
  assert(ir.commands.some(c => c.cmd.includes('dev')), 'Expected dev command');
});

test('parseCLAUDE extracts prohibitions', () => {
  const ir = parse({ content: FIXTURE_CLAUDE, from: 'claude' });
  assert(ir.prohibitions.length > 0, 'Expected prohibitions');
  assert(ir.prohibitions.some(p => p.includes('.env')), 'Expected .env prohibition');
});

test('parseSOUL extracts personality', () => {
  const ir = parse({ content: FIXTURE_SOUL, from: 'soul' });
  assert(ir.personality && ir.personality.length > 0, 'Expected personality content');
  assert(ir.personality.includes('Aria'), 'Expected Aria in personality');
});

test('parseSOUL extracts prohibitions from behavior rules', () => {
  const ir = parse({ content: FIXTURE_SOUL, from: 'soul' });
  assert(ir.prohibitions.length > 0, 'Expected prohibitions from behavior rules');
});

console.log('\nTranslation tests\n');

test('CLAUDE.md → AGENTS.md preserves project name', () => {
  const result = translate({ content: FIXTURE_CLAUDE, from: 'claude', to: 'agents' });
  assert(result.content.includes('ShopFront'), 'Expected ShopFront in output');
  assert(result.filename === 'AGENTS.md', `Expected AGENTS.md, got ${result.filename}`);
});

test('CLAUDE.md → Cursor produces .mdc files', () => {
  const result = translate({ content: FIXTURE_CLAUDE, from: 'claude', to: 'cursor' });
  assert(result.files && result.files.length > 0, 'Expected Cursor to produce multiple files');
  assert(result.files[0].filename.endsWith('.mdc'), 'Expected .mdc extension');
});

test('CLAUDE.md → Copilot drops commands with warning', () => {
  const result = translate({ content: FIXTURE_CLAUDE, from: 'claude', to: 'copilot' });
  assert(result.warnings.some(w => w.toLowerCase().includes('command')), 'Expected command warning');
  assert(!result.content.includes('npm run dev'), 'Expected commands to be dropped from Copilot output');
});

test('CLAUDE.md → SOUL.md warns about missing personality', () => {
  const result = translate({ content: FIXTURE_CLAUDE, from: 'claude', to: 'soul' });
  assert(result.warnings.some(w => w.toLowerCase().includes('personality')), 'Expected personality warning');
});

test('SOUL.md → AGENTS.md warns about personality drop', () => {
  const result = translate({ content: FIXTURE_SOUL, from: 'soul', to: 'agents' });
  assert(result.warnings.some(w => w.toLowerCase().includes('personality')), 'Expected personality drop warning');
});

test('SOUL.md → CLAUDE.md preserves prohibitions', () => {
  const result = translate({ content: FIXTURE_SOUL, from: 'soul', to: 'claude' });
  assert(result.content.includes('personal data') || result.content.includes('permission'), 'Expected prohibition content in output');
});

test('translateAll returns all formats except source', () => {
  const results = translateAll({ content: FIXTURE_CLAUDE, from: 'claude' });
  const keys = Object.keys(results);
  assert(!keys.includes('claude'), 'Source format should not be in translateAll output');
  assert(keys.includes('agents'), 'Expected agents in translateAll output');
  assert(keys.includes('soul'), 'Expected soul in translateAll output');
  assert(keys.includes('cursor'), 'Expected cursor in translateAll output');
});

test('Unknown format throws helpful error', () => {
  let threw = false;
  try {
    translate({ content: '# test', from: 'notaformat', to: 'claude' });
  } catch (e) {
    threw = true;
    assert(e.message.includes('notaformat'), 'Error should mention the bad format name');
  }
  assert(threw, 'Expected error to be thrown');
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
