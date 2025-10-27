import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WebCryptoEncryption from '../../infrastructure/crypto/WebCryptoEncryption';
import useChatSessionStore from '../../shared/store/chatSessionStore';
import storage from '../../shared/storage/session';
import createReadyFlagState from './readyFlagState';
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
  sendPayload,
}) {
  // 统一发送函数：优先使用注入的发送器（通常为 transport 优先 + peerService 回退），否则直接使用 peerService
  const sendFn = useCallback(
    (conn, data) => {
      if (!conn || !data) return false;
      if (typeof sendPayload === 'function') {
        return !!sendPayload(conn, data);
      }
      return peerService.sendMessageSafely(conn, data);
    },
    [sendPayload],
  );

  const connectionRef = useRef(connection);
  const encryptionStateRef = useRef(null); // 将持有 WebCryptoEncryption 实例
  const initializationStartedRef = useRef(false);
  // 本地握手状态机标志，避免依赖 storage 读取作为“读源”
  const readyFlagRef = useRef(null); // helper managing '', 'sent', 'confirmed'
  if (!readyFlagRef.current) {
    readyFlagRef.current = createReadyFlagState({
      write: (val) => storage.setItem(READY_FLAG, val),
      clear: () => storage.removeItem(READY_FLAG),
    });
  }

  // 以 Store 为读路径的单一来源；若初始 Store 为空，则回退 session/requested 的初始化，并同步回 Store
  const storeFinal = useChatSessionStore((s) => s.finalUseEncryption);
  const setStoreFinal = useChatSessionStore((s) => s.setFinalUseEncryption);
  const [finalUseEncryption, setFinalUseEncryption] = useState(() => {
    // 统一读路径：优先使用 Store，其次使用请求偏好；不再从 storage 读取。
    if (typeof storeFinal === 'boolean') return storeFinal;
    const initial = !!requestedUseEncryption;
    try { setStoreFinal(initial); } catch (_e) { /* noop */ }
    return initial;
  });
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState(() =>
    requestedUseEncryption ? ENCRYPTION_STATUS.initializing : ENCRYPTION_STATUS.disabled,
  );

  // 将关键状态同步到全局会话 Store（渐进式统一）
  const setStoreReady = useChatSessionStore((s) => s.setEncryptionReady);
  const setStoreStatus = useChatSessionStore((s) => s.setEncryptionStatus);

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  // 当 Store 变化时，保持本地 state 同步（统一读路径）
  useEffect(() => {
    setFinalUseEncryption((prev) => (prev === storeFinal ? prev : !!storeFinal));
  }, [storeFinal]);

  // 当请求偏好变化时，作为“期望值”写入持久化与 Store（最终值仍以双方协商为准）
  useEffect(() => {
    // 持久化仅写入，不作为读源
    storage.setBool('useEncryption', !!requestedUseEncryption);
    setStoreFinal(!!requestedUseEncryption);
  }, [requestedUseEncryption]);

  const resetReadyFlag = useCallback(() => {
    readyFlagRef.current?.reset?.();
    setEncryptionReady(false);
    setStoreReady(false);
  }, []);

  const markEncryptionReady = useCallback(() => {
    storage.setItem(READY_FLAG, 'true');
    setEncryptionReady(true);
    setEncryptionStatus(ENCRYPTION_STATUS.ready);
    setStoreReady(true);
    setStoreStatus(ENCRYPTION_STATUS.ready);
    readyFlagRef.current?.markConfirmed?.();
  }, []);

  const sendEncryptionReadyConfirmation = useCallback(() => {
    const conn = connectionRef.current;
    if (!conn || !encryptionStateRef.current?.sharedSecret) {
      return;
    }
    // 使用本地 ref 做幂等控制，避免从 storage 读取
    if (!readyFlagRef.current?.shouldSend?.()) return;
    const sent = sendFn(conn, { type: 'encryption-ready' });
    if (sent) {
      readyFlagRef.current?.markSent?.();
    }
  }, [sendFn]);

  const sendEncryptionReadyResponse = useCallback(() => {
    const conn = connectionRef.current;
    if (!conn) {
      return;
    }
    sendFn(conn, {
      type: 'encryption-ready-response',
      timestamp: Date.now(),
    });
  }, [sendFn]);

  const initializeEncryption = useCallback(async () => {
    if (!finalUseEncryption || initializationStartedRef.current) {
      return;
    }
    initializationStartedRef.current = true;
    try {
  setEncryptionStatus(ENCRYPTION_STATUS.initializing);
  setStoreStatus(ENCRYPTION_STATUS.initializing);
      encryptionStateRef.current = new WebCryptoEncryption();
      const publicKeyBase64 = await encryptionStateRef.current.initialize();
      const message = encryptionStateRef.current.createKeyExchangeMessage(publicKeyBase64);
      const sent = sendFn(connectionRef.current, message);
      if (sent) {
        setEncryptionStatus(ENCRYPTION_STATUS.keyExchange);
        setStoreStatus(ENCRYPTION_STATUS.keyExchange);
      }
    } catch (error) {
      console.error('初始化加密失败:', error);
      setEncryptionStatus(ENCRYPTION_STATUS.failed);
      setStoreStatus(ENCRYPTION_STATUS.failed);
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
          encryptionStateRef.current = new WebCryptoEncryption();
          await encryptionStateRef.current.initialize();
        }
  setEncryptionStatus(ENCRYPTION_STATUS.keyExchange);
  setStoreStatus(ENCRYPTION_STATUS.keyExchange);
        await encryptionStateRef.current.processRemotePublicKey(payload.publicKey);
        if (!encryptionStateRef.current.sharedSecret) {
          throw new Error('共享密钥不存在');
        }
        if (!isInitiator) {
          const publicKeyBase64 = await encryptionStateRef.current.exportPublicKey();
          sendFn(connectionRef.current, {
            ...encryptionStateRef.current.createKeyExchangeMessage(publicKeyBase64),
          });
        }
        markEncryptionReady();
        sendEncryptionReadyConfirmation();
      } catch (error) {
        console.error('密钥交换失败:', error);
        setEncryptionStatus(ENCRYPTION_STATUS.failed);
        setStoreStatus(ENCRYPTION_STATUS.failed);
      }
    },
    [isInitiator, markEncryptionReady, sendEncryptionReadyConfirmation, sendFn],
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
          readyFlagRef.current?.markConfirmed?.();
          markEncryptionReady();
          sendEncryptionReadyResponse();
        }, 100);
        return true;
      }
      if (payload.type === 'encryption-ready-response') {
        readyFlagRef.current?.markConfirmed?.();
        markEncryptionReady();
        return true;
      }
      return false;
    },
    [handleKeyExchange, markEncryptionReady, sendEncryptionReadyResponse],
  );

  const sharedSecret = useMemo(
    () => encryptionStateRef.current?.sharedSecret || null,
    [encryptionReady],
  );

  const resetEncryption = useCallback(() => {
    initializationStartedRef.current = false;
    encryptionStateRef.current = null;
    resetReadyFlag();
    const status = finalUseEncryption ? ENCRYPTION_STATUS.waitingPeer : ENCRYPTION_STATUS.disabled;
    setEncryptionStatus(status);
    setStoreStatus(status);
  }, [finalUseEncryption, resetReadyFlag]);

  useEffect(() => {
    if (!connectionRef.current) {
      return;
    }

    if (!finalUseEncryption) {
      setEncryptionReady(false);
      readyFlagRef.current?.reset?.();
      setEncryptionStatus(ENCRYPTION_STATUS.disabled);
      setStoreReady(false);
      setStoreStatus(ENCRYPTION_STATUS.disabled);
      return;
    }

    if (isInitiator) {
      initializeEncryption();
    } else {
      setEncryptionStatus(ENCRYPTION_STATUS.waitingPeer);
      setStoreStatus(ENCRYPTION_STATUS.waitingPeer);
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
