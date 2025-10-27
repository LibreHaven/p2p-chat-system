import React from 'react';
import useChatSessionStore from '../shared/store/chatSessionStore';
import useChatSession from '../hooks/useChatSession';
import ChatScreenUI from '../components/ui/ChatScreenUI';

const ChatScreenContainer = ({ 
  peerId, 
  targetId, 
  connection, 
  useEncryption,
  onNavigateBack // 添加回调函数替代useNavigate
}) => {
  const {
    // Message state
    message,
    messages,
    // 其余状态改由全局 Store 读取，避免重复传递
    
    // File state
    selectedFile,
    filePreviewUrl,
    fileTransferProgress,
    isTransferringFile,
    receivedFiles,
    
    // Actions
    sendMessage,
    attemptReconnect,
    handleFileSelect,
    clearSelectedFile,
    sendFile,
    setMessage
  } = useChatSession({
    peerId,
    targetId,
    connection,
    useEncryption,
    onConnectionLost: () => {
      console.log('Connection lost in container');
    },
    onNavigateBack: onNavigateBack // 使用传入的回调函数
  });
  
  // 从全局 Store 读取会话关键状态（由 hooks 同步写入）
  const encryptionReady = useChatSessionStore((s) => s.encryptionReady);
  const encryptionStatus = useChatSessionStore((s) => s.encryptionStatus);
  const connectionLost = useChatSessionStore((s) => s.connectionLost);
  const reconnecting = useChatSessionStore((s) => s.reconnecting);
  const finalUseEncryption = useChatSessionStore((s) => s.finalUseEncryption);
  
  // Event handlers
  const handleMessageChange = (newMessage) => {
    setMessage(newMessage);
  };
  
  const handleSendMessage = () => {
    if (message.trim()) {
      // useChatSession 暴露为闭包，无需参数
      sendMessage();
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleReconnect = () => {
    attemptReconnect();
  };
  
  const handleFileSelectWrapper = (file) => {
    handleFileSelect(file);
  };
  
  const handleClearFile = () => {
    clearSelectedFile();
  };
  
  const handleSendFile = () => {
    if (selectedFile) {
      sendFile();
    }
  };
  
  return (
    <ChatScreenUI
      // Basic props
      peerId={peerId}
      targetId={targetId}
      message={message}
      messages={messages}
      encryptionReady={encryptionReady}
      encryptionStatus={encryptionStatus}
      connectionLost={connectionLost}
      reconnecting={reconnecting}
  isEncryptionEnabled={finalUseEncryption && encryptionReady}
  useEncryption={finalUseEncryption}
      
      // File props
      selectedFile={selectedFile}
      filePreviewUrl={filePreviewUrl}
      fileTransferProgress={fileTransferProgress}
      isTransferringFile={isTransferringFile}
      receivedFiles={receivedFiles}
      
      // Event handlers
      onMessageChange={handleMessageChange}
      onSendMessage={handleSendMessage}
      onKeyPress={handleKeyPress}
      onReconnect={handleReconnect}
      onFileSelect={handleFileSelectWrapper}
      onClearFile={handleClearFile}
      onSendFile={handleSendFile}
    />
  );
};

export default ChatScreenContainer;