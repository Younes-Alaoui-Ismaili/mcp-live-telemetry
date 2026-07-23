# Live demo script (15 minutes)

A timed, step by step walkthrough of `mcp-live-telemetry`. Every step lists the exact command and the one or two sentences to say. No improvisation required.

## Before the call (do this once, off camera)

1. `npm install && npm run build`
2. Open two panes: a terminal in the repo, and an MCP client (Claude Desktop configured with the server, or the MCP Inspector).
3. Confirm the server starts: `npm start` prints `mcp-live-telemetry 0.1.0 running on stdio`, then stop it with Ctrl C.
4. Have `docs/DEMO.md` open on a second screen.

## 0:00 to 2:00 Framing

Say: "This is a Model Context Protocol server. It gives an AI assistant safe, typed access to a system, in this case a small fleet of machines sending temperature and vibration data. I built it as a compact, production shaped example: typed tools, tests, and CI."

Show the README top and the four tools table. Point out that three tools are read only and one mutates state, and that every tool declares that intent through annotations.

## 2:00 to 5:00 Discover the fleet (`list_devices`)

In the client, run `list_devices`.

Say: "The assistant starts by discovering what exists. Each machine reports its latest temperature, vibration, and state. Everything is healthy and running right now."

Point out the structured output: the client receives both a human readable view and machine readable JSON, so it can reason over the data.

## 5:00 to 9:00 Pull a window of history (`get_telemetry`)

Run `get_telemetry` with `device_id` set to `press-01`.

Say: "Now we ask for a time window of readings for one machine. By default it returns the last fifteen minutes at a thirty second cadence."

Show the readings. Then run it again with `limit` set to `10` and point out `has_more` and `next_offset`.

Say: "It paginates, so a client never has to swallow an unbounded response. The window is reproducible: ask for the same window twice and you get the same values."

## 9:00 to 13:00 Inject and detect a fault (`simulate_fault`, then `get_anomalies`)

First run `get_anomalies` with no device.

Say: "Right now there are no anomalies anywhere. Healthy noise never crosses the threshold."

Then run `simulate_fault` with `device_id` set to `press-01` and `fault_type` set to `overheat`.

Say: "This is the live part. I inject an overheating fault on the press. It is treated as having begun a couple of minutes ago, so it is already visible in recent history."

Run `get_anomalies` with `device_id` set to `press-01`.

Say: "And there it is: a temperature anomaly on the press, with the peak value, the threshold it crossed, and how many samples were affected. The assistant saw a healthy system, changed the world, and confirmed the effect, all in one session."

Optionally run `get_telemetry` for `press-01` again to show the raised temperatures directly.

## 13:00 to 15:00 Close and questions

Say: "The point is not the machines. It is that MCP lets an assistant work against a real system through a small, typed, tested contract. Swap the simulator for your historian or API and the same four tools work unchanged."

Show the CI badge (green) and the coverage numbers. Invite questions. Keep [`docs/APPROPRIATION.md`](APPROPRIATION.md) handy for the common ones.

## Fallback if a tool call fails live

Run `npm run smoke`. It performs the whole discover, inject, detect sequence against the built server over stdio and prints the output, so the story still lands from the terminal alone.
