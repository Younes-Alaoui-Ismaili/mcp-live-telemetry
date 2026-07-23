import { describe, expect, it } from "vitest";
import { generateSeries, isFaultActive, sampleReading } from "../src/simulator/generator.js";
import { DEVICES } from "../src/constants.js";
import type { Device, Fault } from "../src/types.js";

const press = DEVICES.find((d) => d.id === "press-01") as Device;
const SEED = 1337;

describe("sampleReading", () => {
  it("is deterministic for the same inputs", () => {
    const a = sampleReading(press, 1_700_000_000_000, [], SEED);
    const b = sampleReading(press, 1_700_000_000_000, [], SEED);
    expect(a).toEqual(b);
  });

  it("stays near baseline and healthy without faults", () => {
    const r = sampleReading(press, 1_700_000_000_000, [], SEED);
    expect(r.state).toBe("running");
    // baseline 62 C plus at most 3 C sine plus 0.8 C noise
    expect(r.temperatureC).toBeGreaterThan(press.baseTempC - 5);
    expect(r.temperatureC).toBeLessThan(press.baseTempC + 5);
    expect(r.vibrationMmS).toBeGreaterThanOrEqual(0);
  });

  it("changes with the seed", () => {
    const a = sampleReading(press, 1_700_000_000_000, [], 1);
    const b = sampleReading(press, 1_700_000_000_000, [], 2);
    expect(a.temperatureC === b.temperatureC && a.vibrationMmS === b.vibrationMmS).toBe(false);
  });

  it("raises temperature and marks fault when an overheat fault is active", () => {
    const t = 1_700_000_000_000;
    const fault: Fault = {
      id: "f1",
      deviceId: press.id,
      type: "overheat",
      startedAt: t - 1000,
      endsAt: t + 1000,
      durationMs: 2000,
    };
    const healthy = sampleReading(press, t, [], SEED);
    const faulted = sampleReading(press, t, [fault], SEED);
    expect(faulted.state).toBe("fault");
    expect(faulted.temperatureC).toBeGreaterThan(healthy.temperatureC + 20);
  });

  it("ignores faults belonging to other devices", () => {
    const t = 1_700_000_000_000;
    const otherFault: Fault = {
      id: "f2",
      deviceId: "spindle-02",
      type: "overheat",
      startedAt: t - 1000,
      endsAt: t + 1000,
      durationMs: 2000,
    };
    const a = sampleReading(press, t, [], SEED);
    const b = sampleReading(press, t, [otherFault], SEED);
    expect(b).toEqual(a);
  });
});

describe("isFaultActive", () => {
  const fault: Fault = {
    id: "f",
    deviceId: press.id,
    type: "overheat",
    startedAt: 1000,
    endsAt: 2000,
    durationMs: 1000,
  };
  it("is inclusive of the boundaries and false outside", () => {
    expect(isFaultActive(fault, 999)).toBe(false);
    expect(isFaultActive(fault, 1000)).toBe(true);
    expect(isFaultActive(fault, 1500)).toBe(true);
    expect(isFaultActive(fault, 2000)).toBe(true);
    expect(isFaultActive(fault, 2001)).toBe(false);
  });
});

describe("generateSeries", () => {
  it("produces the expected count and cadence", () => {
    const series = generateSeries(press, { start: 0, end: 300_000, stepMs: 30_000 }, [], SEED);
    expect(series).toHaveLength(11);
    expect(series[0]?.timestamp).toBe(0);
    expect(series[10]?.timestamp).toBe(300_000);
  });

  it("gives window independent values for a shared timestamp", () => {
    const shared = 1_700_000_100_000;
    const windowA = generateSeries(press, { start: shared, end: shared + 60_000, stepMs: 30_000 }, [], SEED);
    const windowB = generateSeries(press, { start: shared - 60_000, end: shared + 30_000, stepMs: 30_000 }, [], SEED);
    const fromA = windowA.find((r) => r.timestamp === shared);
    const fromB = windowB.find((r) => r.timestamp === shared);
    expect(fromA).toEqual(fromB);
  });

  it("returns an empty series for an inverted window", () => {
    expect(generateSeries(press, { start: 1000, end: 0, stepMs: 30_000 }, [], SEED)).toEqual([]);
  });
});
