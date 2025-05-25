// 消息类型和结构相关

export const createMessage = (text, sender, timestamp = Date.now()) => ({
  text,
  sender,
  timestamp
});

export const createGroupMessage = (content, groupId, type = "text", metadata = {}, sender = null, generateUUID) => {
  const actualSender = sender || (window.peerInstance?.peerId);
  return {
    id: generateUUID ? generateUUID() : undefined,
    type,
    content,
    groupId,
    sender: actualSender,
    timestamp: Date.now(),
    metadata
  };
};

export const formatSystemMessage = (message) => {
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
}; 