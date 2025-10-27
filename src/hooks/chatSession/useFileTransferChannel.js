import { useCallback, useMemo, useRef, useState } from 'react';
import peerService from '../../services/peerService';
import { createFileService } from '../../application/services/FileService';
import { createFileReceiveService } from '../../application/services/FileReceiveService';
import { createSafeSender } from '../../utils/safeSend';
import eventBus from '../../shared/eventBus';
import { Events } from '../../shared/events';
import { config } from '../../config';

const revokeUrl = (url) => {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn('撤销预览URL失败:', error);
  }
};

export default function useFileTransferChannel({
  connectionRef,
  peerId,
  targetId,
  finalUseEncryption,
  sharedSecret,
  connectionLost,
  appendMessage,
  updateMessageByTransferId,
  // 可选：统一发送通道（优先 transport.send，回退 peerService.sendMessageSafely）
  sendPayload,
}) {
  const fileServiceRef = useRef(null);
  const fileReceiveServiceRef = useRef(null);
  const telemetryRef = useRef({ count: 0, lastLogAt: 0 });

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileTransferProgress, setFileTransferProgress] = useState(0);
  const [isTransferringFile, setIsTransferringFile] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState({});

  // 旧接收缓冲/拼装分支已移除，统一使用 FileReceiveService

  const handleFileSelect = useCallback(
    (file) => {
      if (!file) return;
      revokeUrl(filePreviewUrl);
      setSelectedFile(file);
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    },
    [filePreviewUrl],
  );

  const clearSelectedFile = useCallback(() => {
    revokeUrl(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileTransferProgress(0);
  }, [filePreviewUrl]);

  const sendFile = useCallback(async () => {
    if (!selectedFile || !connectionRef.current || connectionLost) {
      return;
    }
    setIsTransferringFile(true);
    // 构建发送函数：优先使用外部 sendPayload（通常为 transport.send），回退 peerService.sendMessageSafely
    const onPrimaryError = (err) => {
      const now = Date.now();
      const { lastLogAt } = telemetryRef.current;
      if (now - lastLogAt > 5000) {
        eventBus.emit?.(Events.TELEMETRY_SAFE_SEND, {
          channel: 'file',
          kind: 'primary-error',
          message: String(err?.message || err || ''),
          ts: now,
        });
        if (config?.isDevelopment) {
          console.debug('[fileSafeSend] primary send error, will fallback:', err?.message || err);
        }
        telemetryRef.current.lastLogAt = now;
      }
    };
    const onFallback = () => {
      const now = Date.now();
      const state = telemetryRef.current;
      state.count += 1;
      if (now - state.lastLogAt > 5000) {
        eventBus.emit?.(Events.TELEMETRY_SAFE_SEND, {
          channel: 'file',
          kind: 'fallback',
          count: state.count,
          ts: now,
        });
        if (config?.isDevelopment) {
          console.debug('[fileSafeSend] fallback used. total=', state.count);
        }
        state.lastLogAt = now;
      }
    };
    const safeSend = createSafeSender(
      sendPayload,
      (conn, data) => peerService.sendMessageSafely(conn, data),
      { onPrimaryError, onFallback },
    );

    if (!fileServiceRef.current) {
      fileServiceRef.current = createFileService({
        safeSend: (conn, data) => safeSend(conn, data),
        orchestrated: config?.features?.fileSendOrchestrated === true,
      });
    }

    await fileServiceRef.current.sendFile(
      connectionRef.current,
      selectedFile,
      finalUseEncryption,
      sharedSecret,
      {
        onProgress: (transferId, progress) => {
          setFileTransferProgress(progress);
          setReceivedFiles((prev) => ({
            ...prev,
            [transferId]: { ...(prev[transferId] || {}), progress },
          }));
        },
        onComplete: (transferId) => {
          appendMessage({
            sender: peerId,
            content: `发送了文件: ${selectedFile.name}`,
            isFile: true,
            file: {
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size,
              url: filePreviewUrl,
            },
          });
          clearSelectedFile();
          setIsTransferringFile(false);
          setReceivedFiles((prev) => {
            const nextState = { ...prev };
            delete nextState[transferId];
            return nextState;
          });
        },
        onError: (error, transferId) => {
          console.error('发送文件失败:', error);
          setIsTransferringFile(false);
          if (transferId) {
            setReceivedFiles((prev) => {
              const nextState = { ...prev };
              delete nextState[transferId];
              return nextState;
            });
          }
        },
      },
    );
  }, [appendMessage, clearSelectedFile, connectionLost, connectionRef, finalUseEncryption, peerId, selectedFile, sharedSecret, filePreviewUrl]);

  const ensureReceiveService = useCallback(() => {
    if (!fileReceiveServiceRef.current) {
      if (config?.features && config.features.fileReceiveService === false) {
        console.warn('[fileReceive] 旧回退路径已移除，强制使用 FileReceiveService');
      }
      fileReceiveServiceRef.current = createFileReceiveService({
        onStart: (metadata) => {
          setReceivedFiles((prev) => ({ ...prev, [metadata.transferId]: { progress: 0 } }));
          appendMessage({
            sender: targetId,
            content: `正在接收文件: ${metadata.fileName}`,
            isFileReceiving: true,
            transferId: metadata.transferId,
            file: { name: metadata.fileName, type: metadata.fileType, size: metadata.fileSize },
          });
        },
        onProgress: (id, progress) => setReceivedFiles((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), progress } })),
        onComplete: ({ transferId: id, blob, metadata }) => {
          const url = URL.createObjectURL(blob);
          updateMessageByTransferId(id, (message) => ({
            ...message,
            isFileReceiving: false,
            isFile: true,
            content: `接收了文件: ${metadata.fileName}`,
            file: { ...message.file, url },
          }));
          setReceivedFiles((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), progress: 100 } }));
        },
        onError: (error) => { console.error('文件接收失败:', error); },
      });
    }
    return fileReceiveServiceRef.current;
  }, [appendMessage, targetId, updateMessageByTransferId]);

  const handleFileChunk = useCallback((transferId, chunkIndex, chunkData, header) => {
    const svc = ensureReceiveService();
    svc.handleFileChunk(transferId, chunkIndex, chunkData, header);
  }, [ensureReceiveService]);

  const handleFileTransferComplete = useCallback((transferId) => {
    const svc = ensureReceiveService();
    svc.handleFileTransferComplete(transferId);
  }, [ensureReceiveService]);

  const handleFileMetadata = useCallback((metadata) => {
    const svc = ensureReceiveService();
    svc.handleFileMetadata(metadata);
  }, [ensureReceiveService]);

  const cleanupFileTransfers = useCallback(() => {
    revokeUrl(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileTransferProgress(0);
    setIsTransferringFile(false);
    setReceivedFiles({});
    // no local buffers anymore
  }, [filePreviewUrl]);

  const fileTransferHandlers = useMemo(
    () => ({
      handleFileMetadata,
      handleFileChunk,
      handleFileTransferComplete,
    }),
    [handleFileChunk, handleFileMetadata, handleFileTransferComplete],
  );

  return {
    selectedFile,
    filePreviewUrl,
    fileTransferProgress,
    isTransferringFile,
    receivedFiles,
    handleFileSelect,
    clearSelectedFile,
    sendFile,
    fileTransferHandlers,
    cleanupFileTransfers,
  };
}
