import { store } from './store.js';
import { normalizePhone, isValidPin } from './utils.js';

const SESSION_KEY = 'fo_session';

/**
 * Hash PIN using Web Crypto SHA-256 or fallback for Node test environment
 */
export async function hashPin(pin, salt) {
  const combined = `${pin}:${salt}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for Node.js test environment if crypto.subtle isn't configured identically
  try {
    const nodeCrypto = await import('node:crypto');
    return nodeCrypto.createHash('sha256').update(combined).digest('hex');
  } catch (e) {
    // Basic fallback hash for non-crypto mock
    let h = 0;
    for (let i = 0; i < combined.length; i++) {
      h = (Math.imul(31, h) + combined.charCodeAt(i)) | 0;
    }
    return 'fallback-hash-' + Math.abs(h);
  }
}

export function getCurrentSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      logout();
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

export function currentUser() {
  const session = getCurrentSession();
  if (!session) return null;
  const user = store.findUserById(session.userId);
  if (!user || !user.active) {
    logout();
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role
  };
}

export async function login(phone, pin) {
  const normPhone = normalizePhone(phone);
  if (!normPhone) {
    throw new Error('Nomor HP tidak valid. Masukkan minimal 10 digit (contoh: 08123456789)');
  }
  if (!isValidPin(pin)) {
    throw new Error('PIN harus berupa 6 angka');
  }

  const user = store.findUserByPhone(normPhone);
  if (!user) {
    throw new Error('Nomor HP belum terdaftar. Silakan hubungi Admin.');
  }
  if (!user.active) {
    throw new Error('Akun dinonaktifkan. Silakan hubungi Admin.');
  }

  const calculatedHash = await hashPin(pin, user.salt);
  if (calculatedHash !== user.pinHash) {
    throw new Error('PIN salah. Silakan coba lagi.');
  }

  // Session expires in 12 hours
  const session = {
    userId: user.id,
    role: user.role,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function hasAdmin() {
  return store.hasAdmin();
}
