// PeerTransport - thin adapter to the existing peerService facade
// Note: This is a non-invasive adapter. We do not wire it yet to avoid risky changes.
// It demonstrates how the ITransport contract can be satisfied via the current PeerJS layer.

import peerService from '../../services/peerService';
import deriveConnectionStatus from './connectionStatus';

class PeerTransport {
  constructor() {
    this.conn = null;
    this.listeners = new Map();
  }

  async connect(targetId) {
    return new Promise((resolve, reject) => {
      try {
        const peer = peerService.peer;
        this.conn = peerService.connectToPeer(peer, targetId,
          () => {
            resolve();
            this._emit('open');
          },
          (data) => this._emit('message', data),
          () => this._emit('close'),
          (err) => this._emit('error', err)
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  async disconnect() {
    try {
      if (this.conn?.close) this.conn.close();
      this.conn = null;
      this._emit('close');
    } catch (e) {
      this._emit('error', e);
    }
  }

  async send(data) {
    try {
      return peerService.sendMessageSafely(this.conn, data);
    } catch (e) {
      this._emit('error', e);
      return false;
    }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event);
    set.add(handler);
    return () => set.delete(handler);
  }

  status() {
    return deriveConnectionStatus(this.conn);
  }

  _emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn) => {
      try { fn(payload); } catch (e) { console.error('PeerTransport listener error', e); }
    });
  }
}

export default PeerTransport;
