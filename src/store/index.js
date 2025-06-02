// 使用 Zustand 或 Redux Toolkit
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { createPeerSlice } from './slices/peerSlice'
import { createConnectionSlice } from './slices/connectionSlice'
import { createUISlice } from './slices/uiSlice'
import { createChatSlice } from './slices/chatSlice'

// 主应用状态管理
export const useAppStore = create(
  devtools(
    subscribeWithSelector(
      (...args) => ({
        // 合并所有slice
        ...createPeerSlice(...args),
        ...createConnectionSlice(...args),
        ...createUISlice(...args),
        ...createChatSlice(...args),
      })
    ),
    {
      name: 'p2p-chat-store',
    }
  )
)

// 将connectionSlice的函数暴露到window对象
if (typeof window !== 'undefined') {
  window.updateConnectionRequestEncryption = (peerId, useEncryption) => {
    useAppStore.getState().updateConnectionRequestEncryption(peerId, useEncryption);
  };
}

// 选择器函数 - 用于组件中获取特定状态
// 使用缓存避免每次返回新对象
let cachedPeerState = null
let lastPeerStateValues = null

export const selectPeerState = (state) => {
  const currentValues = {
    peer: state.peer,
    peerId: state.peerId,
    isPeerCreated: state.isPeerCreated,
    peerStatus: state.peerStatus,
    peerError: state.peerError,
    customIdError: state.customIdError,
    setPeerId: state.setPeerId,
    validatePeerId: state.validatePeerId,
    generateRandomId: state.generateRandomId,
    createPeer: state.createPeer,
    destroyPeer: state.destroyPeer,
    resetPeerState: state.resetPeerState,
    restorePeerFromSession: state.restorePeerFromSession
  }
  
  // Compare only serializable properties to avoid circular reference issues
  const serializableValues = {
    peerId: state.peerId,
    isPeerCreated: state.isPeerCreated,
    peerStatus: state.peerStatus,
    peerError: state.peerError,
    customIdError: state.customIdError
  }
  
  if (!lastPeerStateValues || JSON.stringify(serializableValues) !== JSON.stringify(lastPeerStateValues)) {
    lastPeerStateValues = serializableValues
    cachedPeerState = currentValues
  }
  
  return cachedPeerState
}

let cachedConnectionState = null
let lastConnectionStateValues = null

export const selectConnectionState = (state) => {
  const currentValues = {
    connections: state.connections,
    activeConnections: state.activeConnections,
    incomingRequests: state.incomingRequests,
    currentConnectionId: state.currentConnectionId,
    connectionStatus: state.connectionStatus,
    connectionError: state.connectionError,
    useEncryption: state.useEncryption,
    createConnection: state.createConnection,
    addConnection: state.addConnection,
    updateConnection: state.updateConnection,
    acceptConnectionRequest: state.acceptConnectionRequest,
    rejectConnectionRequest: state.rejectConnectionRequest,
    removeConnection: state.removeConnection,
    switchToConnection: state.switchToConnection,
    getConnection: state.getConnection,
    getActiveConnections: state.getActiveConnections,
    clearAllConnections: state.clearAllConnections
  }
  
  // Compare only serializable properties to avoid circular reference issues
  const serializableValues = {
    connections: state.connections,
    activeConnections: state.activeConnections,
    incomingRequests: state.incomingRequests,
    currentConnectionId: state.currentConnectionId,
    connectionStatus: state.connectionStatus,
    connectionError: state.connectionError,
    useEncryption: state.useEncryption
  }
  
  if (!lastConnectionStateValues || JSON.stringify(serializableValues) !== JSON.stringify(lastConnectionStateValues)) {
    lastConnectionStateValues = serializableValues
    cachedConnectionState = currentValues
  }
  
  return cachedConnectionState
}

let cachedUIState = null
let lastUIStateValues = null

export const selectUIState = (state) => {
  // 只包含可序列化的状态数据，用于比较
  // 排除包含循环引用的connectionRequestData
  const serializableValues = {
    screen: state.screen,
    previousScreen: state.previousScreen,
    screenParams: state.screenParams,
    showConnectionRequest: state.showConnectionRequest,
    // connectionRequestData包含connection对象，有循环引用，不参与序列化比较
    connectionRequestDataId: state.connectionRequestData?.id || null,
    isToastVisible: state.isToastVisible,
    toastMessage: state.toastMessage,
    toastType: state.toastType,
    isLoading: state.isLoading,
    loadingMessage: state.loadingMessage,
    showSettingsModal: state.showSettingsModal,
    showAboutModal: state.showAboutModal,
    showConfirmModal: state.showConfirmModal,
    confirmModalData: state.confirmModalData,
    sidebarCollapsed: state.sidebarCollapsed,
    theme: state.theme,
    language: state.language
  }
  
  // 完整的返回值，包含Actions
  const currentValues = {
    ...serializableValues,
    // 恢复完整的connectionRequestData供组件使用
    connectionRequestData: state.connectionRequestData,
    
    // Actions
    setScreen: state.setScreen,
    navigateTo: state.navigateTo,
    goBack: state.goBack,
    showToast: state.showToast,
    hideToast: state.hideToast,
    showConnectionRequest: state.showConnectionRequest,
    hideConnectionRequest: state.hideConnectionRequest,
    setLoading: state.setLoading,
    showConfirmModal: state.showConfirmModal,
    hideConfirmModal: state.hideConfirmModal,
    toggleSettingsModal: state.toggleSettingsModal,
    toggleAboutModal: state.toggleAboutModal,
    toggleSidebar: state.toggleSidebar,
    setSidebarCollapsed: state.setSidebarCollapsed,
    setTheme: state.setTheme,
    toggleTheme: state.toggleTheme,
    setLanguage: state.setLanguage,
    initializeUISettings: state.initializeUISettings,
    resetUIState: state.resetUIState,
    handleError: state.handleError,
    clearError: state.clearError
  }
  
  // 只比较可序列化的值，避免循环引用
  if (!lastUIStateValues || JSON.stringify(serializableValues) !== JSON.stringify(lastUIStateValues)) {
    lastUIStateValues = serializableValues
    cachedUIState = currentValues
  }
  
  return cachedUIState
}

let cachedChatState = null
let lastChatStateValues = null

export const selectChatState = (state) => {
  const currentValues = {
    activeChats: state.activeChats,
    currentChatId: state.currentChatId,
    messages: state.messages,
    messageHistory: state.messageHistory,
    unreadCounts: state.unreadCounts,
    messageInput: state.messageInput,
    isTyping: state.isTyping,
    typingUsers: state.typingUsers,
    fileTransfers: state.fileTransfers,
    activeTransfers: state.activeTransfers,
    encryptionKeys: state.encryptionKeys,
    encryptionReady: state.encryptionReady,
    chatSettings: state.chatSettings,
    
    // Actions
     initializeChat: state.initializeChat,
     sendMessage: state.sendMessage,
     handleIncomingMessage: state.handleIncomingMessage,
     addMessage: state.addMessage,
     switchToChat: state.switchToChat,
     setMessageInput: state.setMessageInput,
     sendTypingIndicator: state.sendTypingIndicator,
     sendFile: state.sendFile,
     downloadFile: state.downloadFile,
     clearChat: state.clearChat,
     getTotalUnreadCount: state.getTotalUnreadCount
  }
  
  // Compare only serializable properties to avoid circular reference issues
  const serializableValues = {
    currentChatId: state.currentChatId,
    messageInput: state.messageInput,
    isTyping: state.isTyping,
    chatSettings: state.chatSettings
  }
  
  if (!lastChatStateValues || JSON.stringify(serializableValues) !== JSON.stringify(lastChatStateValues)) {
    lastChatStateValues = serializableValues
    cachedChatState = currentValues
  }
  
  return cachedChatState
}