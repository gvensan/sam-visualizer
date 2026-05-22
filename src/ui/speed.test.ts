import { describe, expect, it } from "vitest";
import { positionToSpeed, NORMAL_SPEED } from "./App";

describe("positionToSpeed", () => {
  it("returns the slower NORMAL_SPEED baseline at position 0", () => {
    expect(positionToSpeed(0)).toBe(NORMAL_SPEED);
    expect(NORMAL_SPEED).toBeLessThan(1); // sanity — the baseline is slow
  });

  it("scales by factor 2 at the ±2 extremes (relative to Normal)", () => {
    expect(positionToSpeed(2)).toBeCloseTo(NORMAL_SPEED * 2, 6);
    expect(positionToSpeed(-2)).toBeCloseTo(NORMAL_SPEED / 2, 6);
  });

  it("is symmetric in factor space — fast(P) * slow(P) = NORMAL_SPEED^2", () => {
    for (const p of [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]) {
      const fast = positionToSpeed(p);
      const slow = positionToSpeed(-p);
      expect(fast * slow).toBeCloseTo(NORMAL_SPEED * NORMAL_SPEED, 6);
    }
  });

  it("is monotonic over the slider range", () => {
    let prev = positionToSpeed(-2);
    for (let p = -1.75; p <= 2; p += 0.25) {
      const cur = positionToSpeed(p);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });
});
