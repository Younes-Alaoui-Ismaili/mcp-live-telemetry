import { describe, expect, it } from "vitest";
import { detectAnomalies } from "../src/simulator/anomalies.js";
import { DEVICES, tempThreshold, vibThreshold } from "../src/constants.js";
import type { Device, Reading } from "../src/types.js";

const press = DEVICES.find((d) => d.id === "press-01") as Device;

function reading(timestamp: number, temperatureC: number, vibrationMmS: number): Reading {
  return { timestamp, temperatureC, vibrationMmS, state: "running" };
}

describe("detectAnomalies", () => {
  it("returns nothing for a healthy series", () => {
    const readings = [reading(1000, 63, 2.0), reading(2000, 64, 2.1), reading(3000, 62, 1.9)];
    expect(detectAnomalies(press, readings)).toEqual([]);
  });

  it("groups a run of temperature exceedances into one anomaly", () => {
    const readings = [
      reading(1000, 70, 2.0),
      reading(2000, 90, 2.0),
      reading(3000, 92, 2.0),
      reading(4000, 70, 2.0),
    ];
    const anomalies = detectAnomalies(press, readings);
    expect(anomalies).toHaveLength(1);
    const a = anomalies[0];
    expect(a?.metric).toBe("temperature");
    expect(a?.startedAt).toBe(2000);
    expect(a?.endedAt).toBe(3000);
    expect(a?.peakValue).toBe(92);
    expect(a?.sampleCount).toBe(2);
    expect(a?.threshold).toBe(tempThreshold(press));
  });

  it("does not flag a value exactly at the threshold", () => {
    const readings = [reading(1000, tempThreshold(press), 2.0)];
    expect(detectAnomalies(press, readings)).toEqual([]);
  });

  it("detects vibration exceedances independently", () => {
    const readings = [reading(1000, 62, vibThreshold(press) + 2)];
    const anomalies = detectAnomalies(press, readings);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]?.metric).toBe("vibration");
  });

  it("reports two separate events for two separate spikes", () => {
    const readings = [
      reading(1000, 90, 2.0),
      reading(2000, 63, 2.0),
      reading(3000, 91, 2.0),
    ];
    const anomalies = detectAnomalies(press, readings).filter((a) => a.metric === "temperature");
    expect(anomalies).toHaveLength(2);
  });
});
