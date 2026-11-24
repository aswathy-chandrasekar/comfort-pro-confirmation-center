/**
 * PROTOTYPE STATE STORE.
 *
 * Production replacement: a real datastore (Redis / Postgres table keyed
 * by event_id) so idempotency and state history survive process restarts
 * and work across multiple workflow workers. This in-memory Map is a
 * clearly-labeled stand-in, sufficient for a single-process demo/test run.
 *
 * Two different jobs are tracked here:
 *  1. Idempotency: has this exact inbound EVENT (event_id) already been
 *     processed? If yes -> short-circuit, do not call the LLM, do not
 *     route, do not send an ack, just log DUPLICATE_IGNORED.
 *  2. State history: for a given job_id, what is the ordered list of
 *     inbound events and the status each one produced? The LATEST event
 *     determines current_status. Earlier events are never deleted.
 */

class StateStore {
  constructor() {
    this.processedEvents = new Set();      // event_id -> processed
    this.jobHistory = new Map();           // job_id -> [{event_id, timestamp, raw_text, resulting_status, detail}]
  }

  /** Returns true if this exact event_id has already been fully processed. */
  isDuplicate(eventId) {
    return this.processedEvents.has(eventId);
  }

  /** Marks an event as processed. Call this only after a real decision was made. */
  markProcessed(eventId) {
    this.processedEvents.add(eventId);
  }

  /** Appends an event to a job's history and updates its current status. */
  recordEvent(jobId, event) {
    if (!this.jobHistory.has(jobId)) this.jobHistory.set(jobId, []);
    this.jobHistory.get(jobId).push(event);
  }

  getHistory(jobId) {
    return this.jobHistory.get(jobId) || [];
  }

  /** Current status = status produced by the most recent event for this job. */
  getCurrentStatus(jobId) {
    const hist = this.getHistory(jobId);
    if (hist.length === 0) return 'PENDING';
    return hist[hist.length - 1].resulting_status;
  }

  reset() {
    this.processedEvents.clear();
    this.jobHistory.clear();
  }
}

module.exports = { StateStore };
