import { describe, expect, it } from 'vitest';
import { TICK } from '../src/core/engine';
import { BASE_KILLS_PER_DEPTH, FRACTURE_MULT, CHAIN_STEP } from '../src/core/formulas';
import { makeEngine, run } from './helpers';

describe('combat', () => {
  it('spawns an enemy and strikes damage it', () => {
    const eng = makeEngine();
    run(eng, 0.5);
    const e = eng.state.enemy!;
    expect(e).toBeTruthy();
    const hp = e.hp;
    eng.dispatch({ type: 'tap', nx: 2, ny: 2 });
    expect(eng.state.enemy!.hp).toBeCloseTo(hp - eng.stats.strike);
  });

  it('fracture hits deal ×FRACTURE_MULT with chain, give shards and heat', () => {
    const eng = makeEngine((s) => {
      s.flags.push('heat');
      s.upgrades.servo = 50; // big numbers, but we only measure one hit
    });
    run(eng, 0.5);
    // wait for a fracture
    let guard = 0;
    while (!eng.state.enemy?.fracture && guard++ < 200) eng.tick(TICK, eng.now + 100);
    const e = eng.state.enemy!;
    const f = e.fracture!;
    e.hp = 1e12;
    e.maxHp = 1e12;
    eng.dispatch({ type: 'tap', nx: f.nx, ny: f.ny });
    expect(1e12 - eng.state.enemy!.hp).toBeCloseTo(eng.stats.strike * FRACTURE_MULT * (1 + CHAIN_STEP));
    expect(eng.state.shards).toBeGreaterThanOrEqual(1);
    expect(eng.state.heat).toBe(20);
    expect(eng.state.chain).toBe(1);
  });

  it('push advances depth after enough kills; hold farms', () => {
    const eng = makeEngine((s) => (s.upgrades.servo = 200));
    let kills = 0;
    eng.bus.on('enemyKilled', () => kills++);
    run(eng, 15, () => eng.dispatch({ type: 'tap', nx: 5, ny: 5 }));
    expect(eng.state.depth).toBeGreaterThan(1);
    expect(kills).toBeGreaterThanOrEqual(BASE_KILLS_PER_DEPTH);
    eng.dispatch({ type: 'setMode', mode: 'hold' });
    const d = eng.state.depth;
    run(eng, 10, () => eng.dispatch({ type: 'tap', nx: 5, ny: 5 }));
    expect(eng.state.depth).toBe(d);
  });

  it('push never walks into a Warden — it needs a challenge', () => {
    const eng = makeEngine((s) => {
      s.depth = 9;
      s.maxDepth = 9;
      s.upgrades.servo = 300;
    });
    run(eng, 20, () => eng.dispatch({ type: 'tap', nx: 5, ny: 5 }));
    expect(eng.state.depth).toBe(9);
    expect(eng.dispatch({ type: 'challengeWarden' })).toBe(true);
    expect(eng.state.depth).toBe(10);
    run(eng, 1);
    expect(eng.state.enemy?.isBoss).toBe(true);
  });

  it('dying retreats one depth, applies rust debt and switches to hold', () => {
    const eng = makeEngine((s) => {
      s.depth = 6;
      s.maxDepth = 6;
    });
    run(eng, 0.5);
    eng.state.integrity = 0.01;
    eng.state.enemy!.attackTimer = 0.01;
    run(eng, 0.3);
    expect(eng.state.depth).toBe(5);
    expect(eng.state.mode).toBe('hold');
    expect(eng.state.rustDebt).toBeGreaterThan(0);
  });

  it('vent requires full heat and multiplies damage', () => {
    const eng = makeEngine((s) => s.flags.push('heat'));
    expect(eng.dispatch({ type: 'vent' })).toBe(false);
    eng.state.heat = 100;
    expect(eng.dispatch({ type: 'vent' })).toBe(true);
    expect(eng.state.ventTime).toBeGreaterThan(0);
  });
});

describe('boss', () => {
  function bossEngine() {
    const eng = makeEngine((s) => {
      s.depth = 9;
      s.maxDepth = 9;
      s.kills = 10;
      s.flags.push('heat');
    });
    eng.dispatch({ type: 'challengeWarden' });
    run(eng, 0.5);
    return eng;
  }

  it('changes phase and enters a shell that weakens auto damage', () => {
    const eng = bossEngine();
    const e = eng.state.enemy!;
    expect(e.isBoss).toBe(true);
    e.hp = e.maxHp * 0.5;
    const phases: string[] = [];
    eng.bus.on('bossPhase', (p) => phases.push(p.name));
    run(eng, 0.2);
    expect(phases).toContain('Shell');
  });

  it('tolls hurt unless countered by a tap in the window', () => {
    const eng = bossEngine();
    const e = eng.state.enemy!;
    eng.state.integrity = eng.stats.maxIntegrity;
    e.tollTimer = 0.3; // inside the 0.45s window
    let tolled = 0;
    eng.bus.on('toll', () => tolled++);
    eng.dispatch({ type: 'tap', nx: 3, ny: 3 });
    expect(eng.state.stats.countersTolled).toBe(1);
    run(eng, 0.5);
    expect(tolled).toBe(0);
  });

  it('fails on timer and retreats', () => {
    const eng = bossEngine();
    eng.state.enemy!.bossTimer = 0.05;
    let failed = false;
    eng.bus.on('bossFailed', () => (failed = true));
    run(eng, 0.3);
    expect(failed).toBe(true);
    expect(eng.state.depth).toBe(9);
  });

  it('defeat grants the unique core once and opens the Warden depth for the run', () => {
    const eng = bossEngine();
    eng.state.enemy!.hp = 0.0001;
    eng.dispatch({ type: 'tap', nx: 3, ny: 3 });
    expect(eng.state.inventory.some((i) => i.defId === 'clapper_core')).toBe(true);
    expect(eng.state.depth).toBe(11);
    expect(eng.state.flags).toContain('collapse');
    // Retreating from 11 lands on 10, which is now an ordinary depth.
    run(eng, 1);
    eng.state.integrity = 0.001;
    eng.state.enemy!.attackTimer = 0.01;
    run(eng, 0.2);
    expect(eng.state.depth).toBe(10);
    run(eng, 2);
    expect(eng.state.enemy?.isBoss).toBe(false);
  });
});
