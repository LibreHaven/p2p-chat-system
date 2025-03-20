import React from 'react';
import styled from 'styled-components';
import { FiCopy } from 'react-icons/fi';

const Container = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  border: 1px dashed #ccc;
`;

const IdText = styled.span`
  flex: 1;
  font-family: monospace;
  font-size: 16px;
  user-select: all;
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  color: #4a90e2;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s ease;
  
  &:hover {
    color: #2a70c2;
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const CopyNotification = styled.div`
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const CopyableId = ({ id, onCopy }) => {
  const [showCopied, setShowCopied] = React.useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
    if (onCopy) onCopy();
  };
  
  return (
    <Container style={{ position: 'relative' }}>
      <CopyNotification visible={showCopied}>已复制到剪贴板!</CopyNotification>
      <IdText>{id}</IdText>
      <CopyButton onClick={handleCopy} title="复制到剪贴板">
        <FiCopy />
      </CopyButton>
    </Container>
  );
};

export default CopyableId;
