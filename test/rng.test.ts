import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, readingRng } from "../src/simulator/rng.js";

describe("mulberry32", () => {
  it("is deterministic for the same seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it("returns floats in [0, 1)", () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashSeed", () => {
  it("is stable and returns an unsigned 32-bit integer", () => {
    const h = hashSeed(1337, "press-01:1000");
    expect(h).toBe(hashSeed(1337, "press-01:1000"));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });

  it("differs when the key differs", () => {
    expect(hashSeed(1337, "press-01:1000")).not.toBe(hashSeed(1337, "press-01:2000"));
  });
});

describe("readingRng", () => {
  it("depends only on seed, device and timestamp", () => {
    const first = readingRng(7, "dev", 1000)();
    const same = readingRng(7, "dev", 1000)();
    const laterTime = readingRng(7, "dev", 2000)();
    expect(first).toEqual(same);
    expect(first).not.toEqual(laterTime);
  });
});
