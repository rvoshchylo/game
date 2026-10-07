import type { StratumDef } from './types';

export const STRATA: StratumDef[] = [
  {
    id: 'rust',
    layers: 8,
    enemies: ['bat', 'rat', 'spider', 'slime', 'ghost'],
    elites: ['cyclops', 'crab'],
    bossId: 'hollow_bell',
    nodeWeights: { fight: 45, cache: 14, rest: 12, event: 15, elite: 14 },
    palette: { bg: 0x120d0b, rock: 0x2a1d17, rockLight: 0x5a3a2a, accent: 0xe0702a },
  },
];

export const stratumById = (id: string): StratumDef => {
  const s = STRATA.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown stratum ${id}`);
  return s;
};
