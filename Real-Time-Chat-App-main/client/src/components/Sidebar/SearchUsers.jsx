import React, { useState } from 'react';
import api from '../../utils/api';
import Avatar from '../Common/Avatar';
import LoadingSpinner from '../Common/LoadingSpinner';
import { useChatStore } from '../../stores/chatStore';

const SearchUsers = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { setActiveConversation, fetchConversations } = useChatStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${query}`);
      setResults(res.data);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (userId) => {
    try {
      const res = await api.post('/conversations/private', { targetUserId: userId });
      await fetchConversations();
      setActiveConversation(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to start conversation', error);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by phone, email or username..."
          className="flex-1 px-3 py-2 text-sm border rounded-md dark:bg-wa-dark-300 dark:border-wa-dark-200 dark:text-white"
        />
        <button type="submit" className="bg-wa-teal-500 text-white px-3 py-2 rounded-md text-sm">
          Search
        </button>
      </form>

      {loading ? (
        <LoadingSpinner size="md" className="mt-8" />
      ) : (
        <div className="space-y-2">
          {results.length > 0 ? (
            results.map(user => (
              <div 
                key={user._id}
                onClick={() => startConversation(user._id)}
                className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-wa-dark-300 rounded-md cursor-pointer transition-colors"
              >
                <Avatar src={user.avatar} alt={user.displayName} size="md" className="mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.phoneNumber || user.email}</p>
                </div>
              </div>
            ))
          ) : query && (
            <p className="text-center text-sm text-gray-500 mt-8">No users found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchUsers;
