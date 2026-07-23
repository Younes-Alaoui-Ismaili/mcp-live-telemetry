/**
 * Stateful simulator facade. Holds the device registry, the set of injected
 * faults, an injectable clock and seed, and exposes the operations the MCP tools
 * call. The clock and seed are injectable so tests are fully deterministic.
 */

import type { Anomaly, Device, DeviceState, Fault, FaultType, Reading, Window } from "../types.js";
import {
  DEFAULT_FAULT_DURATION_MS,
  DEFAULT_SEED,
  DEFAULT_STEP_MS,
  DEFAULT_WINDOW_MS,
  DEVICES,
  FAULT_LEAD_MS,
} from "../constants.js";
import { generateSeries, sampleReading } from "./generator.js";
import { detectAnomalies } from "./anomalies.js";

export interface SimulatorOptions {
  seed?: number;
  clock?: () => number;
  devices?: readonly Device[];
}

export interface DeviceStatus {
  device: Device;
  reading: Reading;
}

export class UnknownDeviceError extends Error {
  constructor(
    public readonly deviceId: string,
    public readonly knownIds: readonly string[],
  ) {
    super(`Unknown device "${deviceId}". Known devices: ${knownIds.join(", ")}.`);
    this.name = "UnknownDeviceError";
  }
}

export class Simulator {
  private readonly seed: number;
  private readonly clock: () => number;
  private readonly devices: readonly Device[];
  private readonly faults: Fault[] = [];
  private faultCounter = 0;

  constructor(options: SimulatorOptions = {}) {
    this.seed = options.seed ?? DEFAULT_SEED;
    this.clock = options.clock ?? Date.now;
    this.devices = options.devices ?? DEVICES;
  }

  now(): number {
    return this.clock();
  }

  listDeviceDefinitions(): readonly Device[] {
    return this.devices;
  }

  getDevice(deviceId: string): Device {
    const device = this.devices.find((d) => d.id === deviceId);
    if (!device) {
      throw new UnknownDeviceError(
        deviceId,
        this.devices.map((d) => d.id),
      );
    }
    return device;
  }

  activeFaults(): readonly Fault[] {
    return this.faults;
  }

  /** Current status (latest reading) for every device. */
  listDevices(): DeviceStatus[] {
    const t = this.now();
    return this.devices.map((device) => ({
      device,
      reading: sampleReading(device, t, this.faults, this.seed),
    }));
  }

  /** Ordered readings for one device across a resolved window. */
  getTelemetry(deviceId: string, partial: Partial<Window> = {}): { window: Window; readings: Reading[] } {
    const device = this.getDevice(deviceId);
    const window = this.resolveWindow(partial);
    return { window, readings: generateSeries(device, window, this.faults, this.seed) };
  }

  /** Anomalies for one device or, when deviceId is omitted, every device. */
  getAnomalies(deviceId: string | undefined, partial: Partial<Window> = {}): { window: Window; anomalies: Anomaly[] } {
    const window = this.resolveWindow(partial);
    const targets = deviceId ? [this.getDevice(deviceId)] : this.devices;
    const anomalies: Anomaly[] = [];
    for (const device of targets) {
      const readings = generateSeries(device, window, this.faults, this.seed);
      anomalies.push(...detectAnomalies(device, readings));
    }
    return { window, anomalies };
  }

  /** Inject a fault, effective from FAULT_LEAD_MS in the past so it shows at once. */
  simulateFault(deviceId: string, type: FaultType, durationMs: number = DEFAULT_FAULT_DURATION_MS): Fault {
    this.getDevice(deviceId);
    const injectedAt = this.now();
    const startedAt = injectedAt - FAULT_LEAD_MS;
    const endsAt = injectedAt + durationMs;
    this.faultCounter += 1;
    const fault: Fault = {
      id: `fault-${this.faultCounter}-${deviceId}`,
      deviceId,
      type,
      startedAt,
      endsAt,
      durationMs,
    };
    this.faults.push(fault);
    return fault;
  }

  currentState(deviceId: string): DeviceState {
    const device = this.getDevice(deviceId);
    return sampleReading(device, this.now(), this.faults, this.seed).state;
  }

  private resolveWindow(partial: Partial<Window>): Window {
    const end = partial.end ?? this.now();
    const start = partial.start ?? end - DEFAULT_WINDOW_MS;
    const stepMs = partial.stepMs ?? DEFAULT_STEP_MS;
    return { start, end, stepMs };
  }
}
