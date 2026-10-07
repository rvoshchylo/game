import { describe, expect, it } from 'vitest';
import { makeEngine, run } from './helpers';

describe('camp', () => {
  it('crafts known blueprints only, paying the cost', () => {
    const eng = makeEngine();
    expect(eng.dispatch({ type: 'craft', defId: 'plate' })).toBe(true);
    expect(eng.state.scrap).toBe(10);
    expect(eng.dispatch({ type: 'craft', defId: 'saw' })).toBe(false);
  });

  it('builds only revealed buildings, and the workshop grows the grid', () => {
    const eng = makeEngine((s) => {
      s.scrap = 1000;
      s.copper = 100;
    });
    expect(eng.dispatch({ type: 'build', id: 'storage' })).toBe(false);
    expect(eng.dispatch({ type: 'build', id: 'workshop' })).toBe(true);
    expect(eng.rig.w).toBe(4);
  });

  it('forge merges twins into the next level', () => {
    const eng = makeEngine((s) => {
      s.buildings.forge = 1;
      s.scrap = 100;
      s.modules.push({ uid: 'x', defId: 'plate', level: 1, pos: null }, { uid: 'y', defId: 'plate', level: 1, pos: null });
    });
    expect(eng.dispatch({ type: 'merge', uid: 'x' })).toBe(true);
    expect(eng.state.modules.find((m) => m.uid === 'x')!.level).toBe(2);
    expect(eng.state.modules.some((m) => m.uid === 'y')).toBe(false);
  });

  it('robot repairs at camp, faster with a dock', () => {
    const eng = makeEngine((s) => (s.robot.hp = 10));
    run(eng, 10);
    const slow = eng.state.robot.hp;
    const eng2 = makeEngine((s) => {
      s.robot.hp = 10;
      s.buildings.dock = 1;
    });
    run(eng2, 10);
    expect(eng2.state.robot.hp).toBeGreaterThan(slow);
  });

  it('auto-relaunch with Radio Tower level 3', () => {
    const eng = makeEngine((s) => {
      s.buildings.radio = 3;
      s.autopilot.relaunch = true;
    });
    run(eng, 0.2);
    expect(eng.state.exp).not.toBeNull();
  });
});
