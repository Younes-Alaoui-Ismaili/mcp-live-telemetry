import type { Simulator } from './simulator/store.js';
type Operation = 'listDevices' | 'getTelemetry' | 'getAnomalies' | 'simulateFault';
export type TelemetrySource = { [K in Operation]: (...args: Parameters<Simulator[K]>) => ReturnType<Simulator[K]> | Promise<ReturnType<Simulator[K]>> };
