import type { UpgradeDefinition } from './types';

export const UPGRADES: UpgradeDefinition[] = [
  { id: 'servo', name: 'Servo Arm', description: 'Manual strike damage.', baseCost: 8, growth: 1.19, flag: null },
  { id: 'motor', name: 'Drill Motor', description: 'The drill attacks on its own.', baseCost: 10, growth: 1.19, flag: 'motor' },
  { id: 'plating', name: 'Plating', description: 'Max Integrity and regeneration.', baseCost: 15, growth: 1.2, flag: 'plating' },
  {
    id: 'exchanger',
    name: 'Heat Exchanger',
    description: 'Vent lasts +0.5s per level.',
    baseCost: 60,
    growth: 1.45,
    max: 10,
    flag: 'exchanger',
  },
  {
    id: 'hopper',
    name: 'Scrap Hopper',
    description: 'Offline time cap +1h (base 4h).',
    baseCost: 200,
    growth: 1.8,
    max: 8,
    flag: 'hopper',
  },
  {
    id: 'hull',
    name: 'Probe Hull',
    description: 'Probe failure risk ×0.9 per level.',
    baseCost: 120,
    growth: 1.5,
    max: 10,
    flag: 'hull',
  },
];

export const upgradeById = (id: string): UpgradeDefinition => {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown upgrade ${id}`);
  return u;
};
