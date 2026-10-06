/**
 * Encryption utilities for secure storage of sensitive data.
 * Uses Web Crypto API (AES-GCM) with a derived key.
 */

const STORAGE_KEY = 'decent-openapi-crypto-key';
const ALGORITHM = 'AES-GCM';

/** Get or create the encryption key */
async function getCryptoKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined') throw new Error('Crypto only available in browser');

  let keyData = sessionStorage.getItem(STORAGE_KEY);
  if (!keyData) {
    const key = await window.crypto.subtle.generateKey(
      { name: ALGORITHM, length: 256 },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
    const exported = await window.crypto.subtle.exportKey('raw', key);
    keyData = btoa(String.fromCharCode(...new Uint8Array(exported)));
    sessionStorage.setItem(STORAGE_KEY, keyData);
    return key;
  }

  const raw = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  return window.crypto.subtle.importKey('raw', raw, { name: ALGORITHM }, false, ['encrypt', 'decrypt']);
}

/** Encrypt a string value */
export async function encrypt(value: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encoded = new TextEncoder().encode(value);
  const encrypted = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt a string value */
export async function decrypt(encryptedB64: string): Promise<string> {
  const key = await getCryptoKey();
  const combined = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

/** Check if a value appears to be encrypted (base64 with IV + data) */
function looksEncrypted(value: string): boolean {
  try {
    const decoded = atob(value);
    return decoded.length > 12; // IV (12) + at least 1 byte data
  } catch {
    return false;
  }
}

/** Wrapper for sessionStorage that encrypts sensitive values */
export const secureSessionStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const encrypted = await encrypt(value);
    sessionStorage.setItem(key, encrypted);
  },

  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    if (!looksEncrypted(stored)) return stored; // legacy/unencrypted
    try {
      return await decrypt(stored);
    } catch {
      return null; // corrupted or wrong key
    }
  },

  removeItem(key: string): void {
    if (typeof window !== 'undefined') sessionStorage.removeItem(key);
  },
};

/** Wrapper for localStorage that encrypts sensitive values */
export const secureLocalStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const encrypted = await encrypt(value);
    localStorage.setItem(key, encrypted);
  },

  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    if (!looksEncrypted(stored)) return stored; // legacy/unencrypted
    try {
      return await decrypt(stored);
    } catch {
      return null;
    }
  },

  removeItem(key: string): void {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
  },
};