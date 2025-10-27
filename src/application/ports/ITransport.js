/**
 * ITransport - messaging transport contract
 * This is a documentation-only interface (JSDoc) for gradual migration.
 *
 * Implementations should provide:
 * - send(payload): Promise<boolean|void> truthy on success
 * - on(event, handler): () => void unsubscribe
 * - status(): 'connected' | 'connecting' | 'disconnected' | string
 */

/**
 * @typedef {Object} ITransport
 * @property {(data: any) => Promise<boolean|void>} send
 * @property {(event: 'open'|'message'|'close'|'error', handler: Function) => Function} on
 * @property {() => ('connected'|'connecting'|'disconnected'|string)} status
 */

export default {}; // marker file for interface shape only
