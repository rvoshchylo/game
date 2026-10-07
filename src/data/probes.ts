import type { ExpeditionDefinition, StanceDefinition } from './types';

export const EXPEDITIONS: ExpeditionDefinition[] = [
  {
    id: 'shallow_seam',
    name: 'Shallow Seam',
    description: 'A safe vein near the shaft. Reliable scrap.',
    duration: 120,
    risk: 0,
    costMul: 4,
    unlock: { metric: 'maxDepth', gte: 6 },
    rewards: { scrapKills: 40, shards: 3, itemChance: 0, minRarity: 'common', logChance: 0 },
  },
  {
    id: 'collapsed_gallery',
    name: 'Collapsed Gallery',
    description: 'Old tunnels. Shards and the odd module, if the roof holds.',
    duration: 480,
    risk: 0.15,
    costMul: 12,
    unlock: { metric: 'maxDepth', gte: 8 },
    rewards: { scrapKills: 20, shards: 15, itemChance: 0.3, minRarity: 'common', logChance: 0.1 },
  },
  {
    id: 'abyssal_fissure',
    name: 'Abyssal Fissure',
    description: 'Something below the Warden hums. Most probes do not return.',
    duration: 1800,
    risk: 0.4,
    costMul: 40,
    unlock: { metric: 'wardens', gte: 1 },
    rewards: { scrapKills: 0, shards: 60, itemChance: 0.8, minRarity: 'rare', logChance: 0.35 },
  },
];

export const STANCES: StanceDefinition[] = [
  { id: 'cautious', name: 'Cautious', riskMul: 0.5, rewardMul: 0.7 },
  { id: 'standard', name: 'Standard', riskMul: 1, rewardMul: 1 },
  { id: 'reckless', name: 'Reckless', riskMul: 1.5, rewardMul: 1.6 },
];

export const expeditionById = (id: string): ExpeditionDefinition => {
  const e = EXPEDITIONS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown expedition ${id}`);
  return e;
};
export const stanceById = (id: string): StanceDefinition => {
  const s = STANCES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown stance ${id}`);
  return s;
};
