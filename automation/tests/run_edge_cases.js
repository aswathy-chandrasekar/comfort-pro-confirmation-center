const fs = require('fs');
const path = require('path');
const engine = require('../src/engine');
const { StateStore } = require('../src/state_store');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, '..', 'output');
const cases = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'edge_cases.json')));

const results = [];

function record(r) { results.push(r); return r; }

async function runOriginalCase(c) {
  if (['EC16', 'EC17a', 'EC17b'].includes(c.case_id)) return; // superseded by dedicated tests below

  const store = new StateStore();
  const eventResult = await engine.processEvent({
    jobId: c.case_id, eventId: `${c.case_id}-evt1`, rawText: c.input,
    service: 'Test Service', window: '8-10', timestamp: new Date().toISOString(),
    faultOverride: c.simulate_fault || null
  }, store);

  let observed;
  if (eventResult.resulting_status === 'DUPLICATE_IGNORED') {
    observed = 'DUPLICATE_IGNORED';
  } else if (eventResult.error_state) {
    observed = 'NEEDS_REVIEW'; // any LLM failure mode converges here, regardless of the garbage label returned
  } else if (eventResult.detected_intent === 'NO_RESPONSE') {
    observed = 'NO_RESPONSE';
  } else if (eventResult.detected_intent === 'CONFIRMED' && eventResult.resulting_status !== 'CONFIRMED') {
    observed = 'NEEDS_REVIEW'; // low-confidence CONFIRMED override
  } else {
    observed = eventResult.detected_intent;
  }

  record({
    case_id: c.case_id, input: c.input, path_used: eventResult.processing_method,
    expected: c.expected_intent, actual: observed, confidence: eventResult.confidence,
    final_status: eventResult.resulting_status, pass: observed === c.expected_intent
  });
}

// ---- NEW TEST 1: state override (Issue 5) ----
async function testStateOverride() {
  const store = new StateStore();
  const jobId = 'JOB-STATE-1';
  const r1 = await engine.processEvent({ jobId, eventId: 'e1', rawText: 'Yes', service: 'AC Repair', window: '8-10', timestamp: '2026-09-12T14:02:00-05:00' }, store);
  const r2 = await engine.processEvent({ jobId, eventId: 'e2', rawText: 'Actually can we do Friday?', service: 'AC Repair', window: '8-10', timestamp: '2026-09-12T14:19:00-05:00' }, store);

  const history = store.getHistory(jobId);
  const currentStatus = store.getCurrentStatus(jobId);
  const pass = r1.resulting_status === 'CONFIRMED'
    && r2.resulting_status === 'NEEDS_RESCHEDULE'
    && currentStatus === 'NEEDS_RESCHEDULE'
    && history.length === 2
    && history[0].resulting_status === 'CONFIRMED'; // prior event NOT erased

  record({
    case_id: 'STATE-OVERRIDE', input: '["Yes", "Actually can we do Friday?"]',
    expected: 'history=[CONFIRMED, NEEDS_RESCHEDULE], current_status=NEEDS_RESCHEDULE, history not erased',
    actual: `history=[${history.map(h => h.resulting_status).join(', ')}], current_status=${currentStatus}`,
    pass
  });
}

// ---- NEW TEST 2: duplicate event short-circuit (Issue 4) ----
async function testDuplicateShortCircuit() {
  const store = new StateStore();
  const jobId = 'JOB-DUP-1';
  const eventId = 'evt-dup-1'; // SAME event_id sent twice

  const r1 = await engine.processEvent({ jobId, eventId, rawText: 'YES', service: 'AC Repair', window: '8-10', timestamp: '2026-09-12T14:00:00-05:00' }, store);
  const r2 = await engine.processEvent({ jobId, eventId, rawText: 'YES', service: 'AC Repair', window: '8-10', timestamp: '2026-09-12T14:00:05-05:00' }, store);

  const history = store.getHistory(jobId);
  const pass = r1.resulting_status === 'CONFIRMED'
    && r2.resulting_status === 'DUPLICATE_IGNORED'
    && r2.is_new_current_status === false
    && history.length === 1; // duplicate did NOT create a second history entry / second action

  record({
    case_id: 'DUPLICATE-SHORT-CIRCUIT', input: 'same event_id sent twice',
    expected: 'first=CONFIRMED, second=DUPLICATE_IGNORED, history length stays 1',
    actual: `first=${r1.resulting_status}, second=${r2.resulting_status}, history_len=${history.length}`,
    pass
  });
}

// ---- NEW TEST 3: exact-match regex safety (Issue 6) ----
async function testExactMatchSafety() {
  const store = new StateStore();
  const r1 = await engine.processEvent({ jobId: 'JOB-REGEX-1', eventId: 'e1', rawText: 'Y', service: 'AC Repair', window: '8-10', timestamp: new Date().toISOString() }, store);
  const r2 = await engine.processEvent({ jobId: 'JOB-REGEX-2', eventId: 'e2', rawText: 'WHY', service: 'AC Repair', window: '8-10', timestamp: new Date().toISOString() }, store);

  const pass = r1.processing_method === 'DETERMINISTIC' && r1.resulting_status === 'CONFIRMED'
    && r2.processing_method !== 'DETERMINISTIC'; // "WHY" must NOT deterministic-confirm

  record({
    case_id: 'EXACT-MATCH-SAFETY', input: '"Y" vs "WHY"',
    expected: '"Y"->DETERMINISTIC/CONFIRMED, "WHY"->NOT deterministic',
    actual: `Y->${r1.processing_method}/${r1.resulting_status}, WHY->${r2.processing_method}`,
    pass
  });
}

// ---- NEW TEST 4/5/6/7: dashboard schema validation ----
async function testDashboardSchema() {
  const audit = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'audit.json')));
  const dashboardData = engine.buildDashboardData(audit);
  const { summary, appointments } = dashboardData;

  const totalMatches = summary.total === summary.confirmed + summary.needs_attention;
  const everyExceptionHasAction = appointments.filter(a => a.requires_attention).every(a => !!a.suggested_action);
  const everyAppointmentHasStatus = appointments.every(a => !!a.status);
  const allowedStatuses = new Set(['CONFIRMED', 'NEEDS_RESCHEDULE', 'NEEDS_RESPONSE', 'NEEDS_REVIEW', 'NO_RESPONSE']);
  const noImpossibleStatuses = appointments.every(a => allowedStatuses.has(a.status));

  record({ case_id: 'SCHEMA-total-equals-sum', expected: true, actual: totalMatches, pass: totalMatches });
  record({ case_id: 'SCHEMA-every-exception-has-action', expected: true, actual: everyExceptionHasAction, pass: everyExceptionHasAction });
  record({ case_id: 'SCHEMA-every-appt-has-status', expected: true, actual: everyAppointmentHasStatus, pass: everyAppointmentHasStatus });
  record({ case_id: 'SCHEMA-no-impossible-statuses', expected: true, actual: noImpossibleStatuses, pass: noImpossibleStatuses });
}

// ---- NEW TEST (integration spec item 36): NO_RESPONSE -> later valid
// confirmation -> current state CONFIRMED, prior NO_RESPONSE history kept ----
async function testLateReplyAfterNoResponse() {
  const store = new StateStore();
  const jobId = 'JOB-LATE-REPLY-1';

  // Checkpoint reached: customer never replied in time.
  const checkpoint = await engine.processEvent({
    jobId, eventId: 'e1', rawText: null, service: 'AC Maintenance', window: '2-4',
    timestamp: '2026-09-13T17:30:00-05:00'
  }, store);

  // A real later inbound reply arrives after the checkpoint - processed
  // through the normal deterministic path, same as any other message.
  const lateReply = await engine.processEvent({
    jobId, eventId: 'e2', rawText: "Yes, I'll be home.", service: 'AC Maintenance', window: '2-4',
    timestamp: '2026-09-13T19:10:00-05:00'
  }, store);

  const history = store.getHistory(jobId);
  const currentStatus = store.getCurrentStatus(jobId);
  const pass = checkpoint.resulting_status === 'NO_RESPONSE'
    && lateReply.resulting_status === 'CONFIRMED'
    && currentStatus === 'CONFIRMED'
    && history.length === 2
    && history[0].resulting_status === 'NO_RESPONSE'; // checkpoint event preserved, not erased

  record({
    case_id: 'LATE-REPLY-AFTER-NO-RESPONSE',
    input: '[no reply by checkpoint] then ["Yes, I\'ll be home."] later',
    expected: 'checkpoint=NO_RESPONSE, later=CONFIRMED, current_status=CONFIRMED, history=[NO_RESPONSE, CONFIRMED] (2 entries, first preserved)',
    actual: `checkpoint=${checkpoint.resulting_status}, later=${lateReply.resulting_status}, current_status=${currentStatus}, history=[${history.map(h => h.resulting_status).join(', ')}]`,
    pass
  });
}

async function main() {
  for (const c of cases) await runOriginalCase(c);
  await testStateOverride();
  await testDuplicateShortCircuit();
  await testExactMatchSafety();
  await testLateReplyAfterNoResponse();
  await testDashboardSchema(); // depends on tests/run_primary.js having been run first

  const passCount = results.filter(r => r.pass).length;
  console.log(`TOTAL TESTS: ${passCount}/${results.length} PASS`);
  results.forEach(r => console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.case_id}  expected=${JSON.stringify(r.expected)}  actual=${JSON.stringify(r.actual)}`));

  fs.writeFileSync(path.join(OUT_DIR, 'edge_case_results.json'), JSON.stringify(results, null, 2));
  process.exit(results.every(r => r.pass) ? 0 : 1);
}

main();
