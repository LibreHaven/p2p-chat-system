// message/index.js 拆分聚合导出
import * as types from './types';
import * as utils from './utils';

export * from './types';
export * from './utils';

// 兼容原有messageService对象导出
const messageServiceObj = {
  createMessage: types.createMessage,
  createGroupMessage: (content, groupId, type = "text", metadata = {}, sender = null) =>
    types.createGroupMessage(content, groupId, type, metadata, sender, utils.generateUUID),
  serializeMessage: utils.serializeMessage,
  deserializeMessage: utils.deserializeMessage,
  generateUUID: utils.generateUUID,
  formatSystemMessage: types.formatSystemMessage
};

export default messageServiceObj;
export const messageService = messageServiceObj;
