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
    // 连接超时设置
    pingInterval: 5000,
    // 重试配置
    maxRetries: 3,
    retryDelay: 2000
  }
};

export default config;