import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SyncedImage } from '../types';
import { Camera } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  syncedImage: SyncedImage | null;
}

type LoadedState = {
  name: string;
  src: string;
  loaded: boolean;
};

export const CameraViewPanel: React.FC<Props> = ({ syncedImage }) => {
  const [displayed, setDisplayed] = useState<LoadedState | null>(null);
  const preloadRef = useRef<Map<string, boolean>>(new Map());

  const target = useMemo(() => {
    if (!syncedImage) return null;
    const src = `/frames/${syncedImage.ImageName}`;
    return { name: syncedImage.ImageName, src, timestamp: syncedImage.ImageTimestamp };
  }, [syncedImage]);

  // Keep previous image rendered until next frame load completes.
  // (Hard-coded 5s stepping will be handled by the mission playback controller.)

  // Keeping previous frame until boundary is reached is handled by not forcing updates
  // when `syncedImage` changes but the next boundary hasn't been crossed.
  // (Current implementation shows the previous frame until the next 5s boundary.)

  useEffect(() => {

    if (!target) {
      setDisplayed(null);
      return;
    }

    const src = target.src;
    const name = target.name;

    // If first time, show immediately.
    setDisplayed((prev) => {
      if (!prev) return { name, src, loaded: false };
      // Keep current displayed until the next 5s boundary.
      return prev;
    });

    if (preloadRef.current.get(src)) {
      setDisplayed({ name, src, loaded: true });
      return;
    }

    const img = new Image();
    img.onload = () => {
      preloadRef.current.set(src, true);
      setDisplayed({ name, src, loaded: true });
    };
    img.onerror = () => {
      // On error, still attempt to display so user can see something.
      preloadRef.current.set(src, false);
      setDisplayed({ name, src, loaded: true });
    };
    img.src = src;

  }, [target]);

  const timestampLabel = (() => {
    if (!syncedImage) return '--:--:--';
    const d = new Date(syncedImage.ImageTimestamp);
    const ms = d.getTime();
    if (!Number.isFinite(ms)) return syncedImage.ImageTimestamp ?? '--:--:--';
    return format(d, 'HH:mm:ss');
  })();

  const currentImageName = syncedImage ? (displayed?.name ?? syncedImage.ImageName) : displayed?.name;
  const currentSrc = displayed?.src ?? (syncedImage ? `/frames/${syncedImage.ImageName}` : '');


  return (
    <div className="panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <Camera size={20} className="text-cyan" />
        <h2>Camera Feed</h2>
      </div>

      {syncedImage ? (
        <div className="camera-container">
          <img src={currentSrc} alt="Camera Feed" className="camera-image" />
          <div className="camera-overlay">
            <span>{currentImageName}</span>
            <span>{timestampLabel}</span>
          </div>
        </div>
      ) : (
        <div
          className="camera-container"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
        >
          <span>No image synced for this location</span>
        </div>
      )}
    </div>
  );
};

