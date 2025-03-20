import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiLoader } from 'react-icons/fi';
import { encryptionService } from '../services/encryptionService';
import peerService from '../services/peerService';
import messageService from '../services/messageService';
import StatusIndicator from './StatusIndicator';
import CopyableId from './CopyableId';

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

  &:hover {
    background-color: #3a80d2;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const PeerIdContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
`;

const PeerId = styled.span`
  flex: 1;
  font-family: monospace;
  font-size: 16px;
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  color: #4a90e2;
  cursor: pointer;
  font-size: 20px;
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
  padding: 10px;
  border-radius: 4px;
  background-color: ${props => {
    switch (props.status) {
      case 'connected': return '#e6f7e6';
      case 'connecting': return '#fff8e6';
      case 'failed': return '#ffebee';
      default: return '#f5f5f5';
    }
  }};
`;

const StatusIcon = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 10px;
  background-color: ${props => {
    switch (props.status) {
      case 'connected': return '#2ecc71';
      case 'connecting': return '#f39c12';
      case 'failed': return '#e74c3c';
      default: return '#95a5a6';
    }
  }};
  
  ${props => props.status === 'connecting' && `
    animation: pulse 1.5s infinite;
    
    @keyframes pulse {
      0% {
        transform: scale(0.8);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.2);
        opacity: 1;
      }
      100% {
        transform: scale(0.8);
        opacity: 0.8;
      }
    }
  `}
`;

const StatusText = styled.span`
  font-size: 14px;
  color: ${props => {
    switch (props.status) {
      case 'connected': return '#27ae60';
      case 'connecting': return '#d35400';
      case 'failed': return '#c0392b';
      default: return '#7f8c8d';
    }
  }};
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

  // 初始化 PeerJS 连接
  useEffect(() => {
    if (peerId && validateCustomId(peerId) && connectionStatus === 'disconnected') {
      // 清除旧的连接
      if (peer) {
        peer.destroy();
      }
      
      // 初始化新的 Peer 连接
      const newPeer = peerService.initializePeer(peerId);
      setPeer(newPeer);
      
      // 设置连接监听器
      peerService.setupConnectionListeners(newPeer, {
        onOpen: (id) => {
          console.log('成功创建 Peer 连接，ID:', id);
        },
        onError: (err) => {
          console.error('Peer 连接错误:', err);
          
          // 处理 ID 已被占用的情况
          if (err.type === 'unavailable-id') {
            setCustomIdError('此 ID 已被占用，请尝试其他 ID');
          } else {
            setErrorMessage(`Peer 连接错误: ${err.message}`);
            setConnectionStatus('failed');
            setScreen('error');
          }
        },
        onDisconnected: () => {
          console.log('Peer 连接已断开');
          setConnectionStatus('disconnected');
        },
        onClose: () => {
          console.log('Peer 连接已关闭');
          setConnectionStatus('disconnected');
        },
        onConnection: (conn) => {
          console.log('收到来自对方的连接请求');
          handleIncomingConnection(conn);
        }
      });
    }
    
    // 组件卸载时清理
    return () => {
      if (peer) {
        peer.destroy();
      }
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [peerId, connectionStatus]);

  // 处理传入的连接请求
  const handleIncomingConnection = (conn) => {
    setConnectionStatus('connecting');
    setTargetId(conn.peer);
    
    // 设置数据连接监听器
    peerService.setupDataConnectionListeners(conn, {
      onOpen: () => {
        console.log('与对方建立连接成功');
        setConnectionStatus('connected');
        setConnection(conn);
        setScreen('chat');
        
        // 初始化加密
        initializeEncryption(conn);
      },
      onData: (data) => {
        handleReceivedData(data);
      },
      onClose: () => {
        console.log('连接已关闭');
        setConnectionStatus('disconnected');
        setScreen('connection');
      },
      onError: (err) => {
        console.error('连接错误:', err);
        setErrorMessage(`连接错误: ${err.message}`);
        setConnectionStatus('failed');
        setScreen('error');
      }
    });
  };

  // 处理接收到的数据
  const handleReceivedData = (data) => {
    try {
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
      const keyExchangeMessage = encryptionService.createKeyExchangeMessage(keyPair.publicKey);
      
      // 发送公钥给对方
      conn.send(keyExchangeMessage);
      
      console.log('已发送公钥进行密钥交换');
    } catch (error) {
      console.error('初始化加密时出错:', error);
    }
  };

  // 连接到对方 Peer
  const connectToPeer = () => {
    if (!peer || !targetId || !validateTargetId(targetId)) {
      return;
    }
    
    setConnectionStatus('connecting');
    
    // 设置连接超时
    const timeout = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        setErrorMessage('连接超时，对方可能不在线或 ID 不存在');
        setConnectionStatus('failed');
        setScreen('error');
      }
    }, 30000); // 30秒超时
    
    setConnectionTimeout(timeout);
    
    try {
      // 连接到目标 Peer
      const conn = peer.connect(targetId, {
        reliable: true
      });
      
      // 设置数据连接监听器
      peerService.setupDataConnectionListeners(conn, {
        onOpen: () => {
          console.log('成功连接到对方');
          clearTimeout(timeout);
          setConnectionStatus('connected');
          setConnection(conn);
          setScreen('chat');
          
          // 初始化加密
          initializeEncryption(conn);
        },
        onData: (data) => {
          handleReceivedData(data);
        },
        onClose: () => {
          console.log('连接已关闭');
          clearTimeout(timeout);
          setConnectionStatus('disconnected');
          setScreen('connection');
        },
        onError: (err) => {
          console.error('连接错误:', err);
          clearTimeout(timeout);
          setErrorMessage(`连接错误: ${err.message}`);
          setConnectionStatus('failed');
          setScreen('error');
        }
      });
    } catch (error) {
      console.error('连接到对方时出错:', error);
      clearTimeout(timeout);
      setErrorMessage(`连接错误: ${error.message}`);
      setConnectionStatus('failed');
      setScreen('error');
    }
  };

  // 复制 Peer ID 到剪贴板
  const copyPeerId = () => {
    navigator.clipboard.writeText(peerId);
  };

  // 验证自定义 ID
  const validateCustomId = (id) => {
    if (id.length < 6 || id.length > 12) {
      setCustomIdError('ID 必须为 6-12 位字符');
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
    if (id === peerId) {
      setTargetIdError('不能连接到自己');
      return false;
    }
    
    if (id.length < 6 || id.length > 12) {
      setTargetIdError('目标 ID 格式不正确');
      return false;
    }
    
    setTargetIdError('');
    return true;
  };

  return (
    <ConnectionContainer>
      <Card>
        <Title>P2P 聊天系统</Title>
        
        <InputGroup>
          <Label>你的 ID</Label>
          <Input 
            type="text" 
            placeholder="输入 6-12 位字母数字组合的 ID" 
            value={peerId} 
            onChange={(e) => {
              setPeerId(e.target.value);
              validateCustomId(e.target.value);
            }}
            disabled={connectionStatus !== 'disconnected'}
          />
          {customIdError && <p style={{ color: 'red', fontSize: '12px' }}>{customIdError}</p>}
        </InputGroup>
        
        {peerId && !customIdError && (
          <CopyableId id={peerId} onCopy={() => console.log('ID已复制:', peerId)} />
        )}
        
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
            disabled={connectionStatus !== 'disconnected'}
          />
          {targetIdError && <p style={{ color: 'red', fontSize: '12px' }}>{targetIdError}</p>}
        </InputGroup>
        
        <Button 
          onClick={connectToPeer} 
          disabled={
            connectionStatus !== 'disconnected' || 
            !peerId || 
            !targetId || 
            !!customIdError || 
            !!targetIdError || 
            peerId === targetId
          }
        >
          {connectionStatus === 'connecting' ? '连接中...' : '连接'}
        </Button>
        
        <StatusIndicator status={connectionStatus} />
      </Card>
    </ConnectionContainer>
  );
};

export default ConnectionScreen;
