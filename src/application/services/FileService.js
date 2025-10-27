// FileService - orchestrate file sending via injected safeSend using existing FileTransferManager
// Keeps behavior identical by delegating to FileTransferManager; this service centralizes
// construction and allows future expansion (chunk policy, encryption handling) at app layer.

import FileTransferManager from '../../services/peer/FileTransferManager';
import peerService from '../../services/peerService';
import { encryptionService } from '../../services/encryptionService';
import { EnvelopeVersion, MessageTypes } from '../../shared/messages/envelope';

/**
 * Create a FileService instance.
 * @param {{ safeSend?: (conn:any, data:any)=>boolean }} [deps]
 * @returns {{ sendFile: (connection:any, file:File|Blob, useEncryption:boolean, sharedSecret:any, callbacks?:object)=>Promise<void> }}
 */
export function createFileService(deps = {}) {
  const {
    safeSend = (conn, data) => peerService.sendMessageSafely(conn, data),
    chunkSize,
    paceMs,
    buildMetadata,
    orchestrated,
  } = deps;

  // Gray flag: use service-layer orchestration when enabled; default remains FTM facade
  if (orchestrated) {
    return createFileServiceOrchestrated({ safeSend, chunkSize, paceMs, buildMetadata });
  }

  // single FTM instance per service keeps transfer state (ids/progress) if needed
  const ftm = new FileTransferManager(
    (conn, data) => safeSend(conn, data),
    { chunkSize, paceMs, buildMetadata }
  );

  return {
    async sendFile(connection, file, useEncryption, sharedSecret, callbacks = {}) {
      return ftm.sendFile(connection, file, useEncryption, sharedSecret, callbacks);
    },
  };
}

// Default service using peerService safe sender (suitable for legacy paths)
const defaultFileService = createFileService();
export default defaultFileService;

// ---- Experimental: Orchestrated variant (gray, behavior-compatible) ----

function arrayBufferToBase64(buffer) {
  if (encryptionService?.utils?.arrayBufferToBase64) {
    return encryptionService.utils.arrayBufferToBase64(buffer);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  // jsdom/node fallback
  return typeof window !== 'undefined' && window.btoa ? window.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

/**
 * Orchestrated FileService variant that handles metadata/chunk/pacing at service layer.
 * Not wired as default yet; behavior kept identical to FileTransferManager.sendFile.
 */
export function createFileServiceOrchestrated(deps = {}) {
  const {
    safeSend = (conn, data) => peerService.sendMessageSafely(conn, data),
    chunkSize = 16 * 1024,
    paceMs = 50,
    buildMetadata = defaultBuildMetadata,
  } = deps;

  async function sendFile(connection, file, useEncryption, sharedSecret, callbacks = {}) {
    if (!connection || !file) {
      callbacks.onError?.(new Error('连接或文件不存在'));
      return;
    }

    const transferId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const reader = new FileReader();
    const readPromise = new Promise((resolve, reject) => {
      reader.onload = (ev) => resolve(new Uint8Array(ev.target.result));
      reader.onerror = (err) => reject(err);
    });
    reader.readAsArrayBuffer(file);

    let fileData;
    try {
      fileData = await readPromise;
    } catch (err) {
      console.error('读取文件失败:', err);
      callbacks.onError?.(err);
      return;
    }

    const totalChunks = Math.ceil(fileData.length / chunkSize);
    let sentChunks = 0;

    try {
      // Metadata
      const metadata = buildMetadata({ transferId, file, fileSize: fileData.length, chunksCount: totalChunks });
      const metadataStr = JSON.stringify(metadata);
      if (useEncryption && sharedSecret) {
        const encryptedMetadata = await encryptionService.encrypt(metadataStr, sharedSecret);
        safeSend(connection, encryptedMetadata);
      } else {
        safeSend(connection, metadataStr);
      }

      // Chunks
      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, fileData.length);
        const chunk = fileData.slice(start, end);

        const header = {
          v: EnvelopeVersion,
          type: MessageTypes.FileChunk,
          transferId,
          chunkIndex: index,
          isLastChunk: index === totalChunks - 1,
        };

        if (useEncryption && sharedSecret) {
          const base64Data = arrayBufferToBase64(chunk);
          const encryptedData = await encryptionService.encryptRaw(base64Data, sharedSecret);
          header.encryptedData = encryptedData;
          safeSend(connection, JSON.stringify(header));
        } else {
          const headerBuffer = new TextEncoder().encode(JSON.stringify(header));
          const payload = new Uint8Array(headerBuffer.length + chunk.byteLength + 4);
          payload[0] = (headerBuffer.length >> 24) & 0xFF;
          payload[1] = (headerBuffer.length >> 16) & 0xFF;
          payload[2] = (headerBuffer.length >> 8) & 0xFF;
          payload[3] = headerBuffer.length & 0xFF;
          payload.set(headerBuffer, 4);
          payload.set(new Uint8Array(chunk), 4 + headerBuffer.length);
          safeSend(connection, payload.buffer);
        }

        sentChunks += 1;
        const progress = (sentChunks / totalChunks) * 100;
        callbacks.onProgress?.(transferId, progress);
        await sleep(paceMs);
      }

      callbacks.onComplete?.(transferId);
    } catch (error) {
      console.error('处理文件失败:', error);
      callbacks.onError?.(error);
    }
  }

  return { sendFile };
}
