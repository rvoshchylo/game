import { describe, expect, it } from 'vitest';
import { FutureSaveError } from '../src/save/migrations';
import { SAVE_VERSION } from '../src/save/schema';
import { decodeExport, encodeExport, fromSave, toSave } from '../src/save/serializer';
import { makeEngine, run, T0 } from './helpers';

describe('save v3', () => {
  it('round-trips state, including an expedition in progress', () => {
    const eng = makeEngine();
    eng.dispatch({ type: 'launch', tier: 1 });
    run(eng, 6);
    const data = JSON.parse(JSON.stringify(toSave(eng.state, T0)));
    const { state, checksumOk } = fromSave(data, T0);
    expect(checksumOk).toBe(true);
    expect(state.exp).toEqual(eng.state.exp);
    expect(state.modules).toEqual(eng.state.modules);
    expect(state.rngState).toBe(eng.state.rngState);
  });

  it('detects corruption', () => {
    const data = JSON.parse(JSON.stringify(toSave(makeEngine().state, T0)));
    data.state.scrap = 1e9;
    expect(fromSave(data, T0).checksumOk).toBe(false);
  });

  it('clicker-era saves (v1, v2) start fresh and are flagged', () => {
    for (const old of [{ version: 1, gold: 5 }, { version: 2, currencies: { scrap: 9 } }]) {
      const r = fromSave(old, T0);
      expect(r.legacy).toBe(true);
      expect(r.state.scrap).toBe(20);
    }
  });

  it('fills missing fields with defaults', () => {
    const { state } = fromSave({ version: SAVE_VERSION, state: { scrap: 77, buildings: { workshop: 2 } } }, T0);
    expect(state.scrap).toBe(77);
    expect(state.buildings.workshop).toBe(2);
    expect(state.buildings.dock).toBe(0);
    expect(state.autopilot.priority.length).toBe(5);
  });

  it('refuses saves from the future', () => {
    expect(() => fromSave({ version: SAVE_VERSION + 1 }, T0)).toThrow(FutureSaveError);
  });

  it('export string round-trips', () => {
    const data = toSave(makeEngine().state, T0);
    expect(decodeExport(encodeExport(data))).toEqual(JSON.parse(JSON.stringify(data)));
  });
});

describe('offline', () => {
  it('simulates the same expedition while away and reports it', () => {
    const eng = makeEngine();
    eng.dispatch({ type: 'launch', tier: 1 });
    const r = eng.catchUp(T0 + 20 * 60 * 1000);
    expect(eng.state.exp).toBeNull();
    expect(r.expeditions).toBe(1);
    expect(r.journal.length).toBeGreaterThan(0);
  });

  it('caps at 8 hours and ignores clock rollback', () => {
    const eng = makeEngine();
    const r = eng.catchUp(T0 + 30 * 3600 * 1000);
    expect(r.capped).toBe(true);
    const eng2 = makeEngine();
    expect(eng2.catchUp(T0 - 1000).clockAnomaly).toBe(true);
  });
});
