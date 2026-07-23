import { describe, expect, it } from "vitest";
import { connectClient, FIXED_NOW, type CallResult } from "./helpers.js";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

async function call(c: Client, name: string, args: Record<string, unknown>): Promise<CallResult> {
  return (await c.callTool({ name, arguments: args })) as unknown as CallResult;
}

/**
 * End to end demo scenario over a real client/server pair: discover devices,
 * inject a vibration fault, then confirm it surfaces in a fleet wide anomaly scan.
 * This mirrors the live demo script in docs/DEMO.md.
 */
describe("demo scenario end to end", () => {
  it("discovers, injects a vibration fault and detects it fleet wide", async () => {
    const c = await connectClient({ seed: 1337, clock: () => FIXED_NOW });

    const list = await call(c, "list_devices", {});
    const devices = (list.structuredContent as { devices: { id: string }[] }).devices;
    expect(devices.some((d) => d.id === "spindle-02")).toBe(true);

    await call(c, "simulate_fault", { device_id: "spindle-02", fault_type: "vibration" });

    // Omit device_id to scan every device.
    const scan = await call(c, "get_anomalies", {});
    const anomalies = (scan.structuredContent as {
      anomalies: { device_id: string; metric: string }[];
    }).anomalies;

    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]?.device_id).toBe("spindle-02");
    expect(anomalies[0]?.metric).toBe("vibration");
  });
});
