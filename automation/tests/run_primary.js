const fs = require('fs');
const path = require('path');
const engine = require('../src/engine');
const { StateStore } = require('../src/state_store');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, '..', 'output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const appointments = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'appointments.json')));
const responses = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'responses.json')));
const responseByJob = Object.fromEntries(responses.map(r => [r.job_id, r]));

async function main() {
  const store = new StateStore();
  const records = [];
  const sentTime = new Date('2026-09-12T17:00:00-05:00'); // 5:00 PM evening before
  const replyBaseTime = new Date('2026-09-12T17:07:00-05:00');

  let i = 0;
  for (const appt of appointments) {
    const outbound = engine.outboundMessage(appt);
    const r = responseByJob[appt.job_id];
    const raw = r ? r.customer_response : null;
    const replyTime = new Date(replyBaseTime.getTime() + i * 90 * 1000); // stagger replies
    i++;

    const eventResult = await engine.processEvent({
      jobId: appt.job_id,
      eventId: `evt-${appt.job_id}-1`,
      rawText: raw,
      service: appt.service,
      window: appt.window,
      timestamp: raw ? replyTime.toISOString() : null
    }, store);

    const timeline = [
      { time: sentTime.toISOString(), actor: 'SYSTEM', event: 'Confirmation message sent' }
    ];
    if (raw) {
      timeline.push({ time: replyTime.toISOString(), actor: 'CUSTOMER', event: `Customer replied: "${raw}"` });
      timeline.push({ time: replyTime.toISOString(), actor: 'SYSTEM', event: `Response categorized as ${eventResult.detected_intent} (${eventResult.processing_method.toLowerCase()})` });
      timeline.push({ time: replyTime.toISOString(), actor: 'SYSTEM', event: eventResult.resulting_status === 'CONFIRMED' ? 'Marked confirmed automatically' : 'Added to dispatcher review queue' });
    } else {
      timeline.push({ time: null, actor: 'SYSTEM', event: 'No response received by cutoff — added to dispatcher review queue' });
    }

    records.push({
      job_id: appt.job_id,
      customer_name: appt.customer_name,
      phone: appt.phone,
      address: appt.address,
      service: appt.service,
      window: appt.window,
      technician: appt.technician,
      notes: appt.notes,
      outbound_message: outbound,
      outbound_timestamp: sentTime.toISOString(),
      customer_response: raw,
      response_timestamp: raw ? replyTime.toISOString() : null,
      processing_method: eventResult.processing_method,
      detected_intent: eventResult.detected_intent,
      confidence: eventResult.confidence,
      classifier_summary: eventResult.classifier_summary,
      final_status: eventResult.resulting_status,
      linda_action_required: eventResult.linda_action_required,
      suggested_action: eventResult.suggested_action,
      escalation_reason: eventResult.escalation_reason,
      customer_acknowledgement: engine.customerAck(eventResult.resulting_status),
      error_state: eventResult.error_state,
      timeline
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'audit.json'), JSON.stringify(records, null, 2));

  const confirmed = records.filter(a => a.final_status === 'CONFIRMED');
  const exceptions = records.filter(a => a.final_status !== 'CONFIRMED');
  console.log(`TOTAL=${records.length} CONFIRMED=${confirmed.length} EXCEPTIONS=${exceptions.length}`);
  console.log('Exception statuses:', exceptions.map(e => `${e.job_id}:${e.final_status}`).join(', '));
  const assertOk = records.length === 10 && confirmed.length === 6 && exceptions.length === 4;
  console.log(assertOk ? 'PRIMARY DEMO TEST: PASS' : 'PRIMARY DEMO TEST: FAIL');

  // ---- dashboard data (canonical structured object, consumed by /dashboard) ----
  const dashboardData = engine.buildDashboardData(records, { lastRunLabel: '5:32 PM' });
  // schema self-check (also exercised formally in tests/run_edge_cases.js)
  if (dashboardData.summary.total !== dashboardData.summary.confirmed + dashboardData.summary.needs_attention) {
    throw new Error('Dashboard schema invariant violated: total != confirmed + needs_attention');
  }
  fs.writeFileSync(path.join(OUT_DIR, 'dashboard_data.json'), JSON.stringify(dashboardData, null, 2));

  // ---- secondary email summary (optional, not the primary product) ----
  const emailHtml = buildEmailHtml(dashboardData);
  fs.writeFileSync(path.join(OUT_DIR, 'linda_email.html'), emailHtml);

  return { assertOk };
}

function buildEmailHtml(dashboardData) {
  const { summary, appointments } = dashboardData;
  const exceptions = appointments.filter(a => a.requires_attention);
  const rows = exceptions.map(a => `
    <tr><td>${a.customer_name}</td><td>${a.service}</td><td>${a.window}</td>
    <td>${a.status.replace(/_/g, ' ')}</td><td>${a.suggested_action || ''}</td></tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;color:#1f2430;padding:20px;}
table{border-collapse:collapse;width:100%;margin-top:12px;}
td,th{border-bottom:1px solid #eee;padding:8px;text-align:left;font-size:14px;}
.btn{display:inline-block;margin-top:20px;padding:10px 18px;background:#0f766e;color:#fff;
text-decoration:none;border-radius:6px;font-size:14px;}</style></head>
<body>
<h2>Comfort Pro — Tomorrow's Confirmation Summary</h2>
<p>${summary.total} appointments · ${summary.confirmed} confirmed · ${summary.needs_attention} need attention</p>
<table><tr><th>Customer</th><th>Service</th><th>Window</th><th>Status</th><th>Action</th></tr>${rows}</table>
<a class="btn" href="http://localhost:3000">Open Confirmation Center</a>
<p style="color:#888;font-size:12px;">Secondary output — the dispatcher dashboard is the primary product surface.</p>
</body></html>`;
}

main().then(({ assertOk }) => process.exit(assertOk ? 0 : 1));
