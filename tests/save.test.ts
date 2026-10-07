import { describe, expect, it } from 'vitest';
import { FutureSaveError } from '../src/save/migrations';
import { SAVE_VERSION } from '../src/save/schema';
import { decodeExport, encodeExport, fromSave, toSave } from '../src/save/serializer';
import { makeEngine, run, T0 } from './helpers';

describe('save', () => {
  it('round-trips state with a valid checksum', () => {
    const eng = makeEngine((s) => {
      s.upgrades.servo = 50;
      s.flags.push('heat', 'rig');
      s.echoes = 7;
      s.inventory.push({ uid: 'i5', defId: 'governor_relay', rarity: 'epic' });
      s.equipped.module1 = 'i5';
    });
    run(eng, 5, () => eng.dispatch({ type: 'tap', nx: 5, ny: 5 }));
    const data = JSON.parse(JSON.stringify(toSave(eng.state, T0)));
    const { state, checksumOk } = fromSave(data, T0);
    expect(checksumOk).toBe(true);
    expect(state.depth).toBe(eng.state.depth);
    expect(state.scrap).toBeCloseTo(eng.state.scrap);
    expect(state.equipped.module1).toBe('i5');
    expect(state.flags).toEqual(eng.state.flags);
    expect(state.rngState).toBe(eng.state.rngState);
    expect(state.enemy).toBeNull();
  });

  it('detects tampering/corruption via checksum', () => {
    const eng = makeEngine();
    const data = JSON.parse(JSON.stringify(toSave(eng.state, T0)));
    data.currencies.scrap = 1e9;
    expect(fromSave(data, T0).checksumOk).toBe(false);
  });

  it('migrates a v1 prototype save', () => {
    const v1 = { version: 1, gold: 123, depth: 4, upgrades: { servo: 3, motor: 2 }, lastSaved: T0 - 1000 };
    const { state, migratedFrom } = fromSave(v1, T0);
    expect(migratedFrom).toBe(1);
    expect(state.scrap).toBe(123);
    expect(state.depth).toBe(4);
    expect(state.upgrades.servo).toBe(3);
    expect(state.upgrades.plating).toBe(0);
    expect(state.inventory.length).toBe(1);
  });

  it('fills missing fields with defaults and ignores unknown ones', () => {
    const { state } = fromSave({ version: SAVE_VERSION, currencies: { scrap: 5 }, weird: true }, T0);
    expect(state.scrap).toBe(5);
    expect(state.upgrades.motor).toBe(0);
    expect(state.stats.kills).toBe(0);
  });

  it('refuses saves from the future', () => {
    expect(() => fromSave({ version: SAVE_VERSION + 1 }, T0)).toThrow(FutureSaveError);
  });

  it('never resumes mid-Warden', () => {
    const eng = makeEngine((s) => {
      s.depth = 10;
      s.maxDepth = 10;
    });
    const { state } = fromSave(JSON.parse(JSON.stringify(toSave(eng.state, T0))), T0);
    expect(state.depth).toBe(9);
  });

  it('export/import string round-trips', () => {
    const data = toSave(makeEngine().state, T0);
    expect(decodeExport(encodeExport(data))).toEqual(JSON.parse(JSON.stringify(data)));
  });
});
