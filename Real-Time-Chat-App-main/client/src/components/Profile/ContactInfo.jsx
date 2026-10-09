import React from 'react';
import { X, Shield } from 'lucide-react';
import Avatar from '../Common/Avatar';

const ContactInfo = ({ contact, isGroup, onClose }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-wa-dark-400 border-l border-gray-200 dark:border-wa-dark-300 w-full sm:w-80 flex-shrink-0 absolute right-0 top-0 bottom-0 z-30 shadow-xl md:static md:shadow-none">
      <div className="flex items-center px-4 h-[60px] bg-gray-100 dark:bg-wa-dark-300 border-b border-gray-200 dark:border-wa-dark-200">
        <button onClick={onClose} className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-base font-medium text-gray-900 dark:text-white">Contact info</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center py-8 bg-white dark:bg-wa-dark-400 shadow-sm mb-2">
          <Avatar src={contact?.avatar} alt={contact?.displayName} size="xl" className="mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">{contact?.displayName}</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {contact?.phoneNumber || (contact?.email?.endsWith('@phone.chatapp.invalid') ? '' : contact?.email)}
          </p>
        </div>
        
        {!isGroup && (
          <div className="bg-white dark:bg-wa-dark-400 py-4 px-6 shadow-sm mb-2">
            <p className="text-wa-teal-600 dark:text-wa-teal-500 text-sm mb-2">About</p>
            <p className="text-gray-900 dark:text-white text-base">{contact?.about || 'Available'}</p>
          </div>
        )}

        <div className="bg-white dark:bg-wa-dark-400 py-4 px-6 shadow-sm mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-wa-dark-300">
          <div className="flex items-center text-wa-teal-600 dark:text-wa-teal-500">
            <Shield className="w-5 h-5 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-white">Encryption</p>
              <p className="text-xs text-gray-500">Messages are end-to-end encrypted. Click to verify.</p>
            </div>
          </div>
        </div>

        {!isGroup && (
          <div className="bg-white dark:bg-wa-dark-400 py-4 px-6 shadow-sm text-red-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-wa-dark-300">
            <p className="text-sm font-medium">Block {contact?.displayName}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactInfo;
