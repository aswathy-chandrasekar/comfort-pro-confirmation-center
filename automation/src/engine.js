/**
 * Comfort Pro Appointment Confirmation Workflow — reference engine (v2).
 *
 * This is the single source of truth for business logic. The n8n workflow
 * (workflow/Comfort_Pro_Confirmations.json) implements the same rules as
 * nodes and uses the same prompt text (src/classifier_prompt.js), but is
 * a separate artifact — see docs/INTEGRATION_REPORT.md for how the two are kept in
 * sync and what that duplication means for maintenance.
 *
 * MOCK BOUNDARY (the only one left in the logic layer): classifyIntent()
 * calls callLiveLLM() first, which is a real, working call to
 * api.anthropic.com. If ANTHROPIC_API_KEY is not set (true in this
 * sandbox), it falls back to data/llm_fixture.json — pre-computed
 * classifications for this fixed dataset, produced by manually applying
 * the exact prompt in classifier_prompt.js. This fallback is exercised on
 * every run in this environment; a live call has NOT been verified here.
 */
const fs = require('fs');
const path = require('path');
const { CLASSIFIER_SYSTEM_PROMPT, buildUserPrompt } = require('./classifier_prompt');

const CONFIDENCE_THRESHOLD = 0.85;
const DATA_DIR = path.join(__dirname, '..', 'data');
const fixture = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'llm_fixture.json')));

// ---------- normalization + deterministic pre-check ----------
function normalize(text) {
  if (text === null || text === undefined) return null;
  return text.trim().toUpperCase().replace(/[.!]+$/g, '');
}

// ISSUE 6 FIX: anchored, exact-match only. "WHY" must NOT match "Y".
const EXACT_CONFIRM_REGEX = /^(YES|Y|CONFIRM|CONFIRMED)$/;

function deterministicCheck(rawResponse) {
  if (rawResponse === null || rawResponse === undefined) {
    return { path: 'NO_RESPONSE', intent: 'NO_RESPONSE', confidence: 1.0, summary: 'Customer did not reply.' };
  }
  const norm = normalize(rawResponse);
  if (EXACT_CONFIRM_REGEX.test(norm)) {
    return { path: 'DETERMINISTIC', intent: 'CONFIRMED', confidence: 1.0, summary: 'Exact-match confirmation token, handled without AI.' };
  }
  return null; // needs LLM
}

// ---------- LLM call (real code path) + fixture fallback ----------
async function callLiveLLM(userPrompt) {
  if (!process.env.ANTHROPIC_API_KEY) return null; // signals "use fixture" - NOT VERIFIED LIVE in this environment
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: CLASSIFIER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  const data = await resp.json();
  const text = data.content.map(b => b.text || '').join('');
  return JSON.parse(text);
}

async function classifyIntent({ service, window, customer_response }, fixtureKey, faultOverride) {
  if (faultOverride === 'MALFORMED_OUTPUT') return { error: 'MALFORMED_OUTPUT' };
  if (faultOverride === 'API_TIMEOUT') return { error: 'API_TIMEOUT' };
  if (faultOverride === 'UNSUPPORTED_INTENT') return { intent: 'RESCHEDULE_AND_UPGRADE', confidence: 0.9, summary: 'invalid label', error: 'UNSUPPORTED_INTENT' };

  const userPrompt = buildUserPrompt({ service, window, customer_response });
  const live = await callLiveLLM(userPrompt).catch(() => ({ error: 'API_TIMEOUT' }));
  if (live) return live;

  const fixtureResult = fixture.primary[fixtureKey] || fixture.edge_cases[fixtureKey];
  if (!fixtureResult) return { error: 'MALFORMED_OUTPUT' };
  return fixtureResult;
}

// ---------- business-rule routing ----------
function routeDecision(classified) {
  if (classified.error || !classified.intent) {
    return { status: 'NEEDS_REVIEW', linda_action_required: true, suggested_action: 'Review response manually', reason: `LLM failure: ${classified.error || 'unknown'}` };
  }
  const validIntents = ['CONFIRMED', 'RESCHEDULE', 'CANCEL_CHANGE', 'QUESTION', 'AMBIGUOUS'];
  if (!validIntents.includes(classified.intent)) {
    return { status: 'NEEDS_REVIEW', linda_action_required: true, suggested_action: 'Review response manually', reason: 'Unsupported intent label returned by classifier' };
  }
  switch (classified.intent) {
    case 'CONFIRMED':
      if (classified.confidence >= CONFIDENCE_THRESHOLD) {
        return { status: 'CONFIRMED', linda_action_required: false, suggested_action: null, reason: null };
      }
      return { status: 'NEEDS_REVIEW', linda_action_required: true, suggested_action: 'Review response manually', reason: `Low-confidence CONFIRMED (${classified.confidence}) below ${CONFIDENCE_THRESHOLD} threshold` };
    case 'RESCHEDULE':
      return { status: 'NEEDS_RESCHEDULE', linda_action_required: true, suggested_action: 'Contact customer to review requested schedule change', reason: classified.summary };
    case 'CANCEL_CHANGE':
      return { status: 'NEEDS_REVIEW', linda_action_required: true, suggested_action: 'Review cancellation/change request before updating ServiceTitan', reason: classified.summary };
    case 'QUESTION':
      return { status: 'NEEDS_RESPONSE', linda_action_required: true, suggested_action: 'Respond to customer question', reason: classified.summary };
    case 'AMBIGUOUS':
      return { status: 'NEEDS_REVIEW', linda_action_required: true, suggested_action: 'Review ambiguous customer response', reason: classified.summary };
    default:
      return { status: 'NEEDS_REVIEW', linda_action_required: true, suggested_action: 'Review response manually', reason: 'Unhandled intent' };
  }
}

function routeNoResponse() {
  return { status: 'NO_RESPONSE', linda_action_required: true, suggested_action: 'Call customer', reason: 'No reply received to confirmation message' };
}

function customerAck(status) {
  switch (status) {
    case 'CONFIRMED': return "Thanks, you're confirmed. We'll see you tomorrow.";
    case 'NEEDS_RESCHEDULE': return "Thanks — I've passed your request to our dispatch team. They'll follow up to confirm any schedule change.";
    case 'NEEDS_RESPONSE': return "Thanks — I've passed your question to our team and they'll follow up.";
    case 'NEEDS_REVIEW': return "Thanks — I've passed your message to our team and they'll follow up shortly.";
    default: return null;
  }
}

// Deterministic formatting table for the 5 canonical appointment windows
// in this dataset - used to make the customer-facing message and the
// dashboard/frontend window display consistent and grammatical, e.g.
// "10-12" -> "10 AM and 12 PM" instead of the raw internal key.
const WINDOW_DISPLAY = {
  '8-10': '8 AM and 10 AM',
  '10-12': '10 AM and 12 PM',
  '12-2': '12 PM and 2 PM',
  '2-4': '2 PM and 4 PM',
  '4-6': '4 PM and 6 PM'
};

function outboundMessage(appt) {
  const firstName = appt.customer_name.split(' ')[0];
  const windowText = WINDOW_DISPLAY[appt.window] || appt.window;
  return `Hi ${firstName}, this is Comfort Pro. ${appt.technician} is scheduled for your ${appt.service} tomorrow between ${windowText} at ${appt.address}. Reply YES to confirm. If you need to change your appointment or have a question, just reply here.`;
}

/**
 * Processes ONE inbound event for ONE job, against a StateStore.
 * This is the real idempotency + multi-message-state entry point:
 * - if event_id was already processed -> DUPLICATE_IGNORED, no LLM call,
 *   no routing, no ack, no state mutation. Returns immediately.
 * - otherwise -> deterministic check -> LLM if needed -> route -> record
 *   the event onto the job's history (never overwriting prior events) ->
 *   mark event_id processed.
 */
async function processEvent({ jobId, eventId, rawText, service, window, timestamp, faultOverride }, stateStore) {
  if (stateStore.isDuplicate(eventId)) {
    return {
      job_id: jobId, event_id: eventId, timestamp,
      raw_text: rawText,
      processing_method: 'DUPLICATE_IGNORED',
      resulting_status: 'DUPLICATE_IGNORED',
      detail: 'Event already processed; no LLM call, no routing, no customer ack, no state change.',
      is_new_current_status: false
    };
  }

  let processing_method, classified, decision;
  if (rawText === null || rawText === undefined) {
    processing_method = 'NO_RESPONSE';
    classified = { intent: 'NO_RESPONSE', confidence: null, summary: 'No reply received.' };
    decision = routeNoResponse();
  } else {
    const det = deterministicCheck(rawText);
    if (det) {
      processing_method = 'DETERMINISTIC';
      classified = det;
      decision = routeDecision(det);
    } else {
      processing_method = 'LLM';
      classified = await classifyIntent({ service, window, customer_response: rawText }, `${jobId}`, faultOverride || null);
      decision = routeDecision(classified);
    }
  }

  const event = {
    event_id: eventId,
    timestamp,
    raw_text: rawText,
    processing_method,
    detected_intent: classified.intent || null,
    confidence: classified.confidence ?? null,
    classifier_summary: classified.summary || classified.error || null,
    resulting_status: decision.status,
    linda_action_required: decision.linda_action_required,
    suggested_action: decision.suggested_action,
    escalation_reason: decision.reason,
    error_state: classified.error || null
  };

  stateStore.recordEvent(jobId, event);
  stateStore.markProcessed(eventId);

  return { ...event, job_id: jobId, is_new_current_status: true };
}

// ---------- dashboard data builder ----------
function buildDashboardData(appointmentRecords, meta = {}) {
  const appointments = appointmentRecords.map(r => ({
    job_id: r.job_id,
    customer_name: r.customer_name,
    phone: r.phone,
    address: r.address || null,
    service: r.service,
    window: r.window,
    technician: r.technician,
    notes: r.notes || null,
    outbound_message: r.outbound_message,
    outbound_timestamp: r.outbound_timestamp || null,
    customer_reply: r.customer_response,
    response_timestamp: r.response_timestamp || null,
    processing_method: r.processing_method,
    intent: r.detected_intent,
    confidence: r.confidence,
    classifier_summary: r.classifier_summary || null,
    status: r.final_status,
    requires_attention: r.linda_action_required,
    suggested_action: r.suggested_action,
    escalation_reason: r.escalation_reason,
    customer_acknowledgement: r.customer_acknowledgement,
    error_state: r.error_state || null,
    timeline: r.timeline || []
  }));

  const confirmed = appointments.filter(a => a.status === 'CONFIRMED');
  const needs_attention = appointments.filter(a => a.status !== 'CONFIRMED');
  const no_response = appointments.filter(a => a.status === 'NO_RESPONSE');
  const genuineAutomationFailures = appointments.filter(a => !!a.error_state).length;

  return {
    generated_at: new Date().toISOString(),
    automation: {
      // "healthy" reflects the absence of genuine automation faults (LLM
      // errors/malformed output) - NOT the presence of business exceptions
      // like reschedules or questions, which are normal, expected outcomes.
      status: genuineAutomationFailures === 0 ? 'healthy' : 'issue',
      issue_count: genuineAutomationFailures,
      last_run: meta.lastRunLabel || null,
      integration_mode: 'demo'
    },
    summary: {
      total: appointments.length,
      confirmed: confirmed.length,
      needs_attention: needs_attention.length,
      no_response: no_response.length,
      automation_rate: appointments.length ? Number((confirmed.length / appointments.length).toFixed(2)) : 0
    },
    appointments
  };
}

module.exports = {
  CONFIDENCE_THRESHOLD, EXACT_CONFIRM_REGEX, normalize, deterministicCheck,
  classifyIntent, routeDecision, routeNoResponse, customerAck, outboundMessage,
  processEvent, buildDashboardData
};
