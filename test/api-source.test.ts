import { describe, it, expect, vi } from 'vitest';
import { ApiTelemetrySource } from '../src/api-source.js';

describe('authenticated API source', () => {
  it('refuses remote plaintext and fault injection', async () => {
    expect(() => new ApiTelemetrySource('http://example.com', 'token')).toThrow(/HTTPS/);
    const source = new ApiTelemetrySource('http://127.0.0.1:4100', 'token');
    await expect(source.simulateFault('press-01', 'overheat', 1000)).rejects.toThrow(/simulator/);
  });
  it('preserves observed samples and authenticates every request', async () => {
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test');
      return new Response(JSON.stringify({ readings: [{ timestamp: 2000, temperature_c: 95, vibration_mm_s: 2, state: 'fault' }] }));
    });
    const source = new ApiTelemetrySource('http://127.0.0.1:4100', 'test', fetcher as typeof fetch);
    const result = await source.getTelemetry('press-01', { start: 1000, end: 5000, stepMs: 1000 });
    expect(result.readings).toEqual([{ timestamp: 2000, temperatureC: 95, vibrationMmS: 2, state: 'fault' }]);
  });
  it('reports unavailability without substituting the simulator', async () => {
    const source = new ApiTelemetrySource('http://127.0.0.1:4100', 'test', async () => new Response('{}', { status: 503 }));
    await expect(source.listDevices()).rejects.toThrow('API unavailable (503)');
  });
});
