# mcp-live-telemetry

[![CI](https://github.com/Younes-Alaoui-Ismaili/mcp-live-telemetry/actions/workflows/ci.yml/badge.svg)](https://github.com/Younes-Alaoui-Ismaili/mcp-live-telemetry/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes live industrial IoT telemetry to any MCP client. It streams simulated sensor data from a small fleet of machines, detects anomalies against per device thresholds, and lets you inject a fault on demand so the whole loop is visible in a single session.

The simulator is deliberately isolated behind a thin boundary so it can be swapped for a real data source without touching the tools. See [Adapting this to your data source](#adapting-this-to-your-data-source).

![A real stdio MCP session: list devices, inject a fault, detect it](demo/session.svg)

## Tools

| Tool | Description | Read only |
| --- | --- | --- |
| `list_devices` | List every machine with its latest reading and state. | yes |
| `get_telemetry` | Time ordered readings for one device across a window, with pagination. | yes |
| `get_anomalies` | Threshold crossings (temperature or vibration) over a window. | yes |
| `simulate_fault` | Inject a fault (`overheat`, `vibration`, or `combined`) so it surfaces live. | no |

Each tool ships a strict Zod input schema, a documented output schema, and behaviour annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`).

## Quickstart

```bash
npm install
npm run build
npm start
```

`npm start` runs the server on stdio. To try it interactively, use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Or run a scripted end to end session against the built server:

```bash
npm run smoke
```

## Use it from Claude Desktop

Add the server to your Claude Desktop config (`claude_desktop_config.json`), using an absolute path to the built entry point. A ready to edit example lives in [`demo/mcp-config.example.json`](demo/mcp-config.example.json):

```json
{
  "mcpServers": {
    "live-telemetry": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-live-telemetry/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop, then ask it to list devices, pull telemetry for one of them, inject a fault, and check anomalies.

## Adapting this to your data source

The simulator lives entirely under `src/simulator/` and is reached only through the `Simulator` facade in `src/simulator/store.ts`. To point this server at real hardware or an existing API, replace the body of that facade (`listDevices`, `getTelemetry`, `getAnomalies`, `simulateFault`) with calls to your backend, for example a historian, an MQTT broker, or a REST endpoint. The four tools, their schemas, and their output shapes stay exactly the same, so an MCP client that works against the simulator works unchanged against your data.

## Development

```bash
npm test          # run the vitest suite
npm run test:cov  # run tests with coverage thresholds
npm run lint      # eslint
npm run build     # type check and emit dist/
```

A scripted terminal demo lives in [`demo/demo.tape`](demo/demo.tape); render it to an animated GIF with [vhs](https://github.com/charmbracelet/vhs). A step by step live demo script is in [`docs/DEMO.md`](docs/DEMO.md).

## How the simulation works

Readings are a pure function of `(seed, device id, timestamp)`, so any time window is fully reproducible and a sub window always agrees with the wider window on shared timestamps. A healthy machine stays under its anomaly threshold under normal noise; an injected fault always crosses it. Faults are treated as having started two minutes before injection, so they are visible in recent telemetry immediately.

## License

MIT. See [LICENSE](LICENSE).
