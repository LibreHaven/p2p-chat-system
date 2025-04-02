import React, { useState } from 'react';
import styled from 'styled-components';
import { FiX } from 'react-icons/fi';

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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #eee;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #666;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
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

const JoinButton = styled(Button)`
  background-color: #4a90e2;
  border: 1px solid #4a90e2;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #3a80d2;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #444;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

const InfoMessage = styled.div`
  padding: 12px;
  background-color: #e8f4fd;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #2c7cb0;
  line-height: 1.5;
`;

const ErrorMessage = styled.div`
  color: #e57373;
  font-size: 14px;
  margin-top: 10px;
  padding: 10px;
  background-color: #ffefef;
  border-radius: 4px;
`;

const JoinGroupModal = ({ onClose, onJoin }) => {
  const [peerId, setPeerId] = useState('');
  const [error, setError] = useState('');
  
  const handleJoin = () => {
    // 输入验证
    if (!peerId.trim()) {
      setError('请输入群主或管理员ID');
      return;
    }
    
    // 请求加入群组
    onJoin(peerId);
  };
  
  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>加入群组</ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </ModalHeader>
        
        <ModalBody>
          <InfoMessage>
            加入群组需要邀请。请输入群主或管理员的ID，然后向他们发送加入请求。
          </InfoMessage>
          
          <FormGroup>
            <Label htmlFor="peer-id">群主/管理员ID</Label>
            <Input
              id="peer-id"
              value={peerId}
              onChange={(e) => setPeerId(e.target.value)}
              placeholder="输入群主或管理员的ID"
            />
          </FormGroup>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </ModalBody>
        
        <ModalFooter>
          <CancelButton onClick={onClose}>取消</CancelButton>
          <JoinButton onClick={handleJoin}>请求加入</JoinButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default JoinGroupModal; 