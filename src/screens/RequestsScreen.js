import React from 'react'
import { Layout, Card, List, Button, Space, Typography, Badge, Avatar, Empty, Alert, Tag } from 'antd'
import {
  ArrowLeftOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons'
import usePeer from '../hooks/usePeer'
import useConnections from '../hooks/useConnections'
import useUI from '../hooks/useUI'
import StatusIndicator from '../components/StatusIndicator'

const { Content } = Layout
const { Title, Text } = Typography

const RequestsScreen = ({ onBack }) => {
  const {
    peerId,
    isPeerCreated,
    peerStatus
  } = usePeer()
  
  const {
    incomingRequests,
    acceptConnection,
    rejectConnection
  } = useConnections()
  
  const { toastSuccess, toastError } = useUI()
  
  const handleAccept = async (requestId) => {
    try {
      await acceptConnection(requestId)
      toastSuccess('已接受连接请求')
    } catch (error) {
      console.error('接受连接失败:', error)
      toastError('接受连接失败，请重试')
    }
  }
  
  const handleReject = async (requestId) => {
    try {
      await rejectConnection(requestId)
      toastSuccess('已拒绝连接请求')
    } catch (error) {
      console.error('拒绝连接失败:', error)
      toastError('拒绝连接失败，请重试')
    }
  }
  
  const requestsList = Array.from(incomingRequests.values())
  
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* 返回按钮 */}
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
            style={{ marginBottom: 16 }}
          >
            返回主页
          </Button>
          
          {/* 页面标题 */}
          <Card style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Title level={3} style={{ margin: 0 }}>
                <ClockCircleOutlined style={{ marginRight: 8 }} />
                连接请求
                {requestsList.length > 0 && (
                  <Badge count={requestsList.length} style={{ marginLeft: 8 }} />
                )}
              </Title>
              <Text type="secondary">
                管理收到的连接请求
              </Text>
            </Space>
          </Card>
          
          {/* 当前状态 */}
          <Card style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>当前状态：</Text>
                <StatusIndicator 
                  status={peerStatus} 
                  style={{ marginLeft: 8 }}
                />
              </div>
              
              {isPeerCreated && (
                <div>
                  <Text strong>您的ID：</Text>
                  <Text code style={{ marginLeft: 8 }}>{peerId}</Text>
                </div>
              )}
              
              {!isPeerCreated && (
                <Alert
                  message="请先在主页创建您的Peer连接"
                  type="warning"
                  showIcon
                />
              )}
            </Space>
          </Card>
          
          {/* 连接请求列表 */}
          <Card>
            {requestsList.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无连接请求"
              >
                <Text type="secondary">
                  当有用户向您发起连接时，请求会显示在这里
                </Text>
              </Empty>
            ) : (
              <List
                dataSource={requestsList}
                renderItem={(request) => (
                  <List.Item
                    key={request.id}
                    actions={[
                      <Button
                        key="accept"
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => handleAccept(request.id)}
                        disabled={!isPeerCreated || peerStatus !== 'connected'}
                      >
                        接受
                      </Button>,
                      <Button
                        key="reject"
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => handleReject(request.id)}
                        disabled={!isPeerCreated || peerStatus !== 'connected'}
                      >
                        拒绝
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={<UserOutlined />} 
                          style={{ backgroundColor: '#1890ff' }}
                        />
                      }
                      title={
                        <Space>
                          <Text strong>{request.peerId}</Text>
                          {request.useEncryption ? (
                            <Tag color="green" icon={<LockOutlined />}>
                              加密连接
                            </Tag>
                          ) : (
                            <Tag color="orange" icon={<UnlockOutlined />}>
                              普通连接
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size="small">
                          <Text type="secondary">
                            请求时间: {new Date(request.timestamp).toLocaleString()}
                          </Text>
                          <Text type="secondary">
                            连接类型: {request.useEncryption ? '端到端加密连接' : '普通连接'}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
          
          {requestsList.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <Alert
                message="处理连接请求"
                description="接受连接后将建立P2P连接并进入聊天界面。加密连接提供更高的安全性，但可能影响传输速度。"
                type="info"
                showIcon
              />
            </Card>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default RequestsScreen