// createSafeSender creates a sender that prefers a provided sendPayload function
// (e.g., transport.send). If sendPayload throws, it falls back to peerSend.
// Behavior:
// - If sendPayload returns a Promise, we consider it accepted (true).
// - If it returns a boolean, we return that boolean directly.
// - If it throws, we call peerSend and return its boolean result.

/** @typedef {import('../types/contracts').SafeSend} SafeSend */

/**
 * @param {(conn:any, data:any)=> (void|boolean|Promise<void>)} sendPayload
 * @param {(conn:any, data:any)=> (void|boolean)} peerSend
 * @param {{ onPrimaryError?:(err:any)=>void, onFallback?:(conn:any, data:any)=>void }} [options]
 * @returns {SafeSend}
 */
export function createSafeSender(sendPayload, peerSend, options = {}) {
  const { onPrimaryError, onFallback } = options || {};
  return function safeSend(conn, data) {
    try {
      if (typeof sendPayload === 'function') {
        const r = sendPayload(conn, data);
        if (r && typeof r.then === 'function') {
          // Fire-and-forget: mark as accepted
          r.catch?.(() => {});
          return true;
        }
        if (r) return true;
        // primary returned falsy → try fallback
      }
    } catch (e) {
      try { onPrimaryError?.(e); } catch (err) { /* ignore */ }
      // fall through to fallback
    }
    if (typeof peerSend === 'function') {
      try { onFallback?.(conn, data); } catch (err) { /* ignore */ }
      return !!peerSend(conn, data);
    }
    return false;
  };
}

export default createSafeSender;
