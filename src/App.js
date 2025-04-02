import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ConnectionScreen from './components/ConnectionScreen';
import ChatScreen from './components/ChatScreen';
import ErrorScreen from './components/ErrorScreen';
import SidebarNav from './components/SidebarNav';
import CreateGroupModal from './components/CreateGroupModal';
import JoinGroupModal from './components/JoinGroupModal';
import GroupChatScreen from './components/GroupChatScreen';
import GroupManagementScreen from './components/GroupManagementScreen';
import GroupConfirmation from './components/GroupConfirmation';
import InviteMemberModal from './components/InviteMemberModal';
import { peerService } from './services/peerService';
import { messageService } from './services/messageService';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
  font-family: 'Roboto', sans-serif;
`;

function App() {
  const [screen, setScreen] = useState('connection'); // connection, chat, error
  const [peerId, setPeerId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [connection, setConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, failed
  const [errorMessage, setErrorMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [viewMode, setViewMode] = useState('connection'); 
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [pendingGroupInvites, setPendingGroupInvites] = useState([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState([]);
  const [groupOnlineStatuses, setGroupOnlineStatuses] = useState({});

  // Reset to connection screen
  const resetConnection = () => {
    setScreen('connection');
    setTargetId('');
    setConnectionStatus('disconnected');
    setErrorMessage('');
    if (connection) {
      connection.close();
      setConnection(null);
    }
  };

  // 加载群组数据
  useEffect(() => {
    if (peerService && isInitialized) {
      // 从peerService加载群组数据
      const loadedGroups = peerService.loadGroupsFromStorage();
      if (loadedGroups) {
        setGroups(loadedGroups);
      }
    }
  }, [isInitialized]);

  // 处理创建群组
  const handleCreateGroup = async (groupData) => {
    try {
      // 调用peerService创建群组
      const group = await peerService.createGroup(
        groupData.name, 
        groupData.type, 
        {
          encryptionEnabled: groupData.encryptionEnabled,
          allowFiles: true,
          joinMode: "invite_only"
        }
      );
      
      // 更新群组列表
      setGroups(prevGroups => [...prevGroups, group]);
      
      // 关闭创建对话框并切换到群聊界面
      setShowCreateGroupModal(false);
      setActiveGroupId(group.id);
      setViewMode('group-chat');
      
    } catch (error) {
      console.error('创建群组失败:', error);
      setError('创建群组失败: ' + error.message);
    }
  };

  // 处理加入群组请求
  const handleJoinGroupRequest = async (adminPeerId) => {
    try {
      // 发送加入请求
      await peerService.sendJoinGroupRequest(adminPeerId);
      
      // 关闭加入对话框
      setShowJoinGroupModal(false);
      
      // 显示请求已发送提示
      setNotification({
        type: 'success',
        message: '加入请求已发送，等待管理员批准'
      });
      
    } catch (error) {
      console.error('发送加入群组请求失败:', error);
      setError('发送加入请求失败: ' + error.message);
    }
  };

  // 处理接受群组邀请
  const handleAcceptGroupInvite = async (inviteId) => {
    try {
      // 查找对应的邀请
      const invite = pendingGroupInvites.find(inv => inv.id === inviteId);
      if (!invite) throw new Error('邀请不存在');
      
      // 接受邀请
      const group = await peerService.acceptGroupInvite(invite);
      
      // 更新群组列表
      setGroups(prevGroups => [...prevGroups, group]);
      
      // 移除已处理的邀请
      setPendingGroupInvites(prevInvites => 
        prevInvites.filter(inv => inv.id !== inviteId)
      );
      
      // 切换到新加入的群聊
      setActiveGroupId(group.id);
      setViewMode('group-chat');
      
    } catch (error) {
      console.error('接受群组邀请失败:', error);
      setError('接受群组邀请失败: ' + error.message);
    }
  };

  // 处理拒绝群组邀请
  const handleRejectGroupInvite = async (inviteId) => {
    try {
      // 查找对应的邀请
      const invite = pendingGroupInvites.find(inv => inv.id === inviteId);
      if (!invite) throw new Error('邀请不存在');
      
      // 拒绝邀请
      await peerService.rejectGroupInvite(invite);
      
      // 移除已处理的邀请
      setPendingGroupInvites(prevInvites => 
        prevInvites.filter(inv => inv.id !== inviteId)
      );
      
    } catch (error) {
      console.error('拒绝群组邀请失败:', error);
      setError('拒绝群组邀请失败: ' + error.message);
    }
  };

  // 处理接受加入群组请求
  const handleAcceptJoinRequest = async (requestId) => {
    try {
      // 查找对应的请求
      const request = pendingJoinRequests.find(req => req.id === requestId);
      if (!request) throw new Error('请求不存在');
      
      // 接受请求
      await peerService.acceptJoinGroupRequest(request);
      
      // 移除已处理的请求
      setPendingJoinRequests(prevRequests => 
        prevRequests.filter(req => req.id !== requestId)
      );
      
    } catch (error) {
      console.error('接受加入请求失败:', error);
      setError('接受加入请求失败: ' + error.message);
    }
  };

  // 处理拒绝加入群组请求
  const handleRejectJoinRequest = async (requestId) => {
    try {
      // 查找对应的请求
      const request = pendingJoinRequests.find(req => req.id === requestId);
      if (!request) throw new Error('请求不存在');
      
      // 拒绝请求
      await peerService.rejectJoinGroupRequest(request);
      
      // 移除已处理的请求
      setPendingJoinRequests(prevRequests => 
        prevRequests.filter(req => req.id !== requestId)
      );
      
    } catch (error) {
      console.error('拒绝加入请求失败:', error);
      setError('拒绝加入请求失败: ' + error.message);
    }
  };

  // 处理发送群组消息
  const handleSendGroupMessage = async (groupId, content, type = 'text', metadata = {}) => {
    try {
      // 创建群组消息
      const message = messageService.createGroupMessage(
        content,
        groupId,
        type,
        metadata,
        peerId
      );
      
      // 通过peerService发送消息
      await peerService.sendGroupMessage(groupId, message);
      
      // 更新本地群组消息列表
      // 这里假设peerService内部会处理本地消息存储
      
    } catch (error) {
      console.error('发送群组消息失败:', error);
      setError('发送群组消息失败: ' + error.message);
    }
  };

  // 处理邀请成员
  const handleInviteMember = async (groupId, targetPeerId) => {
    try {
      // 发送邀请
      await peerService.inviteToGroup(groupId, targetPeerId);
      
      // 关闭邀请对话框
      setShowInviteMemberModal(false);
      
      // 显示邀请已发送提示
      setNotification({
        type: 'success',
        message: '邀请已发送'
      });
      
    } catch (error) {
      console.error('邀请成员失败:', error);
      setError('邀请成员失败: ' + error.message);
    }
  };

  // 处理退出群组
  const handleLeaveGroup = async (groupId) => {
    try {
      // 退出群组
      await peerService.leaveGroup(groupId);
      
      // 更新群组列表
      setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
      
      // 如果当前正在查看该群组，则返回到连接视图
      if (activeGroupId === groupId) {
        setActiveGroupId(null);
        setViewMode('connection');
      }
      
    } catch (error) {
      console.error('退出群组失败:', error);
      setError('退出群组失败: ' + error.message);
    }
  };

  // 处理设置管理员
  const handleSetAdmin = async (groupId, memberId, isAdmin) => {
    try {
      // 设置或取消管理员权限
      await peerService.setGroupAdmin(groupId, memberId, isAdmin);
      
      // 更新本地群组数据
      setGroups(prevGroups => 
        prevGroups.map(group => {
          if (group.id === groupId) {
            const updatedGroup = {...group};
            
            if (isAdmin) {
              updatedGroup.admins = [...updatedGroup.admins, memberId];
            } else {
              updatedGroup.admins = updatedGroup.admins.filter(id => id !== memberId);
            }
            
            return updatedGroup;
          }
          return group;
        })
      );
      
    } catch (error) {
      console.error('设置管理员失败:', error);
      setError('设置管理员失败: ' + error.message);
    }
  };

  const handleInitialize = async (id) => {
    try {
      // 初始化Peer连接的代码
      // ...
      
      // 成功初始化后设置状态
      setIsInitialized(true);
      
    } catch (error) {
      console.error('初始化失败:', error);
      setError('初始化P2P连接失败: ' + error.message);
    }
  };

  return (
    <AppContainer>
      {screen === 'connection' && (
        <ConnectionScreen 
          peerId={peerId}
          setPeerId={setPeerId}
          targetId={targetId}
          setTargetId={setTargetId}
          connectionStatus={connectionStatus}
          setConnectionStatus={setConnectionStatus}
          setConnection={setConnection}
          setScreen={setScreen}
          setErrorMessage={setErrorMessage}
          setMessages={setMessages}
        />
      )}
      
      {screen === 'chat' && (
        <ChatScreen 
          peerId={peerId}
          targetId={targetId}
          connection={connection}
          messages={messages}
          setMessages={setMessages}
          resetConnection={resetConnection}
        />
      )}
      
      {screen === 'error' && (
        <ErrorScreen 
          errorMessage={errorMessage}
          resetConnection={resetConnection}
          targetId={targetId}
          setConnectionStatus={setConnectionStatus}
          setConnection={setConnection}
          setScreen={setScreen}
          setErrorMessage={setErrorMessage}
        />
      )}
      
      {viewMode === 'group-chat' && activeGroupId && (
        <GroupChatScreen
          group={groups.find(g => g.id === activeGroupId)}
          currentUser={peerId}
          onSendMessage={(content, type, metadata) => 
            handleSendGroupMessage(activeGroupId, content, type, metadata)
          }
          onLeaveGroup={() => handleLeaveGroup(activeGroupId)}
          onManageGroup={() => setViewMode('group-management')}
          onBack={() => {
            setActiveGroupId(null);
            setViewMode('connection');
          }}
          onInviteMember={() => setShowInviteMemberModal(true)}
        />
      )}
      
      {viewMode === 'group-management' && activeGroupId && (
        <GroupManagementScreen
          group={groups.find(g => g.id === activeGroupId)}
          currentUser={peerId}
          onlineStatuses={groupOnlineStatuses}
          onUpdateGroup={(updates) => {
            // 实现群组更新逻辑
          }}
          onRemoveMember={(memberId) => {
            // 实现移除成员逻辑
          }}
          onSetAdmin={(memberId, isAdmin) => 
            handleSetAdmin(activeGroupId, memberId, isAdmin)
          }
          onSetSuperNode={(memberId, isSuperNode) => {
            // 实现设置超级节点逻辑
          }}
          onUpdateKey={() => {
            // 实现更新密钥逻辑
          }}
          onDisbandGroup={() => {
            // 实现解散群组逻辑
          }}
          onGoBack={() => setViewMode('group-chat')}
        />
      )}
      
      {showCreateGroupModal && (
        <CreateGroupModal
          onClose={() => setShowCreateGroupModal(false)}
          onCreate={handleCreateGroup}
        />
      )}
      
      {showJoinGroupModal && (
        <JoinGroupModal
          onClose={() => setShowJoinGroupModal(false)}
          onJoin={handleJoinGroupRequest}
        />
      )}
      
      {showInviteMemberModal && activeGroupId && (
        <InviteMemberModal
          onClose={() => setShowInviteMemberModal(false)}
          onInvite={(peerId) => handleInviteMember(activeGroupId, peerId)}
          connectedPeers={connectedPeers}
          groupMembers={groups.find(g => g.id === activeGroupId)?.members || []}
        />
      )}
      
      {pendingGroupInvites.length > 0 && (
        <GroupConfirmation
          type="invite"
          data={pendingGroupInvites[0]}
          onAccept={() => handleAcceptGroupInvite(pendingGroupInvites[0].id)}
          onReject={() => handleRejectGroupInvite(pendingGroupInvites[0].id)}
        />
      )}
      
      {pendingJoinRequests.length > 0 && (
        <GroupConfirmation
          type="join-request"
          data={pendingJoinRequests[0]}
          onAccept={() => handleAcceptJoinRequest(pendingJoinRequests[0].id)}
          onReject={() => handleRejectJoinRequest(pendingJoinRequests[0].id)}
        />
      )}
      
      {error && (
        <ErrorMessage message={error} onClose={() => setError(null)} />
      )}
      
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </AppContainer>
  );
}

export default App;
