/**
 * contextshift — main translation API
 *
 * Usage:
 *   const { translate } = require('contextshift');
 *   const result = translate({ content: '...', from: 'claude', to: 'cursor' });
 */

const { parseCLAUDE, parseScopedRule } = require('./parsers/claude');
const { parseSOUL } = require('./parsers/soul');
const { parseMDC } = require('./parsers/cursor');
const { mergeIR, createIR } = require('./ir');
const { RENDERERS } = require('./renderers');

const PARSERS = {
  claude:   parseCLAUDE,
  agents:   parseCLAUDE,   // AGENTS.md is the same format
  gemini:   parseCLAUDE,   // GEMINI.md is close enough
  soul:     parseSOUL,
  cursor:   parseMDC,
  windsurf: (content) => {
    // Windsurf is plain text — treat as a flat conventions list
    const ir = createIR();
    ir.conventions = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    return ir;
  },
  copilot:  parseCLAUDE,   // copilot-instructions.md is markdown
  cowork:   parseCLAUDE,   // similar markdown structure
};

/**
 * Translate a single context file from one format to another.
 *
 * @param {object} opts
 * @param {string} opts.content    - Raw file content
 * @param {string} opts.from       - Source format key (claude|agents|soul|cursor|copilot|windsurf|gemini|cowork)
 * @param {string} opts.to         - Target format key
 * @param {string} [opts.filename] - Original filename (helps infer scoped rule globs)
 * @returns {{ filename: string, content: string, warnings: string[], ir: object }}
 */
function translate({ content, from, to, filename }) {
  if (!PARSERS[from]) throw new Error(`Unknown source format: "${from}". Valid: ${Object.keys(PARSERS).join(', ')}`);
  if (!RENDERERS[to]) throw new Error(`Unknown target format: "${to}". Valid: ${Object.keys(RENDERERS).join(', ')}`);

  const ir = PARSERS[from](content, filename);
  const result = RENDERERS[to].render(ir);

  return { ...result, ir };
}

/**
 * Translate to ALL supported formats at once.
 *
 * @param {object} opts
 * @param {string} opts.content
 * @param {string} opts.from
 * @returns {Record<string, { filename: string, content: string, warnings: string[] }>}
 */
function translateAll({ content, from }) {
  const ir = PARSERS[from](content);
  const results = {};
  for (const [key, renderer] of Object.entries(RENDERERS)) {
    if (key === from) continue;
    results[key] = { ...renderer.render(ir), ir };
  }
  return results;
}

/**
 * Parse a file into its IR without rendering.
 * Useful for inspecting what contextshift extracted.
 *
 * @param {object} opts
 * @param {string} opts.content
 * @param {string} opts.from
 * @returns {import('./ir').ContextIR}
 */
function parse({ content, from }) {
  if (!PARSERS[from]) throw new Error(`Unknown source format: "${from}"`);
  return PARSERS[from](content);
}

module.exports = { translate, translateAll, parse, RENDERERS, PARSERS };
