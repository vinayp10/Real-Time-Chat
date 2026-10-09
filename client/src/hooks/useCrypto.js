import { useRef, useCallback } from 'react';
import { deriveSharedSecret, encryptMessage, decryptMessage, importGroupKey } from '../utils/crypto';

export function useCrypto() {
  const derivedKeys = useRef(new Map());

  const getDerivedKey = useCallback(async (theirPublicKeyJWK) => {
    const keyString = JSON.stringify(theirPublicKeyJWK);
    if (derivedKeys.current.has(keyString)) {
      return derivedKeys.current.get(keyString);
    }
    
    try {
      const key = await deriveSharedSecret(theirPublicKeyJWK);
      derivedKeys.current.set(keyString, key);
      return key;
    } catch (error) {
      console.error('Error deriving key:', error);
      throw error;
    }
  }, []);

  const encrypt = useCallback(async (text, theirPublicKeyJWK) => {
    const aesKey = await getDerivedKey(theirPublicKeyJWK);
    return encryptMessage(text, aesKey);
  }, [getDerivedKey]);

  const decrypt = useCallback(async (ciphertextB64, ivB64, theirPublicKeyJWK) => {
    const aesKey = await getDerivedKey(theirPublicKeyJWK);
    return decryptMessage(ciphertextB64, ivB64, aesKey);
  }, [getDerivedKey]);

  // Group crypto wrappers
  const getGroupKey = useCallback(async (rawKeyB64) => {
    if (derivedKeys.current.has(rawKeyB64)) {
      return derivedKeys.current.get(rawKeyB64);
    }
    try {
      const key = await importGroupKey(rawKeyB64);
      derivedKeys.current.set(rawKeyB64, key);
      return key;
    } catch (err) {
      console.error('Error importing group key:', err);
      throw err;
    }
  }, []);

  const encryptForGroup = useCallback(async (text, rawGroupKeyB64) => {
    const aesKey = await getGroupKey(rawGroupKeyB64);
    return encryptMessage(text, aesKey);
  }, [getGroupKey]);

  const decryptForGroup = useCallback(async (ciphertextB64, ivB64, rawGroupKeyB64) => {
    const aesKey = await getGroupKey(rawGroupKeyB64);
    return decryptMessage(ciphertextB64, ivB64, aesKey);
  }, [getGroupKey]);

  return {
    getDerivedKey,
    encrypt,
    decrypt,
    encryptForGroup,
    decryptForGroup,
    getGroupKey
  };
}
