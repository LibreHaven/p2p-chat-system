// useUI Hook - 管理界面状态和用户交互
import { useCallback, useEffect, useMemo } from 'react'
import { useAppStore, selectUIState } from '../store'

export const useUI = () => {
  // 从store获取UI相关状态
  const {
    screen,
    previousScreen,
    showConnectionRequest,
    connectionRequestData,
    isToastVisible,
    toastMessage,
    toastType,
    isLoading,
    loadingMessage,
    showSettingsModal,
    showAboutModal,
    showConfirmModal,
    confirmModalData,
    sidebarCollapsed,
    theme,
    language,
    
    // Actions
    setScreen,
    goBack,
    showToast: showToastAction,
    hideToast,
    showConnectionRequest: showConnectionRequestAction,
    hideConnectionRequest,
    setLoading,
    showConfirmModal: showConfirmModalAction,
    hideConfirmModal,
    toggleSettingsModal,
    toggleAboutModal,
    toggleSidebar,
    setSidebarCollapsed,
    setTheme,
    toggleTheme,
    setLanguage,
    initializeUISettings,
    resetUIState,
    handleError,
    clearError
  } = useAppStore(selectUIState)
  
  // 导航到指定屏幕
  const navigateTo = useCallback((targetScreen, saveHistory = true) => {
    try {
      setScreen(targetScreen, saveHistory)
      return true
    } catch (error) {
      console.error('导航失败:', error)
      showToastAction('导航失败', 'error')
      return false
    }
  }, [setScreen, showToastAction])
  
  // 返回上一屏幕
  const navigateBack = useCallback(() => {
    try {
      if (previousScreen) {
        goBack()
        return true
      } else {
        // 如果没有上一屏幕，根据当前屏幕决定默认返回位置
        switch (screen) {
          case 'chat':
            setScreen('dashboard')
            break
          case 'dashboard':
            setScreen('welcome')
            break
          default:
            setScreen('welcome')
        }
        return true
      }
    } catch (error) {
      console.error('返回失败:', error)
      showToastAction('返回失败', 'error')
      return false
    }
  }, [previousScreen, screen, goBack, setScreen, showToastAction])
  
  // 显示Toast消息
  const toast = useCallback((message, type = 'info', duration = 3000) => {
    showToastAction(message, type, duration)
  }, [showToastAction])
  
  // 显示成功消息
  const toastSuccess = useCallback((message, duration = 3000) => {
    toast(message, 'success', duration)
  }, [toast])
  
  // 显示错误消息
  const toastError = useCallback((message, duration = 5000) => {
    toast(message, 'error', duration)
  }, [toast])
  
  // 显示警告消息
  const toastWarning = useCallback((message, duration = 4000) => {
    toast(message, 'warning', duration)
  }, [toast])
  
  // 显示信息消息
  const toastInfo = useCallback((message, duration = 3000) => {
    toast(message, 'info', duration)
  }, [toast])
  
  // 显示加载状态
  const showLoading = useCallback((message = '加载中...') => {
    setLoading(true, message)
  }, [setLoading])
  
  // 隐藏加载状态
  const hideLoading = useCallback(() => {
    setLoading(false, '')
  }, [setLoading])
  
  // 显示确认对话框
  const showConfirm = useCallback((options) => {
    const defaultOptions = {
      title: '确认',
      content: '确定要执行此操作吗？',
      okText: '确定',
      cancelText: '取消',
      type: 'info'
    }
    
    showConfirmModalAction({
      ...defaultOptions,
      ...options
    })
  }, [showConfirmModalAction])
  
  // 显示连接请求对话框
  const showConnectionRequestDialog = useCallback((requestData) => {
    showConnectionRequestAction(requestData)
  }, [showConnectionRequestAction])
  
  // 隐藏连接请求对话框
  const hideConnectionRequestDialog = useCallback(() => {
    hideConnectionRequest()
  }, [hideConnectionRequest])
  
  // 切换主题
  const switchTheme = useCallback((newTheme = null) => {
    if (newTheme) {
      setTheme(newTheme)
    } else {
      toggleTheme()
    }
  }, [setTheme, toggleTheme])
  
  // 切换语言
  const switchLanguage = useCallback((newLanguage) => {
    setLanguage(newLanguage)
    toastSuccess('语言设置已更新')
  }, [setLanguage, toastSuccess])
  
  // 切换侧边栏
  const toggleSidebarState = useCallback(() => {
    toggleSidebar()
    
    // 保存到localStorage
    try {
      localStorage.setItem('p2p-chat-sidebar-collapsed', JSON.stringify(!sidebarCollapsed))
    } catch (error) {
      console.warn('保存侧边栏状态失败:', error)
    }
  }, [toggleSidebar, sidebarCollapsed])
  
  // 设置侧边栏状态
  const setSidebarState = useCallback((collapsed) => {
    setSidebarCollapsed(collapsed)
    
    // 保存到localStorage
    try {
      localStorage.setItem('p2p-chat-sidebar-collapsed', JSON.stringify(collapsed))
    } catch (error) {
      console.warn('保存侧边栏状态失败:', error)
    }
  }, [setSidebarCollapsed])
  
  // 处理错误
  const handleUIError = useCallback((error, context = '') => {
    handleError(error, context)
  }, [handleError])
  
  // 重置UI状态
  const resetUI = useCallback(() => {
    resetUIState()
    toastInfo('界面已重置')
  }, [resetUIState, toastInfo])
  
  // 获取屏幕信息
  const getScreenInfo = useCallback(() => {
    return {
      current: screen,
      previous: previousScreen,
      canGoBack: !!previousScreen,
      isWelcome: screen === 'welcome',
      isDashboard: screen === 'dashboard',
      isChat: screen === 'chat',
      isError: screen === 'error'
    }
  }, [screen, previousScreen])
  
  // 获取模态框状态
  const getModalStates = useCallback(() => {
    return {
      settings: showSettingsModal,
      about: showAboutModal,
      confirm: showConfirmModal,
      connectionRequest: showConnectionRequest,
      hasAnyModal: showSettingsModal || showAboutModal || showConfirmModal || showConnectionRequest
    }
  }, [showSettingsModal, showAboutModal, showConfirmModal, showConnectionRequest])
  
  // 关闭所有模态框
  const closeAllModals = useCallback(() => {
    if (showSettingsModal) toggleSettingsModal()
    if (showAboutModal) toggleAboutModal()
    if (showConfirmModal) hideConfirmModal()
    if (showConnectionRequest) hideConnectionRequest()
  }, [showSettingsModal, showAboutModal, showConfirmModal, showConnectionRequest, 
      toggleSettingsModal, toggleAboutModal, hideConfirmModal, hideConnectionRequest])
  
  // 检查是否为移动设备
  const isMobile = useCallback(() => {
    return window.innerWidth <= 768
  }, [])
  
  // 检查是否为暗色主题
  const isDarkTheme = useCallback(() => {
    return theme === 'dark'
  }, [theme])
  
  // 初始化UI设置
  useEffect(() => {
    initializeUISettings()
  }, [])
  
  // 监听窗口大小变化，自动调整侧边栏
  useEffect(() => {
    const handleResize = () => {
      if (isMobile() && !sidebarCollapsed) {
        setSidebarState(true)
      }
    }
    
    window.addEventListener('resize', handleResize)
    
    // 初始检查
    handleResize()
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [sidebarCollapsed, setSidebarState, isMobile])
  
  return useMemo(() => ({
    // 状态
    screen,
    previousScreen,
    showConnectionRequest,
    connectionRequestData,
    isToastVisible,
    toastMessage,
    toastType,
    isLoading,
    loadingMessage,
    showSettingsModal,
    showAboutModal,
    showConfirmModal,
    confirmModalData,
    sidebarCollapsed,
    theme,
    language,
    
    // 计算属性
    canGoBack: !!previousScreen,
    isWelcome: screen === 'welcome',
    isDashboard: screen === 'dashboard',
    isChat: screen === 'chat',
    isError: screen === 'error',
    isDarkTheme: isDarkTheme(),
    isMobile: isMobile(),
    screenInfo: getScreenInfo(),
    modalStates: getModalStates(),
    
    // 导航方法
    navigateTo,
    navigateBack,
    setScreen,
    goBack,
    
    // Toast方法
    toast,
    toastSuccess,
    toastError,
    toastWarning,
    toastInfo,
    hideToast,
    
    // 加载状态方法
    showLoading,
    hideLoading,
    
    // 模态框方法
    showConfirm,
    hideConfirmModal,
    showConnectionRequestDialog,
    hideConnectionRequestDialog,
    toggleSettingsModal,
    toggleAboutModal,
    closeAllModals,
    
    // 侧边栏方法
    toggleSidebarState,
    setSidebarState,
    
    // 主题和语言方法
    switchTheme,
    switchLanguage,
    
    // 工具方法
    handleUIError,
    resetUI,
    clearError,
    
    // 原始store方法（高级用法）
    setLoading,
    showConfirmModalAction,
    showConnectionRequestAction
  }), [screen, previousScreen, showConnectionRequest, connectionRequestData, isToastVisible, toastMessage, toastType, isLoading, loadingMessage, showSettingsModal, showAboutModal, showConfirmModal, confirmModalData, sidebarCollapsed, theme, language, navigateTo, navigateBack, setScreen, goBack, toast, toastSuccess, toastError, toastWarning, toastInfo, hideToast, showLoading, hideLoading, showConfirm, hideConfirmModal, showConnectionRequestDialog, hideConnectionRequestDialog, toggleSettingsModal, toggleAboutModal, closeAllModals, toggleSidebarState, setSidebarState, switchTheme, switchLanguage, handleUIError, resetUI, clearError, setLoading, showConfirmModalAction, showConnectionRequestAction])
}

export default useUI