import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Avatar from '../Common/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { generateGroupKey, encryptGroupKey } from '../../utils/crypto';

const NewGroupModal = ({ onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuthStore();
  const { fetchConversations, setActiveConversation } = useChatStore();

  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await api.get(`/users/search?q=${searchQuery}`);
        setSearchResults(res.data.filter(u => u._id !== currentUser._id));
      } catch (error) {
        console.error('Search failed', error);
      }
    };
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, currentUser._id]);

  const toggleUser = (user) => {
    if (selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    const membersWithoutKeys = selectedUsers.filter((member) => !member.publicKey);
    if (!currentUser.publicKey) {
      toast.error('Your encryption key is missing. Sign in again before creating a group.');
      return;
    }
    if (membersWithoutKeys.length > 0) {
      const memberNames = membersWithoutKeys.map((member) => member.displayName).join(', ');
      toast.error(`${memberNames} need to sign in and set up encryption before joining this group.`);
      return;
    }

    setLoading(true);

    try {
      // Generate group key
      const rawGroupKey = await generateGroupKey();
      
      const encryptedGroupKeys = [];
      const participants = [];

      // Encrypt for all selected users
      for (const u of selectedUsers) {
        participants.push(u._id);
        const pubKey = typeof u.publicKey === 'string' ? JSON.parse(u.publicKey) : u.publicKey;
        const { encryptedKey, iv } = await encryptGroupKey(rawGroupKey, pubKey);
        encryptedGroupKeys.push({ user: u._id, encryptedKey, iv });
      }

      // Encrypt for self (creator)
      const myPubKey = typeof currentUser.publicKey === 'string' ? JSON.parse(currentUser.publicKey) : currentUser.publicKey;
      const { encryptedKey, iv } = await encryptGroupKey(rawGroupKey, myPubKey);
      encryptedGroupKeys.push({ user: currentUser._id, encryptedKey, iv });

      const res = await api.post('/conversations/group', {
        groupName,
        participants,
        encryptedGroupKeys
      });

      await fetchConversations();
      setActiveConversation(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to create group', error);
      toast.error(error.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-wa-dark-300 w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 bg-wa-teal-500 text-white">
          <h2 className="text-lg font-medium">Create New Group</h2>
          <button onClick={onClose}><X className="w-6 h-6 hover:text-gray-200" /></button>
        </div>

        <div className="p-4 overflow-y-auto">
          <input
            type="text"
            placeholder="Group Subject"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-3 py-2 border-b-2 border-wa-teal-500 bg-transparent text-gray-900 dark:text-white outline-none mb-4"
          />

          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-wa-dark-400 rounded-md text-sm outline-none text-gray-900 dark:text-white mb-4"
          />

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedUsers.map(u => (
                <div key={u._id} className="flex items-center bg-gray-200 dark:bg-wa-dark-200 rounded-full pl-2 pr-1 py-1">
                  <span className="text-xs text-gray-800 dark:text-gray-200 mr-1">{u.displayName}</span>
                  <button onClick={() => toggleUser(u)} className="p-0.5 hover:bg-gray-300 dark:hover:bg-wa-dark-400 rounded-full">
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1 mt-2 max-h-60 overflow-y-auto custom-scrollbar">
            {searchResults.map(u => {
              const isSelected = selectedUsers.some(su => su._id === u._id);
              return (
                <div 
                  key={u._id}
                  onClick={() => toggleUser(u)}
                  className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-wa-dark-400 rounded-md cursor-pointer"
                >
                  <div className="relative mr-3">
                    <Avatar src={u.avatar} alt={u.displayName} size="md" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.displayName}</p>
                    <p className="text-xs text-gray-500">{u.phoneNumber || u.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-wa-dark-400 flex justify-end">
          <button 
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedUsers.length === 0 || loading}
            className="px-6 py-2 bg-wa-teal-500 text-white rounded-md font-medium disabled:opacity-50 hover:bg-wa-teal-600 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewGroupModal;
