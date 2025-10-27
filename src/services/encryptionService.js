/**
 * encryptionService.js
 * 
 * 使用 Web Crypto API 实现 ECDH 密钥交换和 AES-GCM 加密。
 */

const utils = {
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    // Prefer browser API when available
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }
    // Node/SSR-safe fallback using Buffer
    // Note: Buffer is available in Node and most Jest environments
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    // Ultimate fallback (should rarely happen)
    throw new Error('Base64 encoding is not supported in the current environment');
  },

  base64ToArrayBuffer(base64) {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      const binaryString = window.atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(base64, 'base64');
      // Return a clean ArrayBuffer slice that matches the Buffer's actual data range
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    throw new Error('Base64 decoding is not supported in the current environment');
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
      true,
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
    console.log('开始加密消息，数据长度:', messageString.length);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const messageBuffer = utils.stringToArrayBuffer(messageString);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      sharedKey,
      messageBuffer
    );
    const encryptedBase64 = utils.arrayBufferToBase64(encryptedBuffer);
    const ivBase64 = utils.arrayBufferToBase64(iv);
    const result = { type: 'encrypted-message', iv: ivBase64, ciphertext: encryptedBase64 };
    console.log('加密完成，IV长度:', result.iv.length, 'Ciphertext长度:', result.ciphertext.length);
    return result;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
};

export const decrypt = async (encryptedData, sharedKey) => {
  try {
    console.log('开始解密消息，数据类型:', typeof encryptedData);
    console.log('加密数据内容:', encryptedData);
    
    // 仅处理普通文本消息加密格式
    if (
      !encryptedData ||
      typeof encryptedData !== 'object' ||
      encryptedData.type !== 'encrypted-message' ||
      typeof encryptedData.iv !== 'string' ||
      typeof encryptedData.ciphertext !== 'string'
    ) {
      console.error('Invalid encrypted data format:', encryptedData);
      // 第153行，建议统一错误处理方式
      // 当前：return null;  // 或者抛出异常：throw new Error('Invalid encrypted data format');
      // 建议改为：
      throw new Error('Invalid encrypted data format');
    }
    
    console.log('IV长度:', encryptedData.iv.length, 'Ciphertext长度:', encryptedData.ciphertext.length);
    
    // 修改处：使用 utils. 前缀调用工具函数
    const iv = utils.base64ToArrayBuffer(encryptedData.iv);
    const ciphertext = utils.base64ToArrayBuffer(encryptedData.ciphertext);
    
    console.log('IV Buffer长度:', iv.byteLength, 'Encrypted Buffer长度:', ciphertext.byteLength);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv), tagLength: 128 },
      sharedKey,
      ciphertext
    );
    const decryptedString = utils.arrayBufferToString(decryptedBuffer);
    console.log('解密成功，解密后数据长度:', decryptedString.length);
    return decryptedString;
  } catch (error) {
    console.error('解密失败:', error);
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
  utils
};
