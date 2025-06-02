// usePeer Hook - 管理Peer连接和状态
import { useEffect, useCallback, useMemo } from 'react'
import { useAppStore, selectPeerState } from '../store'
import peerService from '../services/peerService'

export const usePeer = () => {
  // 从store获取peer相关状态
  const {
    peerId,
    peer,
    isPeerCreated,
    peerStatus,
    peerError,
    customIdError,
    
    // Actions
    setPeerId,
    validatePeerId,
    generateRandomId,
    createPeer,
    destroyPeer,
    resetPeerState,
    restorePeerFromSession
  } = useAppStore(selectPeerState)
  
  const showToast = useAppStore(state => state.showToast)
  const handleIncomingConnection = useAppStore(state => state.handleIncomingConnection)
  
  // 初始化Peer
  const initializePeer = useCallback(async (customId = null) => {
    try {
      const success = await createPeer(customId)
      return success
    } catch (error) {
      console.error('初始化Peer失败:', error)
      showToast('初始化失败，请重试', 'error')
      return false
    }
  }, [createPeer, showToast])
  
  // 生成并设置随机ID
  const generateAndSetRandomId = useCallback(() => {
    const randomId = generateRandomId()
    setPeerId(randomId)
    return randomId
  }, [generateRandomId, setPeerId])
  
  // 验证并设置PeerID
  const validateAndSetPeerId = useCallback((id) => {
    const isValid = validatePeerId(id)
    if (isValid) {
      setPeerId(id)
    }
    return isValid
  }, [validatePeerId, setPeerId])
  
  // 重新连接Peer
  const reconnectPeer = useCallback(async () => {
    if (peer && !isPeerCreated) {
      try {
        await peerService.reconnect()
        showToast('重新连接成功')
        return true
      } catch (error) {
        console.error('重新连接失败:', error)
        showToast('重新连接失败', 'error')
        return false
      }
    }
    return false
  }, [peer, isPeerCreated, showToast])
  
  // 获取Peer状态信息
  const getPeerInfo = useCallback(() => {
    return {
      peerId,
      isPeerCreated,
      peerStatus,
      isConnected: peerStatus === 'connected',
      hasError: !!peerError,
      errorMessage: peerError || customIdError
    }
  }, [peerId, isPeerCreated, peerStatus, peerError, customIdError])
  
  // 检查Peer是否可用
  const isPeerAvailable = useCallback(() => {
    return isPeerCreated && peerStatus === 'connected' && peer && !peer.destroyed
  }, [isPeerCreated, peerStatus, peer])
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 组件卸载时不自动销毁Peer，让用户手动控制
    }
  }, [])
  
  // 页面刷新时恢复状态
  useEffect(() => {
    const savedPeerId = restorePeerFromSession()
    if (savedPeerId && !isPeerCreated) {
      // 可以选择自动重新创建Peer或让用户手动操作
      console.log('检测到保存的PeerID:', savedPeerId)
    }
  }, [restorePeerFromSession, isPeerCreated])
  
  return useMemo(() => ({
    // 状态
    peerId,
    peer,
    isPeerCreated,
    peerStatus,
    peerError,
    customIdError,
    
    // 计算属性
    isConnected: peerStatus === 'connected',
    isConnecting: peerStatus === 'creating',
    hasError: !!peerError || !!customIdError,
    isAvailable: isPeerAvailable(),
    
    // 方法
    setPeerId,
    validatePeerId,
    generateRandomId,
    generateAndSetRandomId,
    validateAndSetPeerId,
    initializePeer,
    destroyPeer,
    reconnectPeer,
    resetPeerState,
    getPeerInfo,
    isPeerAvailable
  }), [peerId, peer, isPeerCreated, peerStatus, peerError, customIdError, isPeerAvailable, setPeerId, validatePeerId, generateRandomId, generateAndSetRandomId, validateAndSetPeerId, initializePeer, destroyPeer, reconnectPeer, resetPeerState, getPeerInfo])
}

export default usePeer