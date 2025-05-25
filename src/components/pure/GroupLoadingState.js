import React from 'react';
import styled from 'styled-components';
import { FiLoader } from 'react-icons/fi';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  height: 100%;
  text-align: center;
  color: #666;
`;

const LoadingIcon = styled.div`
  margin-bottom: 20px;
  color: #4a90e2;
  animation: rotate 1.5s linear infinite;
  
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  font-size: 16px;
  margin-bottom: 10px;
`;

const LoadingSubtext = styled.div`
  font-size: 14px;
  color: #999;
`;

const GroupLoadingState = ({ type }) => {
  const getLoadingMessage = () => {
    switch (type) {
      case 'connecting':
        return {
          text: '正在连接群组成员...',
          subtext: '这可能需要一些时间，尤其是对于大型群组'
        };
      case 'synchronizing':
        return {
          text: '正在同步群组数据...',
          subtext: '正在获取历史消息和成员信息'
        };
      case 'joining':
        return {
          text: '正在加入群组...',
          subtext: '正在建立连接并同步数据'
        };
      case 'creating':
        return {
          text: '正在创建群组...',
          subtext: '正在生成加密密钥和初始化群组'
        };
      default:
        return {
          text: '加载中...',
          subtext: '请稍候'
        };
    }
  };
  
  const message = getLoadingMessage();
  
  return (
    <LoadingContainer>
      <LoadingIcon>
        <FiLoader size={40} />
      </LoadingIcon>
      <LoadingText>{message.text}</LoadingText>
      <LoadingSubtext>{message.subtext}</LoadingSubtext>
    </LoadingContainer>
  );
};

export default GroupLoadingState; 