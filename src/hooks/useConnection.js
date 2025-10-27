import { useState, useEffect, useCallback, useRef } from 'react';
import peerService from '../services/peerService';
import PeerTransport from '../infrastructure/transport/PeerTransport';
import PeerConnectionTransport from '../infrastructure/transport/PeerConnectionTransport';
import { createSafeSender } from '../utils/safeSend';
// import { encryptionService } from '../services/encryptionService';
import useConnectionToasts from './connection/useConnectionToasts';
import useConnectionValidation from './connection/useConnectionValidation';
import generateDisplayId from '../utils/generateDisplayId';
import eventBus from '../shared/eventBus';
import { Events } from '../shared/events';
import attachStatusChangeTelemetry from '../observability/statusChangeTracker';
import useChatSessionStore from '../shared/store/chatSessionStore';
import storage from '../shared/storage/session';
// import { createEnvelope, MessageTypes } from '../shared/messages/envelope';
import { scheduleAcceptanceTimeout } from './connection/connectionLifecycleHelpers';
import { startConnectionRequestFlow, acceptIncomingConnectionFlow, rejectIncomingConnectionFlow, handleRemoteCloseFlow, handleRemoteErrorFlow, handleIncomingConnectionData } from '../application/services/ConnectionService';

const useConnection = ({
  peerId,
  setPeerId: _setPeerId,
  setMessages,
  onConnectionSuccess,
  onConnectionError: _onConnectionError
}) => {
  // 连接状态
  const [peer, setPeer] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [connectionTimeout, setConnectionTimeout] = useState(null);
  const [showConnectionRequest, setShowConnectionRequest] = useState(false);
  const [incomingConnection, setIncomingConnection] = useState(null);
  const [incomingPeerId, setIncomingPeerId] = useState('');
  const [waitingForAcceptance, setWaitingForAcceptance] = useState(false);
  const [isPeerCreated, setIsPeerCreated] = useState(false);
  
  // 在 hook 内部管理 targetId 状态
  const [targetId, setTargetId] = useState('');
  
  // 加密状态
  const [useEncryption, setUseEncryption] = useState(true);
  const [incomingUseEncryption, setIncomingUseEncryption] = useState(false);
  
  // 验证和错误处理
  const { customIdError, targetIdError, validateCustomId, validateTargetId, setCustomIdError, setTargetIdError } = useConnectionValidation();
  const { showToast, toastMessage, displayToast } = useConnectionToasts();
  
  // 引用
  const reconnectTimeoutRef = useRef(null);
  const encryptionReadyConfirmationTimeoutRef = useRef(null);
  const currentIncomingConnectionRef = useRef(null);
  const activeConnectionRef = useRef(null);
  const incomingTransportRef = useRef(null);
  const outgoingTransportRef = useRef(null);
  // 移除未使用的重试计数，保留最小引用集

  // Store 同步：最终协商的加密开关写入全局 Store，供会话层与 UI 读取
  const setStoreFinalUseEncryption = useChatSessionStore((s) => s.setFinalUseEncryption);
  const setStoreIsInitiator = useChatSessionStore((s) => s.setIsInitiator);
  const storeIsInitiator = useChatSessionStore((s) => s.isInitiator);
  
  // 显示 Toast 消息
  // 生成随机ID
  const generateRandomId = useCallback(() => generateDisplayId(), []);
  
  // 处理接收到的数据
  const handleReceivedData = useCallback((data) => {
    console.log('useConnection handleReceivedData - Received data:', data);
    const res = handleIncomingConnectionData({
      setIncomingConnection,
      setIncomingPeerId,
      setIncomingUseEncryption,
      setShowConnectionRequest,
      setWaitingForAcceptance,
      setConnectionStatus,
      storage,
      setStoreFinalUseEncryption,
      onConnectionSuccess,
      activeConnection: activeConnectionRef.current,
      targetId,
      displayToast,
    }, data);

    // 非连接类消息由会话层 useChatSession 直接从连接/transport 接收并处理，
    // 这里不再通过事件总线转发，避免重复处理导致消息显示两遍。
    // if (!res?.handled) { /* no-op */ }
  }, [targetId, onConnectionSuccess, displayToast, setStoreFinalUseEncryption]);
  
  // 订阅连接类消息：useChatSession 会通过事件总线转发 connection-* 类型
  useEffect(() => {
  const off = eventBus.on(Events.CONNECTION_INCOMING, handleReceivedData);
    return () => off?.();
  }, [handleReceivedData]);

  // 移除 CHAT_OUTGOING 代理发送：会话层已具备安全回退发送能力，无需双通道

  // 创建 Peer 连接
  const createPeerConnection = useCallback(() => {
    if (!peerId) {
      setCustomIdError('请输入有效的ID');
      return;
    }
    
    if (!validateCustomId(peerId)) return;
    
    setConnectionStatus('connecting');
    
    const peer = peerService.createPeer(peerId, {
      onOpen: (id) => {
        console.log('Peer连接已建立，ID:', id);
        setIsPeerCreated(true);
        setConnectionStatus('connected');
        storage.setItem('peerId', id);
      },
      onError: (error) => {
        console.error('Peer 连接错误:', error);
        setConnectionStatus('failed');
        
        // 检查是否是 ID 冲突错误
        if (error.message && error.message.includes('is taken')) {
          // ID冲突时不重置连接状态，避免重试
          setCustomIdError(`ID "${peerId}" 已被占用，请尝试其他ID或使用随机ID`);
          const suggestedId = generateRandomId();
          displayToast(`ID已被占用，建议使用: ${suggestedId}`);
        } else {
          // 只有非ID冲突错误才重置连接状态，为重试做准备
          peerService.resetConnectionState();
          
          if (error.message && error.message.includes('无法连接到PeerJS服务器')) {
            displayToast('无法连接到服务器，请检查网络连接后重试');
          } else {
            displayToast('连接失败，请重试');
          }
        }
      },
      onConnection: (conn) => {
        console.log('收到连接请求:', conn.peer);
        // 使用接入层 transport 统一接线（灰度路径），外部行为不变
        try {
          const transport = new PeerConnectionTransport(conn);
          incomingTransportRef.current = transport;
          // 将活动连接指向该传入连接，供后续消息处理与接受流程使用
          activeConnectionRef.current = conn;
          // telemetry: status change tracking for incoming connection
          attachStatusChangeTelemetry({ transport, where: 'connection:incoming' });
          transport.on('open', () => {
            console.log('[PeerConnectionTransport] 接收方连接已打开');
            eventBus.emit?.(Events.TELEMETRY_CONNECTION, { where: 'connection:incoming', type: 'open', ts: Date.now() });
          });
          transport.on('message', (data) => {
            console.log('[PeerConnectionTransport] 接收方收到数据:', data);
            handleReceivedData(data);
          });
          transport.on('close', () => {
            console.log('[PeerConnectionTransport] 接收方连接已关闭');
            eventBus.emit?.(Events.TELEMETRY_CONNECTION, { where: 'connection:incoming', type: 'close', ts: Date.now() });
          });
          transport.on('error', (error) => {
            console.error('[PeerConnectionTransport] 接收方连接错误:', error);
            eventBus.emit?.(Events.TELEMETRY_CONNECTION, { where: 'connection:incoming', type: 'error', ts: Date.now(), message: String(error?.message || error || '') });
          });
        } catch (e) {
          console.warn('[PeerConnectionTransport] 初始化失败，使用原有监听器回退:', e?.message || e);
          peerService.setupDataConnectionListeners(conn, {
            onData: (data) => {
              console.log('接收方收到数据:', data);
              handleReceivedData(data);
            },
            onOpen: () => {
              console.log('接收方连接已打开');
            },
            onClose: () => {
              console.log('接收方连接已关闭');
            },
            onError: (error) => {
              console.error('接收方连接错误:', error);
            }
          });
        }
        
        // 仅更新引用，等待真正的 connection-request 消息到达后再展示弹窗
        currentIncomingConnectionRef.current = conn;
      },
      onDisconnected: () => {
        console.log('Peer 连接已断开');
        setConnectionStatus('disconnected');
      },
      onClose: () => {
        console.log('Peer 连接已关闭');
        setConnectionStatus('closed');
        setIsPeerCreated(false);
      }
    });
    
    setPeer(peer);
  }, [peerId, validateCustomId, generateRandomId, displayToast, handleReceivedData]);
  
  // 连接到目标Peer
  const connectToPeer = useCallback(() => {
    if (!peer) {
      displayToast('请先创建自己的 Peer 连接');
      return;
    }
    
    if (!targetId) {
      setTargetIdError('请输入目标ID');
      return;
    }
    if (!validateTargetId(targetId)) return;
    
    setConnectionStatus('connecting');
  setWaitingForAcceptance(true);
  storage.setItem('isInitiator', 'true');
  setStoreIsInitiator(true);
  storage.setBool('useEncryption', !!useEncryption);
    
    const wireListeners = (connLike) => {
      activeConnectionRef.current = connLike;
      peerService.setupDataConnectionListeners(connLike, {
      onOpen: () => {
        console.log('数据连接已打开，发送连接请求');
        console.log('发起方发送的加密状态:', useEncryption);
        const primary = (_c, data) => outgoingTransportRef.current?.send?.(data);
        const fallback = (c, data) => peerService.sendMessageSafely(c, data);
        const safeSend = createSafeSender(primary, fallback);
        const timeoutId = startConnectionRequestFlow(safeSend, connLike, {
          peerId,
          useEncryption: !!useEncryption,
          waitingForAcceptanceGetter: () => waitingForAcceptance,
          setWaitingForAcceptance,
          setConnectionStatus,
          displayToast,
          scheduleAcceptanceTimeout,
          timeoutMs: 30000,
        });
        setConnectionTimeout(timeoutId);
      },
      onData: (data) => {
        console.log('发起方收到数据:', data);
        handleReceivedData(data);
      },
      onClose: () => {
        console.log('连接已关闭');
        handleRemoteCloseFlow({ setConnectionStatus, setWaitingForAcceptance });
      },
      onError: (error) => {
        console.error('连接错误:', error);
        handleRemoteErrorFlow({ setConnectionStatus, setWaitingForAcceptance, displayToast });
      }
      });
    };
    
    const wireTransportListeners = (transport) => {
      outgoingTransportRef.current = transport;
      const onOpen = () => {
        console.log('[PeerTransport] 数据连接已打开');
  eventBus.emit?.(Events.TELEMETRY_CONNECTION, { where: 'connection:outgoing', type: 'open', ts: Date.now() });
        console.log('发起方发送的加密状态:', useEncryption);
        const connLike = transport.conn;
        activeConnectionRef.current = connLike;
        const primary = (_c, data) => transport.send?.(data);
        const fallback = (c, data) => peerService.sendMessageSafely(c, data);
        const safeSend = createSafeSender(primary, fallback);
        const timeoutId = startConnectionRequestFlow(safeSend, connLike, {
          peerId,
          useEncryption: !!useEncryption,
          waitingForAcceptanceGetter: () => waitingForAcceptance,
          setWaitingForAcceptance,
          setConnectionStatus,
          displayToast,
          scheduleAcceptanceTimeout,
          timeoutMs: 30000,
        });
        setConnectionTimeout(timeoutId);
      };
      const onMessage = (data) => {
        console.log('[PeerTransport] 收到数据:', data);
        handleReceivedData(data);
      };
      const onClose = () => {
        console.log('[PeerTransport] 连接已关闭');
  eventBus.emit?.(Events.TELEMETRY_CONNECTION, { where: 'connection:outgoing', type: 'close', ts: Date.now() });
        handleRemoteCloseFlow({ setConnectionStatus, setWaitingForAcceptance });
      };
      const onError = (error) => {
        console.error('[PeerTransport] 连接错误:', error);
  eventBus.emit?.(Events.TELEMETRY_CONNECTION, { where: 'connection:outgoing', type: 'error', ts: Date.now(), message: String(error?.message || error || '') });
        handleRemoteErrorFlow({ setConnectionStatus, setWaitingForAcceptance, displayToast });
      };
      // 绑定事件，并提供解绑定以备未来清理使用（当前保持一致行为，组件卸载时 reset 状态即可）
      transport.on('open', onOpen);
      transport.on('message', onMessage);
      transport.on('close', onClose);
      transport.on('error', onError);
      // telemetry: status change tracking for outgoing connection
      attachStatusChangeTelemetry({ transport, where: 'connection:outgoing' });
    };

    // 灰度接入 PeerTransport：优先尝试使用适配器；失败则回退到 peerService
    (async () => {
      try {
        const transport = new PeerTransport();
        // 先绑定监听，避免错过 open 事件（open 内需要发送 connection-request）
        wireTransportListeners(transport);
        await transport.connect(targetId);
        if (transport.conn) {
          console.log('[PeerTransport] 连接建立（灰度通道）');
          setConnectionStatus('connecting');
          // 已提前绑定监听，这里不再重复绑定
          return;
        }
        console.warn('[PeerTransport] 连接未返回底层连接对象，回退到 peerService');
      } catch (e) {
        console.warn('[PeerTransport] 连接失败，回退到 peerService:', e?.message || e);
      }

      const conn = peerService.connectToPeer(peer, targetId);
      if (!conn) {
        setConnectionStatus('failed');
        setWaitingForAcceptance(false);
        displayToast('连接失败，请重试');
        return;
      }
      console.log('[peerService] 连接建立（回退通道）');
      wireListeners(conn);
    })();
  }, [peer, targetId, useEncryption, peerId, validateTargetId, displayToast, handleReceivedData, waitingForAcceptance]);
  
  // 接受连接
  const acceptConnection = useCallback((connectionToAccept = null) => {
    console.log('acceptConnection被调用');
    console.log('incomingConnection状态:', incomingConnection);
    console.log('incomingPeerId状态:', incomingPeerId);
    console.log('showConnectionRequest状态:', showConnectionRequest);
    console.log('传入的connectionToAccept:', connectionToAccept);
    
    // 优先使用传入的连接对象，然后是ref中的连接，最后是状态中的连接
    const connectionToUse = connectionToAccept || currentIncomingConnectionRef.current || incomingConnection;
    console.log('最终使用的连接对象:', connectionToUse);
    console.log('ref中的连接对象:', currentIncomingConnectionRef.current);
    
    if (connectionToUse) {
      console.log('接受连接请求');
      setShowConnectionRequest(false);
      
      // 接收方不是连接发起方
      // 注意：不要覆盖发起方的 isInitiator 状态
      if (storeIsInitiator !== true) {
        storage.setItem('isInitiator', 'false');
        setStoreIsInitiator(false);
      }
      // 构建安全发送器（transport 优先 + 回退）
      const primary = (_conn, data) => incomingTransportRef.current?.send?.(data);
      const fallback = (conn, data) => peerService.sendMessageSafely(conn, data);
      const safeSend = createSafeSender(primary, fallback);
      // 通过服务编排接受流程（协商加密、存储、发送 accepted、回调成功）
      const { finalUseEncryption } = acceptIncomingConnectionFlow(safeSend, connectionToUse, {
        peerId,
        localUseEncryption: !!useEncryption,
        incomingUseEncryption: !!incomingUseEncryption,
        storage,
        setStoreFinalUseEncryption,
        onConnectionSuccess,
        remotePeerId: incomingPeerId,
      });
      console.log('接收方加密状态协商完成，最终结果:', finalUseEncryption);
      
      // 清理连接状态
      currentIncomingConnectionRef.current = null;
      setIncomingConnection(null);
      setIncomingPeerId('');
  setIncomingUseEncryption(false);
    } else {
      console.log('无法接受连接：connectionToUse为空');
    }
  }, [incomingConnection, incomingPeerId, incomingUseEncryption, onConnectionSuccess, showConnectionRequest]);
  
  // 直接接受连接的函数，用于在收到连接请求时立即处理
  const acceptConnectionDirectly = useCallback((conn) => {
    console.log('acceptConnectionDirectly被调用，连接对象:', conn);
    acceptConnection(conn);
  }, [acceptConnection]);
  
  // 拒绝连接
  const rejectIncomingConnection = useCallback(() => {
    const connectionToReject = incomingConnection || currentIncomingConnectionRef.current;
    
    if (connectionToReject) {
      console.log('拒绝连接请求');
      
      const primary = (_conn, data) => incomingTransportRef.current?.send?.(data);
      const fallback = (conn, data) => peerService.sendMessageSafely(conn, data);
      const safeSend = createSafeSender(primary, fallback);
      rejectIncomingConnectionFlow(safeSend, connectionToReject);
      
      // 清理连接状态
      setShowConnectionRequest(false);
      currentIncomingConnectionRef.current = null;
      setIncomingConnection(null);
      setIncomingPeerId('');
      setIncomingUseEncryption(false);
      
  displayToast('已拒绝连接请求');
    } else {
      console.warn('没有找到要拒绝的连接');
      // 即使没有连接也要关闭弹窗
      setShowConnectionRequest(false);
    }
  }, [incomingConnection, displayToast]);
  
  // 清理函数
  useEffect(() => {
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (encryptionReadyConfirmationTimeoutRef.current) {
        clearTimeout(encryptionReadyConfirmationTimeoutRef.current);
      }
      
      // 注意：不清理 sessionStorage，因为这些状态需要在整个会话期间保持
      // React 开发模式下组件会被多次挂载/卸载，清理 sessionStorage 会导致状态丢失
      
      // 重置消息列表
      setMessages([]);
    };
  }, [connectionTimeout, setMessages]);
  
  return {
    // 连接状态
    isPeerCreated,
    connectionStatus,
    waitingForAcceptance,
    showConnectionRequest,
    incomingPeerId,
    incomingUseEncryption,
    useEncryption,
    customIdError,
    targetIdError,
    showToast,
    toastMessage,
    targetId,
    
    // 方法
    createPeerConnection,
    connectToPeer,
    acceptConnection,
    acceptConnectionDirectly,
    rejectIncomingConnection,
    generateRandomId,
    setUseEncryption,
    setTargetId,
    validateCustomId,
    validateTargetId
  };
};

export default useConnection;