import React from 'react';
import { X, Send } from 'lucide-react';

const ImagePreview = ({ file, onCancel, onSend, isUploading }) => {
  const previewUrl = URL.createObjectURL(file);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-wa-dark-500">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-wa-dark-300 border-b border-gray-200 dark:border-wa-dark-200 shadow-sm">
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Preview Image</h2>
        <div className="w-6"></div> {/* Spacer for centering */}
      </div>
      
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-200 dark:bg-wa-dark-400">
        <img 
          src={previewUrl} 
          alt="Preview" 
          className="max-w-full max-h-full object-contain rounded-md shadow-lg"
        />
      </div>
      
      <div className="p-4 bg-white dark:bg-wa-dark-300 flex justify-center border-t border-gray-200 dark:border-wa-dark-200">
        <button 
          onClick={() => onSend(file)}
          disabled={isUploading}
          className="w-16 h-16 rounded-full bg-wa-teal-500 hover:bg-wa-teal-600 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
        >
          {isUploading ? (
            <span className="text-xs font-semibold">...</span>
          ) : (
            <Send className="w-8 h-8 ml-1" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ImagePreview;
