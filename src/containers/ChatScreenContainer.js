import React from 'react';
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
    
    // Encryption state
    encryptionReady,
    encryptionStatus,
    
    // Connection state
    connectionLost,
    reconnecting,
    
    // File state
    selectedFile,
    filePreviewUrl,
    fileTransferProgress,
    isTransferringFile,
    receivedFiles,
    
    // Actions
    sendMessage,
    reconnectToPeer,
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
  
  // 获取最终的加密设置（优先使用sessionStorage中的值）
  const sessionUseEncryption = sessionStorage.getItem('useEncryption');
  const finalUseEncryption = sessionUseEncryption !== null ? sessionUseEncryption === 'true' : useEncryption;
  
  // Event handlers
  const handleMessageChange = (newMessage) => {
    setMessage(newMessage);
  };
  
  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleReconnect = () => {
    reconnectToPeer();
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