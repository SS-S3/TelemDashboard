import dgram from 'node:dgram';
import http from 'node:http';
import { WebSocketServer } from 'ws';

// UDP ports
const CAM_COUNT = 2;
const CAM_UDP_PORTS = [
  Number(process.env.CAM0_UDP_PORT || 5000),
  Number(process.env.CAM1_UDP_PORT || 5001)
];
const TELEMETRY_UDP_PORT = Number(process.env.TELEMETRY_UDP_PORT || 6001);

// WS/HTTP base port
const HTTP_PORT = Number(process.env.PORT || 5174);

// ---- Camera MJPEG assembler (same as existing udpFrameServer.js) ----
const HEADER_SIZE = 17;
const MAGIC = 0x55445031; // 'UDP1'

function readHeader(buf) {
  const magic = buf.readUInt32BE(0);
  if (magic !== MAGIC) return null;

  const streamId = buf.readUInt8(4);
  if (streamId < 0 || streamId >= CAM_COUNT) return null;

  const frameId = buf.readUInt32BE(5);
  const chunkIndex = buf.readUInt16BE(9);
  const chunkCount = buf.readUInt16BE(11);
  const payloadLen = buf.readUInt32BE(13);

  return { streamId, frameId, chunkIndex, chunkCount, payloadLen };
}

class FrameAssembler {
  constructor() {
    this.frames = new Map();
    this.latestFrame = new Array(CAM_COUNT).fill(null);
    this.latestFrameId = new Array(CAM_COUNT).fill(0);
  }

  pushChunk(streamId, frameId, chunkIndex, chunkCount, payload) {
    const key = `${streamId}:${frameId}`;
    let state = this.frames.get(key);
    if (!state) {
      state = {
        chunkCount,
        received: new Array(chunkCount).fill(false),
        chunks: new Array(chunkCount).fill(null),
        receivedCount: 0,
        createdAt: Date.now()
      };
      this.frames.set(key, state);
    }

    if (state.chunkCount !== chunkCount) {
      state = {
        chunkCount,
        received: new Array(chunkCount).fill(false),
        chunks: new Array(chunkCount).fill(null),
        receivedCount: 0,
        createdAt: Date.now()
      };
      this.frames.set(key, state);
    }

    if (chunkIndex >= chunkCount) return;
    if (state.received[chunkIndex]) return;

    state.received[chunkIndex] = true;
    state.chunks[chunkIndex] = payload;
    state.receivedCount++;

    if (state.receivedCount === chunkCount) {
      const totalLen = state.chunks.reduce((acc, c) => acc + (c ? c.length : 0), 0);
      const out = Buffer.allocUnsafe(totalLen);
      let offset = 0;
      for (let i = 0; i < chunkCount; i++) {
        const c = state.chunks[i];
        if (!c) return;
        c.copy(out, offset);
        offset += c.length;
      }

      this.latestFrame[streamId] = out;
      this.latestFrameId[streamId] = frameId;
      this.frames.delete(key);
      return out;
    }
  }

  gc(timeoutMs = 1500) {
    const now = Date.now();
    for (const [key, state] of this.frames.entries()) {
      if (now - state.createdAt > timeoutMs) this.frames.delete(key);
    }
  }
}

const assembler = new FrameAssembler();

// ---- Telemetry live model (from Pi UDP) ----
// Packet is assumed CSV (space/tab separated not guaranteed), so we parse as tab OR comma OR whitespace.
// You can adjust TELEMETRY_DELIM via env.
const TELEMETRY_DELIM = process.env.TELEMETRY_DELIM || 'auto'; // 'auto' tries tab, comma, then whitespace

// Keys expected (from your message)
const TELEMETRY_FIELDS = [
  'timestamp',
  'lat',
  'lon',
  'altitude',
  'speed',
  'heading',
  'battery',
  'signal_strength',
  'packet_id',
  'Ph',
  'Temp',
  'Conductivity',
  'Water_Flow'
];

const liveTelemetry = {
  // keep last record
  latest: null
};

function parseTelemetryPayload(msg) {
  const text = msg.toString('utf8').trim();
  if (!text) return null;

  // Try JSON first
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  // CSV/TSV
  const trySplit = (delim) => {
    const parts = text.split(delim).map((s) => s.trim()).filter((s) => s.length > 0 || parts.length === TELEMETRY_FIELDS.length);
    return parts;
  };

  let parts = null;
  if (TELEMETRY_DELIM !== 'auto') {
    parts = trySplit(TELEMETRY_DELIM);
  } else {
    // Prefer tabs then commas then whitespace
    parts = text.includes('\t') ? trySplit('\t') : null;
    if (!parts || parts.length !== TELEMETRY_FIELDS.length) parts = text.includes(',') ? trySplit(',') : null;
    if (!parts || parts.length !== TELEMETRY_FIELDS.length) parts = text.split(/\s+/).filter(Boolean);
  }

  if (!parts || parts.length < TELEMETRY_FIELDS.length) return null;

  const obj = {};
  for (let i = 0; i < TELEMETRY_FIELDS.length; i++) {
    const key = TELEMETRY_FIELDS[i];
    obj[key] = parts[i];
  }

  // Normalize numbers/timestamp
  const ts = obj.timestamp;
  // if timestamp is numeric ms
  const ms = Number(ts);
  obj.timestamp = Number.isFinite(ms) ? String(ms) : String(ts);

  for (const k of TELEMETRY_FIELDS) {
    if (k === 'timestamp') continue;
    const n = Number(obj[k]);
    if (Number.isFinite(n)) obj[k] = n;
  }

  return obj;
}

// ---- HTTP server: expose latest camera frames (optional) ----
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/latest.jpg') {
    const cam = Number(url.searchParams.get('cam') || '0');
    if (cam < 0 || cam >= CAM_COUNT) {
      res.statusCode = 400;
      res.end('invalid cam');
      return;
    }

    const frame = assembler.latestFrame[cam];
    if (!frame) {
      res.statusCode = 404;
      res.end('no frame yet');
      return;
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(frame);
    return;
  }

  res.statusCode = 404;
  res.end('not found');
});

const wss = new WebSocketServer({ server });

function broadcastTelemetry() {
  if (!liveTelemetry.latest) return;
  const payload = JSON.stringify({
    type: 'telemetry',
    data: liveTelemetry.latest
  });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(payload);
  }
}

function broadcastFrame(cam) {
  const frame = assembler.latestFrame[cam];
  if (!frame) return;
  const meta = JSON.stringify({ type: 'frame', cam, frameId: assembler.latestFrameId[cam] });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(meta);
      client.send(frame);
    }
  }
}

wss.on('connection', (ws) => {
  // send latest camera frames (if any)
  for (let cam = 0; cam < CAM_COUNT; cam++) broadcastFrame(cam);
  // send latest telemetry
  if (liveTelemetry.latest) {
    ws.send(JSON.stringify({ type: 'telemetry', data: liveTelemetry.latest }));
  }
});

// ---- UDP camera sockets ----
const udpCameraSockets = CAM_UDP_PORTS.map((port, camIndex) => {
  const sock = dgram.createSocket('udp4');
  sock.on('message', (msg) => {
    if (!msg || msg.length < HEADER_SIZE) return;
    const header = readHeader(msg);
    if (!header) return;

    const { streamId, frameId, chunkIndex, chunkCount } = header;
    const payloadStart = HEADER_SIZE;
    const payloadEnd = payloadStart + header.payloadLen;
    if (payloadEnd > msg.length) return;

    const payload = msg.subarray(payloadStart, payloadEnd);
    const assembled = assembler.pushChunk(streamId, frameId, chunkIndex, chunkCount, payload);
    if (assembled) {
      // broadcast assembled frame
      broadcastFrame(streamId);
    }
  });

  sock.on('error', (err) => {
    console.error(`UDP camera socket error on :${port}:`, err);
  });

  sock.bind(port, '0.0.0.0', () => {
    console.log(`Listening for cam${camIndex} UDP on :${port}`);
  });

  return sock;
});

// ---- UDP telemetry socket ----
const telemetrySock = dgram.createSocket('udp4');
telemetrySock.on('message', (msg) => {
  const parsed = parseTelemetryPayload(msg);
  if (!parsed) return;
  liveTelemetry.latest = parsed;
  broadcastTelemetry();
});
telemetrySock.on('error', (err) => {
  console.error(`UDP telemetry socket error on :${TELEMETRY_UDP_PORT}:`, err);
});
telemetrySock.bind(TELEMETRY_UDP_PORT, '0.0.0.0', () => {
  console.log(`Listening for LIVE telemetry UDP on :${TELEMETRY_UDP_PORT}`);
});

setInterval(() => assembler.gc(1500), 300);

server.listen(HTTP_PORT, () => {
  console.log(`HTTP/WebSocket server listening on :${HTTP_PORT}`);
  console.log('Endpoints:');
  console.log('  GET /latest.jpg?cam=0');
  console.log('  GET /latest.jpg?cam=1');
  console.log('  WS messages: {type:"frame"...} + binary JPEG, and {type:"telemetry"...} JSON');
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  for (const s of udpCameraSockets) s.close();
  telemetrySock.close();
  wss.close();
  server.close(() => process.exit(0));
});

