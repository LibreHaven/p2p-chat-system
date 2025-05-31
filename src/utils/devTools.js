// 开发工具
export const devTools = {
  // 连接状态监控
  logConnectionState: (state) => {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔗 Connection State Change');
      console.log('New State:', state);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  },

  // 消息流监控
  logMessage: (message, direction) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📨 ${direction === 'sent' ? '发送' : '接收'} 消息:`, message);
    }
  }
};

export default devTools;