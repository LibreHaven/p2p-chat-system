import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiSend, FiLoader, FiRefreshCw } from 'react-icons/fi';
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

// 新增加密状态指示器
const EncryptionStatus = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  color: ${props => props.$isEncrypted ? '#2ecc71' : '#f39c12'};
  margin-left: 10px;
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
    // 如果未启用加密，则不需要发送确认
    if (sessionStorage.getItem('useEncryption') !== 'true') {
      return;
    }
    
    // 确保共享密钥存在
    const sharedSecret = sessionStorage.getItem('sharedSecret');
    if (!sharedSecret) {
      console.error('共享密钥不存在，无法发送加密就绪确认');
      return;
    }
    
    // 如果加密已就绪但未发送确认，则发送确认
    if (sessionStorage.getItem('encryptionReady') === 'true' && 
        sessionStorage.getItem('encryptionReady') !== 'sent' &&
        sessionStorage.getItem('encryptionReady') !== 'confirmed') {
      sendEncryptionReadyConfirmation();
    }
  };

  // 发送加密就绪确认
  const sendEncryptionReadyConfirmation = () => {
    // 如果未启用加密，则不需要发送确认
    if (sessionStorage.getItem('useEncryption') !== 'true') {
      return;
    }
    
    if (!activeConnectionRef.current) {
      console.error('发送加密就绪确认失败: 没有可用的连接');
      return;
    }
    
    // 确保共享密钥存在
    const sharedSecret = sessionStorage.getItem('sharedSecret');
    if (!sharedSecret) {
      console.error('发送加密就绪确认失败: 共享密钥不存在');
      return;
    }
    
    // 检查是否已经发送过加密就绪确认
    if (sessionStorage.getItem('encryptionReady') === 'sent' || 
        sessionStorage.getItem('encryptionReady') === 'confirmed') {
      console.log('已经发送过加密就绪确认，不再重复发送');
      return;
    }
    
    console.log('发送加密就绪确认消息');
    
    try {
      // 使用安全发送方法确保连接已打开
      const sent = peerService.sendMessageSafely(activeConnectionRef.current, {
        type: 'encryption-ready'
      });
      
      if (sent) {
        console.log('已发送加密就绪确认消息');
        sessionStorage.setItem('encryptionReady', 'sent');
      } else {
        console.log('连接未就绪，加密就绪确认消息将在连接打开后发送');
      }
    } catch (error) {
      console.error('发送加密就绪确认消息时出错:', error);
      
      // 如果发送失败，稍后重试，但限制重试次数
      if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
        currentEncryptionRetries.current++;
        setTimeout(() => {
          sendEncryptionReadyConfirmation();
        }, 2000);
      }
    }
  };

  // 处理接收到的数据
  const handleReceivedData = (data) => {
    try {
      // 更新最后一次心跳响应时间
      lastHeartbeatResponseRef.current = Date.now();
      
      // 处理心跳消息
      if (data.type === 'heartbeat') {
        // 发送心跳响应
        try {
          peerService.sendMessageSafely(activeConnectionRef.current, {
            type: 'heartbeat-response',
            timestamp: data.timestamp
          });
        } catch (error) {
          console.error('发送心跳响应失败:', error);
        }
        return;
      }
      
      // 处理心跳响应
      if (data.type === 'heartbeat-response') {
        // 计算往返时间
        const rtt = Date.now() - data.timestamp;
        console.log(`心跳响应，往返时间: ${rtt}ms`);
        return;
      }
      
      // 处理加密就绪确认消息
      if (data.type === 'encryption-ready') {
        console.log('收到加密就绪确认消息');
        
        // 确保共享密钥存在
        const sharedSecret = sessionStorage.getItem('sharedSecret');
        if (!sharedSecret) {
          console.error('收到加密就绪确认，但共享密钥不存在');
          return;
        }
        
        // 设置加密就绪状态
        setEncryptionReady(true);
        setEncryptionStatus('加密通道已建立');
        sessionStorage.setItem('encryptionReady', 'confirmed');
        
        // 如果我们还没有发送过确认，也发送一个确认
        if (sessionStorage.getItem('encryptionReady') !== 'sent') {
          sendEncryptionReadyConfirmation();
        }
        
        return;
      }
      
      // 检查是否启用加密
      const useEncryption = sessionStorage.getItem('useEncryption') === 'true';
      
      if (useEncryption) {
        // 加密模式 - 处理加密消息
        console.log('收到加密消息，尝试解密');
        
        // 获取共享密钥
        const sharedSecret = sessionStorage.getItem('sharedSecret');
        if (!sharedSecret) {
          console.error('共享密钥不存在，无法解密消息');
          return;
        }
        
        // 解密消息
        const decryptedText = encryptionService.decrypt(data, sharedSecret);
        if (!decryptedText) {
          console.error('解密失败');
          return;
        }
        
        // 反序列化消息
        try {
          const messageObj = JSON.parse(decryptedText);
          console.log('消息反序列化成功:', messageObj);
          
          // 添加到消息列表
          setMessages(prevMessages => [...prevMessages, messageObj]);
        } catch (error) {
          console.error('消息反序列化失败:', error);
        }
      } else {
        // 非加密模式 - 直接处理明文消息
        if (data.type === 'chat-message') {
          console.log('收到非加密聊天消息:', data);
          
          // 添加到消息列表
          setMessages(prevMessages => [...prevMessages, {
            text: data.text,
            sender: data.sender,
            timestamp: data.timestamp
          }]);
        }
      }
    } catch (error) {
      console.error('处理接收数据时出错:', error);
    }
  };

  // 发送消息
  const sendMessage = () => {
    if (!message.trim() || connectionLost) return;
    
    // 检查是否启用加密
    const useEncryption = sessionStorage.getItem('useEncryption') === 'true';
    
    // 如果启用加密，则需要确保加密已就绪
    if (useEncryption && !encryptionReady) {
      console.error('加密通道尚未建立，无法发送消息');
      return;
    }
    
    try {
      // 创建消息对象
      const messageObj = {
        text: message,
        sender: peerId,
        timestamp: Date.now()
      };
      
      // 添加到本地消息列表
      setMessages(prevMessages => [...prevMessages, messageObj]);
      
      if (useEncryption) {
        // 加密模式 - 加密消息
        
        // 确保共享密钥存在
        const sharedSecret = sessionStorage.getItem('sharedSecret');
        if (!sharedSecret) {
          console.error('共享密钥不存在，无法发送加密消息');
          return;
        }
        
        // 序列化消息
        const messageString = JSON.stringify(messageObj);
        
        // 加密消息
        const encryptedData = encryptionService.encrypt(messageString, sharedSecret);
        if (!encryptedData) {
          console.error('加密失败');
          return;
        }
        
        // 发送加密消息
        peerService.sendMessageSafely(activeConnectionRef.current, encryptedData);
      } else {
        // 非加密模式 - 直接发送明文消息
        peerService.sendMessageSafely(activeConnectionRef.current, {
          type: 'chat-message',
          text: message,
          sender: peerId,
          timestamp: Date.now()
        });
      }
      
      // 清空输入框
      setMessage('');
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <PeerId>与 {targetId} 聊天中</PeerId>
          <EncryptionStatus $isEncrypted={isEncryptionEnabled}>
            {isEncryptionEnabled ? '🔒 加密通信' : '🔓 非加密通信'}
          </EncryptionStatus>
        </div>
        <Status $isReady={encryptionReady && !connectionLost}>
          <StatusDot $isReady={encryptionReady && !connectionLost} />
          {connectionLost ? '连接已断开' : encryptionStatus}
        </Status>
      </ChatHeader>
      
      <MessagesContainer>
        {messages.map((msg, index) => (
          <MessageBubble key={index} $isSelf={msg.sender === peerId}>
            {msg.text}
            <Timestamp $isSelf={msg.sender === peerId}>
              {msg.sender} · {formatTimestamp(msg.timestamp)}
            </Timestamp>
          </MessageBubble>
        ))}
        
        {connectionLost && (
          <ConnectionStatusMessage $isError={true}>
            连接已断开，请尝试重新连接
          </ConnectionStatusMessage>
        )}
        
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      <InputContainer>
        <MessageInput
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入消息..."
          disabled={connectionLost || (isEncryptionEnabled && !encryptionReady)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        
        {connectionLost ? (
          <ReconnectButton onClick={attemptReconnect} disabled={reconnecting}>
            {reconnecting ? (
              <>
                <FiLoader style={{ marginRight: '5px', animation: 'spin 1s linear infinite' }} />
                重连中...
              </>
            ) : (
              <>
                <FiRefreshCw style={{ marginRight: '5px' }} />
                重新连接
              </>
            )}
          </ReconnectButton>
        ) : (
          <SendButton 
            onClick={sendMessage} 
            disabled={(isEncryptionEnabled && !encryptionReady) || !message.trim()}
          >
            <FiSend style={{ marginRight: '5px' }} />
            发送
          </SendButton>
        )}
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatScreen;
