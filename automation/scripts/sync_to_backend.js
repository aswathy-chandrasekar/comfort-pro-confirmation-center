/**
 * sync_to_backend.js
 *
 * Runs the real automation engine over the supplied appointments and writes
 * every result into the Comfort Pro backend (SQLite) over its HTTP API. The
 * React Confirmation Center then reads those rows from the same API.
 *
 *   mocked ServiceTitan data -> engine (rules first, AI second, business rules)
 *     -> backend /api/events/claim  (durable idempotency)
 *     -> backend PATCH /api/appointments/:id  (status + audit)
 *     -> React Confirmation Center
 *
 * MOCKED here: the SMS send (we record a simulated delivery) and the inbound
 *   reply (read from data/responses.json).
 * REAL here: rules, classifier call (fixture unless ANTHROPIC_API_KEY is set),
 *   business-rule routing, idempotency claims, database writes.
 *
 * Usage:  node scripts/sync_to_backend.js            (backend on :4000)
 *         API_BASE=http://host:4000/api node scripts/sync_to_backend.js
 */
const fs = require('fs');
const path = require('path');
const engine = require('../src/engine');
const { StateStore } = require('../src/state_store');

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';
const DATA_DIR = path.join(__dirname, '..', 'data');

const appointments = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'appointments.json'), 'utf8'));
const responses = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'responses.json'), 'utf8'));
const replyByJob = Object.fromEntries(responses.map((r) => [r.job_id, r.customer_response]));

async function api(method, route, body) {
  const res = await fetch(`${API_BASE}${route}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${route} -> HTTP ${res.status}: ${text}`);
  return json;
}

async function main() {
  try {
    await api('GET', '/health');
  } catch (e) {
    console.error(`Backend not reachable at ${API_BASE}. Start it first: npm run backend:start`);
    process.exit(1);
  }

  const store = new StateStore(); // in-process history for the engine; durable idempotency is the backend claim
  const now = Date.now();
  const sentAt = new Date(now - 40 * 60 * 1000);
  let processed = 0;
  let duplicates = 0;
  let i = 0;

  for (const appt of appointments) {
    const jobId = String(appt.job_id);
    const eventId = `evt-${jobId}-1`;
    const reply = replyByJob[jobId] ?? null;
    const replyAt = new Date(sentAt.getTime() + (7 + i * 2) * 60 * 1000);
    i++;

    // MOCK: outbound SMS. Recorded as simulated, never sent.
    await api('PATCH', `/appointments/${jobId}`, {
      outbound_message: engine.outboundMessage(appt),
      outbound_message_id: `SIM-${jobId}`,
      outbound_timestamp: sentAt.toISOString(),
      delivery_status: 'SIMULATED_SENT',
    });

    // Idempotency: claim the inbound event before doing any work.
    const claim = await api('POST', '/events/claim', { event_id: eventId, job_id: jobId });
    if (claim.duplicate) {
      duplicates++;
      console.log(`  ${jobId} DUPLICATE_IGNORED (${eventId} already processed) - no classification, no write`);
      continue;
    }

    const result = await engine.processEvent({
      jobId,
      eventId,
      rawText: reply,
      service: appt.service,
      window: appt.window,
      timestamp: reply ? replyAt.toISOString() : null,
    }, store);

    await api('PATCH', `/appointments/${jobId}`, {
      status: result.resulting_status,
      customer_reply: reply,
      response_timestamp: reply ? replyAt.toISOString() : null,
      processing_method: result.processing_method,
      detected_intent: result.detected_intent,
      confidence: result.confidence,
      classifier_summary: result.classifier_summary,
      requires_attention: result.linda_action_required,
      suggested_action: result.suggested_action,
      escalation_reason: result.escalation_reason,
    });
    processed++;
    console.log(`  ${jobId} ${appt.customer_name.padEnd(16)} ${result.processing_method.padEnd(13)} -> ${result.resulting_status}`);
  }

  // Prove the backend rejects a replayed event.
  const replay = await api('POST', '/events/claim', { event_id: `evt-${appointments[0].job_id}-1`, job_id: String(appointments[0].job_id) });
  console.log(`\nReplay of evt-${appointments[0].job_id}-1 -> duplicate=${replay.duplicate} (expected true)`);
  if (!replay.duplicate) { console.error('Idempotency check FAILED'); process.exit(1); }

  const rows = await api('GET', '/appointments');
  const confirmed = rows.filter((r) => r.status === 'CONFIRMED').length;
  const exceptions = rows.filter((r) => r.requires_attention).length;
  console.log(`\nBackend now holds TOTAL=${rows.length} CONFIRMED=${confirmed} EXCEPTIONS=${exceptions}`);
  console.log(`This run: processed=${processed} duplicates_ignored=${duplicates}`);

  if (processed > 0 && !(rows.length === 10 && confirmed === 6 && exceptions === 4)) {
    console.error('SYNC CHECK: FAIL (expected 10 / 6 / 4)');
    process.exit(1);
  }
  console.log('SYNC CHECK: PASS');
}

main().catch((e) => { console.error(e); process.exit(1); });
