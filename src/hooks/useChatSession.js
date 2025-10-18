import { useEffect, useMemo, useRef, useState } from 'react';
import peerService from '../services/peerService';
import useEncryptionChannel from './chatSession/useEncryptionChannel';
import useFileTransferChannel from './chatSession/useFileTransferChannel';
import useHeartbeatMonitor from './chatSession/useHeartbeatMonitor';
import useMessageLog from './chatSession/useMessageLog';

const CONNECTION_MESSAGE_TYPES = new Set([
  'connection-request',
  'connection-accepted',
  'connection-rejected',
]);

const HEARTBEAT_RESPONSE = 'heartbeat-response';

const normalizeSender = (payload, fallback) => payload.sender ?? fallback ?? 'peer';

const ensurePendingBuffer = () => {
  if (!Array.isArray(window.pendingChatMessages)) {
    window.pendingChatMessages = [];
  }
  return window.pendingChatMessages;
};

const forwardConnectionPayload = (payload) => {
  if (!payload || !CONNECTION_MESSAGE_TYPES.has(payload.type)) {
    return false;
  }
  if (typeof window.connectionHandler === 'function') {
    window.connectionHandler(payload);
  } else {
    ensurePendingBuffer().push(payload);
  }
  return true;
};

const shouldTreatAsFileChunk = (payload) =>
  payload?.type === 'file-chunk' && typeof payload.transferId === 'string' && typeof payload.chunkIndex === 'number';

const createHeartbeatResponse = () => ({
  type: HEARTBEAT_RESPONSE,
  timestamp: Date.now(),
});

const getInitiatorFlag = () => sessionStorage.getItem('isInitiator') === 'true';

const clearTimeoutSafe = (ref) => {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
};

const markConnectionLost = ({ setConnectionLost, setEncryptionStatus, onConnectionLost }) => {
  setConnectionLost(true);
  setEncryptionStatus('连接已断开');
  onConnectionLost?.();
};

const normalizeMessagePayload = (payload, fallbackSender) => ({
  ...payload,
  sender: normalizeSender(payload, fallbackSender),
});

const createReconnectDelay = (attempts) => Math.min(30000, 1000 * 2 ** attempts);

const onHeartbeatTimeout = ({ setConnectionLost, setEncryptionStatus, onConnectionLost }) => {
  setConnectionLost(true);
  setEncryptionStatus('连接已断开');
  onConnectionLost?.();
};

const initChatSessionWindows = (processIncoming) => {
  window.chatSessionHandler = processIncoming;
  if (!Array.isArray(window.pendingChatMessages) || window.pendingChatMessages.length === 0) {
    return;
  }
  const cached = [...window.pendingChatMessages];
  window.pendingChatMessages = [];
  cached.forEach((message) => {
    try {
      processIncoming(message);
    } catch (error) {
      console.error('处理缓存消息失败:', error);
    }
  });
};

const disposeChatSessionWindows = (processIncoming) => {
  if (window.chatSessionHandler === processIncoming) {
    window.chatSessionHandler = null;
  }
};

const createCleanupFn = ({
  heartbeat,
  clearMessages,
  resetEncryption,
  cleanupFileTransfers,
  setMessage,
  setConnectionLost,
  setReconnecting,
  setReconnectAttempts,
  activeConnectionRef,
  reconnectTimeoutRef,
}) => () => {
  heartbeat.stopHeartbeat();
  cleanupFileTransfers();
  clearMessages();
  resetEncryption();
  setMessage('');
  setConnectionLost(false);
  setReconnecting(false);
  setReconnectAttempts(0);
  activeConnectionRef.current = null;
  clearTimeoutSafe(reconnectTimeoutRef);
};

const registerConnectionListeners = ({
  connection,
  processIncoming,
  heartbeat,
  setConnectionLost,
  setEncryptionStatus,
  onConnectionLost,
}) => {
  const handleClose = () => {
    heartbeat.stopHeartbeat();
    markConnectionLost({ setConnectionLost, setEncryptionStatus, onConnectionLost });
  };

  const handleError = (error) => {
    console.error('连接错误:', error);
    heartbeat.stopHeartbeat();
    setConnectionLost(true);
    setEncryptionStatus('连接错误');
    onConnectionLost?.(error);
  };

  if (typeof connection.removeListener === 'function') {
    connection.removeListener('data');
    connection.removeListener('close');
    connection.removeListener('error');
  }

  connection.on('data', processIncoming);
  connection.on('close', handleClose);
  connection.on('error', handleError);

  heartbeat.startHeartbeat();

  return () => {
    if (typeof connection.removeListener === 'function') {
      connection.removeListener('data', processIncoming);
      connection.removeListener('close', handleClose);
      connection.removeListener('error', handleError);
    }
  };
};

const createSendHeartbeatResponse = (connectionRef) => () => {
  const connection = connectionRef.current;
  if (!connection) {
    return;
  }
  peerService.sendMessageSafely(connection, createHeartbeatResponse());
};

const createSendMessage = ({
  message,
  connectionRef,
  connectionLost,
  finalUseEncryption,
  encryptionReady,
  encryptionStateRef,
  peerId,
  appendMessage,
  setMessage,
}) => async () => {
  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }

  const connection = connectionRef.current;
  if (!connection || connectionLost) {
    console.error('发送消息失败: 连接不存在或已断开');
    return;
  }

  const payload = {
    type: 'message',
    sender: peerId,
    content: trimmed,
    timestamp: Date.now(),
  };

  try {
    if (finalUseEncryption) {
      if (!encryptionReady || !encryptionStateRef.current?.isReady?.()) {
        console.error('加密通道尚未就绪，无法发送消息');
        return;
      }
      const encoded = JSON.stringify(payload);
      const encrypted = await encryptionStateRef.current.encryptMessage(encoded);
      if (!encrypted) {
        console.error('加密消息失败');
        return;
      }
      peerService.sendMessageSafely(connection, encrypted);
    } else {
      peerService.sendMessageSafely(connection, payload);
    }
    appendMessage(payload);
    setMessage('');
  } catch (error) {
    console.error('发送消息失败:', error);
  }
};

const createAttemptReconnect = ({ reconnecting, setReconnecting, setReconnectAttempts, reconnectTimeoutRef }) => (
  resetConnection,
) => {
  if (reconnecting) {
    return;
  }
  setReconnecting(true);
  setReconnectAttempts((previous) => {
    const next = previous + 1;
    const delay = createReconnectDelay(previous);
    clearTimeoutSafe(reconnectTimeoutRef);
    reconnectTimeoutRef.current = setTimeout(() => {
      resetConnection?.();
      setReconnecting(false);
    }, delay);
    return next;
  });
};

const createHandleMessagePayload = ({
  handleEncryptionSignal,
  heartbeat,
  sendHeartbeatResponse,
  handleFileMetadata,
  handleFileChunk,
  handleFileTransferComplete,
  appendMessage,
  targetId,
}) => (payload) => {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  if (forwardConnectionPayload(payload)) {
    return;
  }

  if (handleEncryptionSignal(payload)) {
    return;
  }

  if (payload.type === 'heartbeat') {
    heartbeat.markHeartbeat();
    sendHeartbeatResponse();
    return;
  }

  if (payload.type === HEARTBEAT_RESPONSE) {
    heartbeat.markHeartbeat();
    return;
  }

  if (payload.type === 'file-metadata') {
    handleFileMetadata(payload);
    return;
  }

  if (shouldTreatAsFileChunk(payload)) {
    handleFileChunk(payload.transferId, payload.chunkIndex, payload.chunkData ?? payload.data);
    if (payload.isLastChunk) {
      handleFileTransferComplete(payload.transferId);
    }
    return;
  }

  if (payload.type === 'message') {
    appendMessage(normalizeMessagePayload(payload, targetId));
    return;
  }

  appendMessage(normalizeMessagePayload(payload, targetId));
};

const createProcessIncoming = ({
  finalUseEncryption,
  encryptionStateRef,
  handleMessagePayload,
  handleFileMetadata,
  handleFileChunk,
  handleFileTransferComplete,
}) => (incoming) => {
  const currentSecret = encryptionStateRef?.current?.sharedSecret || null;
  peerService.handleReceivedData(incoming, finalUseEncryption, currentSecret, {
    onMessage: handleMessagePayload,
    onFileMetadata: handleFileMetadata,
    onFileChunk: handleFileChunk,
    onFileTransferComplete: handleFileTransferComplete,
  });
};

const useChatSession = ({ connection, peerId, targetId, useEncryption, onConnectionLost }) => {
  const [message, setMessage] = useState('');
  const [connectionLost, setConnectionLost] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const activeConnectionRef = useRef(connection);
  const reconnectTimeoutRef = useRef(null);

  const isInitiator = useMemo(getInitiatorFlag, []);

  const { messages, appendMessage, updateMessageByTransferId, clearMessages } = useMessageLog(peerId);

  const {
    encryptionReady,
    encryptionStatus,
    finalUseEncryption,
    encryptionStateRef,
    sharedSecret,
    handleEncryptionSignal,
    resetEncryption,
    setEncryptionStatus,
  } = useEncryptionChannel({ connection, isInitiator, requestedUseEncryption: useEncryption });

  const heartbeat = useHeartbeatMonitor({
    connectionRef: activeConnectionRef,
    onTimeout: () => onHeartbeatTimeout({ setConnectionLost, setEncryptionStatus, onConnectionLost }),
  });

  const {
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
  } = useFileTransferChannel({
    connectionRef: activeConnectionRef,
    peerId,
    targetId,
    finalUseEncryption,
    sharedSecret,
    connectionLost,
    appendMessage,
    updateMessageByTransferId,
  });

  const { handleFileMetadata, handleFileChunk, handleFileTransferComplete } = fileTransferHandlers;

  const sendHeartbeatResponse = useMemo(
    () => createSendHeartbeatResponse(activeConnectionRef),
    [],
  );

  const handleMessagePayload = useMemo(
    () =>
      createHandleMessagePayload({
        handleEncryptionSignal,
        heartbeat,
        sendHeartbeatResponse,
        handleFileMetadata,
        handleFileChunk,
        handleFileTransferComplete,
        appendMessage,
        targetId,
      }),
    [
      appendMessage,
      handleEncryptionSignal,
      handleFileChunk,
      handleFileMetadata,
      handleFileTransferComplete,
      heartbeat,
      sendHeartbeatResponse,
      targetId,
    ],
  );

  const processIncoming = useMemo(
    () =>
      createProcessIncoming({
        finalUseEncryption,
        encryptionStateRef,
        handleMessagePayload,
        handleFileMetadata,
        handleFileChunk,
        handleFileTransferComplete,
      }),
    [
      finalUseEncryption,
      handleFileMetadata,
      handleFileChunk,
      handleFileTransferComplete,
      handleMessagePayload,
    ],
  );

  const sendMessage = useMemo(
    () =>
      createSendMessage({
        message,
        connectionRef: activeConnectionRef,
        connectionLost,
        finalUseEncryption,
        encryptionReady,
        encryptionStateRef,
        peerId,
        appendMessage,
        setMessage,
      }),
    [appendMessage, connectionLost, encryptionReady, finalUseEncryption, message, peerId],
  );

  const attemptReconnect = useMemo(
    () =>
      createAttemptReconnect({
        reconnecting,
        setReconnecting,
        setReconnectAttempts,
        reconnectTimeoutRef,
      }),
    [reconnecting],
  );

  const cleanup = useMemo(
    () =>
      createCleanupFn({
        heartbeat,
        clearMessages,
        resetEncryption,
        cleanupFileTransfers,
        setMessage,
        setConnectionLost,
        setReconnecting,
        setReconnectAttempts,
        activeConnectionRef,
        reconnectTimeoutRef,
      }),
    [heartbeat, clearMessages, resetEncryption, cleanupFileTransfers],
  );

  useEffect(() => {
    initChatSessionWindows(processIncoming);
    return () => disposeChatSessionWindows(processIncoming);
  }, [processIncoming]);

  useEffect(() => {
    activeConnectionRef.current = connection;
    if (!connection || typeof connection.on !== 'function') {
      return undefined;
    }

    setConnectionLost(false);

    const unregister = registerConnectionListeners({
      connection,
      processIncoming,
      heartbeat,
      setConnectionLost,
      setEncryptionStatus,
      onConnectionLost,
    });

    return () => {
      unregister?.();
      heartbeat.stopHeartbeat();
      clearTimeoutSafe(reconnectTimeoutRef);
    };
  }, [connection, heartbeat, onConnectionLost, processIncoming, setEncryptionStatus]);

  return {
    message,
    messages,
    encryptionReady,
    encryptionStatus,
    connectionLost,
    reconnecting,
    reconnectAttempts,
    finalUseEncryption,
    isEncryptionEnabled: finalUseEncryption && encryptionReady,
    selectedFile,
    filePreviewUrl,
    fileTransferProgress,
    isTransferringFile,
    receivedFiles,
    setMessage,
    sendMessage,
    attemptReconnect,
    cleanup,
    handleFileSelect,
    clearSelectedFile,
    sendFile,
  };
};

export default useChatSession;
