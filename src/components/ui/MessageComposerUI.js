import React from 'react';
import styled from 'styled-components';
import { FiSend, FiFile, FiImage, FiVideo } from 'react-icons/fi';
import { Button as AntButton, Input as AntInput, Tooltip } from 'antd';

// Styled Ant Design components for message composer
const StyledMessageInput = styled(AntInput)`
  height: 46px;
  border-radius: 20px;
  font-size: 16px;
  
  &:focus {
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
  
  &:disabled {
    background-color: #f5f5f5;
  }
`;

const StyledSendButton = styled(AntButton)`
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
    background-color: #cccccc !important;
    border-color: #cccccc !important;
    transform: none !important;
  }
`;

const StyledFileButton = styled(AntButton)`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: #e9ecef;
  }
  
  &:disabled {
    background-color: #f8f9fa !important;
    color: #6c757d !important;
    border-color: #dee2e6 !important;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;
  background-color: white;
  border-top: 1px solid #eee;
`;

const InputContainer = styled.div`
  display: flex;
  margin-top: 10px;
`;


const FileInputContainer = styled.div`
  display: flex;
  margin-bottom: 10px;
`;

// 移除未使用的旧版样式组件（MessageInput/SendButton/FileButton），统一使用 Styled* 版本

const HiddenFileInput = styled.input`
  display: none;
`;

const MessageComposerUI = ({
  value,
  onChange,
  onSend,
  disabled,
  onFileSelect,
  fileInputRef,
  imageInputRef,
  videoInputRef
}) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      onSend();
    }
  };

  return (
    <Container>
      <FileInputContainer>
        <Tooltip title="发送文件">
          <StyledFileButton 
            onClick={() => fileInputRef.current.click()} 
            disabled={disabled}
            icon={<FiFile />}
          />
        </Tooltip>
        <Tooltip title="发送图片">
          <StyledFileButton 
            onClick={() => imageInputRef.current.click()} 
            disabled={disabled}
            icon={<FiImage />}
          />
        </Tooltip>
        <Tooltip title="发送视频">
          <StyledFileButton 
            onClick={() => videoInputRef.current.click()} 
            disabled={disabled}
            icon={<FiVideo />}
          />
        </Tooltip>
        <HiddenFileInput type="file" ref={fileInputRef} onChange={onFileSelect} />
        <HiddenFileInput type="file" ref={imageInputRef} accept="image/*" onChange={onFileSelect} />
        <HiddenFileInput type="file" ref={videoInputRef} accept="video/*" onChange={onFileSelect} />
      </FileInputContainer>
      <InputContainer>
        <StyledMessageInput
          placeholder="输入消息..."
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          style={{ marginRight: '10px' }}
        />
        <Tooltip title="发送消息">
          <StyledSendButton 
            type="primary"
            onClick={onSend} 
            disabled={!value.trim() || disabled}
            icon={<FiSend size={20} />}
          />
        </Tooltip>
      </InputContainer>
    </Container>
  );
};

export default MessageComposerUI;