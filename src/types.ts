/**
 * Core domain types for the telemetry simulator.
 *
 * All time values are epoch milliseconds. The simulator is pure with respect to
 * a supplied timestamp: the reading for a given (device, timestamp, seed) never
 * depends on the query window, which is what makes time windows reproducible.
 */

export type DeviceState = "running" | "idle" | "fault";

export type FaultType = "overheat" | "vibration" | "combined";

export type Metric = "temperature" | "vibration";

/** Static definition of a simulated machine. */
export interface Device {
  id: string;
  name: string;
  baseTempC: number;
  baseVibrationMmS: number;
}

/** A single point-in-time sensor sample for one device. */
export interface Reading {
  timestamp: number;
  temperatureC: number;
  vibrationMmS: number;
  state: DeviceState;
}

/** An injected fault that biases readings while it is active. */
export interface Fault {
  id: string;
  deviceId: string;
  type: FaultType;
  startedAt: number;
  endsAt: number;
  durationMs: number;
}

/** A detected anomaly event (a run of samples that exceed a metric threshold). */
export interface Anomaly {
  id: string;
  deviceId: string;
  metric: Metric;
  startedAt: number;
  endedAt: number;
  peakValue: number;
  threshold: number;
  sampleCount: number;
}

/** A closed time window and sampling step used by telemetry and anomaly queries. */
export interface Window {
  start: number;
  end: number;
  stepMs: number;
}
