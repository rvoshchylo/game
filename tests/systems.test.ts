import { describe, expect, it } from 'vitest';
import { probeEndsAt } from '../src/core/systems/probes';
import { FORGE_COST } from '../src/data/items';
import { makeEngine, run, T0 } from './helpers';

describe('equipment', () => {
  it('equips modules only into matching slots and changes stats', () => {
    const eng = makeEngine((s) => {
      s.inventory.push({ uid: 'x1', defId: 'seismic_maul', rarity: 'common' }, { uid: 'x2', defId: 'repair_drone', rarity: 'rare' });
    });
    const before = eng.stats.strike;
    expect(eng.dispatch({ type: 'equip', uid: 'x1', slot: 'module1' })).toBe(false);
    expect(eng.dispatch({ type: 'equip', uid: 'x1', slot: 'core' })).toBe(true);
    expect(eng.stats.strike).toBeCloseTo(before * 2);
    expect(eng.dispatch({ type: 'equip', uid: 'x2', slot: 'utility' })).toBe(true);
    expect(eng.stats.regenPct).toBeCloseTo(0.0135);
    expect(eng.dispatch({ type: 'equip', uid: 'x2', slot: 'utility2' })).toBe(false); // needs the memory
  });

  it('rarity scales only the beneficial side', () => {
    const eng = makeEngine((s) => s.inventory.push({ uid: 'm', defId: 'salvage_rake', rarity: 'relic' }));
    eng.dispatch({ type: 'equip', uid: 'm', slot: 'module1' });
    expect(eng.stats.scrapMul).toBeCloseTo(1 + 0.4 * 2.3);
    expect(eng.stats.strikeMul).toBeCloseTo(0.85);
  });

  it('forge spends shards and creates a module', () => {
    const eng = makeEngine((s) => {
      s.flags.push('forge');
      s.shards = FORGE_COST;
    });
    expect(eng.dispatch({ type: 'forge' })).toBe(true);
    expect(eng.state.shards).toBe(0);
    expect(eng.state.inventory.length).toBe(2);
  });
});

describe('probes', () => {
  it('outcome is fixed at launch and collected after the timer', () => {
    const eng = makeEngine((s) => {
      s.flags.push('probes');
      s.maxDepth = 9;
      s.scrap = 1e6;
    });
    expect(eng.dispatch({ type: 'launchProbe', destId: 'collapsed_gallery', stanceId: 'reckless' })).toBe(true);
    const p = eng.state.probes[0];
    const outcome = JSON.stringify(p.outcome);
    expect(eng.dispatch({ type: 'collectProbe', uid: p.uid })).toBe(false);
    eng.tick(0.1, probeEndsAt(p) + 1);
    expect(JSON.stringify(p.outcome)).toBe(outcome);
    const shards = eng.state.shards;
    expect(eng.dispatch({ type: 'collectProbe', uid: p.uid })).toBe(true);
    expect(eng.state.shards).toBe(shards + p.outcome.shards);
    expect(eng.state.probes.length).toBe(0);
  });

  it('respects probe slots', () => {
    const eng = makeEngine((s) => {
      s.flags.push('probes');
      s.maxDepth = 9;
      s.scrap = 1e6;
    });
    expect(eng.dispatch({ type: 'launchProbe', destId: 'shallow_seam', stanceId: 'standard' })).toBe(true);
    expect(eng.dispatch({ type: 'launchProbe', destId: 'shallow_seam', stanceId: 'standard' })).toBe(false);
  });
});

describe('prestige', () => {
  it('collapse grants echoes, resets the run, keeps meta and applies doctrine', () => {
    const eng = makeEngine((s) => {
      s.flags.push('collapse', 'rig');
      s.maxDepth = 20;
      s.depth = 20;
      s.bestDepth = 20;
      s.runWardens = 2;
      s.scrap = 5000;
      s.shards = 100;
      s.upgrades.servo = 30;
      s.logs.push('log_wake');
    });
    eng.dispatch({ type: 'collapse', doctrineId: 'hammer' });
    const s = eng.state;
    expect(s.echoes).toBe(Math.floor(Math.pow(15, 1.5) / 3) + 4);
    expect(s.depth).toBe(1);
    expect(s.scrap).toBe(0);
    expect(s.shards).toBe(10);
    expect(s.upgrades.servo).toBe(0);
    expect(s.bestDepth).toBe(20);
    expect(s.logs).toContain('log_wake');
    expect(s.flags).toContain('rig');
    expect(s.doctrine).toBe('hammer');
    expect(eng.stats.autoMul).toBeCloseTo(0.5);
  });

  it('unspent echoes resonate; spending them on memories is a trade-off', () => {
    const eng = makeEngine((s) => (s.echoes = 10));
    const strong = eng.stats.strike;
    expect(eng.dispatch({ type: 'buyMemory', id: 'muscle_memory' })).toBe(true);
    expect(eng.stats.strike).toBeLessThan(strong);
    expect(eng.state.memories).toContain('muscle_memory');
  });

  it('heirloom survives collapse', () => {
    const eng = makeEngine((s) => {
      s.flags.push('collapse');
      s.memories.push('heirloom');
      s.inventory.push({ uid: 'h', defId: 'governor_relay', rarity: 'epic' });
    });
    eng.dispatch({ type: 'setHeirloom', uid: 'h' });
    eng.dispatch({ type: 'collapse', doctrineId: 'none' });
    expect(eng.state.inventory.map((i) => i.uid)).toContain('h');
    expect(eng.state.equipped.module1).toBe('h');
  });
});

describe('offline', () => {
  it('farms scrap at reduced efficiency, never pushes depth, respects cap', () => {
    const eng = makeEngine((s) => {
      s.upgrades.motor = 10;
      s.upgrades.plating = 10;
      s.depth = 3;
      s.maxDepth = 3;
    });
    const r = eng.catchUp(T0 + 100 * 3600 * 1000);
    expect(r.capped).toBe(true);
    expect(r.countedSec).toBe(4 * 3600);
    expect(r.scrap).toBeGreaterThan(0);
    expect(eng.state.depth).toBeLessThanOrEqual(3);
  });

  it('ignores clock rollback', () => {
    const eng = makeEngine((s) => (s.upgrades.motor = 10));
    const r = eng.catchUp(T0 - 3600 * 1000);
    expect(r.clockAnomaly).toBe(true);
    expect(r.scrap).toBe(0);
    expect(eng.state.stats.clockAnomalies).toBe(1);
  });

  it('drops to a sustainable depth instead of dying repeatedly', () => {
    const eng = makeEngine((s) => {
      s.upgrades.motor = 1;
      s.depth = 30;
      s.maxDepth = 30;
    });
    const r = eng.catchUp(T0 + 3600 * 1000);
    expect(r.farmDepth).toBeLessThan(30);
  });

  it('a drill-less player keeps their depth', () => {
    const eng = makeEngine((s) => (s.depth = 7));
    eng.catchUp(T0 + 3600 * 1000);
    expect(eng.state.depth).toBe(7);
  });
});

describe('discovery', () => {
  it('signals appear after unlock and can be answered', () => {
    const eng = makeEngine((s) => {
      s.flags.push('signals');
      s.nextSignalIn = 0.05;
    });
    run(eng, 0.3);
    expect(eng.state.signal).not.toBeNull();
    eng.dispatch({ type: 'tapSignal' });
    expect(eng.state.signal).toBeNull();
    expect(eng.state.stats.signalsTapped).toBe(1);
  });

  it('unfolds systems via data-driven unlock rules', () => {
    const eng = makeEngine();
    const unlocked: string[] = [];
    eng.bus.on('unlock', (u) => unlocked.push(u.flag));
    eng.state.stats.totalScrap = 10;
    eng.state.maxDepth = 6;
    run(eng, 0.2);
    expect(unlocked).toEqual(expect.arrayContaining(['motor', 'plating', 'push', 'probes']));
  });
});
