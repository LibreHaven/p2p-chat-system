// ConnectionService - build and send connection-related envelopes via injected safeSend

import { createEnvelope, MessageTypes } from '../../shared/messages/envelope';
import { config } from '../../config';

/**
 * Send a connection-request envelope.
 * @param {(conn:any, data:any)=>any} safeSend - unified sender (transport-first + fallback)
 * @param {any} conn - connection-like object used by safeSend
 * @param {string} peerId - local peer id
 * @param {boolean} useEncryption - requested encryption flag
 */
export function sendConnectionRequest(safeSend, conn, peerId, useEncryption) {
  const envelope = createEnvelope(MessageTypes.ConnectionRequest, {
    peerId,
    useEncryption,
    timestamp: Date.now(),
  });
  return safeSend(conn, envelope);
}

/**
 * Send a connection-accepted envelope.
 * @param {(conn:any, data:any)=>any} safeSend
 * @param {any} conn
 * @param {string} peerId
 * @param {boolean} finalUseEncryption - negotiated effective encryption flag
 */
export function sendConnectionAccepted(safeSend, conn, peerId, finalUseEncryption) {
  const envelope = createEnvelope(MessageTypes.ConnectionAccepted, {
    peerId,
    useEncryption: finalUseEncryption,
    timestamp: Date.now(),
  });
  return safeSend(conn, envelope);
}

/**
 * Send a connection-rejected envelope.
 * @param {(conn:any, data:any)=>any} safeSend
 * @param {any} conn
 */
export function sendConnectionRejected(safeSend, conn) {
  const envelope = createEnvelope(MessageTypes.ConnectionRejected, { timestamp: Date.now() });
  return safeSend(conn, envelope);
}

/**
 * Reject incoming connection: send rejected envelope then try closing the connection.
 * Returns whether close() was attempted without throwing.
 *
 * @param {(conn:any, data:any)=>any} safeSend
 * @param {any} connLike
 * @returns {{ closed: boolean }}
 */
export function rejectIncomingConnectionFlow(safeSend, connLike) {
  try {
    sendConnectionRejected(safeSend, connLike);
  } catch (_e) {
    // swallow send errors for rejection
  }
  let closed = false;
  try {
    connLike?.close?.();
    closed = true;
  } catch (_e) {
    // swallow close errors
  }
  return { closed };
}

/**
 * Handle remote close: update connection status and waiting flag.
 * @param {{ setConnectionStatus?: (s:string)=>void, setWaitingForAcceptance?: (v:boolean)=>void }} ctx
 */
export function handleRemoteCloseFlow(ctx) {
  const { setConnectionStatus, setWaitingForAcceptance } = ctx || {};
  try { setConnectionStatus?.('disconnected'); } catch (_e) { /* noop */ }
  try { setWaitingForAcceptance?.(false); } catch (_e) { /* noop */ }
}

/**
 * Handle remote error: update status, clear waiting, and toast.
 * @param {{ setConnectionStatus?: (s:string)=>void, setWaitingForAcceptance?: (v:boolean)=>void, displayToast?: (msg:string)=>void }} ctx
 */
export function handleRemoteErrorFlow(ctx) {
  const { setConnectionStatus, setWaitingForAcceptance, displayToast } = ctx || {};
  try { setConnectionStatus?.('failed'); } catch (_e) { /* noop */ }
  try { setWaitingForAcceptance?.(false); } catch (_e) { /* noop */ }
  try { displayToast?.('连接出现错误'); } catch (_e) { /* noop */ }
}

/**
 * Negotiate final encryption usage based on local and incoming preferences.
 * Current policy: only when both sides opt-in.
 * @param {boolean} local
 * @param {boolean} remote
 * @returns {boolean}
 */
export function negotiateFinalUseEncryption(local, remote) {
  const mode = config?.security?.encryptionNegotiation || 'both';
  if (mode === 'either') return !!(local || remote);
  return !!(local && remote);
}

/**
 * Accept incoming connection: negotiate encryption, persist/store, send accepted, and invoke success callback.
 * Kept as a small orchestration utility to reduce duplication in the hook while keeping behavior stable.
 *
 * @param {(conn:any, data:any)=>any} safeSend
 * @param {any} connLike
 * @param {Object} options
 * @param {string} options.peerId - local peer id
 * @param {boolean} options.localUseEncryption - local preference
 * @param {boolean} options.incomingUseEncryption - remote preference from request
 * @param {{ setBool?: (k:string, v:boolean)=>void }} [options.storage]
 * @param {(v:boolean)=>void} [options.setStoreFinalUseEncryption]
 * @param {(conn:any, remoteId:string, final:boolean)=>void} [options.onConnectionSuccess]
 * @param {string} [options.remotePeerId]
 * @returns {{ finalUseEncryption: boolean }}
 */
export function acceptIncomingConnectionFlow(
  safeSend,
  connLike,
  {
    peerId,
    localUseEncryption,
    incomingUseEncryption,
    storage,
    setStoreFinalUseEncryption,
    onConnectionSuccess,
    remotePeerId,
  }
) {
  const finalUseEncryption = negotiateFinalUseEncryption(!!localUseEncryption, !!incomingUseEncryption);
  if (config?.isDevelopment) {
    try {
      console.log('[ConnectionService] 协商加密: local=', !!localUseEncryption, ' remote=', !!incomingUseEncryption, ' policy=', config?.security?.encryptionNegotiation, ' => final=', finalUseEncryption);
    } catch (_e) { /* noop */ }
  }
  // persist and store
  try { storage?.setBool?.('useEncryption', !!finalUseEncryption); } catch (_e) { /* noop */ }
  try { setStoreFinalUseEncryption?.(!!finalUseEncryption); } catch (_e) { /* noop */ }
  // send accepted envelope
  sendConnectionAccepted(safeSend, connLike, peerId, !!finalUseEncryption);
  // notify success
  try { onConnectionSuccess?.(connLike, remotePeerId, !!finalUseEncryption); } catch (_e) { /* noop */ }
  return { finalUseEncryption: !!finalUseEncryption };
}

/**
 * Start the outgoing connection request flow: send request and arm acceptance timeout.
 * Keeps orchestration in one place and returns the timeout id for cleanup.
 *
 * @param {(conn:any, data:any)=>any} safeSend
 * @param {any} connLike - underlying connection or transport.conn used by fallback path
 * @param {Object} options
 * @param {string} options.peerId - local peer id
 * @param {boolean} options.useEncryption - requested encryption flag
 * @param {()=>boolean} options.waitingForAcceptanceGetter - returns current waiting flag (avoids stale closure)
 * @param {(v:boolean)=>void} options.setWaitingForAcceptance
 * @param {(s:string)=>void} options.setConnectionStatus
 * @param {(msg:string)=>void} options.displayToast
 * @param {(ctx:any, getter:Function, ms:number)=>any} options.scheduleAcceptanceTimeout - injected scheduler util
 * @param {number} [options.timeoutMs=30000]
 * @returns {any} timeout id
 */
export function startConnectionRequestFlow(
  safeSend,
  connLike,
  {
    peerId,
    useEncryption,
    waitingForAcceptanceGetter,
    setWaitingForAcceptance,
    setConnectionStatus,
    displayToast,
    scheduleAcceptanceTimeout,
    timeoutMs = 30000,
  }
) {
  // 发送连接请求
  sendConnectionRequest(safeSend, connLike, peerId, !!useEncryption);

  // 安排超时（沿用既有的调度器实现，以保持行为一致）
  const timeoutId = scheduleAcceptanceTimeout(
    { setWaitingForAcceptance, setConnectionStatus, displayToast },
    waitingForAcceptanceGetter,
    timeoutMs,
  );
  return timeoutId;
}

/**
 * Handle incoming connection-related data (request/accepted/rejected).
 * Mirrors previous helper behavior while centralizing orchestration.
 *
 * @param {Object} ctx
 * @param {Function} ctx.setIncomingConnection
 * @param {Function} ctx.setIncomingPeerId
 * @param {Function} ctx.setIncomingUseEncryption
 * @param {Function} ctx.setShowConnectionRequest
 * @param {Function} ctx.setWaitingForAcceptance
 * @param {Function} ctx.setConnectionStatus
 * @param {{ setBool?: (k:string, v:boolean)=>void }} ctx.storage
 * @param {Function} ctx.setStoreFinalUseEncryption
 * @param {Function} ctx.onConnectionSuccess
 * @param {any} ctx.activeConnection
 * @param {string} ctx.targetId
 * @param {Function} ctx.displayToast
 * @param {any} data
 * @returns {{ handled: boolean, kind?: 'request'|'accepted'|'rejected' }}
 */
export function handleIncomingConnectionData(ctx, data) {
  const {
    setIncomingConnection,
    setIncomingPeerId,
    setIncomingUseEncryption,
    setShowConnectionRequest,
    setWaitingForAcceptance,
    setConnectionStatus,
    storage,
    setStoreFinalUseEncryption,
    onConnectionSuccess,
    activeConnection,
    targetId,
    displayToast,
  } = ctx || {};

  const isString = typeof data === 'string';
  let parsed = data;
  if (isString) {
    try {
      parsed = JSON.parse(data);
    } catch (_e) {
      return { handled: false };
    }
  }

  switch (parsed?.type) {
    case MessageTypes.ConnectionRequest: {
      const receivedEncryption = parsed.useEncryption !== undefined ? parsed.useEncryption : false;
      setIncomingConnection?.(activeConnection);
      setIncomingPeerId?.(parsed.peerId);
      setIncomingUseEncryption?.(receivedEncryption);
      setShowConnectionRequest?.(true);
      return { handled: true, kind: 'request' };
    }
    case MessageTypes.ConnectionAccepted: {
      setWaitingForAcceptance?.(false);
      setConnectionStatus?.('connected');
      const finalUseEncryption = !!parsed.useEncryption;
      try { storage?.setBool?.('useEncryption', finalUseEncryption); } catch (_e) { /* noop */ }
      try { setStoreFinalUseEncryption?.(finalUseEncryption); } catch (_e) { /* noop */ }
      try { onConnectionSuccess?.(activeConnection, targetId, finalUseEncryption); } catch (_e) { /* noop */ }
      return { handled: true, kind: 'accepted' };
    }
    case MessageTypes.ConnectionRejected: {
      setWaitingForAcceptance?.(false);
      setConnectionStatus?.('failed');
      try { displayToast?.('连接请求被拒绝'); } catch (_e) { /* noop */ }
      return { handled: true, kind: 'rejected' };
    }
    default:
      return { handled: false };
  }
}

export default {
  sendConnectionRequest,
  sendConnectionAccepted,
  sendConnectionRejected,
  negotiateFinalUseEncryption,
  acceptIncomingConnectionFlow,
  handleRemoteCloseFlow,
  handleRemoteErrorFlow,
  startConnectionRequestFlow,
  handleIncomingConnectionData,
};
