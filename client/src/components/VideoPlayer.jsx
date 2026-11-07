import React, { useRef, useState, useEffect } from 'react';
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Clock, Heart, SkipBack, SkipForward
} from 'lucide-react';
import { api } from '../api';

function formatSeconds(sec) {
  if (isNaN(sec) || sec <= 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({ media, src, isVault = false, vaultToken = null, onToggleFavorite }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0 });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media?.duration_seconds || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [resumePrompt, setResumePrompt] = useState(null);
  const [lastSavedTime, setLastSavedTime] = useState(0);
  const [seekFeedback, setSeekFeedback] = useState(null); // { side: 'left' | 'right', text: string }

  const isPortrait = media?.is_portrait || (media?.height && media?.width && media.height > media.width);

  // Check saved progress on load
  useEffect(() => {
    let isMounted = true;
    const fetchProgress = async () => {
      try {
        const data = await api.getProgress(media.id);
        const lastPos = data.last_position_seconds;
        if (isMounted && lastPos > 5 && (!media.duration_seconds || lastPos < media.duration_seconds - 5)) {
          setResumePrompt(lastPos);
        }
      } catch (e) {}
    };

    fetchProgress();
    return () => {
      isMounted = false;
    };
  }, [media.id]);

  // Periodic watch progress saver (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        const time = Math.round(videoRef.current.currentTime);
        if (time > 0 && Math.abs(time - lastSavedTime) >= 5) {
          setLastSavedTime(time);
          api.saveProgress(media.id, time).catch(() => {});
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [media.id, isPlaying, lastSavedTime]);

  const seekBy = (seconds) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration || 99999, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const showFeedback = (side, text) => {
    setSeekFeedback({ side, text });
    setTimeout(() => {
      setSeekFeedback(null);
    }, 600);
  };

  const handleContainerClick = (e) => {
    // If click was on control buttons or slider, ignore
    if (e.target.closest('button') || e.target.closest('input')) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const now = Date.now();
    const timeSinceLast = now - lastTapRef.current.time;

    if (timeSinceLast < 350) {
      // Double tap detected!
      if (clickX < width * 0.4) {
        // Double tap on left side -> rewind 5 seconds
        seekBy(-5);
        showFeedback('left', '-5 detik');
      } else if (clickX > width * 0.6) {
        // Double tap on right side -> forward 5 seconds
        seekBy(5);
        showFeedback('right', '+5 detik');
      } else {
        togglePlay();
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      // Single tap: record time
      lastTapRef.current = { time: now, x: clickX };
      // Allow single tap toggle play after small timeout if no second tap
      setTimeout(() => {
        if (Date.now() - lastTapRef.current.time >= 350 && lastTapRef.current.time !== 0) {
          togglePlay();
        }
      }, 360);
    }
  };

  const handleResume = () => {
    if (videoRef.current && resumePrompt) {
      videoRef.current.currentTime = resumePrompt;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    setResumePrompt(null);
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    setResumePrompt(null);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || media?.duration_seconds || 0);
    }
  };

  const handleSeek = (e) => {
    const targetTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const container = containerRef.current;
      if (container && container.requestFullscreen) {
        container.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Resume Watch Notification Banner */}
      {resumePrompt && (
        <div className="w-full max-w-2xl mb-3 p-3 bg-[#FFFBF5] dark:bg-[#23201D] border-2 border-[#D4A373] dark:border-[#3E3834] rounded-[6px] flex items-center justify-between text-[13px] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-[#1C1917] dark:text-[#F5F2EB]">
            <Clock className="w-4 h-4 text-[#C2410C]" />
            <span>
              Lanjutkan menonton dari <strong>{formatSeconds(resumePrompt)}</strong>?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="px-2.5 py-1 text-[12px] font-semibold text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] rounded transition-colors"
            >
              Mulai Awal
            </button>
            <button
              onClick={handleResume}
              className="btn-primary text-[12px] py-1 px-3 h-7"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* Video Container: Native Aspect Ratio */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`relative group bg-black rounded-[8px] overflow-hidden flex items-center justify-center border-2 border-[#D6D3D1] dark:border-[#3E3834] select-none ${
          isPortrait
            ? 'w-auto max-w-[360px] aspect-[9/16] h-[70vh]'
            : 'w-full max-w-4xl aspect-[16/9]'
        }`}
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Double-Tap Seek Feedback Animations */}
        {seekFeedback && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center bg-black/60 text-white px-4 py-2.5 rounded-full animate-enter ${
              seekFeedback.side === 'left' ? 'left-8' : 'right-8'
            }`}
          >
            {seekFeedback.side === 'left' ? (
              <RotateCcw className="w-6 h-6 animate-spin text-[#D4A373]" />
            ) : (
              <RotateCw className="w-6 h-6 animate-spin text-[#D4A373]" />
            )}
            <span className="text-[12px] font-mono font-bold mt-1">{seekFeedback.text}</span>
          </div>
        )}

        {/* Big Center Play Button when paused */}
        {!isPlaying && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="absolute inset-0 m-auto w-16 h-16 bg-[#C2410C]/90 hover:bg-[#C2410C] text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-modal"
          >
            <Play className="w-8 h-8 ml-1 fill-white" />
          </button>
        )}

        {/* Video Controls Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col gap-2"
        >
          {/* Progress bar */}
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#C2410C]"
          />

          <div className="flex items-center justify-between text-white text-[13px]">
            {/* Left controls: Play/Pause, Mute toggle, Volume Slider, Time */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={togglePlay}
                className="hover:text-[#D4A373] p-1 transition-colors"
                title={isPlaying ? 'Jeda' : 'Putar'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              {/* Dedicated Mute Audio Button */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  className={`p-1 rounded hover:bg-white/10 transition-colors ${
                    isMuted || volume === 0 ? 'text-[#DC2626]' : 'text-white hover:text-[#D4A373]'
                  }`}
                  title={isMuted ? 'Nyalakan Audio' : 'Mute Audio'}
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-12 sm:w-16 h-1 bg-white/30 rounded appearance-none cursor-pointer accent-[#C2410C] hidden sm:block"
                />
              </div>

              <span className="font-mono text-[11px] sm:text-[12px] opacity-90 whitespace-nowrap">
                {formatSeconds(currentTime)} / {formatSeconds(duration)}
              </span>
            </div>

            {/* Right controls: Seek -5s, +5s (desktop & touch), Favorite, Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Seek -5s Button */}
              <button
                onClick={() => {
                  seekBy(-5);
                  showFeedback('left', '-5 detik');
                }}
                className="flex items-center gap-1 px-2 py-1 bg-white/15 hover:bg-white/25 rounded text-[11px] font-mono transition-colors"
                title="Mundur 5 Detik"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">5s</span>
              </button>

              {/* Seek +5s Button */}
              <button
                onClick={() => {
                  seekBy(5);
                  showFeedback('right', '+5 detik');
                }}
                className="flex items-center gap-1 px-2 py-1 bg-white/15 hover:bg-white/25 rounded text-[11px] font-mono transition-colors"
                title="Maju 5 Detik"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">5s</span>
              </button>

              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(media.id, !media.is_favorite)}
                  className={`p-1 hover:scale-110 transition-transform ${
                    media.is_favorite ? 'text-[#DC2626]' : 'text-white'
                  }`}
                  title="Favorit"
                >
                  <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${media.is_favorite ? 'fill-[#DC2626]' : ''}`} />
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-1 hover:text-[#D4A373] transition-colors"
                title="Layar Penuh"
              >
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
