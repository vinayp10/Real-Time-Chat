import React from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useThemeStore } from '../../stores/themeStore';

const EmojiPickerComponent = ({ onEmojiClick }) => {
  const { darkMode } = useThemeStore();

  return (
    <EmojiPicker 
      onEmojiClick={onEmojiClick} 
      theme={darkMode ? 'dark' : 'light'}
      lazyLoadEmojis={true}
      searchDisabled={false}
      skinTonesDisabled={true}
      width={300}
      height={400}
    />
  );
};

export default EmojiPickerComponent;
