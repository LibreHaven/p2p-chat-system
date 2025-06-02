// Peer状态管理 - 负责管理PeerJS实例和基础连接
import peerService from '../../services/peerService'

export const createPeerSlice = (set, get) => ({
  // Peer状态
  peerId: '',
  peer: null,
  isPeerCreated: false,
  peerStatus: 'idle', // 'idle' | 'creating' | 'connected' | 'failed' | 'disconnected'
  
  // 错误状态
  peerError: null,
  customIdError: '',
  
  // Peer Actions
  setPeerId: (peerId) => {
    set({ peerId })
    // 清除之前的错误
    if (get().customIdError) {
      set({ customIdError: '' })
    }
  },
  
  // 验证PeerID
  validatePeerId: (id) => {
    if (!id) {
      set({ customIdError: '' })
      return false
    }
    
    const idRegex = /^[a-zA-Z0-9_-]{3,12}$/
    const isValid = idRegex.test(id)
    const errorMessage = isValid ? '' : 'ID必须是3-12位的字母、数字、下划线或连字符'
    
    set({ customIdError: errorMessage })
    return isValid
  },
  
  // 生成随机ID
  generateRandomId: () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },
  
  // 创建Peer实例
  createPeer: async (customId = null) => {
    const { peerId, validatePeerId, generateRandomId } = get()
    const finalId = customId || peerId || generateRandomId()
    
    // 验证ID
    if (!validatePeerId(finalId)) {
      return false
    }
    
    set({ 
      peerStatus: 'creating',
      peerError: null,
      peerId: finalId
    })
    
    try {
      const peer = peerService.createPeer(finalId, {
        onOpen: (id) => {
          console.log('Peer连接已建立，ID:', id)
          set({ 
            isPeerCreated: true,
            peerStatus: 'connected',
            peerId: id,
            peer
          })
          
          // 保存到sessionStorage
          sessionStorage.setItem('peerId', id)
          
          // 触发UI更新
          get().showToast('Peer连接已建立')
        },
        
        onError: (error) => {
          console.error('Peer连接错误:', error)
          set({ 
            peerStatus: 'failed',
            peerError: error.message
          })
          
          // 处理ID冲突
          if (error.message && error.message.includes('is taken')) {
            const suggestedId = generateRandomId()
            set({ 
              customIdError: `ID "${finalId}" 已被占用，请尝试其他ID`,
            })
            get().showToast(`ID已被占用，建议使用: ${suggestedId}`)
          } else {
            get().showToast('Peer连接失败，请重试')
          }
        },
        
        onConnection: (conn) => {
          console.log('收到连接请求:', conn.peer)
          // 委托给连接管理器处理
          get().handleIncomingConnection(conn)
        },
        
        onDisconnected: () => {
          console.log('Peer连接已断开')
          set({ peerStatus: 'disconnected' })
        },
        
        onClose: () => {
          console.log('Peer连接已关闭')
          set({ 
            peerStatus: 'idle',
            isPeerCreated: false,
            peer: null
          })
        }
      })
      
      set({ peer })
      return true
      
    } catch (error) {
      console.error('创建Peer失败:', error)
      set({ 
        peerStatus: 'failed',
        peerError: error.message
      })
      get().showToast('创建Peer失败')
      return false
    }
  },
  
  // 销毁Peer连接
  destroyPeer: () => {
    const { peer } = get()
    
    if (peer) {
      try {
        peer.destroy()
      } catch (error) {
        console.warn('销毁Peer时出错:', error)
      }
    }
    
    // 清理状态
    set({
      peer: null,
      isPeerCreated: false,
      peerStatus: 'idle',
      peerError: null
    })
    
    // 清理sessionStorage
    sessionStorage.removeItem('peerId')
  },
  
  // 重置Peer状态
  resetPeerState: () => {
    set({
      peerError: null,
      customIdError: '',
      peerStatus: 'idle'
    })
  },
  
  // 从sessionStorage恢复Peer状态
  restorePeerFromSession: () => {
    const savedPeerId = sessionStorage.getItem('peerId')
    if (savedPeerId) {
      set({ peerId: savedPeerId })
      return savedPeerId
    }
    return null
  }
})