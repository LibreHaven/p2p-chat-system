// 使用 Zustand 或 Redux Toolkit
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export const useAppStore = create(devtools((set, get) => ({
  // 应用状态
  screen: 'connection',
  peerId: '',
  targetId: '',
  connection: null,
  
  // 聊天状态
  activeChats: new Map(), // 支持多个聊天会话
  currentChatId: null,
  
  // 通话状态
  activeCall: null,
  callType: null, // 'voice' | 'video'
  
  // 群聊状态
  groups: new Map(),
  activeGroupId: null,
  
  // Actions
  setScreen: (screen) => set({ screen }),
  addChat: (chatId, chatData) => {
    const chats = new Map(get().activeChats)
    chats.set(chatId, chatData)
    set({ activeChats: chats })
  },
  // ... 其他 actions
})))