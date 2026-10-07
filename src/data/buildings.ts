import type { BuildingDef } from './types';

/** Grid size (w×h) per Workshop level. */
export const GRID_SIZES: [number, number][] = [
  [3, 3],
  [4, 3],
  [4, 4],
  [5, 4],
  [5, 5],
];

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'workshop',
    icon: 986,
    flag: null,
    levels: [
      { cost: {} },
      { cost: { scrap: 60, copper: 10 } },
      { cost: { scrap: 150, copper: 30, cores: 1 } },
      { cost: { scrap: 400, copper: 80, cores: 2 } },
      { cost: { scrap: 1000, copper: 200, cores: 3 } },
    ],
  },
  {
    id: 'storage',
    icon: 988,
    flag: 'storage',
    levels: [
      { cost: { scrap: 30 } },
      { cost: { scrap: 120, copper: 15 } },
      { cost: { scrap: 400, copper: 60 } },
      { cost: { scrap: 1200, copper: 200, cores: 1 } },
    ],
  },
  {
    id: 'dock',
    icon: 984,
    flag: 'dock',
    levels: [
      { cost: { scrap: 50, copper: 5 } },
      { cost: { scrap: 160, copper: 25 } },
      { cost: { scrap: 500, copper: 80, cores: 1 } },
    ],
  },
  {
    id: 'radio',
    icon: 995,
    flag: 'radio',
    levels: [
      { cost: { scrap: 80, copper: 15 } },
      { cost: { scrap: 220, copper: 40 } },
      { cost: { scrap: 500, copper: 90, cores: 1 } },
    ],
  },
  {
    id: 'forge',
    icon: 651,
    flag: 'forge',
    levels: [{ cost: { scrap: 100, copper: 20 } }],
  },
];

export const STORAGE_CAPS: { scrap: number; copper: number }[] = [
  { scrap: 120, copper: 25 }, // before Storage is built
  { scrap: 300, copper: 60 },
  { scrap: 800, copper: 160 },
  { scrap: 2000, copper: 400 },
  { scrap: 6000, copper: 1200 },
];

export const DOCK_REPAIR = [0.01, 0.03, 0.06, 0.12];

export const buildingById = (id: string): BuildingDef => {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown building ${id}`);
  return b;
};
