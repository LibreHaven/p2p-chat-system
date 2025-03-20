import Peer from 'peerjs';

// PeerJS 连接服务
const peerService = {
  // 初始化 PeerJS 连接
  initializePeer: (peerId) => {
    // 使用用户提供的 ID 初始化 PeerJS
    // 使用默认的 PeerJS 云服务器，不指定 host
    const peer = new Peer(peerId, {
      // 配置 STUN 服务器用于 NAT 穿透
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      },
      debug: 3 // 调试级别
    });

    return peer;
  },

  // 监听连接事件
  setupConnectionListeners: (peer, callbacks) => {
    // 连接成功打开时
    peer.on('open', (id) => {
      if (callbacks.onOpen) callbacks.onOpen(id);
    });

    // 连接错误时
    peer.on('error', (err) => {
      if (callbacks.onError) callbacks.onError(err);
    });

    // 断开连接时
    peer.on('disconnected', () => {
      if (callbacks.onDisconnected) callbacks.onDisconnected();
    });

    // 关闭连接时
    peer.on('close', () => {
      if (callbacks.onClose) callbacks.onClose();
    });

    // 收到连接请求时
    peer.on('connection', (conn) => {
      if (callbacks.onConnection) callbacks.onConnection(conn);
    });
  },

  // 连接到目标 Peer
  connectToPeer: (peer, targetId, callbacks) => {
    // 创建数据连接
    const conn = peer.connect(targetId, {
      reliable: true // 确保可靠的数据传输
    });

    // 设置连接监听器
    setupDataConnectionListeners(conn, callbacks);

    return conn;
  },

  // 设置数据连接监听器
  setupDataConnectionListeners: (conn, callbacks) => {
    // 连接打开时
    conn.on('open', () => {
      if (callbacks.onOpen) callbacks.onOpen(conn);
    });

    // 接收数据时
    conn.on('data', (data) => {
      if (callbacks.onData) callbacks.onData(data);
    });

    // 连接关闭时
    conn.on('close', () => {
      if (callbacks.onClose) callbacks.onClose();
    });

    // 连接错误时
    conn.on('error', (err) => {
      if (callbacks.onError) callbacks.onError(err);
    });
  }
};

// 导出 PeerJS 连接服务
export const setupDataConnectionListeners = peerService.setupDataConnectionListeners;
export default peerService;
