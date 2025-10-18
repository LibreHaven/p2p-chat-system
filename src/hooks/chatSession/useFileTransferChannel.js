import { useCallback, useMemo, useRef, useState } from 'react';
import peerService from '../../services/peerService';

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
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileTransferProgress, setFileTransferProgress] = useState(0);
  const [isTransferringFile, setIsTransferringFile] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState({});

  const fileChunksRef = useRef({});
  const fileChunksBufferRef = useRef({});
  const transferCompleteBufferRef = useRef(new Set());

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
    await peerService.sendFile(
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

  const handleFileChunk = useCallback((transferId, chunkIndex, chunkData) => {
    const transferState = fileChunksRef.current[transferId];
    if (!transferState) {
      if (!fileChunksBufferRef.current[transferId]) {
        fileChunksBufferRef.current[transferId] = {};
      }
      fileChunksBufferRef.current[transferId][chunkIndex] = chunkData;
      return;
    }

    transferState.chunks[chunkIndex] = chunkData;
    transferState.receivedChunks += 1;
    const progress = (transferState.receivedChunks / transferState.metadata.chunksCount) * 100;
    setReceivedFiles((prev) => ({
      ...prev,
      [transferId]: { ...(prev[transferId] || {}), progress },
    }));
  }, []);

  const handleFileTransferComplete = useCallback(
    (transferId) => {
      const transferState = fileChunksRef.current[transferId];
      if (!transferState) {
        transferCompleteBufferRef.current.add(transferId);
        return;
      }
      const { metadata, chunks } = transferState;
      for (const chunk of chunks) {
        if (!chunk || typeof chunk.byteLength !== 'number') {
          console.error('缺少或无效的文件块，无法完成传输:', transferId);
          return;
        }
      }
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const fileData = new Uint8Array(totalLength);
      let offset = 0;
      chunks.forEach((chunk) => {
        const array = new Uint8Array(chunk);
        fileData.set(array, offset);
        offset += array.byteLength;
      });
      const blob = new Blob([fileData], { type: metadata.fileType });
      const url = URL.createObjectURL(blob);

      updateMessageByTransferId(transferId, (message) => ({
        ...message,
        isFileReceiving: false,
        isFile: true,
        content: `接收了文件: ${metadata.fileName}`,
        file: { ...message.file, url },
      }));

      delete fileChunksRef.current[transferId];
      setReceivedFiles((prev) => ({
        ...prev,
        [transferId]: { ...(prev[transferId] || {}), progress: 100 },
      }));
    },
    [updateMessageByTransferId],
  );

  const handleFileMetadata = useCallback(
    (metadata) => {
      fileChunksRef.current[metadata.transferId] = {
        metadata,
        chunks: new Array(metadata.chunksCount),
        receivedChunks: 0,
      };

      const buffered = fileChunksBufferRef.current[metadata.transferId];
      if (buffered) {
        Object.entries(buffered).forEach(([index, chunk]) => {
          fileChunksRef.current[metadata.transferId].chunks[index] = chunk;
          fileChunksRef.current[metadata.transferId].receivedChunks += 1;
        });
        delete fileChunksBufferRef.current[metadata.transferId];
      }

      setReceivedFiles((prev) => ({
        ...prev,
        [metadata.transferId]: { progress: 0 },
      }));

      if (transferCompleteBufferRef.current.has(metadata.transferId)) {
        transferCompleteBufferRef.current.delete(metadata.transferId);
        setTimeout(() => handleFileTransferComplete(metadata.transferId), 100);
      }

      appendMessage({
        sender: targetId,
        content: `正在接收文件: ${metadata.fileName}`,
        isFileReceiving: true,
        transferId: metadata.transferId,
        file: {
          name: metadata.fileName,
          type: metadata.fileType,
          size: metadata.fileSize,
        },
      });
    },
    [appendMessage, handleFileTransferComplete, targetId],
  );

  const cleanupFileTransfers = useCallback(() => {
    revokeUrl(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileTransferProgress(0);
    setIsTransferringFile(false);
    setReceivedFiles({});
    fileChunksRef.current = {};
    fileChunksBufferRef.current = {};
    transferCompleteBufferRef.current = new Set();
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
