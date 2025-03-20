import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiLogOut } from 'react-icons/fi';
import { encryptionService } from '../services/encryptionService';
import messageService from '../services/messageService';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f5f5;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #4a90e2;
  color: white;
`;

const HeaderTitle = styled.h2`
  font-size: 18px;
  font-weight: 500;
`;

const DisconnectButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

// 移除了已经不需要的样式组件，因为我们使用了独立的组件

const ChatScreen = ({
  peerId,
  targetId,
  connection,
  messages,
  setMessages,
  resetConnection
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [connectionActive, setConnectionActive] = useState(true);

  // 监听连接状态
  useEffect(() => {
    if (!connection) {
      setConnectionActive(false);
      return;
    }

    setConnectionActive(true);

    // 监听连接关闭
    const handleConnectionClose = () => {
      console.log('连接已关闭');
      setConnectionActive(false);
      setTimeout(() => {
        resetConnection();
      }, 1000);
    };

    // 添加事件监听器
    connection.on('close', handleConnectionClose);

    // 清理函数
    return () => {
      connection.off('close', handleConnectionClose);
    };
  }, [connection, resetConnection]);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 发送消息
  const sendMessage = () => {
    if (!inputMessage.trim() || !connection || !connectionActive) {
      return;
    }

    try {
      // 创建消息对象
      const message = messageService.createMessage(inputMessage.trim(), peerId);
      
      // 添加到本地消息列表
      setMessages(prevMessages => [...prevMessages, message]);
      
      // 序列化消息
      const serializedMessage = messageService.serializeMessage(message);
      
      // 加密消息
      const sharedSecret = sessionStorage.getItem('sharedSecret');
      if (!sharedSecret) {
        console.error('共享密钥不存在，无法加密消息');
        return;
      }
      
      // 使用 AES-256-CBC 加密消息
      const encryptedData = encryptionService.encrypt(serializedMessage, sharedSecret);
      
      // 发送加密消息
      connection.send({
        type: 'encrypted-message',
        encrypted: encryptedData
      });
      
      // 清空输入框
      setInputMessage('');
    } catch (error) {
      console.error('发送消息时出错:', error);
    }
  };

  // 格式化时间戳
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ChatContainer>
      <Header>
        <HeaderTitle>与 {targetId} 聊天中</HeaderTitle>
        <DisconnectButton onClick={resetConnection}>
          <FiLogOut /> 断开连接
        </DisconnectButton>
      </Header>
      
      <MessagesContainer>
        {messages.map((msg, index) => (
          <MessageBubble 
            key={index} 
            message={msg} 
            isSelf={msg.sender === peerId} 
          />
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      <MessageComposer
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onSend={sendMessage}
        disabled={!connectionActive}
      />
    </ChatContainer>
  );
};

export default ChatScreen;
