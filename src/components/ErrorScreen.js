import React from 'react';
import styled from 'styled-components';
import { FiAlertTriangle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 30px;
  width: 100%;
  max-width: 500px;
  text-align: center;
`;

const ErrorIcon = styled.div`
  color: #e74c3c;
  font-size: 48px;
  margin-bottom: 20px;
`;

const ErrorTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 10px;
  color: #e74c3c;
`;

const ErrorDescription = styled.p`
  font-size: 16px;
  margin-bottom: 30px;
  color: #666;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  
  ${props => props.$primary ? `
    background-color: #4a90e2;
    color: white;
  ` : `
    background-color: #f0f0f0;
    color: #333;
  `}
`;

const ErrorScreen = ({
  errorMessage,
  resetConnection,
  targetId,
  setConnectionStatus,
  setConnection,
  setScreen,
  setErrorMessage
}) => {
  // Retry connection
  const retryConnection = () => {
    // 重置连接状态并返回连接界面
    setConnectionStatus('connecting');
    setScreen('connection');
    
    // 如果有目标ID，则使用resetConnection函数重新初始化连接
    // 注意：不再使用DOM查询，而是使用React状态和属性
    if (resetConnection) {
      setTimeout(() => {
        resetConnection();
      }, 500);
    }
  };

  // Get specific error message based on error type
  const getErrorDetails = () => {
    if (errorMessage.includes('not exist') || errorMessage.includes('找不到')) {
      return '请检查您输入的 ID 是否正确。';
    } else if (errorMessage.includes('offline') || errorMessage.includes('不在线')) {
      return '请确认对方已启动应用并在线。';
    } else if (errorMessage.includes('NAT') || errorMessage.includes('穿透')) {
      return '您的网络环境可能阻止了 P2P 连接，请尝试使用更开放的网络环境。';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return '连接请求超时，请检查网络状况后重试。';
    }
    return '请检查网络连接或稍后再试。';
  };

  return (
    <ErrorContainer>
      <Card>
        <ErrorIcon>
          <FiAlertTriangle />
        </ErrorIcon>
        <ErrorTitle>连接失败</ErrorTitle>
        <ErrorDescription>
          {errorMessage}
          <br />
          <br />
          {getErrorDetails()}
        </ErrorDescription>
        <ButtonGroup>
          <Button onClick={resetConnection}>
            <FiArrowLeft /> 返回主界面
          </Button>
          <Button $primary onClick={retryConnection}>
            <FiRefreshCw /> 重试连接
          </Button>
        </ButtonGroup>
      </Card>
    </ErrorContainer>
  );
};

export default ErrorScreen;
