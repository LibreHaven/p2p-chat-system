import React from 'react';
import styled from 'styled-components';
import { FiCheck, FiX, FiLoader } from 'react-icons/fi';
import { Tag, Spin } from 'antd';

// Styled Ant Design components for status indicator
const StyledTag = styled(Tag)`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  
  .anticon {
    margin-right: 6px;
  }
`;

// 移除未使用的容器/图标包装/文本样式，保留标签展示即可

const StatusIndicator = ({ status }) => {
  const getTagProps = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'success',
          icon: <FiCheck />,
          text: '已连接'
        };
      case 'connecting':
        return {
          color: 'processing',
          icon: <Spin size="small" indicator={<FiLoader />} />,
          text: '连接中...'
        };
      case 'failed':
        return {
          color: 'error',
          icon: <FiX />,
          text: '连接失败'
        };
      case 'disconnected':
        return {
          color: 'default',
          icon: null,
          text: '未连接'
        };
      default:
        return {
          color: 'default',
          icon: null,
          text: '未知状态'
        };
    }
  };

  const { color, icon, text } = getTagProps();

  return (
    <StyledTag color={color}>
      {icon && <span style={{ marginRight: '6px' }}>{icon}</span>}
      {text}
    </StyledTag>
  );
};

export default StatusIndicator;
