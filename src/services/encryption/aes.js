// AES-GCM加解密相关

export const encrypt = async (message, sharedKey, utils) => {
  const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const messageBuffer = utils.stringToArrayBuffer(messageString);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    sharedKey,
    messageBuffer
  );
  return {
    type: 'encrypted-message',
    iv: utils.arrayBufferToBase64(iv),
    ciphertext: utils.arrayBufferToBase64(encryptedBuffer)
  };
};

export const decrypt = async (encryptedData, sharedKey, utils) => {
  if (!encryptedData || typeof encryptedData !== 'object' || encryptedData.type !== 'encrypted-message') {
    throw new Error('Invalid encrypted data format');
  }
  const iv = utils.base64ToArrayBuffer(encryptedData.iv);
  const ciphertext = utils.base64ToArrayBuffer(encryptedData.ciphertext);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv), tagLength: 128 },
    sharedKey,
    ciphertext
  );
  return utils.arrayBufferToString(decryptedBuffer);
};

export const encryptRaw = async (base64Data, sharedKey, utils) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const dataBuffer = utils.base64ToArrayBuffer(base64Data);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    sharedKey,
    dataBuffer
  );
  return {
    type: 'encrypted-binary',
    iv: utils.arrayBufferToBase64(iv),
    encryptedData: utils.arrayBufferToBase64(encryptedBuffer)
  };
};

export const decryptRaw = async (encryptedData, sharedKey, utils) => {
  if (!encryptedData || !encryptedData.iv || !encryptedData.encryptedData) {
    throw new Error('Invalid encrypted binary data format');
  }
  const iv = utils.base64ToArrayBuffer(encryptedData.iv);
  const ciphertext = utils.base64ToArrayBuffer(encryptedData.encryptedData);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv), tagLength: 128 },
    sharedKey,
    ciphertext
  );
  return utils.arrayBufferToBase64(decryptedBuffer);
}; 