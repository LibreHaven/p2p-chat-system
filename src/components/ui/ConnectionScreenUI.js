import React from 'react';
import styled from 'styled-components';
import { FiLoader, FiCheck, FiX } from 'react-icons/fi';
import { Button as AntButton, Input as AntInput, Card as AntCard, Switch, Modal, Typography } from 'antd';
import StatusIndicator from '../StatusIndicator';
import CopyableId from '../CopyableId';
import Toast from '../Toast';

const { Title: AntTitle } = Typography;

// Styled Ant Design components to maintain original styling
const StyledButton = styled(AntButton)`
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 10px;
  border-radius: 4px;
  
  &.ant-btn-primary {
    background-color: #4a90e2;
    border-color: #4a90e2;
    
    &:hover {
      background-color: #3a80d2 !important;
      border-color: #3a80d2 !important;
    }
  }
  
  &:disabled {
    background-color: #cccccc !important;
    border-color: #cccccc !important;
    color: #666 !important;
  }
`;

const StyledInput = styled(AntInput)`
  height: 48px;
  font-size: 16px;
  border-radius: 4px;
  
  &:focus {
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

const StyledCard = styled(AntCard)`
  width: 100%;
  max-width: 500px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  
  .ant-card-body {
    padding: 30px;
  }
`;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 8px;
  }
  
  .ant-modal-header {
    border-radius: 8px 8px 0 0;
  }
`;

const StyledSwitch = styled(Switch)`
  &.ant-switch-checked {
    background-color: #2ecc71;
  }
`;

// 所有styled-components样式定义
const ConnectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 30px;
  width: 100%;
  max-width: 500px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
  text-align: center;
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 10px;
  &:hover {
    background-color: #3a80d2;
  }
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ConnectionRequestModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  padding: 20px;
  width: 90%;
  max-width: 400px;
`;

const ModalTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  text-align: center;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
`;

const AcceptButton = styled(Button)`
  background-color: #2ecc71;
  margin-right: 10px;
  &:hover {
    background-color: #27ae60;
  }
`;

const RejectButton = styled(Button)`
  background-color: #e74c3c;
  &:hover {
    background-color: #c0392b;
  }
`;

const EncryptionToggle = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  justify-content: space-between;
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const ToggleSwitch = styled.div`
  position: relative;
  width: 50px;
  height: 24px;
  background-color: ${props => props.$isChecked ? '#2ecc71' : '#ccc'};
  border-radius: 12px;
  transition: background-color 0.3s;
  margin-left: 10px;
  &:before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: white;
    top: 2px;
    left: ${props => props.$isChecked ? '28px' : '2px'};
    transition: left 0.3s;
  }
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

const ToggleText = styled.span`
  margin-left: 10px;
  font-size: 14px;
`;

const ConnectionScreenUI = ({
  peerId,
  targetId,
  connectionStatus,
  showConnectionRequest,
  incomingConnection,
  incomingPeerId,
  incomingUseEncryption,
  customIdError,
  targetIdError,
  useEncryption,
  isPeerCreated,
  waitingForAcceptance,
  showToast,
  toastMessage,
  onPeerIdChange,
  onTargetIdChange,
  onCreateConnection,
  onConnectToPeer,
  onAcceptConnection,
  onRejectConnection,
  onToggleEncryption,
  onGenerateRandomId
}) => {
  return (
    <ConnectionContainer>
      <StyledCard>
        <AntTitle level={2} style={{ textAlign: 'center', marginBottom: '20px' }}>P2P 聊天</AntTitle>
        <InputGroup>
          <Label>你的 ID</Label>
          <div style={{ display: 'flex' }}>
            <StyledInput
              value={peerId}
              onChange={(e) => onPeerIdChange(e.target.value)}
              placeholder="输入你的ID或使用随机ID"
              disabled={isPeerCreated}
              style={{ marginRight: '10px' }}
            />
            {!isPeerCreated && (
              <StyledButton onClick={onGenerateRandomId} style={{ width: 'auto', whiteSpace: 'nowrap', marginBottom: 0 }}>
                随机ID
              </StyledButton>
            )}
          </div>
          {customIdError && <div style={{ color: 'red', marginTop: '5px' }}>{customIdError}</div>}
        </InputGroup>
        
        {!isPeerCreated ? (
          <StyledButton type="primary" onClick={onCreateConnection} disabled={connectionStatus === 'connecting'} loading={connectionStatus === 'connecting'}>
            {connectionStatus === 'connecting' ? '连接中...' : '创建连接'}
          </StyledButton>
        ) : (
          <>
            <StatusIndicator status={connectionStatus} />
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <CopyableId id={peerId} />
            </div>
            
            <EncryptionToggle>
              <span>加密通信:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StyledSwitch 
                  checked={useEncryption} 
                  onChange={onToggleEncryption}
                />
                <span>{useEncryption ? '已启用' : '已禁用'}</span>
              </div>
            </EncryptionToggle>
            
            <InputGroup>
              <Label>连接到对方</Label>
              <StyledInput
                value={targetId}
                onChange={(e) => onTargetIdChange(e.target.value)}
                placeholder="输入对方的ID"
                disabled={waitingForAcceptance}
              />
              {targetIdError && <div style={{ color: 'red', marginTop: '5px' }}>{targetIdError}</div>}
            </InputGroup>
            
            <StyledButton 
              type="primary" 
              onClick={onConnectToPeer} 
              disabled={waitingForAcceptance || connectionStatus === 'connecting'}
              loading={waitingForAcceptance}
            >
              {waitingForAcceptance ? '等待对方接受...' : '连接'}
            </StyledButton>
          </>
        )}
      </StyledCard>
      
      <StyledModal
        title="连接请求"
        open={showConnectionRequest}
        onCancel={onRejectConnection}
        footer={[
          <StyledButton 
            key="reject" 
            onClick={onRejectConnection} 
            style={{ 
              width: 'auto', 
              marginRight: '8px', 
              marginBottom: 0,
              minWidth: '80px'
            }}
          >
            <FiX style={{ marginRight: '5px' }} />
            拒绝
          </StyledButton>,
          <StyledButton 
            key="accept" 
            type="primary" 
            onClick={onAcceptConnection} 
            style={{ 
              width: 'auto', 
              marginBottom: 0,
              minWidth: '80px'
            }}
          >
            <FiCheck style={{ marginRight: '5px' }} />
            接受
          </StyledButton>
        ]}
      >
        <p>{incomingPeerId} 请求与你建立连接</p>
        <p>加密通信: {incomingUseEncryption ? '已启用' : '已禁用'}</p>
      </StyledModal>
      
      {showToast && <Toast message={toastMessage} />}
    </ConnectionContainer>
  );
};

export default ConnectionScreenUI;