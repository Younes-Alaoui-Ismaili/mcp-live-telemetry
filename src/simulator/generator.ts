/**
 * Pure telemetry generator. Given a device, a timestamp and the set of active
 * faults, it returns a deterministic reading. No wall clock is read here.
 */

import type { Device, Fault, Reading, Window } from "../types.js";
import {
  FAULT_EFFECT,
  MAX_POINTS,
  TEMP_NOISE_C,
  TEMP_SINE_AMP_C,
  TEMP_SINE_PERIOD_MS,
  VIB_NOISE_MMS,
  VIB_SINE_AMP_MMS,
  VIB_SINE_PERIOD_MS,
} from "../constants.js";
import { readingRng } from "./rng.js";

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function symmetricNoise(unit: number, amplitude: number): number {
  return (unit * 2 - 1) * amplitude;
}

/** Whether a fault covers the given timestamp for its device. */
export function isFaultActive(fault: Fault, timestamp: number): boolean {
  return timestamp >= fault.startedAt && timestamp <= fault.endsAt;
}

/**
 * Compute the reading for one device at one timestamp under a set of faults.
 * Faults not belonging to the device are ignored.
 */
export function sampleReading(
  device: Device,
  timestamp: number,
  faults: readonly Fault[],
  seed: number,
): Reading {
  const rng = readingRng(seed, device.id, timestamp);
  const tempNoise = symmetricNoise(rng(), TEMP_NOISE_C);
  const vibNoise = symmetricNoise(rng(), VIB_NOISE_MMS);

  let temperatureC =
    device.baseTempC +
    TEMP_SINE_AMP_C * Math.sin((2 * Math.PI * timestamp) / TEMP_SINE_PERIOD_MS) +
    tempNoise;
  let vibrationMmS =
    device.baseVibrationMmS +
    VIB_SINE_AMP_MMS * Math.sin((2 * Math.PI * timestamp) / VIB_SINE_PERIOD_MS) +
    vibNoise;

  let faulted = false;
  for (const fault of faults) {
    if (fault.deviceId !== device.id) continue;
    if (!isFaultActive(fault, timestamp)) continue;
    const effect = FAULT_EFFECT[fault.type];
    temperatureC += effect.tempC;
    vibrationMmS += effect.vibMmS;
    faulted = true;
  }

  return {
    timestamp,
    temperatureC: round(temperatureC, 2),
    vibrationMmS: round(Math.max(0, vibrationMmS), 3),
    state: faulted ? "fault" : "running",
  };
}

/**
 * Generate an ordered series of readings across a window. The number of points
 * is capped at MAX_POINTS to protect response size.
 */
export function generateSeries(
  device: Device,
  window: Window,
  faults: readonly Fault[],
  seed: number,
): Reading[] {
  const { start, end, stepMs } = window;
  const readings: Reading[] = [];
  if (end < start || stepMs <= 0) return readings;
  for (let t = start; t <= end && readings.length < MAX_POINTS; t += stepMs) {
    readings.push(sampleReading(device, t, faults, seed));
  }
  return readings;
}
