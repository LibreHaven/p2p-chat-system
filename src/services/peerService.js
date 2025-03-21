import Peer from 'peerjs';

// 生成随机ID
const generateRandomId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 初始化 Peer 连接
const initializePeer = (id) => {
  try {
    // 使用指定的ID创建Peer对象
    const peer = new Peer(id, {
      debug: 2, // 调试级别
      config: {
        'iceServers': [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });
    
    return peer;
  } catch (error) {
    console.error('初始化Peer失败:', error);
    return null;
  }
};

// 设置 Peer 连接监听器
const setupConnectionListeners = (peer, callbacks = {}) => {
  if (!peer) return;
  
  // 移除所有现有监听器，防止重复绑定
  peer.removeAllListeners('open');
  peer.removeAllListeners('connection');
  peer.removeAllListeners('error');
  peer.removeAllListeners('disconnected');
  peer.removeAllListeners('close');
  
  // 连接打开时的回调
  peer.on('open', (id) => {
    if (callbacks.onOpen) callbacks.onOpen(id);
  });
  
  // 收到连接请求时的回调
  peer.on('connection', (conn) => {
    if (callbacks.onConnection) callbacks.onConnection(conn);
  });
  
  // 发生错误时的回调
  peer.on('error', (err) => {
    if (callbacks.onError) callbacks.onError(err);
  });
  
  // 连接断开时的回调
  peer.on('disconnected', () => {
    console.log('Peer连接已断开，尝试重新连接...');
    
    // 尝试重新连接
    try {
      peer.reconnect();
    } catch (error) {
      console.error('重新连接失败:', error);
    }
    
    if (callbacks.onDisconnected) callbacks.onDisconnected();
  });
  
  // 连接关闭时的回调
  peer.on('close', () => {
    if (callbacks.onClose) callbacks.onClose();
  });
};

// 连接到目标 Peer
const connectToPeer = (peer, targetId) => {
  if (!peer) return null;
  
  try {
    // 连接到目标Peer，设置可靠性选项
    const conn = peer.connect(targetId, {
      reliable: true,
      serialization: 'json',
      metadata: {
        type: 'chat-connection',
        timestamp: Date.now()
      }
    });
    
    return conn;
  } catch (error) {
    console.error('连接到目标Peer失败:', error);
    return null;
  }
};

// 设置数据连接监听器
const setupDataConnectionListeners = (conn, callbacks = {}) => {
  if (!conn) return;
  
  // 移除所有现有监听器，防止重复绑定
  conn.removeAllListeners('open');
  conn.removeAllListeners('data');
  conn.removeAllListeners('close');
  conn.removeAllListeners('error');
  
  // 连接打开时的回调
  conn.on('open', () => {
    console.log('数据连接已打开，连接到:', conn.peer);
    if (callbacks.onOpen) callbacks.onOpen();
  });
  
  // 收到数据时的回调
  conn.on('data', (data) => {
    console.log('收到来自', conn.peer, '的数据');
    if (callbacks.onData) callbacks.onData(data);
  });
  
  // 连接关闭时的回调
  conn.on('close', () => {
    console.log('数据连接已关闭');
    if (callbacks.onClose) callbacks.onClose();
  });
  
  // 发生错误时的回调
  conn.on('error', (err) => {
    console.error('数据连接错误:', err);
    if (callbacks.onError) callbacks.onError(err);
  });
};

// 检查连接状态
const checkConnectionStatus = (conn) => {
  if (!conn) {
    return 'disconnected';
  }
  
  try {
    // 尝试发送一个心跳消息来检查连接
    conn.send({
      type: 'heartbeat',
      timestamp: Date.now()
    });
    return 'connected';
  } catch (error) {
    console.error('连接状态检查失败:', error);
    return 'error';
  }
};

// 重新建立连接
const reestablishConnection = (peer, targetId, callbacks = {}) => {
  if (!peer || !targetId) {
    return null;
  }
  
  console.log('尝试重新建立连接到:', targetId);
  
  try {
    // 连接到目标Peer
    const conn = connectToPeer(peer, targetId);
    
    // 设置数据连接监听器
    setupDataConnectionListeners(conn, callbacks);
    
    return conn;
  } catch (error) {
    console.error('重新建立连接失败:', error);
    return null;
  }
};

// 导出服务
const peerService = {
  generateRandomId,
  initializePeer,
  setupConnectionListeners,
  connectToPeer,
  setupDataConnectionListeners,
  checkConnectionStatus,
  reestablishConnection
};

export default peerService;
