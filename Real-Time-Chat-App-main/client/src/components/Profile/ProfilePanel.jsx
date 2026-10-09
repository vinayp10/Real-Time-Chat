import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, Edit2, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../Common/Avatar';
import LoadingSpinner from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';

const ProfilePanel = ({ onClose }) => {
  const { user, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const avatarInputRef = useRef(null);

  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [about, setAbout] = useState(user?.about || 'Available');
  const [loadingAbout, setLoadingAbout] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ displayName });
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAbout = async () => {
    setLoadingAbout(true);
    try {
      await updateProfile({ about });
      setIsEditingAbout(false);
      toast.success('About updated');
    } catch (error) {
      toast.error('Failed to update about');
    } finally {
      setLoadingAbout(false);
    }
  };

  const handleAvatarChange = (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return;
      setUploadingPhoto(true);
      try {
        await updateProfile({ avatar: reader.result });
        toast.success('Profile photo updated');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update photo');
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.onerror = () => toast.error('Could not read the selected image');
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-wa-dark-400 absolute inset-0 z-40 w-full transition-transform transform translate-x-0">
      <div className="flex items-end h-[108px] bg-wa-teal-600 dark:bg-wa-dark-300 text-white px-5 py-4 pb-5 shadow-sm">
        <button onClick={onClose} className="mr-5 flex items-center h-full">
          <ArrowLeft className="w-6 h-6 hover:text-gray-200" />
        </button>
        <h1 className="text-xl font-semibold">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-center py-8">
          <div className="relative">
            <Avatar src={user?.avatar} alt={user?.displayName} size="xl" />
            <button
              type="button"
              title="Change profile photo"
              aria-label="Change profile photo"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-wa-teal-600 text-white shadow-md hover:bg-wa-teal-700 disabled:opacity-70"
            >
              {uploadingPhoto ? <LoadingSpinner size="sm" className="text-white" /> : <Camera className="h-5 w-5" />}
            </button>
            <input
              ref={avatarInputRef}
              type="file" 
              className="sr-only"
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-wa-dark-300 px-7 py-4 shadow-sm mb-3">
          <p className="text-wa-teal-600 dark:text-wa-teal-500 text-sm mb-2">Your name</p>
          <div className="flex justify-between items-center">
            {isEditing ? (
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-wa-teal-500 outline-none py-1 text-gray-900 dark:text-white"
                autoFocus
              />
            ) : (
              <span className="text-gray-900 dark:text-white text-lg">{user?.displayName}</span>
            )}
            
            <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="ml-4 text-gray-500 hover:text-gray-700">
              {isEditing ? (
                loading ? <span className="text-sm">...</span> : <Check className="w-5 h-5" />
              ) : (
                <Edit2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="px-7 py-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
          This is not your username or pin. This name will be visible to your ChatApp contacts.
        </div>

        <div className="bg-white dark:bg-wa-dark-300 px-7 py-4 shadow-sm mb-3">
          <p className="text-wa-teal-600 dark:text-wa-teal-500 text-sm mb-2">About</p>
          <div className="flex justify-between items-center">
            {isEditingAbout ? (
              <input 
                type="text" 
                value={about} 
                onChange={(e) => setAbout(e.target.value)}
                className="w-full bg-transparent border-b-2 border-wa-teal-500 outline-none py-1 text-gray-900 dark:text-white"
                autoFocus
              />
            ) : (
              <span className="text-gray-900 dark:text-white text-lg">{user?.about || 'Available'}</span>
            )}
            
            <button onClick={() => isEditingAbout ? handleSaveAbout() : setIsEditingAbout(true)} className="ml-4 text-gray-500 hover:text-gray-700">
              {isEditingAbout ? (
                loadingAbout ? <span className="text-sm">...</span> : <Check className="w-5 h-5" />
              ) : (
                <Edit2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-wa-dark-300 px-7 py-4 shadow-sm mb-3">
          <p className="text-wa-teal-600 dark:text-wa-teal-500 text-sm mb-2">
            {user?.phoneNumber ? 'Phone' : 'Email'}
          </p>
          <div className="flex justify-between items-center">
            <span className="text-gray-900 dark:text-white text-lg">
              {user?.phoneNumber || (user?.email?.endsWith('@phone.chatapp.invalid') ? '' : user?.email)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
