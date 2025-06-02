// ChatScreen - 聊天界面
import React, { useState, useEffect, useRef } from 'react'
import { Layout, Input, Button, Space, Typography, Avatar, Dropdown, Modal, Upload, Progress, Tooltip, Badge } from 'antd'
import {
  SendOutlined,
  ArrowLeftOutlined,
  PaperClipOutlined,
  MoreOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  DisconnectOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined
} from '@ant-design/icons'
import useChat from '../hooks/useChat'
import useConnections from '../hooks/useConnections'
import usePeer from '../hooks/usePeer'
import useUI from '../hooks/useUI'
import MessageBubble from '../components/MessageBubble'
import StatusIndicator from '../components/StatusIndicator'

const { Header, Content } = Layout
const { Title, Text } = Typography
const { TextArea } = Input
const { confirm } = Modal

const ChatScreen = ({ connectionId, targetId }) => {
  const [messageText, setMessageText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  
  const { peerId } = usePeer()
  
  const {
    getConnection,
    isConnectionActive,
    disconnectFromPeer,
    reconnectToPeer,
    acceptConnection,
    rejectConnection
  } = useConnections()
  
  const {
    messages,
    fileTransfers,
    typingUsers,
    sendMessage,
    sendFile,
    downloadFile,
    markAsRead,
    clearChatHistory,
    setTypingStatus,
    chatStats
  } = useChat(connectionId)
  
  const {
    navigateTo,
    toastSuccess,
    toastError,
    toastInfo,
    showConnectionRequest,
    connectionRequestData,
    hideConnectionRequestDialog
  } = useUI()
  
  const connection = getConnection(connectionId)
  const chatMessages = messages[connectionId] || []
  const chatFileTransfers = fileTransfers[connectionId] || []
  const isActive = isConnectionActive(connectionId)
  // chatStats 已经从 useChat hook 中获取
  const isTargetTyping = typingUsers[connectionId]?.includes(targetId)
  
  // 发送文本消息
  const handleSendMessage = async () => {
    if (!messageText.trim()) return
    
    try {
      const success = await sendMessage(connectionId, {
        type: 'text',
        content: messageText.trim()
      })
      
      if (success) {
        setMessageText('')
        setIsTyping(false)
        // 停止打字状态
        setTypingStatus(connectionId, false)
      } else {
        toastError('发送消息失败')
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      toastError('发送消息时发生错误')
    }
  }
  
  // 处理输入变化
  const handleInputChange = (e) => {
    const value = e.target.value
    setMessageText(value)
    
    // 处理打字状态
    if (value.trim() && !isTyping) {
      setIsTyping(true)
      setTypingStatus(connectionId, true)
    } else if (!value.trim() && isTyping) {
      setIsTyping(false)
      setTypingStatus(connectionId, false)
    }
    
    // 重置打字超时
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        setTypingStatus(connectionId, false)
      }, 3000)
    }
  }
  
  // 处理按键
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  // 发送文件
  const handleFileSelect = async (file) => {
    try {
      const success = await sendFile(connectionId, file)
      if (success) {
        toastSuccess('文件发送中...')
      } else {
        toastError('文件发送失败')
      }
    } catch (error) {
      console.error('文件发送失败:', error)
      toastError('文件发送时发生错误')
    }
    return false // 阻止默认上传行为
  }
  
  // 下载文件
  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const success = await downloadFile(connectionId, fileId, fileName)
      if (success) {
        toastSuccess('文件下载完成')
      } else {
        toastError('文件下载失败')
      }
    } catch (error) {
      console.error('文件下载失败:', error)
      toastError('文件下载时发生错误')
    }
  }
  
  // 返回仪表板
  const handleGoBack = () => {
    // 停止打字状态
    if (isTyping) {
      setTypingStatus(connectionId, false)
    }
    navigateTo('dashboard')
  }
  
  // 重新连接
  const handleReconnect = async () => {
    try {
      const success = await reconnectToPeer(connectionId)
      if (success) {
        toastSuccess('重新连接成功')
      } else {
        toastError('重新连接失败')
      }
    } catch (error) {
      console.error('重新连接失败:', error)
      toastError('重新连接时发生错误')
    }
  }
  
  // 断开连接
  const handleDisconnect = () => {
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
          toastSuccess('已断开连接')
          navigateTo('dashboard')
        } catch (error) {
          console.error('断开连接失败:', error)
          toastError('断开连接时发生错误')
        }
      }
    })
  }
  
  // 清除聊天记录
  const handleClearHistory = () => {
    confirm({
      title: '确认清除聊天记录',
      content: '清除后将无法恢复，确定要清除所有聊天记录吗？',
      icon: <ExclamationCircleOutlined />,
      okText: '清除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await clearChatHistory(connectionId)
          toastSuccess('聊天记录已清除')
        } catch (error) {
          console.error('清除聊天记录失败:', error)
          toastError('清除聊天记录时发生错误')
        }
      }
    })
  }
  
  // 更多操作菜单
  const moreMenuItems = [
    {
      key: 'reconnect',
      icon: <DisconnectOutlined />,
      label: '重新连接',
      onClick: handleReconnect,
      disabled: isActive
    },
    {
      key: 'clearHistory',
      icon: <DeleteOutlined />,
      label: '清除聊天记录',
      onClick: handleClearHistory
    },
    {
      type: 'divider'
    },
    {
      key: 'disconnect',
      icon: <DisconnectOutlined />,
      label: '断开连接',
      onClick: handleDisconnect,
      danger: true
    }
  ]
  
  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  // 标记消息为已读
  useEffect(() => {
    if (connectionId) {
      markAsRead(connectionId)
    }
  }, [connectionId, markAsRead])
  
  // 新消息时滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages.length])
  
  // 清理打字超时
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])
  
  if (!connection) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={4}>连接不存在</Title>
          <Button type="primary" onClick={handleGoBack}>
            返回仪表板
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 聊天头部 */}
      <Header style={{
        background: '#fff',
        padding: '0 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleGoBack}
            style={{ marginRight: 16 }}
          />
          <Avatar icon={<UserOutlined />} style={{ marginRight: 12 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Title level={5} style={{ margin: 0, marginRight: 8 }}>
                {targetId}
              </Title>
              <StatusIndicator
                status={isActive ? 'connected' : 'disconnected'}
                size="small"
              />
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isActive ? '在线' : '离线'}
              {isTargetTyping && ' • 正在输入...'}
            </Text>
          </div>
        </div>
        
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {chatStats.messageCount} 条消息
          </Text>
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      </Header>
      
      {/* 聊天内容 */}
      <Content style={{
        padding: '16px',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* 消息列表 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: 16,
          padding: '0 8px'
        }}>
          {chatMessages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999'
            }}>
              <Text type="secondary">
                开始与 {targetId} 的对话吧！
              </Text>
            </div>
          ) : (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {chatMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === peerId}
                  onDownload={message.type === 'file' ? () => handleDownloadFile(message.fileId, message.fileName) : undefined}
                />
              ))}
              
              {/* 文件传输进度 */}
              {chatFileTransfers.map((transfer) => (
                <div key={transfer.id} style={{
                  padding: '12px',
                  background: '#fff',
                  borderRadius: 8,
                  border: '1px solid #d9d9d9',
                  marginBottom: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <FileOutlined style={{ marginRight: 8 }} />
                    <Text strong>{transfer.fileName}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({(transfer.fileSize / 1024 / 1024).toFixed(2)} MB)
                    </Text>
                  </div>
                  <Progress
                    percent={transfer.progress}
                    status={transfer.status === 'error' ? 'exception' : 'active'}
                    size="small"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {transfer.status === 'uploading' && '上传中...'}
                    {transfer.status === 'downloading' && '下载中...'}
                    {transfer.status === 'completed' && '传输完成'}
                    {transfer.status === 'error' && '传输失败'}
                  </Text>
                </div>
              ))}
              
              {/* 打字指示器 */}
              {isTargetTyping && (
                <div style={{
                  padding: '8px 12px',
                  background: '#f0f0f0',
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                  maxWidth: '60%'
                }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {targetId} 正在输入...
                  </Text>
                </div>
              )}
            </Space>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* 输入区域 */}
        <div style={{
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #d9d9d9',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, marginRight: 8 }}>
              <TextArea
                value={messageText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={isActive ? '输入消息...' : '连接已断开，无法发送消息'}
                disabled={!isActive}
                autoSize={{ minRows: 1, maxRows: 4 }}
                style={{ resize: 'none' }}
              />
            </div>
            <Space>
              <Upload
                beforeUpload={handleFileSelect}
                showUploadList={false}
                disabled={!isActive}
              >
                <Tooltip title="发送文件">
                  <Button
                    icon={<PaperClipOutlined />}
                    disabled={!isActive}
                  />
                </Tooltip>
              </Upload>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!messageText.trim() || !isActive}
              >
                发送
              </Button>
            </Space>
          </div>
          
          {!isActive && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                连接已断开
              </Text>
              <Button
                type="link"
                size="small"
                onClick={handleReconnect}
                style={{ padding: '0 4px' }}
              >
                重新连接
              </Button>
            </div>
          )}
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

export default ChatScreen