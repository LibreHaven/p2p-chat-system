import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import storage from '../storage/session';

export const useChatSessionStore = create(
  devtools((set) => ({
    // 加密相关状态（优先统一）
    encryptionReady: false,
    encryptionStatus: '未启用加密',
    finalUseEncryption: false,
    // 发起方标记（统一来源，初始化读取持久化）
    isInitiator: storage.getBool('isInitiator', false),

    setEncryptionReady: (ready) => set({ encryptionReady: !!ready }),
    setEncryptionStatus: (status) => set({ encryptionStatus: status }),
    setFinalUseEncryption: (useEncryption) => set({ finalUseEncryption: !!useEncryption }),
  setIsInitiator: (flag) => set({ isInitiator: !!flag }),

    // 连接与重连状态（渐进迁移）
    connectionLost: false,
    reconnecting: false,
    reconnectAttempts: 0,

    setConnectionLost: (lost) => set({ connectionLost: !!lost }),
    setReconnecting: (flag) => set({ reconnecting: !!flag }),
    setReconnectAttempts: (n) => set({ reconnectAttempts: Number(n) || 0 }),
  })),
);

export default useChatSessionStore;
