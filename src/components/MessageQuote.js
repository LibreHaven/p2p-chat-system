import React from 'react';
import styled from 'styled-components';
import { FiCornerUpLeft } from 'react-icons/fi';

const QuoteContainer = styled.div`
  margin-bottom: 8px;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.03);
  border-left: 3px solid #4a90e2;
  border-radius: 0 4px 4px 0;
  font-size: 0.9em;
  color: #666;
`;

const QuoteHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-weight: 500;
  color: #4a90e2;
`;

const QuoteIcon = styled.div`
  margin-right: 5px;
  display: flex;
  align-items: center;
`;

const QuoteAuthor = styled.span`
  font-weight: 500;
`;

const QuoteContent = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const MessageQuote = ({ quotedMessage, members = [] }) => {
  // 查找引用消息作者的信息
  const author = members.find(m => m.peerId === quotedMessage.sender);
  const authorName = author ? author.displayName : quotedMessage.sender.substring(0, 8);
  
  // 格式化引用内容
  const renderQuotedContent = () => {
    switch (quotedMessage.type) {
      case 'text':
        return quotedMessage.content;
      case 'image':
        return '[图片]';
      case 'file':
        return `[文件: ${quotedMessage.metadata.fileName || '未命名文件'}]`;
      case 'video':
        return '[视频]';
      case 'system':
        return messageService.formatSystemMessage(quotedMessage);
      default:
        return '[未知消息类型]';
    }
  };
  
  return (
    <QuoteContainer>
      <QuoteHeader>
        <QuoteIcon>
          <FiCornerUpLeft size={12} />
        </QuoteIcon>
        <QuoteAuthor>{authorName}</QuoteAuthor>
      </QuoteHeader>
      <QuoteContent>{renderQuotedContent()}</QuoteContent>
    </QuoteContainer>
  );
};

export default MessageQuote; 