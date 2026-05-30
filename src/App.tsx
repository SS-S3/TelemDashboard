import React, { useEffect, useState } from 'react';
import { DashboardData, SyncedImage } from './types';
import { fetchAndProcessData } from './utils/dataProcessing';
import { SummaryPanel } from './components/SummaryPanel';
import { MapPanel } from './components/MapPanel';
import { CurrentStatusPanel } from './components/CurrentStatusPanel';
import { CameraViewPanel } from './components/CameraViewPanel';
import { Activity } from 'lucide-react';

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

  const currentTelemetry = selectedIndex !== null ? data.telemetry[selectedIndex] : null;
  
  // Find synchronized image for the selected point
  let currentSyncedImage: SyncedImage | null = null;
  if (currentTelemetry) {
    const matchedSync = data.syncedImages.find(si => si.telemetry === currentTelemetry);
    if (matchedSync) {
      currentSyncedImage = matchedSync;
    }
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <h1>
          <Activity size={28} className="text-cyan" />
          GCS Telemetry Dashboard
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

      <main className="map-panel">
        <MapPanel 
          telemetry={data.telemetry} 
          selectedIndex={selectedIndex} 
          onSelectPoint={setSelectedIndex} 
        />
      </main>

      <aside className="right-panel">
        <CameraViewPanel syncedImage={currentSyncedImage} />
      </aside>
    </div>
  );
}

export default App;
