# Design Decisions

The decisions that shape this system, what I weighed, and what each one costs. The aim throughout was the smallest design that is safe to put in front of a real dispatcher.

## 1. Rules First, AI Second

**Context.** Most replies are trivially clear (`YES`). Some are natural language ("My wife will be there").

**Decision.** An anchored exact-match rule (`^(YES|Y|CONFIRM|CONFIRMED)$` after trimming and upper-casing) resolves obvious confirmations with no model call. Everything else goes to the classifier.

**Alternatives.** Send everything to the model (simpler, but slower, costlier and less predictable). Rules only (cheap, but "Sounds good" and "My husband will be home" would all fall to a human).

**Consequence.** Deterministic behavior where it is sufficient, model use only where language interpretation adds value. The rule is anchored because an unanchored `Y` would match "WHY"; a test covers it.

## 2. The Model Classifies; It Never Decides

**Decision.** The model returns `{intent, confidence, summary}` from a closed set: `CONFIRMED`, `RESCHEDULE`, `CANCEL_CHANGE`, `QUESTION`, `AMBIGUOUS`. Plain application code maps that to a status and an action. The model cannot schedule, cancel, price or dispatch, and has no tool access.

**Why.** A misclassification should cost a dispatcher a few seconds of review, not a wrong truck roll. Keeping the decision in deterministic code makes behavior testable and auditable.

## 3. Only One Outcome Is Automated

**Decision.** The only automatic action is confirming a high-confidence `CONFIRMED`. Reschedule, cancel/change, question and ambiguous replies always go to a person, regardless of confidence. Malformed output, timeouts, unknown intents and low confidence become `NEEDS_REVIEW`.

**Why.** Failure should degrade toward human review, never toward an unsupported business action. Confidence alone never authorizes an unsafe action.

## 4. Confidence Gate at 0.85

**Decision.** A configurable gate, starting at 0.85, applied identically in the Node engine and the n8n workflow (a validator check fails if they differ).

**Trade-off.** It is a conservative starting assumption, not a calibrated value. For the pilot, I would calibrate it on dispatcher-reviewed historical replies, trading false-confirmation risk against exception volume.

## 5. Idempotency Before Any Work

**Decision.** Each inbound event has an id. It is claimed with `INSERT OR IGNORE` into a `processed_events` table before classification, acknowledgement or state change. If the claim reports a duplicate, nothing else runs.

**Why.** SMS providers and webhooks deliver at-least-once. Duplicate delivery must not cause a second model call, a second customer message or a second state change. Claims live in SQLite, so the guarantee survives restarts.

## 6. Current Status and History Are Separate

**Decision.** Events are appended per job and never rewritten; the latest event defines the current status.

**Why.** "Yes," followed later by "Actually, can we do Friday?" must change the current status without erasing that the customer confirmed. Auditability requires that history is not overwritten.

## 7. The 5:30 PM Checkpoint Is a Threshold, Not a Cutoff

**Decision.** At the checkpoint, unanswered appointments become `NO_RESPONSE` and enter the dispatcher queue. A reply that arrives at 7:10 PM is still processed through the normal rules. If it safely confirms, the current status becomes `CONFIRMED` and the earlier `NO_RESPONSE` event stays in history. A test covers this.

**Why.** The checkpoint exists to stop waiting before escalating, not to stop accepting information.

## 8. The Backend Is the Source of Truth; the UI Renders

**Decision.** The React app contains no classification or routing logic. It maps backend rows to presentation (labels, badges, timeline) and renders them. A browser check verifies that what is displayed comes from the database.

**Why.** Two sources of truth for business decisions is how systems drift. The UI can be redesigned without touching a rule, and rules can change without touching the UI.

## 9. A Deliberately Small Backend

**Decision.** Express and SQLite, with four concerns: appointment state, idempotency claims, audit rows, and a health check. No queue, cache or message broker.

**Why.** It proves the persistence and idempotency patterns without adding infrastructure the pilot does not need. Moving to a production database is a contained change behind the same endpoints.

## 10. n8n Workflow and Node Engine Kept in Parity

**Decision.** The business logic exists once as readable, testable Node code (the engine) and once as an importable n8n workflow. A validator checks that the workflow stays aligned with the engine: same threshold, the embedded prompt byte-identical to the canonical prompt, no orphaned nodes, duplicates cannot reach the model node.

**Trade-off.** Two representations can drift. The validator turns that risk into a failing check instead of a hope. Wiring the workflow's HTTP nodes to the backend is the planned next step.

## 11. Mocks Are Seams, Not Shortcuts

**Decision.** The ServiceTitan, SMS and inbound boundaries are clearly named and isolated, and the simulated send records `SIMULATED_SENT` rather than pretending to deliver.

**Why.** It lets the whole decision path run and be tested without production credentials, and it makes the replacement points explicit. Integration details are described as subject to ServiceTitan's available API and integration capabilities rather than assumed.
