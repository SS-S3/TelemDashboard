import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TelemetryRecord } from '../types';
import ReactPlotly from 'react-plotly.js';

const Plot = (ReactPlotly as any).default || ReactPlotly;


// Fix leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  telemetry: TelemetryRecord[];
  selectedIndex: number | null;
  onSelectPoint: (index: number) => void;
}

// Component to recenter map when selection changes
const MapController: React.FC<{ telemetry: TelemetryRecord[]; selectedIndex: number | null }> = ({ telemetry, selectedIndex }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedIndex !== null && telemetry[selectedIndex]) {
      const point = telemetry[selectedIndex];
      map.panTo([point.Latitude, point.Longitude]);
    } else if (telemetry.length > 0) {
      const bounds = L.latLngBounds(telemetry.map(p => [p.Latitude, p.Longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [selectedIndex, telemetry, map]);
  return null;
};

export const MapPanel: React.FC<Props> = ({ telemetry, selectedIndex, onSelectPoint }) => {
  if (telemetry.length === 0) return null;

  const positions: [number, number][] = telemetry.map(t => [t.Latitude, t.Longitude]);
  const startPoint = telemetry[0];
  const endPoint = telemetry[telemetry.length - 1];
  const currentPoint = selectedIndex !== null ? telemetry[selectedIndex] : null;

  const handleLineClick = (e: any) => {
    // Find closest point on line
    const clickedLat = e.latlng.lat;
    const clickedLng = e.latlng.lng;
    
    let minDistance = Infinity;
    let closestIndex = -1;
    
    for (let i = 0; i < telemetry.length; i++) {
      const dist = Math.pow(telemetry[i].Latitude - clickedLat, 2) + Math.pow(telemetry[i].Longitude - clickedLng, 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    
    if (closestIndex !== -1) {
      onSelectPoint(closestIndex);
    }
  };

  const distancesKm = useMemo(() => {
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
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      km.push(km[i - 1] + R * c);
    }
    return km;
  }, [telemetry]);

  const depthVsDistance = useMemo(() => {
    return telemetry.map((t) => t.Depth);
  }, [telemetry]);

  return (
    <div className="map-panel" style={{ height: '100%', width: '100%', display: 'grid', gridTemplateRows: '1fr 1fr' }}>
      <div style={{ height: '100%', width: '100%' }}>
        <MapContainer 
          center={[startPoint.Latitude, startPoint.Longitude]} 
          zoom={13} 
          style={{ height: '100%', width: '100%', zIndex: 1 }}
        >

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <Polyline 
          positions={positions} 
          pathOptions={{ color: 'var(--accent-cyan)', weight: 3, opacity: 0.8 }} 
          eventHandlers={{
            click: handleLineClick
          }}
        />

        <Marker position={[startPoint.Latitude, startPoint.Longitude]}>
          <Popup>Start Position</Popup>
        </Marker>

        {endPoint && startPoint !== endPoint && (
          <Marker position={[endPoint.Latitude, endPoint.Longitude]}>
            <Popup>End Position</Popup>
          </Marker>
        )}

        {currentPoint && (
          <Marker position={[currentPoint.Latitude, currentPoint.Longitude]}>
            <Popup>
              Current Selection<br/>
              Lat: {currentPoint.Latitude.toFixed(4)}<br/>
              Lon: {currentPoint.Longitude.toFixed(4)}
            </Popup>
          </Marker>
        )}

        <MapController telemetry={telemetry} selectedIndex={selectedIndex} />
        </MapContainer>
      </div>

      <div style={{ height: '100%', width: '100%' }}>
        <Plot
          className="plotly"
          data={[
            {
              type: 'scatter',
              mode: 'lines+markers',
              x: distancesKm,
              y: depthVsDistance,
              marker: {
                size: telemetry.map((_, i) => (i === selectedIndex ? 7 : 4)),
                color: telemetry.map((_, i) => (i === selectedIndex ? '#ef4444' : '#06b6d4')),
              },
              line: { width: 2, color: '#06b6d4' },
              hoverinfo: 'none',
            },
          ]}
          layout={{
            autosize: true,
            margin: { l: 50, r: 10, b: 30, t: 30 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            title: { text: 'Depth vs Distance Along Path', font: { color: '#94a3b8' } },
            xaxis: { title: { text: 'Distance (km)' }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
            yaxis: { title: { text: 'Depth' }, tickfont: { color: '#94a3b8' }, gridcolor: '#333' },
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onClick={(evt: any) => {
            const idx = evt?.points?.[0]?.pointNumber;
            if (typeof idx === 'number') onSelectPoint(idx);
          }}
        />
      </div>
    </div>
  );
};

