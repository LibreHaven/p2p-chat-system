import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiArrowLeft, FiEdit, FiCheck, FiX, FiTrash2, FiUserPlus } from 'react-icons/fi';

const ManagementContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f9f9f9;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 15px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #333;
  }
`;

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const Section = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow: hidden;
`;

const SectionTitle = styled.h4`
  margin: 0;
  padding: 15px 20px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #eee;
  font-size: 16px;
  color: #333;
`;

const InfoItem = styled.div`
  display: flex;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.div`
  width: 100px;
  font-weight: 500;
  color: #666;
`;

const InfoValue = styled.div`
  flex: 1;
  color: #333;
`;

const InfoInput = styled.input`
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

const EditButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  margin-left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #333;
  }
`;

const SaveButton = styled(EditButton)`
  color: #4caf50;
  
  &:hover {
    color: #388e3c;
  }
`;

const CancelButton = styled(EditButton)`
  color: #f44336;
  
  &:hover {
    color: #d32f2f;
  }
`;

const EncryptionEnabled = styled.span`
  color: #43a047;
  font-weight: 500;
`;

const EncryptionDisabled = styled.span`
  color: #e53935;
  font-weight: 500;
`;

const MembersTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background-color: #f5f5f5;
  font-weight: 500;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: #f9f9f9;
  }
`;

const Cell = styled.td`
  padding: 12px 15px;
  
  &:first-child {
    padding-left: 20px;
  }
  
  &:last-child {
    padding-right: 20px;
  }
`;

const HeaderCell = styled.th`
  padding: 12px 15px;
  text-align: left;
  font-weight: 500;
  color: #666;
  
  &:first-child {
    padding-left: 20px;
  }
  
  &:last-child {
    padding-right: 20px;
  }
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 5px;
`;

const OwnerBadge = styled(RoleBadge)`
  background-color: #ffecb3;
  color: #ff8f00;
`;

const AdminBadge = styled(RoleBadge)`
  background-color: #e1f5fe;
  color: #0288d1;
`;

const SuperNodeBadge = styled(RoleBadge)`
  background-color: #e8f5e9;
  color: #2e7d32;
`;

const MemberName = styled.div`
  display: flex;
  align-items: center;
`;

const OnlineStatus = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  background-color: ${props => props.$online ? '#43a047' : '#9e9e9e'};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #ddd;
  background-color: #f5f5f5;
  color: #333;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background-color: #e8e8e8;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RemoveButton = styled(ActionButton)`
  color: #e53935;
  border-color: #ffcdd2;
  background-color: #ffebee;
  
  &:hover:not(:disabled) {
    background-color: #ffcdd2;
  }
`;

const AdminButton = styled(ActionButton)`
  color: ${props => props.$isAdmin ? '#666' : '#0288d1'};
  border-color: ${props => props.$isAdmin ? '#ddd' : '#b3e5fc'};
  background-color: ${props => props.$isAdmin ? '#f5f5f5' : '#e1f5fe'};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.$isAdmin ? '#e8e8e8' : '#b3e5fc'};
  }
`;

const SuperNodeButton = styled(ActionButton)`
  color: ${props => props.$isSuperNode ? '#666' : '#2e7d32'};
  border-color: ${props => props.$isSuperNode ? '#ddd' : '#c8e6c9'};
  background-color: ${props => props.$isSuperNode ? '#f5f5f5' : '#e8f5e9'};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.$isSuperNode ? '#e8e8e8' : '#c8e6c9'};
  }
`;

const DangerSection = styled(Section)`
  margin-top: 30px;
  border: 1px solid #ffcdd2;
`;

const DangerButton = styled.button`
  width: 100%;
  padding: 15px;
  background-color: #ffebee;
  border: none;
  color: #e53935;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #ffcdd2;
  }
`;

const ConfirmationModal = styled.div`
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
  padding: 20px;
`;

const ConfirmTitle = styled.h4`
  margin: 0 0 15px 0;
  color: #e53935;
`;

const ConfirmMessage = styled.p`
  margin: 0 0 20px 0;
  color: #555;
  line-height: 1.5;
`;

const ConfirmButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const ConfirmButton = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelConfirmButton = styled(ConfirmButton)`
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  color: #666;
  
  &:hover:not(:disabled) {
    background-color: #e8e8e8;
  }
`;

const ConfirmActionButton = styled(ConfirmButton)`
  background-color: #e53935;
  border: 1px solid #e53935;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #d32f2f;
  }
`;

// 获取成员名称辅助函数
const getMemberName = (group, peerId) => {
  const member = group.members.find(m => m.peerId === peerId);
  return member ? member.displayName || peerId.substring(0, 8) : peerId.substring(0, 8);
};

const GroupManagementScreen = ({
  group,
  currentUser,
  onlineStatuses = {},
  onUpdateGroup,
  onRemoveMember,
  onSetAdmin,
  onSetSuperNode,
  onUpdateKey,
  onDisbandGroup,
  onGoBack
}) => {
  const [editing, setEditing] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [showConfirmDisband, setShowConfirmDisband] = useState(false);
  
  // 检查当前用户是否是群主或管理员
  const isOwner = currentUser === group.owner;
  const isAdmin = isOwner || group.admins.includes(currentUser);
  
  // 保存群组名称
  const saveGroupName = () => {
    if (groupName.trim() && groupName !== group.name) {
      onUpdateGroup({ name: groupName.trim() });
    }
    setEditing(false);
  };
  
  return (
    <ManagementContainer>
      <Header>
        <HeaderTitle>
          <BackButton onClick={onGoBack}>
            <FiArrowLeft size={20} />
          </BackButton>
          <Title>群组管理</Title>
        </HeaderTitle>
      </Header>
      
      <Content>
        <Section>
          <SectionTitle>基本信息</SectionTitle>
          
          <InfoItem>
            <InfoLabel>群组名称：</InfoLabel>
            {editing ? (
              <>
                <InfoInput 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                />
                <SaveButton onClick={saveGroupName}>
                  <FiCheck size={18} />
                </SaveButton>
                <CancelButton onClick={() => {
                  setGroupName(group.name);
                  setEditing(false);
                }}>
                  <FiX size={18} />
                </CancelButton>
              </>
            ) : (
              <>
                <InfoValue>{group.name}</InfoValue>
                {isAdmin && (
                  <EditButton onClick={() => setEditing(true)}>
                    <FiEdit size={18} />
                  </EditButton>
                )}
              </>
            )}
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>创建时间：</InfoLabel>
            <InfoValue>{new Date(group.createdAt).toLocaleString()}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>群组类型：</InfoLabel>
            <InfoValue>{group.type === 'small' ? '小型群组(≤20人)' : '大型群组(≤200人)'}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>群主：</InfoLabel>
            <InfoValue>{getMemberName(group, group.owner)}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>加密状态：</InfoLabel>
            <InfoValue>
              {group.settings.encryptionEnabled ? (
                <EncryptionEnabled>已启用 (v{group.keyVersion})</EncryptionEnabled>
              ) : (
                <EncryptionDisabled>已禁用</EncryptionDisabled>
              )}
              {isOwner && group.settings.encryptionEnabled && (
                <EditButton onClick={onUpdateKey} title="更新密钥">
                  <FiEdit size={16} />
                </EditButton>
              )}
            </InfoValue>
          </InfoItem>
        </Section>
        
        <Section>
          <SectionTitle>
            成员管理
            {isAdmin && (
              <EditButton onClick={() => {}} title="邀请成员">
                <FiUserPlus size={16} />
              </EditButton>
            )}
          </SectionTitle>
          
          <MembersTable>
            <TableHeader>
              <TableRow>
                <HeaderCell>成员</HeaderCell>
                <HeaderCell>加入时间</HeaderCell>
                <HeaderCell>状态</HeaderCell>
                {isAdmin && <HeaderCell>操作</HeaderCell>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.members.map(member => (
                <TableRow key={member.peerId}>
                  <Cell>
                    <MemberName>
                      <OnlineStatus $online={onlineStatuses[member.peerId] || false} />
                      {member.displayName || member.peerId.substring(0, 8)}
                      {member.peerId === currentUser && " (我)"}
                      
                      {member.peerId === group.owner && (
                        <OwnerBadge>群主</OwnerBadge>
                      )}
                      
                      {group.admins.includes(member.peerId) && member.peerId !== group.owner && (
                        <AdminBadge>管理员</AdminBadge>
                      )}
                      
                      {member.isSuperNode && (
                        <SuperNodeBadge>超级节点</SuperNodeBadge>
                      )}
                    </MemberName>
                  </Cell>
                  <Cell>{new Date(member.joinedAt).toLocaleString()}</Cell>
                  <Cell>{onlineStatuses[member.peerId] ? '在线' : '离线'}</Cell>
                  {isAdmin && member.peerId !== currentUser && (
                    <Cell>
                      <ActionButtons>
                        {isOwner && (
                          <AdminButton 
                            $isAdmin={group.admins.includes(member.peerId)}
                            onClick={() => onSetAdmin(member.peerId, !group.admins.includes(member.peerId))}
                            disabled={member.peerId === group.owner}
                          >
                            {group.admins.includes(member.peerId) ? '取消管理员' : '设为管理员'}
                          </AdminButton>
                        )}
                        
                        {isAdmin && (
                          <SuperNodeButton 
                            $isSuperNode={member.isSuperNode}
                            onClick={() => onSetSuperNode(member.peerId, !member.isSuperNode)}
                            disabled={member.peerId === group.owner}
                          >
                            {member.isSuperNode ? '取消超级节点' : '设为超级节点'}
                          </SuperNodeButton>
                        )}
                        
                        {(isOwner || (isAdmin && !group.admins.includes(member.peerId) && member.peerId !== group.owner)) && (
                          <RemoveButton 
                            onClick={() => onRemoveMember(member.peerId)}
                            disabled={member.peerId === group.owner}
                          >
                            移除
                          </RemoveButton>
                        )}
                      </ActionButtons>
                    </Cell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </MembersTable>
        </Section>
        
        {isOwner && (
          <DangerSection>
            <SectionTitle>危险操作</SectionTitle>
            <DangerButton onClick={() => setShowConfirmDisband(true)}>
              解散群组
            </DangerButton>
          </DangerSection>
        )}
        
        {showConfirmDisband && (
          <ConfirmationModal>
            <ConfirmationBox>
              <ConfirmTitle>解散群组</ConfirmTitle>
              <ConfirmMessage>
                确定要解散该群组吗？此操作无法撤销，所有成员将被移除，群组数据将被删除。
              </ConfirmMessage>
              <ConfirmButtons>
                <CancelConfirmButton onClick={() => setShowConfirmDisband(false)}>
                  取消
                </CancelConfirmButton>
                <ConfirmActionButton onClick={() => {
                  onDisbandGroup();
                  setShowConfirmDisband(false);
                }}>
                  确认解散
                </ConfirmActionButton>
              </ConfirmButtons>
            </ConfirmationBox>
          </ConfirmationModal>
        )}
      </Content>
    </ManagementContainer>
  );
};

export default GroupManagementScreen; 