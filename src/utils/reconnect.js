import { config } from '../config';

/**
 * computeReconnectDelay computes an exponential backoff delay based on attempts.
 * It uses config.peerConfig.reconnectBackoff with defaults: base=1000ms, factor=2, max=30000ms.
 * @param {number} attempts - Number of previous attempts (0-based recommended).
 * @param {object} [override] - Optional override { baseMs, factor, maxMs } for testing.
 * @returns {number} delay in milliseconds, clamped to maxMs.
 */
export function computeReconnectDelay(attempts, override) {
  const backoff = override || config?.peerConfig?.reconnectBackoff || {};
  const base = Number.isFinite(backoff.baseMs) ? backoff.baseMs : 1000;
  const factor = Number.isFinite(backoff.factor) ? backoff.factor : 2;
  const max = Number.isFinite(backoff.maxMs) ? backoff.maxMs : 30000;
  const n = Math.max(0, Math.floor(attempts || 0));
  const delay = base * Math.pow(factor, n);
  return Math.min(max, delay);
}

export default computeReconnectDelay;
