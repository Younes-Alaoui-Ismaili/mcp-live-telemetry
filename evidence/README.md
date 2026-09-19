# Actual API and MCP proof

The records api-2026-09-09T14-21-40-072Z.json and api-2026-09-09T14-57-26-841Z.json come from a real SDK client launching the MCP server over stdio. The server reads the authenticated dashboard API backed by local SQL Server.

Both records contain data digest 7a72a902f813499e9fe0012096459590f096e13d2bfe8b37fcadc13c0c3b8782. Between the runs, the API process and SQL container were restarted. Four devices, twenty persisted press-01 readings and two anomalies remained readable. Fault injection was rejected for the API source.

These first two records prove local persistence and transport integration. The measurements are synthetic, not a live industrial installation. The dashboard repository contains the local browser recording.

## Actual Azure API proof

[Before operations](api-2026-09-10T11-53-15-256Z.json) and [after operations](api-2026-09-10T12-27-22-781Z.json) read the authenticated Azure application through an actual MCP stdio subprocess with a Reader token. Between them, App Service was restarted, the preceding application package was deployed and the final version restored, and this application's SQL access was temporarily interrupted and restored.

Both records have digest 739136450bd6267daaa2565b1d5de24c1dbac16e1f1babd3eedd41079f3735b2: four devices, twenty press-01 readings and two anomalies. API mode rejected simulate_fault. The finite producer sent 80 measurements across all four devices. Azure operation and recovery records are in the sibling dashboard's evidence/azure directory.

MCP still runs locally over stdio; only its authenticated API adapter accesses Azure. This is an actual cloud integration using synthetic observations, with no physical sensor or customer production claim.

## Reproduce

Build this repository, start the dashboard API and configure TELEMETRY_API_URL and a Reader TELEMETRY_API_TOKEN. Then run:

```sh
node scripts/prove-api.mjs
```

Use a separate Operator token for npm run demo:publish. Re-run the proof after restarting your demonstration API and compare digest in the two timestamped records. Do not replace a failed API source with simulator data. [API source setup](../docs/api-source.md) documents the environment and preserved tool contract.
