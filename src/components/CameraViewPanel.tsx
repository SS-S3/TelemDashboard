import React from 'react';
import type { SyncedImage } from '../types';
import { Camera } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

interface Props {
  syncedImage: SyncedImage | null;
}

export const CameraViewPanel: React.FC<Props> = ({ syncedImage }) => {
  const timestamp = syncedImage ? parseISO(syncedImage.ImageTimestamp) : null;
  const timestampLabel = timestamp && isValid(timestamp)
    ? format(timestamp, 'HH:mm:ss')
    : syncedImage?.ImageTimestamp ?? '--:--:--';

  return (
    <div className="panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <Camera size={20} className="text-cyan" />
        <h2>Camera Feed</h2>
      </div>
      
      {syncedImage ? (
        <div className="camera-container">
          <img 
            src={`/frames/${syncedImage.ImageName}`} 
            alt="Camera Feed" 
            className="camera-image"
          />
          <div className="camera-overlay">
            <span>{syncedImage.ImageName}</span>
            <span>{timestampLabel}</span>
          </div>
        </div>
      ) : (
        <div className="camera-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <span>No image synced for this location</span>
        </div>
      )}
    </div>
  );
};
