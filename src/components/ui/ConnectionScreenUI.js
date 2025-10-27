import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FiCheck, FiX, FiUser, FiUsers, FiArrowLeft, FiPlus } from 'react-icons/fi';
import { Button as AntButton, Input as AntInput, Card as AntCard, Switch, Modal, Typography } from 'antd';
import StatusIndicator from '../StatusIndicator';
import CopyableId from '../CopyableId';
import Toast from '../Toast';

const { Title: AntTitle, Text } = Typography;

// --- Keyframes for Animations ---
const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

// --- Styled Ant Design Components (with enhancements) ---
const StyledButton = styled(AntButton)`
    width: 100%;
    height: 48px;
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 10px;
    border-radius: 8px; // Slightly more rounded
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px; // Space between icon and text

    &.ant-btn-primary {
        background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
        border-color: transparent;
        transition: all 0.3s ease;

        &:hover {
            background: linear-gradient(135deg, #5e0faa 0%, #1e63d4 100%);
            border-color: transparent !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
    }

    &:disabled {
        background: #e0e0e0 !important;
        border-color: #e0e0e0 !important;
        color: #9e9e9e !important;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }
`;

const StyledInput = styled(AntInput)`
    height: 48px;
    font-size: 16px;
    border-radius: 8px;
    border: 1px solid #d9d9d9;

    &:focus, &:hover {
        border-color: #4a90e2;
        box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
    }
`;

// New Styled Component for Password Input
const StyledPassword = styled(AntInput.Password)`
    height: 48px;
    font-size: 16px;
    border-radius: 8px;
    border: 1px solid #d9d9d9;

    .ant-input {
        height: auto;
    }

    &:focus-within, &:hover {
        border-color: #4a90e2;
        box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
    }
`;


const StyledCard = styled(AntCard)`
    width: 100%;
    max-width: 500px;
    border-radius: 12px; // More pronounced rounding
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    border: none;
    animation: ${fadeIn} 0.5s ease-out forwards;

    .ant-card-body {
        padding: 30px;
    }
`;

const StyledModal = styled(Modal)`
    .ant-modal-content {
        border-radius: 12px;
    }

    .ant-modal-header {
        border-radius: 12px 12px 0 0;
    }
`;

const StyledSwitch = styled(Switch)`
    &.ant-switch-checked {
        background-color: #2ecc71;
    }
`;

// --- Main Container (UI Enhancement) ---
const ConnectionContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh; // Use min-height to ensure it covers the screen
    padding: 20px;
    background: #f0f2f5; // A light grey background for better contrast
`;

// --- New Components for Mode Selection ---
const ChoiceContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    animation: ${fadeIn} 0.5s ease-out forwards;

    @media (min-width: 768px) {
        flex-direction: row;
        justify-content: center;
    }
`;

const ChoiceCard = styled(AntCard)`
    width: 100%;
    max-width: 240px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid #e8e8e8;

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        border-color: #4a90e2;
    }

    .ant-card-body {
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }
`;

const IconWrapper = styled.div`
    font-size: 48px;
    color: #4a90e2;
`;

// --- General Styled Components ---
const InputGroup = styled.div`
    margin-bottom: 20px;
`;

const Label = styled.label`
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
`;

const EncryptionToggle = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    justify-content: space-between;
`;

const BackButton = styled(AntButton)`
    margin-bottom: 20px;
    width: auto;
`;


const ConnectionScreenUI = ({
    peerId,
    targetId,
    connectionStatus,
    showConnectionRequest,
    incomingPeerId,
    incomingUseEncryption,
    finalUseEncryption,
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
    onGenerateRandomId,
}) => {
    const [connectionMode, setConnectionMode] = useState('none');
    // --- NEW: State for group creation form ---
    const [groupName, setGroupName] = useState('');
    const [groupPassword, setGroupPassword] = useState('');

    useEffect(() => {
        if (!isPeerCreated) {
            setConnectionMode('none');
        }
    }, [isPeerCreated]);

    const handleBackToChoice = () => {
        setConnectionMode('none');
        // Clear form fields when going back
        setGroupName('');
        setGroupPassword('');
    };

    // --- NEW: Handler for group creation ---
    const handleCreateGroup = () => {
        // In a real application, you would pass a prop like `onCreateGroup`
        // to handle the group creation logic (e.g., API call, state update).
        // For now, we will just log the details to the console.
        console.log('Attempting to create group with details:', {
            name: groupName,
            password: groupPassword,
        });
        // Here you could also trigger a toast message, e.g., by calling a prop
        // like onShowToast(`Group "${groupName}" created successfully!`);
    };

    const renderInitialScreen = () => (
        <StyledCard>
            <AntTitle level={2} style={{ textAlign: 'center', marginBottom: '20px' }}>P2P 安全聊天</AntTitle>
            <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginBottom: '30px' }}>
                创建您的专属ID以开始安全连接。
            </Text>
            <InputGroup>
                <Label>你的 ID</Label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <StyledInput
                        value={peerId}
                        onChange={(e) => onPeerIdChange(e.target.value)}
                        placeholder="输入你的ID或使用随机ID"
                        disabled={isPeerCreated}
                    />
                    {!isPeerCreated && (
                        <AntButton onClick={onGenerateRandomId} style={{ height: '48px', whiteSpace: 'nowrap' }}>
                            随机ID
                        </AntButton>
                    )}
                </div>
                {customIdError && <div style={{ color: 'red', marginTop: '5px' }}>{customIdError}</div>}
            </InputGroup>

            <StyledButton type="primary" onClick={onCreateConnection} disabled={connectionStatus === 'connecting'} loading={connectionStatus === 'connecting'}>
                {connectionStatus === 'connecting' ? '创建中...' : '创建ID并连接'}
            </StyledButton>
        </StyledCard>
    );

    const renderChoiceScreen = () => (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '520px' }}>
            <AntTitle level={2} style={{ marginBottom: '10px' }}>ID 已创建</AntTitle>
            <CopyableId id={peerId} />
            <Text type="secondary" style={{ display: 'block', margin: '20px 0' }}>
                选择您的连接方式
            </Text>
            <ChoiceContainer>
                <ChoiceCard onClick={() => setConnectionMode('personal')}>
                    <IconWrapper><FiUser /></IconWrapper>
                    <AntTitle level={4}>个人连接</AntTitle>
                    <Text type="secondary">与单个用户建立安全连接。</Text>
                </ChoiceCard>
                <ChoiceCard onClick={() => setConnectionMode('group')}>
                    <IconWrapper><FiUsers /></IconWrapper>
                    <AntTitle level={4}>创建群组</AntTitle>
                    <Text type="secondary">邀请多个用户进行群聊。</Text>
                </ChoiceCard>
            </ChoiceContainer>
        </div>
    );

    const renderPersonalConnectionScreen = () => (
        <StyledCard>
            <BackButton onClick={handleBackToChoice} icon={<FiArrowLeft />}>
                返回
            </BackButton>
            <AntTitle level={3} style={{ textAlign: 'center', marginBottom: '20px' }}>个人连接</AntTitle>
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
            {typeof finalUseEncryption === 'boolean' && (
                <div style={{ marginTop: '-10px', marginBottom: '10px', fontSize: 12, color: '#666' }}>
                    最终协商的加密状态：
                    <Text type={finalUseEncryption ? 'success' : 'warning'}>
                        {finalUseEncryption ? '已启用' : '已禁用'}
                    </Text>
                </div>
            )}

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
        </StyledCard>
    );

    // --- UPDATED: This function now renders a form ---
    const renderGroupCreationScreen = () => (
        <StyledCard>
            <BackButton onClick={handleBackToChoice} icon={<FiArrowLeft />}>
                返回
            </BackButton>
            <AntTitle level={3} style={{ textAlign: 'center', marginBottom: '20px' }}>创建群组</AntTitle>

            <InputGroup>
                <Label>群组名称</Label>
                <StyledInput
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="为您的群组命名"
                />
            </InputGroup>

            <InputGroup>
                <Label>群组密码 (可选)</Label>
                <StyledPassword
                    value={groupPassword}
                    onChange={(e) => setGroupPassword(e.target.value)}
                    placeholder="设置一个密码以保护群组"
                />
            </InputGroup>

            <StyledButton
                type="primary"
                onClick={handleCreateGroup}
                disabled={!groupName}
                icon={<FiPlus />}
            >
                创建群组
            </StyledButton>
        </StyledCard>
    );

    const renderContent = () => {
        if (!isPeerCreated) {
            return renderInitialScreen();
        }

        switch (connectionMode) {
            case 'personal':
                return renderPersonalConnectionScreen();
            case 'group':
                return renderGroupCreationScreen();
            case 'none':
            default:
                return renderChoiceScreen();
        }
    }

    return (
        <ConnectionContainer>
            {renderContent()}

            <StyledModal
                title="连接请求"
                open={showConnectionRequest}
                onCancel={onRejectConnection}
                footer={[
                    <AntButton
                        key="reject"
                        onClick={onRejectConnection}
                        style={{ borderRadius: '8px' }}
                        icon={<FiX />}
                    >
                        拒绝
                    </AntButton>,
                    <AntButton
                        key="accept"
                        type="primary"
                        onClick={onAcceptConnection}
                        style={{ borderRadius: '8px' }}
                        icon={<FiCheck />}
                    >
                        接受
                    </AntButton>
                ]}
            >
                <p><Text strong>{incomingPeerId}</Text> 请求与你建立连接。</p>
                <p>加密通信: <Text type={incomingUseEncryption ? 'success' : 'warning'}>{incomingUseEncryption ? '已启用' : '已禁用'}</Text></p>
            </StyledModal>

            {showToast && <Toast message={toastMessage} />}
        </ConnectionContainer>
    );
};

export default ConnectionScreenUI;