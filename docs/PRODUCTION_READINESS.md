# Production Readiness

How this prototype becomes a pilot, and what has to be true before real customers receive a message. Statuses are exact: **Built** means implemented and tested in this repository; **Specified** means designed here but not yet built.

## Readiness Checklist

| Area | In This Repository | Needed for a Pilot | Status |
|---|---|---|---|
| Decision logic | Rules, classifier, confidence gate, routing, 23 edge-case tests | Calibrate the gate on real replies | Built |
| Failure behavior | Invalid output, timeout, unknown intent, low confidence all go to review | Alerting on failure rate | Built / Specified |
| Idempotency | Durable event claims in SQLite; verified across a restart | Production database | Built |
| State and history | Append-only history, current status derived from it | Same, on production storage | Built |
| Audit trail | Per-appointment audit record with message, reply, method, intent, confidence, status, action | Read the audit table directly in the Activity view; retention policy | Built / Specified |
| Dispatcher UI | Queue, filters, search, detail drawer, mark reviewed | Persist "reviewed" server-side; write-back where supported | Built / Specified |
| Appointment source | Mocked JSON | Supported ServiceTitan integration | Specified |
| SMS send and receive | Mocked | Approved provider, inbound webhook, delivery receipts, retries | Specified |
| Consent and opt-out | Not implemented | Consent records and opt-out handling honored before every send; confirm requirements with counsel | Specified |
| Data validation | Basic | Missing or invalid phone numbers detected and routed to a person | Specified |
| Privacy | Fictional data only; model receives only the reply text, service and window | Minimum necessary data to the model; encryption; access controls; retention limits | Specified |
| Security | Local demo sign-in; open CORS; no API auth | Real authentication, scoped API credentials, secrets management | Specified |
| n8n execution | Structurally validated; author-run locally | Execution log in repo; backend wiring; error workflow | Specified |
| Observability | Console logs | Structured logs, failure and exception-rate dashboards, alerts | Specified |

## Risk Register

| Risk | Likelihood / Impact | Mitigation |
|---|---|---|
| The model misreads a reply | Medium / low (a human reviews anything that is not a confident confirmation) | Closed intent set, confidence gate, only one automated outcome, spot-check sample during the pilot |
| A false confirmation (customer not actually home) | Low / medium | Conservative gate; track false-confirmation rate as a pilot metric; tighten the gate if it appears |
| Wrong or invalid phone number | Medium / medium | Validate numbers before sending; treat undeliverable as an exception for a person |
| SMS delivery failure | Medium / medium | Delivery receipts and retries; undelivered counts as needing a call |
| Customer dislikes automated texts | Low / medium | Short, plain message sent as the company; honor opt-outs; pilot at one location first |
| ServiceTitan integration fails or is limited | Medium / medium | Audit existing capabilities first; fall back to surfacing exceptions outside ServiceTitan; never block the dispatcher |
| Ambiguous replies pile up | Medium / low | They route to a person by design; track the ambiguous rate and refine the prompt on observed examples |
| Duplicate or out-of-order messages | High (inherent to SMS) / low | Idempotency claims; append-only history; latest event defines current status |
| Prompt manipulation via customer text | Low / low | Prompt instructs the model to ignore embedded instructions; output validated; the model cannot take actions |

## Rollout

1. **Audit before building.** Review what Comfort Pro's ServiceTitan plan already offers for reminders and confirmations. Use existing capabilities first and build only the missing exception layer.
2. **Agree the operating rules with the dispatcher:** send time, the no-response checkpoint, escalation rules, wording, reschedule and cancellation handling, common customer questions.
3. **Replace boundaries one at a time:** appointment source, then SMS send, then inbound, then write-back or exception surfacing.
4. **Shadow mode.** Run on real appointments without sending, and compare classifications with what the dispatcher would have decided.
5. **Pilot at one location for 2 to 4 weeks.**
6. **Decision gate:** expand, adjust or stop, based on measured results.

## Pilot Success Metrics

Primary: dispatcher confirmation minutes per day, automatic confirmation rate, human exception rate, no-show rate.

Secondary: customer response rate, failed truck rolls, schedule changes caught before dispatch, classification errors (from sampled review), ambiguous rate, model failure rate, SMS delivery failure rate, cost per appointment processed, total operating cost.

Baselines come from the "before" period and the pilot results replace the assumptions behind any projected savings. The demo's 60% automatic rate describes one sample batch; it is not a forecast of time or money saved.

## Cost Model

Figures are filled in from real quotes once the stack is chosen. Fixed cost: workflow hosting. Usage-based: model calls (only for non-exact replies), SMS segments, and storage. No figures are asserted here because they depend on the chosen provider and volume; the pilot measures cost per appointment processed directly.
