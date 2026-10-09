import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  signInWithPopup,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const firebaseTestPhoneNumbers = new Set(
  (import.meta.env.VITE_FIREBASE_TEST_PHONE_NUMBERS || '')
    .split(',')
    .map((phoneNumber) => phoneNumber.trim())
    .filter(Boolean)
);
const allowRealPhoneSms = import.meta.env.VITE_FIREBASE_ALLOW_REAL_PHONE_SMS === 'true';

let app, auth, googleProvider;

try {
  if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    if (!allowRealPhoneSms && firebaseTestPhoneNumbers.size > 0) {
      auth.settings.appVerificationDisabledForTesting = true;
    }
    googleProvider = new GoogleAuthProvider();
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export const googleAuthEnabled = Boolean(auth && googleProvider);
export const phoneAuthEnabled = Boolean(auth);
export { auth, googleProvider };

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase is not initialized (missing API key)");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await result.user.getIdToken();
  } catch (error) {
    if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error.code)) {
      console.error('Google popup sign-in failed:', error.code || error.name);
    }
    throw error;
  }
};

export const sendPhoneVerificationCode = async (phoneNumber, containerId) => {
  if (!auth) throw new Error('Firebase is not initialized');
  const normalizedPhoneNumber = phoneNumber.trim();

  if (!allowRealPhoneSms && !firebaseTestPhoneNumbers.has(normalizedPhoneNumber)) {
    throw new Error('SMS was blocked to prevent charges. Use a fictional phone number configured in Firebase Console and VITE_FIREBASE_TEST_PHONE_NUMBERS.');
  }

  const verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  try {
    const confirmation = await firebaseSignInWithPhoneNumber(auth, normalizedPhoneNumber, verifier);
    return { confirmation, verifier };
  } catch (error) {
    verifier.clear();
    throw error;
  }
};

