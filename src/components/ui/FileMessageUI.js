import React from 'react';
import styled from 'styled-components';
import { FiFile, FiImage, FiVideo } from 'react-icons/fi';
import { Typography, Progress, Button as AntButton } from 'antd';

const FileBubble = styled.div`
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 18px;
  margin-bottom: 10px;
  word-wrap: break-word;
  align-self: ${props => props.$isSelf ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.$isSelf ? '#dcf8c6' : '#f1f0f0'};
  color: ${props => props.$isSelf ? '#303030' : '#303030'};
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const FileContent = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 5px;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;

const FileIcon = styled.div`
  margin-right: 10px;
  font-size: 24px;
`;

// 移除未使用的 FileName/FileSize，改用 Ant Typography.Text 统一文本样式

const FilePreview = styled.div`
  margin-top: 10px;
  max-width: 100%;
  max-height: 200px;
  overflow: hidden;
`;

const FilePreviewImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 4px;
`;

const FilePreviewVideo = styled.video`
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 4px;
`;

const StyledButton = styled(AntButton)`
  margin-top: 8px;
`;

const ProgressText = styled.div`
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  text-align: center;
  margin-top: 4px;
`;

const MessageTime = styled.span`
  font-size: 11px;
  color: #999;
  display: block;
  margin-top: 5px;
  text-align: right;
`;

const { Text } = Typography;

const FileMessageUI = ({ message, isSelf, formatTime, formatFileSize, progress = 0 }) => {
  // 文件消息的内容是一个对象，包含文件信息
  const file = message.content;
  const isReceiving = message.isFileReceiving;
  
  return (
    <FileBubble $isSelf={isSelf}>
      <FileContent>
        <FileInfo>
          <FileIcon>
            {file.fileType?.startsWith('image/') ? <FiImage /> :
             file.fileType?.startsWith('video/') ? <FiVideo /> : <FiFile />}
          </FileIcon>
          <div>
            <Text strong style={{ fontSize: '14px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
              {file.fileName}
            </Text>
            <Text style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)' }}>
              {formatFileSize(file.fileSize)}
            </Text>
          </div>
        </FileInfo>
        
        {isReceiving && (
          <>
            <Progress percent={progress} size="small" style={{ margin: '8px 0' }} />
            <ProgressText>接收中... {progress}%</ProgressText>
          </>
        )}
        
        {!isReceiving && file.url && (
          <FilePreview>
            {file.fileType?.startsWith('image/') && (
              <FilePreviewImage src={file.url} alt={file.fileName} />
            )}
            {file.fileType?.startsWith('video/') && (
              <FilePreviewVideo controls>
                <source src={file.url} type={file.fileType} />
                您的浏览器不支持视频标签。
              </FilePreviewVideo>
            )}
            <StyledButton 
              type="primary"
              size="small"
              href={file.url}
              download={file.fileName}
            >
              下载文件
            </StyledButton>
          </FilePreview>
        )}
      </FileContent>
      <MessageTime>{formatTime(message.timestamp)}</MessageTime>
    </FileBubble>
  );
};

export default FileMessageUI;
