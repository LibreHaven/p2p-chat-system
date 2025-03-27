import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiSend, FiLoader, FiRefreshCw, FiFile, FiImage, FiVideo, FiX } from 'react-icons/fi';
import { encryptionService } from '../services/encryptionService';
import peerService from '../services/peerService';
import messageService from '../services/messageService';
import CryptoJS from 'crypto-js';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
`;

const ChatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  margin-bottom: 10px;
`;

const PeerId = styled.div`
  font-weight: bold;
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
  color: ${props => props.$isReady ? '#2ecc71' : '#e74c3c'};
`;

const StatusDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => props.$isReady ? '#2ecc71' : '#e74c3c'};
  margin-right: 5px;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
`;

const InputContainer = styled.div`
  display: flex;
  margin-top: 10px;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  margin-right: 10px;
`;

const SendButton = styled.button`
  padding: 10px 20px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #3a80d2;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ReconnectButton = styled.button`
  padding: 10px 20px;
  background-color: #f39c12;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 10px;

  &:hover {
    background-color: #e67e22;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 18px;
  margin-bottom: 10px;
  word-wrap: break-word;
  align-self: ${props => props.$isSelf ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.$isSelf ? '#4a90e2' : '#f1f0f0'};
  color: ${props => props.$isSelf ? 'white' : 'black'};
`;

const Timestamp = styled.div`
  font-size: 12px;
  color: ${props => props.$isSelf ? 'rgba(255, 255, 255, 0.7)' : '#999'};
  margin-top: 5px;
`;

const ConnectionStatusMessage = styled.div`
  text-align: center;
  padding: 10px;
  margin: 10px 0;
  background-color: ${props => props.$isError ? '#ffecec' : '#e8f4fc'};
  color: ${props => props.$isError ? '#e74c3c' : '#4a90e2'};
  border-radius: 4px;
  font-size: 14px;
`;

// 加密状态指示器
const EncryptionStatus = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  color: ${props => props.$isEncrypted ? '#2ecc71' : '#f39c12'};
  margin-left: 10px;
`;

// 新增: 文件输入容器
const FileInputContainer = styled.div`
  display: flex;
  margin-top: 10px;
  margin-bottom: 10px;
`;

// 新增: 文件按钮
const FileButton = styled.button`
  padding: 10px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  margin-right: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

// 新增: 隐藏的文件输入
const HiddenFileInput = styled.input`
  display: none;
`;

// 新增: 文件预览容器
const FilePreviewContainer = styled.div`
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: ${props => props.$visible ? 'block' : 'none'};
`;

// 新增: 文件预览头部
const FilePreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

// 新增: 文件预览名称
const FilePreviewName = styled.div`
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80%;
`;

// 新增: 文件预览关闭按钮
const FilePreviewClose = styled.button`
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// 新增: 文件预览内容
const FilePreviewContent = styled.div`
  max-width: 100%;
  max-height: 200px;
  overflow: hidden;
  margin-bottom: 10px;
`;

// 新增: 文件预览图片
const FilePreviewImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
`;

// 新增: 文件预览视频
const FilePreviewVideo = styled.video`
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
`;

// 新增: 文件进度容器
const FileProgressContainer = styled.div`
  width: 100%;
  height: 10px;
  background-color: #f1f1f1;
  border-radius: 5px;
  margin-top: 10px;
`;

// 新增: 文件进度条
const FileProgressBar = styled.div`
  height: 100%;
  background-color: #4caf50;
  border-radius: 5px;
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
`;

// 新增: 文件消息气泡
const FileBubble = styled.div`
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 18px;
  margin-bottom: 10px;
  word-wrap: break-word;
  align-self: ${props => props.$isSelf ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.$isSelf ? '#4a90e2' : '#f1f0f0'};
  color: ${props => props.$isSelf ? 'white' : 'black'};
  display: flex;
  flex-direction: column;
`;

// 新增: 文件内容
const FileContent = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 5px;
`;

// 新增: 文件信息
const FileInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;

// 新增: 文件图标
const FileIcon = styled.div`
  margin-right: 10px;
  font-size: 24px;
`;

// 新增: 文件名称
const FileName = styled.div`
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
`;

// 新增: 文件大小
const FileSize = styled.div`
  font-size: 12px;
  color: ${props => props.$isSelf ? 'rgba(255, 255, 255, 0.7)' : '#999'};
  margin-top: 2px;
`;

// 新增: 文件预览
const FilePreview = styled.div`
  margin-top: 10px;
  max-width: 100%;
  max-height: 200px;
  overflow: hidden;
`;

// 新增: 文件下载链接
const FileDownloadLink = styled.a`
  color: ${props => props.$isSelf ? 'white' : '#4a90e2'};
  text-decoration: underline;
  margin-top: 5px;
  cursor: pointer;
`;

const ChatScreen = ({ connection, peerId, targetId, messages, setMessages, resetConnection }) => {
  const [message, setMessage] = useState('');
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState('正在建立加密通道...');
  const [connectionLost, setConnectionLost] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(true); // 是否启用加密
  const messagesEndRef = useRef(null);
  const activeConnectionRef = useRef(connection); // 保存活动连接引用
  const reconnectTimeoutRef = useRef(null); // 用于重连的定时器引用
  const heartbeatIntervalRef = useRef(null); // 用于心跳检测的定时器引用
  const lastHeartbeatResponseRef = useRef(Date.now()); // 上次收到心跳响应的时间
  const maxEncryptionRetries = useRef(3); // 最大加密重试次数
  const currentEncryptionRetries = useRef(0); // 当前加密重试次数
  
  // 新增: 文件传输相关状态
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileTransferProgress, setFileTransferProgress] = useState(0);
  const [isTransferringFile, setIsTransferringFile] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState({});
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileChunksRef = useRef({});

  // 初始化
  useEffect(() => {
    // 保存连接引用
    activeConnectionRef.current = connection;
    
    // 检查是否启用加密
    const useEncryption = sessionStorage.getItem('useEncryption') === 'true';
    setIsEncryptionEnabled(useEncryption);
    
    if (!useEncryption) {
      // 非加密模式
      setEncryptionReady(true);
      setEncryptionStatus('未启用加密');
    } else {
      // 加密模式，检查加密状态
      const isEncryptionReady = sessionStorage.getItem('encryptionReady') === 'true' || 
                              sessionStorage.getItem('encryptionReady') === 'sent' ||
                              sessionStorage.getItem('encryptionReady') === 'confirmed';
      
      if (isEncryptionReady) {
        setEncryptionReady(true);
        setEncryptionStatus('加密通道已建立');
      }
    }
    
    // 设置数据监听器
    if (connection) {
      // 移除所有现有监听器，防止重复绑定
      connection.removeAllListeners('data');
      connection.removeAllListeners('close');
      connection.removeAllListeners('error');
      
      // 添加数据监听器
      connection.on('data', handleReceivedData);
      
      // 添加关闭监听器
      connection.on('close', () => {
        console.log('连接已关闭');
        setConnectionLost(true);
        setEncryptionStatus('连接已断开');
      });
      
      // 添加错误监听器
      connection.on('error', (err) => {
        console.error('连接错误:', err);
        setConnectionLost(true);
        setEncryptionStatus('连接错误');
      });
      
      // 启动心跳检测
      startHeartbeat();
    }
    
    // 检查是否需要发送加密就绪确认
    if (useEncryption) {
      checkAndSendEncryptionReadyConfirmation();
    }
    
    // 组件卸载时清理
    return () => {
      if (connection) {
        connection.removeAllListeners('data');
        connection.removeAllListeners('close');
        connection.removeAllListeners('error');
      }
      
      // 清除定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      // 清除文件预览URL
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [connection]);

  // 滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 启动心跳检测
  const startHeartbeat = () => {
    // 清除现有的心跳检测
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    // 设置初始心跳时间
    lastHeartbeatResponseRef.current = Date.now();
    
    // 每10秒发送一次心跳
    heartbeatIntervalRef.current = setInterval(() => {
      // 检查上次心跳响应时间，如果超过30秒未收到响应，认为连接已断开
      const timeSinceLastResponse = Date.now() - lastHeartbeatResponseRef.current;
      if (timeSinceLastResponse > 30000) { // 30秒
        console.log('心跳检测超时，连接可能已断开');
        setConnectionLost(true);
        setEncryptionStatus('连接已断开');
        
        // 清除心跳检测
        clearInterval(heartbeatIntervalRef.current);
        return;
      }
      
      // 发送心跳
      sendHeartbeat();
    }, 10000); // 10秒
  };

  // 发送心跳
  const sendHeartbeat = () => {
    if (!activeConnectionRef.current || connectionLost) {
      return;
    }
    
    try {
      // 使用安全发送方法确保连接已打开
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

  // 尝试重新连接
  const attemptReconnect = () => {
    if (reconnecting) {
      return;
    }
    
    setReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    
    // 使用指数退避算法计算重连延迟
    const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts)); // 最大30秒
    
    console.log(`尝试重新连接，第${reconnectAttempts + 1}次尝试，延迟${delay}毫秒`);
    setEncryptionStatus(`正在尝试重新连接 (${reconnectAttempts + 1})...`);
    
    // 清除现有的重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // 设置重连定时器
    reconnectTimeoutRef.current = setTimeout(() => {
      // 尝试重新建立连接
      resetConnection();
      setReconnecting(false);
    }, delay);
  };

  // 检查并发送加密就绪确认
  const checkAndSendEncryptionReadyConfirmation = () => {
    // 检查是否已经发送过确认
    const encryptionReadyStatus = sessionStorage.getItem('encryptionReady');
    
    if (encryptionReadyStatus === 'true' || encryptionReadyStatus === 'confirmed') {
      // 已经确认过，无需再次发送
      setEncryptionReady(true);
      setEncryptionStatus('加密通道已建立');
      return;
    }
    
    if (encryptionReadyStatus === 'sent') {
      // 已经发送过确认，但尚未收到对方的确认
      // 如果重试次数未超过最大值，则重新发送
      if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
        currentEncryptionRetries.current++;
        console.log(`重新发送加密就绪确认，第${currentEncryptionRetries.current}次尝试`);
        
        // 发送加密就绪确认
        sendEncryptionReadyConfirmation();
      } else {
        console.error('加密就绪确认重试次数已达上限');
      }
      return;
    }
    
    // 尚未发送过确认，发送加密就绪确认
    sendEncryptionReadyConfirmation();
  };

  // 发送加密就绪确认
  const sendEncryptionReadyConfirmation = () => {
    if (!activeConnectionRef.current || connectionLost) {
      return;
    }
    
    try {
      // 使用安全发送方法确保连接已打开
      const sent = peerService.sendMessageSafely(activeConnectionRef.current, {
        type: 'encryption-ready',
        timestamp: Date.now()
      });
      
      if (sent) {
        // 标记为已发送
        sessionStorage.setItem('encryptionReady', 'sent');
        console.log('已发送加密就绪确认');
      } else {
        console.log('加密就绪确认已加入待发送队列');
      }
    } catch (error) {
      console.error('发送加密就绪确认失败:', error);
    }
  };

  // 处理接收到的数据
  const handleReceivedData = (data) => {
    try {
      // 使用peerService的handleReceivedData处理二进制数据
      peerService.handleReceivedData(data, isEncryptionEnabled, sessionStorage.getItem('sharedSecret'), {
        onMessage: handleMessage,
        onFileMetadata: handleFileMetadata,
        onFileChunk: handleFileChunk,
        onFileTransferComplete: handleFileTransferComplete
      });
    } catch (error) {
      console.error('处理接收到的数据失败:', error);
    }
  };

  // 处理普通消息
  const handleMessage = (data) => {
    console.log('处理消息:', data);
    
    // 处理心跳消息
    if (data.type === 'heartbeat') {
      // 更新上次心跳响应时间
      lastHeartbeatResponseRef.current = Date.now();
      
      // 发送心跳响应
      peerService.sendMessageSafely(activeConnectionRef.current, {
        type: 'heartbeat-response',
        timestamp: Date.now()
      });
      
      return;
    }
    
    // 处理心跳响应
    if (data.type === 'heartbeat-response') {
      // 更新上次心跳响应时间
      lastHeartbeatResponseRef.current = Date.now();
      return;
    }
    
    // 处理加密就绪确认
    if (data.type === 'encryption-ready') {
      console.log('收到加密就绪确认');
      
      // 标记加密通道为就绪状态
      sessionStorage.setItem('encryptionReady', 'confirmed');
      setEncryptionReady(true);
      setEncryptionStatus('加密通道已建立');
      
      // 发送确认响应
      peerService.sendMessageSafely(activeConnectionRef.current, {
        type: 'encryption-ready-response',
        timestamp: Date.now()
      });
      
      return;
    }
    
    // 处理加密就绪确认响应
    if (data.type === 'encryption-ready-response') {
      console.log('收到加密就绪确认响应');
      
      // 标记加密通道为就绪状态
      sessionStorage.setItem('encryptionReady', 'confirmed');
      setEncryptionReady(true);
      setEncryptionStatus('加密通道已建立');
      
      return;
    }
    
    // 处理加密密钥
    if (data.type === 'encryption-key') {
      console.log('收到加密密钥');
      
      // 处理密钥交换
      handleKeyExchange(data);
      
      return;
    }
    
    // 处理加密消息
    if (data.type === 'encrypted-message') {
      console.log('收到加密消息');
      
      // 获取共享密钥
      const sharedSecret = sessionStorage.getItem('sharedSecret');
      
      if (!sharedSecret) {
        console.error('共享密钥不存在，无法解密消息');
        return;
      }
      
      try {
        // 解密消息
        const decryptedMessage = encryptionService.decrypt(data, sharedSecret);
        
        if (!decryptedMessage) {
          console.error('解密失败');
          return;
        }
        
        // 解析解密后的消息
        const messageObj = JSON.parse(decryptedMessage);
        
        // 添加消息到列表
        addMessageToList(messageObj);
      } catch (error) {
        console.error('解密失败:', error);
      }
      
      return;
    }
    
    // 处理普通消息
    if (data.type === 'message') {
      console.log('收到普通消息');
      
      // 添加消息到列表
      addMessageToList(data);
      
      return;
    }
  };

  // 处理密钥交换
  const handleKeyExchange = (data) => {
    try {
      // 获取私钥
      const privateKeyHex = sessionStorage.getItem('privateKey');
      
      if (!privateKeyHex) {
        console.error('私钥不存在，无法完成密钥交换');
        return;
      }
      
      // 将十六进制字符串转换回 WordArray
      const privateKey = CryptoJS.enc.Hex.parse(privateKeyHex);
      
      // 处理密钥交换
      const sharedSecret = encryptionService.handleKeyExchange(
        privateKey,
        data.publicKey,
        !data.isInitiator // 如果对方是发起方，那么我们就是接收方
      );
      
      if (!sharedSecret) {
        console.error('派生共享密钥失败');
        return;
      }
      
      // 保存共享密钥
      sessionStorage.setItem('sharedSecret', sharedSecret);
      console.log('密钥交换成功，共享密钥已保存');
      
      // 发送加密就绪确认
      sendEncryptionReadyConfirmation();
    } catch (error) {
      console.error('处理密钥交换失败:', error);
    }
  };

  // 添加消息到列表
  const addMessageToList = (messageObj) => {
    setMessages(prevMessages => [
      ...prevMessages,
      {
        id: Date.now(),
        sender: messageObj.sender,
        content: messageObj.content,
        timestamp: messageObj.timestamp || Date.now(),
        isSelf: messageObj.sender === peerId
      }
    ]);
  };

  // 发送消息
  const sendMessage = () => {
    if (!message.trim()) return;
    
    if (!activeConnectionRef.current || connectionLost) {
      console.error('发送消息失败: 连接不存在或已断开');
      return;
    }
    
    // 创建消息对象
    const messageObj = {
      type: 'message',
      sender: peerId,
      content: message,
      timestamp: Date.now()
    };
    
    try {
      // 检查是否启用加密
      if (isEncryptionEnabled) {
        // 加密模式
        if (!encryptionReady) {
          console.error('加密通道尚未就绪，无法发送加密消息');
          return;
        }
        
        // 获取共享密钥
        const sharedSecret = sessionStorage.getItem('sharedSecret');
        
        if (!sharedSecret) {
          console.error('共享密钥不存在，无法加密消息');
          return;
        }
        
        // 序列化消息对象
        const messageStr = JSON.stringify(messageObj);
        
        // 加密消息
        const encryptedMessage = encryptionService.encrypt(messageStr, sharedSecret);
        
        if (!encryptedMessage) {
          console.error('加密消息失败');
          return;
        }
        
        // 发送加密消息
        peerService.sendMessageSafely(activeConnectionRef.current, encryptedMessage);
      } else {
        // 非加密模式
        // 直接发送消息对象
        peerService.sendMessageSafely(activeConnectionRef.current, messageObj);
      }
      
      // 添加消息到本地列表
      addMessageToList(messageObj);
      
      // 清空输入框
      setMessage('');
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  // 处理输入框按键事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 新增: 处理文件选择
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 清除之前的文件预览
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    
    setSelectedFile(file);
    
    // 创建文件预览
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreviewUrl(previewUrl);
    } else if (file.type.startsWith('video/')) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreviewUrl(previewUrl);
    } else {
      setFilePreviewUrl(null);
    }
    
    // 重置文件输入
    e.target.value = null;
  };

  // 新增: 清除选择的文件
  const clearSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileTransferProgress(0);
  };

  // 新增: 发送文件
  const sendFile = () => {
    if (!selectedFile || !activeConnectionRef.current || connectionLost) {
      return;
    }
    
    setIsTransferringFile(true);
    
    // 发送文件
    peerService.sendFile(
      activeConnectionRef.current,
      selectedFile,
      isEncryptionEnabled,
      isEncryptionEnabled ? sessionStorage.getItem('sharedSecret') : null,
      {
        onProgress: (transferId, progress) => {
          setFileTransferProgress(progress);
        },
        onComplete: (transferId) => {
          // 添加文件消息到本地列表
          const fileMessage = {
            id: Date.now(),
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
          
          setMessages(prevMessages => [...prevMessages, fileMessage]);
          
          // 清除选择的文件
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

  // 新增: 处理文件元数据
  const handleFileMetadata = (metadata) => {
    console.log('收到文件元数据:', metadata);
    
    // 初始化文件接收状态
    fileChunksRef.current[metadata.transferId] = {
      metadata: metadata,
      chunks: new Array(metadata.chunksCount),
      receivedChunks: 0
    };
    
    // 添加文件接收状态消息
    const fileReceivingMessage = {
      id: Date.now(),
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
    
    setMessages(prevMessages => [...prevMessages, fileReceivingMessage]);
  };

  // 新增: 处理文件块
  const handleFileChunk = (transferId, chunkIndex, chunkData, metadata) => {
    // 检查文件传输状态是否存在
    if (!fileChunksRef.current[transferId]) {
      console.error('未找到文件传输状态:', transferId);
      return;
    }
    
    // 保存文件块
    fileChunksRef.current[transferId].chunks[chunkIndex] = chunkData;
    fileChunksRef.current[transferId].receivedChunks++;
    
    // 计算接收进度
    const progress = (fileChunksRef.current[transferId].receivedChunks / fileChunksRef.current[transferId].metadata.chunksCount) * 100;
    
    // 更新接收进度
    setReceivedFiles(prev => ({
      ...prev,
      [transferId]: {
        ...prev[transferId],
        progress: progress
      }
    }));
  };

  // 新增: 处理文件传输完成
  const handleFileTransferComplete = (transferId) => {
    console.log('文件传输完成:', transferId);
    
    // 检查文件传输状态是否存在
    if (!fileChunksRef.current[transferId]) {
      console.error('未找到文件传输状态:', transferId);
      return;
    }
    
    // 获取文件元数据
    const { metadata, chunks } = fileChunksRef.current[transferId];
    
    // 合并所有块
    const fileData = new Uint8Array(metadata.fileSize);
    let offset = 0;
    
    for (const chunk of chunks) {
      fileData.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    // 创建Blob对象
    const blob = new Blob([fileData], { type: metadata.fileType });
    
    // 创建对象URL
    const url = URL.createObjectURL(blob);
    
    // 更新消息列表中的文件接收状态
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.isFileReceiving && msg.transferId === transferId
          ? {
              ...msg,
              isFileReceiving: false,
              isFile: true,
              content: `发送了文件: ${metadata.fileName}`,
              file: {
                ...msg.file,
                url: url
              }
            }
          : msg
      )
    );
    
    // 清理文件传输状态
    delete fileChunksRef.current[transferId];
  };

  // 新增: 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
  };

  // 渲染文件预览
  const renderFilePreview = () => {
    if (!selectedFile) return null;
    
    return (
      <FilePreviewContainer $visible={!!selectedFile}>
        <FilePreviewHeader>
          <FilePreviewName>{selectedFile.name}</FilePreviewName>
          <FilePreviewClose onClick={clearSelectedFile}>
            <FiX />
          </FilePreviewClose>
        </FilePreviewHeader>
        
        <FilePreviewContent>
          {selectedFile.type.startsWith('image/') && filePreviewUrl && (
            <FilePreviewImage src={filePreviewUrl} alt={selectedFile.name} />
          )}
          
          {selectedFile.type.startsWith('video/') && filePreviewUrl && (
            <FilePreviewVideo src={filePreviewUrl} controls>
              <source src={filePreviewUrl} type={selectedFile.type} />
              您的浏览器不支持视频标签。
            </FilePreviewVideo>
          )}
          
          {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
            <div>
              <FiFile size={48} />
              <div>{formatFileSize(selectedFile.size)}</div>
            </div>
          )}
        </FilePreviewContent>
        
        {isTransferringFile && (
          <FileProgressContainer>
            <FileProgressBar $progress={fileTransferProgress} />
          </FileProgressContainer>
        )}
        
        <SendButton 
          onClick={sendFile} 
          disabled={isTransferringFile || !encryptionReady}
        >
          {isTransferringFile ? <FiLoader /> : <FiSend />}
          {isTransferringFile ? '发送中...' : '发送文件'}
        </SendButton>
      </FilePreviewContainer>
    );
  };

  // 渲染文件消息
  const renderFileMessage = (msg) => {
    const { file } = msg;
    
    return (
      <FileBubble key={msg.id} $isSelf={msg.isSelf}>
        <div>{msg.sender}: </div>
        
        <FileContent>
          <FileInfo>
            <FileIcon>
              {file.type.startsWith('image/') ? <FiImage /> : 
               file.type.startsWith('video/') ? <FiVideo /> : 
               <FiFile />}
            </FileIcon>
            <div>
              <FileName>{file.name}</FileName>
              <FileSize $isSelf={msg.isSelf}>{formatFileSize(file.size)}</FileSize>
            </div>
          </FileInfo>
          
          {msg.isFileReceiving && (
            <FileProgressContainer>
              <FileProgressBar 
                $progress={receivedFiles[msg.transferId]?.progress || 0} 
              />
            </FileProgressContainer>
          )}
          
          {!msg.isFileReceiving && file.url && (
            <FilePreview>
              {file.type.startsWith('image/') && (
                <FilePreviewImage src={file.url} alt={file.name} />
              )}
              
              {file.type.startsWith('video/') && (
                <FilePreviewVideo src={file.url} controls>
                  <source src={file.url} type={file.type} />
                  您的浏览器不支持视频标签。
                </FilePreviewVideo>
              )}
              
              <FileDownloadLink 
                href={file.url} 
                download={file.name}
                $isSelf={msg.isSelf}
              >
                下载文件
              </FileDownloadLink>
            </FilePreview>
          )}
        </FileContent>
        
        <Timestamp $isSelf={msg.isSelf}>
          {formatTimestamp(msg.timestamp)}
        </Timestamp>
      </FileBubble>
    );
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <PeerId>连接到: {targetId}</PeerId>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Status $isReady={encryptionReady && !connectionLost}>
            <StatusDot $isReady={encryptionReady && !connectionLost} />
            {connectionLost ? '连接已断开' : encryptionStatus}
          </Status>
          <EncryptionStatus $isEncrypted={isEncryptionEnabled}>
            {isEncryptionEnabled ? '已加密' : '未加密'}
          </EncryptionStatus>
        </div>
      </ChatHeader>
      
      {connectionLost && (
        <ConnectionStatusMessage $isError={true}>
          连接已断开，请尝试重新连接
          <ReconnectButton 
            onClick={attemptReconnect}
            disabled={reconnecting}
          >
            {reconnecting ? <FiLoader /> : <FiRefreshCw />}
            {reconnecting ? '重连中...' : '重新连接'}
          </ReconnectButton>
        </ConnectionStatusMessage>
      )}
      
      <MessagesContainer>
        {messages.map(msg => (
          msg.isFile || msg.isFileReceiving ? (
            renderFileMessage(msg)
          ) : (
            <MessageBubble key={msg.id} $isSelf={msg.isSelf}>
              <div>{msg.content}</div>
              <Timestamp $isSelf={msg.isSelf}>
                {formatTimestamp(msg.timestamp)}
              </Timestamp>
            </MessageBubble>
          )
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      {/* 新增: 文件输入容器 */}
      <FileInputContainer>
        <FileButton 
          onClick={() => fileInputRef.current.click()} 
          disabled={connectionLost || !encryptionReady}
          title="发送文件"
        >
          <FiFile />
        </FileButton>
        
        <FileButton 
          onClick={() => imageInputRef.current.click()} 
          disabled={connectionLost || !encryptionReady}
          title="发送图片"
        >
          <FiImage />
        </FileButton>
        
        <FileButton 
          onClick={() => videoInputRef.current.click()} 
          disabled={connectionLost || !encryptionReady}
          title="发送视频"
        >
          <FiVideo />
        </FileButton>
        
        <HiddenFileInput 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        
        <HiddenFileInput 
          type="file" 
          ref={imageInputRef}
          accept="image/*"
          onChange={handleFileSelect}
        />
        
        <HiddenFileInput 
          type="file" 
          ref={videoInputRef}
          accept="video/*"
          onChange={handleFileSelect}
        />
      </FileInputContainer>
      
      {/* 渲染文件预览 */}
      {renderFilePreview()}
      
      <InputContainer>
        <MessageInput
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          disabled={connectionLost || !encryptionReady}
        />
        <SendButton 
          onClick={sendMessage} 
          disabled={!message.trim() || connectionLost || !encryptionReady}
        >
          <FiSend />
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatScreen;
