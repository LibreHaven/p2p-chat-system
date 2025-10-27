import React from 'react';
import styled from 'styled-components';
import { FiSend } from 'react-icons/fi';
import { Input as AntInput, Button as AntButton } from 'antd';

const Container = styled.div`
  display: flex;
  padding: 15px;
  background-color: white;
  border-top: 1px solid #eee;
  gap: 10px;
`;

const StyledInput = styled(AntInput)`
  flex: 1;
  height: 46px;
  border-radius: 20px;
  font-size: 16px;
  
  &:focus {
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

const StyledButton = styled(AntButton)`
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.ant-btn-primary {
    background-color: #4a90e2;
    border-color: #4a90e2;
    
    &:hover {
      background-color: #3a80d2 !important;
      border-color: #3a80d2 !important;
      transform: scale(1.05);
    }
  }
  
  &:disabled {
    transform: none !important;
  }
`;

const MessageComposer = ({ value, onChange, onSend, disabled }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      e.preventDefault();
      onSend();
    }
  };

  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const handleSendClick = () => {
    if (!disabled && value.trim()) {
      onSend();
    }
  };

  return (
    <Container>
      <StyledInput
        value={value || ''}
        onChange={handleInputChange}
        onPressEnter={handleKeyPress}
        placeholder="输入消息..."
        disabled={disabled}
        maxLength={1000}
      />
      <StyledButton 
        type="primary"
        shape="circle"
        icon={<FiSend />}
        onClick={handleSendClick}
        disabled={!value?.trim() || disabled}
        title="发送消息"
      />
    </Container>
  );
};

export default MessageComposer;
