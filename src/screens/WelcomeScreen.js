// WelcomeScreen - 欢迎界面，用于创建或输入PeerID
import React, { useState, useEffect } from 'react'
import { Card, Input, Button, Space, Typography, Divider, Alert, Spin } from 'antd'
import { UserOutlined, ReloadOutlined, ArrowRightOutlined } from '@ant-design/icons'
import usePeer from '../hooks/usePeer'
import useUI from '../hooks/useUI'

const { Title, Text, Paragraph } = Typography

const WelcomeScreen = () => {
  const [customId, setCustomId] = useState('')
  const [useCustomId, setUseCustomId] = useState(true) // 默认使用自定义ID模式
  
  const {
    peerId,
    isPeerCreated,
    isConnecting,
    hasError,
    customIdError,
    generateAndSetRandomId,
    validateAndSetPeerId,
    initializePeer,
    resetPeerState
  } = usePeer()
  
  const {
    navigateTo,
    toastSuccess,
    toastError,
    showLoading,
    hideLoading
  } = useUI()
  
  // 生成随机ID并填充到输入框
  const handleGenerateRandomId = () => {
    const randomId = generateAndSetRandomId()
    setCustomId(randomId)
    toastSuccess(`已生成随机ID: ${randomId}`)
  }
  
  // 验证并设置自定义ID
  const handleCustomIdChange = (e) => {
    const value = e.target.value
    setCustomId(value)
  }
  
  // 输入框失去焦点时验证
  const handleCustomIdBlur = () => {
    if (customId) {
      validateAndSetPeerId(customId)
    }
  }
  
  // 创建Peer连接
  const handleCreatePeer = async () => {
    if (!customId) {
      toastError('请输入ID或生成随机ID')
      return
    }
    
    if (customIdError) {
      toastError('请修正ID格式错误')
      return
    }
    
    showLoading('正在创建Peer连接...')
    
    try {
      const success = await initializePeer(customId)
      
      if (success) {
        toastSuccess('Peer连接创建成功！')
        // 延迟跳转，让用户看到成功消息
        setTimeout(() => {
          navigateTo('dashboard')
        }, 1000)
      } else {
        toastError('创建Peer连接失败，请重试')
      }
    } catch (error) {
      console.error('创建Peer失败:', error)
      toastError('创建连接时发生错误')
    } finally {
      hideLoading()
    }
  }
  
  // 重置错误状态
  const handleRetry = () => {
    resetPeerState()
    setCustomId('')
  }
  
  // 移除自动生成随机ID的逻辑，优先让用户选择自定义ID
  
  // 如果已经创建了Peer，自动跳转到仪表板
  useEffect(() => {
    if (isPeerCreated) {
      navigateTo('dashboard', false)
    }
  }, [isPeerCreated])
  
  const canProceed = customId && !hasError && !isConnecting
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8, color: '#1890ff' }}>
            P2P 聊天
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 16 }}>
            创建您的专属ID，开始安全的点对点通信
          </Paragraph>
        </div>
        
        {hasError && (
          <Alert
            message="连接失败"
            description="创建Peer连接时发生错误，请检查网络连接后重试"
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
            action={
              <Button size="small" onClick={handleRetry}>
                重试
              </Button>
            }
          />
        )}
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 自定义ID模式 */}
          <div>
            <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
              自定义ID
                </Text>
                <Input
                  size="large"
                  value={customId}
                  onChange={handleCustomIdChange}
                  onBlur={handleCustomIdBlur}
                  prefix={<UserOutlined />}
                  placeholder="输入3-12位字母、数字、下划线或连字符"
                  status={customIdError ? 'error' : ''}
                  style={{ fontSize: 16 }}
                />
                {customIdError && (
                  <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    {customIdError}
                  </Text>
                )}
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  ID将用于其他用户连接到您
                </Text>
              </div>
              
          <Button
            type="link"
            onClick={handleGenerateRandomId}
            style={{ padding: 0, height: 'auto' }}
          >
            生成随机ID
          </Button>
          
          <Divider style={{ margin: '16px 0' }} />
          
          <Button
            type="primary"
            size="large"
            block
            onClick={handleCreatePeer}
            disabled={!canProceed}
            loading={isConnecting}
            icon={!isConnecting && <ArrowRightOutlined />}
            style={{
              height: 48,
              fontSize: 16,
              borderRadius: 8
            }}
          >
            {isConnecting ? '正在创建连接...' : '开始使用'}
          </Button>
          
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              创建连接后，您可以与其他用户进行安全的点对点通信
            </Text>
          </div>
        </Space>
      </Card>
      
      {isConnecting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ textAlign: 'center', minWidth: 200 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>正在创建Peer连接...</Text>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default WelcomeScreen