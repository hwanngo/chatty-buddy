import { describe, it, expect } from 'vitest';
import {
  estimateUsageCost,
  formatEstimatedCost,
  summarizeCosts,
} from './usageCost';

const rates = {
  prompt: { price: 2, unit: 1000000 },
  completion: { price: 8, unit: 1000000 },
  image: { price: 0, unit: 1 },
};
const usage = { promptTokens: 1000, completionTokens: 500, imageTokens: 0 };
describe('cost estimates', () => {
  it('uses distinct input and output rates', () =>
    expect(estimateUsageCost(usage, rates)).toBeCloseTo(0.006));
  it('never invents a rate for unknown or image pricing', () => {
    expect(estimateUsageCost(usage, undefined)).toBeNull();
    expect(estimateUsageCost({ ...usage, imageTokens: 1 }, rates)).toBeNull();
    expect(
      estimateUsageCost(usage, { ...rates, prompt: { price: -1, unit: 0 } })
    ).toBeNull();
  });
  it('labels an incomplete total without subtracting unknown sentinels', () => {
    expect(summarizeCosts([0.5, null, 0.25])).toEqual({
      knownTotal: 0.75,
      complete: false,
    });
    expect(formatEstimatedCost(null, 'Unknown')).toBe('Unknown');
    expect(formatEstimatedCost(0, 'Unknown')).toBe('$0.00');
  });
});
