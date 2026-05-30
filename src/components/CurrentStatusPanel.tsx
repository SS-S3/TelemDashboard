import React from 'react';
import { TelemetryRecord } from '../types';
import { Compass, Gauge, Battery, Signal, MapPin, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Props {
  telemetry: TelemetryRecord | null;
}

export const CurrentStatusPanel: React.FC<Props> = ({ telemetry }) => {
  if (!telemetry) {
    return (
      <div className="panel">
        <div className="panel-header">
          <Compass size={20} className="text-cyan" />
          <h2>Current Status</h2>
        </div>
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
          No data selected
        </div>
      </div>
    );
  }

  const timeFormatted = format(parseISO(telemetry.Timestamp), 'HH:mm:ss');

  return (
    <div className="panel">
      <div className="panel-header">
        <Compass size={20} className="text-cyan" />
        <h2>Current Status</h2>
      </div>
      
      <div className="data-grid">
        <div className="data-item">
          <span className="data-label">Time</span>
          <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} className="text-secondary" /> {timeFormatted}
          </span>
        </div>
        <div className="data-item">
          <span className="data-label">Speed</span>
          <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gauge size={16} className="text-secondary" /> {telemetry.Speed.toFixed(2)} m/s
          </span>
        </div>
        
        <div className="data-item">
          <span className="data-label">Latitude</span>
          <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={16} className="text-secondary" /> {telemetry.Latitude.toFixed(6)}
          </span>
        </div>
        <div className="data-item">
          <span className="data-label">Longitude</span>
          <span className="data-value">{telemetry.Longitude.toFixed(6)}</span>
        </div>

        <div className="data-item">
          <span className="data-label">Battery</span>
          <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Battery size={16} className={telemetry.Battery < 20 ? 'text-danger' : telemetry.Battery < 50 ? 'text-warning' : 'text-green'} /> 
            {telemetry.Battery.toFixed(1)}%
          </span>
        </div>
        <div className="data-item">
          <span className="data-label">Signal</span>
          <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Signal size={16} className={telemetry.SignalStrength < 30 ? 'text-danger' : 'text-green'} /> 
            {telemetry.SignalStrength.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
