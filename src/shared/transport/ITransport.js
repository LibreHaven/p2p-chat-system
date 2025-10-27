/**
 * ITransport - minimal transport contract for decoupling PeerJS/WebRTC from application logic.
 * This is a documentation contract; implementations should adhere to these method shapes.
 *
 * Events: 'open' | 'close' | 'error' | 'message' | 'file-metadata' | 'file-chunk'
 * Data payload shapes follow the MessageEnvelope definitions in shared/messages/envelope.js
 *
 * @typedef {Object} ITransport
 * @property {(targetId: string) => Promise<void>} connect
 * @property {() => Promise<void>} disconnect
 * @property {(data: string | ArrayBuffer | Uint8Array | object) => Promise<boolean>} send
 * @property {(event: string, handler: Function) => () => void} on
 * @property {() => 'connected' | 'connecting' | 'disconnected'} status
 */

export const JSDocOnly = {};
