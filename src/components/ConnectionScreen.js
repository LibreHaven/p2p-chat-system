import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiLoader, FiCheck, FiX } from 'react-icons/fi';
import { encryptionService } from '../services/encryptionService';
import peerService from '../services/peerService';
import messageService from '../services/messageService';
import StatusIndicator from './StatusIndicator';
import CopyableId from './CopyableId';
import Toast from './Toast';
import CryptoJS from 'crypto-js';

const ConnectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 30px;
  width: 100%;
  max-width: 500px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
  text-align: center;
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 10px;

  &:hover {
    background-color: #3a80d2;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ConnectionRequestModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 20px;
  width: 90%;
  max-width: 400px;
`;

const ModalTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  text-align: center;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
`;

const AcceptButton = styled(Button)`
  background-color: #2ecc71;
  margin-right: 10px;
  
  &:hover {
    background-color: #27ae60;
  }
`;

const RejectButton = styled(Button)`
  background-color: #e74c3c;
  
  &:hover {
    background-color: #c0392b;
  }
`;

const ConnectionScreen = ({
  peerId,
  setPeerId,
  targetId,
  setTargetId,
  connectionStatus,
  setConnectionStatus,
  setConnection,
  setScreen,
  setErrorMessage,
  setMessages
}) => {
  const [peer, setPeer] = useState(null);
  const [customIdError, setCustomIdError] = useState('');
  const [targetIdError, setTargetIdError] = useState('');
  const [connectionTimeout, setConnectionTimeout] = useState(null);
  const [showConnectionRequest, setShowConnectionRequest] = useState(false);
  const [incomingConnection, setIncomingConnection] = useState(null);
  const [incomingPeerId, setIncomingPeerId] = useState('');
  const [isPeerCreated, setIsPeerCreated] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [pendingConnection, setPendingConnection] = useState(null);
  const [waitingForAcceptance, setWaitingForAcceptance] = useState(false);

  // 显示提示消息
  const displayToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 初始化 PeerJS 连接
  useEffect(() => {
    // 组件卸载时清理
    return () => {
      if (peer) {
        peer.destroy();
      }
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, []);

  // 创建 Peer 连接
  const createPeerConnection = () => {
    if (!peerId || !validateCustomId(peerId)) {
      return;
    }

    // 清除旧的连接
    if (peer) {
      peer.destroy();
    }
    
    setConnectionStatus('connecting');
    
    // 初始化新的 Peer 连接
    const newPeer = peerService.initializePeer(peerId);
    setPeer(newPeer);
    
    // 设置连接监听器
    peerService.setupConnectionListeners(newPeer, {
      onOpen: (id) => {
        console.log('成功创建 Peer 连接，ID:', id);
        setConnectionStatus('disconnected');
        setIsPeerCreated(true);
        displayToast(`Peer 连接已创建，您的 ID: ${id}`);
      },
      onError: (err) => {
        console.error('Peer 连接错误:', err);
        
        // 处理 ID 已被占用的情况
        if (err.type === 'unavailable-id') {
          setCustomIdError('此 ID 已被占用，请尝试其他 ID');
          setConnectionStatus('disconnected');
          setIsPeerCreated(false);
        } else {
          setErrorMessage(`Peer 连接错误: ${err.message}`);
          setConnectionStatus('failed');
          setScreen('error');
        }
      },
      onDisconnected: () => {
        console.log('Peer 连接已断开');
        setConnectionStatus('disconnected');
        setIsPeerCreated(false);
      },
      onClose: () => {
        console.log('Peer 连接已关闭');
        setConnectionStatus('disconnected');
        setIsPeerCreated(false);
      },
      onConnection: (conn) => {
        console.log('收到来自对方的连接请求');
        
        // 设置数据连接监听器，以便在接受前就能接收消息
        peerService.setupDataConnectionListeners(conn, {
          onData: (data) => {
            handleReceivedData(data, conn);
          },
          onClose: () => {
            console.log('连接已关闭');
            setShowConnectionRequest(false);
            setConnectionStatus('disconnected');
          },
          onError: (err) => {
            console.error('连接错误:', err);
            setShowConnectionRequest(false);
            setErrorMessage(`连接错误: ${err.message}`);
          }
        });
        
        // 显示连接请求对话框
        setIncomingConnection(conn);
        setIncomingPeerId(conn.peer);
        setShowConnectionRequest(true);
      }
    });
  };

  // 处理传入的连接请求
  const handleIncomingConnection = (conn) => {
    setConnectionStatus('connecting');
    setTargetId(conn.peer);
    
    console.log('接受连接请求，发送接受消息');
    
    // 发送接受连接的消息
    try {
      conn.send({
        type: 'connection-accepted'
      });
      
      console.log('已发送接受连接消息');
      
      setConnectionStatus('connected');
      setConnection(conn);
      setScreen('chat');
      
      // 初始化加密
      initializeEncryption(conn);
    } catch (error) {
      console.error('发送接受消息时出错:', error);
      setErrorMessage(`发送接受消息时出错: ${error.message}`);
      setConnectionStatus('failed');
      setScreen('error');
    }
  };

  // 接受连接请求
  const acceptConnectionRequest = () => {
    if (incomingConnection) {
      setShowConnectionRequest(false);
      handleIncomingConnection(incomingConnection);
    }
  };

  // 拒绝连接请求
  const rejectConnectionRequest = () => {
    if (incomingConnection) {
      incomingConnection.close();
      setShowConnectionRequest(false);
      setIncomingConnection(null);
      setIncomingPeerId('');
    }
  };

  // 处理接收到的数据
  const handleReceivedData = (data, sourceConn = null) => {
    console.log('收到数据:', data);
    
    try {
      // 检查是否是连接接受消息
      if (data.type === 'connection-accepted') {
        console.log('对方已接受连接请求');
        setWaitingForAcceptance(false);
        
        // 使用当前连接或者pendingConnection
        const activeConn = sourceConn || pendingConnection;
        
        if (activeConn) {
          console.log('使用活动连接进入聊天界面');
          setConnectionStatus('connected');
          setConnection(activeConn);
          setScreen('chat');
          
          // 初始化加密
          initializeEncryption(activeConn);
        } else {
          console.error('没有可用的连接');
        }
        return;
      }
      
      // 检查是否是加密握手消息
      if (data.type === 'encryption-key') {
        // 处理加密密钥交换
        handleEncryptionKeyExchange(data);
        return;
      }
      
      // 检查是否是加密消息
      if (data.type === 'encrypted-message' && data.encrypted) {
        const sharedSecret = sessionStorage.getItem('sharedSecret');
        if (!sharedSecret) {
          console.error('共享密钥不存在，无法解密消息');
          return;
        }
        
        // 解密消息
        const decryptedData = encryptionService.decrypt(data.encrypted, sharedSecret);
        if (!decryptedData) {
          console.error('消息解密失败');
          return;
        }
        
        // 反序列化消息
        const message = messageService.deserializeMessage(decryptedData);
        
        if (message) {
          setMessages(prevMessages => [...prevMessages, message]);
        }
        return;
      }
      
      // 处理旧版本的消息格式（向后兼容）
      if (data.encrypted) {
        const sharedSecret = sessionStorage.getItem('sharedSecret');
        if (!sharedSecret) {
          console.error('共享密钥不存在，无法解密消息');
          return;
        }
        
        // 尝试解密旧格式消息
        try {
          const decryptedData = encryptionService.decrypt(
            { iv: data.encrypted.iv || '', ciphertext: data.encrypted.toString() },
            sharedSecret
          );
          
          if (decryptedData) {
            const message = messageService.deserializeMessage(decryptedData);
            if (message) {
              setMessages(prevMessages => [...prevMessages, message]);
            }
          }
        } catch (e) {
          console.error('旧格式消息解密失败:', e);
        }
      }
    } catch (error) {
      console.error('处理接收数据时出错:', error);
    }
  };

  // 处理加密密钥交换
  const handleEncryptionKeyExchange = (data) => {
    console.log('收到加密密钥交换请求');
    
    try {
      // 获取存储的私钥
      const privateKey = JSON.parse(sessionStorage.getItem('privateKey'));
      
      if (!privateKey || !data.publicKey) {
        console.error('密钥交换失败: 缺少必要的密钥');
        return;
      }
      
      // 使用我们的私钥和对方的公钥派生共享密钥
      const sharedSecret = encryptionService.handleKeyExchange(
        CryptoJS.enc.Hex.parse(privateKey),
        data.publicKey
      );
      
      // 存储共享密钥用于后续消息加密
      sessionStorage.setItem('sharedSecret', sharedSecret);
      
      console.log('密钥交换成功，已生成共享密钥');
    } catch (error) {
      console.error('处理密钥交换时出错:', error);
    }
  };

  // 初始化加密
  const initializeEncryption = (conn) => {
    console.log('初始化加密');
    
    try {
      // 生成新的密钥对
      const keyPair = encryptionService.generateKeyPair();
      
      // 存储私钥用于后续密钥交换
      sessionStorage.setItem('privateKey', JSON.stringify(keyPair.privateKey.toString()));
      
      // 创建密钥交换消息
      const keyExchangeMessage = {
        type: 'encryption-key',
        publicKey: keyPair.publicKey
      };
      
      // 发送公钥给对方
      conn.send(keyExchangeMessage);
      
      console.log('已发送公钥进行密钥交换');
    } catch (error) {
      console.error('初始化加密时出错:', error);
    }
  };

  // 请求连接到对方 Peer
  const requestConnection = () => {
    if (!peer || !targetId || !validateTargetId(targetId)) {
      return;
    }
    
    setConnectionStatus('connecting');
    setWaitingForAcceptance(true);
    
    // 设置连接超时
    const timeout = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        setErrorMessage('连接超时，对方可能不在线或 ID 不存在');
        setConnectionStatus('failed');
        setScreen('error');
        setWaitingForAcceptance(false);
      }
    }, 30000); // 30秒超时
    
    setConnectionTimeout(timeout);
    
    try {
      // 连接到目标 Peer
      const conn = peer.connect(targetId, {
        reliable: true
      });
      
      // 保存连接以便在接受后使用
      setPendingConnection(conn);
      
      // 设置数据连接监听器
      peerService.setupDataConnectionListeners(conn, {
        onOpen: () => {
          console.log('成功连接到对方，等待对方接受请求');
          clearTimeout(timeout);
          displayToast('已发送连接请求，等待对方接受...');
          
          // 不再立即进入聊天界面，而是等待对方接受
          // 在收到 connection-accepted 消息后才会进入聊天界面
        },
        onData: (data) => {
          handleReceivedData(data, conn);
        },
        onClose: () => {
          console.log('连接已关闭');
          clearTimeout(timeout);
          setConnectionStatus('disconnected');
          setScreen('connection');
          setWaitingForAcceptance(false);
        },
        onError: (err) => {
          console.error('连接错误:', err);
          clearTimeout(timeout);
          setErrorMessage(`连接错误: ${err.message}`);
          setConnectionStatus('failed');
          setScreen('error');
          setWaitingForAcceptance(false);
        }
      });
    } catch (error) {
      console.error('连接到对方时出错:', error);
      clearTimeout(timeout);
      setErrorMessage(`连接错误: ${error.message}`);
      setConnectionStatus('failed');
      setScreen('error');
      setWaitingForAcceptance(false);
    }
  };

  // 验证自定义 ID
  const validateCustomId = (id) => {
    if (!id) {
      setCustomIdError('请输入 ID');
      return false;
    }
    
    if (id.length < 6 || id.length > 12) {
      setCustomIdError('ID 长度必须在 6-12 位之间');
      return false;
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(id)) {
      setCustomIdError('ID 只能包含字母和数字');
      return false;
    }
    
    setCustomIdError('');
    return true;
  };

  // 验证目标 ID
  const validateTargetId = (id) => {
    if (!id) {
      setTargetIdError('请输入对方的 ID');
      return false;
    }
    
    if (id === peerId) {
      setTargetIdError('不能连接到自己');
      return false;
    }
    
    setTargetIdError('');
    return true;
  };

  return (
    <ConnectionContainer>
      <Card>
        <Title>P2P 聊天系统</Title>
        
        <StatusIndicator status={connectionStatus} />
        
        <InputGroup>
          <Label>您的 ID</Label>
          <Input 
            type="text" 
            placeholder="输入 6-12 位字母数字 ID" 
            value={peerId} 
            onChange={(e) => {
              setPeerId(e.target.value);
              validateCustomId(e.target.value);
            }}
            disabled={isPeerCreated}
          />
          {customIdError && <p style={{ color: 'red', fontSize: '12px' }}>{customIdError}</p>}
        </InputGroup>
        
        {isPeerCreated && (
          <CopyableId id={peerId} onCopy={() => displayToast('ID已复制到剪贴板')} />
        )}
        
        {!isPeerCreated ? (
          <Button 
            onClick={createPeerConnection} 
            disabled={
              connectionStatus === 'connecting' || 
              !peerId || 
              !!customIdError
            }
          >
            {connectionStatus === 'connecting' ? '创建中...' : '创建 Peer 连接'}
          </Button>
        ) : (
          <>
            <InputGroup>
              <Label>目标用户 ID</Label>
              <Input 
                type="text" 
                placeholder="输入对方的 ID" 
                value={targetId} 
                onChange={(e) => {
                  setTargetId(e.target.value);
                  validateTargetId(e.target.value);
                }}
                disabled={connectionStatus !== 'disconnected' || waitingForAcceptance}
              />
              {targetIdError && <p style={{ color: 'red', fontSize: '12px' }}>{targetIdError}</p>}
            </InputGroup>
            
            <Button 
              onClick={requestConnection} 
              disabled={
                connectionStatus !== 'disconnected' || 
                !targetId || 
                !!targetIdError || 
                peerId === targetId ||
                waitingForAcceptance
              }
            >
              {waitingForAcceptance ? '等待对方接受...' : (connectionStatus === 'connecting' ? '请求连接中...' : '请求连接')}
            </Button>
            
            {waitingForAcceptance && (
              <p style={{ textAlign: 'center', color: '#666' }}>已发送连接请求，等待对方接受...</p>
            )}
          </>
        )}
      </Card>
      
      {showConnectionRequest && (
        <ConnectionRequestModal>
          <ModalContent>
            <ModalTitle>连接请求</ModalTitle>
            <p>用户 <strong>{incomingPeerId}</strong> 请求与您建立连接。</p>
            <ModalButtons>
              <AcceptButton onClick={acceptConnectionRequest}>
                <FiCheck style={{ marginRight: '5px' }} /> 接受
              </AcceptButton>
              <RejectButton onClick={rejectConnectionRequest}>
                <FiX style={{ marginRight: '5px' }} /> 拒绝
              </RejectButton>
            </ModalButtons>
          </ModalContent>
        </ConnectionRequestModal>
      )}
      
      <Toast message={toastMessage} visible={showToast} />
    </ConnectionContainer>
  );
};

export default ConnectionScreen;
