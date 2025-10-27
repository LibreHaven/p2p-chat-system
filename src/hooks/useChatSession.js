import { useEffect, useMemo, useRef, useState } from 'react';
import peerService from '../services/peerService';
import MessageRouter from '../services/peer/MessageRouter';
import { createEnvelope, MessageTypes } from '../shared/messages/envelope';
import useChatSessionStore from '../shared/store/chatSessionStore';
import useEncryptionChannel from './chatSession/useEncryptionChannel';
import useFileTransferChannel from './chatSession/useFileTransferChannel';
import useHeartbeatMonitor from './chatSession/useHeartbeatMonitor';
import useMessageLog from './chatSession/useMessageLog';
import eventBus from '../shared/eventBus';
import { Events } from '../shared/events';
// storage 不再用于 isInitiator 读取，由 Store 主导
import PeerConnectionTransport from '../infrastructure/transport/PeerConnectionTransport';
import { createSafeSender } from '../utils/safeSend';
import { config } from '../config';
import attachStatusChangeTelemetry from '../observability/statusChangeTracker';

const CONNECTION_MESSAGE_TYPES = new Set([
  'connection-request',
  'connection-accepted',
  'connection-rejected',
]);

const HEARTBEAT_RESPONSE = 'heartbeat-response';

const normalizeSender = (payload, fallback) => payload.sender ?? fallback ?? 'peer';

const forwardConnectionPayload = (payload) => {
  if (!payload || !CONNECTION_MESSAGE_TYPES.has(payload.type)) {
    return false;
  }
  eventBus.emit(Events.CONNECTION_INCOMING, payload);
  return true;
};

const shouldTreatAsFileChunk = (payload) =>
  payload?.type === 'file-chunk' && typeof payload.transferId === 'string' && typeof payload.chunkIndex === 'number';

const createHeartbeatResponse = () => ({
  type: HEARTBEAT_RESPONSE,
  timestamp: Date.now(),
});


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

import computeReconnectDelay from '../utils/reconnect';

const onHeartbeatTimeout = ({ setConnectionLost, setEncryptionStatus, onConnectionLost }) => {
  setConnectionLost(true);
  setEncryptionStatus('连接已断开');
  onConnectionLost?.();
};

// 事件总线模式不再需要 window.* 全局桥接

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

const createSendHeartbeatResponse = (connectionRef, transportRef, safeSend) => () => {
  // 优先使用 DataConnection；若缺失则尝试使用 transport 关联的底层连接
  const connection = connectionRef.current || transportRef.current?.conn || null;
  if (!connection) return;
  const payload = createHeartbeatResponse();
  safeSend(connection, payload);
};

  const createSendMessage = ({
  message,
  connectionRef,
  transportRef,
  connectionLost,
  finalUseEncryption,
  encryptionReady,
  encryptionStateRef,
  peerId,
  appendMessage,
  setMessage,
  safeSend,
}) => async () => {
  const trimmed = message.trim();
  if (!trimmed) return;

    // 只在连接被判定为“已断开”时阻止发送；
    // 允许在没有 DataConnection 引用时（transport 灰度）依然通过 safeSend 发送。
    if (connectionLost) {
      console.error('发送消息失败: 连接已断开');
      return;
    }
    // 兜底选择：优先 DataConnection；否则回退到 transport 的底层连接，避免 fallback 路径拿到 null
    const connection = connectionRef.current || transportRef.current?.conn || null;

  const payload = {
    type: MessageTypes.Message,
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
      const envelope = createEnvelope(MessageTypes.Message, payload);
      const encoded = JSON.stringify(envelope);
      const encrypted = await encryptionStateRef.current.encryptMessage(encoded);
      if (!encrypted) {
        console.error('加密消息失败');
        return;
      }
      safeSend(connection, encrypted);
    } else {
      const envelope = createEnvelope(MessageTypes.Message, payload);
      safeSend(connection, envelope);
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
    const delay = computeReconnectDelay(previous);
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
}) => {
  const router = new MessageRouter();
  return (incoming) => {
    const currentSecret = encryptionStateRef?.current?.sharedSecret || null;
    router.handle(incoming, finalUseEncryption, currentSecret, {
      onMessage: handleMessagePayload,
      onFileMetadata: handleFileMetadata,
      onFileChunk: handleFileChunk,
      onFileTransferComplete: handleFileTransferComplete,
    });
  };
};

const useChatSession = ({ connection, peerId, targetId, useEncryption, onConnectionLost }) => {
  const [message, setMessage] = useState('');
  const [connectionLost, setConnectionLost] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // 将连接相关状态同步到全局会话 Store（渐进式统一）
  const setStoreConnectionLost = useChatSessionStore((s) => s.setConnectionLost);
  const setStoreReconnecting = useChatSessionStore((s) => s.setReconnecting);
  const setStoreReconnectAttempts = useChatSessionStore((s) => s.setReconnectAttempts);

  const activeConnectionRef = useRef(connection);
  const transportRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const safeSendFallbacksRef = useRef({ count: 0, lastLogAt: 0 });

  const isInitiator = useChatSessionStore((s) => s.isInitiator);

  // 统一发送器：优先 transport.send，失败/缺失时回退 peerService.sendMessageSafely
  const safeSend = useMemo(() => {
    const onPrimaryError = (err) => {
      // 轻量可观测：仅在开发或偶尔打印
      const now = Date.now();
      const { lastLogAt } = safeSendFallbacksRef.current;
      if (now - lastLogAt > 5000) {
        // 每 5s 至多一次
        eventBus.emit?.(Events.TELEMETRY_SAFE_SEND, {
          channel: 'session',
          kind: 'primary-error',
          message: String(err?.message || err || ''),
          ts: now,
        });
        if (config?.isDevelopment) {
          // 开发期可见
          console.debug('[safeSend] primary send error, will fallback:', err?.message || err);
        }
        safeSendFallbacksRef.current.lastLogAt = now;
      }
    };
    const onFallback = () => {
      const now = Date.now();
      const state = safeSendFallbacksRef.current;
      state.count += 1;
      if (now - state.lastLogAt > 5000) {
        eventBus.emit?.(Events.TELEMETRY_SAFE_SEND, {
          channel: 'session',
          kind: 'fallback',
          count: state.count,
          ts: now,
        });
        if (config?.isDevelopment) {
          console.debug('[safeSend] fallback used. total=', state.count);
        }
        state.lastLogAt = now;
      }
    };
    return createSafeSender(
      (_conn, data) => {
        const t = transportRef.current;
        if (t?.send) return t.send(data);
        // 无可用 transport 时，返回 falsy 以触发安全回退到 peerService（将使用调用方传入的 conn）
        return false;
      },
      (conn, data) => peerService.sendMessageSafely(conn, data),
      { onPrimaryError, onFallback },
    );
  }, []);

  const { messages, appendMessage, updateMessageByTransferId, clearMessages } = useMessageLog(peerId);

  const {
    encryptionReady,
    encryptionStatus,
    // finalUseEncryption is now read from Store to unify read path
    encryptionStateRef,
    sharedSecret,
    handleEncryptionSignal,
    resetEncryption,
    setEncryptionStatus,
  } = useEncryptionChannel({ connection, isInitiator, requestedUseEncryption: useEncryption, sendPayload: (conn, data) => safeSend(conn, data) });

  // Read final encryption decision from Store (single source of truth)
  const finalUseEncryption = useChatSessionStore((s) => s.finalUseEncryption);

  const heartbeat = useHeartbeatMonitor({
    connectionRef: activeConnectionRef,
    onTimeout: () => onHeartbeatTimeout({ setConnectionLost, setEncryptionStatus, onConnectionLost }),
    sendPayload: (conn, data) => safeSend(conn, data),
  });

  // safeSend 已上移，供加密/心跳/文件等通道共用

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
    sendPayload: (conn, data) => safeSend(conn, data),
  });

  const { handleFileMetadata, handleFileChunk, handleFileTransferComplete } = fileTransferHandlers;

  const sendHeartbeatResponse = useMemo(
    () => createSendHeartbeatResponse(activeConnectionRef, transportRef, safeSend),
    [safeSend],
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
        transportRef,
        connectionLost,
        finalUseEncryption,
        encryptionReady,
        encryptionStateRef,
        peerId,
        appendMessage,
        setMessage,
        safeSend,
      }),
    [appendMessage, connectionLost, encryptionReady, finalUseEncryption, message, peerId, safeSend],
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

  // 事件总线不再用于聊天消息输入，避免与直接连接监听重复导致消息显示两遍

  // 同步本地状态到全局 Store
  useEffect(() => {
    setStoreConnectionLost(connectionLost);
  }, [connectionLost]);

  useEffect(() => {
    setStoreReconnecting(reconnecting);
  }, [reconnecting]);

  useEffect(() => {
    setStoreReconnectAttempts(reconnectAttempts);
  }, [reconnectAttempts]);

  useEffect(() => {
    activeConnectionRef.current = connection;
    transportRef.current = null;
    if (!connection || typeof connection.on !== 'function') {
      return undefined;
    }

    setConnectionLost(false);

    try {
      const transport = new PeerConnectionTransport(connection);
      transportRef.current = transport;

      // telemetry: status change tracking for session-level transport
      attachStatusChangeTelemetry({ transport, where: 'session' });

      const offMsg = transport.on('message', processIncoming);
      const offClose = transport.on('close', () => {
        heartbeat.stopHeartbeat();
        markConnectionLost({ setConnectionLost, setEncryptionStatus, onConnectionLost });
        // telemetry: connection closed
        eventBus.emit?.(Events.TELEMETRY_CONNECTION, { where: 'session', type: 'close', ts: Date.now() });
      });
      const offErr = transport.on('error', (error) => {
        console.error('连接错误:', error);
        heartbeat.stopHeartbeat();
        setConnectionLost(true);
        setEncryptionStatus('连接错误');
        onConnectionLost?.(error);
        // telemetry: connection error
        eventBus.emit?.(Events.TELEMETRY_CONNECTION, { where: 'session', type: 'error', ts: Date.now(), message: String(error?.message || error || '') });
      });

      heartbeat.startHeartbeat();

      return () => {
        offMsg?.(); offClose?.(); offErr?.();
        heartbeat.stopHeartbeat();
        clearTimeoutSafe(reconnectTimeoutRef);
      };
    } catch (e) {
      console.warn('[useChatSession] 初始化 PeerConnectionTransport 失败，回退原有监听:', e?.message || e);
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
    }
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
