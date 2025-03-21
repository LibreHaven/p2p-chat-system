// 消息服务
const messageService = {
  // 创建消息对象
  createMessage: (text, sender, timestamp = Date.now()) => {
    return {
      text,
      sender,
      timestamp
    };
  },

  // 序列化消息对象为JSON字符串
  serializeMessage: (message) => {
    try {
      return JSON.stringify(message);
    } catch (error) {
      console.error('Failed to serialize message:', error);
      return null;
    }
  },

  // 从JSON字符串解析消息对象
  deserializeMessage: (messageString) => {
    try {
      if (!messageString) {
        console.error('Cannot deserialize empty message');
        return null;
      }
      return JSON.parse(messageString);
    } catch (error) {
      console.error('Failed to parse message:', error);
      return null;
    }
  }
};

export default messageService;
