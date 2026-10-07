import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOSSES, CHARACTERS, ENEMIES, META, PASSIVES, WEAPONS } from '../src/run/data';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { uk } from '../src/i18n/uk';

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : f.endsWith('.ts') ? [join(dir, f)] : []));
const E = en as Record<string, string>;

describe('i18n', () => {
  const keys = Object.keys(en);

  it('every language translates every key', () => {
    for (const dict of [uk, ru] as Record<string, string>[]) for (const k of keys) expect(dict[k], k).toBeTruthy();
  });

  it('placeholders match across languages', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    for (const dict of [uk, ru] as Record<string, string>[]) for (const k of keys) expect(ph(dict[k]), k).toBe(ph(E[k]));
  });

  it('every literal key used in the code exists', () => {
    const missing: string[] = [];
    for (const f of files('src')) {
      if (f.includes('i18n')) continue;
      for (const m of readFileSync(f, 'utf8').matchAll(/\bt\('([a-z][\w.]*)'/g)) if (!(m[1] in en)) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('every content id has its texts', () => {
    const need: string[] = [];
    for (const w of WEAPONS) need.push(`weapon.${w.id}.name`, `weapon.${w.id}.desc`, `weapon.${w.id}.evo`);
    for (const p of PASSIVES) need.push(`passive.${p.id}.name`, `passive.${p.id}.desc`);
    for (const e of [...ENEMIES, ...BOSSES]) need.push(`enemy.${e.id}`);
    for (const b of BOSSES) need.push(`bossname.${b.id}`);
    for (const c of CHARACTERS) {
      need.push(`char.${c.id}.name`, `char.${c.id}.perk`);
      if (c.unlock.kind === 'stat') need.push(`unlock.stat.${c.unlock.stat}`);
    }
    for (const m of META) need.push(`meta.${m.id}.name`, `meta.${m.id}.desc`);
    expect(need.filter((k) => !(k in en))).toEqual([]);
  });
});
