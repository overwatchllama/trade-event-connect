import { describe, it, expect } from 'vitest';
import { allocateLotCost } from './allocateLotCost';

describe('allocateLotCost', () => {
  it('handles empty input', () => {
    expect(allocateLotCost([], 100, 10, 5, 'even')).toEqual([]);
  });

  it('even split of 00 across 4 equal lines', () => {
    const lines = [
      { id: '1', quantity: 1, marketValue: null },
      { id: '2', quantity: 1, marketValue: null },
      { id: '3', quantity: 1, marketValue: null },
      { id: '4', quantity: 1, marketValue: null },
    ];
    const result = allocateLotCost(lines, 100, 0, 0, 'even');
    expect(result.every(r => r.lineTotal === 25)).toBe(true);
    expect(result.reduce((s, r) => s + r.lineTotal, 0)).toBe(100);
  });

  it('weighted split: $10 card and $90 card share $100 lot', () => {
    const lines = [
      { id: '1', quantity: 1, marketValue: 10 },
      { id: '2', quantity: 1, marketValue: 90 },
    ];
    const result = allocateLotCost(lines, 100, 0, 0, 'market_weighted');
    expect(result[0].lineTotal).toBe(10);
    expect(result[1].lineTotal).toBe(90);
    expect(result[0].sharePct).toBe(0.1);
    expect(result[1].sharePct).toBe(0.9);
  });

  it('zero-market fallback to even', () => {
    const lines = [
      { id: '1', quantity: 1, marketValue: 0 },
      { id: '2', quantity: 1, marketValue: 0 },
    ];
    const result = allocateLotCost(lines, 100, 0, 0, 'market_weighted');
    expect(result[0].lineTotal).toBe(50);
    expect(result[1].lineTotal).toBe(50);
  });

  it('penny reconciliation: $10.01 across 3 equal-qty lines', () => {
    const lines = [
      { id: '1', quantity: 1, marketValue: null },
      { id: '2', quantity: 1, marketValue: null },
      { id: '3', quantity: 1, marketValue: null },
    ];
    const result = allocateLotCost(lines, 10.01, 0, 0, 'even');
    const totals = result.map(r => r.lineTotal);
    // 10.01 / 3 = 3.3366... -> 3.34, 3.34, 3.33
    expect(totals).toContain(3.34);
    expect(totals).toContain(3.33);
    expect(result.reduce((s, r) => s + r.lineTotal, 0)).toBe(10.01);
    // Check deterministic: first two get the extra penny because weights are equal and they come first
    expect(result[0].lineTotal).toBe(3.34);
    expect(result[1].lineTotal).toBe(3.34);
    expect(result[2].lineTotal).toBe(3.33);
  });

  it('single-line edge case', () => {
    const lines = [{ id: '1', quantity: 2, marketValue: 10 }];
    const result = allocateLotCost(lines, 10, 5, 2, 'market_weighted');
    expect(result[0].lineTotal).toBe(10);
    expect(result[0].shipShare).toBe(5);
    expect(result[0].feeShare).toBe(2);
    expect(result[0].unitCost).toBe(5);
  });

  it('ship + fees allocate independently and sum matches', () => {
    const lines = [
      { id: '1', quantity: 1, marketValue: 10 },
      { id: '2', quantity: 1, marketValue: 20 },
      { id: '3', quantity: 1, marketValue: 70 },
    ];
    const shipping = 10.05;
    const fees = 7.77;
    const lotTotal = 200;
    
    const result = allocateLotCost(lines, lotTotal, shipping, fees, 'market_weighted');
    
    const sumLineTotal = result.reduce((s, r) => s + r.lineTotal, 0);
    const sumShip = result.reduce((s, r) => s + r.shipShare, 0);
    const sumFees = result.reduce((s, r) => s + r.feeShare, 0);
    
    expect(Math.round(sumLineTotal * 100)).toBe(Math.round(lotTotal * 100));
    expect(Math.round(sumShip * 100)).toBe(Math.round(shipping * 100));
    expect(Math.round(sumFees * 100)).toBe(Math.round(fees * 100));
  });
});
