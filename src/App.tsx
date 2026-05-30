import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardData, SyncedImage } from './types';
import { fetchAndProcessData } from './utils/dataProcessing';
import { SummaryPanel } from './components/SummaryPanel';
import { MapPanel } from './components/MapPanel';
import { CurrentStatusPanel } from './components/CurrentStatusPanel';
import { CameraViewPanel } from './components/CameraViewPanel';
import { ThreeDTrajectory } from './components/ThreeDTrajectory';
import { PlaybackController } from './components/PlaybackController';
import { Activity } from 'lucide-react';

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');

  useEffect(() => {
    fetchAndProcessData()
      .then((processedData) => {
        setData(processedData);
        if (processedData.telemetry.length > 0) {
          setSelectedIndex(0);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading data:', err);
        setError('Failed to load telemetry data. Please ensure the datasets are available.');
        setLoading(false);
      });
  }, []);

  const handleSelectPoint = useCallback((index: number | ((prev: number | null) => number | null)) => {
    setSelectedIndex(index);
  }, []);

  const currentTelemetry = useMemo(() => {
    if (!data || selectedIndex === null) return null;
    return data.telemetry[selectedIndex] || null;
  }, [data, selectedIndex]);
  
  const currentSyncedImage = useMemo(() => {
    if (!data || !currentTelemetry) return null;
    return data.syncedImages.find(si => si.telemetry === currentTelemetry) || null;
  }, [data, currentTelemetry]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading Mission Data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="loader-container text-danger">
        <p>{error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <h1>
          <Activity size={28} className="text-cyan" />
          GCS Telemetry Dashboard <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', marginLeft: '12px', border: '1px solid var(--accent-green)', padding: '2px 8px', borderRadius: '12px' }}>V2</span>
        </h1>
        <div className="header-status">
          <div className="status-badge">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: data.summary.communicationStatus === 'GOOD' ? 'var(--accent-green)' : 'var(--accent-danger)' }} />
            {data.summary.communicationStatus === 'GOOD' ? 'SYSTEM NOMINAL' : 'SYSTEM DEGRADED'}
          </div>
        </div>
      </header>

      <aside className="left-panel">
        <SummaryPanel summary={data.summary} />
        <CurrentStatusPanel telemetry={currentTelemetry} />
      </aside>

      <main className="main-panel">
        <div className="map-container">
          <div className="view-toggle">
            <button className={viewMode === '2D' ? 'active' : ''} onClick={() => setViewMode('2D')}>2D Map</button>
            <button className={viewMode === '3D' ? 'active' : ''} onClick={() => setViewMode('3D')}>3D Profile</button>
          </div>
          
          <div style={{ display: viewMode === '2D' ? 'block' : 'none', height: '100%', width: '100%' }}>
            <MapPanel 
              telemetry={data.telemetry} 
              selectedIndex={selectedIndex} 
              onSelectPoint={handleSelectPoint} 
            />
          </div>
          <div style={{ display: viewMode === '3D' ? 'block' : 'none', height: '100%', width: '100%' }}>
            <ThreeDTrajectory 
              telemetry={data.telemetry} 
              selectedIndex={selectedIndex} 
              onSelectPoint={handleSelectPoint} 
            />
          </div>
        </div>
      </main>

      <aside className="right-panel">
        <CameraViewPanel syncedImage={currentSyncedImage} />
      </aside>

      <PlaybackController 
        telemetry={data.telemetry}
        selectedIndex={selectedIndex}
        onSelectPoint={handleSelectPoint}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />
    </div>
  );
}

export default App;
