import { randomUUID } from 'node:crypto';
import { Simulator } from './simulator/store.js';
import { DEVICES, tempThreshold, vibThreshold } from './constants.js';
import type { FaultType } from './types.js';

interface Profile { name: string; ticks: number; faultTick: number; faultDurationMs: number; faultType: FaultType }
export function profileFor(args: readonly string[]): Profile {
  if (args.length === 0) return { name: 'default', ticks: 20, faultTick: 5, faultDurationMs: 9000, faultType: 'combined' };
  if (args.length === 2 && args[0] === '--profile' && args[1] === 'azure-video') return { name: 'azure-video', ticks: 90, faultTick: 20, faultDurationMs: 40000, faultType: 'overheat' };
  throw new Error('Unknown demo profile. Use no arguments or --profile azure-video.');
}

export async function publishDemo({ profile, post, runId = randomUUID(), clock = Date.now,
  sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)),
}: { profile: Profile; post: (path: string, data: unknown) => Promise<{ accepted?: number }>; runId?: string; clock?: () => number; sleep?: (ms: number) => Promise<void> }) {
  for (const device of DEVICES) await post('/devices', { id: device.id, name: device.name, temperature_limit: tempThreshold(device), vibration_limit: vibThreshold(device) });
  const simulator = new Simulator({ clock });
  let accepted = 0;
  for (let tick = 0; tick < profile.ticks; tick++) {
    if (tick === profile.faultTick) simulator.simulateFault('press-01', profile.faultType, profile.faultDurationMs);
    const events = simulator.listDevices().map(({ device, reading }) => ({ event_id: runId + '-' + device.id + '-' + tick, device_id: device.id, timestamp: reading.timestamp, temperature_c: reading.temperatureC, vibration_mm_s: reading.vibrationMmS, state: reading.state, provenance: 'simulated' }));
    const result = await post('/telemetry', { events });
    if (!Number.isInteger(result.accepted) || result.accepted! < 0 || result.accepted! > events.length) throw new Error('Invalid telemetry acceptance response');
    accepted += result.accepted!;
    if (tick < profile.ticks - 1) await sleep(1000);
  }
  return { run: runId, accepted, ticks: profile.ticks, profile: profile.name, provenance: 'simulated', source: 'finite local simulator scenario' };
}
