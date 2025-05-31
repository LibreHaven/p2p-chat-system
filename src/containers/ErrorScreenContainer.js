import React from 'react';
import ErrorScreenUI from '../components/ui/ErrorScreenUI';

const ErrorScreenContainer = ({
  errorMessage,
  targetId,
  resetConnection,
  setConnectionStatus,
  setScreen,
  setErrorMessage
}) => {
  // 处理重试连接的业务逻辑
  const handleRetryConnection = () => {
    // 重置连接状态并返回连接界面
    setConnectionStatus('connecting');
    setScreen('connection');
    
    // 如果有目标ID，则使用resetConnection函数重新初始化连接
    if (resetConnection) {
      setTimeout(() => {
        resetConnection();
      }, 500);
    }
  };

  // 处理返回连接界面的业务逻辑
  const handleBackToConnection = () => {
    // 清除错误信息并返回连接界面
    setErrorMessage('');
    setScreen('connection');
    
    // 重置连接相关状态
    if (resetConnection) {
      resetConnection();
    }
  };

  // 根据错误类型生成详细的错误信息
  const getDetailedErrorMessage = () => {
    if (!errorMessage) {
      return `无法连接到 ${targetId || '目标用户'}，请检查网络连接或稍后重试。`;
    }

    let detailedMessage = errorMessage;
    
    if (errorMessage.includes('not exist') || errorMessage.includes('找不到')) {
      detailedMessage += '\n\n请检查您输入的 ID 是否正确。';
    } else if (errorMessage.includes('offline') || errorMessage.includes('不在线')) {
      detailedMessage += '\n\n请确认对方已启动应用并在线。';
    } else if (errorMessage.includes('NAT') || errorMessage.includes('穿透')) {
      detailedMessage += '\n\n您的网络环境可能阻止了 P2P 连接，请尝试使用更开放的网络环境。';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      detailedMessage += '\n\n连接请求超时，请检查网络状况后重试。';
    } else {
      detailedMessage += '\n\n请检查网络连接或稍后再试。';
    }

    return detailedMessage;
  };

  return (
    <ErrorScreenUI
      errorMessage={getDetailedErrorMessage()}
      targetId={targetId}
      onRetryConnection={handleRetryConnection}
      onBackToConnection={handleBackToConnection}
    />
  );
};

export default ErrorScreenContainer;