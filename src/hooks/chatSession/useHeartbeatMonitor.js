import { useCallback, useRef } from 'react';
import peerService from '../../services/peerService';

const HEARTBEAT_INTERVAL = 10000;
const HEARTBEAT_TIMEOUT = 30000;

export default function useHeartbeatMonitor({ connectionRef, onTimeout }) {
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
    peerService.sendMessageSafely(connection, {
      type: 'heartbeat',
      timestamp: Date.now(),
    });
  }, [connectionRef]);

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
