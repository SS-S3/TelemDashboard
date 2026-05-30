import Papa from 'papaparse';
import type { TelemetryRecord, ImageTimestamp, MissionSummary, SyncedImage, DashboardData } from '../types';

function toMs(timestamp: string): number | null {
  const ms = new Date(timestamp).getTime();
  return Number.isFinite(ms) ? ms : null;
}

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
  const timestamp = Date.now();
  const [telemetryRes, imagesRes] = await Promise.all([
    fetch(`/telemetry.csv?t=${timestamp}`),
    fetch(`/image_timestamps.csv?t=${timestamp}`)
  ]);

  const telemetryCsv = await telemetryRes.text();
  const imagesCsv = await imagesRes.text();

  const parsedTelemetry = Papa.parse<any>(telemetryCsv, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const parsedImages = Papa.parse<any>(imagesCsv, { header: true, dynamicTyping: (field) => field !== 'Timestamp' && field !== 'ImageName', skipEmptyLines: true });

  const telemetry = parsedTelemetry.data
    .map((d): TelemetryRecord => ({
      Timestamp: String(d.timestamp || d.Timestamp || ''),
      Latitude: Number(d.lat || d.Latitude),
      Longitude: Number(d.lon || d.Longitude),
      Depth: Number(d.altitude !== undefined ? d.altitude : d.Depth),
      Speed: Number(d.speed || d.Speed),
      Battery: Number(d.battery || d.Battery),
      SignalStrength: Number(d.signal_strength || d.SignalStrength),
      Sequence: Number(d.packet_id || d.Sequence),
      CpuUsage: 30 + Math.random() * 20, // Mock CPU Usage
      MemoryUsage: 40 + Math.random() * 10, // Mock Memory Usage
      InternalTemp: 35 + Math.random() * 5, // Mock Temp
    }))
    .filter(d => Boolean(d.Timestamp && !isNaN(d.Latitude) && !isNaN(d.Longitude)));
    
  const images = parsedImages.data
    .map((d): ImageTimestamp => ({
      ImageName: String(d.image_name || d.ImageName || ''),
      Timestamp: String(d.timestamp || d.Timestamp || '')
    }))
    .filter(d => Boolean(d.ImageName && d.Timestamp));

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
  
  // Mission duration (HH:MM:SS) based on elapsed time from first telemetry timestamp.
  // Use millisecond math to avoid rounding quirks from date-fns helpers.
  // Guard against invalid timestamps to avoid NA:NA:NA.
  let duration = '00:00:00';
  if (telemetry.length > 1) {
    const startMs = toMs(telemetry[0].Timestamp);
    const endMs = toMs(telemetry[telemetry.length - 1].Timestamp);

    if (startMs !== null && endMs !== null && endMs >= startMs) {
      const durationSeconds = Math.floor((endMs - startMs) / 1000);
      duration = formatDuration(Math.max(0, durationSeconds));
    }
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
    const imgTime = toMs(img.Timestamp);

    // Find nearest telemetry record
    let nearestRecord = telemetry[0];
    let minDiff = Infinity;

    for (const record of telemetry) {
      const recordTime = toMs(record.Timestamp);
      if (imgTime === null || recordTime === null) continue;

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
