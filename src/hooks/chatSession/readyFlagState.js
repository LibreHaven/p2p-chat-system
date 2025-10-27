// A tiny, testable state helper for encryption READY flag transitions.
// No reads from storage; only optional writes via injected callbacks.

/**
 * @param {{ write?:(val:'sent'|'confirmed')=>void, clear?:()=>void }} [opts]
 */
export function createReadyFlagState(opts = {}) {
  const { write, clear } = opts || {};
  /** @type {''|'sent'|'confirmed'} */
  let state = '';

  return {
    get value() { return state; },
    /** Whether we should send the initial encryption-ready confirmation */
    shouldSend() { return state === ''; },
    markSent() {
      if (state === '' ) {
        state = 'sent';
        try { write?.('sent'); } catch (_) { /* noop */ }
      }
    },
    markConfirmed() {
      if (state !== 'confirmed') {
        state = 'confirmed';
        try { write?.('confirmed'); } catch (_) { /* noop */ }
      }
    },
    reset() {
      state = '';
      try { clear?.(); } catch (_) { /* noop */ }
    },
  };
}

export default createReadyFlagState;
