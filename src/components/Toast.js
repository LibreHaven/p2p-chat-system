import React, { useEffect } from 'react';
import { notification } from 'antd';
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

// Enhanced Toast component using Ant Design notification
const Toast = ({ message, type = 'warning', visible = false, duration = 4.5 }) => {
  useEffect(() => {
    if (visible && message) {
      const config = {
        message: getTitle(type),
        description: message,
        duration: duration,
        placement: 'topRight',
        icon: getIcon(type),
        style: {
          borderRadius: '8px',
        }
      };

      switch (type) {
        case 'success':
          notification.success(config);
          break;
        case 'error':
          notification.error(config);
          break;
        case 'info':
          notification.info(config);
          break;
        case 'warning':
        default:
          notification.warning(config);
          break;
      }
    }
  }, [visible, message, type, duration]);

  return null; // Ant Design notification handles the rendering
};

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
