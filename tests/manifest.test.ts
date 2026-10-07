import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import manifest from '../assets/manifest.json';

describe('asset license manifest', () => {
  it('every shipped asset is commercially usable, attributed when required, and its license file ships', () => {
    for (const a of manifest.assets as Record<string, unknown>[]) {
      expect(a.name).toBeTruthy();
      expect(a.license).toBeTruthy();
      if (a.inUse) expect(a.commercialUse).toBe(true);
      if (a.attributionRequired) expect(a.attributionText).toBeTruthy();
      if (a.inUse && typeof a.licenseFile === 'string') expect(existsSync(a.licenseFile)).toBe(true);
    }
  });
});
