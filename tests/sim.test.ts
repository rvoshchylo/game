import { describe, expect, it } from 'vitest';
import { applyOption, chestContents, createRun, levelUpOptions, step, upgradePool, xpForLevel } from '../src/run/sim';
import { createProfile, metaInput } from '../src/run/meta';
import { playRun } from './bot';

const meta = () => metaInput(createProfile());

describe('run simulation', () => {
  it('starts with the character weapon and full hull', () => {
    const r = createRun('unit7', meta(), 1);
    expect(r.weapons.map((w) => w.id)).toEqual(['drill']);
    expect(r.hp).toBe(r.stats.maxHp);
    expect(r.stats.maxHp).toBe(120);
  });

  it('spawns enemies, kills them, drops crystals and levels up', () => {
    const r = createRun('unit7', meta(), 2);
    playRun(r, 60);
    expect(r.kills).toBeGreaterThan(10);
    expect(r.level).toBeGreaterThan(2);
  });

  it('standing still in a crowd eventually kills you', () => {
    const r = createRun('unit7', meta(), 3);
    for (let i = 0; i < 60 * 300 && !r.over; i++) {
      r.pendingLevelUps = 0;
      r.pendingChests = 0;
      step(r, 1 / 60, 0, 0);
    }
    expect(r.over).toBe('dead');
  });

  it('a kiting bot survives the early game', () => {
    const r = createRun('unit7', meta(), 4);
    playRun(r, 120);
    expect(r.over).toBeNull();
  });

  it('level-up offers 3 distinct options and respects slot limits', () => {
    const r = createRun('unit7', meta(), 5);
    const o = levelUpOptions(r);
    expect(o.length).toBe(3);
    expect(new Set(o.map((x) => JSON.stringify(x))).size).toBe(3);
    for (const id of ['bolt', 'saw', 'shock'] as const) applyOption(r, { kind: 'weapon', id, level: 1 });
    expect(upgradePool(r).some((x) => x.kind === 'weapon' && x.level === 1)).toBe(false); // 4 weapons = full
  });

  it('locked weapons are not offered', () => {
    const r = createRun('unit7', meta(), 6);
    expect(upgradePool(r).some((x) => x.kind === 'weapon' && (x.id === 'mortar' || x.id === 'lance'))).toBe(false);
  });

  it('a boss chest evolves a maxed weapon with its passive', () => {
    const r = createRun('unit7', meta(), 7);
    r.weapons[0].level = 5;
    applyOption(r, { kind: 'passive', id: 'amplifier', level: 1 });
    expect(chestContents(r)).toEqual({ kind: 'evolve', id: 'drill' });
    applyOption(r, chestContents(r));
    expect(r.weapons[0].evolved).toBe(true);
    expect(r.evolutions).toContain('drill');
  });

  it('passives change stats', () => {
    const r = createRun('unit7', meta(), 8);
    const speed = r.stats.speed;
    applyOption(r, { kind: 'passive', id: 'servo', level: 1 });
    expect(r.stats.speed).toBeCloseTo(speed * 1.1);
  });

  it('a boss appears at 5:00 and the run is won at 10:00', () => {
    const r = createRun('unit7', meta(), 9);
    r.t = 299.9;
    step(r, 0.2, 0, 0);
    expect(r.enemies.some((e) => e.def.boss)).toBe(true);
    r.t = 599.95;
    r.hp = 1e9;
    step(r, 0.1, 0, 0);
    expect(r.over).toBe('win');
  });

  it('revival brings you back once', () => {
    const p = createProfile();
    p.levels.revival = 1;
    const r = createRun('unit7', metaInput(p), 10);
    r.hp = -1;
    step(r, 1 / 60, 0, 0);
    expect(r.over).toBeNull();
    expect(r.hp).toBeGreaterThan(0);
  });

  it('xp curve grows', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1));
    expect(xpForLevel(30)).toBeGreaterThan(xpForLevel(20));
  });
});
