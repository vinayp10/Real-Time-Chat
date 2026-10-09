import { create } from 'zustand';
import api from '../utils/api';
import { generateKeyPair, getPublicKeyJWK, hasKeyPair, clearKeys } from '../utils/crypto';

let checkAuthRequest;

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  register: async (data) => {
    const { publicKeyJWK } = await generateKeyPair();
    const payload = { ...data, publicKey: publicKeyJWK };
    const res = await api.post('/auth/register', payload);
    set({ user: res.data.user, isAuthenticated: true });
    return res.data;
  },

  login: async (data) => {
    const res = await api.post('/auth/login', data);

    let publicKeyJWK = await getPublicKeyJWK();
    const hasKeys = Boolean(publicKeyJWK);
    if (!hasKeys) {
      publicKeyJWK = (await generateKeyPair()).publicKeyJWK;
      console.warn('A new encryption key was created. Previously encrypted messages on other devices cannot be decrypted without restoring their key backup.');
    }

    if (!res.data.user.publicKey && publicKeyJWK) {
      await api.put('/users/public-key', { publicKey: JSON.stringify(publicKeyJWK) });
      res.data.user.publicKey = JSON.stringify(publicKeyJWK);
    }

    set({ user: res.data.user, isAuthenticated: true });
    return res.data;
  },

  loginWithFirebase: async (idToken) => {
    let publicKeyJWK;
    const hasKeys = await hasKeyPair();
    if (!hasKeys) {
      const generated = await generateKeyPair();
      publicKeyJWK = generated.publicKeyJWK;
    }

    const res = await api.post('/auth/firebase', { idToken, publicKey: publicKeyJWK });

    set({ user: res.data.user, isAuthenticated: true });
    return res.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
      await clearKeys();
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  checkAuth: () => {
    if (!checkAuthRequest) {
      checkAuthRequest = (async () => {
        try {
          const res = await api.get('/auth/session');
          set({
            user: res.data.user,
            isAuthenticated: Boolean(res.data.user),
            isLoading: false,
          });
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        } finally {
          checkAuthRequest = null;
        }
      })();
    }

    return checkAuthRequest;
  },

  updateProfile: async (data) => {
    const res = await api.put('/users/profile', data);
    set({ user: res.data });
    return res.data;
  }
}));
