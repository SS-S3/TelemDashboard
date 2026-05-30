import React, { useMemo } from 'react';
import ReactPlotly from 'react-plotly.js';
const Plot = (ReactPlotly as any).default || ReactPlotly;


type Series = {
  x: number[];
  y: number[];
  markerColors?: string[];
  mode?: string;
  name?: string;
};

interface Props {
  title?: string;
  xAxisTitle: string;
  yAxisTitle: string;
  series: Series;
  onClickPointNumber?: (pointNumber: number) => void;
}

export const Plot2D: React.FC<Props> = ({ title, xAxisTitle, yAxisTitle, series, onClickPointNumber }) => {
  const { x, y, markerColors } = series;

  const data = useMemo(() => {
    return [
      {
        type: 'scatter',
        mode: series.mode ?? 'lines+markers',
        x,
        y,
        name: series.name,
        marker: markerColors
          ? {
              size: 5,
              color: markerColors,
            }
          : {
              size: 4,
              color: '#06b6d4',
            },
        line: {
          width: 2,
          color: '#06b6d4',
        },
        hoverinfo: 'none',
      },
    ];
  }, [x, y, markerColors, series.mode, series.name]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1d24' }}>
      <Plot
        className="plotly"
        data={data}
        layout={{
          autosize: true,
          margin: { l: 40, r: 10, b: 30, t: title ? 30 : 0 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          title: title ? { text: title, font: { color: '#94a3b8' } } : undefined,
          xaxis: { title: { text: xAxisTitle, font: { color: '#94a3b8' } }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
          yaxis: { title: { text: yAxisTitle, font: { color: '#94a3b8' } }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        onClick={(evt: any) => {
          const pointNumber = evt?.points?.[0]?.pointNumber;
          if (typeof pointNumber === 'number' && onClickPointNumber) onClickPointNumber(pointNumber);
        }}
      />
    </div>
  );
};

