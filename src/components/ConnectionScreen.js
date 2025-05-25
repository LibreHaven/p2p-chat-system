import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiLoader, FiCheck, FiX, FiPlus, FiTrash2, FiUsers, FiMessageSquare, FiLink } from 'react-icons/fi';
import { encryptionService } from '../services/encryptionService';
import peerService from '../services/peerService';
import messageService from '../services/messageService';
import StatusIndicator from './StatusIndicator';
import CopyableId from './CopyableId';
import Toast from './Toast';
import CryptoJS from 'crypto-js';

// --- Styles for Horizontal Layout & Sidebar ---
const PageLayoutContainer = styled.div`
  display: flex;
  flex-direction: ${props => (props.$isPeerCreated ? 'row' : 'column')};
  align-items: ${props => (props.$isPeerCreated ? 'flex-start' : 'center')};
  justify-content: ${props => (props.$isPeerCreated ? 'flex-start' : 'center')};
  min-height: 100vh;
  padding: ${props => (props.$isPeerCreated ? '0' : '20px')};
  background-image: url('/background.jpg'); // 这里添加背景图片路径
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const Sidebar = styled.div`
  width: 280px;
  flex-shrink: 0;
  background-color: rgba(240, 240, 240, 0.92);
  padding: 20px;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100vh;
  overflow-y: auto;
`;

const SidebarTitle = styled.h2`
  font-size: 18px;
  color: #333;
  margin-top: 0;
  margin-bottom: 10px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SessionListItem = styled.div`
  background-color: #fff;
  padding: 12px 15px;
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.12);
  }

  .session-name {
    font-weight: 600;
    color: #4a90e2;
    word-break: break-all;
  }
  .session-status {
    font-size: 12px;
    color: #555;
  }
  .session-timestamp {
    font-size: 11px;
    color: #888;
    margin-top: 3px;
  }
`;

const ContentArea = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
  height: 100vh;
`;

const Card = styled.div`
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  padding: 30px;
  width: 100%;
  max-width: 550px;
  margin: 0 auto; // 水平居中
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
  text-align: center;
  color: #333;
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background-color: #3a80d2;
  }
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const SmallButton = styled(Button)`
  width: auto;
  padding: 8px 12px;
  font-size: 14px;
  margin-left: 10px;
  white-space: nowrap;
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

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid #eee;
  margin: 30px 0;
`;

const InvitedMembersList = styled.ul`
  list-style-type: none;
  padding: 0;
  margin-bottom: 15px;
`;

const InvitedMemberItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9f9f9;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 14px;
`;

const RemoveMemberButton = styled.button`
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 16px;
  &:hover {
    color: #c0392b;
  }
`;

const ConnectionScreen = ({
                            peerId,
                            setPeerId,
                            targetId: targetIdProp,
                            setTargetId: setTargetIdProp,
                            connectionStatus,
                            setConnectionStatus,
                            setConnection,
                            setScreen, // Reintroduced for in-tab navigation
                            setErrorMessage,
                            setMessages
                          }) => {
  const [peer, setPeer] = useState(null);
  const [customIdError, setCustomIdError] = useState('');
  const [targetIdInput, setTargetIdInput] = useState('');
  const [targetIdError, setTargetIdError] = useState('');
  const [connectionTimeout, setConnectionTimeout] = useState(null);
  const [showConnectionRequest, setShowConnectionRequest] = useState(false);
  const [incomingConnection, setIncomingConnection] = useState(null);
  const [incomingPeerId, setIncomingPeerId] = useState('');
  const [incomingUseEncryption, setIncomingUseEncryption] = useState(false);
  const [isPeerCreated, setIsPeerCreated] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [pendingConnection, setPendingConnection] = useState(null);
  const [waitingForAcceptance, setWaitingForAcceptance] = useState(false);
  const [isConnectionInitiator, setIsConnectionInitiator] = useState(false);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [hasHandledEncryptionReady, setHasHandledEncryptionReady] = useState(false);
  const [useEncryption, setUseEncryption] = useState(true);
  const reconnectTimeoutRef = useRef(null);
  const encryptionReadyConfirmationTimeoutRef = useRef(null);
  const activeConnectionRef = useRef(null);
  const maxEncryptionRetries = useRef(3);
  const currentEncryptionRetries = useRef(0);

  const [groupChatId, setGroupChatId] = useState('');
  const [groupChatIdError, setGroupChatIdError] = useState('');
  const [inviteeId, setInviteeId] = useState('');
  const [inviteeIdError, setInviteeIdError] = useState('');
  const [invitedMembers, setInvitedMembers] = useState([]);

  const [activeChatSessions, setActiveChatSessions] = useState([]);

  // Modified to switch to chat screen in the same tab
  const navigateToChat = (params) => {
    const { localId, remoteId, encryptionEnabled, isEncReady, isInitiatorVal, sharedKeyObject } = params;

    // Set connection and target ID for the parent component
    if (activeConnectionRef.current) {
      setConnection(activeConnectionRef.current);
      setTargetIdProp(remoteId);
    }

    // Update active chat sessions for the sidebar
    setActiveChatSessions(prevSessions => {
      const newSession = {
        id: remoteId,
        name: `Chat with ${remoteId}`,
        type: 'p2p',
        statusText: encryptionEnabled ? (isEncReady ? 'Securely Connected' : 'Connecting (Encrypted)') : 'Connected (Unencrypted)',
        timestamp: Date.now(),
        urlParams: { localId, targetId: remoteId } // Simplified, no sessionKeyPrefix needed
      };
      const existingIndex = prevSessions.findIndex(s => s.id === remoteId && s.type === 'p2p');
      if (existingIndex > -1) {
        const updatedSessions = [...prevSessions];
        updatedSessions[existingIndex] = newSession;
        return updatedSessions.sort((a, b) => b.timestamp - a.timestamp);
      }
      return [...prevSessions, newSession].sort((a, b) => b.timestamp - a.timestamp);
    });

    // Navigate to chat screen within the same tab
    setScreen('chat');
    console.log(`Navigating to chat with ${remoteId}`);
  };

  const validateGenericId = (id, fieldName = 'ID') => {
    const idRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    const isValid = idRegex.test(id);
    const errorMessage = isValid ? '' : `${fieldName} 必须是3-20位的字母、数字、下划线或连字符`;
    return { isValid, errorMessage };
  };

  const validateCustomId = (id) => {
    const { isValid, errorMessage } = validateGenericId(id, '你的 ID');
    setCustomIdError(errorMessage);
    return isValid;
  };

  const validateTargetIdForConnection = (id) => {
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
    sessionStorage.removeItem('encryptionReady');
    sessionStorage.removeItem('isInitiator');
    sessionStorage.removeItem('useEncryption');
    if (setMessages) setMessages([]);
    return () => {
      if (peer && !peer.destroyed) peer.destroy();
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (encryptionReadyConfirmationTimeoutRef.current) clearTimeout(encryptionReadyConfirmationTimeoutRef.current);
    };
  }, [setMessages]);

  const createPeerConnection = () => {
    if (!peerId) {
      setCustomIdError('请输入你的ID');
      return;
    }
    if (!validateCustomId(peerId)) return;
    setConnectionStatus('connecting');
    const newPeer = peerService.initializePeer(peerId);
    setPeer(newPeer);
    peerService.setupConnectionListeners(newPeer, {
      onOpen: (id) => {
        console.log('成功创建 Peer 连接，ID:', id);
        setPeerId(id);
        setConnectionStatus('ready');
        setIsPeerCreated(true);
        displayToast(`你的 Peer 连接已创建，ID: ${id}`);
        if (!window.encryptionState) {
          window.encryptionState = new encryptionService.EncryptionState();
        }
      },
      onError: (err) => {
        console.error('Peer 连接错误:', err);
        if (err.type === 'unavailable-id') {
          setCustomIdError('此ID已被占用，请尝试其他ID');
          setConnectionStatus('disconnected');
        } else if (err.type === 'network' || err.type === 'peer-unavailable' || err.type === 'server-error') {
          setCustomIdError('网络错误或无法连接到PeerJS服务器。请检查网络。');
          setConnectionStatus('failed');
        } else {
          setConnectionStatus('failed');
          displayToast(`连接失败: ${err.type || '未知错误'}`);
        }
        setIsPeerCreated(false);
      },
      onConnection: (conn) => {
        console.log('收到来自对方的连接请求 from:', conn.peer);
        peerService.setupDataConnectionListeners(conn, {
          onData: (data) => { handleReceivedData(data, conn); },
          onClose: () => {
            console.log(`数据连接已关闭 (来自 ${conn.peer})`);
            if (showConnectionRequest && incomingConnection && incomingConnection.peer === conn.peer) {
              setShowConnectionRequest(false);
              setIncomingConnection(null);
              setIncomingPeerId('');
            }
            setActiveChatSessions(prev => prev.filter(s => !(s.id === conn.peer && s.type === 'p2p')));
          },
          onError: (err) => {
            console.error('数据连接错误:', err);
            if (showConnectionRequest && incomingConnection && incomingConnection.peer === conn.peer) {
              setShowConnectionRequest(false);
              setIncomingConnection(null);
              setIncomingPeerId('');
              displayToast('连接请求出错，请重试');
            }
          }
        });
      },
      onDisconnected: () => {
        console.log('Peer 连接已断开 (与PeerServer)');
        setConnectionStatus('disconnected');
        displayToast('与信令服务器的连接已断开。');
      },
      onClose: () => {
        console.log('Peer 连接已关闭');
        setConnectionStatus('disconnected');
        setIsPeerCreated(false);
      }
    });
  };

  const connectToPeer = () => {
    if (!peer) {
      displayToast('请先创建自己的 Peer 连接');
      return;
    }
    if (!validateTargetIdForConnection(targetIdInput)) return;

    setConnectionStatus('connecting_to_peer');
    setWaitingForAcceptance(true);
    setIsConnectionInitiator(true);
    sessionStorage.setItem('isInitiator', 'true');
    sessionStorage.setItem('useEncryption', useEncryption.toString());

    const conn = peerService.connectToPeer(peer, targetIdInput);
    if (!conn) {
      setConnectionStatus('failed');
      setWaitingForAcceptance(false);
      displayToast('连接创建失败，请重试');
      return;
    }
    activeConnectionRef.current = conn;
    setPendingConnection(conn);

    peerService.setupDataConnectionListeners(conn, {
      onOpen: () => {
        console.log('数据连接已打开，发送连接请求 to:', targetIdInput);
        peerService.sendMessageSafely(conn, {
          type: 'connection-request',
          peerId: peerId,
          useEncryption: useEncryption,
          timestamp: Date.now()
        });
        const timeout = setTimeout(() => {
          if (waitingForAcceptance && activeConnectionRef.current && activeConnectionRef.current.peer === targetIdInput) {
            console.log('连接请求超时');
            setConnectionStatus('timeout');
            setWaitingForAcceptance(false);
            displayToast('连接请求超时，对方未响应');
            conn.close();
            activeConnectionRef.current = null;
          }
        }, 30000);
        setConnectionTimeout(timeout);
      },
      onData: (data) => { handleReceivedData(data, conn); },
      onClose: () => {
        console.log(`数据连接已关闭 (to ${targetIdInput})`);
        if (waitingForAcceptance && activeConnectionRef.current && activeConnectionRef.current.peer === targetIdInput) {
          setConnectionStatus('disconnected_from_peer');
          setWaitingForAcceptance(false);
          displayToast('与对方的连接已断开');
        }
        if (connectionTimeout) clearTimeout(connectionTimeout);
        activeConnectionRef.current = null;
        setActiveChatSessions(prev => prev.filter(s => !(s.id === targetIdInput && s.type === 'p2p')));
      },
      onError: (err) => {
        console.error('数据连接错误:', err);
        if (waitingForAcceptance) {
          setConnectionStatus('failed');
          setWaitingForAcceptance(false);
          displayToast('连接失败，请重试');
        }
        if (connectionTimeout) clearTimeout(connectionTimeout);
        activeConnectionRef.current = null;
      }
    });
  };

  const handleReceivedData = async (data, sourceConn) => {
    try {
      const remoteId = sourceConn.peer;
      let parsedData = data;
      if (data instanceof ArrayBuffer) {
        try {
          parsedData = JSON.parse(new TextDecoder().decode(data));
        } catch (e) {
          console.warn("Received ArrayBuffer that is not valid JSON text:", data);
          return;
        }
      } else if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.warn("Received string data that is not valid JSON:", data);
          return;
        }
      }
      if (typeof parsedData !== 'object' || parsedData === null) {
        console.warn("Received data is not a valid object after parsing:", parsedData);
        return;
      }

      console.log(`收到数据 from ${remoteId}:`, parsedData);
      const messageType = parsedData.type;

      if (messageType === 'connection-request') {
        console.log('收到连接请求，来自:', parsedData.peerId);
        if (parsedData.useEncryption !== undefined) {
          setIncomingUseEncryption(parsedData.useEncryption);
          sessionStorage.setItem(`useEncryption_${peerId}_${parsedData.peerId}`, parsedData.useEncryption.toString());
        }
        setIsConnectionInitiator(false);
        sessionStorage.setItem('isInitiator', 'false');

        if (!activeConnectionRef.current || activeConnectionRef.current.peer !== remoteId) {
          setIncomingPeerId(remoteId);
          setIncomingConnection(sourceConn);
          setShowConnectionRequest(true);
        } else {
          console.log("Already have an active/pending connection with this peer, ignoring new request for now.");
        }

      } else if (messageType === 'connection-accepted') {
        console.log(`${remoteId} 已接受连接请求`);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setWaitingForAcceptance(false);
        setConnectionStatus('connected_to_peer');
        activeConnectionRef.current = sourceConn;
        if (setConnection) setConnection(sourceConn);
        if (setTargetIdProp) setTargetIdProp(remoteId);

        const encryptionIsEnabled = sessionStorage.getItem(`useEncryption_${peerId}_${remoteId}`) === 'true' ||
            (sessionStorage.getItem('useEncryption') === 'true' && isConnectionInitiator);
        if (encryptionIsEnabled) {
          await initializeEncryption(sourceConn);
        } else {
          console.log('不使用加密，直接打开聊天界面');
          sessionStorage.setItem(`encryptionReady_${peerId}_${remoteId}`, 'disabled');
          navigateToChat({
            localId: peerId,
            remoteId: remoteId,
            encryptionEnabled: false,
            isEncReady: true,
            isInitiatorVal: isConnectionInitiator,
            sharedKeyObject: null
          });
        }

      } else if (messageType === 'connection-rejected') {
        console.log(`${remoteId} 拒绝了连接请求`);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setWaitingForAcceptance(false);
        setConnectionStatus('rejected_by_peer');
        displayToast(`${remoteId} 拒绝了连接请求`);
        if (sourceConn) sourceConn.close();
        activeConnectionRef.current = null;

      } else if (messageType === 'encryption-key') {
        console.log(`收到来自 ${remoteId} 的加密密钥交换请求`);
        if (!window.encryptionState) {
          console.error('加密状态对象不存在，无法完成密钥交换');
          window.encryptionState = new encryptionService.EncryptionState();
        }
        if (!parsedData.publicKey) {
          console.error('接收到的公钥无效'); return;
        }
        console.log('处理密钥交换, 接收到的公钥长度:', parsedData.publicKey.length);
        await window.encryptionState.processRemotePublicKey(parsedData.publicKey);
        window.sharedCryptoKey = window.encryptionState.sharedSecret;
        if (!window.sharedCryptoKey) {
          console.error('密钥交换完成后，共享密钥仍不存在');
          displayToast('加密通道建立失败，请重试'); return;
        }
        console.log('密钥交换成功，共享密钥已保存');
        setEncryptionReady(true);
        sessionStorage.setItem(`encryptionReady_${peerId}_${remoteId}`, 'true');

        if (!hasHandledEncryptionReady) {
          await sendEncryptionReadyConfirmation(sourceConn);
          setHasHandledEncryptionReady(true);
        }

      } else if (messageType === 'encryption-ready') {
        console.log(`收到来自 ${remoteId} 的加密就绪确认消息`);
        const useEnc = sessionStorage.getItem(`useEncryption_${peerId}_${remoteId}`) === 'true' ||
            (sessionStorage.getItem('useEncryption') === 'true');

        if (useEnc && (!window.encryptionState || !window.sharedCryptoKey)) {
          console.error('收到加密就绪确认，但本地共享密钥不存在.');
          displayToast("加密状态不匹配，请尝试重连");
          return;
        }
        setEncryptionReady(true);
        sessionStorage.setItem(`encryptionReady_${peerId}_${remoteId}`, 'confirmed');
        setHasHandledEncryptionReady(true);

        if (encryptionReadyConfirmationTimeoutRef.current) {
          clearTimeout(encryptionReadyConfirmationTimeoutRef.current);
          encryptionReadyConfirmationTimeoutRef.current = null;
        }
        console.log(`加密通道已与 ${remoteId} 建立，打开聊天界面`);
        navigateToChat({
          localId: peerId,
          remoteId: remoteId,
          encryptionEnabled: true,
          isEncReady: true,
          isInitiatorVal: sessionStorage.getItem('isInitiator') === 'true',
          sharedKeyObject: window.sharedCryptoKey
        });
      }
    } catch (error) {
      console.error('处理接收数据时出错:', error);
      displayToast('处理数据时出错，请重试');
    }
  };

  const initializeEncryption = async (conn) => {
    if (!conn || !conn.open) {
      console.error("Cannot initialize encryption: connection is not valid or not open.", conn);
      displayToast("连接无效，无法开始加密");
      return;
    }
    const remoteId = conn.peer;
    try {
      console.log(`初始化加密 with ${remoteId}`);
      currentEncryptionRetries.current = 0;
      if (!window.encryptionState) {
        window.encryptionState = new encryptionService.EncryptionState();
      }
      const publicKeyBase64 = await window.encryptionState.initialize();
      if (!publicKeyBase64) throw new Error('导出公钥失败');

      const keyExchangeMessage = encryptionService.createKeyExchangeMessage(publicKeyBase64);
      if (!keyExchangeMessage) throw new Error('Key exchange message is undefined');

      peerService.sendMessageSafely(conn, keyExchangeMessage);
      console.log(`已发送公钥进行密钥交换 to ${remoteId}`);
      setHasHandledEncryptionReady(false);

    } catch (error) {
      console.error(`初始化加密时发生错误 with ${remoteId}:`, error);
      displayToast(`加密初始化失败: ${error.message}`);
      if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
        currentEncryptionRetries.current++;
        setTimeout(() => initializeEncryption(conn), 3000 * currentEncryptionRetries.current);
      } else {
        setConnectionStatus('failed_encryption');
        displayToast(`与 ${remoteId} 的加密初始化完全失败`);
      }
    }
  };

  const sendEncryptionReadyConfirmation = async (conn) => {
    if (!conn || !conn.open) {
      console.error("Cannot send encryption ready: connection is not valid or not open.");
      return;
    }
    const remoteId = conn.peer;
    console.log(`尝试发送加密就绪确认 to ${remoteId}`);

    if (!window.sharedCryptoKey) {
      console.error('发送加密就绪确认失败: 未检测到有效的共享密钥.');
      displayToast('共享密钥丢失，无法确认加密。请尝试重连。');
      return;
    }

    const remoteIsConfirmed = sessionStorage.getItem(`encryptionReady_${peerId}_${remoteId}`) === 'confirmed';

    if (remoteIsConfirmed && encryptionReady) {
      console.log(`Peer ${remoteId} already confirmed and we are ready. Opening chat.`);
      navigateToChat({
        localId: peerId,
        remoteId: remoteId,
        encryptionEnabled: true,
        isEncReady: true,
        isInitiatorVal: sessionStorage.getItem('isInitiator') === 'true',
        sharedKeyObject: window.sharedCryptoKey
      });
      return;
    }

    console.log(`发送加密就绪确认消息 to ${remoteId}`);
    const sent = peerService.sendMessageSafely(conn, { type: 'encryption-ready' });
    if (sent) {
      sessionStorage.setItem(`encryptionReady_${peerId}_${remoteId}`, 'sent_confirmation');
      console.log(`已发送加密就绪确认消息 to ${remoteId}`);

      if (encryptionReady && !remoteIsConfirmed) {
        console.log(`We are ready, sent confirmation to ${remoteId}. If they also sent theirs, chat will open.`);
      } else if (!encryptionReady) {
        console.log(`Sent readiness to ${remoteId}, but we are not locally ready yet (waiting for their key).`);
      }
    } else {
      console.log(`连接 ${remoteId} 未就绪，加密就绪确认消息将在连接打开后发送 (queued by peerService)`);
    }
  };

  const acceptConnection = () => {
    if (incomingConnection) {
      handleAcceptedIncomingConnection(incomingConnection);
      setShowConnectionRequest(false);
    }
  };

  const handleAcceptedIncomingConnection = async (conn) => {
    if (!conn) return;
    const remoteId = conn.peer;
    console.log(`处理接受的连接请求 from ${remoteId}`);
    setConnectionStatus('connected_to_peer');
    activeConnectionRef.current = conn;
    if (setConnection) setConnection(conn);
    if (setTargetIdProp) setTargetIdProp(remoteId);

    peerService.sendMessageSafely(conn, {
      type: 'connection-accepted',
      peerId: peerId,
      timestamp: Date.now()
    });

    const encryptionIsEnabled = incomingUseEncryption;
    sessionStorage.setItem('useEncryption', encryptionIsEnabled.toString());
    sessionStorage.setItem('isInitiator', 'false');

    if (encryptionIsEnabled) {
      await initializeEncryption(conn);
    } else {
      console.log('不使用加密，直接打开聊天界面 with', remoteId);
      sessionStorage.setItem(`encryptionReady_${peerId}_${remoteId}`, 'disabled');
      navigateToChat({
        localId: peerId,
        remoteId: remoteId,
        encryptionEnabled: false,
        isEncReady: true,
        isInitiatorVal: false,
        sharedKeyObject: null
      });
    }
    setIncomingConnection(null);
    setIncomingPeerId('');
  };

  const rejectIncomingConnection = () => {
    if (incomingConnection) {
      try {
        peerService.sendMessageSafely(incomingConnection, {
          type: 'connection-rejected',
          peerId: peerId,
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

  const generateRandomId = (prefix = '') => {
    const randomPart = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}-${randomPart}` : randomPart;
  };

  const handleGenerateUserPeerId = () => {
    const randomId = generateRandomId();
    setPeerId(randomId);
    setCustomIdError('');
  };

  const handleEncryptionToggle = () => { setUseEncryption(!useEncryption); };

  const handleGenerateRandomGroupChatId = () => {
    const randomGroupId = generateRandomId('group');
    setGroupChatId(randomGroupId);
    setGroupChatIdError('');
  };

  const handleAddInvitee = () => {
    const { isValid, errorMessage } = validateGenericId(inviteeId, '邀请成员ID');
    if (!isValid) {
      setInviteeIdError(errorMessage); return;
    }
    if (inviteeId === peerId) {
      setInviteeIdError('不能邀请自己到群聊'); return;
    }
    if (invitedMembers.includes(inviteeId)) {
      setInviteeIdError('该成员已被添加'); return;
    }
    setInvitedMembers([...invitedMembers, inviteeId]);
    setInviteeId('');
    setInviteeIdError('');
  };

  const handleRemoveInvitee = (idToRemove) => {
    setInvitedMembers(invitedMembers.filter(id => id !== idToRemove));
  };

  const handleCreateAndInviteToGroup = async () => {
    const { isValid, errorMessage } = validateGenericId(groupChatId, '群聊ID');
    if (!isValid) {
      setGroupChatIdError(errorMessage);
      displayToast('请输入有效的群聊ID');
      return;
    }
    if (invitedMembers.length === 0) {
      displayToast('请至少邀请一个成员');
      setInviteeIdError('请添加成员');
      return;
    }

    displayToast(`创建群聊 ${groupChatId} 并邀请 ${invitedMembers.join(', ')} (模拟)`);
    console.log("Attempting to create group:", groupChatId, "with members:", invitedMembers);
  };

  const handleSidebarItemClick = (session) => {
    if (session.type === 'p2p' && session.urlParams) {
      // For now, simply switch to chat with the existing connection
      if (activeConnectionRef.current && activeConnectionRef.current.peer === session.urlParams.targetId) {
        setTargetIdProp(session.urlParams.targetId);
        setScreen('chat');
      } else {
        displayToast(`连接到 ${session.name} 已断开，请重新连接`);
      }
    } else if (session.type === 'group') {
      displayToast(`Group chat with ${session.name} selected (opening not fully implemented).`);
    }
  };

  const renderInitialConnectionForm = () => (
      <Card>
        <Title>P2P 安全聊天</Title>
        <InputGroup>
          <Label>你的 ID</Label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input
                type="text"
                value={peerId}
                onChange={(e) => { setPeerId(e.target.value); if (customIdError) validateCustomId(e.target.value); }}
                placeholder="输入你的ID或使用随机ID"
                disabled={isPeerCreated || connectionStatus === 'connecting'}
                style={{ flexGrow: 1 }}
            />
            {!isPeerCreated && (
                <SmallButton onClick={handleGenerateUserPeerId} style={{ minWidth: '100px' }} disabled={connectionStatus === 'connecting'}>
                  <FiLink /> 随机ID
                </SmallButton>
            )}
          </div>
          {customIdError && <div style={{ color: 'red', marginTop: '5px', fontSize: '12px' }}>{customIdError}</div>}
        </InputGroup>
        <Button onClick={createPeerConnection} disabled={connectionStatus === 'connecting' || !peerId}>
          {connectionStatus === 'connecting' && !isPeerCreated ? (
              <> <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> 创建中...</>
          ) : ( <><FiLink /> 创建我的 Peer 连接</> )}
        </Button>
      </Card>
  );

  const renderMainInterface = () => (
      <>
        <StatusIndicator status={connectionStatus} peerId={peerId} />
        <div style={{ marginTop: '10px', marginBottom: '20px' }}>
          <CopyableId id={peerId} />
        </div>

        <EncryptionToggle>
          <span>P2P消息加密:</span>
          <ToggleLabel>
            <ToggleInput type="checkbox" checked={useEncryption} onChange={handleEncryptionToggle} />
            <ToggleSwitch $isChecked={useEncryption} />
            <ToggleText>{useEncryption ? '已启用' : '已禁用'}</ToggleText>
          </ToggleLabel>
        </EncryptionToggle>

        <SectionDivider />
        <Title style={{ fontSize: '20px', marginBottom: '15px' }}>一对一聊天</Title>

        <InputGroup>
          <Label>连接到对方 Peer ID</Label>
          <Input
              type="text"
              value={targetIdInput}
              onChange={(e) => { setTargetIdInput(e.target.value); if (targetIdError) validateTargetIdForConnection(e.target.value); }}
              placeholder="输入对方的ID"
              disabled={waitingForAcceptance || connectionStatus === 'connecting_to_peer'}
          />
          {targetIdError && <div style={{ color: 'red', marginTop: '5px', fontSize: '12px' }}>{targetIdError}</div>}
        </InputGroup>
        <Button onClick={connectToPeer} disabled={waitingForAcceptance || connectionStatus === 'connecting_to_peer' || !targetIdInput}>
          {waitingForAcceptance ? (
              <> <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> 等待对方接受...</>
          ) : ( connectionStatus === 'connecting_to_peer' ? <> <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> 连接中... </> : '连接对方' )}
        </Button>

        <SectionDivider />
        <Title style={{ fontSize: '20px', marginBottom: '15px' }}>创建群聊</Title>

        <InputGroup>
          <Label>群聊 ID</Label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input
                type="text"
                value={groupChatId}
                onChange={(e) => { setGroupChatId(e.target.value); if (groupChatIdError) validateGenericId(e.target.value, '群聊ID'); }}
                placeholder="输入群聊ID或使用随机ID"
                style={{ flexGrow: 1 }}
            />
            <SmallButton onClick={handleGenerateRandomGroupChatId} style={{ minWidth: '100px' }}>
              随机ID
            </SmallButton>
          </div>
          {groupChatIdError && <div style={{ color: 'red', marginTop: '5px', fontSize: '12px' }}>{groupChatIdError}</div>}
        </InputGroup>

        <InputGroup>
          <Label>邀请成员 (输入对方 Peer ID)</Label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input
                type="text"
                value={inviteeId}
                onChange={(e) => { setInviteeId(e.target.value); if (inviteeIdError) setInviteeIdError(''); }}
                placeholder="输入成员 Peer ID 添加"
                style={{ flexGrow: 1 }}
            />
            <SmallButton onClick={handleAddInvitee} style={{ minWidth: '100px' }}>
              <FiPlus /> 添加
            </SmallButton>
          </div>
          {inviteeIdError && <div style={{ color: 'red', marginTop: '5px', fontSize: '12px' }}>{inviteeIdError}</div>}
        </InputGroup>

        {invitedMembers.length > 0 && (
            <InvitedMembersList>
              {invitedMembers.map(member => (
                  <InvitedMemberItem key={member}>
                    <span>{member}</span>
                    <RemoveMemberButton onClick={() => handleRemoveInvitee(member)} title="移除成员">
                      <FiTrash2 />
                    </RemoveMemberButton>
                  </InvitedMemberItem>
              ))}
            </InvitedMembersList>
        )}

        <Button
            onClick={handleCreateAndInviteToGroup}
            disabled={!groupChatId || invitedMembers.length === 0}
            style={{ backgroundColor: '#28a745' }}
        >
          <FiUsers /> 创建群聊并邀请
        </Button>
      </>
  );

  return (
      <PageLayoutContainer $isPeerCreated={isPeerCreated}>
        {isPeerCreated && (
            <Sidebar>
              <SidebarTitle><FiMessageSquare /> 活动聊天</SidebarTitle>
              {activeChatSessions.length === 0 && <p style={{ fontSize: '13px', color: '#777', textAlign: 'center', marginTop: '20px' }}>暂无活动聊天。</p>}
              {activeChatSessions.map(session => (
                  <SessionListItem key={session.id + session.type + session.timestamp} onClick={() => handleSidebarItemClick(session)} title={`Click to open chat with ${session.name}`}>
                    <span className="session-name">{session.name}</span>
                    <span className="session-status">{session.statusText}</span>
                    <span className="session-timestamp">{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </SessionListItem>
              ))}
            </Sidebar>
        )}
        <ContentArea>
          {!isPeerCreated ? renderInitialConnectionForm() : <Card>{renderMainInterface()}</Card>}
        </ContentArea>

        {showConnectionRequest && (
            <ConnectionRequestModal>
              <ModalContent>
                <ModalTitle>连接请求</ModalTitle>
                <p><strong>{incomingPeerId}</strong> 请求与你建立连接。</p>
                <p>对方希望使用加密: {incomingUseEncryption ? '是' : '否'}</p>
                <ModalButtons>
                  <AcceptButton onClick={acceptConnection}>
                    <FiCheck />
                    接受
                  </AcceptButton>
                  <RejectButton onClick={rejectIncomingConnection}>
                    <FiX />
                    拒绝
                  </RejectButton>
                </ModalButtons>
              </ModalContent>
            </ConnectionRequestModal>
        )}
        {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
      </PageLayoutContainer>
  );
};

export default ConnectionScreen;