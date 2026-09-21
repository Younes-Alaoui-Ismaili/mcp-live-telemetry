import { describe, expect, it } from 'vitest';
import { profileFor, publishDemo } from '../src/demo-publisher.js';

interface Event { event_id: string; device_id: string; timestamp: number; state: string; temperature_c: number; provenance: string }
async function record(args: string[]) {
  let now = 1_789_930_000_000;
  const batches: Event[][] = [];
  const sleeps: number[] = [];
  const result = await publishDemo({
    profile: profileFor(args), runId: 'test-run', clock: () => now,
    sleep: async (ms: number) => { sleeps.push(ms); now += ms; },
    post: async (path: string, data: unknown) => {
      if (path === '/telemetry') { const events = (data as { events: Event[] }).events; batches.push(events); return { accepted: events.length }; }
      return {};
    },
  });
  return { batches, sleeps, result };
}

describe('finite demo profiles', () => {
  it('preserves the default 20-tick combined-fault scenario', async () => {
    const { batches, sleeps, result } = await record([]);
    expect(result.accepted).toBe(80);
    expect(batches).toHaveLength(20);
    expect(sleeps).toEqual(Array(19).fill(1000));
    expect(batches[4]!.find(e => e.device_id === 'press-01')!.state).toBe('running');
    expect(batches[5]!.find(e => e.device_id === 'press-01')!.state).toBe('fault');
    expect(batches[15]!.find(e => e.device_id === 'press-01')!.state).toBe('running');
  });
  it('records a bounded 90-tick scenario with warmup, 40-second overheating and recovery', async () => {
    const { batches, sleeps, result } = await record(['--profile', 'azure-video']);
    expect(result.accepted).toBe(360);
    expect(batches).toHaveLength(90);
    expect(sleeps).toEqual(Array(89).fill(1000));
    const press = batches.map(batch => batch.find(e => e.device_id === 'press-01')!);
    expect(press.slice(0, 20).every(e => e.state === 'running')).toBe(true);
    expect(press.slice(20, 61).every(e => e.state === 'fault' && e.temperature_c > 77)).toBe(true);
    expect(press.slice(61).every(e => e.state === 'running' && e.temperature_c < 77)).toBe(true);
    expect(new Set(batches.flat().map(e => e.event_id)).size).toBe(360);
    expect(batches.flat().every(e => e.provenance === 'simulated')).toBe(true);
    expect(batches.flat().filter(e => e.device_id !== 'press-01').every(e => e.state === 'running')).toBe(true);
  });
  it('rejects unknown profiles before publishing', () => {
    expect(() => profileFor(['--profile', 'unbounded'])).toThrow(/profile/);
    expect(() => profileFor(['--profile', 'azure-video', '--repeat'])).toThrow(/profile/);
  });
  it('stops on an API failure instead of reporting successful publication', async () => {
    let calls = 0;
    await expect(publishDemo({ profile: profileFor([]), post: async () => { calls++; throw new Error('HTTP 403'); } })).rejects.toThrow('HTTP 403');
    expect(calls).toBe(1);
  });
});
