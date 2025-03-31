import Peer from 'peerjs';
import { encryptionService } from './encryptionService';
import CryptoJS from 'crypto-js';

// 文件块大小设置为16KB，避免超出数据通道大小限制
const CHUNK_SIZE = 16 * 1024; // 16KB

class PeerService {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.isReady = false;
    this.pendingMessages = [];
    this.fileTransfers = {};
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
   * 新增: 发送文件
   * @param {object} connection - PeerJS连接对象
   * @param {File} file - 要发送的文件
   * @param {boolean} useEncryption - 是否使用加密
   * @param {string} sharedSecret - 共享密钥(加密模式下必须提供)
   * @param {object} callbacks - 回调函数集合
   */
  sendFile(connection, file, useEncryption, sharedSecret, callbacks = {}) {
    if (!connection || !file) {
      if (callbacks.onError) callbacks.onError(new Error('连接或文件不存在'));
      return;
    }

    // 生成唯一的传输ID
    const transferId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 初始化文件传输状态
    this.fileTransfers[transferId] = {
      file: file,
      sentChunks: 0,
      totalChunks: 0,
      useEncryption: useEncryption,
      callbacks: callbacks
    };

    // 读取文件
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const fileData = new Uint8Array(event.target.result);
        const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);
        this.fileTransfers[transferId].totalChunks = totalChunks;

        const metadata = {
          type: 'file-metadata',
          transferId: transferId,
          fileName: file.name,
          fileType: file.type,
          fileSize: fileData.length,
          chunksCount: totalChunks,
          timestamp: Date.now()
        };
        const metadataStr = JSON.stringify(metadata);

        if (useEncryption && sharedSecret) {
          const encryptedMetadata = await encryptionService.encrypt(metadataStr, sharedSecret);
          this.sendMessageSafely(connection, encryptedMetadata);
        } else {
          this.sendMessageSafely(connection, metadataStr);
        }

        // 顺序异步发送文件块（参考方案 1.2）
        const sendChunksSequentially = async () => {
          for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, fileData.length);
            const chunk = fileData.slice(start, end);
            await this.sendFileChunk(connection, transferId, i, chunk, useEncryption, sharedSecret);
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        };
        sendChunksSequentially();
      } catch (error) {
        console.error('处理文件失败:', error);
        if (callbacks.onError) callbacks.onError(error);
        delete this.fileTransfers[transferId];
      }
    };


    reader.onerror = (error) => {
      console.error('读取文件失败:', error);
      if (callbacks.onError) callbacks.onError(error);
      delete this.fileTransfers[transferId];
    };

    // 开始读取文件
    reader.readAsArrayBuffer(file);
  }

  /**
   * 新增: 发送文件块
   * @param {object} connection - PeerJS连接对象
   * @param {string} transferId - 传输ID
   * @param {number} chunkIndex - 块索引
   * @param {ArrayBuffer} chunkData - 块数据
   * @param {boolean} useEncryption - 是否使用加密
   * @param {string} sharedSecret - 共享密钥(加密模式下必须提供)
   */
  async sendFileChunk(connection, transferId, chunkIndex, chunkData, useEncryption, sharedSecret) {
    try {
      if (!this.fileTransfers[transferId]) {
        console.error('文件传输状态不存在:', transferId);
        return;
      }

      const chunkMessage = {
        type: 'file-chunk',
        transferId: transferId,
        chunkIndex: chunkIndex,
        isLastChunk: chunkIndex === this.fileTransfers[transferId].totalChunks - 1
      };

      if (useEncryption && sharedSecret) {
        const base64Data = this.arrayBufferToBase64(chunkData);
        const encryptedData = await encryptionService.encryptRaw(base64Data, sharedSecret);
        // 将加密返回的对象序列化为字符串
        chunkMessage.encryptedData = encryptedData;
        this.sendMessageSafely(connection, JSON.stringify(chunkMessage));
      } else {
        // 非加密模式——直接发送二进制数据
        const message = JSON.stringify(chunkMessage);
        const messageBuffer = new TextEncoder().encode(message);
        const combinedBuffer = new Uint8Array(messageBuffer.length + chunkData.byteLength + 4);
        const headerLength = messageBuffer.length;
        combinedBuffer[0] = (headerLength >> 24) & 0xFF;
        combinedBuffer[1] = (headerLength >> 16) & 0xFF;
        combinedBuffer[2] = (headerLength >> 8) & 0xFF;
        combinedBuffer[3] = headerLength & 0xFF;
        combinedBuffer.set(messageBuffer, 4);
        combinedBuffer.set(new Uint8Array(chunkData), 4 + messageBuffer.length);
        this.sendMessageSafely(connection, combinedBuffer.buffer);
      }

      this.fileTransfers[transferId].sentChunks++;
      const progress = (this.fileTransfers[transferId].sentChunks / this.fileTransfers[transferId].totalChunks) * 100;
      if (this.fileTransfers[transferId].callbacks.onProgress) {
        this.fileTransfers[transferId].callbacks.onProgress(transferId, progress);
      }

      if (this.fileTransfers[transferId].sentChunks === this.fileTransfers[transferId].totalChunks) {
        console.log('文件传输完成:', transferId);
        if (this.fileTransfers[transferId].callbacks.onComplete) {
          this.fileTransfers[transferId].callbacks.onComplete(transferId);
        }
        delete this.fileTransfers[transferId];
      }
    } catch (error) {
      console.error('发送文件块失败:', error);
      if (this.fileTransfers[transferId] && this.fileTransfers[transferId].callbacks.onError) {
        this.fileTransfers[transferId].callbacks.onError(error);
      }
      delete this.fileTransfers[transferId];
    }
  }

  /**
   * 新增: 处理接收到的数据
   * @param {any} data - 接收到的数据
   * @param {boolean} useEncryption - 是否使用加密
   * @param {string} sharedSecret - 共享密钥(加密模式下必须提供)
   * @param {object} callbacks - 回调函数集合
   */
  handleReceivedData(data, useEncryption, sharedSecret, callbacks = {}) {
    try {
      // 检查数据类型
      if (typeof data === 'string') {
        // 字符串数据 - 可能是JSON消息或加密消息
        this.handleStringData(data, useEncryption, sharedSecret, callbacks);
      } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        // 二进制数据 - 可能是文件块
        this.handleBinaryData(data, useEncryption, sharedSecret, callbacks);
      } else {
        // 其他类型数据 - 尝试作为普通消息处理
        if (callbacks.onMessage) callbacks.onMessage(data);
      }
    } catch (error) {
      console.error('处理接收到的数据失败:', error);
    }
  }

  /**
   * 新增: 处理字符串数据
   * @param {string} data - 接收到的字符串数据
   * @param {boolean} useEncryption - 是否使用加密
   * @param {string} sharedSecret - 共享密钥(加密模式下必须提供)
   * @param {object} callbacks - 回调函数集合
   */
  async handleStringData(data, useEncryption, sharedSecret, callbacks = {}) {
    try {
      // 尝试解析为JSON
      let jsonData;

      if (useEncryption && sharedSecret) {
        // 加密模式 - 尝试解密
        try {
          const decryptedData = encryptionService.decrypt(JSON.parse(data), sharedSecret);
          jsonData = JSON.parse(decryptedData);
        } catch (error) {
          // 解密失败，可能不是加密数据
          try {
            jsonData = JSON.parse(data);
          } catch (e) {
            // 不是JSON数据
            if (callbacks.onMessage) callbacks.onMessage(data);
            return;
          }
        }
      } else {
        // 非加密模式 - 直接解析
        try {
          jsonData = JSON.parse(data);
        } catch (error) {
          // 不是JSON数据
          if (callbacks.onMessage) callbacks.onMessage(data);
          return;
        }
      }

      // 根据消息类型处理
      if (jsonData.type === 'file-metadata') {
        // 文件元数据
        if (callbacks.onFileMetadata) callbacks.onFileMetadata(jsonData);
      } else if (jsonData.type === 'file-chunk') {
        // 添加日志，检查接收到的文件块消息格式
        console.log('处理文件块消息，jsonData:', jsonData);
        try {
          if (jsonData.encryptedData && useEncryption && window.sharedCryptoKey) {
            let encryptedDataObj;
            if (typeof jsonData.encryptedData === 'string') {
              encryptedDataObj = JSON.parse(jsonData.encryptedData);
            } else {
              encryptedDataObj = jsonData.encryptedData;
            }
            const decryptedBase64 = await encryptionService.decryptRaw(encryptedDataObj, window.sharedCryptoKey);
            if (!decryptedBase64) {
              console.error('文件块解密返回为空');
              return;
            }
            console.log('解密后的 base64 数据:', decryptedBase64);
            const chunkData = encryptionService.utils.base64ToArrayBuffer(decryptedBase64);
            console.log('转换后的 chunkData 长度:', chunkData.byteLength);
            if (callbacks.onFileChunk) {
              callbacks.onFileChunk(jsonData.transferId, jsonData.chunkIndex, chunkData, jsonData);
            }
            if (jsonData.isLastChunk && callbacks.onFileTransferComplete) {
              callbacks.onFileTransferComplete(jsonData.transferId);
            }
          }
        } catch (error) {
          console.error('文件块解密失败:', error);
        }
        return;
      }
      else {
        // 其他消息
        if (callbacks.onMessage) callbacks.onMessage(jsonData);
      }
    } catch (error) {
      console.error('处理字符串数据失败:', error);
    }
  }

  /**
   * 新增: 处理二进制数据
   * @param {ArrayBuffer|Uint8Array} data - 接收到的二进制数据
   * @param {boolean} useEncryption - 是否使用加密
   * @param {string} sharedSecret - 共享密钥(加密模式下必须提供)
   * @param {object} callbacks - 回调函数集合
   */
  handleBinaryData(data, useEncryption, sharedSecret, callbacks = {}) {
    try {
      // 确保数据是Uint8Array
      const dataView = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

      // 读取消息头长度(前4字节)
      const headerLength = (dataView[0] << 24) | (dataView[1] << 16) | (dataView[2] << 8) | dataView[3];

      // 提取消息头
      const headerData = dataView.slice(4, 4 + headerLength);
      const headerText = new TextDecoder().decode(headerData);

      // 解析消息头
      const header = JSON.parse(headerText);

      // 提取块数据
      const chunkData = dataView.slice(4 + headerLength);

      // 根据消息类型处理
      if (header.type === 'file-chunk') {
        // 文件块
        if (callbacks.onFileChunk) {
          callbacks.onFileChunk(header.transferId, header.chunkIndex, chunkData, header);
        }

        if (header.isLastChunk && callbacks.onFileTransferComplete) {
          callbacks.onFileTransferComplete(header.transferId);
        }
      } else {
        // 其他二进制消息
        if (callbacks.onMessage) callbacks.onMessage({ header, data: chunkData });
      }
    } catch (error) {
      console.error('处理二进制数据失败:', error);
    }
  }

  /**
   * 新增: ArrayBuffer转Base64
   * @param {ArrayBuffer} buffer - 二进制数据
   * @returns {string} - Base64字符串
   */
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
  }

  /**
   * 新增: Base64转ArrayBuffer
   * @param {string} base64 - Base64字符串
   * @returns {ArrayBuffer} - 二进制数据
   */
  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  }
}

// 创建服务实例
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

/**
 * 初始化 Peer 连接 - 为保持与原有代码的兼容性而添加
 * @param {string} id - 用户ID
 * @returns {object} - Peer对象
 */
const initializePeer = (id) => {
  try {
    // 使用指定的ID创建Peer对象
    const peer = new Peer(id, {
      debug: 2, // 调试级别
      config: {
        'iceServers': [
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
const setupConnectionListeners = (peer, callbacks = {}) => {
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
const connectToPeer = (peer, targetId) => {
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
const setupDataConnectionListeners = (conn, callbacks = {}) => {
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
const checkConnectionStatus = (conn) => {
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
 * 安全发送消息 - 为保持与原有代码的兼容性而添加
 * @param {object} conn - 连接对象
 * @param {any} message - 要发送的消息
 * @returns {boolean} - 是否成功发送
 */
const sendMessageSafely = (conn, message) => {
  return peerServiceInstance.sendMessageSafely(conn, message);
};

/**
 * 重新建立连接 - 为保持与原有代码的兼容性而添加
 * @param {object} peer - Peer对象
 * @param {string} targetId - 目标用户ID
 * @param {object} callbacks - 回调函数集合
 * @returns {object} - 连接对象
 */
const reestablishConnection = (peer, targetId, callbacks = {}) => {
  if (!peer || !targetId) {
    return null;
  }

  console.log('尝试重新建立连接到:', targetId);

  try {
    // 连接到目标Peer
    const conn = connectToPeer(peer, targetId);

    // 设置数据连接监听器
    setupDataConnectionListeners(conn, callbacks);

    return conn;
  } catch (error) {
    console.error('重新建立连接失败:', error);
    return null;
  }
};

/**
 * 发送文件 - 为保持与原有代码的兼容性而添加
 * @param {object} conn - 连接对象
 * @param {File} file - 要发送的文件
 * @param {boolean} useEncryption - 是否使用加密
 * @param {string} sharedSecret - 共享密钥(加密模式下必须提供)
 * @param {object} callbacks - 回调函数集合
 */
const sendFile = (conn, file, useEncryption, sharedSecret, callbacks = {}) => {
  return peerServiceInstance.sendFile(conn, file, useEncryption, sharedSecret, callbacks);
};

/**
 * 处理接收到的数据 - 为保持与原有代码的兼容性而添加
 * @param {any} data - 接收到的数据
 * @param {boolean} useEncryption - 是否使用加密
 * @param {string} sharedSecret - 共享密钥(加密模式下必须提供)
 * @param {object} callbacks - 回调函数集合
 */
const handleReceivedData = (data, useEncryption, sharedSecret, callbacks = {}) => {
  return peerServiceInstance.handleReceivedData(data, useEncryption, sharedSecret, callbacks);
};

// 导出服务
const peerService = {
  generateRandomId,
  initializePeer,
  setupConnectionListeners,
  connectToPeer,
  setupDataConnectionListeners,
  checkConnectionStatus,
  sendMessageSafely,
  reestablishConnection,
  sendFile,
  handleReceivedData
};

export default peerService;
