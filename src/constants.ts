/**
 * Simulation constants. Values are chosen so that a healthy machine never crosses
 * its anomaly threshold under normal noise, while an injected fault always does.
 */

import type { Device, FaultType } from "./types.js";

/** The four simulated machines exposed by the server. */
export const DEVICES: readonly Device[] = [
  { id: "press-01", name: "Hydraulic Press", baseTempC: 62, baseVibrationMmS: 2.1 },
  { id: "spindle-02", name: "CNC Spindle", baseTempC: 48, baseVibrationMmS: 1.4 },
  { id: "conveyor-03", name: "Conveyor Motor", baseTempC: 40, baseVibrationMmS: 0.9 },
  { id: "pump-04", name: "Coolant Pump", baseTempC: 55, baseVibrationMmS: 1.7 },
];

/** Slow baseline oscillation, so a healthy signal looks alive rather than flat. */
export const TEMP_SINE_AMP_C = 3;
export const TEMP_SINE_PERIOD_MS = 3_600_000;
export const VIB_SINE_AMP_MMS = 0.3;
export const VIB_SINE_PERIOD_MS = 1_800_000;

/** Peak absolute per-sample noise. Kept well under the anomaly margins below. */
export const TEMP_NOISE_C = 0.8;
export const VIB_NOISE_MMS = 0.12;

/** Anomaly thresholds are the device baseline plus these margins. */
export const TEMP_MARGIN_C = 15;
export const VIB_MARGIN_MMS = 2.0;

/** How much each fault type adds to the affected metric while active. */
export const FAULT_EFFECT: Record<FaultType, { tempC: number; vibMmS: number }> = {
  overheat: { tempC: 28, vibMmS: 0 },
  vibration: { tempC: 0, vibMmS: 4.5 },
  combined: { tempC: 28, vibMmS: 4.5 },
};

/**
 * A newly injected fault is treated as having started FAULT_LEAD_MS before the
 * injection moment, so it is immediately visible in recent telemetry during a
 * live demo instead of only affecting the single latest sample.
 */
export const FAULT_LEAD_MS = 120_000;
export const DEFAULT_FAULT_DURATION_MS = 300_000;

/** Query defaults and safety caps. */
export const DEFAULT_WINDOW_MS = 900_000;
export const DEFAULT_STEP_MS = 30_000;
export const MIN_STEP_MS = 1_000;
export const MAX_STEP_MS = 3_600_000;
export const MAX_POINTS = 1_000;

/** Pagination for get_telemetry. */
export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 500;

/** Deterministic default seed for the noise generator. */
export const DEFAULT_SEED = 1337;

/** Maximum characters in a tool text response before it is truncated. */
export const CHARACTER_LIMIT = 25_000;

export function tempThreshold(device: Device): number {
  return device.baseTempC + TEMP_MARGIN_C;
}

export function vibThreshold(device: Device): number {
  return device.baseVibrationMmS + VIB_MARGIN_MMS;
}
