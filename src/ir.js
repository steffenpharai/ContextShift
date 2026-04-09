/**
 * Intermediate Representation (IR) — the universal schema for AI context files.
 *
 * Every format (CLAUDE.md, AGENTS.md, SOUL.md, .cursorrules, etc.) encodes the
 * same underlying intent. This IR captures that intent in a format-neutral way.
 * Parsers read into IR. Renderers write from IR.
 */

/**
 * @typedef {Object} ScopedRule
 * @property {string[]} globs - File patterns this rule applies to (e.g. ["src/api/**"])
 * @property {string} content - The rule content
 */

/**
 * @typedef {Object} Command
 * @property {string} name - Human label (e.g. "Run tests")
 * @property {string} cmd - The actual shell command
 * @property {string} [description]
 */

/**
 * @typedef {Object} ContextIR
 * @property {string} [projectName]
 * @property {string} [projectDescription]   - One-liner about the project
 * @property {string} [stack]                - Tech stack summary
 * @property {string} [architecture]         - Architecture notes
 * @property {string[]} conventions          - Code style / naming / formatting rules
 * @property {Command[]} commands            - Build / test / run commands
 * @property {string[]} prohibitions         - Things the agent must never do
 * @property {string[]} workflows            - Step-by-step process definitions
 * @property {ScopedRule[]} scopedRules      - Path-scoped instructions
 * @property {string} [personality]          - Tone / communication style
 * @property {string[]} safetyRules          - Explicit safety / permission constraints
 * @property {string[]} notes               - Catch-all for platform-specific hints
 * @property {string} [rawExtra]             - Unclassified content preserved verbatim
 */

/**
 * Creates a blank IR with all fields initialized.
 * @returns {ContextIR}
 */
function createIR() {
  return {
    projectName: undefined,
    projectDescription: undefined,
    stack: undefined,
    architecture: undefined,
    conventions: [],
    commands: [],
    prohibitions: [],
    workflows: [],
    scopedRules: [],
    personality: undefined,
    safetyRules: [],
    notes: [],
    rawExtra: undefined,
  };
}

/**
 * Merges two IRs. Used when combining global + project + subdirectory CLAUDE.md files.
 * @param {ContextIR} base
 * @param {ContextIR} override
 * @returns {ContextIR}
 */
function mergeIR(base, override) {
  return {
    projectName: override.projectName ?? base.projectName,
    projectDescription: override.projectDescription ?? base.projectDescription,
    stack: override.stack ?? base.stack,
    architecture: override.architecture ?? base.architecture,
    conventions: [...base.conventions, ...override.conventions],
    commands: [...base.commands, ...override.commands],
    prohibitions: [...base.prohibitions, ...override.prohibitions],
    workflows: [...base.workflows, ...override.workflows],
    scopedRules: [...base.scopedRules, ...override.scopedRules],
    personality: override.personality ?? base.personality,
    safetyRules: [...base.safetyRules, ...override.safetyRules],
    notes: [...base.notes, ...override.notes],
    rawExtra: [base.rawExtra, override.rawExtra].filter(Boolean).join('\n\n') || undefined,
  };
}

module.exports = { createIR, mergeIR };
