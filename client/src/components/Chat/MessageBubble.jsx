import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Reply, Trash2, Download } from 'lucide-react';
import { useCrypto } from '../../hooks/useCrypto';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { decryptFile } from '../../utils/crypto';
import CustomAudioPlayer from './CustomAudioPlayer';

const getEntityId = (entity) => String(entity?._id ?? entity);

const MessageBubble = ({ message, isOwn, showTail, conversation }) => {
  const [decryptedContent, setDecryptedContent] = useState('Decrypting...');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const { decrypt, decryptForGroup, getDerivedKey, getGroupKey } = useCrypto();
  const { user } = useAuthStore();
  const { deleteMessage } = useChatStore();

  useEffect(() => {
    let isMounted = true;

    const decryptMsg = async () => {
      try {
        if (message.deletedForEveryone) {
          if (isMounted) setDecryptedContent('🚫 This message was deleted');
          return;
        }

        const ciphertext = message.ciphertext || message.content;
        const iv = message.iv;

        if (!ciphertext || !iv) {
          if (isMounted) setDecryptedContent('');
          return;
        }

        const isGroup = conversation.type === 'group';
        let aesKey;

        if (isGroup) {
          // Find my encrypted group key
          const myKeyObj = conversation.encryptedGroupKeys?.find(
            (keyEntry) => getEntityId(keyEntry.user) === getEntityId(user._id)
          );
          if (!myKeyObj) {
            if (isMounted) setDecryptedContent('🔒 Unable to decrypt group message');
            return;
          }

          const adminId = getEntityId(conversation.groupAdmin?.[0]);
          const adminParticipant = conversation.participants.find(
            (participant) => getEntityId(participant.user) === adminId
          );
          const adminPubKey = adminParticipant?.user?.publicKey || adminParticipant?.publicKey;
          if (!adminPubKey) throw new Error('The group admin encryption key is unavailable');
          const theirKey = typeof adminPubKey === 'string' ? JSON.parse(adminPubKey) : adminPubKey;

          const { decryptGroupKey } = await import('../../utils/crypto');
          const rawGroupKey = await decryptGroupKey(myKeyObj.encryptedKey, myKeyObj.iv, theirKey);
          
          const rawBuffer = await crypto.subtle.exportKey('raw', rawGroupKey);
          const arrayBufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
          const rawGroupKeyB64 = arrayBufferToBase64(rawBuffer);

          if (['image', 'file', 'audio'].includes(message.type)) {
            aesKey = await getGroupKey(rawGroupKeyB64);
          } else {
            const plain = await decryptForGroup(ciphertext, iv, rawGroupKeyB64);
            if (isMounted) setDecryptedContent(plain);
            return;
          }
        } else {
          const otherParticipant = conversation.participants.find(
            (participant) => getEntityId(participant.user) !== getEntityId(user._id)
          );
          const pubKey = otherParticipant?.user?.publicKey || otherParticipant?.publicKey;
          if (!pubKey) {
            if (isMounted) setDecryptedContent('🔒 Encrypted message');
            return;
          }

          const theirKey = typeof pubKey === 'string' ? JSON.parse(pubKey) : pubKey;

          if (['image', 'file', 'audio'].includes(message.type)) {
            aesKey = await getDerivedKey(theirKey);
          } else {
            const plain = await decrypt(ciphertext, iv, theirKey);
            if (isMounted) setDecryptedContent(plain);
            return;
          }
        }

        // Common file/image decryption
        const decryptedBuffer = await decryptFile(ciphertext, iv, aesKey);
        const blob = new Blob([decryptedBuffer], {
          type: message.mimeType || 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        if (isMounted) setDecryptedContent(url);

      } catch (err) {
        if (isMounted) setDecryptedContent('🔒 Unable to decrypt');
        console.error('Decryption error:', err);
      }
    };

    decryptMsg();
    return () => {
      isMounted = false;
    };
  }, [message, conversation, user, decrypt, decryptForGroup, getDerivedKey, getGroupKey]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const renderStatus = () => {
    if (!isOwn) return null;

    const deliveredTo = message.deliveredTo || [];
    const readBy = message.readBy || [];

    if (readBy.length > 1) {
      return <CheckCheck className="w-3.5 h-3.5 text-blue-500 ml-1" />;
    }
    if (deliveredTo.length > 1) {
      return <CheckCheck className="w-3.5 h-3.5 text-gray-400 ml-1" />;
    }
    if (message.status === 'read') {
      return <CheckCheck className="w-3.5 h-3.5 text-blue-500 ml-1" />;
    }
    if (message.status === 'delivered') {
      return <CheckCheck className="w-3.5 h-3.5 text-gray-400 ml-1" />;
    }
    return <Check className="w-3.5 h-3.5 text-gray-400 ml-1" />;
  };

  const handleDelete = async (type) => {
    setShowMenu(false);
    try {
      if (type === 'everyone') {
        await deleteMessage(message._id, 'everyone');
      } else {
        await deleteMessage(message._id, 'me');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const renderContent = () => {
    if (message.deletedForEveryone) {
      return (
        <p className="text-sm italic text-gray-400 dark:text-gray-500">
          🚫 This message was deleted
        </p>
      );
    }

    if (message.type === 'image' && decryptedContent.startsWith('blob:')) {
      return (
        <img
          src={decryptedContent}
          alt="Shared image"
          className="max-w-full max-h-72 object-cover rounded-md mb-1 cursor-pointer"
          onClick={() => window.open(decryptedContent)}
        />
      );
    }

    if (message.type === 'file' && decryptedContent.startsWith('blob:')) {
      return (
        <a
          href={decryptedContent}
          download={message.fileName || 'download'}
          className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-wa-dark-200 rounded-md mb-1 hover:bg-gray-200 dark:hover:bg-wa-dark-300 transition-colors"
        >
          <Download className="w-5 h-5 text-wa-teal-500" />
          <div>
            <p className="text-sm font-medium truncate max-w-[200px]">
              {message.fileName || 'File'}
            </p>
            {message.fileSize && (
              <p className="text-xs text-gray-400">
                {(message.fileSize / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </a>
      );
    }

    if (message.type === 'audio' && decryptedContent.startsWith('blob:')) {
      return (
        <div className="flex flex-col mb-1 relative z-10 w-full pt-1">
          <CustomAudioPlayer src={decryptedContent} isOwn={isOwn} />
        </div>
      );
    }

    return (
      <div className="text-sm pb-3 break-words relative z-10 whitespace-pre-wrap font-sans">
        {decryptedContent}
      </div>
    );
  };

  const senderName =
    message.sender?.displayName || message.sender?.username || '';
  const isImageMessage = message.type === 'image' && decryptedContent.startsWith('blob:');
  const bubblePadding = isImageMessage ? 'p-1' : 'px-3 py-1.5';

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-0.5 relative group`}
    >
      <div
        className={`max-w-[75%] rounded-lg ${bubblePadding} shadow-sm relative ${
          isOwn
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-white rounded-tr-none'
            : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-white rounded-tl-none'
        }`}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(true);
        }}
      >
        {/* Sender name for group chats */}
        {!isOwn && conversation.type === 'group' && (
          <p className="text-xs font-medium text-wa-teal-500 mb-0.5">
            {senderName}
          </p>
        )}

        {/* Tail */}
        {showTail && (
          <span
            className={`absolute top-0 w-2 h-2 ${isOwn ? 'right-[-8px] text-[#d9fdd3] dark:text-[#005c4b]' : 'left-[-8px] text-white dark:text-[#202c33]'}`}
          >
            <svg
              viewBox="0 0 8 13"
              width="8"
              height="13"
              className="fill-current"
            >
              {isOwn ? (
                <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
              ) : (
                <path d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" />
              )}
            </svg>
          </span>
        )}

        {/* Content */}
        {renderContent()}

        {/* Meta (Time and Status) */}
        <div className={`flex items-center justify-end text-[10px] ${isImageMessage ? 'absolute bottom-2 right-2 bg-black/40 text-white/90 px-1.5 py-0.5 rounded-full' : 'text-gray-500 dark:text-gray-300/80 mt-0.5 -mb-0.5'}`}>
          {message.createdAt && format(new Date(message.createdAt), 'HH:mm')}
          {renderStatus()}
        </div>

        {/* Context Menu */}
        {showMenu && (
          <div
            ref={menuRef}
            className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-8 bg-white dark:bg-wa-dark-300 rounded-lg shadow-lg z-50 py-1 min-w-[140px] border border-gray-200 dark:border-wa-dark-200`}
          >
            <button
              onClick={() => handleDelete('me')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-wa-dark-200 flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete for me
            </button>
            {isOwn && (
              <button
                onClick={() => handleDelete('everyone')}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-wa-dark-200 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete for everyone
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
