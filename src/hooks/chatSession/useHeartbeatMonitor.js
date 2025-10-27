import { useCallback, useRef } from 'react';
import peerService from '../../services/peerService';
import { config } from '../../config';

const HEARTBEAT_INTERVAL = config?.peerConfig?.pingInterval ?? 10000;
const HEARTBEAT_TIMEOUT = config?.peerConfig?.heartbeatTimeout ?? 30000;

export default function useHeartbeatMonitor({ connectionRef, onTimeout, sendPayload }) {
  const heartbeatIntervalRef = useRef(null);
  const lastHeartbeatAtRef = useRef(Date.now());

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const sendHeartbeat = useCallback(() => {
    const connection = connectionRef.current;
    if (!connection) {
      return;
    }
    const payload = {
      type: 'heartbeat',
      timestamp: Date.now(),
    };
    if (typeof sendPayload === 'function') {
      sendPayload(connection, payload);
    } else {
      peerService.sendMessageSafely(connection, payload);
    }
  }, [connectionRef, sendPayload]);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    lastHeartbeatAtRef.current = Date.now();
    heartbeatIntervalRef.current = setInterval(() => {
      if (!connectionRef.current) {
        stopHeartbeat();
        return;
      }
      const delta = Date.now() - lastHeartbeatAtRef.current;
      if (delta > HEARTBEAT_TIMEOUT) {
        stopHeartbeat();
        onTimeout?.();
        return;
      }
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL);
  }, [connectionRef, onTimeout, sendHeartbeat, stopHeartbeat]);

  const markHeartbeat = useCallback(() => {
    lastHeartbeatAtRef.current = Date.now();
  }, []);

  return {
    startHeartbeat,
    stopHeartbeat,
    markHeartbeat,
  };
}
