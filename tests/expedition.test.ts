import { describe, expect, it } from 'vitest';
import { autopilotChoice, CHOICE_WAIT } from '../src/core/expedition';
import { makeEngine, run, runExpedition } from './helpers';

describe('expedition', () => {
  it('first expedition is a single path, ends with crates deposited and opens forks', () => {
    const eng = makeEngine();
    expect(eng.dispatch({ type: 'launch', tier: 1 })).toBe(true);
    expect(eng.state.exp!.map.slice(0, -1).every((l) => l.length === 1)).toBe(true);
    runExpedition(eng);
    expect(eng.state.exp).toBeNull();
    expect(eng.state.stats.expeditions).toBe(1);
    expect(eng.state.lastReport).not.toBeNull();
    expect(eng.state.flags).toContain('forks');
  });

  it('later expeditions offer choices and wait for the player, then autopilot decides', () => {
    const eng = makeEngine((s) => (s.stats.expeditions = 3));
    eng.dispatch({ type: 'launch', tier: 1 });
    const exp = eng.state.exp!;
    expect(exp.map[1].length).toBeGreaterThanOrEqual(2);
    // layer 0 still forks (only node 0 forced to fight)
    expect(exp.phase).toBe('choose');
    run(eng, CHOICE_WAIT - 1);
    expect(eng.state.exp!.phase).toBe('choose');
    run(eng, 2);
    expect(eng.state.exp!.phase).not.toBe('choose');
  });

  it('player choice is honoured', () => {
    const eng = makeEngine((s) => (s.stats.expeditions = 3));
    eng.dispatch({ type: 'launch', tier: 1 });
    expect(eng.dispatch({ type: 'choose', index: 1 })).toBe(true);
    expect(eng.state.exp!.path[0]).toBe(1);
  });

  it('autopilot follows priorities and rests when hurt', () => {
    const eng = makeEngine();
    const nodes = [{ type: 'fight' as const }, { type: 'cache' as const }, { type: 'rest' as const }];
    expect(autopilotChoice(eng, nodes)).toBe(1);
    eng.state.robot.hp = 5;
    expect(autopilotChoice(eng, nodes)).toBe(2);
  });

  it('a breakdown keeps half the cargo and marks the report', () => {
    const eng = makeEngine();
    eng.dispatch({ type: 'launch', tier: 1 });
    const exp = eng.state.exp!;
    exp.crates = [
      { scrap: 10, copper: 0 },
      { scrap: 10, copper: 0 },
    ];
    // walk into the fight then fail
    run(eng, 5);
    expect(eng.state.exp!.phase).toBe('fight');
    eng.state.robot.hp = 0.01;
    eng.state.robot.shield = 0;
    for (const e of eng.state.exp!.fight!.enemies) e.timer = 0.01;
    runExpedition(eng);
    expect(eng.state.lastReport!.broken).toBe(true);
    expect(eng.state.stats.breakdowns).toBe(1);
    expect(eng.state.flags).toContain('dock');
  });

  it('recall brings everything home', () => {
    const eng = makeEngine();
    eng.dispatch({ type: 'launch', tier: 1 });
    eng.state.exp!.crates.push({ scrap: 7, copper: 2 });
    eng.dispatch({ type: 'recall' });
    runExpedition(eng);
    expect(eng.state.scrap).toBe(20 + 7);
    expect(eng.state.copper).toBe(2);
  });

  it('cannot launch without weapons or with a wrecked hull', () => {
    const eng = makeEngine((s) => (s.robot.hp = 1));
    expect(eng.dispatch({ type: 'launch', tier: 1 })).toBe(false);
  });

  it('a strong rig beats the Warden and unlocks the next tier', () => {
    const eng = makeEngine((s) => {
      s.buildings.workshop = 5;
      s.stats.expeditions = 5;
      s.modules = [
        { uid: 'a', defId: 'drill', level: 5, pos: { x: 0, y: 0, rot: 0 } },
        { uid: 'b', defId: 'hammer', level: 5, pos: { x: 2, y: 0, rot: 0 } },
        { uid: 'c', defId: 'reactor', level: 1, pos: { x: 3, y: 0, rot: 0 } },
        { uid: 'd', defId: 'shield', level: 5, pos: { x: 0, y: 1, rot: 0 } },
        { uid: 'e', defId: 'drone', level: 5, pos: { x: 2, y: 1, rot: 0 } },
        { uid: 'f', defId: 'cargo', level: 5, pos: { x: 0, y: 2, rot: 0 } },
        { uid: 'g', defId: 'cargo', level: 5, pos: { x: 0, y: 3, rot: 0 } },
        { uid: 'h', defId: 'plate', level: 5, pos: { x: 4, y: 4, rot: 0 } },
      ];
      s.robot.hp = 1000;
    });
    eng.state.autopilot.returnWhenFull = false;
    eng.state.autopilot.returnHpPct = 0;
    eng.dispatch({ type: 'launch', tier: 1 });
    runExpedition(eng, 3000);
    expect(eng.state.stats.bossesWon).toBe(1);
    expect(eng.state.tierUnlocked).toBe(2);
    expect(eng.state.cores).toBe(1);
  });
});
