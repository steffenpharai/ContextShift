/**
 * Renderers — convert IR to each target format.
 * Each renderer returns a { filename, content, warnings[] } object.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function bullets(items) {
  return items.map(i => `- ${i}`).join('\n');
}

function section(heading, content, level = 2) {
  if (!content || (Array.isArray(content) && content.length === 0)) return '';
  const hashes = '#'.repeat(level);
  const body = Array.isArray(content) ? bullets(content) : content;
  return `${hashes} ${heading}\n${body}\n`;
}

function commandBlock(commands) {
  if (!commands.length) return '';
  return '## Commands\n' + commands.map(c => `- \`${c.cmd}\`${c.description ? ` — ${c.description}` : ''}`).join('\n') + '\n';
}

// ─── CLAUDE.md ──────────────────────────────────────────────────────────────

function renderCLAUDE(ir) {
  const warnings = [];
  const parts = [];

  if (ir.projectName) parts.push(`# ${ir.projectName}\n`);
  if (ir.projectDescription) parts.push(`${ir.projectDescription}\n`);
  if (ir.stack) parts.push(section('Tech Stack', ir.stack));
  if (ir.architecture) parts.push(section('Architecture', ir.architecture));
  if (ir.conventions.length) parts.push(section('Code Style & Conventions', ir.conventions));
  if (ir.commands.length) parts.push(commandBlock(ir.commands));
  if (ir.prohibitions.length) parts.push(section('Never Do', ir.prohibitions));
  if (ir.safetyRules.length) parts.push(section('Safety Rules', ir.safetyRules));
  if (ir.workflows.length) parts.push(ir.workflows.map((w, i) => `## Workflow ${i + 1}\n${w}`).join('\n\n') + '\n');
  if (ir.notes.length) parts.push(section('Important Notes', ir.notes));
  if (ir.rawExtra) parts.push(ir.rawExtra + '\n');

  // Scoped rules → separate .claude/rules/ files (noted in output)
  if (ir.scopedRules.length) {
    warnings.push(`${ir.scopedRules.length} scoped rule(s) cannot be embedded in CLAUDE.md — write them to .claude/rules/*.md separately`);
    for (const rule of ir.scopedRules) {
      parts.push(`\n<!-- SCOPED RULE [${rule.globs.join(', ')}] — move to .claude/rules/\n${rule.content}\n-->`);
    }
  }

  return {
    filename: 'CLAUDE.md',
    content: parts.filter(Boolean).join('\n'),
    warnings,
  };
}

// ─── AGENTS.md (Codex CLI) ───────────────────────────────────────────────────

function renderAGENTS(ir) {
  const warnings = [];
  const parts = [];

  if (ir.projectName) parts.push(`# ${ir.projectName}\n`);
  if (ir.projectDescription) parts.push(`${ir.projectDescription}\n`);
  if (ir.stack) parts.push(section('Tech Stack', ir.stack));
  if (ir.architecture) parts.push(section('Architecture', ir.architecture));
  if (ir.conventions.length) parts.push(section('Code Conventions', ir.conventions));
  if (ir.commands.length) parts.push(commandBlock(ir.commands));
  if (ir.prohibitions.length) parts.push(section('Prohibitions', ir.prohibitions));
  if (ir.safetyRules.length) parts.push(section('Safety Rules', ir.safetyRules));
  if (ir.notes.length) parts.push(section('Notes', ir.notes));

  if (ir.scopedRules.length) {
    // AGENTS.md is flat — inline scoped rules with a note
    warnings.push('AGENTS.md is flat — scoped rules have been inlined without path context');
    for (const rule of ir.scopedRules) {
      parts.push(`\n## Rules for: ${rule.globs.join(', ')}\n${rule.content}\n`);
    }
  }

  if (ir.personality) {
    warnings.push('Personality/SOUL content was dropped — AGENTS.md is code-focused');
  }

  return {
    filename: 'AGENTS.md',
    content: parts.filter(Boolean).join('\n'),
    warnings,
  };
}

// ─── GEMINI.md (Gemini CLI) ──────────────────────────────────────────────────

function renderGEMINI(ir) {
  const warnings = [];
  const parts = [];

  if (ir.projectName) parts.push(`# ${ir.projectName}\n`);
  if (ir.projectDescription) parts.push(`${ir.projectDescription}\n`);
  if (ir.stack) parts.push(section('Stack', ir.stack));
  if (ir.architecture) parts.push(section('Architecture', ir.architecture));
  if (ir.conventions.length) parts.push(section('Coding Standards', ir.conventions));
  if (ir.commands.length) parts.push(commandBlock(ir.commands));
  if (ir.prohibitions.length) parts.push(section('Do Not', ir.prohibitions));
  if (ir.safetyRules.length) parts.push(section('Safety Constraints', ir.safetyRules));
  if (ir.notes.length) parts.push(section('Context', ir.notes));

  if (ir.scopedRules.length) {
    warnings.push('Gemini CLI has no path-scoped rules — all rules have been flattened');
    for (const rule of ir.scopedRules) {
      parts.push(`\n## Context: ${rule.globs.join(', ')}\n${rule.content}\n`);
    }
  }

  return {
    filename: 'GEMINI.md',
    content: parts.filter(Boolean).join('\n'),
    warnings,
  };
}

// ─── .cursorrules / .cursor/rules/*.mdc ─────────────────────────────────────

function renderCursor(ir) {
  const warnings = [];
  const files = [];

  // Global rules → .cursorrules (legacy) or .cursor/rules/global.mdc
  const globalParts = [];
  if (ir.projectName) globalParts.push(`# ${ir.projectName}\n`);
  if (ir.projectDescription) globalParts.push(`${ir.projectDescription}\n`);
  if (ir.stack) globalParts.push(section('Stack', ir.stack));
  if (ir.conventions.length) globalParts.push(section('Conventions', ir.conventions));
  if (ir.prohibitions.length) globalParts.push(section('Never', ir.prohibitions));
  if (ir.safetyRules.length) globalParts.push(section('Safety', ir.safetyRules));
  if (ir.commands.length) {
    warnings.push('Command definitions have no equivalent in Cursor — moved to Notes');
    globalParts.push(section('Commands (reference only)', ir.commands.map(c => `\`${c.cmd}\` — ${c.description || c.name}`)));
  }

  files.push({
    filename: '.cursor/rules/global.mdc',
    content: `---\ndescription: Global project rules\nalwaysApply: true\n---\n\n${globalParts.filter(Boolean).join('\n')}`,
  });

  // Scoped rules → individual .mdc files
  ir.scopedRules.forEach((rule, i) => {
    const slug = rule.globs[0]?.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase() || `rule-${i}`;
    files.push({
      filename: `.cursor/rules/${slug}.mdc`,
      content: `---\ndescription: Rules for ${rule.globs.join(', ')}\nglobs: ${rule.globs.join(', ')}\nalwaysApply: false\n---\n\n${rule.content}`,
    });
  });

  return {
    filename: '.cursor/rules/',
    files,
    content: files.map(f => `// ${f.filename}\n${f.content}`).join('\n\n---\n\n'),
    warnings,
  };
}

// ─── GitHub Copilot copilot-instructions.md ──────────────────────────────────

const COPILOT_TOKEN_BUDGET = 8000; // rough char limit

function renderCopilot(ir) {
  const warnings = [];
  const parts = [];

  // Copilot has strict budget — prioritize ruthlessly
  if (ir.conventions.length) parts.push(section('Coding Standards', ir.conventions));
  if (ir.prohibitions.length) parts.push(section('Never', ir.prohibitions));
  if (ir.architecture) parts.push(section('Architecture', ir.architecture));
  if (ir.stack) parts.push(`**Stack**: ${ir.stack}\n`);
  if (ir.safetyRules.length) parts.push(section('Safety', ir.safetyRules));

  // Drop lower-priority fields to stay within budget
  const content = parts.filter(Boolean).join('\n');
  if (content.length > COPILOT_TOKEN_BUDGET) {
    warnings.push('Content exceeds Copilot token budget — lower-priority sections were trimmed');
  }

  if (ir.commands.length) warnings.push('Command definitions dropped — Copilot has no command support');
  if (ir.scopedRules.length) warnings.push('Path-scoped rules flattened — Copilot has no path scoping');
  if (ir.personality) warnings.push('Personality content dropped — Copilot is code-only');
  if (ir.workflows.length) warnings.push('Workflow definitions dropped — move these to prompt templates');

  return {
    filename: '.github/copilot-instructions.md',
    content: content.slice(0, COPILOT_TOKEN_BUDGET),
    warnings,
  };
}

// ─── Windsurf .windsurfrules ─────────────────────────────────────────────────

function renderWindsurf(ir) {
  const warnings = [];
  const parts = [];

  // Windsurf: plain text, no enforced structure
  if (ir.projectDescription) parts.push(`Project: ${ir.projectDescription}\n`);
  if (ir.stack) parts.push(`Stack: ${ir.stack}\n`);
  if (ir.conventions.length) {
    parts.push('Conventions:');
    parts.push(bullets(ir.conventions));
  }
  if (ir.prohibitions.length) {
    parts.push('\nNever do:');
    parts.push(bullets(ir.prohibitions));
  }
  if (ir.commands.length) {
    parts.push('\nCommands:');
    parts.push(ir.commands.map(c => `  ${c.cmd}${c.description ? ` (${c.description})` : ''}`).join('\n'));
  }
  if (ir.safetyRules.length) {
    parts.push('\nSafety rules:');
    parts.push(bullets(ir.safetyRules));
  }

  if (ir.scopedRules.length) warnings.push('Windsurf has no path-scoped rules — all rules flattened');
  if (ir.personality) warnings.push('Personality content dropped — Windsurf is code-only');

  return {
    filename: '.windsurfrules',
    content: parts.filter(Boolean).join('\n'),
    warnings,
  };
}

// ─── SOUL.md (OpenClaw) ──────────────────────────────────────────────────────

function renderSOUL(ir) {
  const warnings = [];
  const parts = [];

  if (ir.projectName) parts.push(`# ${ir.projectName}\n`);

  if (ir.personality) {
    parts.push(`## Personality\n${ir.personality}\n`);
  } else {
    warnings.push('No personality content found — SOUL.md will be minimal');
    if (ir.projectDescription) parts.push(`## About\n${ir.projectDescription}\n`);
  }

  if (ir.prohibitions.length || ir.safetyRules.length) {
    parts.push(`## Behavior Rules\n${bullets([...ir.prohibitions, ...ir.safetyRules])}\n`);
  }

  if (ir.conventions.length) {
    parts.push(`## Preferences\n${bullets(ir.conventions)}\n`);
  }

  if (ir.commands.length) {
    warnings.push('Command definitions dropped — SOUL.md is life-automation focused, not code');
  }
  if (ir.scopedRules.length) {
    warnings.push('Path-scoped rules dropped — SOUL.md has no file-scoping concept');
  }

  return {
    filename: 'SOUL.md',
    content: parts.filter(Boolean).join('\n'),
    warnings,
  };
}

// ─── Cowork plugin instructions ──────────────────────────────────────────────

function renderCowork(ir) {
  const warnings = [];
  const parts = [];

  if (ir.projectName) parts.push(`# ${ir.projectName} — Cowork Instructions\n`);
  if (ir.projectDescription) parts.push(`${ir.projectDescription}\n`);

  if (ir.personality) parts.push(`## Agent Behavior\n${ir.personality}\n`);

  if (ir.prohibitions.length) parts.push(section('Never do', ir.prohibitions));
  if (ir.safetyRules.length) parts.push(section('Safety rules', ir.safetyRules));
  if (ir.notes.length) parts.push(section('Context', ir.notes));
  if (ir.workflows.length) parts.push(ir.workflows.map((w, i) => `## Task ${i + 1}\n${w}`).join('\n\n') + '\n');

  if (ir.commands.length) warnings.push('Command definitions dropped — Cowork is task-based, not code');
  if (ir.conventions.length) warnings.push('Code conventions dropped — Cowork does not execute code by default');
  if (ir.scopedRules.length) warnings.push('Path-scoped rules dropped — no equivalent in Cowork');

  return {
    filename: 'cowork-instructions.md',
    content: parts.filter(Boolean).join('\n'),
    warnings,
  };
}

// ─── Registry ────────────────────────────────────────────────────────────────

const RENDERERS = {
  'claude':    { render: renderCLAUDE,   label: 'Claude Code (CLAUDE.md)' },
  'agents':    { render: renderAGENTS,   label: 'Codex CLI (AGENTS.md)' },
  'gemini':    { render: renderGEMINI,   label: 'Gemini CLI (GEMINI.md)' },
  'cursor':    { render: renderCursor,   label: 'Cursor (.cursor/rules/*.mdc)' },
  'copilot':   { render: renderCopilot,  label: 'GitHub Copilot (copilot-instructions.md)' },
  'windsurf':  { render: renderWindsurf, label: 'Windsurf (.windsurfrules)' },
  'soul':      { render: renderSOUL,     label: 'OpenClaw (SOUL.md)' },
  'cowork':    { render: renderCowork,   label: 'Claude Cowork (cowork-instructions.md)' },
};

module.exports = { RENDERERS, renderCLAUDE, renderAGENTS, renderGEMINI, renderCursor, renderCopilot, renderWindsurf, renderSOUL, renderCowork };
