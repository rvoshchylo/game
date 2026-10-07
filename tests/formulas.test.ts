import { describe, expect, it } from 'vitest';
import * as F from '../src/core/formulas';

describe('formulas', () => {
  it('enemy hp outgrows scrap reward (soft wall)', () => {
    for (let d = 2; d < 80; d++) {
      expect(F.enemyHp(d) / F.enemyHp(d - 1)).toBeGreaterThan(F.scrapReward(d) / F.scrapReward(d - 1));
    }
  });
  it('upgrade cost is monotonic and integer', () => {
    let prev = 0;
    for (let n = 0; n < 50; n++) {
      const c = F.upgradeCost(8, 1.19, n);
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
  it('strike gets a ×2 spike every 10 levels', () => {
    expect(F.strikeDamage(10) / F.strikeDamage(9)).toBeCloseTo((11 / 10) * 2);
  });
  it('echoes require depth > 5 and grow faster than linearly', () => {
    expect(F.echoesFor(5, 0)).toBe(0);
    expect(F.echoesFor(20, 1)).toBeGreaterThan(F.echoesFor(15, 1));
    expect(F.echoesFor(30, 0) - F.echoesFor(25, 0)).toBeGreaterThan(F.echoesFor(15, 0) - F.echoesFor(10, 0));
    expect(F.nextEchoDepth(12, 0)).toBeGreaterThan(12);
  });
  it('chain multiplier caps', () => {
    expect(F.chainMultiplier(100)).toBe(1 + F.CHAIN_STEP * F.CHAIN_MAX);
  });
  it('offline cap is bounded', () => {
    expect(F.offlineCapHours(0)).toBe(4);
    expect(F.offlineCapHours(100)).toBe(12);
  });
});
