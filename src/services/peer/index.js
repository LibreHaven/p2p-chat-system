import Peer from 'peerjs';
import { encryptionService } from '../encryption';
import CryptoJS from 'crypto-js';
import messageService from '../message';
import * as fileUtils from './file';
import * as groupApi from './group';

class PeerService {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.isReady = false;
    this.pendingMessages = [];
    this.fileTransfers = {};

    // 新增群组相关数据结构
    this.groups = groupApi.groupState.groups;                    // 保存群组信息
    this.groupConnections = groupApi.groupState.groupConnections;
    this.groupMessages = groupApi.groupState.groupMessages;
    this.pendingGroupInvites = groupApi.groupState.pendingGroupInvites;
    this.groupFileTransfers = groupApi.groupState.groupFileTransfers;
    this.processedGroupMessages = groupApi.groupState.processedGroupMessages;
    this.keyUpdateStatus = groupApi.groupState.keyUpdateStatus;
    this.groupMonitoringIntervals = groupApi.groupState.groupMonitoringIntervals;
    this.groupHeartbeatIntervals = groupApi.groupState.groupHeartbeatIntervals;
    this.fileUtils = fileUtils;
    this.encryptionService = encryptionService;

    this.sendMessageSafely = this.sendMessageSafely.bind(this);
  }

  /**
   * 创建Peer连接
   * @param {string} id - 用户ID
   * @param {function} onOpen - 连接打开回调
   * @param {function} onError - 错误回调
   * @param {function} onConnection - 接收连接回调
   */
  createPeer(id, onOpen, onError, onConnection) {
    try {
      // 创建Peer实例
      this.peer = new Peer(id, {
        debug: 2, // 调试级别
        config: {
          'iceServers': [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      // 绑定事件处理器
      this.peer.on('open', (id) => {
        console.log('Peer连接已打开，ID:', id);
        if (onOpen) onOpen(id);
      });

      this.peer.on('error', (err) => {
        console.error('Peer错误:', err);
        if (onError) onError(err);
      });

      this.peer.on('connection', (conn) => {
        console.log('收到连接请求:', conn.peer);
        if (onConnection) onConnection(conn);
      });

      return this.peer;
    } catch (error) {
      console.error('创建Peer失败:', error);
      if (onError) onError(error);
      return null;
    }
  }

  /**
   * 连接到目标Peer
   * @param {string} targetId - 目标用户ID
   * @param {function} onOpen - 连接打开回调
   * @param {function} onData - 数据接收回调
   * @param {function} onClose - 连接关闭回调
   * @param {function} onError - 错误回调
   */
  connectToPeer(targetId, onOpen, onData, onClose, onError) {
    try {
      if (!this.peer) {
        throw new Error('Peer未初始化');
      }

      // 修改: 将serialization从'json'改为'binary'以支持二进制数据传输
      this.connection = this.peer.connect(targetId, {
        reliable: true,
        serialization: 'binary' // 修改为binary以支持二进制数据
      });

      // 确保open事件是第一个被绑定的事件
      this.connection.on('open', () => {
        console.log('连接已打开');
        this.isReady = true;

        // 发送待发送队列中的消息
        this.sendPendingMessages();

        if (onOpen) onOpen(this.connection);
      });

      this.connection.on('data', (data) => {
        if (onData) onData(data);
      });

      this.connection.on('close', () => {
        console.log('连接已关闭');
        this.isReady = false;
        if (onClose) onClose();
      });

      this.connection.on('error', (err) => {
        console.error('连接错误:', err);
        if (onError) onError(err);
      });

      return this.connection;
    } catch (error) {
      console.error('连接到Peer失败:', error);
      if (onError) onError(error);
      return null;
    }
  }

  /**
   * 安全发送消息，确保连接已打开
   * @param {object} connection - PeerJS连接对象
   * @param {object} message - 要发送的消息
   * @returns {boolean} - 是否成功发送
   */
  sendMessageSafely(connection, message) {
    try {
      if (!connection) {
        console.error('发送消息失败: 连接不存在');
        return false;
      }

      if (connection.open) {
        // 连接已打开，直接发送
        connection.send(message);
        return true;
      } else {
        // 连接未打开，加入待发送队列
        console.log('连接未打开，消息已加入待发送队列');
        this.pendingMessages.push(message);
        return false;
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    }
  }

  /**
   * 发送待发送队列中的消息
   */
  sendPendingMessages() {
    if (!this.connection || !this.isReady || this.pendingMessages.length === 0) {
      return;
    }

    console.log(`发送${this.pendingMessages.length}条待发送消息`);

    // 复制并清空待发送队列
    const messagesToSend = [...this.pendingMessages];
    this.pendingMessages = [];

    // 发送所有待发送消息
    messagesToSend.forEach(message => {
      try {
        this.connection.send(message);
      } catch (error) {
        console.error('发送待发送消息失败:', error);
        // 重新加入队列
        this.pendingMessages.push(message);
      }
    });
  }

  /**
   * 发送文件
   */
  sendFile(connection, file, useEncryption, sharedSecret, callbacks = {}) {
    return this.fileUtils.sendFile(this, connection, file, useEncryption, sharedSecret, callbacks);
  }

  /**
   * 发送文件块
   */
  async sendFileChunk(connection, transferId, chunkIndex, chunkData, useEncryption, sharedSecret) {
    return this.fileUtils.sendFileChunk(this, connection, transferId, chunkIndex, chunkData, useEncryption, sharedSecret);
  }

  /**
   * 处理接收到的数据
   */
  handleReceivedData(data, useEncryption, sharedSecret, callbacks = {}) {
    return this.fileUtils.handleReceivedData(this, data, useEncryption, sharedSecret, callbacks);
  }

  /**
   * 处理字符串数据
   */
  async handleStringData(data, useEncryption, sharedSecret, callbacks = {}) {
    return this.fileUtils.handleStringData(this, data, useEncryption, sharedSecret, callbacks);
  }

  /**
   * 处理二进制数据
   */
  handleBinaryData(data, useEncryption, sharedSecret, callbacks = {}) {
    return this.fileUtils.handleBinaryData(this, data, useEncryption, sharedSecret, callbacks);
  }

  // 生成UUID (用于群组ID和消息ID)
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 代理loadGroupsFromStorage到group.js
  loadGroupsFromStorage() {
    if (groupApi.loadGroupsFromStorage) {
      return groupApi.loadGroupsFromStorage();
    }
    return null;
  }

  // 代理createGroup到groupApi
  async createGroup(groupName, groupType, settings = {}) {
    return groupApi.createGroup(this, groupName, groupType, settings);
  }

  // 邀请成员加入群组
  async inviteMemberToGroup(groupId, targetPeerId) {
    const group = this.groups[groupId];
    if (!group) throw new Error("群组不存在");

    // 检查权限
    const currentMember = group.members.find(m => m.peerId === this.peer.id);
    if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
      throw new Error("只有群主或管理员可以邀请新成员");
    }

    // 检查目标是否已经是成员
    if (group.members.some(m => m.peerId === targetPeerId)) {
      throw new Error("该用户已经是群组成员");
    }

    try {
      // 连接到目标Peer
      const connection = await this.connectToPeer(targetPeerId);

      // 发送邀请
      const invitation = {
        type: "group-invite",
        groupId: groupId,
        groupName: group.name,
        groupType: group.type,
        inviter: this.peer.id,
        inviterRole: currentMember.role,
        timestamp: Date.now()
      };

      await this.sendMessageSafely(connection, invitation);

      // 记录待处理邀请
      this.pendingGroupInvites[groupId + "-" + targetPeerId] = {
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
  async handleGroupInviteAccepted(groupId, memberId, connection) {
    return groupApi.handleGroupInviteAccepted(this, groupId, memberId, connection);
  }

  // 为群组密钥分发
  async distributeGroupKey(groupId, targetPeerId, connection) {
    return groupApi.distributeGroupKey(this, groupId, targetPeerId, connection);
  }

  // 添加群组系统消息
  addGroupSystemMessage(groupId, action, metadata = {}) {
    return groupApi.addGroupSystemMessage(this, groupId, action, metadata);
  }

  // 广播群组更新
  async broadcastGroupUpdate(groupId, message) {
    return groupApi.broadcastGroupUpdate(this, groupId, message);
  }

  // 获取单个Peer连接
  getPeerConnection(peerId) {
    return groupApi.getPeerConnection(this, peerId);
  }

  // 建立与新成员的连接
  establishGroupConnectionsForMember(groupId, memberId) {
    return groupApi.establishGroupConnectionsForMember(this, groupId, memberId);
  }

  // 发送群聊消息
  async sendGroupMessage(groupId, message) {
    return groupApi.sendGroupMessage(this, groupId, message);
  }

  // 处理接收到的群聊消息
  async handleGroupMessage(groupId, message) {
    return groupApi.handleGroupMessage(this, groupId, message);
  }

  // 移除群组成员
  removeMember(groupId, memberId) {
    return groupApi.removeMember(this, groupId, memberId);
  }

  // 设置/取消管理员权限
  setGroupAdmin(groupId, memberId, isAdmin) {
    return groupApi.setGroupAdmin(this, groupId, memberId, isAdmin);
  }

  // 设置/取消超级节点权限
  setSuperNode(groupId, memberId, isSuperNode) {
    return groupApi.setSuperNode(this, groupId, memberId, isSuperNode);
  }

  // 更新群组密钥 (仅群主操作)
  async updateGroupKey(groupId) {
    return groupApi.updateGroupKey(this, groupId);
  }

  // 解散群组 (仅群主操作)
  disbandGroup(groupId) {
    return groupApi.disbandGroup(this, groupId);
  }

  // 处理加入群组请求
  handleJoinGroupRequest(requestId, requesterId, groupId) {
    return groupApi.handleJoinGroupRequest(this, requestId, requesterId, groupId);
  }

  // 接受加入群组请求
  async acceptJoinGroupRequest(requestId) {
    return groupApi.acceptJoinGroupRequest(this, requestId);
  }

  // 拒绝加入群组请求
  rejectJoinGroupRequest(requestId) {
    return groupApi.rejectJoinGroupRequest(this, requestId);
  }

  // 成员主动离开群组
  leaveGroup(groupId) {
    return groupApi.leaveGroup(this, groupId);
  }
}

const peerServiceInstance = new PeerService();

/**
 * 生成随机ID
 * @returns {string} - 随机生成的ID
 */
const generateRandomId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
peerServiceInstance.generateRandomId = generateRandomId;
/**
 * 初始化 Peer 连接 - 为保持与原有代码的兼容性而添加
 * @param {string} id - 用户ID
 * @returns {object} - Peer对象
 */
peerServiceInstance.initializePeer = (id) => {
  try {
    const peer = new Peer(id, {
      // ★ 指定公共 PeerJS Server
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      key: 'peerjs',

      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    return peer;
  } catch (error) {
    console.error('初始化Peer失败:', error);
    return null;
  }
};

/**
 * 设置 Peer 连接监听器 - 为保持与原有代码的兼容性而添加
 * @param {object} peer - Peer对象
 * @param {object} callbacks - 回调函数集合
 */
peerServiceInstance.setupConnectionListeners = (peer, callbacks = {}) => {
  if (!peer) return;

  // 移除所有现有监听器，防止重复绑定
  peer.removeAllListeners('open');
  peer.removeAllListeners('connection');
  peer.removeAllListeners('error');
  peer.removeAllListeners('disconnected');
  peer.removeAllListeners('close');

  // 连接打开时的回调
  peer.on('open', (id) => {
    if (callbacks.onOpen) callbacks.onOpen(id);
  });

  // 收到连接请求时的回调
  peer.on('connection', (conn) => {
    if (callbacks.onConnection) callbacks.onConnection(conn);
  });

  // 发生错误时的回调
  peer.on('error', (err) => {
    if (callbacks.onError) callbacks.onError(err);
  });

  // 连接断开时的回调
  peer.on('disconnected', () => {
    console.log('Peer连接已断开，尝试重新连接...');

    // 尝试重新连接
    try {
      peer.reconnect();
    } catch (error) {
      console.error('重新连接失败:', error);
    }

    if (callbacks.onDisconnected) callbacks.onDisconnected();
  });

  // 连接关闭时的回调
  peer.on('close', () => {
    if (callbacks.onClose) callbacks.onClose();
  });
};

/**
 * 连接到目标 Peer - 为保持与原有代码的兼容性而添加
 * @param {object} peer - Peer对象
 * @param {string} targetId - 目标用户ID
 * @returns {object} - 连接对象
 */
peerServiceInstance.connectToPeer = (peer, targetId) => {
  if (!peer) return null;

  try {
    // 连接到目标Peer，设置可靠性选项
    const conn = peer.connect(targetId, {
      reliable: true,
      serialization: 'binary', // 修改为binary以支持二进制数据
      metadata: {
        type: 'chat-connection',
        timestamp: Date.now()
      }
    });

    return conn;
  } catch (error) {
    console.error('连接到目标Peer失败:', error);
    return null;
  }
};

/**
 * 设置数据连接监听器 - 为保持与原有代码的兼容性而添加
 * @param {object} conn - 连接对象
 * @param {object} callbacks - 回调函数集合
 */
peerServiceInstance.setupDataConnectionListeners = (conn, callbacks = {}) => {
  if (!conn) return;

  // 移除所有现有监听器，防止重复绑定
  conn.removeAllListeners('open');
  conn.removeAllListeners('data');
  conn.removeAllListeners('close');
  conn.removeAllListeners('error');

  // 连接打开时的回调 - 确保这是第一个被绑定的事件
  conn.on('open', () => {
    console.log('数据连接已打开，连接到:', conn.peer);

    // 标记连接已就绪
    conn.isReady = true;

    // 处理待发送队列中的消息
    if (conn.pendingMessages && conn.pendingMessages.length > 0) {
      console.log(`处理 ${conn.pendingMessages.length} 条待发送消息`);

      // 发送所有待发送的消息
      conn.pendingMessages.forEach(msg => {
        try {
          conn.send(msg);
          console.log('成功发送待处理消息');
        } catch (err) {
          console.error('发送待处理消息失败:', err);
        }
      });

      // 清空待发送队列
      conn.pendingMessages = [];
    }

    if (callbacks.onOpen) callbacks.onOpen();
  });

  // 收到数据时的回调
  conn.on('data', (data) => {
    console.log('收到来自', conn.peer, '的数据');
    if (callbacks.onData) callbacks.onData(data);
  });

  // 连接关闭时的回调
  conn.on('close', () => {
    console.log('数据连接已关闭');
    conn.isReady = false;
    if (callbacks.onClose) callbacks.onClose();
  });

  // 发生错误时的回调
  conn.on('error', (err) => {
    console.error('数据连接错误:', err);
    if (callbacks.onError) callbacks.onError(err);
  });

  // 初始化待发送消息队列
  if (!conn.pendingMessages) {
    conn.pendingMessages = [];
  }
};

/**
 * 检查连接状态 - 为保持与原有代码的兼容性而添加
 * @param {object} conn - 连接对象
 * @returns {string} - 连接状态
 */
peerServiceInstance.checkConnectionStatus = (conn) => {
  if (!conn) {
    return 'disconnected';
  }

  try {
    // 检查连接是否已打开，避免在连接未就绪时发送消息
    if (conn.open && conn.isReady) {
      // 尝试发送一个心跳消息来检查连接
      conn.send({
        type: 'heartbeat',
        timestamp: Date.now()
      });
      return 'connected';
    } else {
      console.log('连接尚未打开或未就绪，无法发送心跳消息');
      return 'connecting';
    }
  } catch (error) {
    console.error('连接状态检查失败:', error);
    return 'error';
  }
};

/**
 * 重新建立连接 - 为保持与原有代码的兼容性而添加
 * @param {object} peer - Peer对象
 * @param {string} targetId - 目标用户ID
 * @param {object} callbacks - 回调函数集合
 * @returns {object} - 连接对象
 */
peerServiceInstance.reestablishConnection = (peer, targetId, callbacks = {}) => {
  if (!peer || !targetId) {
    return null;
  }

  console.log('尝试重新建立连接到:', targetId);

  try {
    // 连接到目标Peer
    const conn = peerServiceInstance.connectToPeer(peer, targetId);

    // 设置数据连接监听器
    peerServiceInstance.setupDataConnectionListeners(conn, callbacks);

    return conn;
  } catch (error) {
    console.error('重新建立连接失败:', error);
    return null;
  }
};

// 其他兼容性函数可以根据需要添加

// 支持两种导出方式
export default peerServiceInstance;
export const peerService = peerServiceInstance;
export * from './file';
