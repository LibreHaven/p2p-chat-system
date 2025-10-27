import React from 'react';
import styled from 'styled-components';
import { FiX } from 'react-icons/fi';
import { Card as AntCard, Button as AntButton, Image as AntImage, Typography } from 'antd';

const { Text } = Typography;

const StyledCard = styled(AntCard)`
  margin-top: 10px;
  display: ${props => props.$visible ? 'block' : 'none'};
  
  .ant-card-head {
    padding: 10px 15px;
    min-height: auto;
  }
  
  .ant-card-body {
    padding: 10px 15px;
  }
`;

const StyledButton = styled(AntButton)`
  &.ant-btn-text {
    color: #e74c3c;
    
    &:hover {
      color: #c0392b !important;
      background-color: rgba(231, 76, 60, 0.1) !important;
    }
  }
`;

const FilePreviewContent = styled.div`
  margin-bottom: 10px;
`;

// 移除未使用的 FilePreviewText

const FilePreviewInfo = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
`;

const FilePreviewButton = styled.button`
  padding: 8px 16px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: #3a80d2;
  }
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const FilePreviewUI = ({
  file,
  visible,
  onClose,
  onSend,
  disabled,
  formatFileSize
}) => {
  if (!file) return null;
  
  return (
    <StyledCard 
      $visible={visible}
      size="small"
      title={
        <Text strong ellipsis style={{ maxWidth: '80%' }}>
          {file?.name}
        </Text>
      }
      extra={
        <StyledButton 
          type="text" 
          icon={<FiX />} 
          onClick={onClose}
          size="small"
        />
      }
    >
      <FilePreviewContent>
        {/* 图片预览 */}
        {file?.type?.startsWith('image/') && (
          <AntImage 
            src={file.preview} 
            alt={file.name}
            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }}
            onError={() => console.error('Image preview failed')}
          />
        )}
        
        {/* 视频预览 */}
        {file?.type?.startsWith('video/') && (
          <video 
            controls
            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }}
            onError={() => console.error('Video preview failed')}
          >
            <source src={file.preview} type={file.type} />
            您的浏览器不支持视频标签。
          </video>
        )}
        
        <FilePreviewInfo>
          文件大小: {formatFileSize(file.size)}
        </FilePreviewInfo>
        <FilePreviewButton onClick={onSend} disabled={disabled}>
          发送文件
        </FilePreviewButton>
      </FilePreviewContent>
    </StyledCard>
  );
};

export default FilePreviewUI;