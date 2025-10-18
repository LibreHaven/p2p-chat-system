import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FiSend, FiLoader, FiRefreshCw, FiFile, FiImage, FiVideo, FiX } from 'react-icons/fi';
import { Button as AntButton, Input as AntInput, Upload, Badge, Tooltip, Typography } from 'antd';

const { TextArea } = AntInput;
const { Text } = Typography;

// Styled Ant Design components for chat interface
const StyledChatInput = styled(AntInput)`
  height: 48px;
  font-size: 16px;
  border-radius: 4px;
  
  &:focus {
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

const StyledSendButton = styled(AntButton)`
  height: 48px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.ant-btn-primary {
    background-color: #4a90e2;
    border-color: #4a90e2;
    
    &:hover {
      background-color: #3a80d2 !important;
      border-color: #3a80d2 !important;
    }
  }
  
  &:disabled {
    background-color: #cccccc !important;
    border-color: #cccccc !important;
    color: #666 !important;
  }
`;

const StyledFileButton = styled(AntButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:disabled {
    background-color: #f8f9fa !important;
    color: #6c757d !important;
    border-color: #dee2e6 !important;
  }
`;

const StyledReconnectButton = styled(AntButton)`
  margin-left: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
`;

// All styled-components from ChatScreen.js
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

const EncryptionStatus = styled.div`
  font-size: 12px;
  color: ${props => props.$isEncrypted ? '#2ecc71' : '#f39c12'};
  margin-left: 10px;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: ${props => props.$isEncrypted ? '#e8f5e8' : '#fff3cd'};
  border: 1px solid ${props => props.$isEncrypted ? '#2ecc71' : '#f39c12'};
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
`;

const MessageBubble = styled.div`
  max-width: 70%;
  margin: 5px 0;
  padding: 10px 15px;
  border-radius: 18px;
  word-wrap: break-word;
  align-self: ${props => props.$isSelf ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.$isSelf ? '#4a90e2' : '#f1f1f1'};
  color: ${props => props.$isSelf ? 'white' : 'black'};
`;

const Timestamp = styled.div`
  font-size: 12px;
  color: ${props => props.$isSelf ? 'rgba(255,255,255,0.7)' : '#999'};
  margin-top: 5px;
`;

const FileBubble = styled.div`
  max-width: 70%;
  margin: 5px 0;
  padding: 15px;
  border-radius: 18px;
  word-wrap: break-word;
  align-self: ${props => props.$isSelf ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.$isSelf ? '#4a90e2' : '#f1f1f1'};
  color: ${props => props.$isSelf ? 'white' : 'black'};
`;

const FileContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const FileIcon = styled.div`
  margin-right: 10px;
  font-size: 24px;
`;

const FileName = styled.div`
  font-weight: bold;
  margin-bottom: 2px;
`;

const FileSize = styled.div`
  font-size: 12px;
  color: ${props => props.$isSelf ? 'rgba(255,255,255,0.7)' : '#666'};
`;

const FilePreview = styled.div`
  margin-top: 10px;
`;

const FilePreviewImage = styled.img`
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  margin-bottom: 10px;
`;

const FilePreviewVideo = styled.video`
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  margin-bottom: 10px;
`;

const FileDownloadLink = styled.a`
  color: #4a90e2;
  text-decoration: underline;
  margin-top: 5px;
  cursor: pointer;
`;

const FileProgressContainer = styled.div`
  width: 100%;
  height: 4px;
  background-color: rgba(255,255,255,0.3);
  border-radius: 2px;
  margin: 10px 0;
  overflow: hidden;
`;

const FileProgressBar = styled.div`
  height: 100%;
  background-color: #2ecc71;
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
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
`;

const ConnectionStatusMessage = styled.div`
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
  background-color: ${props => props.$isError ? '#ffebee' : '#e8f5e8'};
  color: ${props => props.$isError ? '#c62828' : '#2e7d32'};
  border: 1px solid ${props => props.$isError ? '#ef5350' : '#4caf50'};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FileInputContainer = styled.div`
  display: flex;
  margin-bottom: 10px;
  gap: 10px;
`;

const FileButton = styled.button`
  padding: 8px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background-color: #e9ecef;
  }
  &:disabled {
    background-color: #f8f9fa;
    color: #6c757d;
    cursor: not-allowed;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const FilePreviewContainer = styled.div`
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 300px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 15px;
  display: ${props => props.$visible ? 'block' : 'none'};
  z-index: 1000;
`;

const FilePreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const FilePreviewName = styled.div`
  font-weight: bold;
  font-size: 14px;
  flex: 1;
  margin-right: 10px;
  word-break: break-all;
`;

const FilePreviewClose = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FilePreviewContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 15px;
`;

const ChatScreenUI = ({
  // Basic props
  peerId,
  targetId,
  message,
  messages,
  encryptionReady,
  encryptionStatus,
  connectionLost,
  reconnecting,
  isEncryptionEnabled,
  useEncryption,
  
  // File props
  selectedFile,
  filePreviewUrl,
  fileTransferProgress,
  isTransferringFile,
  receivedFiles,
  
  // Event handlers
  onMessageChange,
  onSendMessage,
  onKeyPress,
  onReconnect,
  onFileSelect,
  onClearFile,
  onSendFile
}) => {
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const encryptionGateActive = useEncryption && !encryptionReady;
  
  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Utility functions
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
    e.target.value = null;
  };
  
  // Render file preview
  const renderFilePreview = () => {
    if (!selectedFile) return null;
    
    return (
      <FilePreviewContainer $visible={!!selectedFile}>
        <FilePreviewHeader>
          <FilePreviewName>{selectedFile.name}</FilePreviewName>
          <FilePreviewClose onClick={onClearFile}>
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
        <SendButton
          onClick={onSendFile}
          disabled={isTransferringFile || connectionLost || encryptionGateActive}
        >
          {isTransferringFile ? <FiLoader /> : <FiSend />}
          {isTransferringFile ? '发送中...' : '发送文件'}
        </SendButton>
      </FilePreviewContainer>
    );
  };
  
  // Render file message
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
        <Timestamp>{formatTimestamp(msg.timestamp)}</Timestamp>
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
            {useEncryption ? 
              (encryptionReady ? '已加密' : 
                (encryptionStatus.includes('失败') ? '加密失败' : '加密中...')) : 
              '未启用加密'
            }
            {/* 调试信息 - 显示最终协商的加密状态 */}
            <div style={{fontSize: '10px', marginTop: '2px', opacity: 0.7}}>
              协商结果: {useEncryption ? 'true' : 'false'}
            </div>
          </EncryptionStatus>
        </div>
      </ChatHeader>
      
      {connectionLost && (
        <ConnectionStatusMessage $isError={true}>
          连接已断开，请尝试重新连接
          <StyledReconnectButton 
            onClick={onReconnect} 
            disabled={reconnecting}
            loading={reconnecting}
            icon={reconnecting ? <FiLoader /> : <FiRefreshCw />}
          >
            {reconnecting ? '重连中...' : '重新连接'}
          </StyledReconnectButton>
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
        <Tooltip title="发送文件">
          <StyledFileButton 
            onClick={() => fileInputRef.current.click()} 
            disabled={connectionLost || encryptionGateActive}
            icon={<FiFile />}
          />
        </Tooltip>
        <Tooltip title="发送图片">
          <StyledFileButton 
            onClick={() => imageInputRef.current.click()} 
            disabled={connectionLost || encryptionGateActive}
            icon={<FiImage />}
          />
        </Tooltip>
        <Tooltip title="发送视频">
          <StyledFileButton 
            onClick={() => videoInputRef.current.click()} 
            disabled={connectionLost || encryptionGateActive}
            icon={<FiVideo />}
          />
        </Tooltip>
        <HiddenFileInput type="file" ref={fileInputRef} onChange={handleFileInputChange} />
        <HiddenFileInput type="file" ref={imageInputRef} accept="image/*" onChange={handleFileInputChange} />
        <HiddenFileInput type="file" ref={videoInputRef} accept="video/*" onChange={handleFileInputChange} />
      </FileInputContainer>
      
      {renderFilePreview()}
      
      <InputContainer>
        <StyledChatInput
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="输入消息..."
          disabled={connectionLost || encryptionGateActive}
          style={{ marginRight: '10px' }}
        />
        <StyledSendButton 
          type="primary"
          onClick={onSendMessage} 
          disabled={!message.trim() || connectionLost || encryptionGateActive}
          icon={<FiSend />}
        />
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatScreenUI;