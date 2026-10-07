import { describe, expect, it } from 'vitest';
import { canPlace, computeRig, shapeCells } from '../src/core/grid';
import { makeEngine } from './helpers';

describe('shapes', () => {
  it('rotates and normalises', () => {
    expect(shapeCells('2', 0)).toEqual([[0, 0], [1, 0]]);
    expect(shapeCells('2', 1).sort()).toEqual([[0, 0], [0, 1]]);
    expect(shapeCells('L', 2).length).toBe(3);
    for (let r = 0; r < 4; r++) for (const [x, y] of shapeCells('L', r)) expect(Math.min(x, y)).toBeGreaterThanOrEqual(0);
  });
});

describe('placement', () => {
  it('rejects overlaps and out-of-bounds', () => {
    const eng = makeEngine((s) => s.modules.push({ uid: 'p', defId: 'plate', level: 1, pos: null }));
    const s = eng.state;
    expect(canPlace(s, 'p', { x: 0, y: 1, rot: 0 })).toBe(false); // drill is there
    expect(canPlace(s, 'p', { x: 3, y: 0, rot: 0 })).toBe(false);
    expect(canPlace(s, 'p', { x: 0, y: 0, rot: 0 })).toBe(true);
    expect(eng.dispatch({ type: 'place', uid: 'p', x: 0, y: 0, rot: 0 })).toBe(true);
    expect(eng.rig.placed.length).toBe(3);
  });

  it('cannot rebuild while the robot is away', () => {
    const eng = makeEngine((s) => s.modules.push({ uid: 'p', defId: 'plate', level: 1, pos: null }));
    eng.dispatch({ type: 'launch', tier: 1 });
    expect(eng.dispatch({ type: 'place', uid: 'p', x: 0, y: 0, rot: 0 })).toBe(false);
  });
});

describe('rig stats & synergies', () => {
  it('battery adjacent to a weapon charges it', () => {
    const eng = makeEngine();
    const base = eng.rig.weapons[0].damage;
    eng.dispatch({ type: 'unplace', uid: 'm2' });
    eng.state.modules.find((m) => m.uid === 'm2')!.pos = { x: 2, y: 1, rot: 0 }; // drill covers (0,1)-(1,1): battery at (2,1) touches
    eng.invalidate();
    expect(eng.rig.weapons[0].damage).toBeCloseTo(base);
    eng.dispatch({ type: 'unplace', uid: 'm2' });
    eng.dispatch({ type: 'place', uid: 'm2', x: 2, y: 2, rot: 0 }); // not adjacent
    expect(eng.rig.weapons[0].damage).toBeLessThan(base);
  });

  it('cooler speeds up adjacent weapons and is a discovery with two', () => {
    const eng = makeEngine((s) => {
      s.modules.push({ uid: 'c', defId: 'cooler', level: 1, pos: { x: 1, y: 0, rot: 0 } });
      s.modules.push({ uid: 'h', defId: 'hammer', level: 1, pos: { x: 2, y: 0, rot: 0 } });
    });
    expect(eng.rig.weapons.find((w) => w.uid === 'm1')!.interval).toBeCloseTo(1.2 * 0.8);
    expect(eng.state.combos).toContain('thermal_loop');
  });

  it('underpowered rigs slow down', () => {
    const eng = makeEngine((s) => {
      s.modules = s.modules.filter((m) => m.defId !== 'battery');
      s.modules.push({ uid: 'h', defId: 'hammer', level: 1, pos: { x: 0, y: 0, rot: 0 } });
    });
    expect(eng.rig.efficiency).toBe(0.4);
    expect(eng.rig.weapons[0].interval).toBeGreaterThan(1.2);
  });

  it('plates in corners are stronger; levels scale stats', () => {
    const eng = makeEngine((s) => {
      s.modules.push({ uid: 'a', defId: 'plate', level: 1, pos: { x: 0, y: 0, rot: 0 } });
      s.modules.push({ uid: 'b', defId: 'plate', level: 2, pos: { x: 1, y: 0, rot: 0 } });
    });
    expect(eng.rig.armor).toBeCloseTo(3 * 1.5 + 3 * 1.5);
    expect(computeRig(eng.state).combos).not.toContain('bastion');
  });

  it('reactor heat hurts uncooled neighbours; a cooler contains it', () => {
    const eng = makeEngine((s) => {
      s.buildings.workshop = 3;
      s.modules.push({ uid: 'r', defId: 'reactor', level: 1, pos: { x: 2, y: 2, rot: 0 } });
    });
    const note = () => eng.rig.placed.find((p) => p.inst.uid === 'm2')!.notes.map((n) => n.k).join();
    expect(note()).toContain('note.hot');
    eng.state.modules.push({ uid: 'c', defId: 'cooler', level: 1, pos: null });
    expect(eng.dispatch({ type: 'place', uid: 'c', x: 3, y: 1, rot: 0 })).toBe(true);
    expect(note()).not.toContain('note.hot');
  });

  it('magnets add cargo to adjacent holds', () => {
    const eng = makeEngine((s) => {
      s.modules.push({ uid: 'k', defId: 'cargo', level: 1, pos: { x: 0, y: 2, rot: 0 } });
      s.modules.push({ uid: 'g', defId: 'magnet', level: 1, pos: { x: 2, y: 2, rot: 0 } });
    });
    expect(eng.rig.cargo).toBe(3 + 2 + 1);
  });
});
