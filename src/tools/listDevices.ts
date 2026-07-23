import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Simulator } from "../simulator/store.js";
import { listDevicesInput, listDevicesOutput } from "../schemas.js";
import { jsonText, ok } from "./format.js";

interface WireDevice {
  id: string;
  name: string;
  state: string;
  temperature_c: number;
  vibration_mm_s: number;
  timestamp: number;
}

function renderMarkdown(devices: WireDevice[]): string {
  const lines = [`# Devices (${devices.length})`, ""];
  for (const d of devices) {
    lines.push(`## ${d.name} (${d.id})`);
    lines.push(`- state: ${d.state}`);
    lines.push(`- temperature: ${d.temperature_c} C`);
    lines.push(`- vibration: ${d.vibration_mm_s} mm/s`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function registerListDevices(server: McpServer, sim: Simulator): void {
  server.registerTool(
    "list_devices",
    {
      title: "List devices",
      description:
        "List every simulated machine with its latest reading and state.\n\n" +
        "Returns { count, devices: [{ id, name, state, temperature_c, vibration_mm_s, timestamp }] }. " +
        "Read only. Use this first to discover valid device ids for the other tools.",
      inputSchema: listDevicesInput,
      outputSchema: listDevicesOutput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ response_format }) => {
      const devices: WireDevice[] = sim.listDevices().map(({ device, reading }) => ({
        id: device.id,
        name: device.name,
        state: reading.state,
        temperature_c: reading.temperatureC,
        vibration_mm_s: reading.vibrationMmS,
        timestamp: reading.timestamp,
      }));
      const structured = { count: devices.length, devices };
      const text = response_format === "json" ? jsonText(structured) : renderMarkdown(devices);
      return ok(structured, text);
    },
  );
}
