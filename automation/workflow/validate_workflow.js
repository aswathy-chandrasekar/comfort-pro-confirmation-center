const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, 'Comfort_Pro_Confirmations.json');
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

const errors = [];

const nodeNames = new Set(wf.nodes.map(n => n.name));
const nodesByName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));

// 1. All connection sources and targets must exist
for (const [fromName, def] of Object.entries(wf.connections || {})) {
  if (!nodeNames.has(fromName)) {
    errors.push(`Connection source "${fromName}" is not a node in this workflow.`);
  }

  for (const branch of def.main || []) {
    for (const target of branch || []) {
      if (!nodeNames.has(target.node)) {
        errors.push(
          `Connection target "${target.node}" from "${fromName}" does not exist.`
        );
      }
    }
  }
}

// 2. Code nodes must contain code
for (const node of wf.nodes) {
  if (node.type === 'n8n-nodes-base.code') {
    if (
      !node.parameters ||
      typeof node.parameters.jsCode !== 'string' ||
      node.parameters.jsCode.trim() === ''
    ) {
      errors.push(`Code node "${node.name}" has no jsCode.`);
    }
  }

  // IF/Switch logic must use native rule configuration
  if (
    node.type === 'n8n-nodes-base.switch' ||
    node.type === 'n8n-nodes-base.if'
  ) {
    if (node.parameters && typeof node.parameters.jsCode === 'string') {
      errors.push(
        `${node.type} node "${node.name}" illegally contains jsCode.`
      );
    }
  }
}

// 3. No classifier placeholder or external prompt reference
const raw = JSON.stringify(wf);

if (raw.includes('SYSTEM_PROMPT_PLACEHOLDER')) {
  errors.push('SYSTEM_PROMPT_PLACEHOLDER is still present.');
}

if (
  raw.includes('see docs/classifier_prompt.md') ||
  raw.includes('see README')
) {
  errors.push(
    'Workflow references an external prompt instead of embedding the classifier prompt.'
  );
}

const promptNode = nodesByName['Load Classifier Prompt (full text)'];

if (
  !promptNode ||
  !promptNode.parameters ||
  typeof promptNode.parameters.jsCode !== 'string' ||
  !promptNode.parameters.jsCode.includes(
    'Your ONLY job is to read one SMS reply'
  )
) {
  errors.push(
    'Full classifier prompt is not embedded in "Load Classifier Prompt (full text)".'
  );
}

// 4. Required final runtime nodes must exist
const requiredNodes = [
  'Rules First: Deterministic Check',
  'Classify Intent [LLM: Claude API]',
  'Validate LLM Output',
  'Apply Business Rules + Status',
  'Build Customer Acknowledgement',
  'Aggregate All Appointments',
  'Build Dashboard Data + Email HTML'
];

for (const name of requiredNodes) {
  if (!nodesByName[name]) {
    errors.push(`Required node "${name}" is missing.`);
  }
}

// 5. Final business rules must use the approved 0.85 threshold
const businessRuleNode = nodesByName['Apply Business Rules + Status'];

if (
  !businessRuleNode ||
  !businessRuleNode.parameters ||
  typeof businessRuleNode.parameters.jsCode !== 'string'
) {
  errors.push('Active business-rule node is missing or invalid.');
} else {
  const code = businessRuleNode.parameters.jsCode;

  if (!code.includes('confidence >= 0.85')) {
    errors.push(
      'Active business rules do not contain the approved 0.85 CONFIRMED threshold.'
    );
  }

  if (!code.includes("final_status = 'NEEDS_RESCHEDULE'")) {
    errors.push('RESCHEDULE escalation rule is missing.');
  }

  if (!code.includes("final_status = 'NEEDS_RESPONSE'")) {
    errors.push('QUESTION escalation rule is missing.');
  }

  if (!code.includes("final_status = 'NEEDS_REVIEW'")) {
    errors.push('Human-review fallback rule is missing.');
  }
}

// 6. Claude request must have temperature 0 and 30-second timeout
const claudeNode = nodesByName['Classify Intent [LLM: Claude API]'];

if (claudeNode) {
  const claudeRaw = JSON.stringify(claudeNode);

  if (
    !claudeRaw.includes('"temperature":0') &&
    !claudeRaw.includes('temperature: 0')
  ) {
    errors.push('Claude request does not visibly use temperature 0.');
  }

  if (!claudeRaw.includes('30000')) {
    errors.push('Claude request does not visibly use the 30000 ms timeout.');
  }
}

// 7. Deterministic confirmation rule must include exact-match YES behavior
const detNode = nodesByName['Rules First: Deterministic Check'];

if (!detNode) {
  errors.push('Deterministic-check node is missing.');
} else {
  const detRaw = JSON.stringify(detNode.parameters || {});

  const hasExactYesRule =
    detRaw.includes('YES') &&
    detRaw.includes('CONFIRM') &&
    detRaw.includes('CONFIRMED');

  if (!hasExactYesRule) {
    errors.push(
      'Deterministic confirmation node does not visibly contain YES / CONFIRM / CONFIRMED handling.'
    );
  }
}

// 8. Final Merge must exist and combine 3 branches
const mergeNodes = wf.nodes.filter(
  n => n.type === 'n8n-nodes-base.merge'
);

const finalMerge = mergeNodes.find(
  n =>
    n.name === 'Merge' &&
    n.parameters &&
    n.parameters.numberInputs === 3
);

if (!finalMerge) {
  errors.push('Final 3-input Merge node is missing.');
}

// 9. Duplicate path must not reach Claude
const dupNode = 'Log DUPLICATE_IGNORED (no further action)';
const reachableFromDup = new Set();

(function walk(name) {
  if (reachableFromDup.has(name)) return;

  reachableFromDup.add(name);

  const def = wf.connections[name];
  if (!def) return;

  for (const branch of def.main || []) {
    for (const target of branch || []) {
      walk(target.node);
    }
  }
})(dupNode);

if (reachableFromDup.has('Classify Intent [LLM: Claude API]')) {
  errors.push(
    'Duplicate-event branch can still reach Claude classification.'
  );
}

// 10. Aggregate must feed dashboard builder
const aggregateConnections =
  (wf.connections['Aggregate All Appointments'] || { main: [] }).main || [];

const aggConnectsToDashboard = aggregateConnections.some(branch =>
  (branch || []).some(
    target => target.node === 'Build Dashboard Data + Email HTML'
  )
);

if (!aggConnectsToDashboard) {
  errors.push(
    'Aggregate All Appointments does not feed Build Dashboard Data + Email HTML.'
  );
}

// 11. Embedded prompt must be identical to the canonical prompt (src/classifier_prompt.js)
const { CLASSIFIER_SYSTEM_PROMPT } = require('../src/classifier_prompt');
if (promptNode && promptNode.parameters && typeof promptNode.parameters.jsCode === 'string') {
  const m = promptNode.parameters.jsCode.match(/const SYSTEM_PROMPT = (".*");/);
  let embedded = null;
  try { embedded = m ? JSON.parse(m[1]) : null; } catch (e) { embedded = null; }
  if (embedded !== CLASSIFIER_SYSTEM_PROMPT) {
    errors.push('Prompt embedded in the workflow differs from src/classifier_prompt.js (prompt drift).');
  }
}

// 12. No orphaned nodes: every node except the trigger must have an incoming connection
const hasIncoming = new Set();
for (const def of Object.values(wf.connections || {})) {
  for (const branch of def.main || []) {
    for (const target of branch || []) hasIncoming.add(target.node);
  }
}
const triggers = wf.nodes.filter(n => /trigger/i.test(n.type)).map(n => n.name);
for (const n of wf.nodes) {
  if (!triggers.includes(n.name) && !hasIncoming.has(n.name)) {
    errors.push(`Node "${n.name}" is orphaned (no incoming connection).`);
  }
}

// 13. Every node must be reachable from the trigger
const reachable = new Set();
(function walk(name) {
  if (reachable.has(name)) return;
  reachable.add(name);
  const def = wf.connections[name];
  if (!def) return;
  for (const branch of def.main || []) for (const t of branch || []) walk(t.node);
})(triggers[0]);
for (const n of wf.nodes) {
  if (!reachable.has(n.name)) errors.push(`Node "${n.name}" is unreachable from the trigger.`);
}

// 14. Workflow threshold must equal the engine threshold
const { CONFIDENCE_THRESHOLD } = require('../src/engine');
if (CONFIDENCE_THRESHOLD !== 0.85) errors.push('Engine threshold is not 0.85.');

// Results
console.log(
  `STRUCTURAL VALIDATION: ${
    errors.length === 0 ? 'PASS' : 'FAIL'
  } (${wf.nodes.length} nodes checked)`
);

if (errors.length) {
  for (const error of errors) {
    console.log('  ✗ ' + error);
  }

  process.exit(1);
}

console.log('  ✓ all connection targets resolve');
console.log('  ✓ required active runtime nodes are present');
console.log('  ✓ full classifier prompt is embedded');
console.log('  ✓ active business rules use the 0.85 threshold');
console.log('  ✓ Claude node contains consistency and timeout settings');
console.log('  ✓ deterministic confirmation handling is present');
console.log('  ✓ final 3-path Append Merge is present');
console.log('  ✓ duplicate branch cannot reach Claude');
console.log('  ✓ aggregate feeds dashboard builder');
console.log('  ✓ embedded prompt is identical to src/classifier_prompt.js');
console.log('  ✓ no orphaned or unreachable nodes');
console.log('  ✓ workflow threshold matches engine threshold (0.85)');
console.log('');
console.log('NOTE: STRUCTURAL validation only. This script does not execute n8n.');
console.log('See README "Verification status" for what has and has not been run live.');
