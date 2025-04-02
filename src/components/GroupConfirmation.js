import React from 'react';
import styled from 'styled-components';
import { FiUserPlus, FiUsers, FiCheck, FiX } from 'react-icons/fi';

const ConfirmationContainer = styled.div`
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

const ConfirmationBox = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ConfirmationHeader = styled.div`
  background-color: #f5f5f5;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
`;

const ConfirmationTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TitleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a90e2;
`;

const ConfirmationBody = styled.div`
  padding: 20px;
`;

const ConfirmationText = styled.p`
  margin: 0 0 15px 0;
  line-height: 1.5;
  color: #555;
`;

const InfoBox = styled.div`
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 12px 15px;
  margin-bottom: 15px;
`;

const InfoItem = styled.div`
  display: flex;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.div`
  width: 80px;
  font-weight: 500;
  color: #666;
`;

const InfoValue = styled.div`
  flex: 1;
  color: #333;
`;

const ConfirmationFooter = styled.div`
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

const RejectButton = styled(Button)`
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
  color: #e53935;
  
  &:hover:not(:disabled) {
    background-color: #ffcdd2;
  }
`;

const AcceptButton = styled(Button)`
  background-color: #e8f5e9;
  border: 1px solid #c8e6c9;
  color: #2e7d32;
  
  &:hover:not(:disabled) {
    background-color: #c8e6c9;
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

const GroupConfirmation = ({
  type, // 'invite' | 'join-request'
  data = {},
  onAccept,
  onReject,
  onClose
}) => {
  return (
    <ConfirmationContainer>
      <ConfirmationBox>
        <ConfirmationHeader>
          <ConfirmationTitle>
            <TitleIcon>
              {type === 'invite' ? <FiUserPlus size={20} /> : <FiUsers size={20} />}
            </TitleIcon>
            {type === 'invite' ? '群组邀请' : '加入群组请求'}
          </ConfirmationTitle>
        </ConfirmationHeader>
        
        <ConfirmationBody>
          <ConfirmationText>
            {type === 'invite' 
              ? `${data.inviterName || data.inviterId} 邀请您加入群组 "${data.groupName}"`
              : `${data.requesterName || data.requesterId} 请求加入您管理的群组 "${data.groupName}"`
            }
          </ConfirmationText>
          
          <InfoBox>
            <InfoItem>
              <InfoLabel>群组名称:</InfoLabel>
              <InfoValue>{data.groupName}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>群组类型:</InfoLabel>
              <InfoValue>{data.groupType === 'small' ? '小型群组' : '大型群组'}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>成员数量:</InfoLabel>
              <InfoValue>{data.memberCount || 0}人</InfoValue>
            </InfoItem>
            {type === 'invite' && (
              <InfoItem>
                <InfoLabel>邀请者:</InfoLabel>
                <InfoValue>{data.inviterName || data.inviterId}</InfoValue>
              </InfoItem>
            )}
            {type === 'join-request' && (
              <InfoItem>
                <InfoLabel>请求者:</InfoLabel>
                <InfoValue>{data.requesterName || data.requesterId}</InfoValue>
              </InfoItem>
            )}
          </InfoBox>
        </ConfirmationBody>
        
        <ConfirmationFooter>
          {type === 'invite' ? (
            <>
              <RejectButton onClick={onReject}>
                <FiX size={16} />
                拒绝邀请
              </RejectButton>
              <AcceptButton onClick={onAccept}>
                <FiCheck size={16} />
                接受邀请
              </AcceptButton>
            </>
          ) : (
            <>
              <RejectButton onClick={onReject}>
                <FiX size={16} />
                拒绝请求
              </RejectButton>
              <AcceptButton onClick={onAccept}>
                <FiCheck size={16} />
                接受请求
              </AcceptButton>
            </>
          )}
        </ConfirmationFooter>
      </ConfirmationBox>
    </ConfirmationContainer>
  );
};

export default GroupConfirmation; 