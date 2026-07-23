import { describe, expect, it } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { connectClient, FIXED_NOW, textOf, type CallResult } from "./helpers.js";
import { FAULT_LEAD_MS } from "../src/constants.js";

function client(): Promise<Client> {
  return connectClient({ seed: 1337, clock: () => FIXED_NOW });
}

async function call(c: Client, name: string, args: Record<string, unknown>): Promise<CallResult> {
  return (await c.callTool({ name, arguments: args })) as unknown as CallResult;
}

describe("tool registration", () => {
  it("exposes exactly the four documented tools", async () => {
    const c = await client();
    const { tools } = await c.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["get_anomalies", "get_telemetry", "list_devices", "simulate_fault"]);
  });
});

describe("list_devices", () => {
  it("returns four healthy devices", async () => {
    const c = await client();
    const res = await call(c, "list_devices", {});
    const sc = res.structuredContent as { count: number; devices: { id: string; state: string }[] };
    expect(sc.count).toBe(4);
    expect(sc.devices.map((d) => d.id).sort()).toEqual([
      "conveyor-03",
      "press-01",
      "pump-04",
      "spindle-02",
    ]);
    expect(sc.devices.every((d) => d.state === "running")).toBe(true);
  });

  it("honours response_format json", async () => {
    const c = await client();
    const res = await call(c, "list_devices", { response_format: "json" });
    expect(textOf(res).trimStart().startsWith("{")).toBe(true);
  });
});

describe("get_telemetry", () => {
  it("returns a full default window and paginates", async () => {
    const c = await client();
    const full = await call(c, "get_telemetry", { device_id: "press-01" });
    const sc = full.structuredContent as {
      total: number;
      count: number;
      has_more: boolean;
      readings: { timestamp: number; temperature_c: number; state: string }[];
    };
    expect(sc.total).toBe(31);
    expect(sc.count).toBe(31);
    expect(sc.has_more).toBe(false);
    expect(sc.readings[0]).toHaveProperty("temperature_c");

    const page = await call(c, "get_telemetry", { device_id: "press-01", limit: 10 });
    const pc = page.structuredContent as { count: number; has_more: boolean; next_offset?: number };
    expect(pc.count).toBe(10);
    expect(pc.has_more).toBe(true);
    expect(pc.next_offset).toBe(10);
  });

  it("returns a tool error for an unknown device", async () => {
    const c = await client();
    const res = await call(c, "get_telemetry", { device_id: "does-not-exist" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("Unknown device");
  });
});

describe("simulate_fault then get_anomalies", () => {
  it("makes an injected overheat fault visible", async () => {
    const c = await client();
    const injected = await call(c, "simulate_fault", { device_id: "press-01", fault_type: "overheat" });
    const fc = injected.structuredContent as {
      fault: { type: string; started_at: number; ends_at: number; duration_ms: number };
    };
    expect(fc.fault.type).toBe("overheat");
    expect(fc.fault.started_at).toBe(FIXED_NOW - FAULT_LEAD_MS);
    expect(fc.fault.duration_ms).toBe(300_000);

    const anomalies = await call(c, "get_anomalies", { device_id: "press-01" });
    const ac = anomalies.structuredContent as {
      count: number;
      anomalies: { metric: string; sample_count: number; device_id: string }[];
    };
    expect(ac.count).toBe(1);
    expect(ac.anomalies[0]?.metric).toBe("temperature");
    expect(ac.anomalies[0]?.device_id).toBe("press-01");
    expect(ac.anomalies[0]?.sample_count).toBe(5);
  });

  it("reports no anomalies before any fault", async () => {
    const c = await client();
    const res = await call(c, "get_anomalies", {});
    const sc = res.structuredContent as { count: number };
    expect(sc.count).toBe(0);
  });
});

describe("error handling", () => {
  it("simulate_fault returns an actionable error for an unknown device", async () => {
    const c = await client();
    const res = await call(c, "simulate_fault", { device_id: "ghost-99" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("Known devices");
  });

  it("get_anomalies returns an actionable error for an unknown device", async () => {
    const c = await client();
    const res = await call(c, "get_anomalies", { device_id: "ghost-99" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("Unknown device");
  });
});
