import React, { useState } from 'react'
import { Layout, Card, Button, Input, Space, Typography, Switch, Form, Alert, Spin, Modal } from 'antd'
import {
  ArrowLeftOutlined,
  UserAddOutlined,
  LockOutlined,
  UnlockOutlined,
  WifiOutlined
} from '@ant-design/icons'
import usePeer from '../hooks/usePeer'
import useConnections from '../hooks/useConnections'
import useUI from '../hooks/useUI'
import StatusIndicator from '../components/StatusIndicator'

const { Content } = Layout
const { Title, Text } = Typography

const ConnectScreen = ({ onBack }) => {
  const [form] = Form.useForm()
  const [enableEncryption, setEnableEncryption] = useState(true)
  
  const {
    peerId,
    isPeerCreated,
    peerStatus
  } = usePeer()
  
  const {
    isConnecting,
    connectToPeer,
    acceptConnection,
    rejectConnection
  } = useConnections()
  
  const { 
    toastError, 
    toastSuccess, 
    toastInfo,
    showConnectionRequest,
    connectionRequestData,
    hideConnectionRequestDialog
  } = useUI()
  
  const handleConnect = async (values) => {
    const { targetId } = values
    
    if (!targetId || targetId.trim() === '') {
      toastError('请输入目标用户ID')
      return
    }
    
    if (targetId === peerId) {
      toastError('不能连接到自己')
      return
    }
    
    try {
      await connectToPeer(targetId, { useEncryption: enableEncryption })
      toastInfo(enableEncryption ? '正在建立加密连接...' : '正在建立连接...')
      // 连接成功后会自动跳转到聊天界面
    } catch (error) {
      console.error('连接失败:', error)
      toastError('连接失败，请重试')
    }
  }
  
  const isFormDisabled = !isPeerCreated || peerStatus !== 'connected' || isConnecting
  
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
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
                <UserAddOutlined style={{ marginRight: 8 }} />
                建立新连接
              </Title>
              <Text type="secondary">
                输入目标用户ID来建立P2P连接
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
          
          {/* 连接表单 */}
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleConnect}
              disabled={isFormDisabled}
            >
              <Form.Item
                label="目标用户ID"
                name="targetId"
                rules={[
                  { required: true, message: '请输入目标用户ID' },
                  { min: 3, message: 'ID长度至少3个字符' }
                ]}
              >
                <Input
                  placeholder="输入要连接的用户ID"
                  size="large"
                  prefix={<UserAddOutlined />}
                />
              </Form.Item>
              
              {/* 加密选项 */}
              <Form.Item label="连接设置">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    background: enableEncryption ? '#f6ffed' : '#fff2e8'
                  }}>
                    <Space>
                      {enableEncryption ? (
                        <LockOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <UnlockOutlined style={{ color: '#fa8c16' }} />
                      )}
                      <div>
                        <Text strong>
                          {enableEncryption ? '端到端加密' : '普通连接'}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {enableEncryption 
                            ? '消息将被加密传输，更安全' 
                            : '消息以明文传输，速度更快'
                          }
                        </Text>
                      </div>
                    </Space>
                    <Switch
                      checked={enableEncryption}
                      onChange={setEnableEncryption}
                      checkedChildren="加密"
                      unCheckedChildren="普通"
                    />
                  </div>
                </Space>
              </Form.Item>
              
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={isConnecting}
                  disabled={isFormDisabled}
                  icon={<WifiOutlined />}
                >
                  {isConnecting ? '连接中...' : '发起连接'}
                </Button>
              </Form.Item>
              
              {isFormDisabled && isPeerCreated && (
                <Alert
                  message="当前正在连接中，请稍候"
                  type="info"
                  showIcon
                />
              )}
            </Form>
          </Card>
        </div>
      </Content>
      
      {/* 连接请求弹窗 */}
      {showConnectionRequest && connectionRequestData && (
        <Modal
          title="连接请求"
          open={true}
          onCancel={hideConnectionRequestDialog}
          footer={[
            <Button 
              key="reject" 
              onClick={() => {
                rejectConnection(connectionRequestData.id)
                hideConnectionRequestDialog()
              }}
            >
              拒绝
            </Button>,
            <Button 
              key="accept" 
              type="primary" 
              onClick={() => {
                acceptConnection(connectionRequestData.id)
                hideConnectionRequestDialog()
              }}
            >
              接受
            </Button>
          ]}
        >
          <div>
            <p>{connectionRequestData.peerId} 请求与你建立连接</p>
            <p>加密通信: {connectionRequestData.useEncryption ? '已启用' : '已禁用'}</p>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

export default ConnectScreen