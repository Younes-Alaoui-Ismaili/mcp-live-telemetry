import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Simulator, UnknownDeviceError } from "../simulator/store.js";
import { getAnomaliesInput, getAnomaliesOutput } from "../schemas.js";
import { fail, jsonText, ok } from "./format.js";
import type { Anomaly } from "../types.js";

function toWire(a: Anomaly) {
  return {
    id: a.id,
    device_id: a.deviceId,
    metric: a.metric,
    started_at: a.startedAt,
    ended_at: a.endedAt,
    peak_value: a.peakValue,
    threshold: a.threshold,
    sample_count: a.sampleCount,
  };
}

export function registerGetAnomalies(server: McpServer, sim: Simulator): void {
  server.registerTool(
    "get_anomalies",
    {
      title: "Get anomalies",
      description:
        "Detect threshold crossings (temperature or vibration) over a time window.\n\n" +
        "Inputs: device_id (optional, omit to scan all devices), start and end (epoch ms, optional, " +
        "default last 15 minutes), step_ms (default 30000), response_format.\n" +
        "Returns { count, window, anomalies: [{ id, device_id, metric, started_at, ended_at, " +
        "peak_value, threshold, sample_count }] }. A healthy machine returns no anomalies. Read only.",
      inputSchema: getAnomaliesInput,
      outputSchema: getAnomaliesOutput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ device_id, start, end, step_ms, response_format }) => {
      try {
        const { window, anomalies } = sim.getAnomalies(device_id, { start, end, stepMs: step_ms });
        const wire = anomalies.map(toWire);
        const structured = {
          count: wire.length,
          window: { start: window.start, end: window.end, step_ms: window.stepMs },
          anomalies: wire,
        };
        const text = response_format === "json" ? jsonText(structured) : renderMarkdown(wire);
        return ok(structured, text);
      } catch (error) {
        if (error instanceof UnknownDeviceError) return fail(error.message);
        throw error;
      }
    },
  );
}

function renderMarkdown(anomalies: ReturnType<typeof toWire>[]): string {
  if (anomalies.length === 0) return "# Anomalies\n\nNone detected in window.";
  const lines = [`# Anomalies (${anomalies.length})`, ""];
  lines.push("| device | metric | peak | threshold | samples | started_at |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const a of anomalies) {
    lines.push(
      `| ${a.device_id} | ${a.metric} | ${a.peak_value} | ${a.threshold} | ${a.sample_count} | ${a.started_at} |`,
    );
  }
  return lines.join("\n");
}
