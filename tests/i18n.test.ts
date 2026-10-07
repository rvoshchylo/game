import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../src/data/buildings';
import { BOSSES, ENEMIES } from '../src/data/enemies';
import { EVENTS } from '../src/data/events';
import { COMBOS, LORE_COUNT } from '../src/data/lore';
import { MODULES } from '../src/data/modules';
import { STRATA } from '../src/data/strata';
import { UNLOCKS } from '../src/data/unlocks';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { uk } from '../src/i18n/uk';

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : f.endsWith('.ts') ? [join(dir, f)] : []));

describe('i18n', () => {
  const keys = Object.keys(en);

  it('every language translates every key the English text has', () => {
    for (const dict of [uk, ru] as Record<string, string>[]) {
      for (const k of keys) {
        expect(dict[k], k).toBeDefined();
        if ((en as Record<string, string>)[k]) expect(dict[k], k).not.toBe('');
      }
    }
  });

  it('placeholders match across languages', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    for (const dict of [uk, ru] as Record<string, string>[]) for (const k of keys) expect(ph(dict[k]), k).toBe(ph((en as Record<string, string>)[k]));
  });

  it('every literal key used in the code exists', () => {
    const missing: string[] = [];
    for (const f of files('src')) {
      if (f.includes('i18n')) continue;
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\bt\('([a-z][\w.]*)'/g)) if (!(m[1] in en)) missing.push(`${f}: ${m[1]}`);
      for (const m of src.matchAll(/journal\([^,]+, [^,]+, '([\w.]+)'/g)) if (!(m[1] in en)) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('every content id has its texts', () => {
    const need: string[] = [];
    for (const m of MODULES) need.push(`mod.${m.id}.name`, `mod.${m.id}.desc`, `mod.${m.id}.syn`);
    for (const e of ENEMIES) need.push(`enemy.${e.id}`);
    for (const b of BOSSES) need.push(`boss.${b.id}.name`, `boss.${b.id}.p0`, `boss.${b.id}.p1`, ...b.tags.map((x) => `bosstag.${x}`));
    for (const z of STRATA) need.push(`zone.${z.id}`);
    for (const b of BUILDINGS) need.push(`bld.${b.id}.name`, `bld.${b.id}.desc`, ...b.levels.map((_, i) => `bld.${b.id}.l${i + 1}`));
    for (const ev of EVENTS) {
      need.push(`event.${ev.id}.text`);
      ev.options.forEach((_, i) => need.push(`event.${ev.id}.o${i}`, `event.${ev.id}.o${i}.ok`, `event.${ev.id}.o${i}.fail`));
    }
    for (let i = 0; i < LORE_COUNT; i++) need.push(`lore.${i}`);
    for (const c of COMBOS) need.push(`combo.${c.id}.name`, `combo.${c.id}.text`);
    for (const u of UNLOCKS) need.push(`unlock.${u.flag}`);
    expect(need.filter((k) => !(k in en))).toEqual([]);
  });
});
