import Peer from 'peerjs';

const SERVER_RETRY_DELAY = 1000;
const CONNECTION_TIMEOUT = 10000;

const isServerConnectivityError = (error) => {
  if (!error) return false;
  if (error.type === 'server-error' || error.type === 'socket-error') return true;
  const message = error.message || '';
  return (
    message.includes('Lost connection to server') ||
    message.includes('Could not connect to peer') ||
    message.includes('Could not connect to dispatch')
  );
};

const describeServer = (server) => {
  if (!server) return '未知服务器';
  if (server.useDefault) return server.name || 'PeerJS默认云服务';
  return `${server.name || '自定义服务器'} (${server.host || '未配置'})`;
};

const buildPeerOptions = (server, config) => {
  const baseOptions = {
    debug: config.peerConfig.debug,
    config: { iceServers: config.iceServers },
    pingInterval: config.peerConfig.pingInterval,
  };

  if (!server || server.useDefault) {
    return {
      ...baseOptions,
      secure: true,
    };
  }

  const customOptions = {
    ...baseOptions,
    host: server.host,
    port: server.port,
    path: server.path,
    secure: server.secure,
  };

  if (server.key) {
    customOptions.key = server.key;
  }

  return customOptions;
};

class PeerConnectionManager {
  constructor(config) {
    this.config = config;
    this.peer = null;
    this.connectionTimeoutId = null;
    this.resetInternalState();
  }

  resetInternalState() {
    this.serverIndex = 0;
    this.retryCount = 0;
    this.isRetrying = false;
    this.isReady = false;
  }

  destroyPeer() {
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (error) {
        console.warn('销毁Peer实例时发生错误:', error);
      }
      this.peer = null;
    }
  }

  clearConnectionTimeout() {
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }
  }

  scheduleConnectionTimeout(attempt, callbacks) {
    this.clearConnectionTimeout();
    this.connectionTimeoutId = setTimeout(() => {
      if (this.isReady || this.isRetrying) {
        return;
      }
      console.log(`连接${describeServer(this.config.peerServers[this.serverIndex])}超时，尝试下一个服务器`);
      try {
  this.tryNextServer(attempt, callbacks);
      } catch (error) {
        callbacks?.onError?.(error);
      }
    }, CONNECTION_TIMEOUT);
  }

  tryNextServer(attempt, callbacks) {
    if (this.isRetrying) return;
    this.isRetrying = true;
    this.serverIndex += 1;

    const exhausted = this.serverIndex >= this.config.peerServers.length;
    if (exhausted) {
      this.serverIndex = 0;
      this.retryCount += 1;

      if (this.retryCount >= this.config.peerConfig.maxRetries) {
        this.isRetrying = false;
        this.clearConnectionTimeout();
  const error = new Error('无法连接到PeerJS服务器，请检查网络连接');
  callbacks?.onError?.(error);
  throw error;
      }

      console.log(`第${this.retryCount}次重试，等待${this.config.peerConfig.retryDelay}ms后继续...`);
      setTimeout(() => {
        this.isRetrying = false;
        attempt();
      }, this.config.peerConfig.retryDelay);
      return;
    }

    setTimeout(() => {
      this.isRetrying = false;
      attempt();
    }, SERVER_RETRY_DELAY);
  }

  createPeer(id, callbacks = {}) {
    const attempt = () => {
      const server = this.config.peerServers[this.serverIndex];
      if (!server) {
        callbacks.onError?.(new Error('未配置可用的PeerJS服务器'));
        return;
      }

      console.log(`尝试连接到${describeServer(server)}`);

      this.destroyPeer();
      this.clearConnectionTimeout();
      this.isReady = false;

      try {
        const options = buildPeerOptions(server, this.config);
        console.log('构建PeerJS配置:', options);
        this.peer = new Peer(id, options);
        console.log('PeerJS实例配置:', this.peer?.options);
      } catch (error) {
        console.error(`创建${describeServer(server)}连接失败:`, error);
        this.tryNextServer(attempt, callbacks);
        return;
      }

      this.scheduleConnectionTimeout(attempt, callbacks);

      this.peer.on('open', (peerId) => {
        this.clearConnectionTimeout();
        this.isReady = true;
        this.isRetrying = false;
        this.retryCount = 0;
        this.serverIndex = 0;
        console.log(`成功连接到${describeServer(server)}，Peer ID:`, peerId);
        callbacks.onOpen?.(peerId);
      });

      this.peer.on('error', (error) => {
        this.clearConnectionTimeout();
        console.error(`${describeServer(server)}连接错误:`, error);
        if (isServerConnectivityError(error)) {
          try {
            this.tryNextServer(attempt, callbacks);
          } catch (fatalError) {
            callbacks.onError?.(fatalError);
          }
        } else {
          callbacks.onError?.(error);
        }
      });

      this.peer.on('connection', (conn) => {
        callbacks.onConnection?.(conn);
      });
    };

    try {
      attempt();
    } catch (error) {
      callbacks.onError?.(error);
    }

    return this.peer;
  }

  resetConnectionState() {
    this.resetInternalState();
    this.clearConnectionTimeout();
  }
}

export default PeerConnectionManager;
