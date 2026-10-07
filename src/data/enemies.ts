import type { BossDef, EnemyDef } from './types';

export const ENEMIES: EnemyDef[] = [
  { id: 'bat', name: 'Cave Bat', frame: 120, hp: 7, damage: 1.5, interval: 0.9, armor: 0 },
  { id: 'rat', name: 'Rust Rat', frame: 123, hp: 10, damage: 2, interval: 1.4, armor: 0 },
  { id: 'spider', name: 'Wire Spider', frame: 122, hp: 14, damage: 3, interval: 1.8, armor: 1 },
  { id: 'slime', name: 'Slag Slime', frame: 108, hp: 18, damage: 2, interval: 2, armor: 2 },
  { id: 'ghost', name: 'Shaft Ghost', frame: 121, hp: 12, damage: 2.5, interval: 1.2, armor: 0 },
  // elites
  { id: 'cyclops', name: 'Pit Cyclops', frame: 109, hp: 60, damage: 6, interval: 2.2, armor: 3 },
  { id: 'crab', name: 'Rust Crab', frame: 110, hp: 45, damage: 4, interval: 1.6, armor: 6 },
];

export const BOSSES: BossDef[] = [
  {
    id: 'hollow_bell',
    name: 'The Hollow Bell',
    title: 'Warden of the Rust Strata',
    frame: -1,
    hp: 200,
    damage: 3,
    interval: 2,
    armor: 0,
    tags: ['Tolls', 'Armors up'],
    tollDamage: 8,
    tollInterval: 6,
    phase2At: 0.5,
    phase2Armor: 6,
    profile: [
      'Every 6s the Bell tolls: 8 damage that ignores armor — only shields stop it.',
      'Below half health its shell closes: +6 armor. Breakers pierce it.',
    ],
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
