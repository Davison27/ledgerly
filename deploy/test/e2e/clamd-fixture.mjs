import { createConnection, createServer } from 'node:net';

export const INFECTED_MARKER = Buffer.from('LEDGERLY_E2E_INFECTED_MARKER');
export const CLAMD_FIXTURE_PORT = 3310;
const command = Buffer.from('zINSTREAM\0');
const maxFrameSize = 1024 * 1024;
const maxScanSize = 8 * 1024 * 1024;

function responseFor(chunks) {
  return Buffer.concat(chunks).includes(INFECTED_MARKER)
    ? 'stream: Ledgerly-E2E-Test-Signature FOUND\0'
    : 'stream: OK\0';
}

function handleScan(socket) {
  let pending = Buffer.alloc(0);
  let commandReceived = false;
  let receivedBytes = 0;
  const chunks = [];

  socket.on('data', (data) => {
    pending = Buffer.concat([pending, data]);
    if (!commandReceived) {
      const prefixLength = Math.min(pending.length, command.length);
      if (!pending.subarray(0, prefixLength).equals(command.subarray(0, prefixLength))) {
        socket.end('UNKNOWN COMMAND\0');
        return;
      }
      if (pending.length < command.length) return;
      pending = pending.subarray(command.length);
      commandReceived = true;
    }

    while (pending.length >= 4) {
      const frameLength = pending.readUInt32BE(0);
      if (frameLength > maxFrameSize) {
        socket.end('INSTREAM size limit exceeded. ERROR\0');
        return;
      }
      if (pending.length < frameLength + 4) return;
      pending = pending.subarray(4);
      if (frameLength === 0) {
        socket.end(responseFor(chunks));
        return;
      }
      receivedBytes += frameLength;
      if (receivedBytes > maxScanSize) {
        socket.end('INSTREAM size limit exceeded. ERROR\0');
        return;
      }
      chunks.push(pending.subarray(0, frameLength));
      pending = pending.subarray(frameLength);
    }
  });
}

export function createClamdFixtureServer(options = {}) {
  const server = createServer(handleScan);
  return {
    server,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(options.port ?? 0, options.host ?? '127.0.0.1', resolve);
      });
      return server.address();
    },
    async close() {
      if (!server.listening) return;
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

export function scanWithClamdFixture({ host = '127.0.0.1', port, frames = [], timeoutMs = 1000 }) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    const response = [];
    const timeout = setTimeout(
      () => socket.destroy(new Error('ClamAV fixture timed out.')),
      timeoutMs,
    );
    socket.on('data', (chunk) => response.push(chunk));
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.once('end', () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(response).toString('utf8'));
    });
    socket.once('connect', () => {
      socket.write(command);
      for (const frame of frames) {
        const length = Buffer.allocUnsafe(4);
        length.writeUInt32BE(frame.length);
        socket.write(length);
        socket.write(frame);
      }
      socket.end(Buffer.alloc(4));
    });
  });
}

async function runHealthcheck() {
  const result = await scanWithClamdFixture({
    host: '127.0.0.1',
    port: CLAMD_FIXTURE_PORT,
  });
  if (result !== 'stream: OK\0') process.exitCode = 1;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (process.argv[2] === '--healthcheck') {
    runHealthcheck().catch(() => {
      process.exitCode = 1;
    });
  } else {
    createServer(handleScan).listen(CLAMD_FIXTURE_PORT, '0.0.0.0');
  }
}
