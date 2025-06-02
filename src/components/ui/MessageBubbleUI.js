import React from 'react';
import styled from 'styled-components';
import { Card as AntCard, Typography } from 'antd';

const { Text } = Typography;

const StyledCard = styled(AntCard)`
  max-width: 70%;
  margin-bottom: 8px;
  border-radius: 18px;
  position: relative;
  word-wrap: break-word;
  
  ${props => props.$isSelf ? `
    align-self: flex-end;
    background-color: #dcf8c6;
    border-bottom-right-radius: 5px;
  ` : `
    align-self: flex-start;
    background-color: white;
    border-bottom-left-radius: 5px;
  `}
  
  .ant-card-body {
    padding: 10px 15px;
  }
  
  .ant-card-bordered {
    border: none;
  }
`;

const MessageTime = styled.span`
  font-size: 11px;
  color: #999;
  display: block;
  margin-top: 5px;
  text-align: right;
`;

const MessageBubbleUI = ({ message, isSelf, formatTime }) => {
  return (
    <StyledCard $isSelf={isSelf} size="small" bordered={false}>
      <Text style={{ fontSize: '15px', color: '#303030', whiteSpace: 'pre-wrap' }}>
        {message.content}
      </Text>
      <MessageTime>{formatTime(message.timestamp)}</MessageTime>
    </StyledCard>
  );
};

export default MessageBubbleUI;