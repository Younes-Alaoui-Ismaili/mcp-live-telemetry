import { z } from 'zod';
import type { TelemetrySource } from './source.js';
import type { Fault, FaultType, Window } from './types.js';
import { DEFAULT_STEP_MS, DEFAULT_WINDOW_MS, TEMP_MARGIN_C, VIB_MARGIN_MMS } from './constants.js';

const reading = z.object({ timestamp: z.number(), temperature_c: z.number(), vibration_mm_s: z.number(), state: z.enum(['running', 'idle', 'fault']) });
const device = reading.extend({ id: z.string(), name: z.string(), temperature_limit: z.number(), vibration_limit: z.number() });
const anomaly = z.object({ id: z.string(), device_id: z.string(), metric: z.enum(['temperature', 'vibration']), started_at: z.number(), ended_at: z.number(), peak_value: z.number(), threshold: z.number(), sample_count: z.number() });
const mapReading = (r: z.infer<typeof reading>) => ({ timestamp: r.timestamp, temperatureC: r.temperature_c, vibrationMmS: r.vibration_mm_s, state: r.state });

export class ApiTelemetrySource implements TelemetrySource {
  readonly base: string;
  constructor(base: string, private readonly token: string, private readonly fetcher: typeof fetch = fetch) {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))) throw new Error('HTTPS required except on loopback');
    if (!token) throw new Error('TELEMETRY_API_TOKEN required');
    this.base = url.href.replace(/\/$/, '');
  }
  async request(path: string) {
    const response = await this.fetcher(this.base + '/api/v1' + path, { headers: { Authorization: 'Bearer ' + this.token }, signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!response.ok) throw new Error(response.status === 404 ? 'Unknown device or alarm' : 'API unavailable (' + response.status + ')');
    return response.json() as Promise<unknown>;
  }
  async listDevices() {
    const result = z.object({ devices: z.array(device) }).parse(await this.request('/devices'));
    return result.devices.map(d => ({ device: { id: d.id, name: d.name, baseTempC: d.temperature_limit - TEMP_MARGIN_C, baseVibrationMmS: d.vibration_limit - VIB_MARGIN_MMS }, reading: mapReading(d) }));
  }
  private window(partial: Partial<Window>) {
    const end = partial.end ?? Date.now();
    return { start: partial.start ?? end - DEFAULT_WINDOW_MS, end, stepMs: partial.stepMs ?? DEFAULT_STEP_MS };
  }
  async getTelemetry(id: string, partial: Partial<Window> = {}) {
    const window = this.window(partial);
    const params = new URLSearchParams({ device_id: id, start: String(window.start), end: String(window.end) });
    const result = z.object({ readings: z.array(reading) }).parse(await this.request('/telemetry?' + params));
    let previous = -Infinity;
    const readings = result.readings.filter(r => { if (r.timestamp - previous < window.stepMs) return false; previous = r.timestamp; return true; }).map(mapReading);
    return { window, readings };
  }
  async getAnomalies(id: string | undefined, partial: Partial<Window> = {}) {
    const window = this.window(partial);
    const params = new URLSearchParams({ start: String(window.start), end: String(window.end), ...(id ? { device_id: id } : {}) });
    const result = z.object({ anomalies: z.array(anomaly) }).parse(await this.request('/anomalies?' + params));
    return { window, anomalies: result.anomalies.map(a => ({ id: a.id, deviceId: a.device_id, metric: a.metric, startedAt: a.started_at, endedAt: a.ended_at, peakValue: a.peak_value, threshold: a.threshold, sampleCount: a.sample_count })) };
  }
  async simulateFault(_id: string, _type: FaultType, _duration?: number): Promise<Fault> {
    throw new Error('Fault injection is available only with the simulator source');
  }
}
