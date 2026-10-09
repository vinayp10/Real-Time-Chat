// IndexedDB helpers
const DB_NAME = 'whisper-crypto';
const STORE_NAME = 'keys';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIDB(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getFromIDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromIDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Key Generation
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable=true for backup capability
    ['deriveKey', 'deriveBits']
  );

  await saveToIDB('privateKey', keyPair.privateKey);
  await saveToIDB('publicKey', keyPair.publicKey);

  const publicKeyJWK = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  return { publicKeyJWK };
}

// Key Derivation for 1:1 chats
export async function deriveSharedSecret(theirPublicKeyJWK) {
  if (typeof theirPublicKeyJWK === 'string') {
    try {
      theirPublicKeyJWK = JSON.parse(theirPublicKeyJWK);
    } catch (e) {
      console.error('Invalid JWK string', e);
    }
  }

  const myPrivateKey = await getFromIDB('privateKey');
  if (!myPrivateKey) throw new Error('No private key found');

  const theirPublicKey = await crypto.subtle.importKey(
    'jwk',
    theirPublicKeyJWK,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  // Derive bits first
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    256
  );

  // Import bits as base key for HKDF
  const baseKey = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key using HKDF
  const encoder = new TextEncoder();
  const salt = encoder.encode('whisper-e2e');
  const info = encoder.encode('chat-encryption');

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: info
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return aesKey;
}

// Helpers for base64
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Encryption
export async function encryptMessage(plaintext, aesKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    encodedText
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  };
}

// Decryption
export async function decryptMessage(ciphertextB64, ivB64, aesKey) {
  const ciphertext = base64ToArrayBuffer(ciphertextB64);
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
  
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    ciphertext
  );

  return new TextDecoder().decode(decryptedData);
}

// Group Encryption
export async function generateGroupKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const rawKey = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(rawKey);
}

export async function encryptGroupKey(groupKeyB64, theirPublicKeyJWK) {
  const aesKey = await deriveSharedSecret(theirPublicKeyJWK);
  const rawGroupKey = base64ToArrayBuffer(groupKeyB64);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    rawGroupKey
  );

  return {
    encryptedKey: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  };
}

export async function decryptGroupKey(encryptedKeyB64, ivB64, theirPublicKeyJWK) {
  const aesKey = await deriveSharedSecret(theirPublicKeyJWK);
  const ciphertext = base64ToArrayBuffer(encryptedKeyB64);
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
  
  const rawGroupKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    ciphertext
  );

  return crypto.subtle.importKey(
    'raw',
    rawGroupKey,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function importGroupKey(rawKeyB64) {
  const rawKey = base64ToArrayBuffer(rawKeyB64);
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

// File Encryption
export async function encryptFile(fileArrayBuffer, aesKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    fileArrayBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  };
}

export async function decryptFile(ciphertextB64, ivB64, aesKey) {
  const ciphertext = base64ToArrayBuffer(ciphertextB64);
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
  
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    ciphertext
  );
}

// Safety Number (public key fingerprint)
export async function generateSafetyNumber(publicKeyJWK1, publicKeyJWK2) {
  if (typeof publicKeyJWK1 === 'string') publicKeyJWK1 = JSON.parse(publicKeyJWK1);
  if (typeof publicKeyJWK2 === 'string') publicKeyJWK2 = JSON.parse(publicKeyJWK2);

  const str1 = JSON.stringify(publicKeyJWK1, Object.keys(publicKeyJWK1).sort());
  const str2 = JSON.stringify(publicKeyJWK2, Object.keys(publicKeyJWK2).sort());
  
  const combined = [str1, str2].sort().join('');
  const encoded = new TextEncoder().encode(combined);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  
  const hashArray = Array.from(new Uint8Array(hash));
  let digits = '';
  for (let i = 0; i < hashArray.length; i++) {
    digits += hashArray[i].toString().padStart(3, '0');
  }
  
  const numberStr = digits.substring(0, 30);
  return numberStr.match(/.{1,5}/g).join(' ');
}

// Private Key Backup
export async function exportPrivateKeyEncrypted(passphrase) {
  const privateKey = await getFromIDB('privateKey');
  if (!privateKey) throw new Error('No private key to backup');
  
  const exportedJWK = await crypto.subtle.exportKey('jwk', privateKey);
  const plaintext = new TextEncoder().encode(JSON.stringify(exportedJWK));
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    plaintext
  );
  
  return {
    encryptedPrivateKey: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt)
  };
}

export async function importPrivateKeyFromBackup(encryptedData, passphrase) {
  const { encryptedPrivateKey, iv, salt } = encryptedData;
  const ciphertext = base64ToArrayBuffer(encryptedPrivateKey);
  const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));
  const saltBuffer = new Uint8Array(base64ToArrayBuffer(salt));
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    aesKey,
    ciphertext
  );
  
  const jwkString = new TextDecoder().decode(decryptedData);
  const jwk = JSON.parse(jwkString);
  
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  
  await saveToIDB('privateKey', privateKey);

  // Derive and save publicKey to fix the issue where it gets lost
  const pubJwk = {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y,
    key_ops: [],
    ext: true
  };
  
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    pubJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
  
  await saveToIDB('publicKey', publicKey);
}

// Check if keys exist in IndexedDB
export async function hasKeyPair() {
  const privateKey = await getFromIDB('privateKey');
  return !!privateKey;
}

export async function getPublicKeyJWK() {
  const publicKey = await getFromIDB('publicKey');
  if (!publicKey) return null;
  return crypto.subtle.exportKey('jwk', publicKey);
}

// Clear all keys (for logout from device)
export async function clearKeys() {
  await deleteFromIDB('privateKey');
  await deleteFromIDB('publicKey');
}
