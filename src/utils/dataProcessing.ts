import Papa from 'papaparse';
import { differenceInSeconds, parseISO } from 'date-fns';
import { TelemetryRecord, ImageTimestamp, MissionSummary, SyncedImage, DashboardData } from '../types';

// Haversine formula to calculate distance between two lat/lon points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export async function fetchAndProcessData(): Promise<DashboardData> {
  const [telemetryRes, imagesRes] = await Promise.all([
    fetch('/telemetry.csv'),
    fetch('/image_timestamps.csv')
  ]);

  const telemetryCsv = await telemetryRes.text();
  const imagesCsv = await imagesRes.text();

  const parsedTelemetry = Papa.parse<TelemetryRecord>(telemetryCsv, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const parsedImages = Papa.parse<ImageTimestamp>(imagesCsv, { header: true, dynamicTyping: true, skipEmptyLines: true });

  const telemetry = parsedTelemetry.data.filter(d => d.Timestamp && d.Latitude && d.Longitude);
  const images = parsedImages.data.filter(d => d.ImageName && d.Timestamp);

  // 1. Calculate Mission Summary
  let totalDistance = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  
  for (let i = 0; i < telemetry.length; i++) {
    const record = telemetry[i];
    if (record.Speed > maxSpeed) maxSpeed = record.Speed;
    totalSpeed += record.Speed || 0;

    if (i > 0) {
      const prev = telemetry[i - 1];
      totalDistance += calculateDistance(prev.Latitude, prev.Longitude, record.Latitude, record.Longitude);
    }
  }

  const averageSpeed = telemetry.length > 0 ? totalSpeed / telemetry.length : 0;
  
  let duration = '00:00:00';
  if (telemetry.length > 1) {
    const start = parseISO(telemetry[0].Timestamp);
    const end = parseISO(telemetry[telemetry.length - 1].Timestamp);
    const diffSeconds = differenceInSeconds(end, start);
    duration = formatDuration(diffSeconds);
  }

  // Calculate packet loss based on Sequence numbers (if available) or simply assume 1Hz and count missing seconds
  let packetsReceived = telemetry.length;
  let packetsMissing = 0;
  if (telemetry.length > 0 && telemetry[0].Sequence !== undefined) {
    const firstSeq = telemetry[0].Sequence;
    const lastSeq = telemetry[telemetry.length - 1].Sequence;
    const expectedPackets = lastSeq - firstSeq + 1;
    packetsMissing = expectedPackets - packetsReceived;
  }
  
  const packetLoss = packetsReceived > 0 ? (packetsMissing / (packetsReceived + packetsMissing)) * 100 : 0;
  let communicationStatus: 'GOOD' | 'WARNING' | 'POOR' = 'GOOD';
  if (packetLoss > 10) communicationStatus = 'POOR';
  else if (packetLoss > 2) communicationStatus = 'WARNING';

  const summary: MissionSummary = {
    duration,
    totalDistance,
    averageSpeed,
    maxSpeed,
    packetsReceived,
    packetsMissing,
    packetLoss,
    communicationStatus
  };

  // 2. Synchronize Images with Telemetry
  const syncedImages: SyncedImage[] = images.map(img => {
    const imgTime = parseISO(img.Timestamp).getTime();
    
    // Find nearest telemetry record
    let nearestRecord = telemetry[0];
    let minDiff = Infinity;
    
    for (const record of telemetry) {
      const recordTime = parseISO(record.Timestamp).getTime();
      const diff = Math.abs(recordTime - imgTime);
      if (diff < minDiff) {
        minDiff = diff;
        nearestRecord = record;
      }
    }

    return {
      ImageName: img.ImageName,
      ImageTimestamp: img.Timestamp,
      telemetry: nearestRecord
    };
  });

  return {
    telemetry,
    images,
    summary,
    syncedImages
  };
}
