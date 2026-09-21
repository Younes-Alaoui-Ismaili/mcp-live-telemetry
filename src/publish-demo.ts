import { ApiTelemetrySource } from './api-source.js';
import { profileFor, publishDemo } from './demo-publisher.js';

async function main() {
  const profile = profileFor(process.argv.slice(2));
  const base = process.env.TELEMETRY_API_URL ?? 'http://127.0.0.1:4100';
  const token = process.env.TELEMETRY_API_TOKEN ?? '';
  const source = new ApiTelemetrySource(base, token);
  const post = async (path: string, data: unknown) => {
    const response = await fetch(source.base + '/api/v1' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!response.ok) throw new Error('Publisher request refused: HTTP ' + response.status);
    return response.json() as Promise<{ accepted?: number }>;
  };
  console.log(JSON.stringify(await publishDemo({ profile, post })));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Publisher failed'); process.exitCode = 1; });
