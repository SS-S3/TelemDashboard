import React from 'react';
import type { MissionSummary } from '../types';
import { Activity, Clock, Navigation, Zap, Wifi } from 'lucide-react';

interface Props {
  summary: MissionSummary;
}

export const SummaryPanel: React.FC<Props> = ({ summary }) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <Activity size={20} className="text-cyan" />
        <h2>Mission Summary</h2>
      </div>
      
      <div className="data-grid" style={{ marginBottom: '24px' }}>
        <div className="data-item">
          <span className="data-label">Duration</span>
          <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} className="text-secondary" /> {summary.duration}
          </span>
        </div>
        <div className="data-item">
          <span className="data-label">Total Distance</span>
          <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Navigation size={16} className="text-secondary" /> {summary.totalDistance.toFixed(2)} km
          </span>
        </div>
        <div className="data-item">
          <span className="data-label">Avg Speed</span>
          <span className="data-value">{summary.averageSpeed.toFixed(2)} m/s</span>
        </div>
        <div className="data-item">
          <span className="data-label">Max Speed</span>
          <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={16} className="text-warning" /> {summary.maxSpeed.toFixed(2)} m/s
          </span>
        </div>
      </div>

      <div className="panel-header" style={{ marginTop: '24px' }}>
        <Wifi size={20} className="text-cyan" />
        <h2>Comm Summary</h2>
      </div>

      <div className="data-grid">
        <div className="data-item">
          <span className="data-label">Packets Recv</span>
          <span className="data-value text-green">{summary.packetsReceived}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Packets Missed</span>
          <span className={`data-value ${summary.packetsMissing > 0 ? 'text-danger' : 'text-green'}`}>
            {summary.packetsMissing}
          </span>
        </div>
        <div className="data-item">
          <span className="data-label">Loss Rate</span>
          <span className={`data-value ${summary.packetLoss > 0 ? 'text-warning' : 'text-green'}`}>
            {summary.packetLoss.toFixed(2)}%
          </span>
        </div>
        <div className="data-item">
          <span className="data-label">Status</span>
          <span className={`data-value ${
            summary.communicationStatus === 'GOOD' ? 'text-green' : 
            summary.communicationStatus === 'WARNING' ? 'text-warning' : 'text-danger'
          }`}>
            {summary.communicationStatus}
          </span>
        </div>
      </div>
    </div>
  );
};
