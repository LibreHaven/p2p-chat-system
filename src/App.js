import React, { useEffect } from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAppStore } from './store'
import { WelcomeScreen, DashboardScreen, ChatScreen, ConnectScreen, RequestsScreen } from './screens'
import ErrorBoundary from './components/ErrorBoundary'
import Toast from './components/Toast'
import './styles/global.css'

function App() {
  const currentScreen = useAppStore(state => state.screen)
  const screenParams = useAppStore(state => state.screenParams)
  const navigateTo = useAppStore(state => state.navigateTo)

  // 页面导航函数
  const handleNavigateToConnect = () => {
    navigateTo('connect')
  }

  const handleNavigateToRequests = () => {
    navigateTo('requests')
  }

  const handleBackToDashboard = () => {
    navigateTo('dashboard')
  }

  // 渲染当前屏幕
  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen />
      
      case 'dashboard':
        return (
          <DashboardScreen 
            onNavigateToConnect={handleNavigateToConnect}
            onNavigateToRequests={handleNavigateToRequests}
          />
        )
      
      case 'connect':
        return (
          <ConnectScreen 
            onBack={handleBackToDashboard}
          />
        )
      
      case 'requests':
        return (
          <RequestsScreen 
            onBack={handleBackToDashboard}
          />
        )
      
      case 'chat':
        return (
          <ChatScreen
            connectionId={screenParams?.connectionId}
            targetId={screenParams?.targetId}
          />
        )
      
      default:
        return <WelcomeScreen />
    }
  }

  return (
    <ConfigProvider locale={zhCN}>
      <ErrorBoundary>
        <div className="app">
          {renderScreen()}
          <Toast />
        </div>
      </ErrorBoundary>
    </ConfigProvider>
  )
}

export default App
