import type { EnemyDefinition } from './types';

export const ENEMIES: EnemyDefinition[] = [
  {
    id: 'rustmite',
    name: 'Rustmite',
    hpMul: 0.8,
    atkMul: 0.8,
    attackInterval: 1.8,
    scrapMul: 0.9,
    fractureInterval: 3.2,
    fractureLifetime: 1.7,
    minDepth: 1,
    weight: 10,
    visual: { shape: 'mite', color: 0xc8643a, size: 44 },
  },
  {
    id: 'slag_crawler',
    name: 'Slag Crawler',
    hpMul: 1.35,
    atkMul: 1.1,
    attackInterval: 2.8,
    scrapMul: 1.2,
    fractureInterval: 3.6,
    fractureLifetime: 1.8,
    minDepth: 2,
    weight: 7,
    visual: { shape: 'crawler', color: 0x8a6a52, size: 56 },
  },
  {
    id: 'coil_wisp',
    name: 'Coil Wisp',
    hpMul: 0.9,
    atkMul: 1.25,
    attackInterval: 2.2,
    scrapMul: 1.1,
    fractureInterval: 2.6,
    fractureLifetime: 1.15,
    minDepth: 3,
    weight: 6,
    visual: { shape: 'wisp', color: 0x7fd6c2, size: 44 },
  },
  {
    id: 'ore_golem',
    name: 'Ore Golem',
    hpMul: 2.1,
    atkMul: 1.4,
    attackInterval: 3.6,
    scrapMul: 2.2,
    fractureInterval: 3.9,
    fractureLifetime: 2.0,
    minDepth: 5,
    weight: 4,
    visual: { shape: 'golem', color: 0x9b8f86, size: 64 },
  },
  {
    id: 'glimmerworm',
    name: 'Glimmerworm',
    hpMul: 1.0,
    atkMul: 0,
    attackInterval: 99,
    scrapMul: 0.5,
    fractureInterval: 1.2,
    fractureLifetime: 1.0,
    minDepth: 4,
    weight: 0,
    rare: { fleeAfter: 7, shards: 8, logChance: 0.35 },
    visual: { shape: 'worm', color: 0xffd166, size: 48 },
  },
];

export const RARE_ENEMY_CHANCE = 0.025;

export const enemyById = (id: string): EnemyDefinition => {
  const e = ENEMIES.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown enemy ${id}`);
  return e;
};
