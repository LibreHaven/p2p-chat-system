import React, { useState } from 'react';
import styled from 'styled-components';
import { FiX, FiSearch, FiUserPlus } from 'react-icons/fi';

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

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 10px;
  margin-bottom: 20px;
`;

const SearchIcon = styled.div`
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  padding: 10px;
  font-size: 14px;
  
  &:focus {
    outline: none;
  }
`;

const PeersList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
`;

const PeerItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: #f9f9f9;
  }
`;

const PeerInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const PeerName = styled.div`
  font-weight: 500;
  color: #333;
`;

const PeerId = styled.div`
  font-size: 12px;
  color: #999;
  margin-top: 3px;
`;

const InviteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #e8f5e9;
  color: #2e7d32;
  font-size: 13px;
  cursor: pointer;
  
  &:hover {
    background-color: #c8e6c9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NoResults = styled.div`
  padding: 15px;
  text-align: center;
  color: #999;
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

const InfoMessage = styled.div`
  padding: 12px 15px;
  background-color: #e8f4fd;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
  color: #0277bd;
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

const InviteMemberModal = ({ 
  onClose, 
  onInvite, 
  connectedPeers = [], 
  groupMembers = []
}) => {
  const [search, setSearch] = useState('');
  
  // 过滤已连接的对等方（排除已经是群组成员的）
  const filteredPeers = connectedPeers.filter(peer => {
    // 检查是否已是群组成员
    const isMember = groupMembers.some(member => member.peerId === peer.id);
    if (isMember) return false;
    
    // 搜索过滤
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    const nameMatch = peer.name && peer.name.toLowerCase().includes(searchLower);
    const idMatch = peer.id.toLowerCase().includes(searchLower);
    
    return nameMatch || idMatch;
  });
  
  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>邀请成员</ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </ModalHeader>
        
        <ModalBody>
          <InfoMessage>
            您可以邀请已连接的用户加入群组。用户需要接受邀请才能加入。
          </InfoMessage>
          
          <SearchContainer>
            <SearchIcon>
              <FiSearch size={18} />
            </SearchIcon>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户ID或名称..."
            />
          </SearchContainer>
          
          <PeersList>
            {filteredPeers.length === 0 ? (
              <NoResults>
                {search ? '没有找到匹配的用户' : '没有可邀请的用户'}
              </NoResults>
            ) : (
              filteredPeers.map(peer => (
                <PeerItem key={peer.id}>
                  <PeerInfo>
                    <PeerName>{peer.name || '未命名用户'}</PeerName>
                    <PeerId>{peer.id}</PeerId>
                  </PeerInfo>
                  <InviteButton onClick={() => onInvite(peer.id)}>
                    <FiUserPlus size={14} />
                    邀请
                  </InviteButton>
                </PeerItem>
              ))
            )}
          </PeersList>
        </ModalBody>
        
        <ModalFooter>
          <CancelButton onClick={onClose}>关闭</CancelButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default InviteMemberModal; 