import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Clock, Heart } from 'lucide-react';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media?.duration_seconds || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [resumePrompt, setResumePrompt] = useState(null);
  const [lastSavedTime, setLastSavedTime] = useState(0);
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
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
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
      // Standard container fullscreen without forcing orientation
      const container = videoRef.current.parentElement;
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Resume Watch Notification Banner */}
      {resumePrompt && (
        <div className="w-full max-w-2xl mb-3 p-3 bg-[#FFFBF5] border-2 border-[#D4A373] rounded-[6px] flex items-center justify-between text-[13px] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-[#1C1917]">
            <Clock className="w-4 h-4 text-[#C2410C]" />
            <span>
              Lanjutkan menonton dari <strong>{formatSeconds(resumePrompt)}</strong>?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="px-2.5 py-1 text-[12px] font-semibold text-[#57534E] hover:text-[#1C1917] rounded transition-colors"
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

      {/* Video Container: Portrait (9:16) vs Landscape (16:9) Native Aspect Ratio */}
      <div
        className={`relative group bg-black rounded-[8px] overflow-hidden flex items-center justify-center border-2 border-[#D6D3D1] ${
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
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Big Center Play Button when paused */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 bg-[#C2410C]/90 hover:bg-[#C2410C] text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-modal"
          >
            <Play className="w-8 h-8 ml-1 fill-white" />
          </button>
        )}

        {/* Video Controls Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
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
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="hover:text-[#D4A373] transition-colors">
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              <div className="flex items-center gap-1.5">
                <button onClick={toggleMute} className="hover:text-[#D4A373] transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/30 rounded appearance-none cursor-pointer accent-[#C2410C]"
                />
              </div>

              <span className="font-mono text-[12px] opacity-90">
                {formatSeconds(currentTime)} / {formatSeconds(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isPortrait && (
                <span className="text-[11px] font-bold uppercase tracking-wider bg-[#365314]/80 text-[#FFFBF5] px-2 py-0.5 rounded-[3px] border border-[#365314]">
                  Portrait 9:16
                </span>
              )}

              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(media.id, !media.is_favorite)}
                  className={`hover:scale-110 transition-transform ${media.is_favorite ? 'text-[#DC2626]' : 'text-white'}`}
                >
                  <Heart className={`w-5 h-5 ${media.is_favorite ? 'fill-[#DC2626]' : ''}`} />
                </button>
              )}

              <button onClick={toggleFullscreen} className="hover:text-[#D4A373] transition-colors">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

