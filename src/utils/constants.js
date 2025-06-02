// 应用常量
export const APP_CONSTANTS = {
  // 文件传输
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  CHUNK_SIZE: 16 * 1024, // 16KB
  SUPPORTED_FILE_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENT: ['application/pdf', 'text/plain', 'application/msword'],
    ARCHIVE: ['application/zip', 'application/x-rar-compressed']
  },

  // 连接状态
  CONNECTION_STATUS: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    FAILED: 'failed'
  },

  // 消息类型
  MESSAGE_TYPES: {
    TEXT: 'text',
    FILE: 'file',
    SYSTEM: 'system',
    ENCRYPTION_HANDSHAKE: 'encryption-handshake'
  },

  // 错误代码
  ERROR_CODES: {
    PEER_ID_TAKEN: 'PEER_ID_TAKEN',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE'
  }
};

export default APP_CONSTANTS;