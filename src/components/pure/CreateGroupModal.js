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

const CreateButton = styled(Button)`
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

const InputHelper = styled.div`
  margin-top: 5px;
  font-size: 12px;
  color: #888;
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const RadioOption = styled.div`
  display: flex;
  align-items: flex-start;
`;

const Radio = styled.input`
  margin-top: 3px;
  margin-right: 8px;
`;

const RadioLabel = styled.label`
  font-size: 14px;
  color: #444;
`;

const RadioDescription = styled.div`
  margin-top: 4px;
  font-size: 12px;
  color: #888;
`;

const SwitchContainer = styled.div`
  display: flex;
  align-items: flex-start;
`;

const Switch = styled.input`
  margin-top: 3px;
  margin-right: 8px;
`;

const SwitchLabel = styled.label`
  font-size: 14px;
  color: #444;
`;

const SwitchDescription = styled.div`
  margin-top: 4px;
  font-size: 12px;
  color: ${props => props.warning ? '#e57373' : '#888'};
`;

const ErrorMessage = styled.div`
  color: #e57373;
  font-size: 14px;
  margin-top: 10px;
  padding: 10px;
  background-color: #ffefef;
  border-radius: 4px;
`;

const CreateGroupModal = ({ onClose, onCreate }) => {
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('small');
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [error, setError] = useState('');
  
  const handleCreate = () => {
    // 输入验证
    if (!groupName.trim()) {
      setError('请输入群组名称');
      return;
    }
    
    // 创建群组
    onCreate({
      name: groupName,
      type: groupType,
      settings: {
        encryptionEnabled,
        allowFiles: true,
        joinMode: 'invite_only'
      }
    });
  };
  
  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>创建新群组</ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </ModalHeader>
        
        <ModalBody>
          <FormGroup>
            <Label htmlFor="group-name">群组名称</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="请输入群组名称"
              maxLength={20}
            />
            <InputHelper>
              最多20个字符
            </InputHelper>
          </FormGroup>
          
          <FormGroup>
            <Label>群组类型</Label>
            <RadioGroup>
              <RadioOption>
                <Radio
                  type="radio"
                  name="group-type"
                  checked={groupType === 'small'}
                  onChange={() => setGroupType('small')}
                />
                <RadioLabel>
                  小型群组 (≤20人)
                  <RadioDescription>
                    所有成员直接连接，适合小型团队
                  </RadioDescription>
                </RadioLabel>
              </RadioOption>
              
              <RadioOption>
                <Radio
                  type="radio"
                  name="group-type"
                  checked={groupType === 'large'}
                  onChange={() => setGroupType('large')}
                />
                <RadioLabel>
                  大型群组 (≤200人)
                  <RadioDescription>
                    混合网络结构，适合大型社区
                  </RadioDescription>
                </RadioLabel>
              </RadioOption>
            </RadioGroup>
          </FormGroup>
          
          <FormGroup>
            <Label>加密设置</Label>
            <SwitchContainer>
              <Switch
                type="checkbox"
                checked={encryptionEnabled}
                onChange={() => setEncryptionEnabled(!encryptionEnabled)}
              />
              <SwitchLabel>
                端到端加密
                <SwitchDescription warning={!encryptionEnabled}>
                  {encryptionEnabled ? 
                    '群聊中的所有消息将被加密' : 
                    '警告：禁用加密将导致消息以明文传输'}
                </SwitchDescription>
              </SwitchLabel>
            </SwitchContainer>
          </FormGroup>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </ModalBody>
        
        <ModalFooter>
          <CancelButton onClick={onClose}>取消</CancelButton>
          <CreateButton onClick={handleCreate}>创建群组</CreateButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default CreateGroupModal; 