import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import test from 'node:test';
import {
  createClamdFixtureServer,
  INFECTED_MARKER,
  scanWithClamdFixture,
} from './clamd-fixture.mjs';

async function withFixture(run) {
  const fixture = createClamdFixtureServer();
  const address = await fixture.listen();
  try {
    await run(address.port);
  } finally {
    await fixture.close();
  }
}

test('returns a clean result for ordinary bytes', async () => {
  await withFixture(async (port) => {
    const result = await scanWithClamdFixture({
      port,
      frames: [Buffer.from('synthetic clean document')],
    });
    assert.equal(result, 'stream: OK\0');
  });
});

test('returns FOUND only when the synthetic marker appears across framed chunks', async () => {
  await withFixture(async (port) => {
    const split = Math.floor(INFECTED_MARKER.length / 2);
    const result = await scanWithClamdFixture({
      port,
      frames: [
        Buffer.from('prefix'),
        INFECTED_MARKER.subarray(0, split),
        INFECTED_MARKER.subarray(split),
        Buffer.from('suffix'),
      ],
    });
    assert.equal(result, 'stream: Ledgerly-E2E-Test-Signature FOUND\0');
  });
});

test('answers UNKNOWN COMMAND to requests outside the adapter stream protocol', async () => {
  await withFixture(async (port) => {
    const response = await new Promise((resolve, reject) => {
      const socket = createConnection({ host: '127.0.0.1', port });
      const chunks = [];
      socket.once('error', reject);
      socket.on('data', (chunk) => chunks.push(chunk));
      socket.once('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      socket.once('connect', () => socket.end('PING\0'));
    });
    assert.equal(response, 'UNKNOWN COMMAND\0');
  });
});
