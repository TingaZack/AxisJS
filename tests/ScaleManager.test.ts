import { describe, it, expect } from "vitest";
import { ScaleManager } from "../src/core/ScaleManager";

describe("ScaleManager", () => {
  it("should calculate optimal step for a zoomed-out scale", () => {
    const manager = new ScaleManager([1, 2, 5]);
    // If scale is 10 pixels per unit, the grid step should be 10
    // (so lines are 100px apart)
    const step = manager.getOptimalStep(10);
    expect(step).toBe(10);
  });

  it("should calculate optimal step for a zoomed-in scale", () => {
    const manager = new ScaleManager([1, 2, 5]);
    // If scale is 100 pixels per unit, the grid step should be 1
    // (so lines are 100px apart)
    const step = manager.getOptimalStep(100);
    expect(step).toBe(1);
  });

  it("should calculate minor steps correctly", () => {
    const manager = new ScaleManager([1, 2, 5]);
    const minor = manager.getMinorStep(10, 5);
    expect(minor).toBe(2);
  });
});
