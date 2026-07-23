/**
 * Shared helpers for building tool results and formatting text output.
 */

import { CHARACTER_LIMIT } from "../constants.js";

export interface ToolResult {
  // The SDK tool callback return type carries an open index signature; mirror it
  // so these results are assignable without casting.
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Truncate text that would exceed the response character limit. */
export function clamp(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return `${text.slice(0, CHARACTER_LIMIT)}\n... [truncated to ${CHARACTER_LIMIT} chars]`;
}

/** A successful result carrying both a text view and structured data. */
export function ok(structured: Record<string, unknown>, text: string): ToolResult {
  return { content: [{ type: "text", text: clamp(text) }], structuredContent: structured };
}

/** A tool-level error result (reported in the result, not thrown). */
export function fail(message: string): ToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

export function jsonText(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}
