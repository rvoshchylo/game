import { describe, expect, it } from 'vitest';
import { buyMeta, createProfile, finishRun, unlockChar, unlockedWeapons } from '../src/run/meta';
import { createRun } from '../src/run/sim';
import { metaInput } from '../src/run/meta';

describe('profile & unlocks', () => {
  it('buys permanent upgrades with gold, capped', () => {
    const p = createProfile();
    p.gold = 10000;
    expect(buyMeta(p, 'revival')).toBe(true);
    expect(buyMeta(p, 'revival')).toBe(false);
    expect(p.levels.revival).toBe(1);
  });

  it('banks a run: gold, stats, stat-based unlocks', () => {
    const p = createProfile();
    const r = createRun('unit7', metaInput(p), 1);
    r.gold = 120;
    r.kills = 2500;
    r.t = 320;
    r.level = 16;
    r.bossKills = 1;
    r.over = 'dead';
    const res = finishRun(p, r);
    expect(p.gold).toBe(120 + Math.floor(2500 / 15) + 5 * 8);
    expect(res.newChars).toEqual(expect.arrayContaining(['sawbones', 'tesla']));
    expect(res.newWeapons).toEqual(expect.arrayContaining(['mortar', 'lance']));
    expect(unlockedWeapons(p)).toContain('lance');
  });

  it('gold-locked robots cost gold', () => {
    const p = createProfile();
    expect(unlockChar(p, 'sparky')).toBe(false);
    p.gold = 300;
    expect(unlockChar(p, 'sparky')).toBe(true);
    expect(p.gold).toBe(50);
  });
});
