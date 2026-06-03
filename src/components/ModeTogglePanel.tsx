 import React from 'react';

type Props = {
  mode: 'csv' | 'realtime';
  onChange: (mode: 'csv' | 'realtime') => void;
  realtimeSignal?: {
    packetRateHz: number | null;
    packetLossPct: number | null;
    communicationStatus: 'GOOD' | 'WARNING' | 'POOR';
  };
};

export const ModeTogglePanel: React.FC<Props> = ({ mode, onChange, realtimeSignal }) => {
  const isCsv = mode === 'csv';

  const status = realtimeSignal?.communicationStatus;
  const statusColor =
    status === 'GOOD'
      ? 'var(--accent-green)'
      : status === 'WARNING'
        ? 'var(--accent-warning)'
        : 'var(--accent-danger)';

  return (
    <div
      className="mode-toggle"
      role="group"
      aria-label="Telemetry mode"
      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <label className="mode-switch" aria-label="Toggle telemetry mode">
        <input
          type="checkbox"
          checked={!isCsv}
          onChange={(e) => onChange(e.target.checked ? 'realtime' : 'csv')}
        />
        <span className="mode-switch-track" />
        <span className="mode-switch-thumb" />
      </label>

      <span className="mode-switch-label" aria-live="polite">
        {mode === 'csv' ? 'CSV' : 'REAL-TIME'}
      </span>

      {mode === 'realtime' && (
        <span
          className="realtime-signal"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)'
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}
          >
            {realtimeSignal?.packetRateHz == null ? '--' : `${realtimeSignal.packetRateHz.toFixed(1)} Hz`}
            {' · '}
            {realtimeSignal?.packetLossPct == null
              ? '--'
              : `${realtimeSignal.packetLossPct.toFixed(1)}% loss`}
          </span>
        </span>
      )}
    </div>
  );
};

