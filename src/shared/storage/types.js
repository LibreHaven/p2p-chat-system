/**
 * @typedef {Object} IStorage
 * @property {(key: string, defaultValue?: string|null) => string|null} getItem
 * @property {(key: string, value: string) => void} setItem
 * @property {(key: string) => void} removeItem
 * @property {(key: string, defaultValue?: boolean) => boolean} getBool
 * @property {(key: string, value: boolean) => void} setBool
 */

// This file documents the storage contract used across the app.
// Implementations:
// - default export from shared/storage/session.js (session-backed with memory fallback)
// - createMemoryStorage() from shared/storage/session.js (pure in-memory; tests/mocks)

export const JSDocOnly = {};