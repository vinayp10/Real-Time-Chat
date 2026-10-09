import React from 'react';

const Avatar = ({ src, alt, initials, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-24 h-24 text-2xl',
  };

  return (
    <div className={`relative flex items-center justify-center rounded-full bg-wa-teal-500 text-white overflow-hidden ${sizeClasses[size]} ${className}`}>
      {src ? (
        <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <span className="font-semibold uppercase">{initials || alt?.charAt(0) || '?'}</span>
      )}
    </div>
  );
};

export default Avatar;
