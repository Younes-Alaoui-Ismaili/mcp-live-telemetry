import { expect, it, vi } from 'vitest';
import { ApiTelemetrySource } from '../src/api-source.js';
const response = (body: unknown) => async () => new Response(JSON.stringify(body));
it('rejects credentials in URLs, missing tokens and malformed source data', async () => {
  expect(() => new ApiTelemetrySource('https://user:secret@example.com', 'test')).toThrow(/HTTPS/);
  expect(() => new ApiTelemetrySource('https://example.com', '')).toThrow(/TOKEN/);
  const source = new ApiTelemetrySource('https://example.com', 'test', response({ devices: [{ id: 'press' }] }));
  await expect(source.listDevices()).rejects.toThrow();
  const unknown = new ApiTelemetrySource('http://localhost:4100', 'test', async () => new Response('{}', { status: 404 }));
  await expect(unknown.getTelemetry('absent')).rejects.toThrow('Unknown device or alarm');
});
it('maps server thresholds and observed states without replacing them', async () => {
  const source = new ApiTelemetrySource('http://localhost:4100', 'test', response({ devices: [{ id: 'press', name: 'Press', timestamp: 1000, temperature_c: 95, vibration_mm_s: 2, state: 'fault', temperature_limit: 80, vibration_limit: 3 }] }));
  const [device] = await source.listDevices();
  expect(device?.device.id).toBe('press');
  expect(device?.reading).toEqual({ timestamp: 1000, temperatureC: 95, vibrationMmS: 2, state: 'fault' });
});
it('downsamples actual observations and uses bounded default windows', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000000);
  try {
    const source = new ApiTelemetrySource('http://localhost:4100', 'test', response({ readings: [1000, 1100, 2000].map(timestamp => ({ timestamp, temperature_c: 95, vibration_mm_s: 2, state: 'fault' })) }));
    const result = await source.getTelemetry('press', { stepMs: 1000 });
    expect(result.readings.map(row => row.timestamp)).toEqual([1000, 2000]);
    expect(result.window.end).toBe(1000000);
    expect(result.window.start).toBeLessThan(result.window.end);
  } finally { vi.restoreAllMocks(); }
});
it('maps windowed anomalies and scopes the query only when a device is requested', async () => {
  const urls: string[] = [];
  const source = new ApiTelemetrySource('http://localhost:4100', 'test', async (url, init) => {
    urls.push(String(url));
    expect(init?.redirect).toBe('error');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    return new Response(JSON.stringify({ anomalies: [{ id: 'a', device_id: 'press', metric: 'temperature', started_at: 1000, ended_at: 2000, peak_value: 95, threshold: 80, sample_count: 2 }] }));
  });
  const first = await source.getAnomalies(undefined);
  await source.getAnomalies('press', { start: 1000, end: 2000 });
  expect(new URL(urls[0]!).searchParams.has('device_id')).toBe(false);
  expect(new URL(urls[1]!).searchParams.get('device_id')).toBe('press');
  expect(first.anomalies[0]).toEqual({ id: 'a', deviceId: 'press', metric: 'temperature', startedAt: 1000, endedAt: 2000, peakValue: 95, threshold: 80, sampleCount: 2 });
});
