/**
 * encryptionService.js
 * 
 * 使用 Web Crypto API 实现 ECDH 密钥交换和 AES-GCM 加密。
 */

import * as utils from './utils';
export { utils };
export * from './ecdh';
export * from './aes';
export * from './group';

// 兼容原有encryptionService对象导出
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret
} from './ecdh';
import {
  encrypt,
  decrypt,
  encryptRaw,
  decryptRaw
} from './aes';
import {
  groupKeys,
  generateGroupSharedKey,
  importGroupSharedKey
} from './group';

// 其余原有函数和类
const createKeyExchangeMessage = (publicKeyBase64) => {
  return { type: 'encryption-key', publicKey: publicKeyBase64 };
};

class EncryptionState {
  constructor() {
    this.keyPair = null;
    this.remotePublicKey = null;
    this.sharedSecret = null;
    this.isHandshakeComplete = false;
  }
  async initialize() {
    this.keyPair = await generateKeyPair();
    const publicKeyBase64 = await exportPublicKey(this.keyPair.publicKey, utils);
    return publicKeyBase64;
  }
  async processRemotePublicKey(remotePublicKeyBase64) {
    this.remotePublicKey = await importPublicKey(remotePublicKeyBase64, utils);
    this.sharedSecret = await deriveSharedSecret(this.keyPair.privateKey, this.remotePublicKey);
    this.isHandshakeComplete = true;
    return true;
  }
  isReady() {
    return this.isHandshakeComplete;
  }
  async encryptMessage(message) {
    if (!this.isHandshakeComplete) throw new Error('Encryption handshake not complete');
    return encrypt(message, this.sharedSecret, utils);
  }
  async decryptMessage(encryptedData) {
    if (!this.isHandshakeComplete) throw new Error('Encryption handshake not complete');
    return decrypt(encryptedData, this.sharedSecret, utils);
  }
  reset() {
    this.keyPair = null;
    this.remotePublicKey = null;
    this.sharedSecret = null;
    this.isHandshakeComplete = false;
  }
}

export const encryptionService = {
  generateKeyPair: () => generateKeyPair(),
  exportPublicKey: (key) => exportPublicKey(key, utils),
  importPublicKey: (key) => importPublicKey(key, utils),
  deriveSharedSecret,
  encrypt: (msg, key) => encrypt(msg, key, utils),
  decrypt: (data, key) => decrypt(data, key, utils),
  encryptRaw: (data, key) => encryptRaw(data, key, utils),
  decryptRaw: (data, key) => decryptRaw(data, key, utils),
  createKeyExchangeMessage,
  EncryptionState,
  utils,
  generateGroupSharedKey,
  importGroupSharedKey,
  groupKeys
};
