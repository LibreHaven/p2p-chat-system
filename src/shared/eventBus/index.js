// 轻量事件总线，具备基本的订阅/发布与无订阅时的消息缓冲
// 用于替代 window.chatSessionHandler/pendingChatMessages 的全局桥接方式

const subscribers = new Map(); // event -> Set<handler>
const pending = new Map(); // event -> Array<payload>

const getSet = (event) => {
  if (!subscribers.has(event)) {
    subscribers.set(event, new Set());
  }
  return subscribers.get(event);
};

const getBuffer = (event) => {
  if (!pending.has(event)) {
    pending.set(event, []);
  }
  return pending.get(event);
};

export const eventBus = {
  on(event, handler) {
    const set = getSet(event);
    set.add(handler);

    // 如果此前没有订阅者，且存在缓冲的消息，这里进行一次性冲刷
    const buffer = getBuffer(event);
    if (buffer.length > 0) {
      // 拷贝并清空，避免递归触发
      const cached = buffer.splice(0, buffer.length);
      cached.forEach((payload) => {
        try {
          handler(payload);
        } catch (e) {
          // 避免打断后续派发
          // eslint-disable-next-line no-console
          console.error('eventBus handler failed:', e);
        }
      });
    }

    return () => {
      const current = subscribers.get(event);
      current?.delete(handler);
    };
  },

  emit(event, payload) {
    const set = subscribers.get(event);
    if (!set || set.size === 0) {
      // 无订阅者则缓冲，等首个订阅者出现时再冲刷
      getBuffer(event).push(payload);
      return;
    }
    set.forEach((handler) => {
      try {
        handler(payload);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('eventBus handler failed:', e);
      }
    });
  },
};

export default eventBus;
