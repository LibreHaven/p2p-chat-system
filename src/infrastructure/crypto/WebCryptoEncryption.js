import { encryptionService } from '../../services/encryptionService';

// 适配器：实现 IEncryption 接口，封装现有 encryptionService.EncryptionState
class WebCryptoEncryption {
  constructor() {
    this._state = null;
  }

  async initialize() {
    if (!this._state) {
      this._state = new encryptionService.EncryptionState();
    }
    // EncryptionState.initialize 返回本地公钥 base64
    const publicKeyBase64 = await this._state.initialize();
    return publicKeyBase64;
  }

  async processRemotePublicKey(base64) {
    if (!this._state) {
      this._state = new encryptionService.EncryptionState();
      await this._state.initialize();
    }
    await this._state.processRemotePublicKey(base64);
  }

  isReady() {
    return !!this._state?.isReady?.();
  }

  async encryptMessage(message) {
    if (!this._state) throw new Error('Encryption not initialized');
    return this._state.encryptMessage(message);
  }

  async decryptMessage(encryptedData) {
    if (!this._state) throw new Error('Encryption not initialized');
    return this._state.decryptMessage(encryptedData);
  }

  async exportPublicKey() {
    if (!this._state?.keyPair?.publicKey) {
      return this.initialize();
    }
    return encryptionService.exportPublicKey(this._state.keyPair.publicKey);
  }

  createKeyExchangeMessage(publicKeyBase64) {
    return encryptionService.createKeyExchangeMessage(publicKeyBase64);
  }

  reset() {
    if (this._state?.reset) this._state.reset();
    this._state = null;
  }

  get sharedSecret() {
    return this._state?.sharedSecret || null;
  }
}

export default WebCryptoEncryption;
