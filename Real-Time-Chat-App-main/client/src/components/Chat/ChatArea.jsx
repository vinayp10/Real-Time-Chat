import React, { useEffect, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { decryptGroupKey, encryptGroupKey, hasKeyPair } from '../../utils/crypto';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import EmptyState from '../Common/EmptyState';
import ContactInfo from '../Profile/ContactInfo';
import { MessageSquare } from 'lucide-react';

const getEntityId = (entity) => String(entity?._id ?? entity);

const ChatArea = () => {
  const { activeConversation, fetchConversations, setActiveConversation } = useChatStore();
  const { user } = useAuthStore();
  const [showContactInfo, setShowContactInfo] = useState(false);

  useEffect(() => {
    if (activeConversation?.type !== 'group' || !user?._id) return undefined;

    let isCurrent = true;
    const repairGroupKeys = async () => {
      const participants = activeConversation.participants || [];
      const groupKeys = activeConversation.encryptedGroupKeys || [];
      const hasKeyFor = (userId) => groupKeys.some((entry) => getEntityId(entry.user) === userId);
      const missingParticipants = participants.filter(
        (participant) => !hasKeyFor(getEntityId(participant.user))
      );

      if (missingParticipants.length === 0) return;

      const adminId = getEntityId(activeConversation.groupAdmin?.[0]);
      if (adminId !== getEntityId(user._id)) {
        toast.error('Some members cannot read this group yet. Ask the group admin to repair its encryption keys.');
        return;
      }

      const adminKey = groupKeys.find((entry) => getEntityId(entry.user) === adminId);
      const adminParticipant = participants.find(
        (participant) => getEntityId(participant.user) === adminId
      );
      const adminPublicKey = adminParticipant?.user?.publicKey || adminParticipant?.publicKey;

      if (!adminKey || !adminPublicKey || !(await hasKeyPair())) {
        toast.error('Cannot repair group keys on this device. Restore the admin encryption key backup first.');
        return;
      }

      const normalizedAdminPublicKey = typeof adminPublicKey === 'string'
        ? JSON.parse(adminPublicKey)
        : adminPublicKey;
      const rawGroupKey = await decryptGroupKey(
        adminKey.encryptedKey,
        adminKey.iv,
        normalizedAdminPublicKey
      );
      const rawBuffer = await crypto.subtle.exportKey('raw', rawGroupKey);
      const rawGroupKeyB64 = btoa(String.fromCharCode(...new Uint8Array(rawBuffer)));
      const repairedGroupKeys = [...groupKeys];

      for (const participant of missingParticipants) {
        const publicKey = participant.user?.publicKey || participant.publicKey;
        if (!publicKey) {
          throw new Error(`${participant.user?.displayName || 'A group member'} has no public encryption key.`);
        }

        const normalizedPublicKey = typeof publicKey === 'string' ? JSON.parse(publicKey) : publicKey;
        const encryptedKey = await encryptGroupKey(rawGroupKeyB64, normalizedPublicKey);
        repairedGroupKeys.push({
          user: getEntityId(participant.user),
          ...encryptedKey,
        });
      }

      const response = await api.put(`/conversations/group/${activeConversation._id}/keys`, {
        encryptedGroupKeys: repairedGroupKeys,
      });
      if (!isCurrent) return;

      setActiveConversation(response.data);
      await fetchConversations();
      toast.success('Group encryption keys repaired for all members');
    };

    repairGroupKeys().catch((error) => {
      if (isCurrent) {
        toast.error(error.response?.data?.message || error.message || 'Could not repair group encryption keys');
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [activeConversation, fetchConversations, setActiveConversation, user?._id]);

  if (!activeConversation) {
    return (
      <EmptyState 
        icon={MessageSquare}
        title="ChatApp Web"
        message="Send and receive messages without keeping your phone online. Use ChatApp on up to 4 linked devices and 1 phone at the same time. All messages are end-to-end encrypted."
      />
    );
  }

  const isGroup = activeConversation.type === 'group';
  const otherParticipant = !isGroup 
    ? activeConversation.participants.find(p => (p.user?._id || p.user) !== user._id)?.user
    : null;

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      <div className="flex flex-col flex-1 h-full bg-wa-chat-light dark:bg-wa-chat-dark bg-chat-pattern">
        <ChatHeader onContactInfoClick={() => setShowContactInfo(!showContactInfo)} />
        <MessageList />
        <MessageInput />
      </div>
      
      {showContactInfo && (
        <ContactInfo 
          contact={otherParticipant} 
          isGroup={isGroup} 
          onClose={() => setShowContactInfo(false)} 
        />
      )}
    </div>
  );
};

export default ChatArea;
