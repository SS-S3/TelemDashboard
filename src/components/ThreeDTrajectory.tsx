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

export const ThreeDTrajectory: React.FC<Props> = React.memo(({ telemetry, selectedIndex, onSelectPoint }) => {
  if (telemetry.length === 0) return null;

  const { x, y, z, colors } = useMemo(() => {
    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];
    const colors: string[] = [];

    telemetry.forEach((t, i) => {
      x.push(t.Longitude);
      y.push(t.Latitude);
      z.push(-t.Depth); // Depth is negative Z
      colors.push(i === selectedIndex ? '#ef4444' : '#06b6d4'); // Highlight selected
    });

    return { x, y, z, colors };
  }, [telemetry, selectedIndex]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1d24', borderRadius: '12px', overflow: 'hidden' }}>
      <Plot
        data={[
          {
            type: 'scatter3d',
            mode: 'lines+markers',
            x: x,
            y: y,
            z: z,
            line: {
              width: 4,
              color: '#06b6d4',
            },
            marker: {
              size: 4,
              color: colors,
            },
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
            bgcolor: '#1a1d24',
            camera: {
              projection: { type: 'perspective' }
            }
          },
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        onClick={(data: any) => {
          if (data.points && data.points.length > 0) {
            onSelectPoint(data.points[0].pointNumber);
          }
        }}
      />
    </div>
  );
});

ThreeDTrajectory.displayName = 'ThreeDTrajectory';
