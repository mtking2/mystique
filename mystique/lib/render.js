'use strict';
const { resolveForm } = require('./forms');

// Precedence vs. communication-style modes (e.g. caveman). Appended to every
// non-empty injection so the two compose without coordination.
const COMPOSITION_FOOTER =
  'Composition: a communication-style mode (e.g. caveman), if active, governs ' +
  'phrasing and verbosity. This form governs mindset, focus, and content ' +
  'structure — apply the style mode on top.';

function toolLine(meta) {
  const parts = [];
  if (meta.tool_prefer && meta.tool_prefer.length) parts.push(`prefer ${meta.tool_prefer.join(', ')}`);
  if (meta.tool_avoid && meta.tool_avoid.length) parts.push(`avoid ${meta.tool_avoid.join(', ')}`);
  if (!parts.length) return '';
  return `Tool guidance (advisory): ${parts.join('; ')}.`;
}

function renderInjection(stateObj) {
  const active = (stateObj && stateObj.active) || [];
  const resolved = active.map(f => resolveForm(f.name)).filter(Boolean);
  if (resolved.length === 0) return '';

  const lines = [];
  if (resolved.length === 1) {
    const f = resolved[0];
    lines.push(`MYSTIQUE ACTIVE — form: ${f.name}`);
    lines.push(f.body.trim());
  } else {
    // cap-2 enforced upstream (lib/state.js); only forms 1 and 2 are rendered
    lines.push(`MYSTIQUE ACTIVE — ${resolved.length} forms. On conflict, primary (form 1) wins.`);
    lines.push(`form 1 (primary): ${resolved[0].name}`);
    lines.push(resolved[0].body.trim());
    lines.push(`form 2: ${resolved[1].name}`);
    lines.push(resolved[1].body.trim());
  }
  const tools = toolLine(resolved[0].meta); // primary wins for tool guidance
  if (tools) lines.push(tools);
  lines.push(COMPOSITION_FOOTER);
  return lines.join('\n');
}

module.exports = { renderInjection, toolLine, COMPOSITION_FOOTER };
