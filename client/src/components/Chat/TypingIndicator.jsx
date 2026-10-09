import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1 p-1">
      <div className="w-1.5 h-1.5 bg-wa-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-1.5 h-1.5 bg-wa-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-1.5 h-1.5 bg-wa-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

export default TypingIndicator;
