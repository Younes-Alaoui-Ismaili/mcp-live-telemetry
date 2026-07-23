/**
 * Zod raw shapes for tool input and output. registerTool expects raw shapes
 * (plain objects of Zod types), not wrapped z.object() schemas. Output fields use
 * snake_case to read like a conventional JSON API on the wire.
 */

import { z } from "zod";

export const responseFormat = z
  .enum(["markdown", "json"])
  .default("markdown")
  .describe("Text output format: 'markdown' (default, human readable) or 'json'.");

const stateEnum = z.enum(["running", "idle", "fault"]);
const metricEnum = z.enum(["temperature", "vibration"]);
const faultTypeEnum = z.enum(["overheat", "vibration", "combined"]);

export const listDevicesInput = {
  response_format: responseFormat,
};

export const listDevicesOutput = {
  count: z.number().int(),
  devices: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      state: stateEnum,
      temperature_c: z.number(),
      vibration_mm_s: z.number(),
      timestamp: z.number().int(),
    }),
  ),
};

export const getTelemetryInput = {
  device_id: z
    .string()
    .min(1)
    .describe("Device id, for example 'press-01'. Call list_devices for valid ids."),
  start: z
    .number()
    .int()
    .optional()
    .describe("Window start (epoch ms). Defaults to end minus 15 minutes."),
  end: z.number().int().optional().describe("Window end (epoch ms). Defaults to now."),
  step_ms: z
    .number()
    .int()
    .min(1000)
    .max(3_600_000)
    .default(30_000)
    .describe("Sampling step in milliseconds (1000 to 3600000)."),
  limit: z.number().int().min(1).max(500).default(100).describe("Max readings returned (pagination)."),
  offset: z.number().int().min(0).default(0).describe("Readings to skip (pagination)."),
  response_format: responseFormat,
};

export const getTelemetryOutput = {
  device_id: z.string(),
  start: z.number().int(),
  end: z.number().int(),
  step_ms: z.number().int(),
  total: z.number().int(),
  count: z.number().int(),
  offset: z.number().int(),
  has_more: z.boolean(),
  next_offset: z.number().int().optional(),
  readings: z.array(
    z.object({
      timestamp: z.number().int(),
      temperature_c: z.number(),
      vibration_mm_s: z.number(),
      state: stateEnum,
    }),
  ),
};

export const getAnomaliesInput = {
  device_id: z
    .string()
    .min(1)
    .optional()
    .describe("Restrict to one device. Omit to scan every device."),
  start: z.number().int().optional().describe("Window start (epoch ms). Defaults to end minus 15 minutes."),
  end: z.number().int().optional().describe("Window end (epoch ms). Defaults to now."),
  step_ms: z.number().int().min(1000).max(3_600_000).default(30_000).describe("Sampling step in milliseconds."),
  response_format: responseFormat,
};

export const getAnomaliesOutput = {
  count: z.number().int(),
  window: z.object({ start: z.number().int(), end: z.number().int(), step_ms: z.number().int() }),
  anomalies: z.array(
    z.object({
      id: z.string(),
      device_id: z.string(),
      metric: metricEnum,
      started_at: z.number().int(),
      ended_at: z.number().int(),
      peak_value: z.number(),
      threshold: z.number(),
      sample_count: z.number().int(),
    }),
  ),
};

export const simulateFaultInput = {
  device_id: z.string().min(1).describe("Device to fault. Call list_devices for valid ids."),
  fault_type: faultTypeEnum
    .default("overheat")
    .describe("overheat: temperature spike; vibration: vibration spike; combined: both."),
  duration_seconds: z
    .number()
    .int()
    .min(10)
    .max(3600)
    .default(300)
    .describe("How long the fault stays active from now, in seconds (10 to 3600)."),
};

export const simulateFaultOutput = {
  fault: z.object({
    id: z.string(),
    device_id: z.string(),
    type: faultTypeEnum,
    started_at: z.number().int(),
    ends_at: z.number().int(),
    duration_ms: z.number().int(),
  }),
  message: z.string(),
};
