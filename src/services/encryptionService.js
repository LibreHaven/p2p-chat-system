import CryptoJS from 'crypto-js';

// 加密服务
const encryptionService = {
  // ECDH 密钥协商
  // 使用椭圆曲线 Curve25519 算法实现
  generateKeyPair: () => {
    // 生成随机的私钥（32字节）
    const privateKey = CryptoJS.lib.WordArray.random(32);
    
    // 在实际的 ECDH 中，公钥是通过椭圆曲线运算从私钥派生的
    // 由于浏览器中没有原生的 Curve25519 支持，这里我们使用一个简化的模拟
    // 在实际生产环境中，应使用 SubtleCrypto API 或专门的库如 tweetnacl-js
    
    // 使用 SHA-256 哈希私钥来模拟公钥派生
    // 注意：这不是真正的 ECDH，仅用于演示
    const publicKey = CryptoJS.SHA256(privateKey.toString());
    
    return {
      privateKey: privateKey,
      publicKey: publicKey
    };
  },
  
  deriveSharedSecret: (privateKey, otherPublicKey) => {
    // 在真正的 ECDH 中，共享密钥是通过椭圆曲线运算计算的
    // 这里我们使用 HMAC 来模拟这个过程
    // 注意：这不是真正的 ECDH，仅用于演示
    
    const sharedSecret = CryptoJS.HmacSHA256(
      otherPublicKey.toString(),
      privateKey.toString()
    );
    
    // 使用 SHA-256 哈希共享密钥以获得适合 AES-256 的密钥
    return CryptoJS.SHA256(sharedSecret.toString()).toString();
  },
  
  // 生成初始化向量 (IV)
  generateIV: () => {
    return CryptoJS.lib.WordArray.random(16); // 16 字节 IV
  },
  
  // AES-256 加密
  encrypt: (message, key, iv = null) => {
    // 如果没有提供 IV，则生成一个新的
    const useIV = iv || encryptionService.generateIV();
    
    // 使用 AES-256-CBC 模式加密
    const encrypted = CryptoJS.AES.encrypt(message, key, {
      iv: useIV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // 将 IV 和密文一起返回，以便解密时使用
    return {
      iv: useIV.toString(),
      ciphertext: encrypted.toString()
    };
  },
  
  // AES-256 解密
  decrypt: (encryptedData, key) => {
    try {
      // 从加密数据中提取 IV 和密文
      const { iv, ciphertext } = encryptedData;
      
      // 使用相同的 IV 和密钥解密
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // 将解密结果转换为 UTF-8 字符串
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('解密失败:', error);
      return null;
    }
  },
  
  // 创建密钥交换消息
  createKeyExchangeMessage: (publicKey) => {
    return {
      type: 'encryption-key',
      publicKey: publicKey.toString()
    };
  },
  
  // 处理密钥交换
  handleKeyExchange: (privateKey, receivedPublicKey) => {
    // 将接收到的公钥字符串转换为 WordArray
    const otherPublicKey = CryptoJS.enc.Hex.parse(receivedPublicKey);
    
    // 派生共享密钥
    const sharedSecret = encryptionService.deriveSharedSecret(privateKey, otherPublicKey);
    
    return sharedSecret;
  }
};

export { encryptionService };
