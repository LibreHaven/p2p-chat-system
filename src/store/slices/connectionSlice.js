// 连接状态管理 - 负责管理P2P连接和会话
import connectionService from '../../services/connectionService'

export const createConnectionSlice = (set, get) => ({
  // 连接状态
  connections: new Map(), // 所有连接的映射 { connectionId: connectionData }
  activeConnections: new Set(), // 活跃连接的ID集合
  incomingRequests: new Map(), // 待处理的连接请求
  currentConnectionId: null, // 当前聊天的连接ID
  
  // 连接配置
  useEncryption: true,
  connectionTimeout: 30000,
  
  // 连接状态
  connectionStatus: 'idle', // 'idle' | 'connecting' | 'connected' | 'failed'
  connectionError: null,
  
  // 连接Actions
  
  // 创建新连接
  createConnection: async (targetId, options = {}) => {
    const { peer, peerId } = get()
    
    if (!peer || !targetId) {
      get().showToast('无法创建连接：缺少必要参数')
      return null
    }
    
    if (targetId === peerId) {
      get().showToast('不能连接到自己')
      return null
    }
    
    // 检查是否已存在连接
    const existingConnection = Array.from(get().connections.values())
      .find(conn => conn.peerId === targetId && conn.status === 'connected')
    
    if (existingConnection) {
      get().showToast('已存在与该用户的连接')
      return existingConnection.id
    }
    
    set({ connectionStatus: 'connecting', connectionError: null })
    
    try {
      const connectionData = await connectionService.createConnection(peer, targetId, {
        useEncryption: get().useEncryption,
        timeout: get().connectionTimeout,
        ...options,
        
        onOpen: (conn) => {
          console.log('连接已建立:', conn.peer)
          
          const connectionId = `${peerId}-${targetId}-${Date.now()}`
          const connectionData = {
            id: connectionId,
            peerId: targetId,
            connection: conn,
            status: 'pending',
            createdAt: new Date(),
            lastActivity: new Date(),
            isInitiator: true,
            useEncryption: options.useEncryption !== undefined ? options.useEncryption : get().useEncryption
          }
          
          // 更新状态
          const connections = new Map(get().connections)
          const activeConnections = new Set(get().activeConnections)
          
          connections.set(connectionId, connectionData)
          activeConnections.add(connectionId)
          
          set({
            connections,
            activeConnections,
            currentConnectionId: connectionId,
            connectionStatus: 'connected'
          })
          
          // 发送连接请求消息
          const connectionRequest = {
            type: 'connection-request',
            peerId: get().peerId,
            useEncryption: connectionData.useEncryption,
            timestamp: Date.now()
          }
          console.log('发送连接请求消息:', connectionRequest)
          conn.send(JSON.stringify(connectionRequest))
          
          get().showToast('连接请求已发送，等待对方接受')
        },
        
        onError: (error) => {
          console.error('连接错误:', error)
          set({ 
            connectionStatus: 'failed',
            connectionError: error.message
          })
          get().showToast('连接失败：' + error.message)
        },
        
        onClose: () => {
          console.log('连接已关闭:', targetId)
          get().removeConnection(targetId)
        },
        
        onData: (data) => {
          // 解析消息
          let parsedData = data
          if (typeof data === 'string') {
            try {
              parsedData = JSON.parse(data)
            } catch (e) {
              console.warn('无法解析消息:', data)
              return
            }
          }
          
          // 处理连接协商消息
          if (parsedData.type === 'connection-accepted') {
            console.log('连接请求被接受')
            get().handleConnectionAccepted(targetId, parsedData)
          } else if (parsedData.type === 'connection-rejected') {
            console.log('连接请求被拒绝')
            get().handleConnectionRejected(targetId)
          } else {
            // 非连接协商消息转发给聊天处理
            get().handleIncomingMessage(targetId, data)
          }
        }
      })
      
      return connectionData.id
      
    } catch (error) {
      console.error('创建连接失败:', error)
      set({ 
        connectionStatus: 'failed',
        connectionError: error.message
      })
      get().showToast('创建连接失败')
      return null
    }
  },
  
  // 处理传入连接请求
  handleIncomingConnection: (conn) => {
    const requestId = `request-${conn.peer}-${Date.now()}`
    const requestData = {
      id: requestId,
      peerId: conn.peer,
      connection: conn,
      timestamp: new Date(),
      status: 'pending',
      useEncryption: get().useEncryption // 使用全局默认值，可在连接协商时更新
    }
    
    // 添加到待处理请求
    const incomingRequests = new Map(get().incomingRequests)
    incomingRequests.set(requestId, requestData)
    
    set({ incomingRequests })
    
    // 显示连接请求UI
    set({ showConnectionRequest: true, connectionRequestData: requestData })
    
    // 设置连接事件处理
    conn.on('open', () => {
      console.log('传入连接已建立:', conn.peer)
      
      const connectionId = `${get().peerId}-${conn.peer}-${Date.now()}`
      const connectionData = {
        id: connectionId,
        peerId: conn.peer,
        connection: conn,
        status: 'connected',
        createdAt: new Date(),
        lastActivity: new Date(),
        isInitiator: false,
        useEncryption: false // 默认非加密，等待连接协商消息
      }
      
      // 更新连接状态
      const connections = new Map(get().connections)
      const activeConnections = new Set(get().activeConnections)
      
      connections.set(connectionId, connectionData)
      activeConnections.add(connectionId)
      
      set({ connections, activeConnections })
    })
    
    conn.on('data', (data) => {
      // 解析消息
      let parsedData = data
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data)
        } catch (e) {
          console.warn('无法解析消息:', data)
          return
        }
      }
      
      // 处理连接协商消息
      if (parsedData.type === 'connection-request') {
        console.log('收到连接请求消息:', parsedData)
        // 更新请求数据中的加密设置
        get().updateConnectionRequestEncryption(conn.peer, parsedData.useEncryption)
        // 显示连接请求UI（如果还未显示）
        const request = Array.from(get().incomingRequests.values())
          .find(req => req.peerId === conn.peer)
        if (request) {
          console.log('显示连接请求UI:', request)
          set({ showConnectionRequest: true, connectionRequestData: request })
        }
      } else if (parsedData.type === 'connection-accepted') {
        console.log('连接请求被接受')
        // 处理连接接受消息
        get().handleConnectionAccepted(conn.peer, parsedData)
      } else if (parsedData.type === 'connection-rejected') {
        console.log('连接请求被拒绝')
        // 处理连接拒绝消息
        get().handleConnectionRejected(conn.peer)
      } else {
        // 非连接协商消息转发给聊天处理
        get().handleIncomingMessage(conn.peer, data)
      }
    })
    
    conn.on('close', () => {
      console.log('传入连接已关闭:', conn.peer)
      get().removeConnection(conn.peer)
    })
    
    conn.on('error', (error) => {
      console.error('传入连接错误:', error)
      get().rejectConnectionRequest(requestId)
    })
  },
  
  // 接受连接请求
  acceptConnectionRequest: (requestId) => {
    const { incomingRequests } = get()
    const request = incomingRequests.get(requestId)
    
    if (!request) {
      console.warn('连接请求不存在:', requestId)
      return
    }
    
    try {
      // 接受连接
      const conn = request.connection
      
      // 发送接受消息
      const acceptMessage = {
        type: 'connection-accepted',
        peerId: get().peerId,
        useEncryption: request.useEncryption ?? get().useEncryption,
        timestamp: Date.now()
      }
      console.log('发送连接接受消息:', acceptMessage)
      conn.send(JSON.stringify(acceptMessage))
      
      // 移除请求
      const updatedRequests = new Map(incomingRequests)
      updatedRequests.delete(requestId)
      set({ incomingRequests: updatedRequests })
      
      // 创建连接数据
      const connectionId = `${get().peerId}-${conn.peer}-${Date.now()}`
      const connectionData = {
        id: connectionId,
        peerId: conn.peer,
        connection: conn,
        status: 'connected',
        createdAt: new Date(),
        lastActivity: new Date(),
        isInitiator: false,
        useEncryption: request.useEncryption ?? get().useEncryption
      }
      
      // 更新状态
      const connections = new Map(get().connections)
      const activeConnections = new Set(get().activeConnections)
      
      connections.set(connectionId, connectionData)
      activeConnections.add(connectionId)
      
      set({
        connections,
        activeConnections,
        currentConnectionId: connectionId
      })
      
      // 初始化聊天会话
      get().initializeChat(connectionId, conn.peer)
      
      // 切换到聊天界面
      get().setScreen('chat', true, { connectionId, targetId: conn.peer })
      set({ showConnectionRequest: false, connectionRequestData: null })
      get().showToast('已接受连接请求')
      
    } catch (error) {
      console.error('接受连接请求失败:', error)
      get().showToast('接受连接失败')
    }
  },
  
  // 拒绝连接请求
  rejectConnectionRequest: (requestId) => {
    const { incomingRequests } = get()
    const request = incomingRequests.get(requestId)
    
    if (!request) {
      console.warn('连接请求不存在:', requestId)
      return
    }
    
    try {
      // 发送拒绝消息
      const conn = request.connection
      if (conn && !conn.destroyed) {
        const rejectMessage = {
          type: 'connection-rejected',
          peerId: get().peerId,
          timestamp: Date.now()
        }
        console.log('发送连接拒绝消息:', rejectMessage)
        conn.send(JSON.stringify(rejectMessage))
        
        // 关闭连接
        conn.close()
      }
      
      // 移除请求
      const updatedRequests = new Map(incomingRequests)
      updatedRequests.delete(requestId)
      set({ incomingRequests: updatedRequests })
      
      set({ showConnectionRequest: false, connectionRequestData: null })
      get().showToast('已拒绝连接请求')
      
    } catch (error) {
      console.error('拒绝连接请求失败:', error)
      get().showToast('拒绝连接失败')
    }
  },
  
  // 更新连接请求的加密设置
  updateConnectionRequestEncryption: (peerId, useEncryption) => {
    const { incomingRequests } = get()
    const requestEntry = Array.from(incomingRequests.entries())
      .find(([_, request]) => request.peerId === peerId)
    
    if (requestEntry) {
      const [requestId, requestData] = requestEntry
      const updatedRequests = new Map(incomingRequests)
      updatedRequests.set(requestId, {
        ...requestData,
        useEncryption
      })
      set({ incomingRequests: updatedRequests })
      console.log('已更新连接请求的加密设置:', peerId, useEncryption)
    }
  },

  // 移除连接
  removeConnection: (peerId) => {
    const { connections, activeConnections } = get()
    
    // 查找连接
    const connectionEntry = Array.from(connections.entries())
      .find(([_, conn]) => conn.peerId === peerId)
    
    if (connectionEntry) {
      const [connectionId, connectionData] = connectionEntry
      
      // 关闭连接
      try {
        if (connectionData.connection && !connectionData.connection.destroyed) {
          connectionData.connection.close()
        }
      } catch (error) {
        console.warn('关闭连接时出错:', error)
      }
      
      // 更新状态
      const updatedConnections = new Map(connections)
      const updatedActiveConnections = new Set(activeConnections)
      
      updatedConnections.delete(connectionId)
      updatedActiveConnections.delete(connectionId)
      
      set({
        connections: updatedConnections,
        activeConnections: updatedActiveConnections
      })
      
      // 如果是当前连接，切换到选择界面
      if (get().currentConnectionId === connectionId) {
        set({ currentConnectionId: null })
        get().setScreen('dashboard')
      }
    }
  },
  
  // 切换当前连接
  switchToConnection: (connectionId) => {
    const { connections } = get()
    
    if (connections.has(connectionId)) {
      set({ currentConnectionId: connectionId })
      get().setScreen('chat')
    }
  },
  
  // 获取连接信息
  getConnection: (connectionId) => {
    return get().connections.get(connectionId)
  },
  
  // 获取活跃连接列表
  getActiveConnections: () => {
    const { connections, activeConnections } = get()
    return Array.from(activeConnections)
      .map(id => connections.get(id))
      .filter(Boolean)
  },

  // 处理连接被接受的消息
  handleConnectionAccepted: (peerId, data) => {
    console.log('处理连接接受消息:', peerId, data)
    
    // 查找对应的连接
    const connections = get().connections
    const connectionEntry = Array.from(connections.entries())
      .find(([_, conn]) => conn.peerId === peerId)
    
    if (connectionEntry) {
      const [connectionId, connectionData] = connectionEntry
      
      // 更新连接状态
      const updatedConnections = new Map(connections)
      updatedConnections.set(connectionId, {
        ...connectionData,
        status: 'connected',
        useEncryption: data.useEncryption ?? connectionData.useEncryption
      })
      
      set({ 
        connections: updatedConnections,
        currentConnectionId: connectionId
      })
      
      // 初始化聊天会话
      get().initializeChat(connectionId, peerId)
      
      // 切换到聊天界面
      get().setScreen('chat')
      get().showToast('连接已建立')
    }
  },

  // 处理连接被拒绝的消息
  handleConnectionRejected: (peerId) => {
    console.log('处理连接拒绝消息:', peerId)
    
    // 移除连接
    get().removeConnection(peerId)
    
    // 显示提示
    get().showToast('连接请求被拒绝')
    
    // 切换到仪表板
    get().setScreen('dashboard')
  },
  
  // 清理所有连接
  clearAllConnections: () => {
    const { connections } = get()
    
    // 关闭所有连接
    connections.forEach((connectionData) => {
      try {
        if (connectionData.connection && !connectionData.connection.destroyed) {
          connectionData.connection.close()
        }
      } catch (error) {
        console.warn('关闭连接时出错:', error)
      }
    })
    
    // 清理状态
    set({
      connections: new Map(),
      activeConnections: new Set(),
      incomingRequests: new Map(),
      currentConnectionId: null,
      connectionStatus: 'idle',
      connectionError: null
    })
  }
});

// 将函数暴露到window对象，供useConnection使用
if (typeof window !== 'undefined') {
  window.updateConnectionRequestEncryption = null; // 将在store初始化时设置
}