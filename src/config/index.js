// 配置文件
export const config = {
  // STUN服务器配置
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  
  // 开发模式配置
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // PeerJS服务器配置（按优先级排序）
  peerServers: [
    {
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
      name: 'PeerJS官方服务器'
    },
    {
      host: 'peerjs-server.herokuapp.com',
      port: 443,
      path: '/peerjs',
      secure: true,
      name: 'Heroku备用服务器'
    }
  ],
  
  // PeerJS配置
  peerConfig: {
    debug: process.env.NODE_ENV === 'development' ? 2 : 0,
    // 心跳与超时（可被 Hook 使用）
    pingInterval: 10000, // 心跳发送间隔（ms）
    heartbeatTimeout: 30000, // 心跳超时（ms）
    // 重试配置（连接层）
    maxRetries: 3,
    retryDelay: 2000,
    // 重连退避参数（会话层）
    reconnectBackoff: {
      baseMs: 1000,
      factor: 2,
      maxMs: 30000,
    },
  },

  // 功能灰度开关（便于逐步接入与回退）
  features: {
    // 文件发送在服务层编排（默认开启，可回退）
    fileSendOrchestrated: true,
    // 文件接收服务化（默认开启，可回退）
    fileReceiveService: true,
  },

  // 安全与协商策略
  security: {
    // 加密协商策略：
    // - 'both'  : 只有双方都勾选才启用（当前默认，保持兼容）
    // - 'either': 任意一方勾选即启用（更贴合“我开启就希望加密”的直觉）
    encryptionNegotiation: 'both',
  }
};

export default config;