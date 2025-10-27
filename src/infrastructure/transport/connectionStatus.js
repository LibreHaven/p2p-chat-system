// Derive a normalized connection status from a PeerJS-like DataConnection
// Returns one of: 'connected' | 'connecting' | 'disconnected'
export function deriveConnectionStatus(conn) {
  if (!conn) return 'disconnected';
  try {
    if (conn.open === true) return 'connected';
    const ice = conn.peerConnection?.iceConnectionState;
    if (ice === 'connected') return 'connected';
    if (ice === 'failed' || ice === 'disconnected' || ice === 'closed') return 'disconnected';
  } catch (_) {
    // ignore
  }
  return 'connecting';
}

export default deriveConnectionStatus;
