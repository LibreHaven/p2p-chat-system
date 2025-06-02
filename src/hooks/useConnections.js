// useConnections Hook - 管理P2P连接
import { useCallback, useEffect } from 'react'
import { useAppStore, selectConnectionState, selectPeerState } from '../store'
import connectionService from '../services/connectionService'

export const useConnections = () => {
  // 从store获取连接相关状态
  const {
    connections,
    activeConnections,
    incomingRequests,
    currentConnectionId,
    connectionStatus,
    connectionError,
    useEncryption,
    
    // Actions
    createConnection,
    handleIncomingConnection,
    acceptConnectionRequest,
    rejectConnectionRequest,
    removeConnection,
    switchToConnection,
    getConnection,
    getActiveConnections,
    clearAllConnections
  } = useAppStore(selectConnectionState)
  
  // 获取Peer状态
  const { peer, peerId, isPeerCreated } = useAppStore(selectPeerState)
  const showToast = useAppStore(state => state.showToast)
  const setScreen = useAppStore(state => state.setScreen)
  
  // 连接到目标Peer
  const connectToPeer = useCallback(async (targetId, options = {}) => {
    if (!isPeerCreated || !peer) {
      showToast('请先创建Peer连接', 'warning')
      return null
    }
    
    if (!targetId || targetId.trim() === '') {
      showToast('请输入有效的目标ID', 'warning')
      return null
    }
    
    if (targetId === peerId) {
      showToast('不能连接到自己', 'warning')
      return null
    }
    
    try {
      const connectionId = await createConnection(targetId, {
        useEncryption,
        ...options
      })
      
      if (connectionId) {
        showToast('正在建立连接...', 'info')
        return connectionId
      }
      
      return null
      
    } catch (error) {
      console.error('连接失败:', error)
      showToast('连接失败：' + error.message, 'error')
      return null
    }
  }, [isPeerCreated, peer, peerId, createConnection, useEncryption, showToast])
  
  // 接受连接请求
  const acceptConnection = useCallback((requestId) => {
    try {
      acceptConnectionRequest(requestId)
      showToast('已接受连接请求', 'success')
    } catch (error) {
      console.error('接受连接失败:', error)
      showToast('接受连接失败', 'error')
    }
  }, [acceptConnectionRequest, showToast])
  
  // 拒绝连接请求
  const rejectConnection = useCallback((requestId) => {
    try {
      rejectConnectionRequest(requestId)
      showToast('已拒绝连接请求', 'info')
    } catch (error) {
      console.error('拒绝连接失败:', error)
      showToast('拒绝连接失败', 'error')
    }
  }, [rejectConnectionRequest, showToast])
  
  // 断开连接
  const disconnectFromPeer = useCallback((connectionId) => {
    try {
      removeConnection(connectionId)
      showToast('连接已断开', 'info')
    } catch (error) {
      console.error('断开连接失败:', error)
      showToast('断开连接失败', 'error')
    }
  }, [removeConnection, showToast])
  
  // 切换到指定连接的聊天
  const switchToChat = useCallback((connectionId) => {
    const connectionData = getConnection(connectionId)
    
    if (!connectionData) {
      showToast('连接不存在', 'warning')
      return false
    }
    
    if (connectionData.status !== 'connected') {
      showToast('连接未建立', 'warning')
      return false
    }
    
    try {
      switchToConnection(connectionId)
      return true
    } catch (error) {
      console.error('切换聊天失败:', error)
      showToast('切换聊天失败', 'error')
      return false
    }
  }, [getConnection, switchToConnection, showToast])
  
  // 获取连接列表
  const getConnectionList = useCallback(() => {
    return getActiveConnections().map(conn => ({
      id: conn.id,
      peerId: conn.peerId,
      status: conn.status,
      createdAt: conn.createdAt,
      lastActivity: conn.lastActivity,
      isInitiator: conn.isInitiator
    }))
  }, [getActiveConnections])
  
  // 获取待处理的连接请求列表
  const getPendingRequests = useCallback(() => {
    return Array.from(incomingRequests.values()).map(request => ({
      id: request.id,
      peerId: request.peerId,
      timestamp: request.timestamp,
      status: request.status
    }))
  }, [incomingRequests])
  
  // 检查是否有活跃连接
  const hasActiveConnections = useCallback(() => {
    return activeConnections.size > 0
  }, [activeConnections])
  
  // 检查是否有待处理请求
  const hasPendingRequests = useCallback(() => {
    return incomingRequests.size > 0
  }, [incomingRequests])
  
  // 获取当前连接信息
  const getCurrentConnection = useCallback(() => {
    if (!currentConnectionId) return null
    return getConnection(currentConnectionId)
  }, [currentConnectionId, getConnection])
  
  // 重新连接
  const reconnectToConnection = useCallback(async (connectionId) => {
    const connectionData = getConnection(connectionId)
    
    if (!connectionData) {
      showToast('连接不存在', 'warning')
      return false
    }
    
    try {
      // 先断开旧连接
      removeConnection(connectionId)
      
      // 重新建立连接
      const newConnectionId = await connectToPeer(connectionData.peerId)
      
      if (newConnectionId) {
        showToast('重新连接成功', 'success')
        return true
      }
      
      return false
      
    } catch (error) {
      console.error('重新连接失败:', error)
      showToast('重新连接失败', 'error')
      return false
    }
  }, [getConnection, removeConnection, connectToPeer, showToast])
  
  // 检查连接是否活跃
  const isConnectionActive = useCallback((connectionId) => {
    return connectionService.isConnectionActive(connectionId)
  }, [])

  // 获取连接统计信息
  const getConnectionStats = useCallback(() => {
    return connectionService.getStats()
  }, [])

  // 清理资源
  const cleanup = useCallback(() => {
    connectionService.cleanup()
    clearAllConnections()
  }, [clearAllConnections])
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 组件卸载时不自动清理，让用户手动控制
    }
  }, [])
  
  return {
    // 状态
    connections: Array.from(connections.values()),
    activeConnections: Array.from(activeConnections),
    incomingRequests: Array.from(incomingRequests.values()),
    currentConnectionId,
    connectionStatus,
    connectionError,
    useEncryption,
    
    // 计算属性
    isConnecting: connectionStatus === 'connecting',
    isConnected: connectionStatus === 'connected',
    hasError: !!connectionError,
    hasActiveConnections: hasActiveConnections(),
    hasPendingRequests: hasPendingRequests(),
    connectionCount: activeConnections.size,
    pendingCount: incomingRequests.size,
    
    // 方法
    connectToPeer,
    acceptConnection,
    rejectConnection,
    isConnectionActive,
    disconnectFromPeer,
    switchToChat,
    reconnectToConnection,
    getConnectionList,
    getPendingRequests,
    getCurrentConnection,
    getConnectionStats,
    cleanup,
    
    // 原始store方法（高级用法）
    getConnection,
    removeConnection,
    switchToConnection
  }
}

export default useConnections