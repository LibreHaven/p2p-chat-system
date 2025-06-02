import React, { useEffect } from 'react'
import { notification } from 'antd'
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi'
import { useAppStore } from '../store'

// Enhanced Toast component using Ant Design notification
const Toast = () => {
  const isToastVisible = useAppStore((state) => state.isToastVisible)
  const toastMessage = useAppStore((state) => state.toastMessage)
  const toastType = useAppStore((state) => state.toastType)
  const hideToast = useAppStore((state) => state.hideToast)

  useEffect(() => {
    if (isToastVisible && toastMessage) {
      const config = {
        key: 'toast',
        message: getTitle(toastType),
        description: toastMessage,
        duration: 4.5,
        placement: 'topRight',
        icon: getIcon(toastType),
        style: {
          borderRadius: '8px',
        },
        onClose: () => hideToast()
      }

      switch (toastType) {
        case 'success':
          notification.success(config)
          break
        case 'error':
          notification.error(config)
          break
        case 'info':
          notification.info(config)
          break
        case 'warning':
        default:
          notification.warning(config)
          break
      }
      
      // 自动移除toast
      const timer = setTimeout(() => {
        hideToast()
      }, 4.5 * 1000)
      
      return () => {
        clearTimeout(timer)
        notification.destroy('toast') // 清理notification实例
      }
    }
  }, [isToastVisible, toastMessage, toastType, hideToast])

  return null // Ant Design notification handles the rendering
}

const getTitle = (type) => {
  switch (type) {
    case 'success':
      return '成功';
    case 'error':
      return '错误';
    case 'info':
      return '信息';
    case 'warning':
    default:
      return '警告';
  }
};

const getIcon = (type) => {
  switch (type) {
    case 'success':
      return <FiCheckCircle style={{ color: '#52c41a' }} />;
    case 'error':
      return <FiAlertCircle style={{ color: '#ff4d4f' }} />;
    case 'info':
      return <FiInfo style={{ color: '#1890ff' }} />;
    case 'warning':
    default:
      return <FiAlertCircle style={{ color: '#faad14' }} />;
  }
};

export default Toast;
