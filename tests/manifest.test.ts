import { describe, expect, it } from 'vitest';
import manifest from '../assets/manifest.json';

describe('asset license manifest', () => {
  it('every shipped asset is commercially usable and attributed when required', () => {
    for (const a of manifest.assets) {
      expect(a.name).toBeTruthy();
      expect(a.license).toBeTruthy();
      if (a.inUse) expect(a.commercialUse).toBe(true);
      if (a.attributionRequired) expect((a as { attributionText?: string }).attributionText).toBeTruthy();
    }
  });
});
