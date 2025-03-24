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

// 样式组件定义保持不变...
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

// 新增加密开关组件
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
  const [connectionMode, setConnectionMode] = useState('create'); // 'create' or 'connect'
  const [isConnectionInitiator, setIsConnectionInitiator] = useState(false); // 标记是否为连接发起方
  const [encryptionReady, setEncryptionReady] = useState(false); // 标记加密是否准备就绪
  const [hasHandledEncryptionReady, setHasHandledEncryptionReady] = useState(false); // 标记是否已处理过加密就绪
  const [useEncryption, setUseEncryption] = useState(true); // 新增：是否使用加密
  const reconnectTimeoutRef = useRef(null); // 用于重连的定时器引用
  const dataListenerRef = useRef(null); // 用于跟踪数据监听器
  const encryptionReadyConfirmationTimeoutRef = useRef(null); // 用于重试发送加密就绪确认的定时器
  const activeConnectionRef = useRef(null); // 用于跟踪活动连接
  const maxEncryptionRetries = useRef(3); // 最大加密重试次数
  const currentEncryptionRetries = useRef(0); // 当前加密重试次数

  // 验证自定义ID
  const validateCustomId = (id) => {
    // ID必须是3-12位的字母、数字、下划线或连字符
    const idRegex = /^[a-zA-Z0-9_-]{3,12}$/;
    const isValid = idRegex.test(id);
    
    if (!isValid) {
      setCustomIdError('ID必须是3-12位的字母、数字、下划线或连字符');
    } else {
      setCustomIdError('');
    }
    
    return isValid;
  };

  // 验证目标ID
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

  // 显示提示消息
  const displayToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 初始化 PeerJS 连接
  useEffect(() => {
    // 清除会话存储中的密钥
    sessionStorage.removeItem('privateKey');
    sessionStorage.removeItem('sharedSecret');
    sessionStorage.removeItem('encryptionReady');
    sessionStorage.removeItem('isInitiator');
    sessionStorage.removeItem('useEncryption');
    
    // 清除消息历史
    setMessages([]);
    
    return () => {
      // 组件卸载时清理
      if (peer) {
        peer.destroy();
      }
      
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (encryptionReadyConfirmationTimeoutRef.current) {
        clearTimeout(encryptionReadyConfirmationTimeoutRef.current);
      }
    };
  }, []);

  // 创建 Peer 连接
  const createPeerConnection = () => {
    if (!peerId) {
      setCustomIdError('请输入ID');
      return;
    }
    
    if (!validateCustomId(peerId)) {
      return;
    }
    
    setConnectionStatus('connecting');
    
    // 初始化 Peer 连接
    const newPeer = peerService.initializePeer(peerId);
    setPeer(newPeer);
    
    // 设置 Peer 连接监听器
    peerService.setupConnectionListeners(newPeer, {
      onOpen: (id) => {
        console.log('成功创建 Peer 连接，ID:', id);
        setConnectionStatus('ready');
        setIsPeerCreated(true);
        displayToast(`Peer 连接已创建，ID: ${id}`);
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
        
        // 设置为接收方角色
        setIsConnectionInitiator(false);
        sessionStorage.setItem('isInitiator', 'false');
        
        // 设置数据连接监听器，以便在接受前就能接收消息
        peerService.setupDataConnectionListeners(conn, {
          onData: (data) => {
            handleReceivedData(data, conn);
          },
          onClose: () => {
            console.log('数据连接已关闭');
            
            // 如果正在显示连接请求，则关闭
            if (showConnectionRequest && incomingConnection === conn) {
              setShowConnectionRequest(false);
              setIncomingConnection(null);
              setIncomingPeerId('');
            }
          },
          onError: (err) => {
            console.error('数据连接错误:', err);
            
            // 如果正在显示连接请求，则关闭
            if (showConnectionRequest && incomingConnection === conn) {
              setShowConnectionRequest(false);
              setIncomingConnection(null);
              setIncomingPeerId('');
              displayToast('连接请求出错，请重试');
            }
          }
        });
        
        // 保存连接
        setIncomingConnection(conn);
        setIncomingPeerId(conn.peer);
        
        // 显示连接请求
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

  // 连接到目标 Peer
  const connectToPeer = () => {
    if (!peer) {
      displayToast('请先创建自己的 Peer 连接');
      return;
    }
    
    if (!targetId) {
      setTargetIdError('请输入目标ID');
      return;
    }
    
    if (!validateTargetId(targetId)) {
      return;
    }
    
    setConnectionStatus('connecting');
    setWaitingForAcceptance(true);
    
    // 设置为发起方角色
    setIsConnectionInitiator(true);
    sessionStorage.setItem('isInitiator', 'true');
    
    // 存储加密选项
    sessionStorage.setItem('useEncryption', useEncryption ? 'true' : 'false');
    
    // 连接到目标 Peer
    const conn = peerService.connectToPeer(peer, targetId);
    
    if (!conn) {
      setConnectionStatus('failed');
      setWaitingForAcceptance(false);
      displayToast('连接失败，请重试');
      return;
    }
    
    // 保存连接
    setPendingConnection(conn);
    
    // 保存活动连接引用
    activeConnectionRef.current = conn;
    
    // 设置数据连接监听器
    peerService.setupDataConnectionListeners(conn, {
      onOpen: () => {
        console.log('数据连接已打开，发送连接请求');
        
        // 发送连接请求
        peerService.sendMessageSafely(conn, {
          type: 'connection-request',
          peerId: peerId,
          useEncryption: useEncryption,
          timestamp: Date.now()
        });
        
        // 设置连接超时
        const timeout = setTimeout(() => {
          if (waitingForAcceptance) {
            console.log('连接请求超时');
            setConnectionStatus('timeout');
            setWaitingForAcceptance(false);
            displayToast('连接请求超时，请重试');
            conn.close();
          }
        }, 30000); // 30秒超时
        
        setConnectionTimeout(timeout);
      },
      onData: (data) => {
        handleReceivedData(data, conn);
      },
      onClose: () => {
        console.log('数据连接已关闭');
        
        if (waitingForAcceptance) {
          setConnectionStatus('disconnected');
          setWaitingForAcceptance(false);
          displayToast('连接已断开，请重试');
        }
        
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
      },
      onError: (err) => {
        console.error('数据连接错误:', err);
        
        if (waitingForAcceptance) {
          setConnectionStatus('failed');
          setWaitingForAcceptance(false);
          displayToast('连接失败，请重试');
        }
        
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
      }
    });
  };

  // 处理接收到的数据
  const handleReceivedData = (data, sourceConn) => {
    try {
      console.log('收到数据:', data);
      
      // 处理连接请求
      if (data.type === 'connection-request') {
        console.log('收到连接请求，来自:', data.peerId);
        
        // 保存对方是否使用加密的选择
        if (data.useEncryption !== undefined) {
          sessionStorage.setItem('useEncryption', data.useEncryption ? 'true' : 'false');
        }
        
        // 如果已经显示了连接请求，则忽略
        if (showConnectionRequest) {
          console.log('已经显示了连接请求，忽略新请求');
          return;
        }
        
        // 显示连接请求
        setIncomingPeerId(data.peerId);
        setShowConnectionRequest(true);
      }
      
      // 处理连接接受消息
      else if (data.type === 'connection-accepted') {
        console.log('对方已接受连接请求');
        
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
        
        setWaitingForAcceptance(false);
        setConnectionStatus('connected');
        
        // 保存连接
        setConnection(sourceConn || pendingConnection);
        
        // 保存活动连接引用
        activeConnectionRef.current = sourceConn || pendingConnection;
        
        console.log('使用活动连接进入聊天界面');
        
        // 检查是否使用加密
        const shouldUseEncryption = sessionStorage.getItem('useEncryption') === 'true';
        
        if (shouldUseEncryption) {
          // 初始化加密
          initializeEncryption();
        } else {
          // 不使用加密，直接进入聊天界面
          console.log('不使用加密，直接进入聊天界面');
          sessionStorage.setItem('encryptionReady', 'disabled');
          setScreen('chat');
        }
      }
      
      // 处理连接拒绝消息
      else if (data.type === 'connection-rejected') {
        console.log('对方拒绝了连接请求');
        
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
        
        setWaitingForAcceptance(false);
        setConnectionStatus('rejected');
        displayToast('对方拒绝了连接请求');
        
        if (sourceConn) {
          sourceConn.close();
        } else if (pendingConnection) {
          pendingConnection.close();
        }
      }
      
      // 处理加密密钥交换消息
      else if (data.type === 'encryption-key') {
        console.log('收到加密密钥交换请求');
        
        // 获取私钥
        const privateKeyHex = sessionStorage.getItem('privateKey');
        if (!privateKeyHex) {
          console.error('私钥不存在，无法完成密钥交换');
          return;
        }
        
        // 将十六进制字符串转换回 WordArray
        const privateKey = CryptoJS.enc.Hex.parse(privateKeyHex);
        
        console.log('处理密钥交换, 私钥长度:', privateKeyHex.length, '接收到的公钥长度:', data.publicKey.length);
        
        // 处理密钥交换
        const sharedSecret = encryptionService.handleKeyExchange(
          privateKey,
          data.publicKey,
          sessionStorage.getItem('isInitiator') === 'true'
        );
        
        if (sharedSecret) {
          // 存储共享密钥
          sessionStorage.setItem('sharedSecret', sharedSecret);
          console.log('密钥交换成功，已生成共享密钥，长度:', sharedSecret.length);
          
          // 设置加密就绪状态
          setEncryptionReady(true);
          sessionStorage.setItem('encryptionReady', 'true');
          
          // 发送加密就绪确认
          if (sessionStorage.getItem('encryptionReady') !== 'sent' && 
              sessionStorage.getItem('encryptionReady') !== 'confirmed' && 
              !hasHandledEncryptionReady) {
            sendEncryptionReadyConfirmation(sourceConn || pendingConnection || activeConnectionRef.current);
            setHasHandledEncryptionReady(true);
          }
        } else {
          console.error('密钥交换失败');
          displayToast('加密通道建立失败，请重试');
        }
      }
      
      // 处理加密就绪确认消息
      else if (data.type === 'encryption-ready') {
        console.log('收到加密就绪确认消息');
        
        // 确保共享密钥存在
        const sharedSecret = sessionStorage.getItem('sharedSecret');
        if (!sharedSecret) {
          console.error('收到加密就绪确认，但共享密钥不存在');
          return;
        }
        
        // 设置加密就绪状态
        setEncryptionReady(true);
        sessionStorage.setItem('encryptionReady', 'confirmed');
        setHasHandledEncryptionReady(true);
        
        // 如果我们还没有发送过确认，也发送一个确认
        if (sessionStorage.getItem('encryptionReady') !== 'sent') {
          sendEncryptionReadyConfirmation(sourceConn || pendingConnection || activeConnectionRef.current);
        }
        
        // 清除任何待处理的重试定时器
        if (encryptionReadyConfirmationTimeoutRef.current) {
          clearTimeout(encryptionReadyConfirmationTimeoutRef.current);
          encryptionReadyConfirmationTimeoutRef.current = null;
        }
        
        // 进入聊天界面
        setScreen('chat');
      }
    } catch (error) {
      console.error('处理接收数据时出错:', error);
      displayToast('处理数据时出错，请重试');
    }
  };

  // 初始化加密
  const initializeEncryption = () => {
    console.log('初始化加密');
    
    // 确定角色（发起方或接收方）
    const isInitiator = sessionStorage.getItem('isInitiator') === 'true';
    console.log('初始化加密，角色:', isInitiator ? '发起方' : '接收方');
    
    // 重置加密重试计数
    currentEncryptionRetries.current = 0;
    
    // 生成密钥对
    const keyPair = encryptionService.generateKeyPair();
    if (!keyPair) {
      console.error('生成密钥对失败');
      displayToast('加密初始化失败，请重试');
      return;
    }
    
    // 存储私钥（十六进制字符串格式）
    const privateKeyHex = keyPair.privateKey.toString(CryptoJS.enc.Hex);
    sessionStorage.setItem('privateKey', privateKeyHex);
    console.log('已生成并存储私钥，长度:', privateKeyHex.length);
    
    // 创建密钥交换消息
    const keyExchangeMessage = encryptionService.createKeyExchangeMessage(
      keyPair.publicKey,
      isInitiator
    );
    
    if (!keyExchangeMessage) {
      console.error('创建密钥交换消息失败');
      displayToast('加密初始化失败，请重试');
      return;
    }
    
    // 发送公钥
    try {
      // 使用活动连接引用或其他可用连接
      const activeConn = activeConnectionRef.current || pendingConnection;
      
      if (activeConn) {
        // 使用安全发送方法确保连接已打开
        peerService.sendMessageSafely(activeConn, keyExchangeMessage);
        console.log('已发送公钥进行密钥交换');
      } else {
        console.error('发送公钥失败: 没有可用的连接');
        console.log('连接状态:', {
          activeConnectionRef: activeConnectionRef.current ? '存在' : '不存在',
          pendingConnection: pendingConnection ? '存在' : '不存在'
        });
        displayToast('加密初始化失败，请重试');
        
        // 尝试重新初始化加密，但限制重试次数
        if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
          currentEncryptionRetries.current++;
          console.log(`尝试重新初始化加密... (${currentEncryptionRetries.current}/${maxEncryptionRetries.current})`);
          setTimeout(() => {
            initializeEncryption();
          }, 2000);
        } else {
          console.error(`已达到最大重试次数 (${maxEncryptionRetries.current})，放弃加密初始化`);
          displayToast('加密初始化失败，请重新连接');
          setConnectionStatus('failed');
        }
      }
    } catch (error) {
      console.error('发送公钥时出错:', error);
      displayToast('加密初始化失败，请重试');
    }
  };

  // 发送加密就绪确认
  const sendEncryptionReadyConfirmation = (conn) => {
    if (!conn) {
      console.error('发送加密就绪确认失败: 没有可用的连接');
      
      // 尝试使用活动连接引用
      if (activeConnectionRef.current) {
        conn = activeConnectionRef.current;
        console.log('使用活动连接引用重试发送加密就绪确认');
      } else {
        return;
      }
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
      const sent = peerService.sendMessageSafely(conn, {
        type: 'encryption-ready'
      });
      
      if (sent) {
        console.log('已发送加密就绪确认消息');
        sessionStorage.setItem('encryptionReady', 'sent');
        
        // 设置重试定时器，如果5秒内未收到对方确认，则重新发送
        if (encryptionReadyConfirmationTimeoutRef.current) {
          clearTimeout(encryptionReadyConfirmationTimeoutRef.current);
        }
        
        // 限制重试次数
        if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
          encryptionReadyConfirmationTimeoutRef.current = setTimeout(() => {
            if (sessionStorage.getItem('encryptionReady') !== 'confirmed') {
              console.log(`未收到对方的加密就绪确认，再次发送 (${currentEncryptionRetries.current + 1}/${maxEncryptionRetries.current})`);
              currentEncryptionRetries.current++;
              // 重置状态以允许重新发送
              sessionStorage.setItem('encryptionReady', 'true');
              sendEncryptionReadyConfirmation(conn);
            }
          }, 5000);
        } else {
          console.log(`已达到最大重试次数 (${maxEncryptionRetries.current})，不再重试`);
          // 如果已经达到最大重试次数，但仍未收到确认，尝试直接进入聊天界面
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
      
      // 如果发送失败，稍后重试，但限制重试次数
      if (currentEncryptionRetries.current < maxEncryptionRetries.current) {
        currentEncryptionRetries.current++;
        setTimeout(() => {
          sendEncryptionReadyConfirmation(conn);
        }, 2000);
      }
    }
  };

  // 接受连接请求
  const acceptConnection = () => {
    if (incomingConnection) {
      handleIncomingConnection(incomingConnection);
      setShowConnectionRequest(false);
    }
  };

  // 拒绝连接请求
  const rejectIncomingConnection = () => {
    if (incomingConnection) {
      try {
        // 发送拒绝消息
        peerService.sendMessageSafely(incomingConnection, {
          type: 'connection-rejected',
          timestamp: Date.now()
        });
        
        // 关闭连接
        incomingConnection.close();
      } catch (error) {
        console.error('拒绝连接请求失败:', error);
      }
      
      // 重置状态
      setShowConnectionRequest(false);
      setIncomingConnection(null);
      setIncomingPeerId('');
    }
  };

  // 处理接收到的连接请求
  const handleIncomingConnection = (conn) => {
    if (!conn) return;
    
    console.log('处理接收到的连接请求');
    
    // 设置连接状态
    setConnectionStatus('connected');
    
    // 保存连接
    setConnection(conn);
    
    // 保存活动连接引用
    activeConnectionRef.current = conn;
    
    // 设置目标ID
    setTargetId(conn.peer);
    
    // 发送接受消息
    peerService.sendMessageSafely(conn, {
      type: 'connection-accepted',
      timestamp: Date.now()
    });
    
    // 检查是否使用加密
    const shouldUseEncryption = sessionStorage.getItem('useEncryption') === 'true';
    
    if (shouldUseEncryption) {
      // 初始化加密
      initializeEncryption();
    } else {
      // 不使用加密，直接进入聊天界面
      console.log('不使用加密，直接进入聊天界面');
      sessionStorage.setItem('encryptionReady', 'disabled');
      setScreen('chat');
    }
  };

  // 生成随机ID
  const generateRandomId = () => {
    const randomId = peerService.generateRandomId();
    setPeerId(randomId);
    setCustomIdError('');
  };

  // 切换连接模式
  const toggleConnectionMode = (mode) => {
    setConnectionMode(mode);
  };

  // 处理加密开关变化
  const handleEncryptionToggle = () => {
    setUseEncryption(!useEncryption);
  };

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
              <Button
                onClick={generateRandomId}
                style={{ width: 'auto', whiteSpace: 'nowrap' }}
              >
                随机ID
              </Button>
            )}
          </div>
          {customIdError && <div style={{ color: 'red', marginTop: '5px' }}>{customIdError}</div>}
        </InputGroup>
        
        {!isPeerCreated ? (
          <Button
            onClick={createPeerConnection}
            disabled={connectionStatus === 'connecting'}
          >
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
            
            {/* 加密开关 */}
            <EncryptionToggle>
              <span>加密通信:</span>
              <ToggleLabel>
                <ToggleInput
                  type="checkbox"
                  checked={useEncryption}
                  onChange={handleEncryptionToggle}
                />
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
            
            <Button
              onClick={connectToPeer}
              disabled={waitingForAcceptance || connectionStatus === 'connecting'}
            >
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
