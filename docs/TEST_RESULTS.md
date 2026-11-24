# Test Results

Recorded from a **fresh extract** of the project zip (clean `npm run setup`, no prior `node_modules` or database), Node 22, Linux, on 2026-11-23.

Scope: this records what was executed. Not covered: running n8n, or a live Anthropic call (all runs used `automation/data/llm_fixture.json`). See the README "Quality evidence" section.

Reproduce with the commands shown in each heading (see README "Run it"). The browser check needs the backend on :4000, `npm run demo` completed, and the built frontend served on :3000.

```text
### npm run test-all
TOTAL=10 CONFIRMED=6 EXCEPTIONS=4
Exception statuses: 4473:NEEDS_RESCHEDULE, 4477:NEEDS_RESPONSE, 4478:NO_RESPONSE, 4480:NO_RESPONSE
PRIMARY DEMO TEST: PASS
TOTAL TESTS: 23/23 PASS
PASS  EC1  expected="CONFIRMED"  actual="CONFIRMED"
PASS  EC2  expected="CONFIRMED"  actual="CONFIRMED"
PASS  EC3  expected="CONFIRMED"  actual="CONFIRMED"
PASS  EC4  expected="RESCHEDULE"  actual="RESCHEDULE"
PASS  EC5  expected="RESCHEDULE"  actual="RESCHEDULE"
PASS  EC6  expected="CANCEL_CHANGE"  actual="CANCEL_CHANGE"
PASS  EC7  expected="QUESTION"  actual="QUESTION"
PASS  EC8  expected="QUESTION"  actual="QUESTION"
PASS  EC9  expected="AMBIGUOUS"  actual="AMBIGUOUS"
PASS  EC10  expected="AMBIGUOUS"  actual="AMBIGUOUS"
PASS  EC11  expected="NO_RESPONSE"  actual="NO_RESPONSE"
PASS  EC12  expected="NEEDS_REVIEW"  actual="NEEDS_REVIEW"
PASS  EC13  expected="NEEDS_REVIEW"  actual="NEEDS_REVIEW"
PASS  EC14  expected="NEEDS_REVIEW"  actual="NEEDS_REVIEW"
PASS  EC15  expected="NEEDS_REVIEW"  actual="NEEDS_REVIEW"
PASS  STATE-OVERRIDE  expected="history=[CONFIRMED, NEEDS_RESCHEDULE], current_status=NEEDS_RESCHEDULE, history not erased"  actual="history=[CONFIRMED, NEEDS_RESCHEDULE], current_status=NEEDS_RESCHEDULE"
PASS  DUPLICATE-SHORT-CIRCUIT  expected="first=CONFIRMED, second=DUPLICATE_IGNORED, history length stays 1"  actual="first=CONFIRMED, second=DUPLICATE_IGNORED, history_len=1"
PASS  EXACT-MATCH-SAFETY  expected="\"Y\"->DETERMINISTIC/CONFIRMED, \"WHY\"->NOT deterministic"  actual="Y->DETERMINISTIC/CONFIRMED, WHY->LLM"
PASS  LATE-REPLY-AFTER-NO-RESPONSE  expected="checkpoint=NO_RESPONSE, later=CONFIRMED, current_status=CONFIRMED, history=[NO_RESPONSE, CONFIRMED] (2 entries, first preserved)"  actual="checkpoint=NO_RESPONSE, later=CONFIRMED, current_status=CONFIRMED, history=[NO_RESPONSE, CONFIRMED]"
PASS  SCHEMA-total-equals-sum  expected=true  actual=true
PASS  SCHEMA-every-exception-has-action  expected=true  actual=true
PASS  SCHEMA-every-appt-has-status  expected=true  actual=true
PASS  SCHEMA-no-impossible-statuses  expected=true  actual=true
STRUCTURAL VALIDATION: PASS (24 nodes checked)
  ✓ all connection targets resolve
  ✓ required active runtime nodes are present
  ✓ full classifier prompt is embedded
  ✓ active business rules use the 0.85 threshold
  ✓ Claude node contains consistency and timeout settings
  ✓ deterministic confirmation handling is present
  ✓ final 3-path Append Merge is present
  ✓ duplicate branch cannot reach Claude
  ✓ aggregate feeds dashboard builder
  ✓ embedded prompt is identical to src/classifier_prompt.js
  ✓ no orphaned or unreachable nodes
  ✓ workflow threshold matches engine threshold (0.85)

NOTE: STRUCTURAL validation only. This script does not execute n8n.
See README "Verification status" for what has and has not been run live.

### npm run demo
Seeded 10 appointments into SQLite.

Comfort Pro demo reset complete.
--------------------------------
Appointments:     10
Pending:          10
Processed events: 0
Audit events:     0
--------------------------------
Demo environment is ready.

  4471 Maria Gonzalez   LLM           -> CONFIRMED
  4472 Tom Whitfield    LLM           -> CONFIRMED
  4473 Angela Brooks    LLM           -> NEEDS_RESCHEDULE
  4474 Robert Chen      LLM           -> CONFIRMED
  4475 Denise Harper    DETERMINISTIC -> CONFIRMED
  4476 James Okafor     LLM           -> CONFIRMED
  4477 Patricia Lyons   LLM           -> NEEDS_RESPONSE
  4478 Kevin Marsh      NO_RESPONSE   -> NO_RESPONSE
  4479 Linda Tran       LLM           -> CONFIRMED
  4480 Bill Sanders     NO_RESPONSE   -> NO_RESPONSE

Replay of evt-4471-1 -> duplicate=true (expected true)

Backend now holds TOTAL=10 CONFIRMED=6 EXCEPTIONS=4
This run: processed=10 duplicates_ignored=0
SYNC CHECK: PASS
Compiled successfully.

### python frontend/e2e/check_ui.py
PASS  KPI total = 10
PASS  KPI confirmed = 6
PASS  KPI needs review = 4
PASS  Default queue shows exactly the 4 exceptions
PASS  Filter 'confirmed' shows 6
PASS  Filter 'schedule-changes' shows 1
PASS  Filter 'questions' shows 1
PASS  Filter 'no-response' shows 2
PASS  Filter 'all' shows 10
PASS  Filter 'needs-attention' shows 4
PASS  Schedule changes = Angela
PASS  Questions = Patricia
PASS  No response = Kevin + Bill
PASS  Search 'carlos' -> Carlos's jobs only (3)
PASS  Search by job id 4474 -> Robert
PASS  Search with no match -> 0 rows
PASS  KPI 'Confirmed' card filters to 6
PASS  KPI 'Appointments' card filters to 10
PASS  KPI 'Needs review' card filters to 4
PASS  Angela: shows the real outbound message
PASS  Angela: customer reply shown
PASS  Angela: 'No schedule change was made automatically'
PASS  Angela: timeline is populated
PASS  Angela: AI classification, RESCHEDULE, 98%, Human review
PASS  Denise: Deterministic rule, AI not required, no confidence
PASS  Robert: AI classification, CONFIRMED, 95%
PASS  Kevin: no response, call customer, no late-reply simulation
PASS  Mark reviewed removes Patricia from the queue (3 left)
PASS  Next day shows no live appointments
PASS  Back to tomorrow shows all 10 again
PASS  Activity page lists events from live data
PASS  Activity starts with the batch send (recorded time) and lists 10 messages
PASS  Activity is in chronological order
PASS  Calendar page renders
PASS  No 'Simulate late reply' control in the UI
PASS  Mobile: no horizontal page scroll
PASS  No uncaught page errors

37/37 UI checks passed
```
