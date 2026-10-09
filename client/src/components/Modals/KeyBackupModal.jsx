import React, { useState } from 'react';
import { X, Key } from 'lucide-react';
import { exportPrivateKeyEncrypted } from '../../utils/crypto';

const KeyBackupModal = ({ onClose }) => {
  const [passphrase, setPassphrase] = useState('');
  const [backupData, setBackupData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBackup = async (e) => {
    e.preventDefault();
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const data = await exportPrivateKeyEncrypted(passphrase);
      setBackupData(data);
    } catch (err) {
      setError('Failed to backup key. It might not be extractable.');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = () => {
    if (!backupData) return;
    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whisper-key-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-wa-dark-300 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-wa-dark-200">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Key className="w-5 h-5 mr-2" /> Backup Private Key
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {!backupData ? (
            <form onSubmit={handleBackup} className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Back up your encryption keys to access your messages on other devices or if you clear your browser data.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passphrase</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-wa-teal-500 dark:bg-wa-dark-400 dark:border-wa-dark-200 dark:text-white"
                  required
                  placeholder="Minimum 8 characters"
                />
              </div>
              
              {error && <p className="text-sm text-red-500">{error}</p>}
              
              <div className="pt-4 flex justify-end">
                <button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-wa-teal-500 hover:bg-wa-teal-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Create Backup'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md text-sm">
                Backup generated successfully! Download the file and keep it safe. You will need your passphrase to restore it.
              </div>
              
              <button 
                onClick={downloadBackup}
                className="w-full px-4 py-2 bg-wa-teal-500 hover:bg-wa-teal-600 text-white rounded-md text-sm font-medium"
              >
                Download Backup File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyBackupModal;
