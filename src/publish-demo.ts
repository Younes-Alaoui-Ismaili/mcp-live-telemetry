import { randomUUID } from 'node:crypto';
import { Simulator } from './simulator/store.js';
import { DEVICES, tempThreshold, vibThreshold } from './constants.js';
import { ApiTelemetrySource } from './api-source.js';

async function main() {
  const base = process.env.TELEMETRY_API_URL ?? 'http://127.0.0.1:4100';
  const token = process.env.TELEMETRY_API_TOKEN ?? '';
  const source = new ApiTelemetrySource(base, token);
  const post = async (path: string, data: unknown) => {
    const response = await fetch(source.base + '/api/v1' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!response.ok) throw new Error('Publisher request refused: HTTP ' + response.status);
    return response.json();
  };
  for (const device of DEVICES) await post('/devices', { id: device.id, name: device.name, temperature_limit: tempThreshold(device), vibration_limit: vibThreshold(device) });
  const simulator = new Simulator();
  const run = randomUUID();
  let accepted = 0;
  for (let tick = 0; tick < 20; tick++) {
    if (tick === 5) simulator.simulateFault('press-01', 'combined', 9000);
    const events = simulator.listDevices().map(({ device, reading }) => ({ event_id: run + '-' + device.id + '-' + tick, device_id: device.id, timestamp: reading.timestamp, temperature_c: reading.temperatureC, vibration_mm_s: reading.vibrationMmS, state: reading.state, provenance: 'simulated' }));
    await post('/telemetry', { events });
    accepted += events.length;
    if (tick < 19) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log(JSON.stringify({ run, accepted, ticks: 20, provenance: 'simulated', source: 'finite local simulator scenario' }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Publisher failed'); process.exitCode = 1; });
