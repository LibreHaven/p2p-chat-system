// 文件分块与传输相关
// 这里只做结构示例，实际内容可根据 index.js 拆分

// 例如：
// export const CHUNK_SIZE = 16 * 1024;
// export function sendFile(...) { ... }
// export function sendFileChunk(...) { ... }
// export function handleReceivedData(...) { ... }
// ... 

export const CHUNK_SIZE = 16 * 1024; // 16KB

/**
 * 发送文件
 * @param {object} context - PeerService实例或上下文
 * @param {object} connection - PeerJS连接对象
 * @param {File} file - 要发送的文件
 * @param {boolean} useEncryption - 是否使用加密
 * @param {string} sharedSecret - 共享密钥(加密模式下必须提供)
 * @param {object} callbacks - 回调函数集合
 */
export function sendFile(context, connection, file, useEncryption, sharedSecret, callbacks = {}) {
  if (!connection || !file) {
    if (callbacks.onError) callbacks.onError(new Error('连接或文件不存在'));
    return;
  }
  const transferId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  context.fileTransfers[transferId] = {
    file: file,
    sentChunks: 0,
    totalChunks: 0,
    useEncryption: useEncryption,
    callbacks: callbacks
  };
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const fileData = new Uint8Array(event.target.result);
      const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);
      context.fileTransfers[transferId].totalChunks = totalChunks;
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
        const encryptedMetadata = await context.encryptionService.encrypt(metadataStr, sharedSecret);
        context.sendMessageSafely(connection, encryptedMetadata);
      } else {
        context.sendMessageSafely(connection, metadataStr);
      }
      const sendChunksSequentially = async () => {
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileData.length);
          const chunk = fileData.slice(start, end);
          await sendFileChunk(context, connection, transferId, i, chunk, useEncryption, sharedSecret);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      };
      sendChunksSequentially();
    } catch (error) {
      if (callbacks.onError) callbacks.onError(error);
      delete context.fileTransfers[transferId];
    }
  };
  reader.onerror = (error) => {
    if (callbacks.onError) callbacks.onError(error);
    delete context.fileTransfers[transferId];
  };
  reader.readAsArrayBuffer(file);
}

/**
 * 发送文件块
 */
export async function sendFileChunk(context, connection, transferId, chunkIndex, chunkData, useEncryption, sharedSecret) {
  try {
    if (!context.fileTransfers[transferId]) return;
    const chunkMessage = {
      type: 'file-chunk',
      transferId: transferId,
      chunkIndex: chunkIndex,
      isLastChunk: chunkIndex === context.fileTransfers[transferId].totalChunks - 1
    };
    if (useEncryption && sharedSecret) {
      const base64Data = arrayBufferToBase64(chunkData);
      const encryptedData = await context.encryptionService.encryptRaw(base64Data, sharedSecret);
      chunkMessage.encryptedData = encryptedData;
      context.sendMessageSafely(connection, JSON.stringify(chunkMessage));
    } else {
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
      context.sendMessageSafely(connection, combinedBuffer.buffer);
    }
    context.fileTransfers[transferId].sentChunks++;
    const progress = (context.fileTransfers[transferId].sentChunks / context.fileTransfers[transferId].totalChunks) * 100;
    if (context.fileTransfers[transferId].callbacks.onProgress) {
      context.fileTransfers[transferId].callbacks.onProgress(transferId, progress);
    }
    if (context.fileTransfers[transferId].sentChunks === context.fileTransfers[transferId].totalChunks) {
      if (context.fileTransfers[transferId].callbacks.onComplete) {
        context.fileTransfers[transferId].callbacks.onComplete(transferId);
      }
      delete context.fileTransfers[transferId];
    }
  } catch (error) {
    if (context.fileTransfers[transferId] && context.fileTransfers[transferId].callbacks.onError) {
      context.fileTransfers[transferId].callbacks.onError(error);
    }
    delete context.fileTransfers[transferId];
  }
}

/**
 * 处理接收到的数据
 */
export function handleReceivedData(context, data, useEncryption, sharedSecret, callbacks = {}) {
  try {
    if (typeof data === 'string') {
      handleStringData(context, data, useEncryption, sharedSecret, callbacks);
    } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      handleBinaryData(context, data, useEncryption, sharedSecret, callbacks);
    } else {
      if (callbacks.onMessage) callbacks.onMessage(data);
    }
  } catch (error) {}
}

/**
 * 处理字符串数据
 */
export async function handleStringData(context, data, useEncryption, sharedSecret, callbacks = {}) {
  try {
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (e) {
      if (callbacks.onMessage) callbacks.onMessage(data);
      return;
    }
    if (jsonData.type === 'encrypted-message') {
      try {
        const decrypted = await context.encryptionService.decrypt(jsonData, sharedSecret);
        if (!decrypted) return;
        const messageObj = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
        if (messageObj.type === 'file-metadata') {
          if (callbacks.onFileMetadata) callbacks.onFileMetadata(messageObj);
        } else {
          if (callbacks.onMessage) callbacks.onMessage(messageObj);
        }
      } catch (error) {}
    } else if (jsonData.type === 'file-metadata') {
      if (callbacks.onFileMetadata) callbacks.onFileMetadata(jsonData);
    } else if (jsonData.type === 'file-chunk') {
      try {
        if (jsonData.encryptedData && useEncryption && sharedSecret) {
          let encryptedDataObj = typeof jsonData.encryptedData === 'string' ? JSON.parse(jsonData.encryptedData) : jsonData.encryptedData;
          const decryptedBase64 = await context.encryptionService.decryptRaw(encryptedDataObj, sharedSecret);
          if (!decryptedBase64) return;
          const chunkData = context.encryptionService.utils.base64ToArrayBuffer(decryptedBase64);
          if (callbacks.onFileChunk) callbacks.onFileChunk(jsonData.transferId, jsonData.chunkIndex, chunkData, jsonData);
          if (jsonData.isLastChunk && callbacks.onFileTransferComplete) callbacks.onFileTransferComplete(jsonData.transferId);
        }
      } catch (error) {}
      return;
    } else {
      if (callbacks.onMessage) callbacks.onMessage(jsonData);
    }
  } catch (error) {}
}

/**
 * 处理二进制数据
 */
export function handleBinaryData(context, data, useEncryption, sharedSecret, callbacks = {}) {
  try {
    const dataView = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const headerLength = (dataView[0] << 24) | (dataView[1] << 16) | (dataView[2] << 8) | dataView[3];
    const headerData = dataView.slice(4, 4 + headerLength);
    const headerText = new TextDecoder().decode(headerData);
    const header = JSON.parse(headerText);
    const chunkData = dataView.slice(4 + headerLength);
    if (header.type === 'file-chunk') {
      if (callbacks.onFileChunk) callbacks.onFileChunk(header.transferId, header.chunkIndex, chunkData, header);
      if (header.isLastChunk && callbacks.onFileTransferComplete) callbacks.onFileTransferComplete(header.transferId);
    } else {
      if (callbacks.onMessage) callbacks.onMessage({ header, data: chunkData });
    }
  } catch (error) {}
}

/**
 * ArrayBuffer转Base64
 */
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Base64转ArrayBuffer
 */
export function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
} 