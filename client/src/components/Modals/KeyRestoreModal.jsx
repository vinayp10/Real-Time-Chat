import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { importPrivateKeyFromBackup } from '../../utils/crypto';
import toast from 'react-hot-toast';

const KeyRestoreModal = ({ onClose, onSuccess }) => {
  const [passphrase, setPassphrase] = useState('');
  const [backupFile, setBackupFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setBackupFile(file);
  };

  const handleRestore = async (e) => {
    e.preventDefault();
    if (!backupFile || !passphrase) {
      setError('Please provide both the backup file and passphrase');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const text = await backupFile.text();
      const backupData = JSON.parse(text);
      
      await importPrivateKeyFromBackup(backupData, passphrase);
      toast.success('Keys restored successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to restore keys. Invalid passphrase or corrupt file.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-wa-dark-300 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-wa-dark-200">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Upload className="w-5 h-5 mr-2" /> Restore Private Key
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleRestore} className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Restore your keys from a backup file to decrypt your message history on this device.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Backup File (.json)</label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-wa-teal-50 file:text-wa-teal-700 hover:file:bg-wa-teal-100 dark:file:bg-wa-dark-400 dark:file:text-wa-teal-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-wa-teal-500 dark:bg-wa-dark-400 dark:border-wa-dark-200 dark:text-white"
              required
            />
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}
          
          <div className="pt-4 flex justify-end">
            <button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
            <button 
              type="submit" 
              disabled={loading || !backupFile}
              className="px-4 py-2 bg-wa-teal-500 hover:bg-wa-teal-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Restoring...' : 'Restore'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KeyRestoreModal;
