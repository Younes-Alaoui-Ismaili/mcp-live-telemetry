#!/usr/bin/env node
/**
 * Entry point for the mcp-live-telemetry server over stdio.
 *
 * A stdio MCP server communicates on stdout and must never print anything else
 * there, so all logging goes to stderr.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { ApiTelemetrySource } from "./api-source.js";

async function main(): Promise<void> {
  const mode = process.env.TELEMETRY_SOURCE ?? "simulator";
  if (!["simulator", "cloud"].includes(mode)) throw new Error("Unknown TELEMETRY_SOURCE");
  const source = mode === "cloud" ? new ApiTelemetrySource(process.env.TELEMETRY_API_URL ?? "", process.env.TELEMETRY_API_TOKEN ?? "") : undefined;
  const server = buildServer({ source });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} ${SERVER_VERSION} running on stdio`);
}

main().catch((error: unknown) => {
  console.error("fatal:", error);
  process.exit(1);
});
