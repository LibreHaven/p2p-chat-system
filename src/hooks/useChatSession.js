import { useState, useEffect, useRef, useCallback } from 'react';
import { encryptionService } from '../services/encryptionService';
import peerService from '../services/peerService';

const useChatSession = ({ connection, peerId, targetId, useEncryption, onConnectionLost, onNavigateBack }) => {
  // 消息ID计数器，确保唯一性
  const messageIdCounter = useRef(Date.now());
  const generateMessageId = () => {
    return messageIdCounter.current++;
  };
  
  // 检查是否为连接发起方 - 使用useState避免每次渲染都读取
  const [isInitiator, setIsInitiator] = useState(() => {
    const isInitiatorValue = sessionStorage.getItem('isInitiator');
    const result = isInitiatorValue === 'true';
    console.log('useChatSession 初始化 isInitiator:', { isInitiatorValue, isInitiator: result });
    return result;
  });
  
  // 优先使用sessionStorage中的useEncryption值，这是双方协商后的最终结果
  const [finalUseEncryption, setFinalUseEncryption] = useState(() => {
    const sessionUseEncryption = sessionStorage.getItem('useEncryption');
    return sessionUseEncryption !== null ? sessionUseEncryption === 'true' : useEncryption;
  });
  
  // 基础状态
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState('正在建立加密通道...');
  const [connectionLost, setConnectionLost] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  // 使用传入的 useEncryption 参数而不是本地状态
  
  // 文件传输状态
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileTransferProgress, setFileTransferProgress] = useState(0);
  const [isTransferringFile, setIsTransferringFile] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState({});
  
  // Refs
  const activeConnectionRef = useRef(connection);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const lastHeartbeatResponseRef = useRef(Date.now());
  const maxEncryptionRetries = useRef(3);
  const currentEncryptionRetries = useRef(0);
  const fileChunksRef = useRef({});
  const fileChunksBufferRef = useRef({});
  const fileTransferCompleteBufferRef = useRef(null);
  const encryptionStateRef = useRef(null);
  
  // 初始化连接和加密状态
  // 初始化连接监听器
  useEffect(() => {
    activeConnectionRef.current = connection;
    
    // 使用协商后的最终加密设置
    console.log('=== 连接初始化 ===');
    console.log('finalUseEncryption:', finalUseEncryption);
    console.log('isInitiator:', isInitiator);
    console.log('connection对象:', connection);
    
    if (!finalUseEncryption) {
      console.log('加密未启用，直接设置为就绪状态');
      setEncryptionReady(true);
      setEncryptionStatus('未启用加密');
    } else {
      console.log('加密已启用，开始初始化加密流程');
      // 只有连接发起方才主动初始化加密
      // 接收方等待收到密钥交换消息时再初始化
      if (isInitiator) {
        // 检查是否已经初始化过，避免重复初始化
        if (!encryptionStateRef.current) {
          console.log('作为发起方，主动初始化加密');
          initializeEncryption();
        } else {
          console.log('加密已经初始化过，跳过重复初始化');
        }
      } else {
        console.log('作为接收方，等待对方发起密钥交换');
        setEncryptionStatus('等待对方发起密钥交换...');
      }
    }
    
    if (!connection || typeof connection.on !== 'function') {
      console.warn('Invalid connection object:', connection);
      return;
    }
    
    // 移除旧的监听器 - 使用 removeListener 方法
    if (connection.removeListener) {
      connection.removeListener('data');
      connection.removeListener('close');
      connection.removeListener('error');
    }
    
    // 直接设置data监听器，确保能够接收消息
    connection.on('data', handleReceivedData);
    connection.on('close', () => {
      console.log('连接已关闭');
      setConnectionLost(true);
      setEncryptionStatus('连接已断开');
    });
    connection.on('error', (err) => {
      console.error('连接错误:', err);
      setConnectionLost(true);
      setEncryptionStatus('连接错误');
    });
    
    startHeartbeat();
    
    // 移除旧的加密就绪确认逻辑，改为密钥交换
    
    return () => {
      if (connection && connection.removeListener) {
        // 清理监听器 - 使用 removeListener 方法
        connection.removeListener('data');
        connection.removeListener('close');
        connection.removeListener('error');
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [connection]);
  
  // 注册全局聊天会话处理函数
  useEffect(() => {
    window.chatSessionHandler = handleReceivedData;
    
    // 处理可能已经缓存的消息
    if (window.pendingChatMessages && window.pendingChatMessages.length > 0) {
      console.log('Processing cached messages:', window.pendingChatMessages.length);
      const messages = window.pendingChatMessages;
      window.pendingChatMessages = [];
      messages.forEach(msg => {
        try {
          handleReceivedData(msg);
        } catch (error) {
          console.error('Error processing cached message:', error);
        }
      });
    }
    
    return () => {
      window.chatSessionHandler = null;
    };
  }, [handleReceivedData]);
  
  // 心跳机制
  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    lastHeartbeatResponseRef.current = Date.now();
    
    heartbeatIntervalRef.current = setInterval(() => {
      const timeSinceLast = Date.now() - lastHeartbeatResponseRef.current;
      if (timeSinceLast > 30000) {
        console.log('心跳检测超时，连接可能已断开');
        setConnectionLost(true);
        setEncryptionStatus('连接已断开');
        clearInterval(heartbeatIntervalRef.current);
        return;
      }
      sendHeartbeat();
    }, 10000);
  };
  
  const sendHeartbeat = () => {
    if (!activeConnectionRef.current || connectionLost) return;
    try {
      peerService.sendMessageSafely(activeConnectionRef.current, {
        type: 'heartbeat',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('发送心跳失败:', error);
      setConnectionLost(true);
      setEncryptionStatus('连接已断开');
    }
  };
  
  // 重连机制
  const attemptReconnect = (resetConnection) => {
    if (reconnecting) return;
    setReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    
    const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
    console.log(`尝试重新连接，第${reconnectAttempts + 1}次尝试，延迟${delay}毫秒`);
    setEncryptionStatus(`正在尝试重新连接 (${reconnectAttempts + 1})...`);
    
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
      resetConnection();
      setReconnecting(false);
    }, delay);
  };
  
  // 初始化加密状态
  const initializeEncryption = async () => {
    try {
      console.log('=== 开始初始化加密 ===');
      console.log('当前连接状态:', activeConnectionRef.current);
      console.log('是否为发起方:', isInitiator);
      
      setEncryptionStatus('正在初始化加密...');
      encryptionStateRef.current = new encryptionService.EncryptionState();
      const publicKeyBase64 = await encryptionStateRef.current.initialize();
      
      console.log('加密状态初始化完成，公钥长度:', publicKeyBase64.length);
      
      // 发送公钥给对方
      const keyExchangeMessage = encryptionService.createKeyExchangeMessage(publicKeyBase64);
      console.log('准备发送密钥交换消息:', keyExchangeMessage);
      
      const sendResult = peerService.sendMessageSafely(activeConnectionRef.current, keyExchangeMessage);
      console.log('密钥交换消息发送结果:', sendResult);
      
      setEncryptionStatus('等待对方公钥...');
      console.log('已发送公钥，等待对方响应');
    } catch (error) {
      console.error('初始化加密失败:', error);
      setEncryptionStatus('加密初始化失败');
    }
  };
  
  // 发送加密就绪确认
  const sendEncryptionReadyConfirmation = useCallback((conn) => {
    if (!conn) {
      console.error('发送加密就绪确认失败: 没有可用的连接');
      return;
    }
    
    if (!encryptionStateRef.current?.sharedSecret) {
      console.error('发送加密就绪确认失败: 未检测到有效的共享密钥');
      return;
    }
    
    if (sessionStorage.getItem('encryptionReady') === 'sent' ||
        sessionStorage.getItem('encryptionReady') === 'confirmed') {
      console.log('已经发送过加密就绪确认，不再重复发送');
      return;
    }
    
    console.log('发送加密就绪确认消息');
    try {
      const sent = peerService.sendMessageSafely(conn, { type: 'encryption-ready' });
      if (sent) {
        console.log('已发送加密就绪确认消息');
        sessionStorage.setItem('encryptionReady', 'sent');
      }
    } catch (error) {
      console.error('发送加密就绪确认消息时出错:', error);
    }
  }, []);

  const sendEncryptionReadyResponse = useCallback((conn) => {
    if (!conn) {
      console.error('连接不存在，无法发送加密就绪响应');
      return;
    }
    
    console.log('发送加密就绪响应消息');
    const responseMessage = {
      type: 'encryption-ready-response',
      timestamp: Date.now()
    };
    peerService.sendMessageSafely(conn, responseMessage);
  }, []);

  // 处理接收到的公钥
  const handleKeyExchange = useCallback(async (data) => {
    try {
      console.log('=== 收到加密密钥交换请求 ===');
      console.log('接收到的数据:', data);
      console.log('当前是否为发起方:', isInitiator);
      console.log('当前加密状态是否已初始化:', !!encryptionStateRef.current);
      
      if (!data.publicKey) {
        console.error('接收到的公钥无效');
        return;
      }
      
      console.log('接收到的公钥长度:', data.publicKey.length);
      
      // 检查是否已经处理过密钥交换
      if (encryptionStateRef.current && encryptionStateRef.current.sharedSecret) {
        console.log('密钥交换已完成，忽略重复消息');
        return;
      }
      
      if (!encryptionStateRef.current) {
        // 接收方：初始化加密状态
        console.log('接收方初始化加密状态');
        setEncryptionStatus('正在初始化加密...');
        encryptionStateRef.current = new encryptionService.EncryptionState();
        await encryptionStateRef.current.initialize();
        console.log('接收方加密状态初始化完成');
      }
      
      console.log('处理密钥交换, 接收到的公钥长度:', data.publicKey.length);
      setEncryptionStatus('正在建立共享密钥...');
      await encryptionStateRef.current.processRemotePublicKey(data.publicKey);
      
      if (!encryptionStateRef.current.sharedSecret) {
        console.error('密钥交换完成后，共享密钥仍不存在');
        setEncryptionStatus('加密通道建立失败');
        return;
      }
      
      console.log('密钥交换成功，共享密钥已保存');
      setEncryptionReady(true);
      sessionStorage.setItem('encryptionReady', 'true');
      
      // 接收方需要发送公钥响应，发起方收到响应后完成密钥交换
      if (!isInitiator) {
        console.log('接收方发送公钥响应');
        const publicKeyBase64 = await encryptionService.exportPublicKey(encryptionStateRef.current.keyPair.publicKey);
        const keyExchangeResponse = encryptionService.createKeyExchangeMessage(publicKeyBase64);
        const sendResult = peerService.sendMessageSafely(activeConnectionRef.current, keyExchangeResponse);
        console.log('接收方已发送公钥响应，发送结果:', sendResult);
      } else {
        console.log('发起方收到公钥响应，密钥交换完成');
      }
      
      setEncryptionStatus('加密通道已建立');
      
      // 调试：输出共享密钥的哈希值
      if (encryptionStateRef.current.sharedSecret) {
        const keyBuffer = await window.crypto.subtle.exportKey('raw', encryptionStateRef.current.sharedSecret);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('共享密钥哈希值:', hashHex.substring(0, 16) + '...');
      }
      
      // 发送加密就绪确认（避免重复发送）
      if (sessionStorage.getItem('encryptionReady') !== 'sent' &&
          sessionStorage.getItem('encryptionReady') !== 'confirmed') {
        sendEncryptionReadyConfirmation(activeConnectionRef.current);
      }
    } catch (error) {
      console.error('处理密钥交换时出错:', error);
      setEncryptionStatus('密钥交换失败');
    }
  }, [isInitiator, sendEncryptionReadyConfirmation]);
  
  // 数据处理
  const handleReceivedData = useCallback(async (data) => {
    try {
      // 连接相关消息需要转发给useConnection处理
      if (data.type === 'connection-request' || data.type === 'connection-accepted' || data.type === 'connection-rejected') {
        console.log('useChatSession: 收到连接相关消息，转发给useConnection处理:', data.type);
        // 如果有外部的连接处理函数，调用它
        if (window.connectionHandler && typeof window.connectionHandler === 'function') {
          window.connectionHandler(data);
        }
        return;
      }
        
        // 密钥交换消息处理
      if (data.type === 'encryption-key') {
        handleKeyExchange(data);
        return;
      }
      
      // 加密就绪确认消息处理
      if (data.type === 'encryption-ready') {
        console.log('收到加密就绪确认消息');
        
        // 等待一小段时间确保密钥交换完成
        setTimeout(() => {
          if (!encryptionStateRef.current?.sharedSecret) {
            console.error('收到加密就绪确认，但共享密钥不存在，可能密钥交换尚未完成');
            return;
          }
          
          // 检查是否需要发送响应确认（在设置状态之前检查）
          const shouldSendResponse = sessionStorage.getItem('encryptionReady') !== 'sent' && 
                                    sessionStorage.getItem('encryptionReady') !== 'confirmed';
          
          setEncryptionReady(true);
          sessionStorage.setItem('encryptionReady', 'confirmed');
          setEncryptionStatus('加密通道已建立');
          
          // 发送响应确认（避免重复发送）
          if (shouldSendResponse) {
            sendEncryptionReadyResponse(activeConnectionRef.current);
          }
        }, 100);
        return;
      }
      
      // 加密就绪响应消息处理
      if (data.type === 'encryption-ready-response') {
        console.log('收到对方加密就绪响应确认');
        setEncryptionReady(true);
        sessionStorage.setItem('encryptionReady', 'confirmed');
        setEncryptionStatus('加密通道已建立');
        return;
      }
      
      // 心跳消息处理
      if (data.type === 'heartbeat' || data.type === 'heartbeat-response') {
        lastHeartbeatResponseRef.current = Date.now();
        return;
      }
      
      // 对于已经解析的消息对象，直接处理
      if (typeof data === 'object' && data.type === 'message') {
        console.log('收到普通消息对象:', data);
        addMessageToList(data);
        return;
      }
      
      // 对于字符串数据，尝试解析为JSON
      if (typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data);
          
          // 优先处理加密消息，避免被错误识别为其他类型
          if (parsedData.type === 'encrypted-message') {
            console.log('收到加密消息，交给peerService处理');
            peerService.handleReceivedData(
              parsedData,
              finalUseEncryption,
              finalUseEncryption && encryptionStateRef.current ? encryptionStateRef.current.sharedSecret : null,
              {
                onMessage: handleMessage,
                onFileMetadata: handleFileMetadata,
                onFileChunk: handleFileChunk,
                onFileTransferComplete: handleFileTransferComplete
              }
            );
            return;
          }
          
          if (parsedData.type === 'message') {
            console.log('收到普通消息字符串，已解析:', parsedData);
            addMessageToList(parsedData);
            return;
          }
          // 如果是其他类型的JSON对象，继续处理
          console.log('收到其他类型的JSON数据:', parsedData);
          
          // 直接处理file-metadata类型
          if (parsedData.type === 'file-metadata') {
            console.log('处理消息:', parsedData);
            handleFileMetadata(parsedData);
            return;
          }
          
          // 直接处理file-chunk类型
          if (parsedData.type === 'file-chunk') {
            console.log('处理文件块消息:', parsedData);
            // 交给peerService处理文件块
            peerService.handleReceivedData(
              parsedData,
              finalUseEncryption,
              finalUseEncryption && encryptionStateRef.current ? encryptionStateRef.current.sharedSecret : null,
              {
                onMessage: handleMessage,
                onFileMetadata: handleFileMetadata,
                onFileChunk: handleFileChunk,
                onFileTransferComplete: handleFileTransferComplete
              }
            );
            return;
          }
          
          // 递归调用处理解析后的对象
          handleReceivedData(parsedData);
          return;
        } catch (e) {
          console.log('无法解析为JSON，可能是纯文本消息:', data);
          // 创建标准消息对象
          const textMessage = {
            type: 'message',
            content: data,
            timestamp: Date.now(),
            sender: 'peer'
          };
          addMessageToList(textMessage);
          return;
        }
      }
      
      // 处理加密消息类型
      if (data.type === 'encrypted-message') {
        // 交给peerService处理加密消息的解密
        peerService.handleReceivedData(
          data,
          finalUseEncryption,
          finalUseEncryption && encryptionStateRef.current ? encryptionStateRef.current.sharedSecret : null,
          {
            onMessage: handleMessage,
            onFileMetadata: handleFileMetadata,
            onFileChunk: handleFileChunk,
            onFileTransferComplete: handleFileTransferComplete
          }
        );
        return;
      }
      
      // 其他类型的消息交给peerService处理
      peerService.handleReceivedData(
        data,
        finalUseEncryption,
        finalUseEncryption && encryptionStateRef.current ? encryptionStateRef.current.sharedSecret : null,
        {
          onMessage: handleMessage,
          onFileMetadata: handleFileMetadata,
          onFileChunk: handleFileChunk,
          onFileTransferComplete: handleFileTransferComplete
        }
      );
    } catch (error) {
      console.error('处理接收到的数据失败:', error);
    }
  }, [finalUseEncryption, handleMessage, handleFileMetadata, handleFileChunk, handleFileTransferComplete, handleKeyExchange]);
  
  const handleMessage = useCallback(async (data) => {
    console.log('处理消息:', data);
    
    // 排除心跳、密钥交换和加密就绪确认消息
    if (data.type === 'heartbeat' || data.type === 'heartbeat-response' ||
        data.type === 'encryption-ready' || data.type === 'encryption-ready-response' ||
        data.type === 'encryption-key') return;
    
    if (data.type === 'encrypted-message') {
      try {
        if (!encryptionStateRef.current || !encryptionStateRef.current.isReady()) {
          console.error('加密状态未就绪，无法解密消息');
          return;
        }
        
        const decrypted = await encryptionStateRef.current.decryptMessage(data);
        if (!decrypted) {
          console.error('解密返回为空，忽略此消息');
          return;
        }
        const messageObj = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
        
        if (messageObj.type === 'file-metadata') {
          handleFileMetadata(messageObj);
        } else if (messageObj.type === 'file-chunk') {
          // 解密后的文件块消息，忽略处理
          console.log('解密后的文件块消息，忽略处理');
          // file-chunk消息不应该通过handleMessage处理，应该在handleReceivedData中直接处理
          return;
        } else {
          addMessageToList(messageObj);
        }
      } catch (error) {
        console.error('解密失败:', error);
      }
    } else {
      // 处理非加密消息
      if (data.type === 'file-chunk') {
        console.log('收到非加密文件块消息，忽略处理');
        // file-chunk消息不应该通过handleMessage处理，应该在handleReceivedData中直接处理
        return;
      } else {
        addMessageToList(data);
      }
    }
  }, [addMessageToList, finalUseEncryption]);
  
  const addMessageToList = useCallback((messageObj) => {
    setMessages(prev => [
      ...prev,
      {
        id: generateMessageId(),
        sender: messageObj.sender,
        content: messageObj.content,
        timestamp: messageObj.timestamp || Date.now(),
        isSelf: messageObj.sender === peerId
      }
    ]);
  }, [peerId]);
  
  // 文件处理
  const handleFileSelect = (file) => {
    if (!file) return;
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    
    setSelectedFile(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreviewUrl(previewUrl);
    } else {
      setFilePreviewUrl(null);
    }
  };
  
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileTransferProgress(0);
  };
  
  const sendFile = async () => {
    if (!selectedFile || !activeConnectionRef.current || connectionLost) return;
    
    setIsTransferringFile(true);
    await peerService.sendFile(
      activeConnectionRef.current,
      selectedFile,
      finalUseEncryption,
      finalUseEncryption && encryptionStateRef.current ? encryptionStateRef.current.sharedSecret : null,
      {
        onProgress: (transferId, progress) => {
          setFileTransferProgress(progress);
        },
        onComplete: (transferId) => {
          const fileMessage = {
            id: generateMessageId(),
            sender: peerId,
            content: `发送了文件: ${selectedFile.name}`,
            timestamp: Date.now(),
            isSelf: true,
            isFile: true,
            file: {
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size,
              url: filePreviewUrl
            }
          };
          setMessages(prev => [...prev, fileMessage]);
          clearSelectedFile();
          setIsTransferringFile(false);
        },
        onError: (error) => {
          console.error('发送文件失败:', error);
          setIsTransferringFile(false);
        }
      }
    );
  };
  
  const handleFileMetadata = useCallback((metadata) => {
    console.log('收到文件元数据:', metadata);
    
    // 初始化传输状态
    fileChunksRef.current[metadata.transferId] = {
      metadata,
      chunks: new Array(metadata.chunksCount),
      receivedChunks: 0
    };
    
    // 检查缓冲区中是否有先前收到的文件块
    if (fileChunksBufferRef.current[metadata.transferId]) {
      const bufferedChunks = fileChunksBufferRef.current[metadata.transferId];
      console.log('处理缓冲的文件块:', metadata.transferId, '缓冲块数量:', Object.keys(bufferedChunks).length);
      Object.keys(bufferedChunks).forEach(index => {
        fileChunksRef.current[metadata.transferId].chunks[index] = bufferedChunks[index];
        fileChunksRef.current[metadata.transferId].receivedChunks++;
      });
      
      // 更新进度
      const progress = (fileChunksRef.current[metadata.transferId].receivedChunks / metadata.chunksCount) * 100;
      setReceivedFiles(prev => ({
        ...prev,
        [metadata.transferId]: { ...(prev[metadata.transferId] || {}), progress }
      }));
      
      delete fileChunksBufferRef.current[metadata.transferId];
      console.log('缓冲文件块处理完成，当前进度:', progress + '%');
    }
    
    // 检查是否有缓冲的传输完成事件
    console.log('检查缓冲的传输完成事件:', metadata.transferId, 'buffer存在:', !!fileTransferCompleteBufferRef.current, 'buffer内容:', fileTransferCompleteBufferRef.current);
    if (fileTransferCompleteBufferRef.current && fileTransferCompleteBufferRef.current.has(metadata.transferId)) {
      console.log('处理缓冲的传输完成事件:', metadata.transferId);
      fileTransferCompleteBufferRef.current.delete(metadata.transferId);
      // 延迟处理传输完成事件，确保所有文件块都已处理
      setTimeout(() => {
        handleFileTransferComplete(metadata.transferId);
      }, 100);
    } else {
      console.log('没有找到缓冲的传输完成事件:', metadata.transferId);
    }
    
    const fileMsg = {
      id: generateMessageId(),
      sender: targetId,
      content: `正在接收文件: ${metadata.fileName}`,
      timestamp: Date.now(),
      isSelf: false,
      isFileReceiving: true,
      transferId: metadata.transferId,
      file: {
        name: metadata.fileName,
        type: metadata.fileType,
        size: metadata.fileSize
      }
    };
    setMessages(prev => [...prev, fileMsg]);
  }, [targetId]);
  
  const handleFileChunk = useCallback((transferId, chunkIndex, chunkData) => {
    // 如果当前传输状态不存在，则将该块存入缓冲区
    if (!fileChunksRef.current[transferId]) {
      if (!fileChunksBufferRef.current[transferId]) {
        fileChunksBufferRef.current[transferId] = {};
      }
      fileChunksBufferRef.current[transferId][chunkIndex] = chunkData;
      console.warn('文件元数据尚未到达，缓冲文件块:', transferId, chunkIndex);
      return;
    }
    
    // 正常处理文件块
    fileChunksRef.current[transferId].chunks[chunkIndex] = chunkData;
    fileChunksRef.current[transferId].receivedChunks++;
    
    const progress = (fileChunksRef.current[transferId].receivedChunks / fileChunksRef.current[transferId].metadata.chunksCount) * 100;
    setReceivedFiles(prev => ({
      ...prev,
      [transferId]: { ...(prev[transferId] || {}), progress }
    }));
  }, [addMessageToList, finalUseEncryption]);
  
  const handleFileTransferComplete = useCallback((transferId) => {
    console.log('文件传输完成:', transferId);
    if (!fileChunksRef.current[transferId]) {
      console.warn('文件传输状态尚未建立，缓冲传输完成事件:', transferId);
      // 缓冲传输完成事件，等待文件元数据到达后处理
      if (!fileTransferCompleteBufferRef.current) {
        fileTransferCompleteBufferRef.current = new Set();
      }
      fileTransferCompleteBufferRef.current.add(transferId);
      return;
    }
    
    const { metadata, chunks } = fileChunksRef.current[transferId];
    
    // 计算所有块的实际总长度
    let totalLength = 0;
    for (const chunk of chunks) {
      if (!chunk || typeof chunk.byteLength !== 'number') {
        console.error('缺少或无效的文件块，无法合并文件', transferId);
        return;
      }
      totalLength += chunk.byteLength;
    }
    
    const fileData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      try {
        const chunkArray = new Uint8Array(chunk);
        fileData.set(chunkArray, offset);
        offset += chunkArray.byteLength;
      } catch (err) {
        console.error('合并文件块失败:', err);
        return;
      }
    }
    
    const blob = new Blob([fileData], { type: metadata.fileType });
    const url = URL.createObjectURL(blob);
    
    setMessages(prev =>
      prev.map(msg =>
        msg.isFileReceiving && msg.transferId === transferId
          ? { ...msg, isFileReceiving: false, isFile: true, content: `接收了文件: ${metadata.fileName}`, file: { ...msg.file, url } }
          : msg
      )
    );
    
    delete fileChunksRef.current[transferId];
  }, [targetId]);
  
  // 发送消息
  const sendMessage = async () => {
    if (!message.trim()) return;
    if (!activeConnectionRef.current || connectionLost) {
      console.error('发送消息失败: 连接不存在或已断开');
      return;
    }
    
    const messageObj = {
      type: 'message',
      sender: peerId,
      content: message,
      timestamp: Date.now()
    };
    
    try {
      if (finalUseEncryption) {
        if (!encryptionReady) {
          console.error('加密通道尚未就绪，无法发送加密消息');
          return;
        }
        if (!encryptionStateRef.current || !encryptionStateRef.current.isReady()) {
          console.error('加密状态未就绪，无法发送加密消息');
          return;
        }
        
        const messageStr = JSON.stringify(messageObj);
        const encryptedMessage = await encryptionStateRef.current.encryptMessage(messageStr);
        if (!encryptedMessage) {
          console.error('加密消息失败');
          return;
        }
        peerService.sendMessageSafely(activeConnectionRef.current, encryptedMessage);
      } else {
        peerService.sendMessageSafely(activeConnectionRef.current, messageObj);
      }
      
      addMessageToList(messageObj);
      setMessage('');
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  // 清理资源
  const cleanup = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // 清理sessionStorage状态
    sessionStorage.removeItem('encryptionReady');
    
    // 重置状态
    setMessages([]);
    setEncryptionReady(false);
    setEncryptionStatus(finalUseEncryption ? '等待对方发起密钥交换...' : '未启用加密');
    setConnectionLost(false);
    setReconnecting(false);
    setReconnectAttempts(0);
    setSelectedFile(null);
    setFilePreviewUrl('');
    setFileTransferProgress(0);
    setIsTransferringFile(false);
    setReceivedFiles([]);
    
    // 清理加密状态
    encryptionStateRef.current = null;
    activeConnectionRef.current = null;
    lastHeartbeatResponseRef.current = null;
    
    // 清理文件传输缓冲区
    fileChunksRef.current = {};
    fileChunksBufferRef.current = {};
    fileTransferCompleteBufferRef.current = null;
  };

  return {
    // 状态
    message,
    messages,
    encryptionReady,
    encryptionStatus,
    connectionLost,
    reconnecting,
    isEncryptionEnabled: finalUseEncryption && encryptionReady,
    
    // 文件状态
    selectedFile,
    filePreviewUrl,
    fileTransferProgress,
    isTransferringFile,
    receivedFiles,
    
    // 方法
    setMessage,
    setMessages,
    sendMessage,
    attemptReconnect,
    cleanup,
    
    // 文件方法
    handleFileSelect,
    clearSelectedFile,
    sendFile
  };
};

export default useChatSession;