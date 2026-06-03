import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardData } from './types';
import { fetchAndProcessData } from './utils/dataProcessing';
import { SummaryPanel } from './components/SummaryPanel';
import { MapPanel } from './components/MapPanel';
import { CurrentStatusPanel } from './components/CurrentStatusPanel';
import { DualCameraViewPanel } from './components/DualCameraViewPanel';
import { RealtimeTelemetryPanel } from './components/RealtimeTelemetryPanel';
import { ModeTogglePanel } from './components/ModeTogglePanel';


import { ThreeDTrajectory } from './components/ThreeDTrajectory';
import { PlaybackController } from './components/PlaybackController';
import { Activity, RefreshCw } from 'lucide-react';

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [telemetryMode, setTelemetryMode] = useState<'csv' | 'realtime'>('csv');

  const [realtimeSignal] = useState({
    packetRateHz: null as number | null,
    packetLossPct: null as number | null,
    communicationStatus: 'GOOD' as 'GOOD' | 'WARNING' | 'POOR'
  });

  // Track realtime packet rate + loss based on incoming Sequence numbers.
  // These are used by a lightweight websocket listener (when switching to realtime mode).





  const reloadData = useCallback(() => {
    setLoading(true);
    setError(null);
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

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const handleSelectPoint = useCallback((index: number | ((prev: number | null) => number | null)) => {
    setSelectedIndex(index);
  }, []);

  const currentTelemetry = useMemo(() => {
    if (!data || selectedIndex === null) return null;
    return data.telemetry[selectedIndex] || null;
  }, [data, selectedIndex]);

  const currentSyncedImage = useMemo(() => {
    if (!data || !currentTelemetry) return null;

    const currentMs = new Date(currentTelemetry.Timestamp).getTime();
    if (!Number.isFinite(currentMs)) return null;

    let best: { item: (typeof data.syncedImages)[number]; diff: number } | null = null;

    for (const si of data.syncedImages) {
      const t = new Date(si.telemetry.Timestamp).getTime();
      if (!Number.isFinite(t)) continue;

      const diff = Math.abs(t - currentMs);
      if (!best || diff < best.diff) best = { item: si, diff };
    }

    return best?.item ?? null;
  }, [data, currentTelemetry]);

  // Reuse existing single synced image model for overlays (until you provide
  // dual image timestamps).
  const syncedImage0 = currentSyncedImage;
  const syncedImage1 = currentSyncedImage;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1>
            <Activity size={28} className="text-cyan" />
            GCS Telemetry Dashboard{' '}

          <span
            style={{
              fontSize: '0.8rem',
              color: 'var(--accent-green)',
              marginLeft: '12px',
              border: '1px solid var(--accent-green)',
              padding: '2px 8px',
              borderRadius: '12px'
            }}
          >
            V2
          </span>
        </h1>
        </div>
        <div className="header-status" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

          {telemetryMode === 'csv' && (
            <button
              onClick={reloadData}
              className="reload-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#334155',
                border: 'none',
                borderRadius: '6px',
                color: '#e2e8f0',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} /> Reload CSV
            </button>
          )}

          <ModeTogglePanel
            mode={telemetryMode}
            onChange={setTelemetryMode}
            realtimeSignal={telemetryMode === 'realtime' ? realtimeSignal : undefined}
          />


          <div className="status-badge">

            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor:
                  data.summary.communicationStatus === 'GOOD' ? 'var(--accent-green)' : 'var(--accent-danger)'
              }}
            />
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
            <button className={viewMode === '2D' ? 'active' : ''} onClick={() => setViewMode('2D')}>
              2D Map
            </button>
            <button className={viewMode === '3D' ? 'active' : ''} onClick={() => setViewMode('3D')}>
              3D Profile
            </button>
          </div>

          <div style={{ display: viewMode === '2D' ? 'block' : 'none', height: '100%', width: '100%' }}>
            <MapPanel telemetry={data.telemetry} selectedIndex={selectedIndex} onSelectPoint={handleSelectPoint} />
          </div>

          <div style={{ display: viewMode === '3D' ? 'block' : 'none', height: '100%', width: '100%' }}>
            <ThreeDTrajectory telemetry={data.telemetry} selectedIndex={selectedIndex} onSelectPoint={handleSelectPoint} />
          </div>
        </div>
      </main>

      <aside className="right-panel">
        {telemetryMode === 'realtime' ? (
          <RealtimeTelemetryPanel />
        ) : (
          <div className="panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <h2 style={{ marginBottom: 0 }}>CSV Telemetry</h2>
            </div>
            <div className="data-grid">
              <div className="data-item">
                <div className="data-label">pH</div>
                <div className="data-value">--</div>
              </div>
              <div className="data-item">
                <div className="data-label">Conductivity</div>
                <div className="data-value">--</div>
              </div>
              <div className="data-item">
                <div className="data-label">Temp</div>
                <div className="data-value">--</div>
              </div>
              <div className="data-item">
                <div className="data-label">Water Flow</div>
                <div className="data-value">--</div>
              </div>
            </div>
          </div>
        )}
        <DualCameraViewPanel syncedImage0={syncedImage0} syncedImage1={syncedImage1} />
      </aside>



      {telemetryMode === 'csv' && (
        <PlaybackController
          telemetry={data.telemetry}
          selectedIndex={selectedIndex}
          onSelectPoint={handleSelectPoint}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />
      )}
    </div>
  );
}

export default App;

