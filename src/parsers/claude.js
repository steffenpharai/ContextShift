/**
 * Parser: CLAUDE.md (Claude Code)
 *
 * Handles both flat CLAUDE.md files and the multi-level hierarchy:
 *   ~/.claude/CLAUDE.md  (global)
 *   ./CLAUDE.md          (project root)
 *   ./.claude/rules/*.md (path-scoped rules)
 *
 * Also reads AGENTS.md as a fallback (same format, flat).
 */

const { createIR } = require('../ir');
const { splitSections, extractBullets, extractCommands, classifyHeading } = require('./markdown-utils');

/**
 * Parse a single CLAUDE.md or AGENTS.md string into IR.
 * @param {string} content
 * @returns {import('../ir').ContextIR}
 */
function parseCLAUDE(content) {
  const ir = createIR();

  // Extract project name from first H1
  const h1 = content.match(/^#\s+(.+)/m);
  if (h1) ir.projectName = h1[1].trim();

  // Strip @ import lines (record them as notes, we can't follow the file ref)
  const imports = [...content.matchAll(/^@([\w/.]+)/gm)].map(m => m[1]);
  if (imports.length > 0) {
    ir.notes.push(`[contextshift] Unresolved @imports: ${imports.join(', ')}`);
  }

  const sections = splitSections(content);

  for (const section of sections) {
    const field = classifyHeading(section.heading);

    if (field === 'commands') {
      ir.commands.push(...extractCommands(section.body));
    } else if (field === 'conventions') {
      ir.conventions.push(...extractBullets(section.body));
    } else if (field === 'prohibitions') {
      ir.prohibitions.push(...extractBullets(section.body));
    } else if (field === 'safetyRules') {
      ir.safetyRules.push(...extractBullets(section.body));
    } else if (field === 'workflows') {
      ir.workflows.push(section.body.trim());
    } else if (field === 'architecture') {
      ir.architecture = (ir.architecture ? ir.architecture + '\n' : '') + section.body.trim();
    } else if (field === 'stack') {
      ir.stack = (ir.stack ? ir.stack + '\n' : '') + section.body.trim();
    } else if (field === 'projectDescription') {
      ir.projectDescription = (ir.projectDescription ? ir.projectDescription + '\n' : '') + section.body.trim();
    } else if (field === 'personality') {
      ir.personality = section.body.trim();
    } else if (field === 'notes') {
      ir.notes.push(...extractBullets(section.body));
    } else {
      // Unclassified — preserve verbatim in rawExtra
      ir.rawExtra = (ir.rawExtra ? ir.rawExtra + '\n\n' : '') + `## ${section.heading}\n${section.body}`;
    }
  }

  return ir;
}

/**
 * Parse a .claude/rules/*.md file (path-scoped rule).
 * These files have optional YAML frontmatter with a `paths` field.
 * @param {string} content
 * @param {string} [filename]
 * @returns {import('../ir').ScopedRule}
 */
function parseScopedRule(content, filename = '') {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let globs = [];
  let body = content;

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    body = frontmatterMatch[2];
    const pathsMatch = frontmatter.match(/paths?:\s*(.+)/);
    if (pathsMatch) {
      globs = pathsMatch[1]
        .split(',')
        .map(s => s.trim().replace(/['"]/g, ''))
        .filter(Boolean);
    }
  }

  if (globs.length === 0 && filename) {
    // Infer glob from filename, e.g. api-rules.md → src/api/**
    const stem = filename.replace(/\.md$/, '').replace(/-rules?$/, '');
    globs = [`${stem}/**`];
  }

  return { globs, content: body.trim() };
}

module.exports = { parseCLAUDE, parseScopedRule };
