/**
 * Parser: SOUL.md (OpenClaw)
 *
 * SOUL.md is personality-first and life-automation focused.
 * It has no concept of commands, build scripts, or code conventions.
 * The dominant fields are personality, behavioral rules, and task context.
 *
 * Typical structure:
 *   # Name / Identity
 *   ## Personality
 *   ## Behavior Rules
 *   ## Context / About me
 *   ## Skills / Capabilities
 *   ## Communication Style
 */

const { createIR } = require('../ir');
const { splitSections, extractBullets, classifyHeading } = require('./markdown-utils');

/**
 * @param {string} content
 * @returns {import('../ir').ContextIR}
 */
function parseSOUL(content) {
  const ir = createIR();

  // Agent name from H1
  const h1 = content.match(/^#\s+(.+)/m);
  if (h1) ir.projectName = h1[1].trim();

  const sections = splitSections(content);
  const personalityParts = [];

  for (const section of sections) {
    const h = section.heading.toLowerCase();

    if (/personalit|character|identity|who (you|i) am|about (you|me)/.test(h)) {
      personalityParts.push(section.body.trim());
    } else if (/behavio|rule|guideline|instruct|must|should/.test(h)) {
      const bullets = extractBullets(section.body);
      // Classify bullets: prohibitions vs safety vs conventions
      for (const b of bullets) {
        if (/never|don.t|avoid|must not|prohibited/.test(b.toLowerCase())) {
          ir.prohibitions.push(b);
        } else if (/always|must|require/.test(b.toLowerCase())) {
          ir.safetyRules.push(b);
        } else {
          ir.conventions.push(b);
        }
      }
    } else if (/communicat|tone|voice|style/.test(h)) {
      personalityParts.push(section.body.trim());
    } else if (/context|situation|about|background/.test(h)) {
      ir.projectDescription = (ir.projectDescription ? ir.projectDescription + '\n' : '') + section.body.trim();
    } else if (/skill|capabilit|can do|task/.test(h)) {
      ir.notes.push(...extractBullets(section.body).map(b => `[capability] ${b}`));
    } else {
      const field = classifyHeading(section.heading);
      if (field === 'prohibitions') ir.prohibitions.push(...extractBullets(section.body));
      else if (field === 'safetyRules') ir.safetyRules.push(...extractBullets(section.body));
      else personalityParts.push(`## ${section.heading}\n${section.body.trim()}`);
    }
  }

  if (personalityParts.length > 0) {
    ir.personality = personalityParts.join('\n\n');
  }

  return ir;
}

module.exports = { parseSOUL };
