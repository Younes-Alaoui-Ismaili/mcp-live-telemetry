import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Simulator, UnknownDeviceError } from "../simulator/store.js";
import { simulateFaultInput, simulateFaultOutput } from "../schemas.js";
import { fail, jsonText, ok } from "./format.js";

export function registerSimulateFault(server: McpServer, sim: Simulator): void {
  server.registerTool(
    "simulate_fault",
    {
      title: "Simulate fault",
      description:
        "Inject a fault on a device so it becomes visible to get_telemetry and get_anomalies.\n\n" +
        "Inputs: device_id (required), fault_type ('overheat' | 'vibration' | 'combined', default " +
        "'overheat'), duration_seconds (default 300). The fault is treated as having started two " +
        "minutes ago so it appears immediately in recent telemetry.\n" +
        "Returns { fault: { id, device_id, type, started_at, ends_at, duration_ms }, message }. " +
        "This tool mutates simulator state; it is not read only.",
      inputSchema: simulateFaultInput,
      outputSchema: simulateFaultOutput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ device_id, fault_type, duration_seconds }) => {
      try {
        const fault = sim.simulateFault(device_id, fault_type, duration_seconds * 1000);
        const structured = {
          fault: {
            id: fault.id,
            device_id: fault.deviceId,
            type: fault.type,
            started_at: fault.startedAt,
            ends_at: fault.endsAt,
            duration_ms: fault.durationMs,
          },
          message:
            `Injected ${fault.type} fault on ${device_id}, active until ` +
            `${new Date(fault.endsAt).toISOString()}. Call get_anomalies or get_telemetry to see it.`,
        };
        return ok(structured, `${structured.message}\n\n${jsonText(structured.fault)}`);
      } catch (error) {
        if (error instanceof UnknownDeviceError) return fail(error.message);
        throw error;
      }
    },
  );
}
