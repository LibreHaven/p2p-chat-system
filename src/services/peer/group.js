// 群组管理与群聊核心逻辑
// 导出群组相关数据结构和方法，供PeerService主类调用

export const groupState = {
  groups: {},
  groupConnections: {},
  groupMessages: {},
  pendingGroupInvites: {},
  groupFileTransfers: {},
  processedGroupMessages: {},
  keyUpdateStatus: {},
  groupMonitoringIntervals: {},
  groupHeartbeatIntervals: {}
};

// 创建群组
export async function createGroup(peerService, groupName, groupType, settings = {}) {
  const groupId = peerService.fileUtils.generateUUID();
  const group = {
    id: groupId,
    name: groupName,
    type: groupType,
    createdAt: Date.now(),
    owner: peerService.peer.id,
    admins: [],
    members: [{
      peerId: peerService.peer.id,
      joinedAt: Date.now(),
      role: "owner",
      isSuperNode: true,
      displayName: "我"
    }],
    keyVersion: 1,
    settings: {
      allowFiles: settings.allowFiles !== false,
      encryptionEnabled: settings.encryptionEnabled !== false,
      joinMode: settings.joinMode || "invite_only"
    }
  };
  if (group.settings.encryptionEnabled) {
    await peerService.encryptionService.generateGroupSharedKey(groupId);
  }
  groupState.groups[groupId] = group;
  groupState.groupMessages[groupId] = [];
  saveGroupsToStorage();
  return group;
}

// 邀请成员加入群组
export async function inviteMemberToGroup(peerService, groupId, targetPeerId) {
  const group = groupState.groups[groupId];
  if (!group) throw new Error("群组不存在");
  const currentMember = group.members.find(m => m.peerId === peerService.peer.id);
  if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
    throw new Error("只有群主或管理员可以邀请新成员");
  }
  if (group.members.some(m => m.peerId === targetPeerId)) {
    throw new Error("该用户已经是群组成员");
  }
  try {
    const connection = await peerService.connectToPeer(targetPeerId);
    const invitation = {
      type: "group-invite",
      groupId: groupId,
      groupName: group.name,
      groupType: group.type,
      inviter: peerService.peer.id,
      inviterRole: currentMember.role,
      timestamp: Date.now()
    };
    await peerService.sendMessageSafely(connection, invitation);
    groupState.pendingGroupInvites[groupId + "-" + targetPeerId] = {
      connection,
      timestamp: Date.now()
    };
    return true;
  } catch (error) {
    console.error(`邀请成员 ${targetPeerId} 加入群组失败:`, error);
    throw error;
  }
}

// 处理成员接受群组邀请
export async function handleGroupInviteAccepted(peerService, groupId, memberId, connection) {
  const group = groupState.groups[groupId];
  if (!group) throw new Error("群组不存在");

  // 添加新成员到群组
  const newMember = {
    peerId: memberId,
    joinedAt: Date.now(),
    role: "member",
    isSuperNode: false,
    displayName: memberId.substring(0, 8) // 后续可以允许设置昵称
  };

  group.members.push(newMember);

  // 如果启用了加密，发送群组密钥
  if (group.settings.encryptionEnabled) {
    try {
      await distributeGroupKey(peerService, groupId, memberId, connection);
    } catch (error) {
      console.error(`向新成员 ${memberId} 分发群组密钥失败:`, error);
    }
  }

  // 保存群组更新
  saveGroupsToStorage();

  // 发送成员列表和配置
  const groupConfig = {
    type: "group-config",
    groupId,
    groupData: {
      id: group.id,
      name: group.name,
      type: group.type,
      owner: group.owner,
      admins: group.admins,
      members: group.members,
      keyVersion: group.keyVersion,
      settings: group.settings
    },
    timestamp: Date.now()
  };

  await peerService.sendMessageSafely(connection, groupConfig);

  // 广播新成员加入通知
  broadcastGroupUpdate(peerService, groupId, {
    type: "group-member-joined",
    groupId,
    peerId: memberId,
    timestamp: Date.now()
  });

  // 添加系统消息到群聊历史
  addGroupSystemMessage(peerService, groupId, 'member_joined', {
    memberId,
    memberName: newMember.displayName
  });

  // 建立与新成员的连接
  // peerService.establishGroupConnectionsForMember(groupId, memberId);

  return true;
}

// 为群组密钥分发
export async function distributeGroupKey(peerService, groupId, targetPeerId, connection) {
  const groupKey = peerService.encryptionService.groupKeys[groupId];
  if (!groupKey) throw new Error("找不到群组密钥");

  // 先与目标建立p2p加密
  const keyExchangeMessage = {
    type: "group-key-exchange-init",
    groupId
  };

  await peerService.sendMessageSafely(connection, keyExchangeMessage);

  // 实际实现中需要等待对方响应并建立加密通道
  // 这里简化处理，假设加密通道已建立

  // 使用加密通道发送群组密钥
  const groupKeyMessage = {
    type: "group-key-distribution",
    groupId,
    keyData: groupKey.keyBase64,
    keyVersion: groupKey.version
  };

  await peerService.sendMessageSafely(connection, groupKeyMessage);

  return true;
}

// 添加群组系统消息
export function addGroupSystemMessage(peerService, groupId, action, metadata = {}) {
  const systemMessage = peerService.messageService.createGroupMessage(
    "",
    groupId,
    "system",
    {
      systemAction: action,
      ...metadata
    },
    "system"
  );

  if (!groupState.groupMessages[groupId]) {
    groupState.groupMessages[groupId] = [];
  }

  groupState.groupMessages[groupId].push(systemMessage);

  return systemMessage;
}

// 广播群组更新
export async function broadcastGroupUpdate(peerService, groupId, message) {
  const group = groupState.groups[groupId];
  if (!group) return;

  // 简化版本，后续需要完善为按照网络拓扑的实现
  const connections = {};

  // 获取所有已连接的群组成员
  for (const member of group.members) {
    if (member.peerId !== peerService.peer.id) {
      const conn = getPeerConnection(peerService, member.peerId);
      if (conn) {
        connections[member.peerId] = conn;
      } else {
        // TODO: handle disconnected members
      }
    }
  }

  // 广播消息
  for (const [peerId, connection] of Object.entries(connections)) {
    try {
      await peerService.sendMessageSafely(connection, message);
    } catch (error) {
      console.error(`向群组成员 ${peerId} 广播更新失败:`, error);
      // TODO: handle send message failure (retry, notify, etc.)
    }
  }

  return true;
}

// 获取单个Peer连接（可根据实际连接池实现）
export function getPeerConnection(peerService, peerId) {
  // 这里可根据peerService的连接池实现获取
  // 假设peerService有一个connections map
  return peerService.connections ? peerService.connections[peerId] : null; // 暂时返回null，后续完善
}

// 建立与新成员的连接（需要在收到群组成员列表和密钥后调用）
export function establishGroupConnectionsForMember(peerService, groupId, memberId) {
  console.log(`建立与群组 ${groupId} 成员 ${memberId} 的连接 (待实现)`);
  // TODO: Implement logic to connect to new member
}

// 发送群聊消息
export async function sendGroupMessage(peerService, groupId, message) {
  console.log(`发送群组消息到群组 ${groupId} (待实现):`, message);
  // TODO: Implement logic to send message to all connected group members
  // Should handle encryption if enabled
}

// 处理接收到的群聊消息
export async function handleGroupMessage(peerService, groupId, message) {
  console.log(`处理接收到的群组消息 for group ${groupId} (待实现):`, message);
  // TODO: Implement logic to decrypt (if needed) and process group message
  // Should add to groupState.groupMessages
}

// 移除群组成员
export function removeMember(peerService, groupId, memberId) {
  console.log(`从群组 ${groupId} 移除成员 ${memberId} (待实现)`);
  // TODO: Implement logic to remove member and notify others
}

// 设置/取消管理员权限
export function setGroupAdmin(peerService, groupId, memberId, isAdmin) {
  console.log(`在群组 ${groupId} 中设置成员 ${memberId} 管理员权限为 ${isAdmin} (待实现)`);
  // TODO: Implement logic to set/unset admin role and notify others
}

// 设置/取消超级节点权限
export function setSuperNode(peerService, groupId, memberId, isSuperNode) {
  console.log(`在群组 ${groupId} 中设置成员 ${memberId} 超级节点权限为 ${isSuperNode} (待实现)`);
  // TODO: Implement logic to set/unset supernode role and notify others
}

// 更新群组密钥 (仅群主操作)
export async function updateGroupKey(peerService, groupId) {
  console.log(`更新群组 ${groupId} 密钥 (待实现)`);
  // TODO: Implement logic to generate new key, distribute to members, and update group state
}

// 解散群组 (仅群主操作)
export function disbandGroup(peerService, groupId) {
  console.log(`解散群组 ${groupId} (待实现)`);
  // TODO: Implement logic to remove group, notify members, and clear data
}

// 处理加入群组请求
export function handleJoinGroupRequest(peerService, requestId, requesterId, groupId) {
  console.log(`收到加入群组 ${groupId} 的请求来自 ${requesterId} (待实现)`);
  // TODO: Implement logic to show request to owner/admins
}

// 接受加入群组请求
export async function acceptJoinGroupRequest(peerService, requestId) {
  console.log(`接受加入群组请求 ${requestId} (待实现)`);
  // TODO: Implement logic to add member and notify
}

// 拒绝加入群组请求
export function rejectJoinGroupRequest(peerService, requestId) {
  console.log(`拒绝加入群组请求 ${requestId} (待实现)`);
  // TODO: Implement logic to notify requester
}

// 成员主动离开群组
export function leaveGroup(peerService, groupId) {
  console.log(`成员离开群组 ${groupId} (待实现)`);
  // TODO: Implement logic to remove member and notify others
}

function saveGroupsToStorage() {
  try {
    const groupsData = {};
    for (const [groupId, group] of Object.entries(groupState.groups)) {
      groupsData[groupId] = {
        id: group.id,
        name: group.name,
        type: group.type,
        createdAt: group.createdAt,
        owner: group.owner,
        admins: group.admins,
        members: group.members,
        keyVersion: group.keyVersion,
        settings: group.settings
      };
    }
    localStorage.setItem('p2p_groups', JSON.stringify(groupsData));
  } catch (error) {
    console.error('保存群组信息失败:', error);
  }
}

export function loadGroupsFromStorage() {
  try {
    const groupsData = localStorage.getItem('p2p_groups');
    if (groupsData) {
      groupState.groups = JSON.parse(groupsData);
      return groupState.groups;
    }
  } catch (error) {
    console.error('加载群组信息失败:', error);
  }
  return null;
} 