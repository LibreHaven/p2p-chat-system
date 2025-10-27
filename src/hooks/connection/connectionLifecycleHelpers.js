import { MessageTypes } from '../../shared/messages/envelope';

// Small, pure helpers to make useConnection lifecycle logic testable without React

export function handleReceivedConnectionData(ctx, data) {
  // ctx: {
  //   setIncomingConnection, setIncomingPeerId, setIncomingUseEncryption,
  //   setShowConnectionRequest, setWaitingForAcceptance, setConnectionStatus,
  //   storage, setStoreFinalUseEncryption, onConnectionSuccess, activeConnection,
  //   targetId, displayToast
  // }
  const {
    setIncomingConnection,
    setIncomingPeerId,
    setIncomingUseEncryption,
    setShowConnectionRequest,
    setWaitingForAcceptance,
    setConnectionStatus,
    storage,
    setStoreFinalUseEncryption,
    onConnectionSuccess,
    activeConnection,
    targetId,
    displayToast,
  } = ctx;

  const isString = typeof data === 'string';
  let parsed = data;
  if (isString) {
    try {
      parsed = JSON.parse(data);
    } catch (_e) {
      // not connection related; ignore at this layer
      return { handled: false };
    }
  }

  switch (parsed?.type) {
    case MessageTypes.ConnectionRequest: {
      const receivedEncryption = parsed.useEncryption !== undefined ? parsed.useEncryption : false;
      setIncomingConnection?.(activeConnection);
      setIncomingPeerId?.(parsed.peerId);
      setIncomingUseEncryption?.(receivedEncryption);
      setShowConnectionRequest?.(true);
      return { handled: true, kind: 'request' };
    }
    case MessageTypes.ConnectionAccepted: {
      setWaitingForAcceptance?.(false);
      setConnectionStatus?.('connected');
      const finalUseEncryption = !!parsed.useEncryption;
      storage?.setBool?.('useEncryption', finalUseEncryption);
      setStoreFinalUseEncryption?.(finalUseEncryption);
      onConnectionSuccess?.(activeConnection, targetId, finalUseEncryption);
      return { handled: true, kind: 'accepted' };
    }
    case MessageTypes.ConnectionRejected: {
      setWaitingForAcceptance?.(false);
      setConnectionStatus?.('failed');
      displayToast?.('连接请求被拒绝');
      return { handled: true, kind: 'rejected' };
    }
    default:
      return { handled: false };
  }
}

export function scheduleAcceptanceTimeout(ctx, isWaitingFn, timeoutMs = 30000) {
  // ctx: { setWaitingForAcceptance, setConnectionStatus, displayToast }
  const { setWaitingForAcceptance, setConnectionStatus, displayToast } = ctx;
  const id = setTimeout(() => {
    try {
      if (isWaitingFn?.()) {
        setWaitingForAcceptance?.(false);
        setConnectionStatus?.('failed');
        displayToast?.('连接请求超时，请重试');
      }
    } catch (_e) {
      // swallow
    }
  }, timeoutMs);
  return id;
}

export function onRemoteClose(ctx) {
  const { setConnectionStatus, setWaitingForAcceptance } = ctx;
  setConnectionStatus?.('disconnected');
  setWaitingForAcceptance?.(false);
}

export function onRemoteError(ctx) {
  const { setConnectionStatus, setWaitingForAcceptance, displayToast } = ctx;
  setConnectionStatus?.('failed');
  setWaitingForAcceptance?.(false);
  displayToast?.('连接出现错误');
}
