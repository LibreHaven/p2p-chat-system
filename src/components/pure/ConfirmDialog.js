import React from 'react';
import styled from 'styled-components';
import { FiAlertTriangle, FiCheck, FiX } from 'react-icons/fi';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 20px;
  background-color: ${props => props.$danger ? '#ffebee' : '#f5f5f5'};
  border-bottom: 1px solid ${props => props.$danger ? '#ffcdd2' : '#eee'};
`;

const AlertIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$danger ? '#e53935' : '#ff9800'};
`;

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const Message = styled.p`
  margin: 0;
  line-height: 1.5;
  color: #555;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 15px 20px;
  border-top: 1px solid #eee;
  gap: 10px;
`;

const Button = styled.button`
  padding: 10px 15px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  color: #666;
  
  &:hover:not(:disabled) {
    background-color: #e8e8e8;
  }
`;

const ConfirmButton = styled(Button)`
  background-color: ${props => props.$danger ? '#ffebee' : '#e8f5e9'};
  border: 1px solid ${props => props.$danger ? '#ffcdd2' : '#c8e6c9'};
  color: ${props => props.$danger ? '#e53935' : '#2e7d32'};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.$danger ? '#ffcdd2' : '#c8e6c9'};
  }
`;

const ConfirmDialog = ({
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  isDanger = false,
  onConfirm,
  onCancel
}) => {
  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader $danger={isDanger}>
          <AlertIcon $danger={isDanger}>
            <FiAlertTriangle size={20} />
          </AlertIcon>
          <Title>{title}</Title>
        </ModalHeader>
        
        <ModalBody>
          <Message>{message}</Message>
        </ModalBody>
        
        <ModalFooter>
          <CancelButton onClick={onCancel}>
            <FiX size={16} />
            {cancelText}
          </CancelButton>
          <ConfirmButton $danger={isDanger} onClick={onConfirm}>
            <FiCheck size={16} />
            {confirmText}
          </ConfirmButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default ConfirmDialog; 