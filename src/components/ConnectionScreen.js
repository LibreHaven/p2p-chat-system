import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiLoader, FiCheck, FiX } from 'react-icons/fi';
import { encryptionService } from '../services/encryptionService';
import peerService from '../services/peerService';
import messageService from '../services/messageService';
import StatusIndicator from './StatusIndicator';
import CopyableId from './CopyableId';
import Toast from './Toast';
import CryptoJS from 'crypto-js';

// 样式组件保持不变
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
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;
const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
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
const EncryptionToggle = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  justify-content: space-between;
`;
const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
`;
const ToggleSwitch = styled.div`
  position: relative;
  width: 50px;
  height: 24px;
  background-color: ${props => props.$isChecked ? '#2ecc71' : '#ccc'};
  border-radius: 12px;
  transition: background-color 0.3s;
  margin-left: 10px;
  &:before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: white;
    top: 2px;
    left: ${props => props.$isChecked ? '28px' : '2px'};
    transition: left 0.3s;
  }
`;
const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;
const ToggleText = styled.span`
  margin-left: 10px;
  font-size: 14px;
  color: #666;
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
  const [connectionMode, setConnectionMode] = useState('create');
  const [isConnectionInitiator, setIsConnectionInitiator] = useState(false);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [hasHandledEncryptionReady, setHasHandledEncryptionReady] = useState(false);
  const [useEncryption, setUseEncryption] = useState(true);
  const reconnectTimeoutRef = useRef(null);
  const encryptionReadyConfirmationTimeoutRef = useRef(null);
  const activeConnectionRef = useRef(null);
  const maxEncryptionRetries = useRef(3);
  const currentEncryptionRetries = useRef(0);

  const validateCustomId = (id) => {
    const idRegex = /^[a-zA-Z0-9_-]{3,12}$/;
    const isValid = idRegex.test(id);
    setCustomIdError(isValid ? '' : 'ID必须是3-12位的字母、数字、下划线或连字符');
    return isValid;
  };

  const validateTargetId = (id) => {
    if (!id) {
      setTargetIdError('请输入目标ID');
      return false;
    }
    if (id === peerId) {
      setTargetIdError('不能连接到自己');
      return false;
    }
    setTargetIdError('');
    return true;
  };

  const displayToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    // 清除会话存储中的状态标识（仅状态，不存储密钥对象）
    sessionStorage.removeItem('encryptionReady');
    sessionStorage.removeItem('isInitiator');
    sessionStorage.removeItem('useEncryption');
    setMessages([]);
    return () => {
      if (peer) peer.destroy();
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (encryptionReadyConfirmationTimeoutRef.current) clearTimeout(encryptionReadyConfirmationTimeoutRef.current);
    };
  }, []);

  const createPeerConnection = () => {
    if (!peerId) {
      setCustomIdError('请输入ID');
      return;
    }
    if (!validateCustomId(peerId)) return;
    setConnectionStatus('connecting');
    const newPeer = peerService.initializePeer(peerId);
    setPeer(newPeer);
    peerService.setupConnectionListeners(newPeer, {
      onOpen: (id) => {
        console.log('成功创建 Peer 连接，ID:', id);
        setConnectionStatus('ready');
        setIsPeerCreated(true);
        displayToast(`Peer 连接已创建，ID: ${id}`);
        // 创建全局 EncryptionState 对象
        window.encryptionState = new encryptionService.EncryptionState();
      },
      onError: (err) => {
        console.error('Peer 连接错误:', err);
        if (err.type === 'unavailable-id') {
          setCustomIdError('此ID已被占用，请尝试其他ID');
          setConnectionStatus('disconnected');
        } else {
          setConnectionStatus('failed');
          displayToast('连接失败，请重试');
        }
      },
      onConnection: (conn) => {
        console.log('收到来自对方的连接请求');
        setIsConnectionInitiator(false);
        sessionStorage.setItem('isInitiator', 'false');
        peerService.setupDataConnectionListeners(conn, {
          onData: (data) => { handleReceivedData(data, conn); },
          onClose: () => {
            console.log('数据连接已关闭');
            if (showConnectionRequest && incomingConnection === conn) {
              setShowConnectionRequest(false);
              setIncomingConnection(null);
              setIncomingPeerId('');
            }
          },
          onError: (err) => {
            console.error('数据连接错误:', err);
            if (showConnectionRequest && incomingConnection === conn) {
              setShowConnectionRequest(false);
              setIncomingConnection(null);
              setIncomingPeerId('');
              displayToast('连接请求出错，请重试');
            }
          }
        });
        setIncomingConnection(conn);
        setIncomingPeerId(conn.peer);
        setShowConnectionRequest(true);
      },
      onDisconnected: () => {
        console.log('Peer 连接已断开');
        setConnectionStatus('disconnected');
        displayToast('连接已断开，请重新连接');
      },
      onClose: () => {
        console.log('Peer 连接已关闭');
        setConnectionStatus('disconnected');
        displayToast('连接已关闭，请重新连接');
      }
    });
  };

  const connectToPeer = () => {
    if (!peer) {
      displayToast('请先创建自己的 Peer 连接');
      return;
    }
    if (!targetId) {
      setTargetIdError('请输入目标ID');
      return;
    }
    if (!validateTargetId(targetId)) return;
    setConnectionStatus('connecting');
    setWaitingForAcceptance(true);
    setIsConnectionInitiator(true);
    sessionStorage.setItem('isInitiator', 'true');
    sessionStorage.setItem('useEncryption', useEncryption ? 'true' : 'false');
    const conn = peerService.connectToPeer(peer, targetId);
    if (!conn) {
      setConnectionStatus('failed');
      setWaitingForAcceptance(false);
      displayToast('连接失败，请重试');
      return;
    }
    setPendingConnection(conn);
    activeConnectionRef.current = conn;
    peerService.setupDataConnectionListeners(conn, {
      onOpen: () => {
        console.log('数据连接已打开，发送连接请求');
        peerService.sendMessageSafely(conn, {
          type: 'connection-request',
          peerId: peerId,
          useEncryption: useEncryption,
          timestamp: Date.now()
        });
        const timeout = setTimeout(() => {
          if (waitingForAcceptance) {
            console.log('连接请求超时');
            setConnectionStatus('timeout');
            setWaitingForAcceptance(false);
            displayToast('连接请求超时，请重试');
            conn.close();
          }
        }, 30000);
        setConnectionTimeout(timeout);
      },
      onData: (data) => { handleReceivedData(data, conn); },
      onClose: () => {
        console.log('数据连接已关闭');
        if (waitingForAcceptance) {
          setConnectionStatus('disconnected');
          setWaitingForAcceptance(false);
          displayToast('连接已断开，请重试');
        }
        if (connectionTimeout) clearTimeout(connectionTimeout);
      },
      onError: (err) => {
        console.error('数据连接错误:', err);
        if (waitingForAcceptance) {
          setConnectionStatus('failed');
          setWaitingForAcceptance(false);
          displayToast('连接失败，请重试');
        }
        if (connectionTimeout) clearTimeout(connectionTimeout);
      }
    });
  };

  const handleReceivedData = async (data, sourceConn) => {
    try {
      console.log('收到数据:', data);
      if (data.type === 'connection-request') {
        console.log('收到连接请求，来自:', data.peerId);
        if (data.useEncryption !== undefined) {
          sessionStorage.setItem('useEncryption', data.useEncryption ? 'true' : 'false');
        }
        if (showConnectionRequest) {
          console.log('已经显示了连接请求，忽略新请求');
          return;
        }
        setIncomingPeerId(data.peerId);
        setShowConnectionRequest(true);
      } else if (data.type === 'connection-accepted') {
        console.log('对方已接受连接请求');
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setWaitingForAcceptance(false);
        setConnectionStatus('connected');
        setConnection(sourceConn || pendingConnection);
        activeConnectionRef.current = sourceConn || pendingConnection;
        console.log('使用活动连接进入聊天界面');
        const shouldUseEncryption = sessionStorage.getItem('useEncryption') === 'true';
        if (shouldUseEncryption) {
          initializeEncryption();
        } else {
          console.log('不使用加密，直接进入聊天界面');
          sessionStorage.setItem('encryptionReady', 'disabled');
          setScreen('chat');
        }
      } else if (data.type === 'connection-rejected') {
        console.log('对方拒绝了连接请求');
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setWaitingForAcceptance(false);
        setConnectionStatus('rejected');
        displayToast('对方拒绝了连接请求');
        if (sourceConn) {
          sourceConn.close();
        } else if (pendingConnection) {
          pendingConnection.close();
        }
      } else if (data.type === 'encryption-key') {
        console.log('收到加密密钥交换请求');
        try {
          if (!window.encryptionState) {
            console.error('加密状态对象不存在，无法完成密钥交换');
            return;
          }
          if (!data.publicKey) {
            console.error('接收到的公钥无效');
            return;
          }
          console.log('处理密钥交换, 接收到的公钥长度:', data.publicKey.length);
          await window.encryptionState.processRemotePublicKey(data.publicKey);
          window.sharedCryptoKey = window.encryptionState.sharedSecret;
          console.log('密钥交换成功，共享密钥已保存');
          setEncryptionReady(true);
          sessionStorage.setItem('encryptionReady', 'true');
          if (
            sessionStorage.getItem('encryptionReady') !== 'sent' &&
            sessionStorage.getItem('encryptionReady') !== 'confirmed' &&
            !hasHandledEncryptionReady
          ) {
            sendEncryptionReadyConfirmation(sourceConn || pendingConnection || activeConnectionRef.current);
            setHasHandledEncryptionReady(true);
          }
        } catch (error) {
          console.error('处理密钥交换时出错:', error);
          displayToast('加密通道建立失败，请重试');
        }
      } else if (data.type === 'encryption-ready') {
        console.log('收到加密就绪确认消息');
        if (!window.encryptionState || !window.sharedCryptoKey) {
          console.error('收到加密就绪确认，但共享密钥不存在');
          return;
        }
        setEncryptionReady(true);
        sessionStorage.setItem('encryptionReady', 'confirmed');
        setHasHandledEncryptionReady(true);
        if (sessionStorage.getItem('encryptionReady') !== 'sent') {
          sendEncryptionReadyConfirmation(sourceConn || pendingConnection || activeConnectionRef.current);
        }
        if (encryptionReadyConfirmationTimeoutRef.current) {
          clearTimeout(encryptionReadyConfirmationTimeoutRef.current);
          encryptionReadyConfirmationTimeoutRef.current = null;
        }
        setScreen('chat');
      }
    } catch (error) {
      console.error('处理接收数据时出错:', error);
      displayToast('处理数据时出错，请重试');
    }
  };

  const initializeEncryption = async () => {
    try {
      console.log('初始化加密');
      const isInitiator = sessionStorage.getItem('isInitiator') === 'true';
      console.log('初始化加密，角色:', isInitiator ? '发起方' : '接收方');
      currentEncryptionRetries.current = 0;
      if (!window.encryptionState) {
        window.encryptionState = new encryptionService.EncryptionState();
      }
      const publicKeyBase64 = await window.encryptionState.initialize();
      if (!publicKeyBase64) throw new Error('导出公钥失败');
      const keyExchangeMessage = encryptionService.createKeyExchangeMessage(publicKeyBase64);
      if (!keyExchangeMessage) throw new Error('Key exchange message is undefined');
      const activeConn = activeConnectionRef.current || pendingConnection;
      if (activeConn) {
        peerService.sendMessageSafely(activeConn, keyExchangeMessage);
        console.log('已发送公钥进行密钥交换');
      } else {
        console.error('发送公钥失败: 没有可用的连接');
        displayToast('加密初始化失败，请重试');
        if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
          currentEncryptionRetries.current++;
          console.log(`尝试重新初始化加密... (${currentEncryptionRetries.current}/${maxEncryptionRetries.current})`);
          setTimeout(() => { initializeEncryption(); }, 2000);
        } else {
          console.error(`已达到最大重试次数 (${maxEncryptionRetries.current})，放弃加密初始化`);
          displayToast('加密初始化失败，请重新连接');
          setConnectionStatus('failed');
        }
      }
    } catch (error) {
      console.error('初始化加密时发生未捕获错误:', error);
      displayToast('加密初始化失败，请重试');
    }
  };

  const sendEncryptionReadyConfirmation = (conn) => {
    if (!conn) {
      console.error('发送加密就绪确认失败: 没有可用的连接');
      if (activeConnectionRef.current) {
        conn = activeConnectionRef.current;
        console.log('使用活动连接引用重试发送加密就绪确认');
      } else {
        return;
      }
    }
    if (!window.sharedCryptoKey) {
      console.error('发送加密就绪确认失败: 未检测到有效的共享密钥');
      return;
    }
    if (sessionStorage.getItem('encryptionReady') === 'sent' ||
        sessionStorage.getItem('encryptionReady') === 'confirmed') {
      console.log('已经发送过加密就绪确认，不再重复发送');
      return;
    }
    console.log('发送加密就绪确认消息');
    try {
      const sent = peerService.sendMessageSafely(conn, { type: 'encryption-ready' });
      if (sent) {
        console.log('已发送加密就绪确认消息');
        sessionStorage.setItem('encryptionReady', 'sent');
        if (encryptionReadyConfirmationTimeoutRef.current) {
          clearTimeout(encryptionReadyConfirmationTimeoutRef.current);
        }
        if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
          encryptionReadyConfirmationTimeoutRef.current = setTimeout(() => {
            if (sessionStorage.getItem('encryptionReady') !== 'confirmed') {
              console.log(`未收到对方的加密就绪确认，再次发送 (${currentEncryptionRetries.current + 1}/${maxEncryptionRetries.current})`);
              currentEncryptionRetries.current++;
              sessionStorage.setItem('encryptionReady', 'true');
              sendEncryptionReadyConfirmation(conn);
            }
          }, 5000);
        } else {
          console.log(`已达到最大重试次数 (${maxEncryptionRetries.current})，不再重试`);
          if (sessionStorage.getItem('encryptionReady') !== 'confirmed') {
            console.log('尽管未收到确认，但尝试进入聊天界面');
            setScreen('chat');
          }
        }
      } else {
        console.log('连接未就绪，加密就绪确认消息将在连接打开后发送');
      }
    } catch (error) {
      console.error('发送加密就绪确认消息时出错:', error);
      if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
        currentEncryptionRetries.current++;
        setTimeout(() => { sendEncryptionReadyConfirmation(conn); }, 2000);
      }
    }
  };

  const acceptConnection = () => {
    if (incomingConnection) {
      handleIncomingConnection(incomingConnection);
      setShowConnectionRequest(false);
    }
  };

  const rejectIncomingConnection = () => {
    if (incomingConnection) {
      try {
        peerService.sendMessageSafely(incomingConnection, {
          type: 'connection-rejected',
          timestamp: Date.now()
        });
        incomingConnection.close();
      } catch (error) {
        console.error('拒绝连接请求失败:', error);
      }
      setShowConnectionRequest(false);
      setIncomingConnection(null);
      setIncomingPeerId('');
    }
  };

  const handleIncomingConnection = (conn) => {
    if (!conn) return;
    console.log('处理接收到的连接请求');
    setConnectionStatus('connected');
    setConnection(conn);
    activeConnectionRef.current = conn;
    setTargetId(conn.peer);
    peerService.sendMessageSafely(conn, {
      type: 'connection-accepted',
      timestamp: Date.now()
    });
    const shouldUseEncryption = sessionStorage.getItem('useEncryption') === 'true';
    if (shouldUseEncryption) {
      initializeEncryption();
    } else {
      console.log('不使用加密，直接进入聊天界面');
      sessionStorage.setItem('encryptionReady', 'disabled');
      setScreen('chat');
    }
  };

  const generateRandomId = () => {
    const randomId = peerService.generateRandomId();
    setPeerId(randomId);
    setCustomIdError('');
  };

  const toggleConnectionMode = (mode) => { setConnectionMode(mode); };
  const handleEncryptionToggle = () => { setUseEncryption(!useEncryption); };

  return (
    <ConnectionContainer>
      <Card>
        <Title>P2P 聊天</Title>
        <InputGroup>
          <Label>你的 ID</Label>
          <div style={{ display: 'flex' }}>
            <Input
              type="text"
              value={peerId}
              onChange={(e) => setPeerId(e.target.value)}
              placeholder="输入你的ID或使用随机ID"
              disabled={isPeerCreated}
              style={{ marginRight: '10px' }}
            />
            {!isPeerCreated && (
              <Button onClick={generateRandomId} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                随机ID
              </Button>
            )}
          </div>
          {customIdError && <div style={{ color: 'red', marginTop: '5px' }}>{customIdError}</div>}
        </InputGroup>
        {!isPeerCreated ? (
          <Button onClick={createPeerConnection} disabled={connectionStatus === 'connecting'}>
            {connectionStatus === 'connecting' ? (
              <>
                <FiLoader style={{ marginRight: '5px', animation: 'spin 1s linear infinite' }} />
                连接中...
              </>
            ) : (
              '创建连接'
            )}
          </Button>
        ) : (
          <>
            <StatusIndicator status={connectionStatus} />
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <CopyableId id={peerId} />
            </div>
            <EncryptionToggle>
              <span>加密通信:</span>
              <ToggleLabel>
                <ToggleInput type="checkbox" checked={useEncryption} onChange={handleEncryptionToggle} />
                <ToggleSwitch $isChecked={useEncryption} />
                <ToggleText>{useEncryption ? '已启用' : '已禁用'}</ToggleText>
              </ToggleLabel>
            </EncryptionToggle>
            <InputGroup>
              <Label>连接到对方</Label>
              <Input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="输入对方的ID"
                disabled={waitingForAcceptance}
              />
              {targetIdError && <div style={{ color: 'red', marginTop: '5px' }}>{targetIdError}</div>}
            </InputGroup>
            <Button onClick={connectToPeer} disabled={waitingForAcceptance || connectionStatus === 'connecting'}>
              {waitingForAcceptance ? (
                <>
                  <FiLoader style={{ marginRight: '5px', animation: 'spin 1s linear infinite' }} />
                  等待对方接受...
                </>
              ) : (
                '连接'
              )}
            </Button>
          </>
        )}
      </Card>
      {showConnectionRequest && (
        <ConnectionRequestModal>
          <ModalContent>
            <ModalTitle>连接请求</ModalTitle>
            <p>{incomingPeerId} 请求与你建立连接</p>
            <p>加密通信: {sessionStorage.getItem('useEncryption') === 'true' ? '已启用' : '已禁用'}</p>
            <ModalButtons>
              <AcceptButton onClick={acceptConnection}>
                <FiCheck style={{ marginRight: '5px' }} />
                接受
              </AcceptButton>
              <RejectButton onClick={rejectIncomingConnection}>
                <FiX style={{ marginRight: '5px' }} />
                拒绝
              </RejectButton>
            </ModalButtons>
          </ModalContent>
        </ConnectionRequestModal>
      )}
      {showToast && <Toast message={toastMessage} />}
    </ConnectionContainer>
  );
};

export default ConnectionScreen;
