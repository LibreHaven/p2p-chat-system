// Centralized event names for eventBus topics
export const Events = Object.freeze({
  CHAT_INCOMING: 'chat:incoming',
  CHAT_OUTGOING: 'chat:outgoing',
  CONNECTION_INCOMING: 'connection:incoming',
  TELEMETRY_SAFE_SEND: 'telemetry:safeSend',
  TELEMETRY_CONNECTION: 'telemetry:connection',
});

export default Events;
