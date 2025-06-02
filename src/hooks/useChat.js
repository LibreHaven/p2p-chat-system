// useChat Hook - 管理聊天消息和会话
import { useCallback, useEffect, useRef } from 'react'
import { useAppStore, selectChatState, selectConnectionState } from '../store'

export const useChat = (connectionId = null) => {
  // 从store获取聊天相关状态
  const {
    activeChats,
    currentChatId,
    messages,
    messageInput,
    isTyping,
    typingUsers,
    fileTransfers,
    chatSettings,
    
    // Actions
    initializeChat,
    sendMessage,
    handleIncomingMessage,
    addMessage,
    switchToChat,
    setMessageInput,
    sendTypingIndicator,
    sendFile,
    downloadFile,
    clearChat,
    getTotalUnreadCount,
    markAsRead
  } = useAppStore(selectChatState)
  
  // 获取连接状态
  const { getConnection, currentConnectionId } = useAppStore(selectConnectionState)
  const showToast = useAppStore(state => state.showToast)
  
  // 使用传入的connectionId或当前连接ID
  const activeConnectionId = connectionId || currentConnectionId
  
  // 打字指示器定时器
  const typingTimeoutRef = useRef(null)
  const lastTypingTimeRef = useRef(0)
  
  // 获取当前聊天数据
  const getCurrentChat = useCallback(() => {
    if (!activeConnectionId) return null
    return activeChats.get(activeConnectionId)
  }, [activeChats, activeConnectionId])
  
  // 获取当前聊天消息
  const getCurrentMessages = useCallback(() => {
    if (!activeConnectionId) return []
    return messages.get(activeConnectionId) || []
  }, [messages, activeConnectionId])
  
  // 发送文本消息
  const sendTextMessage = useCallback(async (content) => {
    if (!activeConnectionId) {
      showToast('没有活跃的连接', 'warning')
      return false
    }
    
    if (!content || content.trim() === '') {
      showToast('消息内容不能为空', 'warning')
      return false
    }
    
    try {
      const success = await sendMessage(activeConnectionId, content.trim(), 'text')
      
      if (success) {
        // 清空输入框
        setMessageInput('')
        
        // 停止打字指示器
        stopTyping()
      }
      
      return success
      
    } catch (error) {
      console.error('发送消息失败:', error)
      showToast('发送消息失败', 'error')
      return false
    }
  }, [activeConnectionId, sendMessage, setMessageInput, showToast])
  
  // 发送文件消息
  const sendFileMessage = useCallback(async (file) => {
    if (!activeConnectionId) {
      showToast('没有活跃的连接', 'warning')
      return false
    }
    
    if (!file) {
      showToast('请选择文件', 'warning')
      return false
    }
    
    // 检查文件大小
    if (file.size > chatSettings.maxFileSize) {
      const maxSizeMB = Math.round(chatSettings.maxFileSize / (1024 * 1024))
      showToast(`文件大小不能超过 ${maxSizeMB}MB`, 'warning')
      return false
    }
    
    try {
      const success = await sendFile(activeConnectionId, file)
      
      if (success) {
        showToast('文件发送成功', 'success')
      }
      
      return success
      
    } catch (error) {
      console.error('发送文件失败:', error)
      showToast('发送文件失败', 'error')
      return false
    }
  }, [activeConnectionId, sendFile, chatSettings.maxFileSize, showToast])
  
  // 开始打字
  const startTyping = useCallback(() => {
    if (!activeConnectionId || !chatSettings.enableTypingIndicator) return
    
    const now = Date.now()
    lastTypingTimeRef.current = now
    
    // 发送打字指示器
    sendTypingIndicator(activeConnectionId, true)
    
    // 清除之前的定时器
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // 设置新的定时器，3秒后停止打字状态
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 3000)
  }, [activeConnectionId, sendTypingIndicator, chatSettings.enableTypingIndicator])
  
  // 停止打字
  const stopTyping = useCallback(() => {
    if (!activeConnectionId || !chatSettings.enableTypingIndicator) return
    
    // 清除定时器
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    
    // 发送停止打字指示器
    sendTypingIndicator(activeConnectionId, false)
  }, [activeConnectionId, sendTypingIndicator, chatSettings.enableTypingIndicator])
  
  // 处理输入变化
  const handleInputChange = useCallback((value) => {
    setMessageInput(value)
    
    // 如果有内容且启用了打字指示器，开始打字
    if (value.trim() && chatSettings.enableTypingIndicator) {
      const now = Date.now()
      
      // 如果距离上次发送打字指示器超过1秒，重新发送
      if (now - lastTypingTimeRef.current > 1000) {
        startTyping()
      }
    } else if (!value.trim()) {
      // 如果输入为空，停止打字
      stopTyping()
    }
  }, [setMessageInput, startTyping, stopTyping, chatSettings.enableTypingIndicator])
  
  // 切换到指定聊天
  const switchToChatById = useCallback((chatConnectionId) => {
    try {
      switchToChat(chatConnectionId)
      return true
    } catch (error) {
      console.error('切换聊天失败:', error)
      showToast('切换聊天失败', 'error')
      return false
    }
  }, [switchToChat, showToast])
  
  // 清理聊天数据
  const clearChatData = useCallback(() => {
    if (!activeConnectionId) return
    
    try {
      clearChat(activeConnectionId)
      showToast('聊天记录已清除', 'info')
    } catch (error) {
      console.error('清除聊天失败:', error)
      showToast('清除聊天失败', 'error')
    }
  }, [activeConnectionId, clearChat, showToast])
  
  // 下载文件
  const handleDownloadFile = useCallback((transferId) => {
    try {
      downloadFile(transferId)
    } catch (error) {
      console.error('下载文件失败:', error)
      showToast('下载文件失败', 'error')
    }
  }, [downloadFile, showToast])
  
  // 获取正在打字的用户
  const getTypingUsers = useCallback(() => {
    return Array.from(typingUsers)
      .filter(userId => userId !== activeConnectionId) // 排除自己
      .map(userId => {
        const chat = activeChats.get(userId)
        return chat ? chat.nickname || chat.peerId : userId
      })
  }, [typingUsers, activeConnectionId, activeChats])
  
  // 获取聊天统计信息
  const getChatStats = useCallback(() => {
    const currentMessages = getCurrentMessages()
    const currentChat = getCurrentChat()
    
    return {
      messageCount: currentMessages.length,
      lastActivity: currentChat?.lastActivity,
      createdAt: currentChat?.createdAt,
      isActive: currentChat?.isActive || false
    }
  }, [getCurrentMessages, getCurrentChat])
  
  // 检查是否可以发送消息
  const canSendMessage = useCallback(() => {
    if (!activeConnectionId) return false
    
    const connection = getConnection(activeConnectionId)
    return connection && connection.status === 'connected'
  }, [activeConnectionId, getConnection])
  
  // 初始化聊天（如果需要）
  useEffect(() => {
    if (activeConnectionId && !activeChats.has(activeConnectionId)) {
      const connection = getConnection(activeConnectionId)
      if (connection) {
        initializeChat(activeConnectionId, connection.peerId)
      }
    }
  }, [activeConnectionId, activeChats, getConnection, initializeChat])
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])
  
  // 当连接ID变化时停止打字
  useEffect(() => {
    stopTyping()
  }, [activeConnectionId, stopTyping])
  
  return {
    // 状态
    currentChat: getCurrentChat(),
    messages: getCurrentMessages(),
    messageInput,
    isTyping,
    typingUsers: getTypingUsers(),
    fileTransfers: Array.from(fileTransfers.values()),
    chatSettings,
    
    // 计算属性
    hasMessages: getCurrentMessages().length > 0,
    canSendMessage: canSendMessage(),
    isCurrentChat: currentChatId === activeConnectionId,
    chatStats: getChatStats(),
    
    // 方法
    sendTextMessage,
    sendFileMessage,
    handleInputChange,
    startTyping,
    stopTyping,
    switchToChatById,
    clearChatData,
    handleDownloadFile,
    markAsRead,
    
    // 原始store方法（高级用法）
    sendMessage,
    addMessage,
    initializeChat,
    getTotalUnreadCount
  }
}

export default useChat