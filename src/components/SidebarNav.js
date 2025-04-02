import React, { useState } from 'react';
import styled from 'styled-components';
import { FiUsers, FiMessageSquare, FiPlus, FiLogIn } from 'react-icons/fi';

const SidebarContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 250px;
  height: 100%;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #e0e0e0;
`;

const Tab = styled.div`
  flex: 1;
  padding: 15px 0;
  text-align: center;
  font-weight: 500;
  cursor: pointer;
  background-color: ${props => props.$active ? '#ffffff' : 'transparent'};
  color: ${props => props.$active ? '#4a90e2' : '#666'};
  border-bottom: 2px solid ${props => props.$active ? '#4a90e2' : 'transparent'};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.$active ? '#ffffff' : '#f0f0f0'};
  }
`;

const ListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
`;

const SectionTitle = styled.div`
  padding: 10px 5px;
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Item = styled.div`
  padding: 12px 10px;
  border-radius: 4px;
  margin-bottom: 5px;
  cursor: pointer;
  background-color: ${props => props.$active ? '#e0e0e0' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.$active ? '#e0e0e0' : '#f0f0f0'};
  }
`;

const ItemContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ItemName = styled.div`
  font-weight: ${props => props.$active ? '500' : 'normal'};
  color: #333;
`;

const UnreadBadge = styled.div`
  background-color: #4a90e2;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  min-width: 18px;
  text-align: center;
`;

const GroupMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MemberCount = styled.div`
  font-size: 12px;
  color: #666;
`;

const ActionButtons = styled.div`
  display: flex;
  margin-top: 20px;
  gap: 10px;
  padding: 0 5px;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 10px;
  background-color: ${props => props.$primary ? '#4a90e2' : '#f5f5f5'};
  color: ${props => props.$primary ? 'white' : '#666'};
  border: 1px solid ${props => props.$primary ? '#4a90e2' : '#ddd'};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 13px;
  
  &:hover {
    background-color: ${props => props.$primary ? '#3a80d2' : '#e8e8e8'};
  }
`;

const SidebarNav = ({ 
  peers = [], 
  groups = [], 
  activePeerId, 
  activeGroupId, 
  onPeerSelect, 
  onGroupSelect,
  onCreateGroup,
  onJoinGroup
}) => {
  const [activeTab, setActiveTab] = useState('chats');
  
  return (
    <SidebarContainer>
      <TabsContainer>
        <Tab $active={activeTab === 'chats'} onClick={() => setActiveTab('chats')}>
          <FiMessageSquare style={{ marginRight: '5px' }} />
          聊天
        </Tab>
        <Tab $active={activeTab === 'groups'} onClick={() => setActiveTab('groups')}>
          <FiUsers style={{ marginRight: '5px' }} />
          群组
        </Tab>
      </TabsContainer>
      
      <ListContainer>
        {activeTab === 'chats' && (
          <>
            <SectionTitle>个人聊天</SectionTitle>
            {peers.length === 0 ? (
              <div style={{ padding: '15px 10px', color: '#999' }}>
                暂无聊天记录
              </div>
            ) : (
              peers.map(peer => (
                <Item 
                  key={peer.id}
                  $active={peer.id === activePeerId}
                  onClick={() => onPeerSelect(peer.id)}
                >
                  <ItemContent>
                    <ItemName $active={peer.id === activePeerId}>
                      {peer.name || peer.id.substring(0, 8)}
                    </ItemName>
                    {peer.unreadCount > 0 && <UnreadBadge>{peer.unreadCount}</UnreadBadge>}
                  </ItemContent>
                </Item>
              ))
            )}
          </>
        )}
        
        {activeTab === 'groups' && (
          <>
            <SectionTitle>群组聊天</SectionTitle>
            {groups.length === 0 ? (
              <div style={{ padding: '15px 10px', color: '#999' }}>
                暂无群组
              </div>
            ) : (
              groups.map(group => (
                <Item 
                  key={group.id}
                  $active={group.id === activeGroupId}
                  onClick={() => onGroupSelect(group.id)}
                >
                  <ItemContent>
                    <ItemName $active={group.id === activeGroupId}>
                      {group.name}
                    </ItemName>
                    <GroupMeta>
                      <MemberCount>{group.members.length}人</MemberCount>
                      {group.unreadCount > 0 && <UnreadBadge>{group.unreadCount}</UnreadBadge>}
                    </GroupMeta>
                  </ItemContent>
                </Item>
              ))
            )}
            
            <ActionButtons>
              <ActionButton $primary onClick={onCreateGroup}>
                <FiPlus size={14} />
                创建群组
              </ActionButton>
              <ActionButton onClick={onJoinGroup}>
                <FiLogIn size={14} />
                加入群组
              </ActionButton>
            </ActionButtons>
          </>
        )}
      </ListContainer>
    </SidebarContainer>
  );
};

export default SidebarNav; 