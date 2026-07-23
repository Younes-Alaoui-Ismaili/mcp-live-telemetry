/**
 * Test helper: connect a real MCP client to the server over an in-memory
 * transport pair. This exercises the full tool call path (schema validation,
 * structuredContent) without spawning a process.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "../src/server.js";
import type { SimulatorOptions } from "../src/simulator/store.js";

/** A fixed clock value so every windowed query is deterministic. */
export const FIXED_NOW = 1_700_000_000_000;

export interface CallResult {
  isError?: boolean;
  content: { type: string; text?: string }[];
  structuredContent?: Record<string, unknown>;
}

export async function connectClient(options: SimulatorOptions): Promise<Client> {
  const server = buildServer(options);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

export function textOf(result: CallResult): string {
  const first = result.content[0];
  return first && first.type === "text" && first.text ? first.text : "";
}
