import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Simulator, UnknownDeviceError } from "../simulator/store.js";
import { getTelemetryInput, getTelemetryOutput } from "../schemas.js";
import { fail, jsonText, ok } from "./format.js";

export function registerGetTelemetry(server: McpServer, sim: Simulator): void {
  server.registerTool(
    "get_telemetry",
    {
      title: "Get telemetry",
      description:
        "Return time ordered sensor readings for one device across a time window.\n\n" +
        "Inputs: device_id (required), start and end (epoch ms, optional, default last 15 minutes), " +
        "step_ms (default 30000), limit and offset for pagination, response_format.\n" +
        "Returns { device_id, start, end, step_ms, total, count, offset, has_more, next_offset?, " +
        "readings: [{ timestamp, temperature_c, vibration_mm_s, state }] }. Read only.",
      inputSchema: getTelemetryInput,
      outputSchema: getTelemetryOutput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ device_id, start, end, step_ms, limit, offset, response_format }) => {
      try {
        const { window, readings } = sim.getTelemetry(device_id, { start, end, stepMs: step_ms });
        const total = readings.length;
        const page = readings.slice(offset, offset + limit);
        const wireReadings = page.map((r) => ({
          timestamp: r.timestamp,
          temperature_c: r.temperatureC,
          vibration_mm_s: r.vibrationMmS,
          state: r.state,
        }));
        const hasMore = offset + page.length < total;
        const structured = {
          device_id,
          start: window.start,
          end: window.end,
          step_ms: window.stepMs,
          total,
          count: page.length,
          offset,
          has_more: hasMore,
          ...(hasMore ? { next_offset: offset + page.length } : {}),
          readings: wireReadings,
        };
        const text =
          response_format === "json"
            ? jsonText(structured)
            : renderMarkdown(device_id, total, page.length, wireReadings);
        return ok(structured, text);
      } catch (error) {
        if (error instanceof UnknownDeviceError) return fail(error.message);
        throw error;
      }
    },
  );
}

function renderMarkdown(
  deviceId: string,
  total: number,
  shown: number,
  readings: { timestamp: number; temperature_c: number; vibration_mm_s: number; state: string }[],
): string {
  const lines = [`# Telemetry for ${deviceId}`, "", `${total} samples in window (showing ${shown})`, ""];
  lines.push("| timestamp | temperature_c | vibration_mm_s | state |");
  lines.push("| --- | --- | --- | --- |");
  for (const r of readings) {
    lines.push(`| ${r.timestamp} | ${r.temperature_c} | ${r.vibration_mm_s} | ${r.state} |`);
  }
  return lines.join("\n");
}
