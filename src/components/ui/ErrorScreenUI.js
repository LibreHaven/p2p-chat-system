import React from 'react';
import styled from 'styled-components';
import { FiAlertTriangle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import { Alert, Button as AntButton, Card as AntCard, Typography } from 'antd';

const { Title } = Typography;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
`;

const StyledCard = styled(AntCard)`
  width: 100%;
  max-width: 500px;
  text-align: center;
  
  .ant-card-body {
    padding: 30px;
  }
`;

const StyledButton = styled(AntButton)`
  height: 40px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &.ant-btn-primary {
    background-color: #4a90e2;
    border-color: #4a90e2;
    
    &:hover {
      background-color: #3a80d2 !important;
      border-color: #3a80d2 !important;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
`;

const ErrorIcon = styled.div`
  color: #e74c3c;
  font-size: 48px;
  margin-bottom: 20px;
`;

const ErrorScreenUI = ({
  errorMessage,
  targetId,
  onRetryConnection,
  onBackToConnection
}) => {
  return (
    <ErrorContainer>
      <StyledCard>
        <ErrorIcon>
          <FiAlertTriangle />
        </ErrorIcon>
        <Title level={2} style={{ color: '#e74c3c', marginBottom: '10px' }}>
          连接失败
        </Title>
        <Alert
          message={errorMessage || `无法连接到 ${targetId || '目标用户'}，请检查网络连接或稍后重试。`}
          type="error"
          showIcon={false}
          style={{ marginBottom: '20px', textAlign: 'left' }}
        />
        <ButtonGroup>
          <StyledButton 
            type="primary" 
            icon={<FiRefreshCw />}
            onClick={onRetryConnection}
          >
            重试连接
          </StyledButton>
          <StyledButton 
            icon={<FiArrowLeft />}
            onClick={onBackToConnection}
          >
            返回连接界面
          </StyledButton>
        </ButtonGroup>
      </StyledCard>
    </ErrorContainer>
  );
};

export default ErrorScreenUI;