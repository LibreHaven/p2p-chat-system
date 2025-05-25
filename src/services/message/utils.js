// 消息工具函数

export const serializeMessage = (message) => {
  try {
    return JSON.stringify(message);
  } catch (error) {
    console.error('Failed to serialize message:', error);
    return null;
  }
};

export const deserializeMessage = (messageString) => {
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
};

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}; 