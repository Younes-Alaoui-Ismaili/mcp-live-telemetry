#!/usr/bin/env node
/**
 * smoke.mjs
 *
 * Drives the built server (dist/index.js) as a real subprocess over stdio using
 * the MCP client SDK, then calls the tools and prints their output. This is a
 * genuine end to end MCP session, not an in-process shortcut.
 *
 * Prerequisite: npm run build (so dist/index.js exists).
 * Usage: node scripts/smoke.mjs
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function textOf(result) {
  const first = result.content?.[0];
  return first && first.type === "text" ? first.text : JSON.stringify(result);
}

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["dist/index.js"],
  });
  const client = new Client({ name: "smoke-client", version: "0.0.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log("connected. tools:", tools.map((t) => t.name).join(", "));

  const devices = await client.callTool({
    name: "list_devices",
    arguments: { response_format: "json" },
  });
  console.log("\n--- list_devices ---\n" + textOf(devices));

  const fault = await client.callTool({
    name: "simulate_fault",
    arguments: { device_id: "press-01", fault_type: "overheat", duration_seconds: 300 },
  });
  console.log("\n--- simulate_fault press-01 overheat ---\n" + textOf(fault));

  const anomalies = await client.callTool({
    name: "get_anomalies",
    arguments: { device_id: "press-01", response_format: "json" },
  });
  console.log("\n--- get_anomalies press-01 ---\n" + textOf(anomalies));

  await client.close();
  console.log("\nsmoke ok");
}

main().catch((error) => {
  console.error("smoke failed:", error);
  process.exit(1);
});
