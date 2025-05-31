import { APP_CONSTANTS } from './constants';

export const validation = {
  // 验证Peer ID格式
  isValidPeerId: (id) => {
    return typeof id === 'string' && id.length >= 3 && id.length <= 50 && /^[a-zA-Z0-9-_]+$/.test(id);
  },

  // 验证文件大小
  isValidFileSize: (size) => {
    return typeof size === 'number' && size > 0 && size <= APP_CONSTANTS.MAX_FILE_SIZE;
  },

  // 验证消息内容
  isValidMessage: (message) => {
    return message && typeof message.text === 'string' && message.text.trim().length > 0;
  }
};

export default validation;