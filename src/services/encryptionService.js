import CryptoJS from 'crypto-js';

// 生成密钥对
const generateKeyPair = () => {
  try {
    // 生成私钥（随机字节）
    const privateKey = CryptoJS.lib.WordArray.random(32); // 256位私钥
    
    // 从私钥派生公钥（这里简化处理，实际应使用椭圆曲线密码学）
    // 在真实场景中，应使用 ECDH 或其他密钥交换算法
    const publicKey = CryptoJS.SHA256(privateKey);
    
    console.log('生成密钥对成功');
    
    return {
      privateKey,
      publicKey
    };
  } catch (error) {
    console.error('生成密钥对失败:', error);
    return null;
  }
};

// 派生共享密钥
const deriveSharedSecret = (privateKey, publicKey, isInitiator) => {
  try {
    console.log('派生共享密钥, 角色:', isInitiator ? '发起方' : '接收方');
    
    // 在真实场景中，这里应该使用 ECDH 密钥交换算法
    // 这里简化处理，使用私钥和公钥的组合生成共享密钥
    let sharedSecret;
    
    if (isInitiator) {
      // 发起方的共享密钥派生
      sharedSecret = CryptoJS.HmacSHA256(publicKey, privateKey);
    } else {
      // 接收方的共享密钥派生
      sharedSecret = CryptoJS.HmacSHA256(privateKey, publicKey);
    }
    
    console.log('派生共享密钥成功');
    
    // 返回十六进制字符串格式的共享密钥
    return sharedSecret.toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('派生共享密钥失败:', error);
    return null;
  }
};

// 处理密钥交换
const handleKeyExchange = (privateKey, publicKeyHex, isInitiator) => {
  try {
    // 将十六进制字符串转换回 WordArray
    const publicKey = CryptoJS.enc.Hex.parse(publicKeyHex);
    
    // 派生共享密钥
    return deriveSharedSecret(privateKey, publicKey, isInitiator);
  } catch (error) {
    console.error('处理密钥交换失败:', error);
    return null;
  }
};

// 创建密钥交换消息
const createKeyExchangeMessage = (publicKey, isInitiator) => {
  try {
    // 将公钥转换为十六进制字符串
    const publicKeyHex = publicKey.toString(CryptoJS.enc.Hex);
    
    console.log('创建密钥交换消息, 公钥长度:', publicKeyHex.length, '角色:', isInitiator ? '发起方' : '接收方');
    
    // 创建密钥交换消息
    return {
      type: 'encryption-key',
      publicKey: publicKeyHex,
      isInitiator: isInitiator
    };
  } catch (error) {
    console.error('创建密钥交换消息失败:', error);
    return null;
  }
};

// 加密消息
const encrypt = (plaintext, sharedSecret) => {
  try {
    console.log('加密消息:', plaintext);
    
    // 将共享密钥转换为 WordArray
    const key = CryptoJS.enc.Hex.parse(sharedSecret);
    
    // 生成随机初始化向量
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // 使用 AES-CBC 模式加密
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });
    
    // 将加密结果和初始化向量组合
    const result = {
      type: 'encrypted-message',
      iv: iv.toString(CryptoJS.enc.Hex),
      ciphertext: encrypted.toString()
    };
    
    return result;
  } catch (error) {
    console.error('加密失败:', error);
    return null;
  }
};

// 解密消息
const decrypt = (encryptedData, sharedSecret) => {
  try {
    // 确保数据格式正确
    if (!encryptedData || !encryptedData.type || encryptedData.type !== 'encrypted-message') {
      console.error('无效的加密数据格式');
      return null;
    }
    
    // 将共享密钥转换为 WordArray
    const key = CryptoJS.enc.Hex.parse(sharedSecret);
    
    // 将初始化向量转换为 WordArray
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    
    // 使用 AES-CBC 模式解密
    const decrypted = CryptoJS.AES.decrypt(encryptedData.ciphertext, key, {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });
    
    // 将解密结果转换为字符串
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
};

// 导出服务
export const encryptionService = {
  generateKeyPair,
  deriveSharedSecret,
  handleKeyExchange,
  createKeyExchangeMessage,
  encrypt,
  decrypt
};
