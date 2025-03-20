import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { FiCheck, FiX, FiLoader } from 'react-icons/fi';

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 4px;
  background-color: ${props => {
    switch (props.status) {
      case 'connected': return '#e6f7e6';
      case 'connecting': return '#fff8e6';
      case 'failed': return '#ffebee';
      default: return '#f5f5f5';
    }
  }};
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 10px;
  color: ${props => {
    switch (props.status) {
      case 'connected': return '#2ecc71';
      case 'connecting': return '#f39c12';
      case 'failed': return '#e74c3c';
      default: return '#95a5a6';
    }
  }};
  
  ${props => props.status === 'connecting' && css`
    animation: ${rotate} 1.5s linear infinite;
  `}
`;

const StatusText = styled.span`
  font-size: 14px;
  color: ${props => {
    switch (props.status) {
      case 'connected': return '#27ae60';
      case 'connecting': return '#d35400';
      case 'failed': return '#c0392b';
      default: return '#7f8c8d';
    }
  }};
`;

const StatusIndicator = ({ status }) => {
  const renderIcon = () => {
    switch (status) {
      case 'connected':
        return <FiCheck />;
      case 'connecting':
        return <FiLoader />;
      case 'failed':
        return <FiX />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'disconnected':
        return '未连接';
      case 'connecting':
        return '连接中...';
      case 'connected':
        return '已连接';
      case 'failed':
        return '连接失败';
      default:
        return '未知状态';
    }
  };

  return (
    <Container status={status}>
      <IconWrapper status={status}>
        {renderIcon()}
      </IconWrapper>
      <StatusText status={status}>
        {getStatusText()}
      </StatusText>
    </Container>
  );
};

export default StatusIndicator;
