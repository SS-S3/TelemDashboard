import React from 'react';
import { SyncedImage } from '../types';
import { Camera } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Props {
  syncedImage: SyncedImage | null;
}

export const CameraViewPanel: React.FC<Props> = ({ syncedImage }) => {
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
            <span>{format(parseISO(syncedImage.ImageTimestamp), 'HH:mm:ss')}</span>
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
