import { encryptionService } from '../encryptionService';
import { EnvelopeVersion, MessageTypes } from '../../shared/messages/envelope';
/** @typedef {import('../../types/contracts').FileMetadataEnvelope} FileMetadataEnvelope */
/** @typedef {import('../../types/contracts').FileChunkEnvelope} FileChunkEnvelope */
/** @typedef {import('../../types/contracts').EncryptedBinaryEnvelope} EncryptedBinaryEnvelope */
/** @typedef {import('../../types/contracts').SafeSend} SafeSend */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 默认的 metadata 生成策略，保持与历史一致
function defaultBuildMetadata({ transferId, file, fileSize, chunksCount }) {
  return {
    v: EnvelopeVersion,
    type: MessageTypes.FileMetadata,
    transferId,
    fileName: file.name,
    fileType: file.type,
    fileSize,
    chunksCount,
    timestamp: Date.now(),
  };
}

class FileTransferManager {
  /**
   * @param {SafeSend} sendMessageSafely
   * @param {{ chunkSize?: number, paceMs?: number, buildMetadata?: (args:{transferId:string,file:File,fileSize:number,chunksCount:number})=>FileMetadataEnvelope }} [options]
   */
  constructor(sendMessageSafely, options = {}) {
    this.sendMessageSafely = sendMessageSafely;
    this.transfers = {};
    // 策略配置（向后兼容默认值）
    this.chunkSize = typeof options.chunkSize === 'number' && options.chunkSize > 0 ? options.chunkSize : 16 * 1024;
    this.paceMs = typeof options.paceMs === 'number' && options.paceMs >= 0 ? options.paceMs : 50;
    this.buildMetadata = typeof options.buildMetadata === 'function' ? options.buildMetadata : defaultBuildMetadata;
  }

  /**
   * @param {any} connection
   * @param {File} file
   * @param {boolean} useEncryption
   * @param {any} sharedSecret
   * @param {{onProgress?:(id:string,progress:number)=>void,onComplete?:(id:string)=>void,onError?:(err:Error)=>void}} [callbacks]
   */
  async sendFile(connection, file, useEncryption, sharedSecret, callbacks = {}) {
    if (!connection || !file) {
      callbacks.onError?.(new Error('连接或文件不存在'));
      return;
    }

    const transferId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.transfers[transferId] = {
      file,
      sentChunks: 0,
      totalChunks: 0,
      useEncryption,
      callbacks,
    };

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const fileData = new Uint8Array(event.target.result);
        const totalChunks = Math.ceil(fileData.length / this.chunkSize);
        this.transfers[transferId].totalChunks = totalChunks;
        const metadata = this.buildMetadata({ transferId, file, fileSize: fileData.length, chunksCount: totalChunks });
        const metadataStr = JSON.stringify(metadata);

        if (useEncryption && sharedSecret) {
          const encryptedMetadata = await encryptionService.encrypt(metadataStr, sharedSecret);
          this.sendMessageSafely(connection, encryptedMetadata);
        } else {
          this.sendMessageSafely(connection, metadataStr);
        }

        for (let index = 0; index < totalChunks; index += 1) {
          const start = index * this.chunkSize;
          const end = Math.min(start + this.chunkSize, fileData.length);
          const chunk = fileData.slice(start, end);
          await this.sendFileChunk(connection, transferId, index, chunk, useEncryption, sharedSecret);
          await sleep(this.paceMs);
        }
      } catch (error) {
        console.error('处理文件失败:', error);
        callbacks.onError?.(error);
        delete this.transfers[transferId];
      }
    };

    reader.onerror = (error) => {
      console.error('读取文件失败:', error);
      callbacks.onError?.(error);
      delete this.transfers[transferId];
    };

    reader.readAsArrayBuffer(file);
  }

  /**
   * @param {any} connection
   * @param {string} transferId
   * @param {number} chunkIndex
   * @param {ArrayBuffer|Uint8Array} chunkData
   * @param {boolean} useEncryption
   * @param {any} sharedSecret
   */
  async sendFileChunk(connection, transferId, chunkIndex, chunkData, useEncryption, sharedSecret) {
    const transfer = this.transfers[transferId];
    if (!transfer) {
      console.error('文件传输状态不存在:', transferId);
      return;
    }

    try {
      const envelope = {
        v: EnvelopeVersion,
        type: MessageTypes.FileChunk,
        transferId,
        chunkIndex,
        isLastChunk: chunkIndex === transfer.totalChunks - 1,
      };

      if (useEncryption && sharedSecret) {
        const base64Data = this.arrayBufferToBase64(chunkData);
        const encryptedData = await encryptionService.encryptRaw(base64Data, sharedSecret);
        envelope.encryptedData = encryptedData;
        this.sendMessageSafely(connection, JSON.stringify(envelope));
      } else {
        const headerBuffer = new TextEncoder().encode(JSON.stringify(envelope));
        const payload = new Uint8Array(headerBuffer.length + chunkData.byteLength + 4);
        payload[0] = (headerBuffer.length >> 24) & 0xFF;
        payload[1] = (headerBuffer.length >> 16) & 0xFF;
        payload[2] = (headerBuffer.length >> 8) & 0xFF;
        payload[3] = headerBuffer.length & 0xFF;
        payload.set(headerBuffer, 4);
        payload.set(new Uint8Array(chunkData), 4 + headerBuffer.length);
        this.sendMessageSafely(connection, payload.buffer);
      }

      transfer.sentChunks += 1;
      const progress = (transfer.sentChunks / transfer.totalChunks) * 100;
      transfer.callbacks.onProgress?.(transferId, progress);

      if (transfer.sentChunks === transfer.totalChunks) {
        transfer.callbacks.onComplete?.(transferId);
        delete this.transfers[transferId];
      }
    } catch (error) {
      console.error('发送文件块失败:', error);
      transfer.callbacks.onError?.(error);
      delete this.transfers[transferId];
    }
  }

  arrayBufferToBase64(buffer) {
    // Prefer shared utils to avoid direct window dependency in non-browser envs (tests/SSR)
    if (encryptionService?.utils?.arrayBufferToBase64) {
      return encryptionService.utils.arrayBufferToBase64(buffer);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Fallback: window.btoa (browser only)
    return typeof window !== 'undefined' && window.btoa ? window.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  }
}

export default FileTransferManager;
