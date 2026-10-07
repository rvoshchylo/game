import type { BossDef, EnemyDef } from './types';

export const ENEMIES: EnemyDef[] = [
  { id: 'bat', frame: 120, hp: 7, damage: 1.5, interval: 0.9, armor: 0 },
  { id: 'rat', frame: 123, hp: 10, damage: 2, interval: 1.4, armor: 0 },
  { id: 'spider', frame: 122, hp: 14, damage: 3, interval: 1.8, armor: 1 },
  { id: 'slime', frame: 108, hp: 18, damage: 2, interval: 2, armor: 2 },
  { id: 'ghost', frame: 121, hp: 12, damage: 2.5, interval: 1.2, armor: 0 },
  // elites
  { id: 'cyclops', frame: 109, hp: 60, damage: 6, interval: 2.2, armor: 3 },
  { id: 'crab', frame: 110, hp: 45, damage: 4, interval: 1.6, armor: 6 },
];

export const BOSSES: BossDef[] = [
  {
    id: 'hollow_bell',
    frame: -1,
    hp: 200,
    damage: 3,
    interval: 2,
    armor: 0,
    tags: ['tolls', 'armor'],
    tollDamage: 8,
    tollInterval: 6,
    phase2At: 0.5,
    phase2Armor: 6,
  },
];

export const enemyById = (id: string): EnemyDef => {
  const e = ENEMIES.find((x) => x.id === id) ?? BOSSES.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown enemy ${id}`);
  return e;
};
export const bossById = (id: string): BossDef => {
  const b = BOSSES.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown boss ${id}`);
  return b;
};
