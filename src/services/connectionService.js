// 连接服务 - 管理P2P连接的建立和维护

class ConnectionService {
  constructor() {
    this.connections = new Map()
    this.connectionTimeouts = new Map()
    this.retryAttempts = new Map()
    this.maxRetries = 3
    this.connectionTimeout = 30000 // 30秒
  }
  
  // 创建连接
  async createConnection(peer, targetId, options = {}) {
    if (!peer || !targetId) {
      throw new Error('缺少必要参数')
    }
    
    const connectionId = `${peer.id}-${targetId}-${Date.now()}`
    
    try {
      // 创建连接
      const conn = peer.connect(targetId, {
        reliable: true,
        serialization: 'json',
        ...options.connectionOptions
      })
      
      // 设置连接超时
      const timeoutId = setTimeout(() => {
        if (!conn.open) {
          conn.close()
          if (options.onError) {
            options.onError(new Error('连接超时'))
          }
        }
      }, options.timeout || this.connectionTimeout)
      
      this.connectionTimeouts.set(connectionId, timeoutId)
      
      // 设置连接事件处理
      this.setupConnectionEvents(conn, connectionId, options)
      
      // 保存连接信息
      this.connections.set(connectionId, {
        id: connectionId,
        connection: conn,
        targetId,
        status: 'connecting',
        createdAt: new Date(),
        options
      })
      
      return {
        id: connectionId,
        connection: conn
      }
      
    } catch (error) {
      console.error('创建连接失败:', error)
      throw error
    }
  }
  
  // 设置连接事件处理
  setupConnectionEvents(conn, connectionId, options) {
    // 连接打开事件
    conn.on('open', () => {
      console.log('连接已建立:', conn.peer)
      
      // 清除超时
      const timeoutId = this.connectionTimeouts.get(connectionId)
      if (timeoutId) {
        clearTimeout(timeoutId)
        this.connectionTimeouts.delete(connectionId)
      }
      
      // 更新连接状态
      const connectionData = this.connections.get(connectionId)
      if (connectionData) {
        connectionData.status = 'connected'
        connectionData.connectedAt = new Date()
      }
      
      // 清除重试计数
      this.retryAttempts.delete(connectionId)
      
      if (options.onOpen) {
        options.onOpen(conn)
      }
    })
    
    // 数据接收事件
    conn.on('data', (data) => {
      console.log('收到数据:', data)
      
      // 更新最后活动时间
      const connectionData = this.connections.get(connectionId)
      if (connectionData) {
        connectionData.lastActivity = new Date()
      }
      
      if (options.onData) {
        options.onData(data)
      }
    })
    
    // 连接错误事件
    conn.on('error', (error) => {
      console.error('连接错误:', error)
      
      // 清除超时
      const timeoutId = this.connectionTimeouts.get(connectionId)
      if (timeoutId) {
        clearTimeout(timeoutId)
        this.connectionTimeouts.delete(connectionId)
      }
      
      // 更新连接状态
      const connectionData = this.connections.get(connectionId)
      if (connectionData) {
        connectionData.status = 'error'
        connectionData.error = error
      }
      
      // 尝试重连
      this.handleConnectionError(connectionId, error, options)
    })
    
    // 连接关闭事件
    conn.on('close', () => {
      console.log('连接已关闭:', conn.peer)
      
      // 清除超时
      const timeoutId = this.connectionTimeouts.get(connectionId)
      if (timeoutId) {
        clearTimeout(timeoutId)
        this.connectionTimeouts.delete(connectionId)
      }
      
      // 更新连接状态
      const connectionData = this.connections.get(connectionId)
      if (connectionData) {
        connectionData.status = 'closed'
        connectionData.closedAt = new Date()
      }
      
      if (options.onClose) {
        options.onClose()
      }
    })
  }
  
  // 检查是否为不可恢复的错误
  isUnrecoverableError(error) {
    if (!error) return false
    
    const unrecoverableMessages = [
      'peer-unavailable',
      'invalid-id',
      'invalid-key',
      'ssl-unavailable'
    ]
    
    return unrecoverableMessages.some(msg => 
      error.message && error.message.includes(msg)
    )
  }

  // 处理连接错误
  handleConnectionError(connectionId, error, options) {
    // 检查是否为不可恢复的错误
    if (this.isUnrecoverableError(error)) {
      console.error('不可恢复的连接错误:', error)
      this.retryAttempts.delete(connectionId)
      if (options.onError) {
        options.onError(error)
      }
      return
    }
    
    const retryCount = this.retryAttempts.get(connectionId) || 0
    
    if (retryCount < this.maxRetries) {
      console.log(`连接失败，尝试重连 (${retryCount + 1}/${this.maxRetries})`)
      
      this.retryAttempts.set(connectionId, retryCount + 1)
      
      // 延迟重连
      setTimeout(() => {
        this.retryConnection(connectionId, options)
      }, 1000 * (retryCount + 1)) // 递增延迟
      
    } else {
      console.error('连接重试次数已达上限')
      this.retryAttempts.delete(connectionId)
      
      if (options.onError) {
        options.onError(error)
      }
    }
  }
  
  // 重试连接
  async retryConnection(connectionId, options) {
    const connectionData = this.connections.get(connectionId)
    
    if (!connectionData) {
      console.warn('连接数据不存在，无法重试')
      return
    }
    
    try {
      // 关闭旧连接
      if (connectionData.connection && !connectionData.connection.destroyed) {
        connectionData.connection.close()
      }
      
      // 创建新连接（需要从外部传入peer实例）
      if (options.peer) {
        const newConn = options.peer.connect(connectionData.targetId, {
          reliable: true,
          serialization: 'json',
          ...options.connectionOptions
        })
        
        // 更新连接
        connectionData.connection = newConn
        connectionData.status = 'connecting'
        
        // 重新设置事件处理
        this.setupConnectionEvents(newConn, connectionId, options)
      }
      
    } catch (error) {
      console.error('重试连接失败:', error)
      this.handleConnectionError(connectionId, error, options)
    }
  }
  
  // 发送数据
  sendData(connectionId, data) {
    const connectionData = this.connections.get(connectionId)
    
    if (!connectionData) {
      throw new Error('连接不存在')
    }
    
    const conn = connectionData.connection
    
    if (!conn || !conn.open) {
      throw new Error('连接未打开')
    }
    
    try {
      conn.send(data)
      
      // 更新最后活动时间
      connectionData.lastActivity = new Date()
      
      return true
    } catch (error) {
      console.error('发送数据失败:', error)
      throw error
    }
  }
  
  // 关闭连接
  closeConnection(connectionId) {
    const connectionData = this.connections.get(connectionId)
    
    if (!connectionData) {
      console.warn('连接不存在:', connectionId)
      return false
    }
    
    try {
      // 清除超时
      const timeoutId = this.connectionTimeouts.get(connectionId)
      if (timeoutId) {
        clearTimeout(timeoutId)
        this.connectionTimeouts.delete(connectionId)
      }
      
      // 关闭连接
      const conn = connectionData.connection
      if (conn && !conn.destroyed) {
        conn.close()
      }
      
      // 清理数据
      this.connections.delete(connectionId)
      this.retryAttempts.delete(connectionId)
      
      return true
      
    } catch (error) {
      console.error('关闭连接失败:', error)
      return false
    }
  }
  
  // 获取连接信息
  getConnection(connectionId) {
    return this.connections.get(connectionId)
  }
  
  // 获取所有连接
  getAllConnections() {
    return Array.from(this.connections.values())
  }
  
  // 获取活跃连接
  getActiveConnections() {
    return this.getAllConnections().filter(conn => 
      conn.status === 'connected' && 
      conn.connection && 
      conn.connection.open
    )
  }
  
  // 检查连接状态
  isConnectionActive(connectionId) {
    const connectionData = this.connections.get(connectionId)
    
    return connectionData && 
           connectionData.status === 'connected' && 
           connectionData.connection && 
           connectionData.connection.open
  }
  
  // 清理所有连接
  cleanup() {
    // 清除所有超时
    this.connectionTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    this.connectionTimeouts.clear()
    
    // 关闭所有连接
    this.connections.forEach((connectionData, connectionId) => {
      try {
        if (connectionData.connection && !connectionData.connection.destroyed) {
          connectionData.connection.close()
        }
      } catch (error) {
        console.warn('清理连接时出错:', error)
      }
    })
    
    // 清理数据
    this.connections.clear()
    this.retryAttempts.clear()
  }
  
  // 获取连接统计信息
  getStats() {
    const connections = this.getAllConnections()
    const activeConnections = this.getActiveConnections()
    
    return {
      total: connections.length,
      active: activeConnections.length,
      connecting: connections.filter(conn => conn.status === 'connecting').length,
      error: connections.filter(conn => conn.status === 'error').length,
      closed: connections.filter(conn => conn.status === 'closed').length
    }
  }
  
  // 心跳检测
  startHeartbeat(connectionId, interval = 30000) {
    const connectionData = this.connections.get(connectionId)
    
    if (!connectionData) {
      return
    }
    
    const heartbeatInterval = setInterval(() => {
      if (this.isConnectionActive(connectionId)) {
        try {
          this.sendData(connectionId, {
            type: 'heartbeat',
            timestamp: Date.now()
          })
        } catch (error) {
          console.warn('心跳发送失败:', error)
          clearInterval(heartbeatInterval)
        }
      } else {
        clearInterval(heartbeatInterval)
      }
    }, interval)
    
    // 保存心跳定时器
    connectionData.heartbeatInterval = heartbeatInterval
  }
  
  // 停止心跳
  stopHeartbeat(connectionId) {
    const connectionData = this.connections.get(connectionId)
    
    if (connectionData && connectionData.heartbeatInterval) {
      clearInterval(connectionData.heartbeatInterval)
      delete connectionData.heartbeatInterval
    }
  }
}

// 创建单例实例
const connectionService = new ConnectionService()

export default connectionService