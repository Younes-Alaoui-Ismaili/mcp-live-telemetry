/**
 * Threshold based anomaly detection over a series of readings.
 *
 * A metric that stays above its device threshold for one or more consecutive
 * samples produces a single anomaly event spanning that run, with the peak value
 * and sample count recorded. Healthy noise never crosses the threshold, so a
 * clean series yields zero anomalies.
 */

import type { Anomaly, Device, Metric, Reading } from "../types.js";
import { tempThreshold, vibThreshold } from "../constants.js";

interface OpenEvent {
  startedAt: number;
  endedAt: number;
  peakValue: number;
  sampleCount: number;
}

function detectMetric(
  device: Device,
  readings: readonly Reading[],
  metric: Metric,
  threshold: number,
  valueOf: (r: Reading) => number,
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  let open: OpenEvent | null = null;

  const close = (): void => {
    if (!open) return;
    anomalies.push({
      id: `${device.id}:${metric}:${open.startedAt}`,
      deviceId: device.id,
      metric,
      startedAt: open.startedAt,
      endedAt: open.endedAt,
      peakValue: open.peakValue,
      threshold,
      sampleCount: open.sampleCount,
    });
    open = null;
  };

  for (const reading of readings) {
    const value = valueOf(reading);
    if (value > threshold) {
      if (open) {
        open.endedAt = reading.timestamp;
        open.peakValue = Math.max(open.peakValue, value);
        open.sampleCount += 1;
      } else {
        open = {
          startedAt: reading.timestamp,
          endedAt: reading.timestamp,
          peakValue: value,
          sampleCount: 1,
        };
      }
    } else {
      close();
    }
  }
  close();
  return anomalies;
}

/** Detect temperature and vibration anomalies for one device. */
export function detectAnomalies(device: Device, readings: readonly Reading[]): Anomaly[] {
  return [
    ...detectMetric(device, readings, "temperature", tempThreshold(device), (r) => r.temperatureC),
    ...detectMetric(device, readings, "vibration", vibThreshold(device), (r) => r.vibrationMmS),
  ];
}
