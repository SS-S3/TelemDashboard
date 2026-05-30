import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TelemetryRecord } from '../types';

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

  return (
    <div className="map-panel">
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
  );
};
