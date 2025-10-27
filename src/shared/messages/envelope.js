// 统一消息信封定义（轻量版，后续可扩展为 zod 校验与版本迁移）

export const EnvelopeVersion = 1;

export const MessageTypes = Object.freeze({
  Message: 'message',
  FileMetadata: 'file-metadata',
  FileChunk: 'file-chunk',
  HandshakeKey: 'encryption-key',
  EncryptionReady: 'encryption-ready',
  EncryptionReadyResp: 'encryption-ready-response',
  Heartbeat: 'heartbeat',
  HeartbeatResp: 'heartbeat-response',
  ConnectionRequest: 'connection-request',
  ConnectionAccepted: 'connection-accepted',
  ConnectionRejected: 'connection-rejected',
});

export const createEnvelope = (type, payload = {}) => ({
  v: EnvelopeVersion,
  type,
  ...payload,
});
