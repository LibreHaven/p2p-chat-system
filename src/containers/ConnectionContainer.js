import React, { useState } from 'react';
import useConnection from '../hooks/useConnection';
import ConnectionScreenUI from '../components/ui/ConnectionScreenUI';

const ConnectionContainer = ({ 
  peerId, 
  setPeerId, 
  onConnectionSuccess, 
  onConnectionError 
}) => {
  // 移除重复的 targetId 和 useEncryption 状态声明
  // const [targetId, setTargetId] = useState(''); // 删除这行
  // const [useEncryption, setUseEncryption] = useState(true); // 删除这行，使用 hook 的状态
  const [messages, setMessages] = useState([]);
  
  const {
    // Connection state
    isPeerCreated,
    connectionStatus,
    waitingForAcceptance,
    showConnectionRequest,
    incomingPeerId,
    incomingUseEncryption,
    targetId, // 添加：从 useConnection 获取
    useEncryption, // 添加：从 useConnection 获取加密状态
    
    // Error state
    customIdError,
    targetIdError,
    showToast,
    toastMessage,
    
    // Actions
    generateRandomId,
    createPeerConnection,
    connectToPeer,
    acceptConnection,
    rejectIncomingConnection,
    setTargetId, // 添加：从 useConnection 获取
    setUseEncryption // 添加：从 useConnection 获取加密状态设置函数
  } = useConnection({
    peerId,
    setPeerId,
    setMessages,
    onConnectionSuccess: (connection, targetPeerId, encryption) => {
      onConnectionSuccess(connection, targetPeerId, encryption);
    },
    onConnectionError: (error) => {
      onConnectionError(error);
    }
  });
  
  // Event handlers
  const handleGenerateRandomId = () => {
    const newId = generateRandomId();
    setPeerId(newId);
  };
  
  const handleCreateConnection = () => {
    createPeerConnection();
  };
  
  const handleToggleEncryption = () => {
    // 使用 hook 提供的 setUseEncryption
    setUseEncryption(!useEncryption);
  };
  
  const handleTargetIdChange = (newTargetId) => {
    // 现在正确调用 useConnection 提供的 setTargetId
    setTargetId(newTargetId);
  };
  
  const handlePeerIdChange = (newPeerId) => {
    setPeerId(newPeerId);
  };
  
  const handleConnectToPeer = () => {
    if (targetId.trim()) {
      connectToPeer(); // 现在能正确读取到 targetId
    }
  };
  
  const handleAcceptConnection = () => {
    acceptConnection();
  };
  
  const handleRejectConnection = () => {
    rejectIncomingConnection();
  };

  return (
    <ConnectionScreenUI
      // Connection state
      isPeerCreated={isPeerCreated}
      connectionStatus={connectionStatus}
      peerId={peerId}
      useEncryption={useEncryption}
      targetId={targetId}
      waitingForAcceptance={waitingForAcceptance}
      showConnectionRequest={showConnectionRequest}
      incomingPeerId={incomingPeerId}
      incomingUseEncryption={incomingUseEncryption}
      
      // Error state
      customIdError={customIdError}
      targetIdError={targetIdError}
      showToast={showToast}
      toastMessage={toastMessage}
      
      // Event handlers
      onPeerIdChange={handlePeerIdChange}
      onGenerateRandomId={handleGenerateRandomId}
      onCreateConnection={handleCreateConnection}
      onToggleEncryption={handleToggleEncryption}
      onTargetIdChange={handleTargetIdChange}
      onConnectToPeer={handleConnectToPeer}
      onAcceptConnection={handleAcceptConnection}
      onRejectConnection={handleRejectConnection}
    />
  );
};

export default ConnectionContainer;