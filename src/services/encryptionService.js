/**
 * encryptionService.js
 * 
 * 使用 Web Crypto API 实现 ECDH 密钥交换和 AES-GCM 加密。
 */

const utils = {
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  },

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  },

  stringToArrayBuffer(str) {
    return new TextEncoder().encode(str).buffer;
  },

  arrayBufferToString(buffer) {
    return new TextDecoder().decode(buffer);
  },

  hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  },

  arrayBufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }
};

const generateKeyPair = async () => {
  try {
    console.log('Generating ECDH key pair...');
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API 不可用，请确保页面使用 HTTPS 协议');
    }
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
    console.log('ECDH key pair generated successfully');
    return keyPair;
  } catch (error) {
    console.error('Failed to generate ECDH key pair:', error);
    throw error;
  }
};

const exportPublicKey = async (publicKey) => {
  try {
    console.log('Exporting public key...');
    const exportedKey = await window.crypto.subtle.exportKey('spki', publicKey);
    const base64Key = utils.arrayBufferToBase64(exportedKey);
    console.log('Public key exported successfully, length:', base64Key.length);
    return base64Key;
  } catch (error) {
    console.error('Failed to export public key:', error);
    throw error;
  }
};

const importPublicKey = async (base64Key) => {
  try {
    console.log('Importing public key...');
    const keyData = utils.base64ToArrayBuffer(base64Key);
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      keyData,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
    console.log('Public key imported successfully');
    return publicKey;
  } catch (error) {
    console.error('Failed to import public key:', error);
    throw error;
  }
};

const deriveSharedSecret = async (privateKey, publicKey) => {
  try {
    console.log('Deriving shared secret key...');
    const sharedKey = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: publicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    console.log('Shared secret key derived successfully');
    return sharedKey;
  } catch (error) {
    console.error('Failed to derive shared secret key:', error);
    throw error;
  }
};

const encrypt = async (message, sharedKey) => {
  try {
    const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
    console.log('Encrypting message...');
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const messageBuffer = utils.stringToArrayBuffer(messageString);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      sharedKey,
      messageBuffer
    );
    const encryptedBase64 = utils.arrayBufferToBase64(encryptedBuffer);
    const ivBase64 = utils.arrayBufferToBase64(iv);
    console.log('Message encrypted successfully');
    return { type: 'encrypted-message', iv: ivBase64, ciphertext: encryptedBase64 };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
};

export const decrypt = async (encryptedData, sharedKey) => {
  try {
    // 仅处理普通文本消息加密格式
    if (
      !encryptedData ||
      typeof encryptedData !== 'object' ||
      encryptedData.type !== 'encrypted-message' ||
      typeof encryptedData.iv !== 'string' ||
      typeof encryptedData.ciphertext !== 'string'
    ) {
      console.error('Invalid encrypted data format:', encryptedData);
      return null;  // 或者抛出异常：throw new Error('Invalid encrypted data format');
    }
    console.log('Decrypting message...');
    // 修改处：使用 utils. 前缀调用工具函数
    const iv = utils.base64ToArrayBuffer(encryptedData.iv);
    const ciphertext = utils.base64ToArrayBuffer(encryptedData.ciphertext);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv), tagLength: 128 },
      sharedKey,
      ciphertext
    );
    const decryptedString = utils.arrayBufferToString(decryptedBuffer);
    console.log('Message decrypted successfully');
    return decryptedString;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
};

const encryptRaw = async (base64Data, sharedKey) => {
  try {
    console.log('Encrypting raw binary data...');
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const dataBuffer = utils.base64ToArrayBuffer(base64Data);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      sharedKey,
      dataBuffer
    );
    const encryptedBase64 = utils.arrayBufferToBase64(encryptedBuffer);
    const ivBase64 = utils.arrayBufferToBase64(iv);
    console.log('Raw binary data encrypted successfully');
    return { type: 'encrypted-binary', iv: ivBase64, encryptedData: encryptedBase64 };
  } catch (error) {
    console.error('Raw binary encryption failed:', error);
    throw error;
  }
};

const decryptRaw = async (encryptedData, sharedKey) => {
  try {
    if (!encryptedData || !encryptedData.iv || !encryptedData.encryptedData) {
      console.error('Invalid encrypted binary data format');
      throw new Error('Invalid encrypted binary data format');
    }
    console.log('Decrypting raw binary data...');
    const iv = utils.base64ToArrayBuffer(encryptedData.iv);
    const ciphertext = utils.base64ToArrayBuffer(encryptedData.encryptedData);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv), tagLength: 128 },
      sharedKey,
      ciphertext
    );
    const decryptedBase64 = utils.arrayBufferToBase64(decryptedBuffer);
    console.log('Raw binary data decrypted successfully');
    return decryptedBase64;
  } catch (error) {
    console.error('Raw binary decryption failed:', error);
    throw error;
  }
};

const createKeyExchangeMessage = (publicKeyBase64) => {
  try {
    console.log('Creating key exchange message, public key length:', publicKeyBase64.length);
    return { type: 'encryption-key', publicKey: publicKeyBase64 };
  } catch (error) {
    console.error('Failed to create key exchange message:', error);
    throw error;
  }
};

class EncryptionState {
  constructor() {
    this.keyPair = null;
    this.remotePublicKey = null;
    this.sharedSecret = null;
    this.isHandshakeComplete = false;
  }

  async initialize() {
    try {
      this.keyPair = await generateKeyPair();
      const publicKeyBase64 = await exportPublicKey(this.keyPair.publicKey);
      console.log('Encryption state initialized');
      return publicKeyBase64;
    } catch (error) {
      console.error('Failed to initialize encryption state:', error);
      throw error;
    }
  }

  async processRemotePublicKey(remotePublicKeyBase64) {
    try {
      this.remotePublicKey = await importPublicKey(remotePublicKeyBase64);
      this.sharedSecret = await deriveSharedSecret(this.keyPair.privateKey, this.remotePublicKey);
      this.isHandshakeComplete = true;
      console.log('Encryption handshake completed');
      return true;
    } catch (error) {
      console.error('Failed to process remote public key:', error);
      this.isHandshakeComplete = false;
      throw error;
    }
  }

  isReady() {
    return this.isHandshakeComplete;
  }

  async encryptMessage(message) {
    if (!this.isHandshakeComplete) {
      console.error('Encryption handshake not complete');
      throw new Error('Encryption handshake not complete');
    }
    return encrypt(message, this.sharedSecret);
  }

  async decryptMessage(encryptedData) {
    if (!this.isHandshakeComplete) {
      console.error('Encryption handshake not complete');
      throw new Error('Encryption handshake not complete');
    }
    return decrypt(encryptedData, this.sharedSecret);
  }

  reset() {
    this.keyPair = null;
    this.remotePublicKey = null;
    this.sharedSecret = null;
    this.isHandshakeComplete = false;
    console.log('Encryption state reset');
  }
}

// 群聊密钥管理
const groupKeys = {};

// 生成群组共享密钥
const generateGroupSharedKey = async (groupId) => {
  try {
    // 生成随机AES-GCM密钥
    const key = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    
    // 导出密钥（用于分发）
    const exportedKey = await window.crypto.subtle.exportKey("raw", key);
    const keyBase64 = utils.arrayBufferToBase64(exportedKey);
    
    // 存储密钥
    groupKeys[groupId] = {
      key,
      keyBase64,
      version: 1,
      createdAt: Date.now()
    };
    
    return {
      version: 1,
      keyData: keyBase64
    };
  } catch (error) {
    console.error("生成群组共享密钥失败:", error);
    throw error;
  }
};

// 导入群组共享密钥
const importGroupSharedKey = async (groupId, keyData, keyVersion) => {
  try {
    const keyBuffer = utils.base64ToArrayBuffer(keyData);
    
    // 导入密钥
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    
    // 存储密钥
    groupKeys[groupId] = {
      key,
      keyBase64: keyData,
      version: keyVersion,
      createdAt: Date.now()
    };
    
    return true;
  } catch (error) {
    console.error("导入群组共享密钥失败:", error);
    throw error;
  }
};

// 加密群组消息
const encryptGroupMessage = async (message, groupId, keyVersion) => {
  try {
    const groupKey = groupKeys[groupId];
    if (!groupKey) throw new Error("找不到群组密钥");
    if (groupKey.version !== keyVersion) throw new Error("密钥版本不匹配");
    
    const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const messageBuffer = utils.stringToArrayBuffer(messageString);
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      groupKey.key,
      messageBuffer
    );
    
    const encryptedBase64 = utils.arrayBufferToBase64(encryptedBuffer);
    const ivBase64 = utils.arrayBufferToBase64(iv);
    
    return {
      type: 'encrypted-group-message',
      groupId,
      keyVersion,
      iv: ivBase64,
      ciphertext: encryptedBase64
    };
  } catch (error) {
    console.error("加密群组消息失败:", error);
    throw error;
  }
};

// 解密群组消息
const decryptGroupMessage = async (encryptedData, groupId) => {
  try {
    const groupKey = groupKeys[groupId];
    if (!groupKey) throw new Error("找不到群组密钥");
    if (groupKey.version !== encryptedData.keyVersion) throw new Error("密钥版本不匹配");
    
    const iv = utils.base64ToArrayBuffer(encryptedData.iv);
    const ciphertext = utils.base64ToArrayBuffer(encryptedData.ciphertext);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv), tagLength: 128 },
      groupKey.key,
      ciphertext
    );
    
    const decryptedString = utils.arrayBufferToString(decryptedBuffer);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error("解密群组消息失败:", error);
    throw error;
  }
};

// 为文件加密而设计的原始数据加密
const encryptRawForGroup = async (data, groupId, keyVersion) => {
  try {
    const groupKey = groupKeys[groupId];
    if (!groupKey) throw new Error("找不到群组密钥");
    if (groupKey.version !== keyVersion) throw new Error("密钥版本不匹配");
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      groupKey.key,
      data
    );
    
    // 组合IV和密文
    const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedBuffer), iv.length);
    
    return result;
  } catch (error) {
    console.error("加密原始数据失败:", error);
    throw error;
  }
};

// 解密原始数据
const decryptRawForGroup = async (encryptedData, groupId, keyVersion) => {
  try {
    const groupKey = groupKeys[groupId];
    if (!groupKey) throw new Error("找不到群组密钥");
    if (groupKey.version !== keyVersion) throw new Error("密钥版本不匹配");
    
    // 提取IV和密文
    const iv = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      groupKey.key,
      ciphertext
    );
    
    return new Uint8Array(decryptedBuffer);
  } catch (error) {
    console.error("解密原始数据失败:", error);
    throw error;
  }
};

export const encryptionService = {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  encrypt,
  decrypt,
  encryptRaw,
  decryptRaw,
  createKeyExchangeMessage,
  EncryptionState,
  utils,
  generateGroupSharedKey,
  importGroupSharedKey,
  encryptGroupMessage,
  decryptGroupMessage,
  encryptRawForGroup,
  decryptRawForGroup,
  groupKeys
};
