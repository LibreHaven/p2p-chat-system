// 通用工具函数
export const utils = {
  // 生成唯一ID
  generateId: () => {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  },

  // 格式化文件大小
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 格式化时间
  formatTime: (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // 验证文件类型
  isValidFileType: (file, allowedTypes = []) => {
    if (allowedTypes.length === 0) return true;
    return allowedTypes.some(type => file.type.startsWith(type));
  },

  // 防抖函数
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // 深拷贝
  deepClone: (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => utils.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          clonedObj[key] = utils.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }
};

export default utils;