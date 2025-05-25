import React from 'react';
import styled from 'styled-components';
import { FiPlus, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const MembersContainer = styled.div`
  width: ${props => props.$collapsed ? '50px' : '250px'};
  height: 100%;
  background-color: #fff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
`;

const MembersHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${props => props.$collapsed ? 'center' : 'space-between'};
  padding: 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
`;

const MembersTitle = styled.div`
  font-weight: 500;
  color: #333;
  display: ${props => props.$collapsed ? 'none' : 'block'};
`;

const CollapseButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
`;

const InviteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 12px;
  margin: 15px;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  color: #333;
  font-size: 13px;
  cursor: pointer;
  
  &:hover {
    background-color: #e0e0e0;
  }
`;

const MemberItemsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 5px 10px;
`;

const MemberItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 3px;
  background-color: ${props => props.$isCurrentUser ? '#f5f9ff' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.$isCurrentUser ? '#f5f9ff' : '#f9f9f9'};
  }
`;

const MemberInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0; // 确保内容可以换行和省略
`;

const MemberName = styled.div`
  font-weight: ${props => props.$isCurrentUser ? '500' : 'normal'};
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MemberRoleBadges = styled.div`
  display: flex;
  gap: 5px;
  margin-top: 3px;
`;

const Badge = styled.span`
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 3px;
  font-weight: 500;
`;

const OwnerBadge = styled(Badge)`
  background-color: #ffecb3;
  color: #ff8f00;
`;

const AdminBadge = styled(Badge)`
  background-color: #e1f5fe;
  color: #0288d1;
`;

const SuperNodeBadge = styled(Badge)`
  background-color: #e8f5e9;
  color: #2e7d32;
`;

const MemberStatus = styled.div`
  font-size: 11px;
  color: ${props => props.$online ? '#43a047' : '#9e9e9e'};
  padding-left: 10px;
`;

// 成员列表组件
const MembersList = ({ 
  group, 
  currentUser,
  onlineStatuses = {}, 
  onMemberClick,
  onInviteMember,
  collapsed = false,
  onToggleCollapse
}) => {
  // 对成员按角色和状态排序
  const sortedMembers = [...group.members].sort((a, b) => {
    // 群主优先
    if (a.peerId === group.owner) return -1;
    if (b.peerId === group.owner) return 1;
    
    // 管理员次之
    const aIsAdmin = group.admins.includes(a.peerId);
    const bIsAdmin = group.admins.includes(b.peerId);
    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    
    // 超级节点再次之
    if (a.isSuperNode && !b.isSuperNode) return -1;
    if (!a.isSuperNode && b.isSuperNode) return 1;
    
    // 然后是在线成员
    const aIsOnline = onlineStatuses[a.peerId] || false;
    const bIsOnline = onlineStatuses[b.peerId] || false;
    if (aIsOnline && !bIsOnline) return -1;
    if (!aIsOnline && bIsOnline) return 1;
    
    // 最后按加入时间排序
    return a.joinedAt - b.joinedAt;
  });
  
  const isAdmin = currentUser === group.owner || group.admins.includes(currentUser);
  
  return (
    <MembersContainer $collapsed={collapsed}>
      <MembersHeader onClick={onToggleCollapse}>
        <MembersTitle $collapsed={collapsed}>
          群成员 ({group.members.length})
        </MembersTitle>
        <CollapseButton>
          {collapsed ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
        </CollapseButton>
      </MembersHeader>
      
      {!collapsed && (
        <>
          {isAdmin && (
            <InviteButton onClick={onInviteMember}>
              <FiPlus size={14} />
              邀请新成员
            </InviteButton>
          )}
          
          <MemberItemsList>
            {sortedMembers.map(member => (
              <MemberItem 
                key={member.peerId}
                onClick={() => onMemberClick(member.peerId)}
                $isCurrentUser={member.peerId === currentUser}
                $isOnline={onlineStatuses[member.peerId] || false}
              >
                <MemberInfo>
                  <MemberName $isCurrentUser={member.peerId === currentUser}>
                    {member.displayName || member.peerId.substring(0, 8)}
                    {member.peerId === currentUser && " (我)"}
                  </MemberName>
                  
                  <MemberRoleBadges>
                    {member.peerId === group.owner && (
                      <OwnerBadge>群主</OwnerBadge>
                    )}
                    
                    {group.admins.includes(member.peerId) && member.peerId !== group.owner && (
                      <AdminBadge>管理员</AdminBadge>
                    )}
                    
                    {member.isSuperNode && (
                      <SuperNodeBadge>超级节点</SuperNodeBadge>
                    )}
                  </MemberRoleBadges>
                </MemberInfo>
                
                <MemberStatus $online={onlineStatuses[member.peerId] || false}>
                  {onlineStatuses[member.peerId] ? '在线' : '离线'}
                </MemberStatus>
              </MemberItem>
            ))}
          </MemberItemsList>
        </>
      )}
    </MembersContainer>
  );
};

export default MembersList; 