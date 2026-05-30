export interface TelemetryRecord {
  Timestamp: string;
  Latitude: number;
  Longitude: number;
  Depth: number;
  Speed: number;
  Battery: number;
  SignalStrength: number;
  Sequence: number;
  CpuUsage?: number;
  MemoryUsage?: number;
  InternalTemp?: number;
}

export interface ImageTimestamp {
  ImageName: string;
  Timestamp: string;
}

export interface MissionSummary {
  duration: string; // HH:MM:SS
  totalDistance: number; // km
  averageSpeed: number; // m/s
  maxSpeed: number; // m/s
  packetsReceived: number;
  packetsMissing: number;
  packetLoss: number; // %
  communicationStatus: 'GOOD' | 'WARNING' | 'POOR';
}

export interface SyncedImage {
  ImageName: string;
  ImageTimestamp: string;
  telemetry: TelemetryRecord;
}

export interface DashboardData {
  telemetry: TelemetryRecord[];
  images: ImageTimestamp[];
  summary: MissionSummary;
  syncedImages: SyncedImage[];
}
