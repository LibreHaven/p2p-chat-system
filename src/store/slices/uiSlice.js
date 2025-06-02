// UI状态管理 - 负责管理界面状态和用户交互

export const createUISlice = (set, get) => ({
  // 界面状态
  screen: 'welcome', // 'welcome' | 'dashboard' | 'chat' | 'error'
  previousScreen: null,
  screenParams: null, // 屏幕参数，用于传递数据
  
  // 弹窗和提示状态
  showConnectionRequest: false,
  connectionRequestData: null,
  isToastVisible: false,
  toastMessage: '',
  toastType: 'info', // 'info' | 'success' | 'warning' | 'error'
  
  // 加载状态
  isLoading: false,
  loadingMessage: '',
  
  // 模态框状态
  showSettingsModal: false,
  showAboutModal: false,
  showConfirmModal: false,
  confirmModalData: null,
  
  // 侧边栏状态
  sidebarCollapsed: false,
  
  // 主题状态
  theme: 'light', // 'light' | 'dark'
  
  // 语言状态
  language: 'zh-CN', // 'zh-CN' | 'en-US'
  
  // UI Actions
  
  // 屏幕导航
  setScreen: (screen, saveHistory = true, params = null) => {
    const currentScreen = get().screen
    
    if (saveHistory && currentScreen !== screen) {
      set({ previousScreen: currentScreen })
    }
    
    set({ screen, screenParams: params })
    
    // 屏幕切换时的副作用
    switch (screen) {
      case 'welcome':
        // 清理连接状态
        get().clearAllConnections()
        break
      case 'dashboard':
        // 确保peer已创建
        if (!get().isPeerCreated) {
          set({ screen: 'welcome' })
        }
        break
      case 'chat':
        // 确保有活跃连接
        if (!get().currentConnectionId) {
          set({ screen: 'dashboard' })
        }
        break
    }
  },
  
  // 导航到指定屏幕（带参数支持）
  navigateTo: (screen, params = null, saveHistory = true) => {
    get().setScreen(screen, saveHistory, params)
  },
  
  // 返回上一屏幕
  goBack: () => {
    const { previousScreen } = get()
    if (previousScreen) {
      set({ 
        screen: previousScreen,
        previousScreen: null
      })
    }
  },
  
  // Toast提示管理
  showToast: (message, type = 'info', duration = 3000) => {
    set({
      isToastVisible: true,
      toastMessage: message,
      toastType: type
    })
    
    // 自动隐藏
    setTimeout(() => {
      set({ isToastVisible: false })
    }, duration)
  },
  
  hideToast: () => {
    set({ isToastVisible: false })
  },
  
  // 连接请求弹窗管理
  showConnectionRequest: (requestData) => {
    set({
      showConnectionRequest: true,
      connectionRequestData: requestData
    })
  },
  
  hideConnectionRequest: () => {
    set({
      showConnectionRequest: false,
      connectionRequestData: null
    })
  },
  
  // 加载状态管理
  setLoading: (isLoading, message = '') => {
    set({
      isLoading,
      loadingMessage: message
    })
  },
  
  // 确认对话框管理
  showConfirmModal: (data) => {
    set({
      showConfirmModal: true,
      confirmModalData: data
    })
  },
  
  hideConfirmModal: () => {
    set({
      showConfirmModal: false,
      confirmModalData: null
    })
  },
  
  // 设置模态框管理
  toggleSettingsModal: () => {
    set({ showSettingsModal: !get().showSettingsModal })
  },
  
  // 关于模态框管理
  toggleAboutModal: () => {
    set({ showAboutModal: !get().showAboutModal })
  },
  
  // 侧边栏管理
  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed })
  },
  
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed })
  },
  
  // 主题管理
  setTheme: (theme) => {
    set({ theme })
    
    // 保存到localStorage
    try {
      localStorage.setItem('p2p-chat-theme', theme)
      
      // 更新document class
      document.documentElement.className = theme === 'dark' ? 'dark' : ''
    } catch (error) {
      console.warn('保存主题设置失败:', error)
    }
  },
  
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light'
    get().setTheme(newTheme)
  },
  
  // 语言管理
  setLanguage: (language) => {
    set({ language })
    
    // 保存到localStorage
    try {
      localStorage.setItem('p2p-chat-language', language)
    } catch (error) {
      console.warn('保存语言设置失败:', error)
    }
  },
  
  // 初始化UI设置
  initializeUISettings: () => {
    try {
      // 恢复主题设置
      const savedTheme = localStorage.getItem('p2p-chat-theme')
      if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
        get().setTheme(savedTheme)
      }
      
      // 恢复语言设置
      const savedLanguage = localStorage.getItem('p2p-chat-language')
      if (savedLanguage && ['zh-CN', 'en-US'].includes(savedLanguage)) {
        set({ language: savedLanguage })
      }
      
      // 恢复侧边栏状态
      const savedSidebarState = localStorage.getItem('p2p-chat-sidebar-collapsed')
      if (savedSidebarState !== null) {
        set({ sidebarCollapsed: JSON.parse(savedSidebarState) })
      }
      
    } catch (error) {
      console.warn('初始化UI设置失败:', error)
    }
  },
  
  // 重置UI状态
  resetUIState: () => {
    set({
      screen: 'welcome',
      previousScreen: null,
      showConnectionRequest: false,
      connectionRequestData: null,
      showToast: false,
      toastMessage: '',
      toastType: 'info',
      isLoading: false,
      loadingMessage: '',
      showSettingsModal: false,
      showAboutModal: false,
      showConfirmModal: false,
      confirmModalData: null
    })
  },
  
  // 错误处理
  handleError: (error, context = '') => {
    console.error(`错误 [${context}]:`, error)
    
    const errorMessage = error.message || '发生未知错误'
    get().showToast(errorMessage, 'error', 5000)
    
    // 如果是严重错误，切换到错误屏幕
    if (error.critical) {
      set({ 
        screen: 'error',
        errorInfo: {
          message: errorMessage,
          context,
          timestamp: new Date(),
          stack: error.stack
        }
      })
    }
  },
  
  // 清理错误状态
  clearError: () => {
    set({ errorInfo: null })
  }
})