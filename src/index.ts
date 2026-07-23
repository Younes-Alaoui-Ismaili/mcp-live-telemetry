#!/usr/bin/env node
/**
 * Entry point for the mcp-live-telemetry server over stdio.
 *
 * A stdio MCP server communicates on stdout and must never print anything else
 * there, so all logging goes to stderr.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} ${SERVER_VERSION} running on stdio`);
}

main().catch((error: unknown) => {
  console.error("fatal:", error);
  process.exit(1);
});
