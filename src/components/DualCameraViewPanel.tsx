import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import type { SyncedImage } from '../types';

type Props = {
  syncedImage0?: SyncedImage | null;
  syncedImage1?: SyncedImage | null;
  wsUrl?: string; // optional override
};

type FrameMeta = {
  type: 'frame';
  cam: 0 | 1;
  frameId: number;
};

export const DualCameraViewPanel: React.FC<Props> = ({ syncedImage0, syncedImage1, wsUrl }) => {
  const resolvedWsUrl = useMemo(
    () => wsUrl || (import.meta.env.VITE_CAMERA_WS_URL as string | undefined) || 'ws://localhost:5174',
    [wsUrl]
  );

  const [frameUrl0, setFrameUrl0] = useState<string>('');
  const [frameUrl1, setFrameUrl1] = useState<string>('');
  const latestIdsRef = useRef<{ 0: number; 1: number }>({ 0: 0, 1: 0 });
  const blobUrlsRef = useRef<{ 0?: string; 1?: string }>({});

  useEffect(() => {
    const ws = new WebSocket(resolvedWsUrl);
    ws.binaryType = 'arraybuffer';

    let pendingMeta: FrameMeta | null = null;

    const onMessage = (ev: MessageEvent) => {
      if (typeof ev.data === 'string') {
        try {
          const parsed = JSON.parse(ev.data) as FrameMeta;
          if (parsed?.type === 'frame' && (parsed.cam === 0 || parsed.cam === 1)) {
            pendingMeta = parsed;
          }
        } catch {
          // ignore
        }
        return;
      }

      if (!pendingMeta) return;

      const cam = pendingMeta.cam;
      const frameId = pendingMeta.frameId;

      if (frameId <= latestIdsRef.current[cam]) {
        pendingMeta = null;
        return;
      }

      latestIdsRef.current[cam] = frameId;

      const buf = new Uint8Array(ev.data as ArrayBuffer);
      const blob = new Blob([buf], { type: 'image/jpeg' });
      const newUrl = URL.createObjectURL(blob);

      if (cam === 0) {
        if (blobUrlsRef.current[0]) URL.revokeObjectURL(blobUrlsRef.current[0]!);
        blobUrlsRef.current[0] = newUrl;
        setFrameUrl0(newUrl);
      } else {
        if (blobUrlsRef.current[1]) URL.revokeObjectURL(blobUrlsRef.current[1]!);
        blobUrlsRef.current[1] = newUrl;
        setFrameUrl1(newUrl);
      }

      pendingMeta = null;
    };

    ws.addEventListener('message', onMessage);

    return () => {
      ws.removeEventListener('message', onMessage);
      ws.close();
      for (const cam of [0, 1] as const) {
        if (blobUrlsRef.current[cam]) URL.revokeObjectURL(blobUrlsRef.current[cam]!);
      }
    };
  }, [resolvedWsUrl]);

  const overlayFor = (synced: SyncedImage | null | undefined) => {
    if (!synced) return null;
    const label = synced.ImageName;
    const tsMs = new Date(synced.ImageTimestamp).getTime();
    const ts = Number.isFinite(tsMs) ? new Date(tsMs).toISOString().substring(11, 19) : synced.ImageTimestamp;
    return { label, ts };
  };

  const o0 = overlayFor(syncedImage0);
  const o1 = overlayFor(syncedImage1);

  return (
    <div className="panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <Camera size={20} className="text-cyan" />
        <h2>Dual Camera</h2>
      </div>

      <div className="dual-camera-grid">
        <div className="camera-container dual">
          {frameUrl0 ? (
            <img src={frameUrl0} alt="Camera 0" className="camera-image" />
          ) : (
            <div className="camera-placeholder">Waiting for cam0…</div>
          )}
          <div className="camera-overlay">
            <span>{o0?.label ?? 'cam0'}</span>
            <span>{o0?.ts ?? '--:--:--'}</span>
          </div>
        </div>

        <div className="camera-container dual">
          {frameUrl1 ? (
            <img src={frameUrl1} alt="Camera 1" className="camera-image" />
          ) : (
            <div className="camera-placeholder">Waiting for cam1…</div>
          )}
          <div className="camera-overlay">
            <span>{o1?.label ?? 'cam1'}</span>
            <span>{o1?.ts ?? '--:--:--'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

