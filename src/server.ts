/**
 * Server factory. buildServer wires the four tools onto a fresh McpServer backed
 * by a Simulator. Options (seed, clock) are forwarded to the simulator so tests
 * and the stdio entry point share one construction path.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Simulator, type SimulatorOptions } from "./simulator/store.js";
import { registerListDevices } from "./tools/listDevices.js";
import { registerGetTelemetry } from "./tools/getTelemetry.js";
import { registerGetAnomalies } from "./tools/getAnomalies.js";
import { registerSimulateFault } from "./tools/simulateFault.js";

export const SERVER_NAME = "mcp-live-telemetry";
export const SERVER_VERSION = "0.1.0";

export function buildServer(options: SimulatorOptions = {}): McpServer {
  const sim = new Simulator(options);
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerListDevices(server, sim);
  registerGetTelemetry(server, sim);
  registerGetAnomalies(server, sim);
  registerSimulateFault(server, sim);
  return server;
}
