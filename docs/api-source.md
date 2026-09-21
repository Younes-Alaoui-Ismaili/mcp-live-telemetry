# Persistent API source

The server still speaks MCP over local stdio. Its source interface accepts asynchronous implementations. The default source remains the existing simulator.

To read the sibling dashboard's authenticated API:

```sh
npm ci
npm run build
# Set TELEMETRY_SOURCE=cloud
# Set TELEMETRY_API_URL to the API base URL
# Set TELEMETRY_API_TOKEN to a Reader bearer token
npm start
```

HTTP is accepted only on loopback. Other endpoints require HTTPS. Credentials in URLs and redirects are refused. Source failures return an error rather than switching to the simulator. Do not expose the stdio server or Ollama on a public port.

The four existing tool names and response contracts remain:

- list_devices reads the latest stored observations.
- get_telemetry returns only observed samples within the requested window, downsampled by step_ms. It does not invent intermediate measurements.
- get_anomalies returns persisted episodes restricted to observed samples in the requested window.
- simulate_fault stays available for compatibility but is rejected with the API source. It works only in the simulator.

Anomaly IDs are persistent SQL episode IDs. API history queries are limited to 24 hours and 10,000 source observations; choose narrower windows for dense data. The existing MCP result limit and offset paginate the sampled response.

## Finite producer

With an Operator token in TELEMETRY_API_TOKEN and the same base URL:

```sh
npm run demo:publish
```

The producer registers four known devices, sends 20 ticks and stops. A combined temperature/vibration fault on press-01 returns to normal before the end. Events carry provenance=simulated and unique run/event identifiers. Repeating the command creates a new demonstration, not a retry of the previous scenario.

For a finite video scenario, run `npm run demo:publish -- --profile azure-video`. It sends 90 ticks, waiting one second between successful batches. PRESS-01 overheats at zero-based tick 20 for 40 seconds; the remaining ticks show recovery. Network request time adds to the total runtime. The default profile is unchanged. Both profiles report the actual accepted count returned by the API and stop on a refused request.

## Real integration proof

Set the token back to Reader:

```sh
node scripts/prove-api.mjs
```

This launches dist/index.js as a subprocess, negotiates MCP over stdio, reads real API records and asserts that fault injection is refused. It writes a timestamped JSON result under evidence/. Run it before and after an application restart without publishing new samples; matching data digests demonstrate the same observations and anomalies were read.

npm test and npm run build verify the existing simulator and API adapter contracts. The API-source unit tests use controlled HTTP responses; scripts/prove-api.mjs is the separate end-to-end check.

A cloud label configures the API source; it does not establish that the endpoint is deployed on Azure. Evidence must identify whether the API ran locally or in Azure.
