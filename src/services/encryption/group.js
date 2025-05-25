// 群组密钥管理相关
import * as utils from './utils';

export const groupKeys = {};

export const generateGroupSharedKey = async (groupId) => {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exportedKey = await window.crypto.subtle.exportKey('raw', key);
  const keyBase64 = utils.arrayBufferToBase64(exportedKey);
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
};

export const importGroupSharedKey = async (groupId, keyData, keyVersion) => {
  const keyBuffer = utils.base64ToArrayBuffer(keyData);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  groupKeys[groupId] = {
    key,
    keyBase64: keyData,
    version: keyVersion,
    createdAt: Date.now()
  };
  return true;
}; 