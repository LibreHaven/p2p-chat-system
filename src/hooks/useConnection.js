import { useState, useEffect, useCallback, useRef } from 'react';
import peerService from '../services/peerService';
import { encryptionService } from '../services/encryptionService';

const useConnection = ({
  peerId,
  setPeerId,
  setMessages,
  onConnectionSuccess,
  onConnectionError
}) => {
  // 连接状态
  const [peer, setPeer] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [connectionTimeout, setConnectionTimeout] = useState(null);
  const [showConnectionRequest, setShowConnectionRequest] = useState(false);
  const [incomingConnection, setIncomingConnection] = useState(null);
  const [incomingPeerId, setIncomingPeerId] = useState('');
  const [waitingForAcceptance, setWaitingForAcceptance] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [isPeerCreated, setIsPeerCreated] = useState(false);
  const [isConnectionInitiator, setIsConnectionInitiator] = useState(false);
  
  // 在 hook 内部管理 targetId 状态
  const [targetId, setTargetId] = useState('');
  
  // 加密状态
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [useEncryption, setUseEncryption] = useState(true);
  const [incomingUseEncryption, setIncomingUseEncryption] = useState(false);
  const [hasHandledEncryptionReady, setHasHandledEncryptionReady] = useState(false);
  
  // 验证和错误处理
  const [customIdError, setCustomIdError] = useState('');
  const [targetIdError, setTargetIdError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // 引用
  const reconnectTimeoutRef = useRef(null);
  const encryptionReadyConfirmationTimeoutRef = useRef(null);
  const currentIncomingConnectionRef = useRef(null);
  const activeConnectionRef = useRef(null);
  const maxEncryptionRetries = useRef(3);
  const currentEncryptionRetries = useRef(0);
  
  // 显示 Toast 消息
  const onDisplayToast = useCallback((message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);
  
  // 验证方法
  const validateCustomId = useCallback((id) => {
    const idRegex = /^[a-zA-Z0-9_-]{3,12}$/;
    const isValid = idRegex.test(id);
    setCustomIdError(isValid ? '' : 'ID必须是3-12位的字母、数字、下划线或连字符');
    return isValid;
  }, []);
  
  const validateTargetId = useCallback((id) => {
    const idRegex = /^[a-zA-Z0-9_-]{3,12}$/;
    const isValid = idRegex.test(id);
    setTargetIdError(isValid ? '' : '目标ID必须是3-12位的字母、数字、下划线或连字符');
    return isValid;
  }, []);
  
  // 生成随机ID
  const generateRandomId = useCallback(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);
  
  // 处理接收到的数据
  const handleReceivedData = useCallback((data) => {
    console.log('useConnection handleReceivedData - Received data:', data);
    console.log('Data type:', typeof data);
    console.log('Data is string:', typeof data === 'string');
    
    // 如果接收到的是字符串，尝试解析为JSON
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
        console.log('Parsed JSON data:', parsedData);
      } catch (e) {
        console.log('Data is not JSON, treating as raw data:', data);
        // 如果不是JSON，直接转发给chatSessionHandler处理
        if (window.chatSessionHandler && typeof window.chatSessionHandler === 'function') {
          console.log('chatSessionHandler类型:', typeof window.chatSessionHandler);
          try {
            window.chatSessionHandler(data);
            console.log('chatSessionHandler调用成功');
          } catch (error) {
            console.error('chatSessionHandler调用失败:', error);
          }
        } else {
          // 缓存原始数据
          console.log('chatSessionHandler未准备好，缓存原始数据:', data);
          console.log('当前window.chatSessionHandler值:', window.chatSessionHandler);
          if (!window.pendingChatMessages) {
            window.pendingChatMessages = [];
          }
          window.pendingChatMessages.push(data);
        }
        return;
      }
    }
    
    // 只处理连接相关的消息，其他消息转发给useChatSession
    if (parsedData.type === 'connection-request') {
      // 接收到连接请求
      console.log('收到连接请求:', parsedData.peerId);
      console.log('接收方收到的完整数据:', parsedData);
      console.log('接收方收到的加密状态:', parsedData.useEncryption);
      console.log('useEncryption类型:', typeof parsedData.useEncryption);
      console.log('原始数据字符串:', JSON.stringify(parsedData));
      setIncomingConnection(activeConnectionRef.current);
      setIncomingPeerId(parsedData.peerId);
      const receivedEncryption = parsedData.useEncryption !== undefined ? parsedData.useEncryption : false;
      console.log('设置的incomingUseEncryption值:', receivedEncryption);
      setIncomingUseEncryption(receivedEncryption);
      setShowConnectionRequest(true);
    } else if (parsedData.type === 'connection-accepted') {
      // 连接被接受，发送方进入聊天界面
      console.log('连接请求被接受');
      console.log('发起方收到的完整响应数据:', parsedData);
      console.log('发起方收到的加密状态详情:', {
        '本地useEncryption': useEncryption,
        '接收方返回的useEncryption': parsedData.useEncryption,
        'useEncryption类型': typeof parsedData.useEncryption,
        '完整parsedData': JSON.stringify(parsedData)
      });
      setWaitingForAcceptance(false);
      setConnectionStatus('connected');
      // 使用响应中的加密状态，这是双方协商后的最终结果
      const finalUseEncryption = parsedData.useEncryption;
      console.log('最终协商的加密状态:', finalUseEncryption, '类型:', typeof finalUseEncryption);
      sessionStorage.setItem('useEncryption', finalUseEncryption ? 'true' : 'false');
      onConnectionSuccess?.(activeConnectionRef.current, targetId, finalUseEncryption);
    } else if (parsedData.type === 'connection-rejected') {
      // 连接被拒绝
      console.log('连接请求被拒绝');
      setWaitingForAcceptance(false);
      setConnectionStatus('failed');
      onDisplayToast('连接请求被拒绝');
    } else {
      // 非连接相关的消息，转发给useChatSession处理
      console.log('useConnection: 转发非连接消息给useChatSession:', parsedData.type);
      if (window.chatSessionHandler && typeof window.chatSessionHandler === 'function') {
        // 传递原始数据，而不是解析后的数据对象
        console.log('转发原始数据给chatSessionHandler:', data);
        console.log('chatSessionHandler类型:', typeof window.chatSessionHandler);
        try {
          window.chatSessionHandler(data);
          console.log('chatSessionHandler调用成功');
        } catch (error) {
          console.error('chatSessionHandler调用失败:', error);
        }
      } else {
        // 缓存消息，等待chatSessionHandler注册
        console.log('chatSessionHandler not ready, caching message:', parsedData.type);
        console.log('当前window.chatSessionHandler值:', window.chatSessionHandler);
        if (!window.pendingChatMessages) {
          window.pendingChatMessages = [];
        }
        // 缓存原始数据，而不是解析后的数据对象
        window.pendingChatMessages.push(data);
        
        // 设置定时器检查chatSessionHandler是否已注册
        const checkHandler = () => {
          if (window.chatSessionHandler && typeof window.chatSessionHandler === 'function') {
            console.log('chatSessionHandler now available, processing cached messages');
            const messages = window.pendingChatMessages || [];
            window.pendingChatMessages = [];
            messages.forEach(msg => {
              try {
                // msg是原始数据，直接传递
                window.chatSessionHandler(msg);
              } catch (error) {
                console.error('Error processing cached message:', error);
              }
            });
          } else {
            // 继续等待，但设置最大等待时间
            setTimeout(checkHandler, 100);
          }
        };
        setTimeout(checkHandler, 50);
      }
    }
  }, [targetId, useEncryption, onConnectionSuccess, onDisplayToast]);
  
  // 注册全局连接处理函数
  useEffect(() => {
    window.connectionHandler = handleReceivedData;
    return () => {
      window.connectionHandler = null;
    };
  }, [handleReceivedData]);

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
        sessionStorage.setItem('peerId', id);
      },
      onError: (error) => {
        console.error('Peer 连接错误:', error);
        setConnectionStatus('failed');
        
        // 检查是否是 ID 冲突错误
        if (error.message && error.message.includes('is taken')) {
          // ID冲突时不重置连接状态，避免重试
          setCustomIdError(`ID "${peerId}" 已被占用，请尝试其他ID或使用随机ID`);
          const suggestedId = generateRandomId();
          onDisplayToast(`ID已被占用，建议使用: ${suggestedId}`);
        } else {
          // 只有非ID冲突错误才重置连接状态，为重试做准备
          peerService.resetConnectionState();
          
          if (error.message && error.message.includes('无法连接到PeerJS服务器')) {
            onDisplayToast('无法连接到服务器，请检查网络连接后重试');
          } else {
            onDisplayToast('连接失败，请重试');
          }
        }
      },
      onConnection: (conn) => {
        console.log('收到连接请求:', conn.peer);
        
        // 为接收到的连接设置数据监听器 - 使用统一的监听器设置函数
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
        
        // 同时更新ref和状态
        currentIncomingConnectionRef.current = conn;
        setIncomingConnection(conn);
        setShowConnectionRequest(true);
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
  }, [peerId, validateCustomId, generateRandomId, onDisplayToast, handleReceivedData]);
  
  // 连接到目标Peer
  const connectToPeer = useCallback(() => {
    if (!peer) {
      onDisplayToast('请先创建自己的 Peer 连接');
      return;
    }
    
    if (!targetId) {
      setTargetIdError('请输入目标ID');
      return;
    }
    if (!validateTargetId(targetId)) return;
    
    setConnectionStatus('connecting');
    setWaitingForAcceptance(true);
    setIsConnectionInitiator(true);
    sessionStorage.setItem('isInitiator', 'true');
    sessionStorage.setItem('useEncryption', useEncryption ? 'true' : 'false');
    
    const conn = peerService.connectToPeer(peer, targetId);
    if (!conn) {
      setConnectionStatus('failed');
      setWaitingForAcceptance(false);
      onDisplayToast('连接失败，请重试');
      return;
    }
    
    setPendingConnection(conn);
    activeConnectionRef.current = conn;
    
    peerService.setupDataConnectionListeners(conn, {
      onOpen: () => {
        console.log('数据连接已打开，发送连接请求');
        console.log('发起方发送的加密状态:', useEncryption);
        peerService.sendMessageSafely(conn, {
          type: 'connection-request',
          peerId: peerId,
          useEncryption: useEncryption,
          timestamp: Date.now()
        });
        
        const timeout = setTimeout(() => {
          if (waitingForAcceptance) {
            console.log('连接请求超时');
            setWaitingForAcceptance(false);
            setConnectionStatus('failed');
            onDisplayToast('连接请求超时，请重试');
          }
        }, 30000);
        
        setConnectionTimeout(timeout);
      },
      onData: (data) => {
        console.log('发起方收到数据:', data);
        handleReceivedData(data);
      },
      onClose: () => {
        console.log('连接已关闭');
        setConnectionStatus('disconnected');
        setWaitingForAcceptance(false);
      },
      onError: (error) => {
        console.error('连接错误:', error);
        setConnectionStatus('failed');
        setWaitingForAcceptance(false);
        onDisplayToast('连接出现错误');
      }
    });
  }, [peer, targetId, useEncryption, peerId, validateTargetId, onDisplayToast, handleReceivedData, waitingForAcceptance]);
  
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
      if (sessionStorage.getItem('isInitiator') !== 'true') {
        sessionStorage.setItem('isInitiator', 'false');
      }
      // 只有双方都启用加密时才使用加密
      console.log('接收方加密状态协商:', {
        '本地useEncryption': useEncryption,
        '发起方useEncryption': incomingUseEncryption,
        '最终结果': useEncryption && incomingUseEncryption
      });
      const finalUseEncryption = useEncryption && incomingUseEncryption;
      sessionStorage.setItem('useEncryption', finalUseEncryption ? 'true' : 'false');
      
      // 发送接受消息给发送方
      console.log('接收方发送connection-accepted，useEncryption:', finalUseEncryption);
      const acceptedMessage = {
        type: 'connection-accepted',
        peerId: peerId,
        useEncryption: finalUseEncryption, // 使用协商后的最终加密设置
        timestamp: Date.now()
      };
      console.log('接收方发送的完整消息:', acceptedMessage);
      console.log('消息序列化后:', JSON.stringify(acceptedMessage));
      peerService.sendMessageSafely(connectionToUse, acceptedMessage);
      
      // 建立连接成功 - 使用之前计算的最终加密状态
      onConnectionSuccess?.(connectionToUse, incomingPeerId, finalUseEncryption);
      
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
      
      try {
        peerService.sendMessageSafely(connectionToReject, {
          type: 'connection-rejected',
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('发送拒绝消息失败:', error);
      }
      
      try {
        connectionToReject.close();
      } catch (error) {
        console.warn('关闭连接失败:', error);
      }
      
      // 清理连接状态
      setShowConnectionRequest(false);
      currentIncomingConnectionRef.current = null;
      setIncomingConnection(null);
      setIncomingPeerId('');
      setIncomingUseEncryption(false);
      
      onDisplayToast('已拒绝连接请求');
    } else {
      console.warn('没有找到要拒绝的连接');
      // 即使没有连接也要关闭弹窗
      setShowConnectionRequest(false);
    }
  }, [incomingConnection, onDisplayToast]);
  
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
    encryptionReady,
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