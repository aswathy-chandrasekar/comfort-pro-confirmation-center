# Comfort Pro Confirmation Center

**An Appointment-Confirmation Automation That Turns a Dispatcher's Morning From "Call Every Customer" Into "Work Only the Exceptions."**

Rules First, AI Second. AI Interprets, Business Rules Decide. Anything Uncertain Goes to a Person.

`Node 20+` · `Express + SQLite` · `React` · `n8n` · `Anthropic Claude (Classification Only)`

---

## At a Glance

| | |
|---|---|
| **The Problem** | A dispatcher spends 1.5 to 2 hours every morning phoning customers to confirm they will be home. About half do not answer. |
| **The Solution** | Text every customer, interpret the replies, auto-confirm the routine ones, and give the dispatcher a short exceptions list. |
| **The Result** | 10 appointments in, 6 confirmed automatically, 4 sent to a person. |
| **The Principle** | Automate certainty. Escalate ambiguity. The system never reschedules, cancels, prices or dispatches on its own. |

---

## Outcome

| Measure | Count | What Happened |
|---|---|---|
| Appointments Processed | 10 | A confirmation text was built for each one |
| Confirmed Automatically | 6 | 1 by an exact rule (no AI), 5 by AI interpretation above the confidence gate |
| Sent to the Dispatcher | 4 | 1 schedule change, 1 question, 2 no response |

The customer who asks to move her appointment is routed to a person. Her schedule is not touched.

## Screenshots

### Overview: Exceptions First

![Overview showing 10 appointments, 6 confirmed and 4 needing review, with the exception queue](docs/images/01-overview.png)

The dispatcher opens one screen and sees only what needs her: a schedule change, a question and two no-responses.

### Detail Drawer: Human Control

![Angela Brooks detail drawer showing the confirmation message, her reply, and the note that no schedule change was made automatically](docs/images/02-detail-drawer.png)

The system understood the request to move the appointment, but it did not change the schedule. The decision stays with the dispatcher.

### Automation Details: Rules First, AI Second

![Denise Harper's automation details showing a deterministic rule with no AI required](docs/images/03-automation-details.png)

An exact `YES` is resolved by a rule with no model call. A natural-language reply like "My wife will be there" is interpreted by the model.

### Activity: Traceability

![Activity page showing a chronological record of messages sent, replies, and routing decisions](docs/images/04-activity.png)

Every event is recorded in order, so it is clear what the customer said, what the system decided and why.

---

---

## The Client Problem

A residential HVAC and plumbing company (about $12M in revenue, 14 technicians, one dispatcher) loses a large part of every morning to confirmation calls, and no-shows waste technician time and truck rolls.

The owner raised three ideas: a website chatbot, appointment confirmations and after-hours call intake. I treated that as a prioritization problem, not a build list.

| Opportunity | Evidence Today | Decision |
|---|---|---|
| Appointment Confirmations | Measured daily workload and observed no-shows | **Build First** |
| After-Hours Intake | Possible lost revenue, but call volume and conversion are unknown | Measure During the Pilot, Then Decide |
| Website Chatbot | No defined problem or success metric | Hold |

---

## How It Works

```mermaid
flowchart LR
  ST["Appointment source<br/>(ServiceTitan boundary, mocked)"] --> MSG["Build confirmation message"]
  MSG --> SMS["Send SMS<br/>(provider boundary, mocked)"]
  SMS --> IN["Customer reply<br/>(inbound boundary, mocked)"]
  IN --> IDEM{"Event already<br/>processed?"}
  IDEM -- yes --> DUP["DUPLICATE_IGNORED<br/>no further action"]
  IDEM -- no --> RULE{"Exact rule?<br/>YES / Y / CONFIRM / CONFIRMED"}
  RULE -- "no reply" --> NR["NO_RESPONSE"]
  RULE -- "exact match" --> OK["CONFIRMED<br/>(no AI call)"]
  RULE -- "anything else" --> AI["Claude classifies intent only"]
  AI --> VAL["Validate output<br/>invalid / timeout / unknown intent -> NEEDS_REVIEW"]
  VAL --> BR["Business rules<br/>CONFIRMED and confidence >= 0.85 -> confirm<br/>everything else -> human"]
  NR --> BR
  OK --> BR
  BR --> DB[("Express API + SQLite<br/>status, audit, processed events")]
  DB --> UI["React Confirmation Center<br/>dispatcher works exceptions only"]
```

### Three Replies, Three Paths

| Customer Reply | Path | Result |
|---|---|---|
| `YES` | Exact-match rule. No model call, so no cost, no latency, fully deterministic. | Confirmed |
| `My wife will be there` | The model reads the sentence and returns an intent and a confidence. Business rules gate it. | Confirmed (95%) |
| `Can we move this to tomorrow afternoon?` | The model detects a schedule change. Policy says a person decides, regardless of confidence. | Dispatcher Review. **No Schedule Change Is Made.** |

### Failure Modes Are Designed, Not Discovered

| What Goes Wrong | What the System Does |
|---|---|
| Model returns invalid JSON, times out or returns an unknown intent | `NEEDS_REVIEW`, routed to a person |
| Model is unsure (confidence below 0.85) | `NEEDS_REVIEW`, never an automatic confirmation |
| Reply is ambiguous ("probably", "call me") | Dispatcher review |
| Customer says `WHY` | Does not match the rule for `Y`; the anchored pattern is `^(YES\|Y\|CONFIRM\|CONFIRMED)$` |
| Same inbound message arrives twice | Blocked before classification, acknowledgement or any write |
| Customer confirms, then asks to change | Current status updates; earlier events stay in history |
| Customer replies after the 5:30 PM checkpoint | Processed normally. The checkpoint means "stop waiting and escalate," not "stop accepting replies." |
| Customer text tries to instruct the model | The prompt tells the model to ignore embedded instructions, and its output is still validated and gated by business rules, so it cannot take an action even if manipulated |

---

## Key Engineering Decisions

| Decision | Why It Matters |
|---|---|
| Rules Before AI | Obvious replies cost nothing and behave identically every time. The model is used only where language needs interpreting. |
| The Model Classifies, Code Decides | A misread costs a dispatcher a few seconds of review, never a wrong truck roll. |
| One Automated Outcome | Only a high-confidence confirmation is automatic. Everything else goes to a person. |
| Idempotency Before Any Work | Events are claimed in a database first, so duplicate delivery cannot cause a second action, and the guarantee survives a restart. |
| Append-Only History | A later message changes the current status without erasing what came before. |
| Backend as Source of Truth | The UI renders what the backend holds and contains no business logic. |

Full reasoning, alternatives and trade-offs: [`docs/DESIGN_DECISIONS.md`](docs/DESIGN_DECISIONS.md).

---

## Built Like a Pilot, Not a Demo

Every external system sits behind a clearly marked boundary, so moving from prototype to pilot means replacing one boundary at a time.

| Boundary | In This Repository | Pilot Replacement |
|---|---|---|
| Appointment Source | `automation/data/appointments.json` | Supported ServiceTitan export, API or webhook |
| Outbound SMS | Message built and recorded as `SIMULATED_SENT` | Approved SMS provider or existing messaging infrastructure |
| Inbound SMS | `automation/data/responses.json` | Inbound messaging webhook |
| Status Write-Back | Local SQLite database | Supported ServiceTitan status update, or surface exceptions in the dispatcher's existing workflow |
| Sign-In | Local demo sign-in | Real identity provider |

Pilot replacements are subject to available ServiceTitan API and integration capabilities, which the first rollout step confirms before anything is built.

What is real and runs end to end: the rules, the classifier prompt and call path, the confidence gate and routing, idempotency claims in a database, state history, the API, and the dispatcher UI reading from that API.

Production planning: [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md) covers the risk register, readiness checklist, rollout plan and pilot success metrics. A three-minute walkthrough is in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

---

## Quality Evidence

| Evidence | Result |
|---|---|
| Primary Scenario | 10 total, 6 confirmed, 4 exceptions (4473, 4477, 4478, 4480) |
| Edge-Case Suite | 23/23: every reply category, failure paths, state override, duplicate short-circuit, exact-match safety, late reply after no-response |
| Engine to Database | Sync writes 10 / 6 / 4; a second run ignores all ten events as duplicates; claims and state survive a backend restart |
| Browser Checks Against the Live Backend | 37/37: KPIs, filters, search, KPI-card navigation, detail drawers, mark reviewed, date navigation, Activity, Calendar, mobile width |
| n8n Structural Validation | Connections resolve, node types match their contents, no orphaned nodes, embedded prompt identical to the canonical prompt, threshold equal to the engine's, duplicate branch cannot reach the model |
| Clean-Install Check | Fresh extract, `npm run setup`, tests, demo, build and browser checks all pass |

Recorded output: [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md).

---

## Repository Layout

```
automation/
  src/        engine.js, classifier_prompt.js, state_store.js
  data/       appointments.json, responses.json, edge_cases.json, llm_fixture.json
  tests/      run_primary.js, run_edge_cases.js
  scripts/    sync_to_backend.js
  workflow/   Comfort_Pro_Confirmations.json, validate_workflow.js
  output/     audit.json, dashboard_data.json, linda_email.html (regenerated by tests)
backend/      server.js, db.js, seed.js, reset-demo.js
frontend/     React app, patches/, e2e/check_ui.py
docs/         DESIGN_DECISIONS.md, PRODUCTION_READINESS.md, DEMO_SCRIPT.md, TEST_RESULTS.md
```

---

## Copyright and Usage

Copyright © 2026 Aswathy Chandrasekar. All rights reserved.

This repository is shared for portfolio and evaluation purposes only. No permission is granted to use, copy, modify, distribute or build on this work without written permission. See [`LICENSE`](LICENSE).
