// DashboardScreen - 仪表板界面，管理连接和聊天会话
import React, { useState, useEffect } from 'react'
import { Layout, Card, List, Button, Input, Space, Typography, Badge, Avatar, Dropdown, Modal, Divider, Empty, Tooltip, Switch } from 'antd'
import {
  MessageOutlined,
  UserAddOutlined,
  SettingOutlined,
  LogoutOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  WifiOutlined,
  DisconnectOutlined,
  UserOutlined,
  BellOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons'
import usePeer from '../hooks/usePeer'
import useConnections from '../hooks/useConnections'
import useChat from '../hooks/useChat'
import useUI from '../hooks/useUI'
import CopyableId from '../components/CopyableId'
import StatusIndicator from '../components/StatusIndicator'

const { Header, Content, Sider } = Layout
const { Title, Text, Paragraph } = Typography
const { confirm } = Modal

const DashboardScreen = ({ onNavigateToConnect, onNavigateToRequests }) => {
  const [siderCollapsed, setSiderCollapsed] = useState(false)
  
  const {
    peerId,
    isPeerCreated,
    peerStatus,
    destroyPeer
  } = usePeer()
  
  const {
    connections,
    activeConnections,
    incomingRequests,
    disconnectFromPeer,
    getConnectionStats,
    acceptConnectionRequest,
    rejectConnectionRequest
  } = useConnections()
  
  const {
    activeChats,
    currentChatId,
    unreadCounts,
    switchToChat,
    getTotalUnreadCount
  } = useChat()
  
  const {
    navigateTo,
    toastSuccess,
    toastError,
    toastInfo,
    showModal,
    hideModal,
    showConnectionRequest,
    connectionRequestData,
    hideConnectionRequestDialog
  } = useUI()
  

  
  // 断开连接
  const handleDisconnect = (connectionId, targetId) => {
    confirm({
      title: '确认断开连接',
      content: `确定要断开与 ${targetId} 的连接吗？`,
      icon: <ExclamationCircleOutlined />,
      okText: '断开',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await disconnectFromPeer(connectionId)
          toastSuccess(`已断开与 ${targetId} 的连接`)
        } catch (error) {
          console.error('断开连接失败:', error)
          toastError('断开连接时发生错误')
        }
      }
    })
  }
  
  // 开始聊天
  const handleStartChat = (connection) => {
    switchToChat(connection.id)
    navigateTo('chat', {
      connectionId: connection.id,
      targetId: connection.targetId
    })
  }
  
  // 退出登录
  const handleLogout = () => {
    confirm({
      title: '确认退出',
      content: '退出后将断开所有连接，确定要退出吗？',
      icon: <ExclamationCircleOutlined />,
      okText: '退出',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await destroyPeer()
          navigateTo('welcome')
          toastSuccess('已安全退出')
        } catch (error) {
          console.error('退出失败:', error)
          toastError('退出时发生错误')
        }
      }
    })
  }
  
  // 用户菜单
  const userMenuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => {
        // TODO: 打开设置页面
        toastInfo('设置功能即将推出')
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出',
      onClick: handleLogout
    }
  ]
  
  // 检查Peer状态
  useEffect(() => {
    if (!isPeerCreated) {
      navigateTo('welcome')
    }
  }, [isPeerCreated, navigateTo])
  
  const totalUnreadCount = getTotalUnreadCount()
  const stats = getConnectionStats()
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      {/* 顶部导航栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        padding: '15px 25px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            size={40} 
            icon={<UserOutlined />} 
            style={{ marginRight: '15px', background: '#1890ff' }}
          />
          <div>
            <Text strong style={{ color: 'white', fontSize: '16px', display: 'block' }}>
              {peerId}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
              <StatusIndicator status={peerStatus} size="small" />
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', marginLeft: '8px', fontSize: '12px' }}>
                已连接
              </Text>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button 
            type="primary" 
            icon={<UserAddOutlined />}
            onClick={onNavigateToConnect}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              borderRadius: '8px'
            }}
          >
            添加联系人
          </Button>
          
          <Button 
            icon={<BellOutlined />}
            onClick={onNavigateToRequests}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              borderRadius: '8px'
            }}
          >
            {incomingRequests.length > 0 && (
              <Badge count={incomingRequests.length} size="small" style={{ marginLeft: '5px' }} />
            )}
          </Button>
          
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <Button 
              icon={<SettingOutlined />}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                borderRadius: '8px'
              }}
            />
          </Dropdown>
        </div>
      </div>

      {/* 统计信息 */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '30px',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '15px',
          padding: '20px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          minWidth: '120px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>
            {stats.total}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>连接</div>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '15px',
          padding: '20px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          minWidth: '120px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>
            {stats.active}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>在线</div>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '15px',
          padding: '20px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          minWidth: '120px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>
            {totalUnreadCount}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>未读</div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div style={{
        display: 'flex',
        gap: '30px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* 第一张卡片 - 发起连接或创建群组 */}
        <Card
          style={{
            flex: 1,
            borderRadius: '20px',
            border: '2px solid #ff6b6b',
            background: 'white',
            minHeight: '300px'
          }}
          bodyStyle={{ padding: '30px' }}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ color: '#ff6b6b', marginBottom: '20px' }}>
              card1
            </Title>
            <Paragraph style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
              发文件群组@send<br />
              以群组为单位
            </Paragraph>
            <div style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>
              暂时不添加实际功能
            </div>
            <Button 
              type="primary" 
              size="large"
              style={{
                background: '#ff6b6b',
                border: 'none',
                borderRadius: '10px',
                height: '45px',
                fontSize: '16px'
              }}
              onClick={() => {
                toastInfo('群组功能即将推出')
              }}
            >
              发起连接
            </Button>
          </div>
        </Card>

        {/* 第二张卡片 - 进入一对一连接 */}
        <Card
          style={{
            flex: 1,
            borderRadius: '20px',
            border: '2px solid #4ecdc4',
            background: 'white',
            minHeight: '300px'
          }}
          bodyStyle={{ padding: '30px' }}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ color: '#4ecdc4', marginBottom: '20px' }}>
              card2
            </Title>
            <Paragraph style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
              直接进入一对一连接<br />
              一对一连接的界面
            </Paragraph>
            <div style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>
              暂无连接
            </div>
            <Button 
              type="primary" 
              size="large"
              style={{
                background: '#4ecdc4',
                border: 'none',
                borderRadius: '10px',
                height: '45px',
                fontSize: '16px'
              }}
              onClick={onNavigateToConnect}
            >
              发起连接
            </Button>
          </div>
        </Card>
      </div>

      {/* 连接请求提示 */}
      {incomingRequests.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '15px',
          padding: '15px 20px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BellOutlined style={{ color: '#1890ff' }} />
            <Text>您有 {incomingRequests.length} 个新的连接请求</Text>
            <Button 
              type="link" 
              size="small"
              onClick={onNavigateToRequests}
            >
              查看
            </Button>
          </div>
        </div>
      )}

      {/* 连接列表（如果有连接的话，显示在底部） */}
      {connections.length > 0 && (
        <div style={{
          marginTop: '30px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '25px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          maxWidth: '1200px',
          margin: '30px auto 0'
        }}>
          <Title level={4} style={{ color: 'white', marginBottom: '20px' }}>
            我的连接
          </Title>
          <List
            dataSource={connections}
            renderItem={(connection) => {
              const unreadCount = unreadCounts[connection.id] || 0
              const isActive = activeConnections.includes(connection.id)
              
              return (
                <List.Item
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    padding: '15px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                  actions={[
                    <Button
                      type="primary"
                      icon={<MessageOutlined />}
                      onClick={() => handleStartChat(connection)}
                      style={{
                        background: '#1890ff',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                    >
                      聊天
                    </Button>,
                    <Button
                      danger
                      icon={<DisconnectOutlined />}
                      onClick={() => handleDisconnect(connection.id, connection.targetId)}
                      style={{
                        borderRadius: '8px'
                      }}
                    >
                      断开
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={isActive} color="green">
                        <Avatar icon={<UserOutlined />} style={{ background: '#1890ff' }} />
                      </Badge>
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Text strong style={{ color: 'white' }}>{connection.targetId}</Text>
                        {unreadCount > 0 && (
                          <Badge
                            count={unreadCount}
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </div>
                    }
                    description={
                      <Space>
                        <StatusIndicator
                          status={isActive ? 'connected' : 'disconnected'}
                          size="small"
                        />
                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {isActive ? '在线' : '离线'}
                        </Text>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>•</Text>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {new Date(connection.connectedAt).toLocaleString()}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )
            }}
          />
        </div>
      )}
      

    </div>
  )
}

export default DashboardScreen