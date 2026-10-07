import { CHARACTERS, META, metaCost, WEAPON_UNLOCKS, WEAPONS, type MetaId, type StatKey, type WeaponId } from './data';
import type { MetaInput, Run } from './sim';

export interface Settings {
  /** '' = follow the browser language. */
  lang: string;
  introSeen: boolean;
  sfx: boolean;
  volume: number;
  reducedMotion: boolean;
}

/** Everything that survives between runs (the save file). */
export interface Profile {
  gold: number;
  levels: Record<MetaId, number>;
  chars: string[];
  selectedChar: string;
  stats: Record<StatKey, number>;
  evolutionsFound: WeaponId[];
  enemiesSeen: string[];
  settings: Settings;
}

export const createProfile = (): Profile => ({
  gold: 0,
  levels: Object.fromEntries(META.map((m) => [m.id, 0])) as Record<MetaId, number>,
  chars: ['unit7'],
  selectedChar: 'unit7',
  stats: { runs: 0, kills: 0, bestTime: 0, bossKills: 0, maxLevel: 0, wins: 0, evolutions: 0 },
  evolutionsFound: [],
  enemiesSeen: [],
  settings: { lang: '', introSeen: false, sfx: true, volume: 0.6, reducedMotion: false },
});

const BASE_WEAPONS: WeaponId[] = WEAPONS.map((w) => w.id).filter((id) => !WEAPON_UNLOCKS.some((u) => u.weapon === id));

export function unlockedWeapons(p: Profile): WeaponId[] {
  return [...BASE_WEAPONS, ...WEAPON_UNLOCKS.filter((u) => p.stats[u.stat] >= u.gte).map((u) => u.weapon)];
}

export const metaInput = (p: Profile): MetaInput => ({ levels: { ...p.levels }, unlockedWeapons: unlockedWeapons(p) });

export function buyMeta(p: Profile, id: MetaId): boolean {
  const m = META.find((x) => x.id === id)!;
  const lvl = p.levels[id] ?? 0;
  if (lvl >= m.max) return false;
  const cost = metaCost(m, lvl);
  if (p.gold < cost) return false;
  p.gold -= cost;
  p.levels[id] = lvl + 1;
  return true;
}

export function canUnlockChar(p: Profile, id: string): boolean {
  const c = CHARACTERS.find((x) => x.id === id)!;
  if (p.chars.includes(id)) return false;
  if (c.unlock.kind === 'gold') return p.gold >= c.unlock.cost;
  if (c.unlock.kind === 'stat') return p.stats[c.unlock.stat] >= c.unlock.gte;
  return true;
}

export function unlockChar(p: Profile, id: string): boolean {
  if (!canUnlockChar(p, id)) return false;
  const c = CHARACTERS.find((x) => x.id === id)!;
  if (c.unlock.kind === 'gold') p.gold -= c.unlock.cost;
  p.chars.push(id);
  return true;
}

export interface RunResult {
  result: 'win' | 'dead';
  time: number;
  kills: number;
  level: number;
  gold: number;
  newWeapons: WeaponId[];
  newChars: string[];
  newEvolutions: WeaponId[];
}

/** End-of-run payout on top of collected coins: rewards surviving longer and fighting more. */
export const runBonus = (run: Run): number => Math.floor(run.kills / 15) + Math.floor(run.t / 60) * 8 + (run.over === 'win' ? 150 : 0);

/** Bank a finished run into the profile and report what it unlocked. */
export function finishRun(p: Profile, run: Run): RunResult {
  const weaponsBefore = unlockedWeapons(p);
  const charsReadyBefore = CHARACTERS.filter((c) => c.unlock.kind === 'stat' && p.stats[c.unlock.stat] >= c.unlock.gte).map((c) => c.id);
  const bonus = runBonus(run);
  p.gold += run.gold + bonus;
  p.stats.runs++;
  p.stats.kills += run.kills;
  p.stats.bestTime = Math.max(p.stats.bestTime, Math.floor(run.t));
  p.stats.bossKills += run.bossKills;
  p.stats.maxLevel = Math.max(p.stats.maxLevel, run.level);
  if (run.over === 'win') p.stats.wins++;
  const newEvolutions = run.evolutions.filter((e) => !p.evolutionsFound.includes(e));
  p.evolutionsFound.push(...newEvolutions);
  p.stats.evolutions = p.evolutionsFound.length;
  const newChars = CHARACTERS.filter(
    (c) => c.unlock.kind === 'stat' && !p.chars.includes(c.id) && p.stats[c.unlock.stat] >= c.unlock.gte && !charsReadyBefore.includes(c.id),
  ).map((c) => c.id);
  for (const id of newChars) p.chars.push(id);
  return {
    result: run.over === 'win' ? 'win' : 'dead',
    time: run.t,
    kills: run.kills,
    level: run.level,
    gold: run.gold + bonus,
    newWeapons: unlockedWeapons(p).filter((w) => !weaponsBefore.includes(w)),
    newChars,
    newEvolutions,
  };
}
