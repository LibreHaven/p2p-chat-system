import { peerService } from '../services/peer';
import { encryptionService } from '../services/encryption';
import messageService from '../services/message';

// 模拟群组数据
const mockGroup = {
  id: '123456',
  name: '测试群组',
  type: 'small',
  createdAt: Date.now(),
  owner: 'peer1',
  admins: [],
  members: [
    { peerId: 'peer1', role: 'owner', joinedAt: Date.now(), isSuperNode: true },
    { peerId: 'peer2', role: 'member', joinedAt: Date.now(), isSuperNode: false }
  ],
  keyVersion: 1,
  settings: {
    encryptionEnabled: true,
    allowFiles: true,
    joinMode: "invite_only"
  }
};

// 测试群组消息创建和格式化
describe('群组消息功能', () => {
  test('创建群组消息', () => {
    const message = messageService.createGroupMessage(
      '测试消息',
      mockGroup.id,
      'text',
      {},
      'peer1'
    );
    
    expect(message).toHaveProperty('id');
    expect(message).toHaveProperty('content', '测试消息');
    expect(message).toHaveProperty('groupId', mockGroup.id);
    expect(message).toHaveProperty('sender', 'peer1');
    expect(message).toHaveProperty('type', 'text');
    expect(message).toHaveProperty('timestamp');
  });
  
  test('格式化系统消息', () => {
    const message = {
      id: '123',
      type: 'system',
      groupId: mockGroup.id,
      content: '',
      metadata: {
        systemAction: 'member_joined',
        memberId: 'peer3',
        memberName: '用户3'
      }
    };
    
    const formatted = messageService.formatSystemMessage(message);
    expect(formatted).toBe('用户3 加入了群聊');
  });
});

// 测试群组加密功能
describe('群组加密功能', () => {
  test('生成群组共享密钥', async () => {
    const keyResult = await encryptionService.generateGroupSharedKey(mockGroup.id);
    
    expect(keyResult).toHaveProperty('version', 1);
    expect(keyResult).toHaveProperty('keyData');
    expect(typeof keyResult.keyData).toBe('string');
    
    // 验证密钥已存储
    expect(encryptionService.groupKeys).toHaveProperty(mockGroup.id);
  });
  
  test('加密和解密群组消息', async () => {
    // 确保密钥存在
    await encryptionService.generateGroupSharedKey(mockGroup.id);
    
    const originalMessage = {
      id: '123',
      content: '测试加密消息',
      groupId: mockGroup.id,
      type: 'text',
      timestamp: Date.now(),
      sender: 'peer1'
    };
    
    // 加密消息
    const encrypted = await encryptionService.encryptGroupMessage(
      originalMessage, 
      mockGroup.id,
      1
    );
    
    expect(encrypted).toHaveProperty('content');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted.content).not.toBe(originalMessage.content);
    
    // 解密消息
    const decrypted = await encryptionService.decryptGroupMessage(
      encrypted,
      mockGroup.id,
      1
    );
    
    expect(decrypted).toHaveProperty('content', originalMessage.content);
    expect(decrypted).toHaveProperty('id', originalMessage.id);
    expect(decrypted).toHaveProperty('sender', originalMessage.sender);
  });
}); 