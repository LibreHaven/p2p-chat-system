// 消息服务
const messageServiceObj = {
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
  },

  // 创建群聊消息
  createGroupMessage: (content, groupId, type = "text", metadata = {}, sender = null) => {
    // 如果没有指定发送者，使用peerService中的peerId
    const actualSender = sender || window.peerInstance?.peerId;
    
    return {
      id: messageServiceObj.generateUUID(),
      type,
      content,
      groupId,
      sender: actualSender,
      timestamp: Date.now(),
      metadata
    };
  },

  // 生成UUID
  generateUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // 格式化系统消息
  formatSystemMessage: (message) => {
    const { metadata } = message;
    
    switch (metadata.systemAction) {
      case 'member_joined':
        return `${metadata.memberName || metadata.memberId} 加入了群聊`;
      case 'member_left':
        return `${metadata.memberName || metadata.memberId} 离开了群聊`;
      case 'member_removed':
        return `${metadata.memberName || metadata.memberId} 被 ${metadata.actorName || metadata.actorId} 移出群聊`;
      case 'role_changed':
        return `${metadata.memberName || metadata.memberId} 被 ${metadata.actorName || metadata.actorId} 设为${metadata.newRole === 'admin' ? '管理员' : '普通成员'}`;
      case 'supernode_changed':
        return `${metadata.memberName || metadata.memberId} ${metadata.isSuperNode ? '成为' : '不再是'}超级节点`;
      case 'encryption_changed':
        return `群聊加密已${metadata.encryptionEnabled ? '启用' : '禁用'}`;
      case 'key_updated':
        return `群聊加密密钥已更新 (v${metadata.keyVersion})`;
      case 'group_disbanded':
        return `群主解散了群聊`;
      default:
        return message.content || '系统消息';
    }
  }
};

// 同时提供默认导出和命名导出
export default messageServiceObj;
export const messageService = messageServiceObj;
