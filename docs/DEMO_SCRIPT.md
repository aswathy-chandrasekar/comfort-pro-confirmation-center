# Three-Minute Walkthrough

**Setup:** backend running, `npm run demo` completed, UI open and signed in.

**0:00 The Problem (20 Seconds)**

"Every morning the dispatcher calls every customer to confirm they'll be home, and about half don't answer. That is up to two hours before she can do anything else. This replaces 'call everyone' with 'handle only the exceptions.'"

**0:20 The Result (20 Seconds)**

Point at the three cards. "Ten appointments went in. Six were confirmed automatically. Four need a person." Point at the queue: Angela, Patricia, Kevin, Bill.

**0:40 Human Control (40 Seconds)**

Open Angela Brooks. "She asked to move to tomorrow afternoon. The system understood that, but it did not touch the schedule. It put the decision in the dispatcher's hands." Point at "No schedule change was made automatically." Show the timeline.

**1:20 Rules First, AI Second (50 Seconds)**

Filter to Confirmed. Open Denise Harper, expand Automation details. "She replied YES. A simple rule handled it. No AI was involved." Close, open Robert Chen. "He wrote 'My wife will be there.' No keyword matches, so the model interpreted it at 95% confidence. AI is used only where language needs interpreting."

**2:10 No Response (20 Seconds)**

Open Kevin Marsh. "Silence is never treated as a yes. He stays in the queue with a clear next action: call him."

**2:30 Safety and Next Steps (30 Seconds)**

"If the model fails, returns something invalid, or isn't confident, the appointment goes to a person. The same message arriving twice can't cause a second action. Next is a one-location pilot that measures dispatcher minutes, no-shows and cost, so the case rests on measured numbers rather than assumptions."

**Likely Questions**

- *Why not send everything to the model?* Cost, latency and predictability; exact replies don't need it.
- *What if the model is wrong?* Only a high-confidence confirmation is automated, and a wrong one is the main risk; it is tracked as a pilot metric and the gate can be tightened.
- *What's mocked?* ServiceTitan, sending and receiving SMS. Everything between those boundaries runs.
- *What would you do next?* Wire n8n to the backend, add consent and delivery handling, calibrate the threshold on real replies.
