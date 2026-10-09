import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import {
  googleAuthEnabled,
  phoneAuthEnabled,
  sendPhoneVerificationCode,
  signInWithGoogle,
} from '../../config/firebase';
import LoadingSpinner from '../Common/LoadingSpinner';

const FirebaseAuthOptions = () => {
  const [phoneMode, setPhoneMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const verifierRef = useRef(null);
  const loginWithFirebase = useAuthStore((state) => state.loginWithFirebase);
  const navigate = useNavigate();

  useEffect(() => () => verifierRef.current?.clear(), []);

  const handleGoogleSubmit = async () => {
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      await loginWithFirebase(idToken);
      toast.success('Signed in with Google');
      navigate('/');
    } catch (error) {
      const message = error.code === 'auth/popup-closed-by-user'
        ? 'Google sign-in was canceled. Try again to continue.'
        : error.response?.data?.message || error.message || 'Google sign-in failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (confirmation) {
        const result = await confirmation.confirm(verificationCode);
        await loginWithFirebase(await result.user.getIdToken());
        toast.success('Signed in with phone');
        navigate('/');
      } else {
        const result = await sendPhoneVerificationCode(phoneNumber, 'phone-auth-recaptcha');
        verifierRef.current = result.verifier;
        setConfirmation(result.confirmation);
        toast.success('Verification code sent');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Phone sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const resetPhoneFlow = () => {
    verifierRef.current?.clear();
    verifierRef.current = null;
    setConfirmation(null);
    setVerificationCode('');
    setPhoneMode(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {googleAuthEnabled && (
        <button
          type="button"
          onClick={handleGoogleSubmit}
          disabled={loading}
          className="w-full bg-white dark:bg-wa-dark-400 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-wa-dark-500 transition-colors disabled:opacity-70 flex justify-center items-center"
        >
          {loading ? <LoadingSpinner size="sm" /> : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,20 12.25,20C17.6,20 21.5,16.33 21.5,10.91C21.5,9.76 21.35,9.1 21.35,9.1V9.1Z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>
      )}

      {!phoneMode && (
        <button
          type="button"
          onClick={() => {
            if (phoneAuthEnabled) {
              setPhoneMode(true);
            } else {
              toast.error('Add Firebase web settings and enable Phone Authentication to send verification codes.');
            }
          }}
          disabled={loading}
          className="w-full bg-white dark:bg-wa-dark-400 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-wa-dark-500 transition-colors disabled:opacity-70 flex justify-center items-center"
        >
          <Phone className="w-5 h-5 mr-2" aria-hidden="true" />
          Continue with phone
        </button>
      )}

      {!phoneAuthEnabled && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Phone verification requires Firebase web settings and the Phone provider enabled.
        </p>
      )}

      {phoneAuthEnabled && phoneMode && (
        <form onSubmit={handlePhoneSubmit} className="space-y-3 border-t border-gray-200 dark:border-wa-dark-200 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {confirmation ? 'Enter verification code' : 'Verify your phone'}
            </p>
            <button
              type="button"
              onClick={resetPhoneFlow}
              className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              aria-label="Back to sign-in options"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {!confirmation ? (
            <label className="block text-sm text-gray-600 dark:text-gray-400">
              Phone number with country code
              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+15551234567"
                pattern="\+[1-9][0-9]{7,14}"
                autoComplete="tel"
                required
                className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-wa-teal-500 dark:bg-wa-dark-400 dark:border-wa-dark-200 dark:text-white"
              />
            </label>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">Code sent to {phoneNumber}</p>
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                Verification code
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  required
                  className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-wa-teal-500 dark:bg-wa-dark-400 dark:border-wa-dark-200 dark:text-white"
                />
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wa-teal-600 hover:bg-wa-teal-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? <LoadingSpinner size="sm" className="text-white" /> : confirmation ? 'Verify and continue' : 'Send code'}
          </button>
          <div id="phone-auth-recaptcha" />
        </form>
      )}
    </div>
  );
};

export default FirebaseAuthOptions;