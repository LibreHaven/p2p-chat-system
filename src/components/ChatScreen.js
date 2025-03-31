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
  color: ${props => props.$isSelf ? 'rgba(255,255,255,0.7)' : '#999'};
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

const EncryptionStatus = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  color: ${props => props.$isEncrypted ? '#2ecc71' : '#f39c12'};
  margin-left: 10px;
`;

const FileInputContainer = styled.div`
  display: flex;
  margin-top: 10px;
  margin-bottom: 10px;
`;

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

const HiddenFileInput = styled.input`
  display: none;
`;

const FilePreviewContainer = styled.div`
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: ${props => props.$visible ? 'block' : 'none'};
`;

const FilePreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const FilePreviewName = styled.div`
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80%;
`;

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

const FilePreviewContent = styled.div`
  max-width: 100%;
  max-height: 200px;
  overflow: hidden;
  margin-bottom: 10px;
`;

const FilePreviewImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
`;

const FilePreviewVideo = styled.video`
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
`;

const FileProgressContainer = styled.div`
  width: 100%;
  height: 10px;
  background-color: #f1f1f1;
  border-radius: 5px;
  margin-top: 10px;
`;

const FileProgressBar = styled.div`
  height: 100%;
  background-color: #4caf50;
  border-radius: 5px;
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
`;

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

const FileContent = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 5px;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;

const FileIcon = styled.div`
  margin-right: 10px;
  font-size: 24px;
`;

const FileName = styled.div`
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
`;

const FileSize = styled.div`
  font-size: 12px;
  color: ${props => props.$isSelf ? 'rgba(255,255,255,0.7)' : '#999'};
  margin-top: 2px;
`;

const FilePreview = styled.div`
  margin-top: 10px;
  max-width: 100%;
  max-height: 200px;
  overflow: hidden;
`;

const FileDownloadLink = styled.a`
  color: #4a90e2;
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
  // 默认启用加密，用户可选择不启用
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const activeConnectionRef = useRef(connection);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const lastHeartbeatResponseRef = useRef(Date.now());
  const maxEncryptionRetries = useRef(3);
  const currentEncryptionRetries = useRef(0);

  // 文件传输相关状态
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileTransferProgress, setFileTransferProgress] = useState(0);
  const [isTransferringFile, setIsTransferringFile] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState({});
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileChunksRef = useRef({});
  const fileChunksBufferRef = useRef({}); // 新增：缓冲区

  useEffect(() => {
    activeConnectionRef.current = connection;
    // 从 sessionStorage 读取是否启用加密；若未设置则默认启用
    const useEnc = sessionStorage.getItem('useEncryption') !== 'false';
    setIsEncryptionEnabled(useEnc);
    if (!useEnc) {
      setEncryptionReady(true);
      setEncryptionStatus('未启用加密');
    } else {
      const readyStatus = sessionStorage.getItem('encryptionReady');
      if (readyStatus === 'true' || readyStatus === 'sent' || readyStatus === 'confirmed') {
        setEncryptionReady(true);
        setEncryptionStatus('加密通道已建立');
      }
    }
    if (!connection) return;
    connection.removeAllListeners('data');
    connection.removeAllListeners('close');
    connection.removeAllListeners('error');
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
    if (useEnc) {
      checkAndSendEncryptionReadyConfirmation();
    }
    return () => {
      if (connection) {
        connection.removeAllListeners('data');
        connection.removeAllListeners('close');
        connection.removeAllListeners('error');
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [connection]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

  const attemptReconnect = () => {
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

  const checkAndSendEncryptionReadyConfirmation = () => {
    const status = sessionStorage.getItem('encryptionReady');
    if (status === 'true' || status === 'confirmed') {
      setEncryptionReady(true);
      setEncryptionStatus('加密通道已建立');
      return;
    }
    if (status === 'sent') {
      if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
        currentEncryptionRetries.current++;
        console.log(`重新发送加密就绪确认，第${currentEncryptionRetries.current}次尝试`);
        sendEncryptionReadyConfirmation();
      } else {
        console.error('加密就绪确认重试次数已达上限');
      }
      return;
    }
    sendEncryptionReadyConfirmation();
  };

  const sendEncryptionReadyConfirmation = () => {
    if (!activeConnectionRef.current || connectionLost) return;
    try {
      const sent = peerService.sendMessageSafely(activeConnectionRef.current, {
        type: 'encryption-ready',
        timestamp: Date.now()
      });
      if (sent) {
        sessionStorage.setItem('encryptionReady', 'sent');
        console.log('已发送加密就绪确认');
        setTimeout(() => {
          if (sessionStorage.getItem('encryptionReady') !== 'confirmed') {
            console.log(`未收到对方的加密就绪确认，再次发送 (${currentEncryptionRetries.current + 1}/${maxEncryptionRetries.current})`);
            currentEncryptionRetries.current++;
            sessionStorage.setItem('encryptionReady', 'true');
            sendEncryptionReadyConfirmation();
          }
        }, 5000);
      } else {
        console.log('连接未就绪，加密就绪确认消息将在连接打开后发送');
      }
    } catch (error) {
      console.error('发送加密就绪确认消息时出错:', error);
      if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
        currentEncryptionRetries.current++;
        setTimeout(() => { sendEncryptionReadyConfirmation(); }, 2000);
      }
    }
  };

  const handleReceivedData = (data, sourceConn) => {
    try {
      // 如果是心跳消息，则更新最后响应时间，并返回
      if (data.type === 'heartbeat' || data.type === 'heartbeat-response') {
        lastHeartbeatResponseRef.current = Date.now();
        return;
      }
      peerService.handleReceivedData(
        data,
        isEncryptionEnabled,
        isEncryptionEnabled ? window.sharedCryptoKey : null,
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
  };


  const handleKeyExchange = async (data) => {
    try {
      if (!window.encryptionState) {
        console.error('加密状态对象不存在');
        return;
      }
      await window.encryptionState.processRemotePublicKey(data.publicKey);
      window.sharedCryptoKey = window.encryptionState.sharedSecret;
      console.log('密钥交换成功，共享密钥已保存');
      sendEncryptionReadyConfirmation();
    } catch (error) {
      console.error('处理密钥交换失败:', error);
    }
  };

  const handleMessage = async (data) => {
    console.log('处理消息:', data);
    // 排除心跳和加密就绪确认消息
    if (data.type === 'heartbeat' || data.type === 'heartbeat-response' ||
      data.type === 'encryption-ready' || data.type === 'encryption-ready-response') return;

    if (data.type === 'encrypted-message') {
      try {
        const decrypted = await encryptionService.decrypt(data, window.sharedCryptoKey);
        if (!decrypted) {
          console.error('解密返回为空，忽略此消息');
          return;
        }
        const messageObj = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
        // 如果解密后的消息类型为文件元数据，则调用 onFileMetadata 回调
        if (messageObj.type === 'file-metadata') {
          handleFileMetadata(messageObj);
        } else {
          addMessageToList(messageObj);
        }
        
      } catch (error) {
        console.error('解密失败:', error);
      }
    } else if (data.type === 'file-chunk') {
      // 确保只处理文件块消息，且使用 decryptRaw 进行解密
      try {
        if (data.encryptedData && isEncryptionEnabled && window.sharedCryptoKey) {
          let encryptedDataObj;
          if (typeof data.encryptedData === 'string') {
            encryptedDataObj = JSON.parse(data.encryptedData);
          } else {
            encryptedDataObj = data.encryptedData;
          }
          const decryptedBase64 = await encryptionService.decryptRaw(encryptedDataObj, window.sharedCryptoKey);
          if (!decryptedBase64) {
            console.error('文件块解密返回为空');
            return;
          }
          // 修改处：调用 utils 内的 base64ToArrayBuffer
          const chunkData = encryptionService.utils.base64ToArrayBuffer(decryptedBase64);
          // 调用文件块处理回调
          if (callbacks.onFileChunk) {
            callbacks.onFileChunk(data.transferId, data.chunkIndex, chunkData, data);
          }
          if (data.isLastChunk && callbacks.onFileTransferComplete) {
            callbacks.onFileTransferComplete(data.transferId);
          }
        }
      } catch (error) {
        console.error('文件块解密失败:', error);
      }
      return;
    }
    else {
      // 其他非加密消息处理
      addMessageToList(data);
    }
  };

  const addMessageToList = (messageObj) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: messageObj.sender,
        content: messageObj.content,
        timestamp: messageObj.timestamp || Date.now(),
        isSelf: messageObj.sender === peerId
      }
    ]);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreviewUrl(previewUrl);
    } else {
      setFilePreviewUrl(null);
    }
    e.target.value = null;
  };

  const clearSelectedFile = () => {
    // 注释掉立即撤销 Blob URL 的代码，确保预览 URL 仍然有效。
    // 如果需要，可以使用 setTimeout 延迟撤销，例如：
    // setTimeout(() => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl); }, 60000);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileTransferProgress(0);
  };


  const sendFile = () => {
    if (!selectedFile || !activeConnectionRef.current || connectionLost) return;
    setIsTransferringFile(true);
    peerService.sendFile(
      activeConnectionRef.current,
      selectedFile,
      isEncryptionEnabled,
      isEncryptionEnabled ? window.sharedCryptoKey : null,
      {
        onProgress: (transferId, progress) => {
          setFileTransferProgress(progress);
        },
        onComplete: (transferId) => {
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

  const handleFileMetadata = (metadata) => {
    console.log('收到文件元数据:', metadata);
    // 初始化传输状态
    fileChunksRef.current[metadata.transferId] = {
      metadata,
      chunks: new Array(metadata.chunksCount),
      receivedChunks: 0
    };
    // 检查缓冲区中是否有先前收到的文件块，并合并到传输状态中
    if (fileChunksBufferRef.current[metadata.transferId]) {
      const bufferedChunks = fileChunksBufferRef.current[metadata.transferId];
      Object.keys(bufferedChunks).forEach(index => {
        fileChunksRef.current[metadata.transferId].chunks[index] = bufferedChunks[index];
        fileChunksRef.current[metadata.transferId].receivedChunks++;
      });
      delete fileChunksBufferRef.current[metadata.transferId];
    }
    const fileMsg = {
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
    setMessages(prev => [...prev, fileMsg]);
  };

  const handleFileChunk = (transferId, chunkIndex, chunkData, metadata) => {
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
  };


  const handleFileTransferComplete = (transferId) => {
    console.log('文件传输完成:', transferId);
    if (!fileChunksRef.current[transferId]) {
      console.error('未找到文件传输状态:', transferId);
      return;
    }
    const { metadata, chunks } = fileChunksRef.current[transferId];
    // 计算所有块的实际总长度
    let totalLength = 0;
    for (const chunk of chunks) {
      if (!chunk || typeof chunk.byteLength !== 'number') {
        console.error('缺少或无效的文件块，无法合并文件', transferId);
        // 可考虑给出错误提示或清理该传输状态
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
          ? { ...msg, isFileReceiving: false, isFile: true, content: `发送了文件: ${metadata.fileName}`, file: { ...msg.file, url } }
          : msg
      )
    );
    delete fileChunksRef.current[transferId];
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

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
          {!(selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/')) && (
            <div>
              <FiFile size={48} />
              <div>{formatFileSize(selectedFile.size)}</div>
            </div>
          )}
        </FilePreviewContent>
        <FileProgressContainer>
          <FileProgressBar $progress={fileTransferProgress} />
        </FileProgressContainer>
        <SendButton onClick={sendFile} disabled={isTransferringFile || !encryptionReady}>
          {isTransferringFile ? <FiLoader /> : <FiSend />}
          {isTransferringFile ? '发送中...' : '发送文件'}
        </SendButton>
      </FilePreviewContainer>
    );
  };

  const renderFileMessage = (msg) => {
    const { file } = msg;
    return (
      <FileBubble key={msg.id} $isSelf={msg.isSelf}>
        <div>{msg.sender}: </div>
        <FileContent>
          <FileInfo>
            <FileIcon>
              {file.type.startsWith('image/') ? <FiImage /> :
                file.type.startsWith('video/') ? <FiVideo /> : <FiFile />}
            </FileIcon>
            <div>
              <FileName>{file.name}</FileName>
              <FileSize $isSelf={msg.isSelf}>{formatFileSize(file.size)}</FileSize>
            </div>
          </FileInfo>
          {msg.isFileReceiving && (
            <FileProgressContainer>
              <FileProgressBar $progress={receivedFiles[msg.transferId]?.progress || 0} />
            </FileProgressContainer>
          )}
          {!msg.isFileReceiving && file.url && (
            <FilePreview>
              {file.type.startsWith('image/') && <FilePreviewImage src={file.url} alt={file.name} />}
              {file.type.startsWith('video/') && (
                <FilePreviewVideo src={file.url} controls>
                  <source src={file.url} type={file.type} />
                  您的浏览器不支持视频标签。
                </FilePreviewVideo>
              )}
              <FileDownloadLink href={file.url} download={file.name}>
                下载文件
              </FileDownloadLink>
            </FilePreview>
          )}
        </FileContent>
        <Timestamp>{new Date(msg.timestamp).toLocaleTimeString()}</Timestamp>
      </FileBubble>
    );
  };

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
      if (isEncryptionEnabled) {
        if (!encryptionReady) {
          console.error('加密通道尚未就绪，无法发送加密消息');
          return;
        }
        if (!window.sharedCryptoKey) {
          console.error('共享密钥不存在，无法加密消息');
          return;
        }
        const messageStr = JSON.stringify(messageObj);
        const encryptedMessage = await encryptionService.encrypt(messageStr, window.sharedCryptoKey);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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
          <ReconnectButton onClick={attemptReconnect} disabled={reconnecting}>
            {reconnecting ? <FiLoader /> : <FiRefreshCw />}
            {reconnecting ? '重连中...' : '重新连接'}
          </ReconnectButton>
        </ConnectionStatusMessage>
      )}
      <MessagesContainer>
        {messages.map(msg =>
          msg.isFile || msg.isFileReceiving
            ? renderFileMessage(msg)
            : (
              <MessageBubble key={msg.id} $isSelf={msg.isSelf}>
                <div>{msg.content}</div>
                <Timestamp>{formatTimestamp(msg.timestamp)}</Timestamp>
              </MessageBubble>
            )
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <FileInputContainer>
        <FileButton onClick={() => fileInputRef.current.click()} disabled={connectionLost || !encryptionReady} title="发送文件">
          <FiFile />
        </FileButton>
        <FileButton onClick={() => imageInputRef.current.click()} disabled={connectionLost || !encryptionReady} title="发送图片">
          <FiImage />
        </FileButton>
        <FileButton onClick={() => videoInputRef.current.click()} disabled={connectionLost || !encryptionReady} title="发送视频">
          <FiVideo />
        </FileButton>
        <HiddenFileInput type="file" ref={fileInputRef} onChange={handleFileSelect} />
        <HiddenFileInput type="file" ref={imageInputRef} accept="image/*" onChange={handleFileSelect} />
        <HiddenFileInput type="file" ref={videoInputRef} accept="video/*" onChange={handleFileSelect} />
      </FileInputContainer>
      {renderFilePreview()}
      <InputContainer>
        <MessageInput
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          disabled={connectionLost || !encryptionReady}
        />
        <SendButton onClick={sendMessage} disabled={!message.trim() || connectionLost || !encryptionReady}>
          <FiSend />
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatScreen;
