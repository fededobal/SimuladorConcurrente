import { describe, expect, it } from 'vitest';
import { cubicBezier, slideMs, stepEasing } from './motion';

describe('slideMs', () => {
  it('slideTakesPartOfTheInstant', () => {
    expect(slideMs(300)).toBe(180);
    expect(slideMs(120)).toBe(72);
  });

  it('slideIsCappedOnLongInstants', () => {
    expect(slideMs(600)).toBe(320);
    expect(slideMs(1200)).toBe(320);
  });
});

describe('cubicBezier', () => {
  it('startsAtZeroAndEndsAtOne', () => {
    expect(stepEasing(0)).toBe(0);
    expect(stepEasing(1)).toBe(1);
    expect(stepEasing(-1)).toBe(0);
    expect(stepEasing(2)).toBe(1);
  });

  it('controlPointsOnTheDiagonalAreLinear', () => {
    const linear = cubicBezier(0.25, 0.25, 0.75, 0.75);
    for (const t of [0.1, 0.33, 0.5, 0.9]) expect(linear(t)).toBeCloseTo(t, 4);
  });

  it('neverGoesBackwards', () => {
    let prev = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      const now = stepEasing(t);
      expect(now).toBeGreaterThanOrEqual(prev);
      prev = now;
    }
  });

  it('matchesTheCssCurveAtAKnownPoint', () => {
    // cubic-bezier(0.4, 0, 0.2, 1) vale ~0.7796 a la mitad del tiempo
    expect(stepEasing(0.5)).toBeCloseTo(0.7796, 2);
  });
});
