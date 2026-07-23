/**
 * Tiny deterministic pseudo-random generator (mulberry32) plus a string hash.
 *
 * We roll our own six-line PRNG rather than add a dependency: it must be seedable
 * and reproducible, which Math.random is not. This is not for cryptographic use.
 */

/** Returns a generator producing floats in [0, 1) for a given 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a style hash of (seed, key) into an unsigned 32-bit integer. */
export function hashSeed(seed: number, key: string): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A generator whose output depends only on (seed, deviceId, timestamp), so the
 * value at a timestamp is identical regardless of the query window it falls in.
 */
export function readingRng(seed: number, deviceId: string, timestamp: number): () => number {
  return mulberry32(hashSeed(seed, `${deviceId}:${timestamp}`));
}
