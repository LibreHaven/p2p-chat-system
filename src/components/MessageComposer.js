import React from 'react';
import styled from 'styled-components';
import { FiSend } from 'react-icons/fi';

const Container = styled.div`
  display: flex;
  padding: 15px;
  background-color: white;
  border-top: 1px solid #eee;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s;
  
  &:focus {
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
  
  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 50%;
  width: 46px;
  height: 46px;
  margin-left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background-color: #3a80d2;
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const MessageComposer = ({ value, onChange, onSend, disabled }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      onSend();
    }
  };

  return (
    <Container>
      <MessageInput
        type="text"
        placeholder="输入消息..."
        value={value}
        onChange={onChange}
        onKeyPress={handleKeyPress}
        disabled={disabled}
      />
      <SendButton 
        onClick={onSend} 
        disabled={!value.trim() || disabled}
        title="发送消息"
      >
        <FiSend size={20} />
      </SendButton>
    </Container>
  );
};

export default MessageComposer;
