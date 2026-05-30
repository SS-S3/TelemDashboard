import React, { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { TelemetryRecord } from '../types';
import { format, isValid, parseISO } from 'date-fns';

interface Props {
  telemetry: TelemetryRecord[];
  selectedIndex: number | null;
  onSelectPoint: (index: number | ((prev: number | null) => number | null)) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export const PlaybackController: React.FC<Props> = React.memo(({ telemetry, selectedIndex, onSelectPoint, isPlaying, setIsPlaying }) => {
  const currentIndex = selectedIndex ?? 0;
  const maxIndex = Math.max(0, telemetry.length - 1);
  const timerRef = useRef<number | null>(null);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) {
      return '--:--:--';
    }

    const parsedTimestamp = parseISO(timestamp);
    return isValid(parsedTimestamp) ? format(parsedTimestamp, 'HH:mm:ss') : timestamp;
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        onSelectPoint((prev) => {
          const next = (prev ?? 0) + 1;
          if (next >= maxIndex) {
            setIsPlaying(false);
            return maxIndex;
          }
          return next;
        });
      }, 100); // 10x playback speed relative to 1Hz
    } else if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [isPlaying, maxIndex, onSelectPoint, setIsPlaying]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectPoint(parseInt(e.target.value, 10));
    setIsPlaying(false);
  };

  const handleSkipBack = () => {
    onSelectPoint(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    onSelectPoint(maxIndex);
    setIsPlaying(false);
  };

  const currentRecord = telemetry[currentIndex];
  const timeFormatted = currentRecord ? formatTimestamp(currentRecord.Timestamp) : '--:--:--';

  return (
    <div className="playback-panel">
      <div className="play-controls">
        <button className="play-btn" style={{ width: 36, height: 36, background: 'transparent', color: 'var(--text-secondary)' }} onClick={handleSkipBack}>
          <SkipBack size={20} />
        </button>
        
        <button className="play-btn" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 4 }} />}
        </button>

        <button className="play-btn" style={{ width: 36, height: 36, background: 'transparent', color: 'var(--text-secondary)' }} onClick={handleSkipForward}>
          <SkipForward size={20} />
        </button>
      </div>

      <div className="time-slider-container">
        <span className="time-display" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {telemetry.length > 0 ? formatTimestamp(telemetry[0].Timestamp) : '--:--:--'}
        </span>
        
        <input 
          type="range" 
          className="time-slider" 
          min={0} 
          max={maxIndex} 
          value={currentIndex} 
          onChange={handleSliderChange}
        />
        
        <span className="time-display">
          {timeFormatted}
        </span>
      </div>
    </div>
  );
});

PlaybackController.displayName = 'PlaybackController';
