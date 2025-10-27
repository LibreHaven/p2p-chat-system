import config from '../config';
import PeerConnectionManager from './peer/PeerConnectionManager';
// Note: File sending/receiving and message routing are now handled by
// application/services (FileService, FileReceiveService, MessageRouter usage)
// and session-level hooks. PeerService remains a thin compatibility layer for
// creating peers, connecting, and safe message sending.

class PeerService {
  constructor() {
    this.connectionManager = new PeerConnectionManager(config);
    this.connection = null;
  }

  get peer() {
    return this.connectionManager.peer;
  }

  createPeer(id, callbacks = {}) {
    return this.connectionManager.createPeer(id, callbacks);
  }

  resetConnectionState() {
    this.connectionManager.resetConnectionState();
  }

  connectToPeer(peer, targetId, onOpen, onData, onClose, onError) {
    const activePeer = peer || this.peer;
    if (!activePeer) {
      const error = new Error('Peer未初始化');
      onError?.(error);
      return null;
    }

    try {
      this.connection = activePeer.connect(targetId, {
        reliable: true,
        serialization: 'binary',
      });
    } catch (error) {
      console.error('连接到Peer失败:', error);
      onError?.(error);
      return null;
    }

    this.connection.on('open', () => {
      this.flushPendingMessages();
      onOpen?.(this.connection);
    });

    this.connection.on('data', (data) => {
      onData?.(data);
    });

    this.connection.on('close', () => {
      this.connection = null;
      onClose?.();
    });

    this.connection.on('error', (error) => {
      console.error('连接错误:', error);
      onError?.(error);
    });

    return this.connection;
  }

  setupDataConnectionListeners(conn, callbacks = {}) {
    if (!conn) return;

    if (conn.removeListener) {
      conn.removeListener('open');
      conn.removeListener('data');
      conn.removeListener('close');
      conn.removeListener('error');
    }

    conn.on('open', () => callbacks.onOpen?.(conn));
    conn.on('data', (data) => callbacks.onData?.(data));
    conn.on('close', () => callbacks.onClose?.());
    conn.on('error', (error) => callbacks.onError?.(error));
  }

  sendMessageSafely(connection, message) {
    if (!connection) {
      console.error('发送消息失败: 连接不存在');
      return false;
    }

    let payload = message;
    if (
      typeof message === 'object' &&
      !(message instanceof ArrayBuffer) &&
      !(message instanceof Uint8Array)
    ) {
      payload = JSON.stringify(message);
    }

    try {
      if (connection.open) {
        connection.send(payload);
        return true;
      }

      if (!connection.pendingMessages) {
        connection.pendingMessages = [];
      }
      connection.pendingMessages.push(payload);
      return false;
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    }
  }

  flushPendingMessages() {
    if (!this.connection?.pendingMessages?.length) {
      return;
    }

    const messages = [...this.connection.pendingMessages];
    this.connection.pendingMessages = [];

    messages.forEach((payload) => {
      try {
        this.connection.send(payload);
      } catch (error) {
        console.error('发送待发送消息失败:', error);
        this.connection.pendingMessages.push(payload);
      }
    });
  }

  // File and message routing responsibilities have moved to application layer.
}

const peerServiceInstance = new PeerService();

export const generateRandomId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const setupConnectionListeners = (peer, callbacks = {}) => {
  if (!peer) return;

  peer.removeAllListeners?.('open');
  peer.removeAllListeners?.('connection');
  peer.removeAllListeners?.('error');
  peer.removeAllListeners?.('disconnected');
  peer.removeAllListeners?.('close');

  peer.on('open', (id) => callbacks.onOpen?.(id));
  peer.on('connection', (conn) => callbacks.onConnection?.(conn));
  peer.on('error', (error) => callbacks.onError?.(error));
  peer.on('disconnected', () => {
    console.log('Peer 连接已断开，尝试重新连接...');
    try {
      peer.reconnect();
    } catch (error) {
      console.error('重新连接失败:', error);
    }
    callbacks.onDisconnected?.();
  });
  peer.on('close', () => callbacks.onClose?.());
};

export const connectToPeer = (peer, targetId) =>
  peerServiceInstance.connectToPeer(peer, targetId);

export const setupDataConnectionListeners = (conn, callbacks = {}) =>
  peerServiceInstance.setupDataConnectionListeners(conn, callbacks);

/**
 * @deprecated Prefer reading status from ITransport.status() or directly from the
 * underlying DataConnection (conn.open / conn.peerConnection.iceConnectionState).
 * This helper remains for backward compatibility and may be removed in future refactors.
 */

export const reestablishConnection = (peer, targetId, callbacks = {}) => {
  if (!peer) {
    callbacks.onError?.(new Error('Peer未初始化'));
    return null;
  }

  return peerServiceInstance.connectToPeer(
    peer,
    targetId,
    callbacks.onOpen,
    callbacks.onData,
    callbacks.onClose,
    callbacks.onError,
  );
};

const peerService = {
  generateRandomId,
  createPeer: (id, callbacks) => peerServiceInstance.createPeer(id, callbacks),
  resetConnectionState: () => peerServiceInstance.resetConnectionState(),
  connectToPeer: (...args) => peerServiceInstance.connectToPeer(...args),
  setupDataConnectionListeners,
  sendMessageSafely: (connection, message) => peerServiceInstance.sendMessageSafely(connection, message),
  reestablishConnection,
  setupConnectionListeners,
};

export default peerService;
