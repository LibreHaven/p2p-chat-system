/**
 * IStorage - key/value persistence contract used by the application layer.
 * Provides a minimal subset for session-like state with bool helpers.
 */

/**
 * @typedef {Object} IStorage
 * @property {(key: string, value: string) => void} setItem
 * @property {(key: string) => (string|null)} getItem
 * @property {(key: string) => void} removeItem
 * @property {(key: string, value: boolean) => void} setBool
 * @property {(key: string, defaultValue?: boolean) => boolean} getBool
 */

export default {};
