import React from 'react';
import styled from 'styled-components';

const BubbleContainer = styled.div`
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 18px;
  position: relative;
  word-wrap: break-word;
  margin-bottom: 8px;
  
  ${props => props.$isSelf ? `
    align-self: flex-end;
    background-color: #dcf8c6;
    border-bottom-right-radius: 5px;
  ` : `
    align-self: flex-start;
    background-color: white;
    border-bottom-left-radius: 5px;
  `}
  
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const MessageText = styled.div`
  font-size: 15px;
  color: #303030;
  white-space: pre-wrap;
`;

const MessageTime = styled.span`
  font-size: 11px;
  color: #999;
  display: block;
  margin-top: 5px;
  text-align: right;
`;

const MessageBubble = ({ message, isSelf }) => {
  // 格式化时间戳
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <BubbleContainer $isSelf={isSelf}>
      <MessageText>{message.text}</MessageText>
      <MessageTime>{formatTime(message.timestamp)}</MessageTime>
    </BubbleContainer>
  );
};

export default MessageBubble;
