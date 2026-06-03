import dgram from 'node:dgram';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const CAM_COUNT = 2;
const UDP_PORTS = [
  Number(process.env.CAM0_UDP_PORT || 5000),
  Number(process.env.CAM1_UDP_PORT || 5001)
];

const HTTP_PORT = Number(process.env.PORT || 5174);

// Chunking parameters
// Header format (big-endian):
// magic(4) | streamId(1) | frameId(4) | chunkIndex(2) | chunkCount(2) | payloadLen(4)
// Total header size: 4+1+4+2+2+4 = 17 bytes
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
    // key: `${streamId}:${frameId}`
    this.frames = new Map();
    this.latestFrame = new Array(CAM_COUNT).fill(null); // Buffer|null
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

    // If chunkCount differs, reset (out-of-sync sender)
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
        if (!c) return; // should not happen
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
      if (now - state.createdAt > timeoutMs) {
        this.frames.delete(key);
      }
    }
  }
}

const assembler = new FrameAssembler();

// HTTP server (serves latest frames)
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

function sendFrames(ws) {
  for (let cam = 0; cam < CAM_COUNT; cam++) {
    const frame = assembler.latestFrame[cam];
    if (!frame) continue;

    // Send as binary frame: JSON header + jpeg bytes.
    // Simpler: send two messages: {cam, frameId} then jpeg bytes.
    ws.send(JSON.stringify({ type: 'frame', cam, frameId: assembler.latestFrameId[cam] }));
    ws.send(frame);
  }
}

wss.on('connection', (ws) => {
  // Send latest immediately
  sendFrames(ws);
});

const udpSockets = UDP_PORTS.map((port) => {
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
      // Push to all WS clients.
      // Broadcast meta then jpeg buffer.
      const meta = JSON.stringify({ type: 'frame', cam: streamId, frameId });
      for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
          client.send(meta);
          client.send(assembled);
        }
      }
    }
  });

  sock.on('error', (err) => {
    console.error(`UDP socket error on port ${port}:`, err);
  });

  sock.bind(port, '0.0.0.0', () => {
    console.log(`Listening for cam${UDP_PORTS.indexOf(port)} UDP on :${port}`);
  });

  return sock;
});

setInterval(() => assembler.gc(1500), 300);

server.listen(HTTP_PORT, () => {
  console.log(`HTTP/WebSocket server listening on :${HTTP_PORT}`);
  console.log('Endpoints:');
  console.log('  GET /latest.jpg?cam=0');
  console.log('  GET /latest.jpg?cam=1');
  console.log('  WS: connect and receive {type:"frame",cam,frameId} then JPEG binary');
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  for (const s of udpSockets) s.close();
  wss.close();
  server.close(() => process.exit(0));
});

