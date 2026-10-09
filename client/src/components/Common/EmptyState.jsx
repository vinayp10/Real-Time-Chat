import React from 'react';

const EmptyState = ({ icon: Icon, title, message }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center bg-wa-chat-light dark:bg-wa-dark-500">
      {Icon && <Icon className="w-20 h-20 text-gray-400 dark:text-gray-500 mb-6" strokeWidth={1} />}
      <h2 className="text-2xl font-light text-gray-700 dark:text-gray-200 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">{message}</p>
    </div>
  );
};

export default EmptyState;
