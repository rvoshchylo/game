import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/run/meta';
import { FutureSaveError } from '../src/save/migrations';
import { SAVE_VERSION } from '../src/save/schema';
import { decodeExport, encodeExport, fromSave, toSave } from '../src/save/serializer';

describe('save v4', () => {
  it('round-trips the profile with a valid checksum', () => {
    const p = createProfile();
    p.gold = 77;
    p.chars.push('sparky');
    const { profile, checksumOk } = fromSave(JSON.parse(JSON.stringify(toSave(p, 1))));
    expect(checksumOk).toBe(true);
    expect(profile).toEqual(p);
  });

  it('detects corruption', () => {
    const data = JSON.parse(JSON.stringify(toSave(createProfile(), 1)));
    data.profile.gold = 1e9;
    expect(fromSave(data).checksumOk).toBe(false);
  });

  it('old prototype saves start fresh but keep language settings', () => {
    const v3 = { version: 3, state: { settings: { lang: 'uk', introSeen: true, sfx: false, volume: 0.2, reducedMotion: false } } };
    const r = fromSave(v3);
    expect(r.legacy).toBe(true);
    expect(r.profile.gold).toBe(0);
    expect(r.profile.settings.lang).toBe('uk');
    expect(fromSave({ version: 1, gold: 5 }).legacy).toBe(true);
  });

  it('fills missing fields with defaults', () => {
    const { profile } = fromSave({ version: SAVE_VERSION, profile: { gold: 5 } });
    expect(profile.gold).toBe(5);
    expect(profile.chars).toEqual(['unit7']);
    expect(profile.levels.might).toBe(0);
  });

  it('refuses saves from the future', () => {
    expect(() => fromSave({ version: SAVE_VERSION + 1 })).toThrow(FutureSaveError);
  });

  it('export string round-trips', () => {
    const data = toSave(createProfile(), 1);
    expect(decodeExport(encodeExport(data))).toEqual(JSON.parse(JSON.stringify(data)));
  });
});
