# P2P群聊系统详细设计方案

## 目录

1. [概述](#1-概述)
2. [架构设计](#2-架构设计)
3. [数据结构](#3-数据结构)
4. [功能模块](#4-功能模块)
5. [消息协议](#5-消息协议)
6. [界面设计](#6-界面设计)
7. [实现步骤](#7-实现步骤)
8. [测试策略](#8-测试策略)

## 1. 概述

### 1.1 设计目标

基于现有P2P聊天系统扩展群聊功能，支持多用户间安全、高效的实时通信。群聊仍然采用纯P2P架构，不依赖中央服务器存储和传输消息。

### 1.2 群聊模式

基于网络拓扑和连接管理的复杂性，系统支持两种群聊模式：

- **小群聊模式**：最多支持20人，采用全Mesh网络拓扑（每个成员与所有其他成员直接建立连接）
- **大群聊模式**：最多支持200人，采用混合网络拓扑（普通成员只与指定的"超级节点"连接，超级节点之间形成Mesh网络）

### 1.3 核心功能

- 创建和加入群聊
- 管理群聊成员（添加、移除）
- 角色和权限管理（群主、管理员、普通成员）
- 群聊消息的端到端加密
- 消息广播和接收确认
- 群聊状态同步
- 在线状态监控
- 群聊内的文件共享

## 2. 架构设计

### 2.1 网络拓扑

#### 2.1.1 小群聊（全Mesh）

每个成员与群内所有其他成员建立直接连接，形成完全图结构。每个节点直接向所有其他节点广播消息。

**优点**：
- 低延迟（一跳即达）
- 实现简单

**缺点**：
- 连接数量随节点数呈二次增长 (n(n-1)/2)
- 不适合大规模群组

适用场景：家庭群、小团队（≤20人）

#### 2.1.2 大群聊（混合拓扑）

- **超级节点**：由群主指定（通常3-5个），这些节点之间形成完全连接的Mesh网络
- **普通节点**：每个普通节点连接到至少2个超级节点，不与其他普通节点直接连接
- 消息路由：普通节点 → 超级节点 → 其他超级节点 → 所有连接的普通节点

**优点**：
- 连接数量大幅减少（适合大群组）
- 消息传播效率较高（最多两跳）

**缺点**：
- 超级节点负载较大
- 存在单点故障风险（可通过冗余连接缓解）

适用场景：社区群、课程群（≤200人）

### 2.2 系统组件扩展

现有系统组件需要进行以下扩展：

#### 2.2.1 连接管理（peerService.js）

- 支持多连接管理（区分单聊和群聊连接）
- 群组成员探测与连接建立
- 连接状态监控与恢复
- 消息广播路由

#### 2.2.2 加密服务（encryptionService.js）

- 群聊共享密钥生成与管理
- 群聊成员密钥分发
- 密钥轮换机制（成员变更时）
- 消息签名验证（确保发送者身份）

#### 2.2.3 消息服务（messageService.js）

- 群聊消息类型定义
- 消息ID和时序管理
- 消息去重机制
- 消息接收确认

#### 2.2.4 UI组件（新增）

- GroupChatScreen.js：群聊界面
- GroupManagementScreen.js：群组管理界面
- MemberList.js：成员列表组件
- CreateGroupModal.js：创建群组对话框
- JoinGroupModal.js：加入群组对话框
- GroupSettings.js：群组设置组件

## 3. 数据结构

### 3.1 群组元数据

```javascript
{
  id: "唯一群组ID（UUID）",
  name: "群组名称",
  type: "small" | "large",  // 群聊类型
  createdAt: 时间戳,       // 创建时间
  owner: "群主的PeerID",
  admins: ["管理员1的PeerID", "管理员2的PeerID", ...],
  members: [
    {
      peerId: "成员PeerID",
      joinedAt: 时间戳,
      role: "owner" | "admin" | "member",
      isSuperNode: true | false,  // 是否为超级节点
      displayName: "显示名称"
    },
    // ...更多成员
  ],
  keyVersion: 数字,  // 当前共享密钥版本
  settings: {
    allowFiles: true | false,  // 是否允许文件共享
    encryptionEnabled: true | false,  // 是否启用加密
    joinMode: "invite_only" | "admin_approval"  // 加入模式
  }
}
```

### 3.2 群聊连接状态

```javascript
{
  groupId: "群组ID",
  connectionStatus: {
    "成员1的PeerID": {
      status: "connected" | "connecting" | "disconnected",
      lastActiveTime: 时间戳,
      attempts: 重连尝试次数,
      isDirectConnection: true | false  // 是否直接连接
    },
    // ...更多成员连接状态
  },
  messageQueue: [
    {
      id: "消息ID",
      data: 消息数据,
      timestamp: 时间戳,
      attempts: 发送尝试次数,
      recipients: ["已接收消息的PeerID1", "已接收消息的PeerID2", ...]
    },
    // ...更多待发送消息
  ]
}
```

### 3.3 群聊消息

```javascript
{
  id: "唯一消息ID（UUID）",
  type: "text" | "file" | "system",  // 消息类型
  sender: "发送者PeerID",
  groupId: "群组ID",
  content: "消息内容",
  timestamp: 时间戳,
  signature: "消息签名",  // 用于验证发送者身份
  replyTo: "回复的消息ID",  // 可选，回复功能
  metadata: {  // 可选，根据消息类型不同
    // 文件消息的元数据
    fileName: "文件名",
    fileSize: 文件大小,
    fileType: "文件MIME类型",
    // 系统消息的元数据
    systemAction: "member_joined" | "member_left" | "role_changed" | ...
  }
}
```

## 4. 功能模块

### 4.1 群组创建和管理模块

#### 4.1.1 创建群组

**主要功能**：
- 生成群组ID
- 设置群组类型（小群聊/大群聊）
- 设置群组名称
- 配置群组设置
- 生成初始共享密钥
- 将创建者设为群主

**实现要点**：
```javascript
// 在 peerService.js 中添加
async createGroup(groupName, groupType, settings = {}) {
  const groupId = generateUUID();
  const group = {
    id: groupId,
    name: groupName,
    type: groupType,
    createdAt: Date.now(),
    owner: this.peerId,
    admins: [],
    members: [{
      peerId: this.peerId,
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
  
  // 生成群组共享密钥
  if (group.settings.encryptionEnabled) {
    await encryptionService.generateGroupSharedKey(groupId);
  }
  
  // 保存群组信息
  this.groups[groupId] = group;
  this.saveGroupsToStorage();
  
  return group;
}
```

#### 4.1.2 邀请成员

**主要功能**：
- 向新成员发送邀请
- 处理邀请响应
- 更新群组成员列表
- 分发共享密钥
- 广播成员变更事件

**实现要点**：
```javascript
// 在 peerService.js 中添加
async inviteMemberToGroup(groupId, targetPeerId) {
  const group = this.groups[groupId];
  if (!group) throw new Error("群组不存在");
  
  // 检查权限
  const currentMember = group.members.find(m => m.peerId === this.peerId);
  if (currentMember.role !== "owner" && currentMember.role !== "admin") {
    throw new Error("只有群主或管理员可以邀请新成员");
  }
  
  // 连接到目标Peer
  const connection = await this.connectToPeer(targetPeerId);
  
  // 发送邀请
  const invitation = {
    type: "group-invite",
    groupId: groupId,
    groupName: group.name,
    inviter: this.peerId,
    inviterRole: currentMember.role,
    timestamp: Date.now()
  };
  
  this.sendMessageSafely(connection, invitation);
  
  // 记录待处理邀请
  this.pendingGroupInvites[groupId + "-" + targetPeerId] = {
    connection,
    timestamp: Date.now()
  };
  
  return true;
}
```

#### 4.1.3 管理成员角色

**主要功能**：
- 提升成员为管理员
- 撤销管理员权限
- 指定/取消超级节点
- 移除成员
- 广播角色变更事件

**实现要点**：
```javascript
// 在 peerService.js 中添加
async changeGroupMemberRole(groupId, targetPeerId, newRole) {
  const group = this.groups[groupId];
  if (!group) throw new Error("群组不存在");
  
  // 检查权限
  const currentMember = group.members.find(m => m.peerId === this.peerId);
  if (currentMember.role !== "owner") {
    throw new Error("只有群主可以更改成员角色");
  }
  
  // 找到目标成员
  const targetMemberIndex = group.members.findIndex(m => m.peerId === targetPeerId);
  if (targetMemberIndex === -1) throw new Error("成员不存在");
  
  const targetMember = group.members[targetMemberIndex];
  
  // 更新角色
  if (newRole === "admin") {
    // 提升为管理员
    if (!group.admins.includes(targetPeerId)) {
      group.admins.push(targetPeerId);
    }
    targetMember.role = "admin";
  } else if (newRole === "member") {
    // 降为普通成员
    group.admins = group.admins.filter(id => id !== targetPeerId);
    targetMember.role = "member";
  }
  
  // 保存更改
  this.saveGroupsToStorage();
  
  // 广播角色变更
  this.broadcastGroupUpdate(groupId, {
    type: "group-role-change",
    targetPeerId,
    newRole,
    changedBy: this.peerId,
    timestamp: Date.now()
  });
  
  return true;
}
```

### 4.2 连接管理模块

#### 4.2.1 群组连接建立

**主要功能**：
- 根据群组类型建立连接拓扑
- 小群聊：所有成员间建立完全连接
- 大群聊：普通成员连接超级节点

**实现要点**：
```javascript
// 在 peerService.js 中添加
async establishGroupConnections(groupId) {
  const group = this.groups[groupId];
  if (!group) throw new Error("群组不存在");
  
  // 初始化群组连接管理
  if (!this.groupConnections[groupId]) {
    this.groupConnections[groupId] = {
      peerConnections: {},
      connectionStatus: {},
      messageQueue: []
    };
  }
  
  const connections = this.groupConnections[groupId];
  const currentPeerId = this.peerId;
  const currentMember = group.members.find(m => m.peerId === currentPeerId);
  
  if (!currentMember) throw new Error("当前用户不是群组成员");
  
  // 根据群组类型建立不同的连接拓扑
  if (group.type === 'small') {
    // 小群聊：全Mesh拓扑，连接所有其他成员
    for (const member of group.members) {
      const peerId = member.peerId;
      
      // 跳过自己
      if (peerId === currentPeerId) continue;
      
      // 检查是否已经连接
      if (connections.peerConnections[peerId] && 
          connections.connectionStatus[peerId]?.status === 'connected') {
        console.log(`已经连接到群组成员 ${peerId}`);
        continue;
      }
      
      // 建立连接
      try {
        const conn = await this.connectToPeer(peerId);
        
        // 保存连接
        connections.peerConnections[peerId] = conn;
        connections.connectionStatus[peerId] = {
          status: 'connected',
          lastActiveTime: Date.now(),
          attempts: 0,
          isDirectConnection: true
        };
        
        // 发送群组连接建立消息
        this.sendMessageSafely(conn, {
          type: "group-connection-established",
          groupId,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`连接到群组成员 ${peerId} 失败:`, error);
        connections.connectionStatus[peerId] = {
          status: 'disconnected',
          lastActiveTime: Date.now(),
          attempts: 1,
          isDirectConnection: true
        };
      }
    }
  } else {
    // 大群聊：混合拓扑
    // 找出所有超级节点
    const superNodes = group.members.filter(m => m.isSuperNode);
    
    if (currentMember.isSuperNode) {
      // 当前节点是超级节点，连接所有其他超级节点
      for (const superNode of superNodes) {
        const peerId = superNode.peerId;
        
        // 跳过自己
        if (peerId === currentPeerId) continue;
        
        // 检查是否已经连接
        if (connections.peerConnections[peerId] && 
            connections.connectionStatus[peerId]?.status === 'connected') {
          console.log(`已经连接到超级节点 ${peerId}`);
          continue;
        }
        
        // 建立连接
        try {
          const conn = await this.connectToPeer(peerId);
          
          // 保存连接
          connections.peerConnections[peerId] = conn;
          connections.connectionStatus[peerId] = {
            status: 'connected',
            lastActiveTime: Date.now(),
            attempts: 0,
            isDirectConnection: true
          };
          
          // 发送群组连接建立消息
          this.sendMessageSafely(conn, {
            type: "group-connection-established",
            groupId,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error(`连接到超级节点 ${peerId} 失败:`, error);
          connections.connectionStatus[peerId] = {
            status: 'disconnected',
            lastActiveTime: Date.now(),
            attempts: 1,
            isDirectConnection: true
          };
        }
      }
    } else {
      // 普通节点：连接至少2个超级节点
      // 选择最多2个超级节点连接
      const superNodesToConnect = superNodes
        .filter(sn => sn.peerId !== currentPeerId)
        .slice(0, 2);
      
      for (const superNode of superNodesToConnect) {
        const peerId = superNode.peerId;
        
        // 检查是否已经连接
        if (connections.peerConnections[peerId] && 
            connections.connectionStatus[peerId]?.status === 'connected') {
          console.log(`已经连接到超级节点 ${peerId}`);
          continue;
        }
        
        // 建立连接
        try {
          const conn = await this.connectToPeer(peerId);
          
          // 保存连接
          connections.peerConnections[peerId] = conn;
          connections.connectionStatus[peerId] = {
            status: 'connected',
            lastActiveTime: Date.now(),
            attempts: 0,
            isDirectConnection: false
          };
          
          // 发送群组连接建立消息
          this.sendMessageSafely(conn, {
            type: "group-connection-established",
            groupId,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error(`连接到群组成员 ${peerId} 失败:`, error);
          connections.connectionStatus[peerId] = {
            status: 'disconnected',
            lastActiveTime: Date.now(),
            attempts: 1,
            isDirectConnection: false
          };
        }
      }
    }
  }
  
  return true;
}
```

#### 4.2.2 消息广播和路由

**主要功能**：
- 向群组所有成员广播消息
- 优化路由路径（根据拓扑）
- 消息去重和确认
- 处理离线消息队列

**实现要点**：
```javascript
// 在 peerService.js 中添加
async broadcastGroupMessage(groupId, message) {
  const group = this.groups[groupId];
  if (!group) throw new Error("群组不存在");
  
  const connections = this.groupConnections[groupId];
  if (!connections) throw new Error("群组连接未初始化");
  
  // 添加消息ID和签名（如果启用加密）
  const messageToSend = {
    ...message,
    id: generateUUID(),
    sender: this.peerId,
    groupId,
    timestamp: Date.now()
  };
  
  // 如果启用了加密，加密消息内容
  if (group.settings.encryptionEnabled) {
    try {
      // 加密消息
      const encryptedMessage = await encryptionService.encryptGroupMessage(
        messageToSend, 
        groupId,
        group.keyVersion
      );
      
      // 创建发送数据
      const dataToSend = {
        type: "group-message",
        data: encryptedMessage,
        routeInfo: {
          origin: this.peerId,
          path: [this.peerId]
        }
      };
      
      // 将消息添加到消息队列（用于重传）
      const queueItem = {
        id: messageToSend.id,
        data: dataToSend,
        timestamp: Date.now(),
        attempts: 1,
        recipients: []
      };
      
      connections.messageQueue.push(queueItem);
      
      // 根据群组类型执行不同的广播策略
      if (group.type === 'small') {
        // 小群聊：广播到所有其他成员
        for (const [peerId, connection] of Object.entries(connections.p