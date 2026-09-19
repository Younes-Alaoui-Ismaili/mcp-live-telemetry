import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const url = process.env.TELEMETRY_API_URL ?? 'http://127.0.0.1:4100';
const token = process.env.TELEMETRY_API_TOKEN;
if (!token) throw new Error('Reader TELEMETRY_API_TOKEN required');
const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/index.js'], env: { TELEMETRY_SOURCE: 'cloud', TELEMETRY_API_URL: url, TELEMETRY_API_TOKEN: token } });
const client = new Client({ name: 'api-proof', version: '1.0.0' });
try {
  await client.connect(transport);
  const names = (await client.listTools()).tools.map(tool => tool.name).sort();
  assert.deepEqual(names, ['get_anomalies', 'get_telemetry', 'list_devices', 'simulate_fault']);
  const read = async (name, args) => {
    const result = await client.callTool({ name, arguments: { ...args, response_format: 'json' } });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    return result.structuredContent ?? JSON.parse(result.content[0].text);
  };
  const devices = await read('list_devices', {});
  assert.ok(devices.count > 0, 'Publish the finite demo first');
  const device = devices.devices.find(row => row.id === 'press-01') ?? devices.devices[0];
  const window = { device_id: device.id, start: device.timestamp - 60000, end: device.timestamp, step_ms: 1000 };
  const telemetry = await read('get_telemetry', window);
  const anomalies = await read('get_anomalies', window);
  assert.ok(telemetry.count > 0);
  assert.ok(anomalies.count > 0);
  const fault = await client.callTool({ name: 'simulate_fault', arguments: { device_id: device.id, fault_type: 'overheat', duration_seconds: 10 } });
  assert.equal(fault.isError, true, 'API source must reject fault injection');
  const data = { devices, telemetry, anomalies };
  const digest = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const proof = { at: new Date().toISOString(), transport: 'real MCP stdio subprocess to authenticated API', provenance: 'simulated measurements persisted in SQL', faultRejected: true, digest, data };
  await mkdir('evidence', { recursive: true });
  const path = 'evidence/api-' + proof.at.replace(/[:.]/g, '-') + '.json';
  await writeFile(path, JSON.stringify(proof, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ path, digest, devices: devices.count, readings: telemetry.count, anomalies: anomalies.count, faultRejected: true }));
} finally { await client.close(); }
