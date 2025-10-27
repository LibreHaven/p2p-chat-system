// statusChangeTracker: attach to a transport-like object to emit throttled status-change telemetry
// Non-invasive: subscribes to 'open' | 'close' | 'error' and compares transport.status()

import eventBus from '../shared/eventBus';
import { Events } from '../shared/events';

/**
 * Attach telemetry for status changes on a transport.
 * @param {Object} options
 * @param {{status:Function,on:Function}} options.transport - transport with status() and on(event,fn)
 * @param {string} options.where - label for where this transport lives (e.g., 'session', 'connection:incoming')
 * @param {number} [options.throttleMs=5000] - min interval in ms between emitted status-change events
 * @returns {Function} off - call to detach listeners
 */
export default function attachStatusChangeTelemetry({ transport, where, throttleMs = 5000 }) {
  if (!transport || typeof transport.on !== 'function' || typeof transport.status !== 'function') {
    return () => {};
  }
  let lastStatus;
  let lastEmittedAt = 0;

  const maybeEmit = () => {
    const now = Date.now();
    const current = safeStatus(transport);
    if (current === lastStatus) return;
    if (now - lastEmittedAt < throttleMs) {
      lastStatus = current; // still update local view to avoid noisy back/forth
      return;
    }
    const from = lastStatus;
    const to = current;
    lastStatus = current;
    lastEmittedAt = now;
    try {
      eventBus.emit?.(Events.TELEMETRY_CONNECTION, { where, type: 'status-change', from, to, ts: now });
    } catch (_) {
      // noop
    }
  };

  // Initialize snapshot without emitting
  lastStatus = safeStatus(transport);

  const offOpen = transport.on('open', maybeEmit);
  const offClose = transport.on('close', maybeEmit);
  const offError = transport.on('error', maybeEmit);

  return () => {
    offOpen?.();
    offClose?.();
    offError?.();
  };
}

function safeStatus(transport) {
  try {
    return transport.status?.() || 'unknown';
  } catch (_) {
    return 'unknown';
  }
}
