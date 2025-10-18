import { encryptionService } from '../encryptionService';

const parseJson = (payload) => {
  try {
    return JSON.parse(payload);
  } catch (error) {
    return null;
  }
};

const ensureCallbacks = (callbacks) => ({
  onMessage: callbacks.onMessage || (() => {}),
  onFileMetadata: callbacks.onFileMetadata || (() => {}),
  onFileChunk: callbacks.onFileChunk || (() => {}),
  onFileTransferComplete: callbacks.onFileTransferComplete || (() => {}),
});

const decodeBinaryToText = (data) => {
  try {
    const view = data instanceof Uint8Array ? data : new Uint8Array(data);
    return new TextDecoder().decode(view);
  } catch (error) {
    console.error('无法将二进制数据解码为文本:', error);
    return null;
  }
};

class MessageRouter {
  async handle(data, useEncryption, sharedSecret, callbacks = {}) {
    const safeCallbacks = ensureCallbacks(callbacks);

    if (typeof data === 'string') {
      await this.handleStringData(data, useEncryption, sharedSecret, safeCallbacks);
      return;
    }

    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      this.handleBinaryData(data, safeCallbacks);
      return;
    }

    if (typeof data === 'object' && data?.type === 'file-chunk') {
      await this.handleChunkObject(data, useEncryption, sharedSecret, safeCallbacks);
      return;
    }

    safeCallbacks.onMessage(data);
  }

  async handleStringData(data, useEncryption, sharedSecret, callbacks) {
    const json = parseJson(data);
    if (!json) {
      callbacks.onMessage({ type: 'message', content: data, timestamp: Date.now() });
      return;
    }

    if (json.type === 'encrypted-message') {
      await this.handleEncryptedMessage(json, sharedSecret, callbacks);
      return;
    }

    if (json.type === 'file-metadata') {
      callbacks.onFileMetadata(json);
      return;
    }

    if (json.type === 'file-chunk') {
      await this.handleChunkObject(json, useEncryption, sharedSecret, callbacks);
      return;
    }

    callbacks.onMessage(json);
  }

  async handleEncryptedMessage(payload, sharedSecret, callbacks) {
    try {
      const decrypted = await encryptionService.decrypt(payload, sharedSecret);
      if (!decrypted) {
        console.error('解密返回为空，忽略此消息');
        return;
      }
      const message = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
      if (message.type === 'file-metadata') {
        callbacks.onFileMetadata(message);
        return;
      }
      callbacks.onMessage(message);
    } catch (error) {
      console.error('解密失败:', error);
    }
  }

  async handleChunkObject(payload, useEncryption, sharedSecret, callbacks) {
    try {
      if (payload.encryptedData && useEncryption && sharedSecret) {
        const encryptedPayload =
          typeof payload.encryptedData === 'string'
            ? JSON.parse(payload.encryptedData)
            : payload.encryptedData;
        const decryptedBase64 = await encryptionService.decryptRaw(encryptedPayload, sharedSecret);
        if (!decryptedBase64) {
          console.error('文件块解密返回为空');
          return;
        }
        const chunkData = encryptionService.utils.base64ToArrayBuffer(decryptedBase64);
        callbacks.onFileChunk(payload.transferId, payload.chunkIndex, chunkData, payload);
        if (payload.isLastChunk) {
          callbacks.onFileTransferComplete(payload.transferId);
        }
      } else if (!payload.encryptedData && !useEncryption) {
        callbacks.onFileChunk(payload.transferId, payload.chunkIndex, payload.chunkData, payload);
        if (payload.isLastChunk) {
          callbacks.onFileTransferComplete(payload.transferId);
        }
      } else {
        console.log('file-chunk消息缺少必要的数据字段');
      }
    } catch (error) {
      console.error('文件块处理失败:', error);
    }
  }

  handleBinaryData(data, callbacks) {
    const view = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

    if (view.length >= 4) {
      const headerLength = (view[0] << 24) | (view[1] << 16) | (view[2] << 8) | view[3];
      const hasValidHeader = Number.isFinite(headerLength) && headerLength >= 0 && headerLength <= view.length - 4;

      if (hasValidHeader) {
        try {
          const headerText = new TextDecoder().decode(view.slice(4, 4 + headerLength));
          const header = JSON.parse(headerText);
          const chunkData = view.slice(4 + headerLength);

          if (header.type === 'file-chunk') {
            callbacks.onFileChunk(header.transferId, header.chunkIndex, chunkData, header);
            if (header.isLastChunk) {
              callbacks.onFileTransferComplete(header.transferId);
            }
            return;
          }

          if (chunkData.length === 0) {
            callbacks.onMessage(header);
            return;
          }

          const chunkText = decodeBinaryToText(chunkData);
          if (chunkText) {
            const json = parseJson(chunkText);
            if (json) {
              callbacks.onMessage({ ...header, ...json });
              return;
            }
            callbacks.onMessage({ ...header, data: chunkText });
            return;
          }

          callbacks.onMessage(header);
          return;
        } catch (error) {
          console.error('处理二进制文件块失败，尝试回退为文本消息:', error);
        }
      }
    }

    const decoded = decodeBinaryToText(view);
    if (!decoded) {
      return;
    }

    const json = parseJson(decoded);
    if (json) {
      callbacks.onMessage(json);
      return;
    }

    callbacks.onMessage({ type: 'message', content: decoded, timestamp: Date.now() });
  }
}

export default MessageRouter;
