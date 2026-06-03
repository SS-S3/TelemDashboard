import React, { useEffect, useMemo, useState } from 'react';

type TelemetryRecord = {
  timestamp?: string | number;
  lat?: number;
  lon?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  battery?: number;
  signal_strength?: number;
  packet_id?: number;
  Ph?: number;
  Temp?: number;
  Conductivity?: number;
  Water_Flow?: number;
};

type WSMessage =
  | { type: 'telemetry'; data: TelemetryRecord }
  | { type: string; data?: unknown };

type Props = {
  wsUrl?: string;
};

export const RealtimeTelemetryPanel: React.FC<Props> = ({ wsUrl }) => {
  const resolvedWsUrl = useMemo(
    () => wsUrl || (import.meta.env.VITE_TELEMETRY_WS_URL as string | undefined) || 'ws://localhost:5174',
    [wsUrl]
  );

  const [latest, setLatest] = useState<TelemetryRecord | null>(null);
  const [status, setStatus] = useState<'CONNECTING' | 'LIVE' | 'OFFLINE'>('CONNECTING');

  useEffect(() => {
    const ws = new WebSocket(resolvedWsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => setStatus('LIVE');
    ws.onclose = () => setStatus('OFFLINE');
    ws.onerror = () => setStatus('OFFLINE');

    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let parsed: WSMessage | null = null;
      try {
        parsed = JSON.parse(ev.data) as WSMessage;
      } catch {
        return;
      }

      if (parsed && parsed.type === 'telemetry' && (parsed as any).data) {
        setLatest((parsed as any).data as TelemetryRecord);
      }
    };

    return () => {
      ws.close();
    };
  }, [resolvedWsUrl]);

  const fmtNum = (v: unknown) => {
    if (typeof v !== 'number') return v === undefined ? '--' : String(v);
    if (!Number.isFinite(v)) return '--';
    return v.toFixed(2);
  };

  const tsLabel = useMemo(() => {
    const v = latest?.timestamp;
    if (v === undefined || v === null || v === '') return '--:--:--';
    const ms = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(ms)) {
      const d = new Date(ms);
      if (!Number.isFinite(d.getTime())) return String(v);
      return d.toISOString().substring(11, 19);
    }
    return String(v);
  }, [latest]);

  return (
    <div className="panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span className="realtime-dot" data-status={status} />
        <h2>Realtime Telemetry</h2>
      </div>

      <div className="data-grid realtime-grid">
        <div className="data-item">
          <div className="data-label">Timestamp</div>
          <div className="data-value">{tsLabel}</div>
        </div>

        <div className="data-item">
          <div className="data-label">Water Flow</div>
          <div className="data-value">{fmtNum(latest?.Water_Flow)}</div>
        </div>

        <div className="data-item">
          <div className="data-label">pH</div>
          <div className="data-value">{fmtNum(latest?.Ph)}</div>
        </div>

        <div className="data-item">
          <div className="data-label">Conductivity</div>
          <div className="data-value">{fmtNum(latest?.Conductivity)}</div>
        </div>

        <div className="data-item">
          <div className="data-label">Temp</div>
          <div className="data-value">{fmtNum(latest?.Temp)}</div>
        </div>

        <div className="data-item">
          <div className="data-label">Packet</div>
          <div className="data-value">{latest?.packet_id ?? '--'}</div>
        </div>
      </div>
    </div>
  );
};

