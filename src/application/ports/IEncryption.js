// IEncryption 接口定义（文档化接口，用于解耦 Hook 与具体实现）

/**
 * interface IEncryption {
 *   initialize(): Promise<string>                // 生成密钥对并返回本地公钥（base64）
 *   processRemotePublicKey(base64: string): Promise<void>
 *   isReady(): boolean
 *   encryptMessage(message: string): Promise<object>  // 返回 { type: 'encrypted-message', ... }
 *   decryptMessage(encryptedData: object): Promise<string>
 *   exportPublicKey(): Promise<string>          // 当前公钥 base64
 *   reset(): void
 *   readonly sharedSecret: CryptoKey | null
 *   createKeyExchangeMessage(pubKeyBase64: string): { type: 'encryption-key', publicKey: string }
 * }
 */

export default {};
