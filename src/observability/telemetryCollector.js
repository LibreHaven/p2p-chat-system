// Telemetry collector: subscribe to eventBus telemetry events and aggregate light stats
// Non-invasive: dev-only logging by default; no remote calls here.

import eventBus from '../shared/eventBus';
import { Events } from '../shared/events';
import { config } from '../config';

let unsubscribeFns = [];
let state = {
  safeSend: { primaryErrors: 0, fallbacks: 0, lastLogAt: 0 },
  connection: { opens: 0, closes: 0, errors: 0, statusChanges: 0, lastLogAt: 0, lastFrom: null, lastTo: null },
};

function maybeDevLog(now) {
  if (!config?.isDevelopment) return;
  if (now - state.safeSend.lastLogAt < 10000) return; // 10s throttle
  // eslint-disable-next-line no-console
  console.debug('[telemetry]', {
    channel: 'safeSend',
    primaryErrors: state.safeSend.primaryErrors,
    fallbacks: state.safeSend.fallbacks,
    ts: now,
  });
  state.safeSend.lastLogAt = now;
}

export function startTelemetryCollector(opts = {}) {
  const { devLog = true } = opts;

  // Avoid double start
  if (unsubscribeFns.length > 0) return;

  const offSafeSend = eventBus.on(Events.TELEMETRY_SAFE_SEND, (evt) => {
    if (!evt || typeof evt !== 'object') return;
    const now = Date.now();
    if (evt.kind === 'primary-error') state.safeSend.primaryErrors += 1;
    if (evt.kind === 'fallback') state.safeSend.fallbacks = evt.count || (state.safeSend.fallbacks + 1);
    if (devLog) maybeDevLog(now);
  });

  const offConn = eventBus.on(Events.TELEMETRY_CONNECTION, (evt) => {
    if (!evt || typeof evt !== 'object') return;
    const now = Date.now();
    if (evt.type === 'open') state.connection.opens += 1;
    if (evt.type === 'close') state.connection.closes += 1;
    if (evt.type === 'error') state.connection.errors += 1;
    if (evt.type === 'status-change') {
      state.connection.statusChanges += 1;
      state.connection.lastFrom = evt.from ?? state.connection.lastFrom;
      state.connection.lastTo = evt.to ?? state.connection.lastTo;
    }
    if (devLog && config?.isDevelopment) {
      if (now - state.connection.lastLogAt >= 10000) {
        // eslint-disable-next-line no-console
        console.debug('[telemetry]', {
          channel: 'connection',
          opens: state.connection.opens,
          closes: state.connection.closes,
          errors: state.connection.errors,
          statusChanges: state.connection.statusChanges,
          lastTransition: state.connection.lastFrom && state.connection.lastTo ? `${state.connection.lastFrom} -> ${state.connection.lastTo}` : undefined,
          ts: now,
        });
        state.connection.lastLogAt = now;
      }
    }
  });

  unsubscribeFns.push(offSafeSend, offConn);
}

export function stopTelemetryCollector() {
  unsubscribeFns.forEach((off) => off?.());
  unsubscribeFns = [];
  state = {
    safeSend: { primaryErrors: 0, fallbacks: 0, lastLogAt: 0 },
    connection: { opens: 0, closes: 0, errors: 0, statusChanges: 0, lastLogAt: 0, lastFrom: null, lastTo: null },
  };
}

export default { startTelemetryCollector, stopTelemetryCollector };