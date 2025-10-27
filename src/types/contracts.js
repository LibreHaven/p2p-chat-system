/**
 * Lightweight shared contracts for envelopes, transport, and encryption.
 * JSDoc-only types to improve editor IntelliSense without changing runtime.
 */

/**
 * @typedef {Object} Envelope
 * @property {number} v - Envelope version
 * @property {string} type - Message type identifier
 * @property {any} [payload] - Optional payload fields (open set)
 */

/**
 * @typedef {Object} FileMetadataEnvelope
 * @property {number} v
 * @property {"file-metadata"} type
 * @property {string} transferId
 * @property {string} fileName
 * @property {string} fileType
 * @property {number} fileSize
 * @property {number} chunksCount
 * @property {number} timestamp
 */

/**
 * Encrypted text envelope produced by encryptionService.encrypt
 * @typedef {Object} EncryptedMessageEnvelope
 * @property {"encrypted-message"} type
 * @property {string} iv - Base64 IV
 * @property {string} ciphertext - Base64 ciphertext
 */

/**
 * Encrypted binary envelope produced by encryptionService.encryptRaw
 * @typedef {Object} EncryptedBinaryEnvelope
 * @property {"encrypted-binary"} type
 * @property {string} iv - Base64 IV
 * @property {string} encryptedData - Base64 ciphertext
 */

/**
 * @typedef {Object} FileChunkEnvelope
 * @property {number} v
 * @property {"file-chunk"} type
 * @property {string} transferId
 * @property {number} chunkIndex
 * @property {boolean} isLastChunk
 * @property {EncryptedBinaryEnvelope} [encryptedData] - Encrypted chunk, if encryption enabled
 * @property {ArrayBuffer} [chunkData] - Plain chunk bytes (non-encrypted path)
 */

/**
 * Safe sender function: attempts primary send first, then fallback; returns boolean accepted flag
 * @typedef {(conn:any, data:any) => boolean} SafeSend
 */

/**
 * Minimal transport contract used around the app (PeerTransport/PeerConnectionTransport)
 * @typedef {Object} ITransport
 * @property {(data:any) => (void|Promise<void>)} send
 * @property {(handler:(data:any)=>void) => (()=>void)} onMessage
 * @property {() => ("connected"|"connecting"|"disconnected")} status
 */

/**
 * Minimal encryption interface surface used in routing/services
 * @typedef {Object} IEncryption
 * @property {(plain:string|ArrayBuffer, key:any)=>Promise<EncryptedMessageEnvelope>} encrypt
 * @property {(env:EncryptedMessageEnvelope, key:any)=>Promise<string>} decrypt
 * @property {(base64:string, key:any)=>Promise<EncryptedBinaryEnvelope>} encryptRaw
 * @property {(env:EncryptedBinaryEnvelope, key:any)=>Promise<string>} decryptRaw
 */

export {}; // This file is JSDoc types only.
