import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const CustomAudioPlayer = ({ src, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => setDuration(audio.duration);
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = (e.target.value / 100) * duration;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const sliderValue = duration ? (currentTime / duration) * 100 : 0;
  
  // Whatsapp-style colors based on whether it's our own message or received
  const iconColor = isOwn ? 'text-wa-teal-600 dark:text-wa-teal-500' : 'text-gray-500 dark:text-gray-400';
  const sliderColorClass = isOwn ? 'accent-wa-teal-600 dark:accent-wa-teal-500' : 'accent-gray-500 dark:accent-gray-400';

  return (
    <div className="flex items-center space-x-3 min-w-[220px] max-w-[280px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button 
        onClick={togglePlayPause}
        className="focus:outline-none shrink-0"
      >
        {isPlaying ? (
          <Pause className={`w-7 h-7 ${iconColor} fill-current`} />
        ) : (
          <Play className={`w-7 h-7 ${iconColor} fill-current`} />
        )}
      </button>

      {/* Progress & Duration */}
      <div className="flex flex-col w-full space-y-1">
        <div className="flex items-center justify-between">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue || 0}
            onChange={handleSeek}
            className={`w-full h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer ${sliderColorClass}`}
            style={{
              background: `linear-gradient(to right, ${isOwn ? '#00a884' : '#6b7280'} ${sliderValue}%, ${isOwn ? '#bbf7d0' : '#d1d5db'} ${sliderValue}%)`
            }}
          />
        </div>
        <div className="flex justify-between items-center w-full">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {formatTime(currentTime || duration)}
          </span>
          <Mic className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      
      {/* Avatar Placeholder (Optional, typical in WA voice notes) */}
      <div className="shrink-0 relative hidden sm:block">
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
          <Mic className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default CustomAudioPlayer;

