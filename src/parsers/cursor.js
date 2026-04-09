/**
 * Parser: Cursor .cursor/rules/*.mdc
 *
 * Cursor's format uses YAML frontmatter with a `globs` field to scope rules.
 * The body is plain markdown instructions.
 *
 * Example frontmatter:
 *   ---
 *   description: API route rules
 *   globs: src/api/**
 *   alwaysApply: false
 *   ---
 */

const { createIR } = require('../ir');
const { extractBullets, classifyHeading, splitSections } = require('./markdown-utils');

/**
 * Parse a single .mdc file into IR (with scoped rule populated).
 * @param {string} content
 * @param {string} [filename]
 * @returns {import('../ir').ContextIR}
 */
function parseMDC(content, filename = '') {
  const ir = createIR();

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  let globs = [];
  let body = content;
  let alwaysApply = true;

  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    body = frontmatterMatch[2];

    const globsMatch = fm.match(/globs?:\s*(.+)/);
    if (globsMatch) {
      globs = globsMatch[1]
        .split(',')
        .map(s => s.trim().replace(/['"[\]]/g, ''))
        .filter(Boolean);
    }
    const alwaysMatch = fm.match(/alwaysApply:\s*(true|false)/);
    if (alwaysMatch) alwaysApply = alwaysMatch[1] === 'true';
  }

  // If alwaysApply or no globs — treat as global conventions
  if (alwaysApply || globs.length === 0) {
    const sections = splitSections(body);
    for (const section of sections) {
      const field = classifyHeading(section.heading);
      if (field === 'prohibitions') ir.prohibitions.push(...extractBullets(section.body));
      else if (field === 'conventions') ir.conventions.push(...extractBullets(section.body));
      else if (field === 'safetyRules') ir.safetyRules.push(...extractBullets(section.body));
      else ir.conventions.push(...extractBullets(section.body).filter(Boolean));
    }
    if (sections.length === 0) {
      ir.conventions.push(...extractBullets(body));
    }
  } else {
    // Scoped rule
    ir.scopedRules.push({ globs, content: body.trim() });
  }

  return ir;
}

module.exports = { parseMDC };
