// PeerConnectionTransport - wraps an existing PeerJS DataConnection as ITransport-like emitter
// Used for incoming connection path to unify event wiring without changing external behavior.

import peerService from '../../services/peerService';
import deriveConnectionStatus from './connectionStatus';

class PeerConnectionTransport {
  constructor(conn) {
    this.conn = conn;
    this.listeners = new Map(); // event -> Set<fn>
    this._bindUnderlying();
  }

  _bindUnderlying() {
    if (!this.conn) return;
    this.conn.on('open', () => this._emit('open'));
    this.conn.on('data', (data) => this._emit('message', data));
    this.conn.on('close', () => this._emit('close'));
    this.conn.on('error', (err) => this._emit('error', err));
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event);
    set.add(handler);
    return () => set.delete(handler);
  }

  async send(data) {
    try {
      return peerService.sendMessageSafely(this.conn, data);
    } catch (e) {
      this._emit('error', e);
      return false;
    }
  }

  status() {
    return deriveConnectionStatus(this.conn);
  }

  // statusFast provides a lightweight status check without calling peerService,
  // relying on the underlying PeerJS DataConnection shape. This is additive and
  // used for diagnostics/telemetry without altering existing behavior.
  statusFast() {
    if (!this.conn) return 'disconnected';
    // PeerJS DataConnection has .open boolean when ready
    try {
      if (this.conn.open === true) return 'open';
      // Some impls expose .readyState similar to WebSocket
      if (typeof this.conn.readyState === 'string') return this.conn.readyState;
    } catch (e) {
      // ignore
    }
    return 'connecting';
  }

  _emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn) => {
      try { fn(payload); } catch (e) { console.error('PeerConnectionTransport listener error', e); }
    });
  }
}

export default PeerConnectionTransport;
