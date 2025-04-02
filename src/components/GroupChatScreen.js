import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiSend, FiImage, FiFile, FiVideo, FiArrowLeft, FiSettings, FiInfo } from 'react-icons/fi';
import messageService from '../services/messageService';

// 成员列表组件将在下一步实现，这里暂时导入一个占位符
import MembersList from './MembersList';

const GroupChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f9f9f9;
  position: relative;
`;

const GroupChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const GroupInfo = styled.div`
  display: flex;
  align-items: center;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 15px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #333;
  }
`;

const GroupName = styled.h3`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

const GroupMeta = styled.div`
  margin-left: 10px;
  font-size: 13px;
  color: #888;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 50%;
  
  &:hover {
    color: #333;
    background-color: #f0f0f0;
  }
`;

const ContentArea = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const MessagesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  position: relative;
  
  background-color: ${props => props.$isOwn ? '#dcf8c6' : '#fff'};
  border: 1px solid ${props => props.$isOwn ? '#c7e9b0' : '#e0e0e0'};
  margin-left: ${props => props.$isOwn ? 'auto' : '0'};
  margin-right: ${props => !props.$isOwn ? 'auto' : '0'};
  
  &::after {
    content: "";
    position: absolute;
    top: 12px;
    width: 10px;
    height: 10px;
    transform: rotate(45deg);
    
    ${props => props.$isOwn 
      ? `right: -5px; background-color: #dcf8c6; border-right: 1px solid #c7e9b0; border-top: 1px solid #c7e9b0;` 
      : `left: -5px; background-color: #fff; border-left: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0;`}
  }
`;

const SystemMessage = styled.div`
  align-self: center;
  padding: 8px 12px;
  background-color: #f0f0f0;
  border-radius: 12px;
  font-size: 12px;
  color: #666;
  max-width: 80%;
  text-align: center;
  margin: 10px 0;
`;

const MessageSender = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 4px;
`;

const MessageContent = styled.div`
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
`;

const MessageTime = styled.div`
  font-size: 11px;
  color: #aaa;
  text-align: right;
  margin-top: 4px;
`;

const FileMessageContent = styled.div`
  display: flex;
  align-items: center;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  margin-top: 8px;
`;

const FileIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background-color: #eee;
  margin-right: 10px;
`;

const FileInfo = styled.div`
  flex: 1;
`;

const FileName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const FileSize = styled.div`
  font-size: 12px;
  color: #888;
`;

const DownloadButton = styled.button`
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 10px;
  
  &:hover {
    background-color: #3a80d2;
  }
`;

const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 200px;
  border-radius: 6px;
  margin-top: 8px;
  cursor: pointer;
`;

const VideoPreview = styled.video`
  max-width: 100%;
  max-height: 200px;
  border-radius: 6px;
  margin-top: 8px;
  cursor: pointer;
`;

const MessageComposer = styled.div`
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 10px 15px;
  border-top: 1px solid #eee;
`;

const FileButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-right: 10px;
`;

const FileButton = styled.button`
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  
  &:hover {
    background-color: #f0f0f0;
    color: #666;
  }
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
  }
`;

const SendButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.disabled ? '#ccc' : '#4a90e2'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  margin-left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  
  &:hover:not(:disabled) {
    background-color: #f0f0f0;
  }
`;

// 格式化时间戳
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

const GroupChatScreen = ({
  group,
  messages,
  currentUser,
  onSendMessage,
  onSendFile,
  onDownloadFile,
  onGoBack,
  onManageGroup
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef(null);
  
  // 处理发送消息
  const handleSendMessage = () => {
    if (!message.trim()) return;
    onSendMessage(message);
    setMessage('');
  };
  
  // 处理发送文件
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onSendFile(file);
      // 重置文件选择器
      e.target.value = '';
    }
  };
  
  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 渲染消息内容
  const renderMessageContent = (message) => {
    const { type, content, metadata } = message;
    
    if (type === 'system') {
      return messageService.formatSystemMessage(message);
    }
    
    if (type === 'text') {
      return content;
    }
    
    if (type === 'file') {
      const { fileName, fileSize, fileType } = metadata;
      
      if (fileType.startsWith('image/')) {
        return (
          <>
            <div>发送了一张图片</div>
            <ImagePreview 
              src={content} 
              alt={fileName}
              onClick={() => window.open(content, '_blank')}
            />
          </>
        );
      }
      
      if (fileType.startsWith('video/')) {
        return (
          <>
            <div>发送了一个视频</div>
            <VideoPreview controls>
              <source src={content} type={fileType} />
              您的浏览器不支持视频标签
            </VideoPreview>
          </>
        );
      }
      
      return (
        <>
          <div>发送了一个文件</div>
          <FileMessageContent>
            <FileIcon>
              <FiFile size={20} />
            </FileIcon>
            <FileInfo>
              <FileName>{fileName}</FileName>
              <FileSize>{formatFileSize(fileSize)}</FileSize>
            </FileInfo>
            <DownloadButton onClick={() => onDownloadFile(message)}>
              下载
            </DownloadButton>
          </FileMessageContent>
        </>
      );
    }
    
    return content;
  };
  
  return (
    <GroupChatContainer>
      <GroupChatHeader>
        <GroupInfo>
          <BackButton onClick={onGoBack}>
            <FiArrowLeft size={20} />
          </BackButton>
          <GroupName>{group.name}</GroupName>
          <GroupMeta>{group.members.length}人</GroupMeta>
        </GroupInfo>
        <HeaderActions>
          <ActionButton onClick={() => setShowMembers(!showMembers)}>
            <FiInfo size={20} />
          </ActionButton>
          <ActionButton onClick={onManageGroup}>
            <FiSettings size={20} />
          </ActionButton>
        </HeaderActions>
      </GroupChatHeader>
      
      <ContentArea>
        <MessagesContainer>
          <MessagesList>
            {messages.map((msg, index) => {
              const isOwn = msg.sender === currentUser;
              const isSystem = msg.type === 'system';
              
              if (isSystem) {
                return (
                  <SystemMessage key={msg.id || index}>
                    {renderMessageContent(msg)}
                  </SystemMessage>
                );
              }
              
              return (
                <MessageBubble key={msg.id || index} $isOwn={isOwn}>
                  {!isOwn && (
                    <MessageSender>
                      {msg.senderName || msg.sender.substring(0, 8)}
                    </MessageSender>
                  )}
                  <MessageContent>
                    {renderMessageContent(msg)}
                  </MessageContent>
                  <MessageTime>
                    {formatTime(msg.timestamp)}
                  </MessageTime>
                </MessageBubble>
              );
            })}
            <div ref={messagesEndRef} />
          </MessagesList>
        </MessagesContainer>
        
        {showMembers && (
          <MembersList 
            group={group}
            currentUser={currentUser}
            onMemberClick={() => {}}
            onInviteMember={() => {}}
            onToggleCollapse={() => setShowMembers(false)}
          />
        )}
      </ContentArea>
      
      <MessageComposer>
        <FileButtons>
          <FileButton onClick={() => document.getElementById('image-input').click()}>
            <FiImage size={20} />
          </FileButton>
          <FileButton onClick={() => document.getElementById('file-input').click()}>
            <FiFile size={20} />
          </FileButton>
          <FileButton onClick={() => document.getElementById('video-input').click()}>
            <FiVideo size={20} />
          </FileButton>
          
          <input 
            id="file-input" 
            type="file" 
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <input 
            id="image-input" 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <input 
            id="video-input" 
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </FileButtons>
        
        <MessageInput
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入消息..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        
        <SendButton onClick={handleSendMessage} disabled={!message.trim()}>
          <FiSend size={20} />
        </SendButton>
      </MessageComposer>
    </GroupChatContainer>
  );
};

export default GroupChatScreen; 