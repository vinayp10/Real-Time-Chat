import React, { useState, useRef } from 'react';
import { Smile, Paperclip, Send, Mic, X, FileText, Square } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useSocketStore } from '../../stores/socketStore';
import { useCrypto } from '../../hooks/useCrypto';
import { useAuthStore } from '../../stores/authStore';
import { encryptFile } from '../../utils/crypto';
import EmojiPickerComponent from './EmojiPicker';
import api from '../../utils/api';

const getEntityId = (entity) => String(entity?._id ?? entity);

const MessageInput = () => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const { activeConversation, addMessage } = useChatStore();
  const { sendMessage, startTyping, stopTyping } = useSocketStore();
  const { encrypt, getDerivedKey, getGroupKey, encryptForGroup } = useCrypto();
  const { user } = useAuthStore();

  const handleTyping = (e) => {
    setText(e.target.value);
    
    if (!activeConversation) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      startTyping(activeConversation._id);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(activeConversation._id);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }
    
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getOtherParticipantKey = () => {
    if (!activeConversation || activeConversation.type === 'group') return null;
    const other = activeConversation.participants.find(
      (participant) => getEntityId(participant.user) !== getEntityId(user._id)
    );
    if (!other) return null;
    const pubKey = other.user?.publicKey || other.publicKey;
    return typeof pubKey === 'string' ? JSON.parse(pubKey) : pubKey;
  };

  const getMyGroupKey = async () => {
    if (activeConversation.type !== 'group') return null;
    const myKeyObj = activeConversation.encryptedGroupKeys?.find(
      (keyEntry) => getEntityId(keyEntry.user) === getEntityId(user._id)
    );
    if (!myKeyObj) throw new Error('No group key found for this user');

    const adminId = getEntityId(activeConversation.groupAdmin?.[0]);
    const adminParticipant = activeConversation.participants.find(
      (participant) => getEntityId(participant.user) === adminId
    );
    const adminPubKey = adminParticipant?.user?.publicKey || adminParticipant?.publicKey;
    if (!adminPubKey) throw new Error('The group admin encryption key is unavailable');
    const theirKey = typeof adminPubKey === 'string' ? JSON.parse(adminPubKey) : adminPubKey;

    const { decryptGroupKey } = await import('../../utils/crypto');
    const rawGroupKey = await decryptGroupKey(myKeyObj.encryptedKey, myKeyObj.iv, theirKey);
    const rawBuffer = await crypto.subtle.exportKey('raw', rawGroupKey);
    const arrayBufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return arrayBufferToBase64(rawBuffer);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
        await handleSend(null, audioFile);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async (e, forceFile = null) => {
    e?.preventDefault();
    const targetFile = forceFile || selectedFile;
    if ((!text.trim() && !targetFile) || !activeConversation || sending) return;

    setSending(true);
    const plaintext = text.trim();
    setText('');
    stopTyping(activeConversation._id);

    try {
      let encryptedPayload;
      const isGroup = activeConversation.type === 'group';
      let theirKey;
      let rawGroupKeyB64;

      if (isGroup) {
        rawGroupKeyB64 = await getMyGroupKey();
      } else {
        theirKey = getOtherParticipantKey();
      }

      if (targetFile) {
        const arrayBuffer = await targetFile.arrayBuffer();
        let aesKey;
        
        if (isGroup) {
          aesKey = await getGroupKey(rawGroupKeyB64);
        } else {
          aesKey = await getDerivedKey(theirKey);
        }
        
        const encrypted = await encryptFile(arrayBuffer, aesKey);
        const msgType = targetFile.type.startsWith('image/') ? 'image' : (targetFile.type.startsWith('audio/') ? 'audio' : 'file');

        const res = await api.post(`/messages/${activeConversation._id}`, {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          type: msgType,
          fileName: targetFile.name,
          fileSize: targetFile.size,
          mimeType: targetFile.type,
        });

        sendMessage({
          ...res.data,
          conversationId: activeConversation._id,
        });

        useChatStore.getState().addMessage(res.data);
        useChatStore.getState().fetchConversations();
        if (!forceFile) clearFile();
      } else {
        if (isGroup) {
          encryptedPayload = await encryptForGroup(plaintext, rawGroupKeyB64);
        } else {
          encryptedPayload = await encrypt(plaintext, theirKey);
        }

        const res = await api.post(`/messages/${activeConversation._id}`, {
          ciphertext: encryptedPayload.ciphertext,
          iv: encryptedPayload.iv,
          type: 'text',
        });

        sendMessage({
          ...res.data,
          conversationId: activeConversation._id,
        });

        useChatStore.getState().addMessage(res.data);
        useChatStore.getState().fetchConversations();
      }
    } catch (error) {
      console.error('Failed to encrypt/send message:', error);
    } finally {
      setSending(false);
    }
  };

  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="relative px-4 py-3 bg-gray-100 dark:bg-wa-dark-300 flex flex-col z-20">
      {selectedFile && (
        <div className="mb-2 p-2 bg-white dark:bg-wa-dark-400 rounded-lg flex items-center space-x-3">
          {filePreview ? (
            <img
              src={filePreview}
              alt="preview"
              className="w-16 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 dark:bg-wa-dark-300 rounded flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <div className="flex-1 truncate">
            <p className="text-sm text-gray-700 dark:text-gray-200 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-400">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button onClick={clearFile}>
            <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
          </button>
        </div>
      )}

      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50 shadow-xl rounded-lg">
          <EmojiPickerComponent onEmojiClick={onEmojiClick} />
        </div>
      )}

      <div className="flex items-end space-x-2">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Smile className="w-6 h-6" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Paperclip className="w-6 h-6" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />

        <div className="flex-1 bg-white dark:bg-wa-dark-400 rounded-lg flex items-center shadow-sm relative overflow-hidden">
          {isRecording ? (
            <div className="flex items-center justify-between w-full px-4 py-2.5 text-red-500 animate-pulse">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></span>
                Recording...
              </span>
              <span className="text-sm font-medium">{formatDuration(recordingDuration)}</span>
            </div>
          ) : (
            <form onSubmit={handleSend} className="w-full">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={handleTyping}
                placeholder="Type a message"
                className="w-full bg-transparent px-4 py-2.5 outline-none text-gray-900 dark:text-white placeholder-gray-500 text-sm"
                onFocus={() => setShowEmojiPicker(false)}
              />
            </form>
          )}
        </div>

        {text.trim() || selectedFile ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="p-2 bg-wa-teal-500 hover:bg-wa-teal-600 disabled:opacity-50 rounded-full text-white transition-colors"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
          >
            <Square className="w-5 h-5 ml-0.5" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Mic className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
