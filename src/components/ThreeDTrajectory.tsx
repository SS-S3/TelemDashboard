import React, { useMemo } from 'react';
import ReactPlotly from 'react-plotly.js';
import type { TelemetryRecord } from '../types';

// Vite ESM workaround for react-plotly.js
const Plot = (ReactPlotly as any).default || ReactPlotly;

interface Props {
  telemetry: TelemetryRecord[];
  selectedIndex: number | null;
  onSelectPoint: (index: number) => void;
}

function computeDistanceKm(telemetry: TelemetryRecord[]): number[] {
  const km: number[] = [0];
  if (telemetry.length < 2) return km;

  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;

  for (let i = 1; i < telemetry.length; i++) {
    const lat1 = telemetry[i - 1].Latitude;
    const lon1 = telemetry[i - 1].Longitude;
    const lat2 = telemetry[i].Latitude;
    const lon2 = telemetry[i].Longitude;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    km.push(km[i - 1] + R * c);
  }

  return km;
}

export const ThreeDTrajectory: React.FC<Props> = React.memo(({ telemetry, selectedIndex, onSelectPoint }) => {
  if (telemetry.length === 0) return null;

  const { x3, y3, z3, colors3, depth, lat, lon } = useMemo(() => {
    const x3: number[] = [];
    const y3: number[] = [];
    const z3: number[] = [];
    const colors3: string[] = [];

    const depth: number[] = [];
    const lat: number[] = [];
    const lon: number[] = [];

    telemetry.forEach((t, i) => {
      x3.push(t.Longitude);
      y3.push(t.Latitude);
      z3.push(-t.Depth);

      depth.push(t.Depth);
      lat.push(t.Latitude);
      lon.push(t.Longitude);

      colors3.push(i === selectedIndex ? '#ef4444' : '#06b6d4');
    });

    const distKm = computeDistanceKm(telemetry);

    return { x3, y3, z3, colors3, depth, lat, lon, distKm };
  }, [telemetry, selectedIndex]);

  const markerColorAt = (idx: number) => (idx === selectedIndex ? '#ef4444' : '#06b6d4');
  const pointColors = telemetry.map((_, i) => markerColorAt(i));

  const onClickPointNumber = (evt: any) => {
    const idx = evt?.points?.[0]?.pointNumber;
    if (typeof idx === 'number') onSelectPoint(idx);
  };

  return (
    <div className="threeD-plot-wrap">
      {/* Top-left: 3D trajectory */}
      <div className="threeD-cell">
        <Plot
          className="plotly"
          data={[
            {
              type: 'scatter3d',
              mode: 'lines+markers',
              x: x3,
              y: y3,
              z: z3,
              line: { width: 4, color: '#06b6d4' },
              marker: { size: 4, color: colors3 },
              hoverinfo: 'none',
            },
          ]}
          layout={{
            autosize: true,
            margin: { l: 0, r: 0, b: 0, t: 0 },
            paper_bgcolor: 'transparent',
            dragmode: 'orbit',
            scene: {
              aspectmode: 'cube',
              xaxis: { title: { text: 'Longitude' }, color: '#94a3b8', gridcolor: '#333' },
              yaxis: { title: { text: 'Latitude' }, color: '#94a3b8', gridcolor: '#333' },
              zaxis: { title: { text: 'Depth' }, color: '#94a3b8', gridcolor: '#333' },
              bgcolor: 'transparent',
            },
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onClick={(evt: any) => {
            if (evt?.points?.length) onSelectPoint(evt.points[0].pointNumber);
          }}
        />
      </div>

      {/* Top-right: Depth vs Latitude */}
      <div className="threeD-cell">
        <Plot
          className="plotly"
          data={[
            {
              type: 'scatter',
              mode: 'lines+markers',
              x: lat,
              y: depth,
              marker: { size: 5, color: pointColors },
              line: { width: 2, color: '#06b6d4' },
              hoverinfo: 'none',
            },
          ]}
          layout={{
            autosize: true,
            margin: { l: 40, r: 10, b: 30, t: 20 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            xaxis: { title: { text: 'Latitude' }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
            yaxis: { title: { text: 'Depth' }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onClick={onClickPointNumber}
        />
      </div>

      {/* Bottom-left: Latitude vs Longitude */}
      <div className="threeD-cell">
        <Plot
          className="plotly"
          data={[
            {
              type: 'scatter',
              mode: 'lines+markers',
              x: lon,
              y: lat,
              marker: { size: 5, color: pointColors },
              line: { width: 2, color: '#06b6d4' },
              hoverinfo: 'none',
            },
          ]}
          layout={{
            autosize: true,
            margin: { l: 40, r: 10, b: 30, t: 20 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            xaxis: { title: { text: 'Longitude' }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
            yaxis: { title: { text: 'Latitude' }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onClick={onClickPointNumber}
        />
      </div>

      {/* Bottom-right: Depth vs Longitude */}
      <div className="threeD-cell">
        <Plot
          className="plotly"
          data={[
            {
              type: 'scatter',
              mode: 'lines+markers',
              x: lon,
              y: depth,
              marker: { size: 5, color: pointColors },
              line: { width: 2, color: '#06b6d4' },
              hoverinfo: 'none',
            },
          ]}
          layout={{
            autosize: true,
            margin: { l: 40, r: 10, b: 30, t: 20 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            xaxis: { title: { text: 'Longitude' }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
            yaxis: { title: { text: 'Depth' }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onClick={onClickPointNumber}
        />
      </div>
    </div>
  );
});

ThreeDTrajectory.displayName = 'ThreeDTrajectory';

