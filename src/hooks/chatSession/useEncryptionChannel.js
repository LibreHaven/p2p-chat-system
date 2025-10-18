import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { encryptionService } from '../../services/encryptionService';
import peerService from '../../services/peerService';

const ENCRYPTION_STATUS = {
  disabled: '未启用加密',
  waitingPeer: '等待对方发起密钥交换...',
  initializing: '正在初始化加密...',
  keyExchange: '正在建立共享密钥...',
  ready: '加密通道已建立',
  failed: '加密通道建立失败',
  lost: '连接已断开',
};

const READY_FLAG = 'encryptionReady';

export default function useEncryptionChannel({
  connection,
  isInitiator,
  requestedUseEncryption,
}) {
  const connectionRef = useRef(connection);
  const encryptionStateRef = useRef(null);
  const initializationStartedRef = useRef(false);

  const [finalUseEncryption, setFinalUseEncryption] = useState(() => {
    const stored = sessionStorage.getItem('useEncryption');
    if (stored !== null) {
      return stored === 'true';
    }
    sessionStorage.setItem('useEncryption', requestedUseEncryption ? 'true' : 'false');
    return requestedUseEncryption;
  });
  const [encryptionReady, setEncryptionReady] = useState(() => {
    const stored = sessionStorage.getItem(READY_FLAG);
    return stored === 'true';
  });
  const [encryptionStatus, setEncryptionStatus] = useState(() =>
    requestedUseEncryption ? ENCRYPTION_STATUS.initializing : ENCRYPTION_STATUS.disabled,
  );

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  useEffect(() => {
    setFinalUseEncryption((prev) => {
      if (prev === requestedUseEncryption) {
        return prev;
      }
      sessionStorage.setItem('useEncryption', requestedUseEncryption ? 'true' : 'false');
      return requestedUseEncryption;
    });
  }, [requestedUseEncryption]);

  const resetReadyFlag = useCallback(() => {
    sessionStorage.removeItem(READY_FLAG);
    setEncryptionReady(false);
  }, []);

  const markEncryptionReady = useCallback(() => {
    sessionStorage.setItem(READY_FLAG, 'true');
    setEncryptionReady(true);
    setEncryptionStatus(ENCRYPTION_STATUS.ready);
  }, []);

  const sendEncryptionReadyConfirmation = useCallback(() => {
    const conn = connectionRef.current;
    if (!conn || !encryptionStateRef.current?.sharedSecret) {
      return;
    }
    const currentFlag = sessionStorage.getItem(READY_FLAG);
    if (currentFlag === 'sent' || currentFlag === 'confirmed') {
      return;
    }
    const sent = peerService.sendMessageSafely(conn, { type: 'encryption-ready' });
    if (sent) {
      sessionStorage.setItem(READY_FLAG, 'sent');
    }
  }, []);

  const sendEncryptionReadyResponse = useCallback(() => {
    const conn = connectionRef.current;
    if (!conn) {
      return;
    }
    peerService.sendMessageSafely(conn, {
      type: 'encryption-ready-response',
      timestamp: Date.now(),
    });
  }, []);

  const initializeEncryption = useCallback(async () => {
    if (!finalUseEncryption || initializationStartedRef.current) {
      return;
    }
    initializationStartedRef.current = true;
    try {
      setEncryptionStatus(ENCRYPTION_STATUS.initializing);
      encryptionStateRef.current = new encryptionService.EncryptionState();
      const publicKeyBase64 = await encryptionStateRef.current.initialize();
      const message = encryptionService.createKeyExchangeMessage(publicKeyBase64);
      const sent = peerService.sendMessageSafely(connectionRef.current, message);
      if (sent) {
        setEncryptionStatus(ENCRYPTION_STATUS.keyExchange);
      }
    } catch (error) {
      console.error('初始化加密失败:', error);
      setEncryptionStatus(ENCRYPTION_STATUS.failed);
      initializationStartedRef.current = false;
    }
  }, [finalUseEncryption]);

  const handleKeyExchange = useCallback(
    async (payload) => {
      if (!payload?.publicKey) {
        console.error('接收到的公钥无效');
        return;
      }
      try {
        if (!encryptionStateRef.current) {
          encryptionStateRef.current = new encryptionService.EncryptionState();
          await encryptionStateRef.current.initialize();
        }
        setEncryptionStatus(ENCRYPTION_STATUS.keyExchange);
        await encryptionStateRef.current.processRemotePublicKey(payload.publicKey);
        if (!encryptionStateRef.current.sharedSecret) {
          throw new Error('共享密钥不存在');
        }
        if (!isInitiator) {
          const publicKeyBase64 = await encryptionService.exportPublicKey(
            encryptionStateRef.current.keyPair.publicKey,
          );
          peerService.sendMessageSafely(connectionRef.current, {
            ...encryptionService.createKeyExchangeMessage(publicKeyBase64),
          });
        }
        markEncryptionReady();
        sendEncryptionReadyConfirmation();
      } catch (error) {
        console.error('密钥交换失败:', error);
        setEncryptionStatus(ENCRYPTION_STATUS.failed);
      }
    },
    [isInitiator, markEncryptionReady, sendEncryptionReadyConfirmation],
  );

  const handleEncryptionSignal = useCallback(
    (payload) => {
      if (!payload) {
        return false;
      }
      if (payload.type === 'encryption-key') {
        handleKeyExchange(payload);
        return true;
      }
      if (payload.type === 'encryption-ready') {
        setTimeout(() => {
          if (!encryptionStateRef.current?.sharedSecret) {
            console.warn('共享密钥不存在，忽略加密就绪确认');
            return;
          }
          sessionStorage.setItem(READY_FLAG, 'confirmed');
          markEncryptionReady();
          sendEncryptionReadyResponse();
        }, 100);
        return true;
      }
      if (payload.type === 'encryption-ready-response') {
        sessionStorage.setItem(READY_FLAG, 'confirmed');
        markEncryptionReady();
        return true;
      }
      return false;
    },
    [handleKeyExchange, markEncryptionReady, sendEncryptionReadyResponse],
  );

  const sharedSecret = useMemo(() => encryptionStateRef.current?.sharedSecret || null, [encryptionReady]);

  const resetEncryption = useCallback(() => {
    initializationStartedRef.current = false;
    encryptionStateRef.current = null;
    resetReadyFlag();
    setEncryptionStatus(finalUseEncryption ? ENCRYPTION_STATUS.waitingPeer : ENCRYPTION_STATUS.disabled);
  }, [finalUseEncryption, resetReadyFlag]);

  useEffect(() => {
    if (!connectionRef.current) {
      return;
    }

    if (!finalUseEncryption) {
      setEncryptionReady(false);
      sessionStorage.setItem(READY_FLAG, 'true');
      setEncryptionStatus(ENCRYPTION_STATUS.disabled);
      return;
    }

    if (isInitiator) {
      initializeEncryption();
    } else {
      setEncryptionStatus(ENCRYPTION_STATUS.waitingPeer);
    }
  }, [finalUseEncryption, initializeEncryption, isInitiator]);

  return {
    encryptionReady,
    encryptionStatus,
    finalUseEncryption,
    encryptionStateRef,
    sharedSecret,
    handleEncryptionSignal,
    initializeEncryption,
    markEncryptionReady,
    resetEncryption,
    setEncryptionStatus,
  };
}
