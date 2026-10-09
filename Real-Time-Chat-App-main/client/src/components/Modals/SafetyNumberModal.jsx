import React, { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { generateSafetyNumber } from '../../utils/crypto';
import { useAuthStore } from '../../stores/authStore';

const SafetyNumberModal = ({ contact, onClose }) => {
  const { user } = useAuthStore();
  const [safetyNumber, setSafetyNumber] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const computeSafetyNumber = async () => {
      try {
        const myKeyJWK = typeof user.publicKey === 'string' ? JSON.parse(user.publicKey) : user.publicKey;
        const theirKeyJWK = typeof contact.publicKey === 'string' ? JSON.parse(contact.publicKey) : contact.publicKey;
        
        const number = await generateSafetyNumber(myKeyJWK, theirKeyJWK);
        setSafetyNumber(number);
      } catch (err) {
        console.error('Failed to generate safety number', err);
        setSafetyNumber('Error generating code');
      } finally {
        setLoading(false);
      }
    };

    computeSafetyNumber();
  }, [user, contact]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-wa-dark-300 rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
        <div className="bg-wa-teal-600 dark:bg-wa-dark-400 text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2" /> Verify Security Code
          </h2>
          <button onClick={onClose} className="hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            To verify that messages and calls with <strong>{contact.displayName}</strong> are end-to-end encrypted, scan their code or compare the number above.
          </p>

          <div className="mb-6 bg-gray-100 dark:bg-wa-dark-400 p-4 rounded-lg flex items-center justify-center min-h-[100px]">
            {loading ? (
              <span className="text-gray-500 animate-pulse">Generating...</span>
            ) : (
              <div className="font-mono text-xl tracking-widest text-gray-900 dark:text-white break-all flex flex-wrap justify-center gap-x-3 gap-y-2">
                {safetyNumber.split(' ').map((chunk, i) => (
                  <span key={i}>{chunk}</span>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={onClose} className="w-full py-2 bg-wa-teal-500 hover:bg-wa-teal-600 text-white rounded-md text-sm font-medium transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyNumberModal;
