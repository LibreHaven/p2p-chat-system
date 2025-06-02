// 聊天状态管理 - 负责管理消息、文件传输和聊天会话

import { encryptionService } from '../../services/encryptionService'

export const createChatSlice = (set, get) => ({
  // 聊天状态
  activeChats: new Map(), // { connectionId: chatData }
  currentChatId: null,
  messages: new Map(), // { connectionId: messages[] }
  
  // 消息状态
  messageHistory: new Map(), // 持久化消息历史
  unreadCounts: new Map(), // { connectionId: count }
  
  // 输入状态
  messageInput: '',
  isTyping: false,
  typingUsers: new Set(),
  
  // 文件传输状态
  fileTransfers: new Map(), // { transferId: transferData }
  activeTransfers: new Set(),
  
  // 加密状态
  encryptionKeys: new Map(), // { connectionId: keyData }
  encryptionReady: new Map(), // { connectionId: boolean }
  
  // 聊天设置
  chatSettings: {
    enableEncryption: true,
    enableFileTransfer: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    enableNotifications: true,
    enableTypingIndicator: true,
    messageRetention: 30 // 天数
  },

  // 初始化加密
  initializeEncryption: async (connectionId) => {
    try {
      console.log('初始化加密连接:', connectionId)
      
      // 创建加密状态
      const encryptionState = new encryptionService.EncryptionState()
      const publicKeyBase64 = await encryptionState.initialize()
      
      // 存储加密状态
      get().encryptionKeys.set(connectionId, {
        state: encryptionState,
        publicKey: publicKeyBase64,
        sharedSecret: null
      })
      
      // 发送公钥给对方
      const connection = get().getConnection(connectionId)
      if (connection && connection.connection) {
        const keyExchangeMessage = encryptionService.createKeyExchangeMessage(publicKeyBase64)
        connection.connection.send(keyExchangeMessage)
        console.log('已发送公钥交换消息')
      }
    } catch (error) {
      console.error('初始化加密失败:', error)
    }
  },

  // 加密消息
  encryptMessage: async (connectionId, content) => {
    try {
      const keyData = get().encryptionKeys.get(connectionId)
      if (!keyData || !keyData.state.isReady()) {
        throw new Error('加密密钥未就绪')
      }
      
      return await keyData.state.encryptMessage(content)
    } catch (error) {
      console.error('消息加密失败:', error)
      throw error
    }
  },

  // 解密消息
  decryptMessage: async (connectionId, encryptedContent) => {
    try {
      const keyData = get().encryptionKeys.get(connectionId)
      if (!keyData || !keyData.state.isReady()) {
        throw new Error('加密密钥未就绪')
      }
      
      return await keyData.state.decryptMessage(encryptedContent)
    } catch (error) {
      console.error('消息解密失败:', error)
      throw error
    }
  },

  // 处理加密消息
  handleEncryptionMessage: async (connectionId, data) => {
    try {
      console.log('处理加密消息:', data)
      
      // 处理密钥交换消息（支持不同的消息格式）
      if (data.type === 'key_exchange' || data.type === 'encryption-key' || data.publicKey) {
        const keyData = get().encryptionKeys.get(connectionId)
        if (!keyData) {
          console.error('未找到加密状态')
          return
        }
        
        // 获取公钥（支持不同的消息结构）
        const publicKey = data.publicKey || data.data?.publicKey
        if (!publicKey) {
          console.error('未找到公钥')
          return
        }
        
        // 处理远程公钥并计算共享密钥
        await keyData.state.processRemotePublicKey(publicKey)
        
        // 标记加密就绪
        get().encryptionReady.set(connectionId, true)
        console.log('加密握手完成，连接:', connectionId)
        
        get().showToast('端到端加密已启用', 'success')
      }
    } catch (error) {
      console.error('处理加密消息失败:', error)
      get().showToast('加密初始化失败', 'error')
    }
  },

  // 处理连接协商消息
  handleConnectionNegotiation: (connectionId, data) => {
    try {
      console.log('处理连接协商消息:', data)
      
      // 更新连接的加密设置
      const connections = new Map(get().connections)
      const connection = connections.get(connectionId)
      
      if (connection) {
        connection.useEncryption = data.useEncryption
        connections.set(connectionId, connection)
        
        // 更新store中的连接
        set({ connections })
        
        console.log(`连接 ${connectionId} 加密设置已更新为:`, data.useEncryption)
        
        // 如果启用加密，初始化加密
        if (data.useEncryption) {
          get().initializeEncryption(connectionId)
        } else {
          console.log('连接协商完成，使用非加密通信')
        }
      }
    } catch (error) {
      console.error('处理连接协商失败:', error)
    }
  },

  // 聊天Actions
  
  // 初始化聊天会话
  initializeChat: (connectionId, peerId) => {
    const { activeChats, messages } = get()
    
    if (!activeChats.has(connectionId)) {
      const chatData = {
        id: connectionId,
        peerId,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        nickname: peerId, // 默认使用peerId作为昵称
        avatar: null
      }
      
      const updatedChats = new Map(activeChats)
      const updatedMessages = new Map(messages)
      
      updatedChats.set(connectionId, chatData)
      updatedMessages.set(connectionId, [])
      
      set({
        activeChats: updatedChats,
        messages: updatedMessages,
        currentChatId: connectionId
      })
      
      // 根据连接的加密设置初始化加密
    const connection = get().connections?.get?.(connectionId)
    const shouldUseEncryption = connection?.useEncryption ?? get().chatSettings.enableEncryption
    
    if (shouldUseEncryption) {
      get().initializeEncryption(connectionId)
    } else {
      console.log('连接未启用加密，跳过加密初始化:', connectionId)
    }
    }
  },
  
  // 发送消息
  sendMessage: async (connectionId, content, type = 'text') => {
    const connection = get().getConnection(connectionId)
    
    if (!connection || !connection.connection) {
      get().showToast('连接不可用，无法发送消息')
      return false
    }
    
    try {
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const message = {
        id: messageId,
        type,
        content,
        senderId: get().peerId,
        timestamp: new Date(),
        status: 'sending',
        encrypted: false
      }
      
      // 加密消息（如果启用且就绪）
      let messageToSend = { ...message }
      const connection = get().connections?.get?.(connectionId)
      const shouldUseEncryption = connection?.useEncryption ?? get().chatSettings.enableEncryption
      
      if (shouldUseEncryption && get().encryptionReady.get(connectionId)) {
        try {
          messageToSend.content = await get().encryptMessage(connectionId, content)
          messageToSend.encrypted = true
        } catch (error) {
          console.warn('消息加密失败，发送明文:', error)
        }
      }
      
      // 添加到本地消息列表
      get().addMessage(connectionId, message)
      
      // 发送消息
      connection.connection.send({
        type: 'message',
        data: messageToSend
      })
      
      // 更新消息状态
      get().updateMessageStatus(connectionId, messageId, 'sent')
      
      // 更新聊天活动时间
      get().updateChatActivity(connectionId)
      
      return true
      
    } catch (error) {
      console.error('发送消息失败:', error)
      get().showToast('发送消息失败')
      return false
    }
  },
  
  // 处理接收到的消息
  handleIncomingMessage: async (peerId, data) => {
    try {
      // 查找对应的连接
      const connections = get().getActiveConnections()
      const connection = connections.find(conn => conn.peerId === peerId)
      
      if (!connection) {
        console.warn('收到未知连接的消息:', peerId)
        return
      }
      
      const connectionId = connection.id
      
      // 确保聊天会话已初始化
      if (!get().activeChats.has(connectionId)) {
        get().initializeChat(connectionId, peerId)
      }
      
      switch (data.type) {
        case 'message':
          await get().processIncomingMessage(connectionId, data.data)
          break
          
        case 'typing':
          get().handleTypingIndicator(connectionId, data.data)
          break
          
        case 'file':
          get().handleFileTransfer(connectionId, data.data)
          break
          
        case 'encryption':
        case 'encryption-key':
          get().handleEncryptionMessage(connectionId, data.data || data)
          break
          
        case 'connection-negotiation':
          get().handleConnectionNegotiation(connectionId, data)
          break
          
        default:
          console.warn('未知消息类型:', data.type)
      }
      
    } catch (error) {
      console.error('处理接收消息失败:', error)
    }
  },
  
  // 处理接收到的文本消息
  processIncomingMessage: async (connectionId, messageData) => {
    try {
      let content = messageData.content
      
      // 解密消息（如果需要且启用加密）
      const connection = get().connections?.get?.(connectionId)
      const shouldUseEncryption = connection?.useEncryption ?? get().chatSettings.enableEncryption
      
      if (messageData.encrypted && shouldUseEncryption && get().encryptionReady.get(connectionId)) {
        try {
          content = await get().decryptMessage(connectionId, content)
        } catch (error) {
          console.error('消息解密失败:', error)
          content = '[加密消息解密失败]'
        }
      }
      
      const message = {
        ...messageData,
        content,
        status: 'received'
      }
      
      // 添加到消息列表
      get().addMessage(connectionId, message)
      
      // 更新未读计数
      if (get().currentChatId !== connectionId) {
        get().incrementUnreadCount(connectionId)
      }
      
      // 更新聊天活动时间
      get().updateChatActivity(connectionId)
      
      // 显示通知（如果启用）
      if (get().chatSettings.enableNotifications) {
        get().showMessageNotification(connectionId, message)
      }
      
    } catch (error) {
      console.error('处理接收消息失败:', error)
    }
  },
  
  // 添加消息到列表
  addMessage: (connectionId, message) => {
    const messages = new Map(get().messages)
    const chatMessages = messages.get(connectionId) || []
    
    chatMessages.push(message)
    messages.set(connectionId, chatMessages)
    
    set({ messages })
    
    // 保存到历史记录
    get().saveMessageToHistory(connectionId, message)
  },
  
  // 更新消息状态
  updateMessageStatus: (connectionId, messageId, status) => {
    const messages = new Map(get().messages)
    const chatMessages = messages.get(connectionId) || []
    
    const messageIndex = chatMessages.findIndex(msg => msg.id === messageId)
    if (messageIndex !== -1) {
      chatMessages[messageIndex].status = status
      messages.set(connectionId, [...chatMessages])
      set({ messages })
    }
  },
  
  // 更新聊天活动时间
  updateChatActivity: (connectionId) => {
    const activeChats = new Map(get().activeChats)
    const chatData = activeChats.get(connectionId)
    
    if (chatData) {
      chatData.lastActivity = new Date()
      activeChats.set(connectionId, chatData)
      set({ activeChats })
    }
  },
  
  // 切换聊天会话
  switchToChat: (connectionId) => {
    set({ currentChatId: connectionId })
    
    // 清除未读计数
    get().clearUnreadCount(connectionId)
    
    // 更新UI
    get().setScreen('chat')
  },
  
  // 未读计数管理
  incrementUnreadCount: (connectionId) => {
    const unreadCounts = new Map(get().unreadCounts)
    const currentCount = unreadCounts.get(connectionId) || 0
    unreadCounts.set(connectionId, currentCount + 1)
    set({ unreadCounts })
  },
  
  clearUnreadCount: (connectionId) => {
    const unreadCounts = new Map(get().unreadCounts)
    unreadCounts.set(connectionId, 0)
    set({ unreadCounts })
  },
  
  // 获取总未读消息数
  getTotalUnreadCount: () => {
    const unreadCounts = get().unreadCounts
    let total = 0
    unreadCounts.forEach(count => {
      total += count
    })
    return total
  },
  
  // 输入状态管理
  setMessageInput: (input) => {
    set({ messageInput: input })
  },
  
  // 打字指示器
  sendTypingIndicator: (connectionId, isTyping) => {
    const connection = get().getConnection(connectionId)
    
    if (connection && connection.connection && get().chatSettings.enableTypingIndicator) {
      try {
        connection.connection.send({
          type: 'typing',
          data: { isTyping }
        })
      } catch (error) {
        console.warn('发送打字指示器失败:', error)
      }
    }
  },
  
  handleTypingIndicator: (connectionId, data) => {
    const typingUsers = new Set(get().typingUsers)
    
    if (data.isTyping) {
      typingUsers.add(connectionId)
    } else {
      typingUsers.delete(connectionId)
    }
    
    set({ typingUsers })
    
    // 自动清除打字状态
    if (data.isTyping) {
      setTimeout(() => {
        const currentTypingUsers = new Set(get().typingUsers)
        currentTypingUsers.delete(connectionId)
        set({ typingUsers: currentTypingUsers })
      }, 3000)
    }
  },
  
  // 文件传输
  sendFile: async (connectionId, file) => {
    if (!get().chatSettings.enableFileTransfer) {
      get().showToast('文件传输已禁用')
      return false
    }
    
    if (file.size > get().chatSettings.maxFileSize) {
      get().showToast('文件大小超过限制')
      return false
    }
    
    const connection = get().getConnection(connectionId)
    if (!connection || !connection.connection) {
      get().showToast('连接不可用，无法发送文件')
      return false
    }
    
    try {
      const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // 创建文件传输记录
      const transferData = {
        id: transferId,
        connectionId,
        file,
        type: 'outgoing',
        status: 'preparing',
        progress: 0,
        startTime: new Date()
      }
      
      const fileTransfers = new Map(get().fileTransfers)
      const activeTransfers = new Set(get().activeTransfers)
      
      fileTransfers.set(transferId, transferData)
      activeTransfers.add(transferId)
      
      set({ fileTransfers, activeTransfers })
      
      // 读取文件内容
      const fileContent = await get().readFileAsArrayBuffer(file)
      
      // 发送文件信息
      connection.connection.send({
        type: 'file',
        data: {
          transferId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          content: fileContent
        }
      })
      
      // 更新传输状态
      get().updateTransferStatus(transferId, 'completed', 100)
      
      return true
      
    } catch (error) {
      console.error('文件发送失败:', error)
      get().showToast('文件发送失败')
      return false
    }
  },
  
  // 处理文件传输
  handleFileTransfer: (connectionId, data) => {
    try {
      const transferId = data.transferId
      
      // 创建接收文件传输记录
      const transferData = {
        id: transferId,
        connectionId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        type: 'incoming',
        status: 'completed',
        progress: 100,
        startTime: new Date(),
        content: data.content
      }
      
      const fileTransfers = new Map(get().fileTransfers)
      fileTransfers.set(transferId, transferData)
      set({ fileTransfers })
      
      // 添加文件消息
      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'file',
        content: {
          transferId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType
        },
        senderId: get().getConnection(connectionId)?.peerId,
        timestamp: new Date(),
        status: 'received'
      }
      
      get().addMessage(connectionId, message)
      
    } catch (error) {
      console.error('处理文件传输失败:', error)
    }
  },
  
  // 下载文件
  downloadFile: (transferId) => {
    const transfer = get().fileTransfers.get(transferId)
    
    if (!transfer || !transfer.content) {
      get().showToast('文件不可用')
      return
    }
    
    try {
      const blob = new Blob([transfer.content], { type: transfer.fileType })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = transfer.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('下载文件失败:', error)
      get().showToast('下载文件失败')
    }
  },
  
  // 工具函数
  readFileAsArrayBuffer: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  },
  
  updateTransferStatus: (transferId, status, progress) => {
    const fileTransfers = new Map(get().fileTransfers)
    const transfer = fileTransfers.get(transferId)
    
    if (transfer) {
      transfer.status = status
      transfer.progress = progress
      fileTransfers.set(transferId, transfer)
      set({ fileTransfers })
    }
  },
  
  // 消息通知
  showMessageNotification: (connectionId, message) => {
    if (!('Notification' in window)) {
      return
    }
    
    if (Notification.permission === 'granted') {
      const chatData = get().activeChats.get(connectionId)
      const senderName = chatData?.nickname || message.senderId
      
      new Notification(`来自 ${senderName} 的消息`, {
        body: message.type === 'text' ? message.content : '[文件]',
        icon: '/favicon.ico'
      })
    }
  },
  
  // 清理聊天数据
  clearChat: (connectionId) => {
    const activeChats = new Map(get().activeChats)
    const messages = new Map(get().messages)
    const unreadCounts = new Map(get().unreadCounts)
    
    activeChats.delete(connectionId)
    messages.delete(connectionId)
    unreadCounts.delete(connectionId)
    
    set({ activeChats, messages, unreadCounts })
    
    // 如果是当前聊天，切换到仪表板
    if (get().currentChatId === connectionId) {
      set({ currentChatId: null })
      get().setScreen('dashboard')
    }
  },
  
  // 保存消息历史
  saveMessageToHistory: (connectionId, message) => {
    try {
      const messageHistory = new Map(get().messageHistory)
      const history = messageHistory.get(connectionId) || []
      
      history.push(message)
      
      // 限制历史记录数量
      const maxMessages = 1000
      if (history.length > maxMessages) {
        history.splice(0, history.length - maxMessages)
      }
      
      messageHistory.set(connectionId, history)
      set({ messageHistory })
      
      // 定期清理过期消息
      get().cleanupExpiredMessages()
      
    } catch (error) {
      console.warn('保存消息历史失败:', error)
    }
  },
  
  // 清理过期消息
  cleanupExpiredMessages: () => {
    const retentionDays = get().chatSettings.messageRetention
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    
    const messageHistory = new Map(get().messageHistory)
    
    messageHistory.forEach((messages, connectionId) => {
      const filteredMessages = messages.filter(msg => 
        new Date(msg.timestamp) > cutoffDate
      )
      messageHistory.set(connectionId, filteredMessages)
    })
    
    set({ messageHistory })
  },

  // 标记消息为已读
  markAsRead: (connectionId) => {
    if (!connectionId) return
    
    const unreadCounts = new Map(get().unreadCounts)
    unreadCounts.set(connectionId, 0)
    set({ unreadCounts })
    
    console.log('标记消息为已读:', connectionId)
  }
})