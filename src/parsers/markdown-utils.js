/**
 * Shared markdown parsing utilities.
 * Splits a markdown document into sections by heading level.
 */

/**
 * @param {string} content
 * @returns {{ heading: string, level: number, body: string }[]}
 */
function splitSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        body: '',
      };
    } else if (current) {
      current.body += line + '\n';
    }
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * Extract bullet list items from a block of markdown text.
 * @param {string} text
 * @returns {string[]}
 */
function extractBullets(text) {
  return text
    .split('\n')
    .map(l => l.replace(/^[\s]*[-*+]\s+/, '').trim())
    .filter(l => l.length > 0 && !l.startsWith('#'));
}

/**
 * Extract shell commands from a markdown block.
 * Recognises: "- `cmd`: description", "`cmd` — description", plain "- cmd" lines
 * @param {string} text
 * @returns {{ name: string, cmd: string, description?: string }[]}
 */
function extractCommands(text) {
  const commands = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Pattern: - `npm run test`: Run Jest tests
    const tickColon = line.match(/^[\s]*[-*]?\s*`([^`]+)`[:\s—–-]+(.+)/);
    if (tickColon) {
      commands.push({ name: tickColon[2].trim(), cmd: tickColon[1].trim(), description: tickColon[2].trim() });
      continue;
    }
    // Pattern: - npm run dev (Start development server)
    const plainCmd = line.match(/^[\s]*[-*]\s+([a-z][^\s(]+(?:\s+[a-z:./\-_]+)*)\s*(?:\((.+)\))?/);
    if (plainCmd && plainCmd[1].includes(' ') === false && /^[a-z]/.test(plainCmd[1])) {
      commands.push({ name: plainCmd[2] || plainCmd[1], cmd: plainCmd[1], description: plainCmd[2] });
    }
  }

  return commands;
}

/**
 * Simple keyword match to classify a section heading into an IR field.
 * Returns the IR field name, or null if unclassified.
 * @param {string} heading
 * @returns {string|null}
 */
function classifyHeading(heading) {
  const h = heading.toLowerCase();
  if (/command|script|run|build|test|deploy|start/.test(h)) return 'commands';
  if (/style|convention|format|naming|standard|pattern|prefer/.test(h)) return 'conventions';
  if (/never|prohibit|avoid|don.t|forbidden|must not/.test(h)) return 'prohibitions';
  if (/safety|permission|security|safe/.test(h)) return 'safetyRules';
  if (/workflow|process|procedure|step/.test(h)) return 'workflows';
  if (/architect|structure|folder|director|layout/.test(h)) return 'architecture';
  if (/stack|tech|technology|framework|librar/.test(h)) return 'stack';
  if (/overview|about|project|context/.test(h)) return 'projectDescription';
  if (/personalit|tone|voice|style.*comm|communicat/.test(h)) return 'personality';
  if (/note|important|warning|gotcha|caveat/.test(h)) return 'notes';
  return null;
}

module.exports = { splitSections, extractBullets, extractCommands, classifyHeading };
