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
    name: 'Workshop',
    icon: 986,
    description: 'Builds modules from blueprints. Each level enlarges the robot’s grid.',
    flag: null,
    levels: [
      { cost: {}, text: 'Grid 3×3, crafting.' },
      { cost: { scrap: 60, copper: 10 }, text: 'Grid 4×3.' },
      { cost: { scrap: 150, copper: 30, cores: 1 }, text: 'Grid 4×4.' },
      { cost: { scrap: 400, copper: 80, cores: 2 }, text: 'Grid 5×4.' },
      { cost: { scrap: 1000, copper: 200, cores: 3 }, text: 'Grid 5×5.' },
    ],
  },
  {
    id: 'storage',
    name: 'Storage',
    icon: 988,
    description: 'How much scrap and copper the camp can hold.',
    flag: 'storage',
    levels: [
      { cost: { scrap: 30 }, text: 'Holds 300 scrap, 60 copper.' },
      { cost: { scrap: 120, copper: 15 }, text: 'Holds 800 scrap, 160 copper.' },
      { cost: { scrap: 400, copper: 60 }, text: 'Holds 2000 scrap, 400 copper.' },
      { cost: { scrap: 1200, copper: 200, cores: 1 }, text: 'Holds 6000 scrap, 1200 copper.' },
    ],
  },
  {
    id: 'dock',
    name: 'Repair Dock',
    icon: 984,
    description: 'Repairs the robot faster between expeditions.',
    flag: 'dock',
    levels: [
      { cost: { scrap: 50, copper: 5 }, text: 'Repairs 3% hull per second at camp.' },
      { cost: { scrap: 160, copper: 25 }, text: 'Repairs 6% hull per second.' },
      { cost: { scrap: 500, copper: 80, cores: 1 }, text: 'Repairs 12% hull per second.' },
    ],
  },
  {
    id: 'radio',
    name: 'Radio Tower',
    icon: 995,
    description: 'Lets you write autopilot rules the robot follows when you are not choosing.',
    flag: 'radio',
    levels: [
      { cost: { scrap: 80, copper: 15 }, text: 'Path priorities and a “return below X% hull” rule.' },
      { cost: { scrap: 220, copper: 40 }, text: 'Rule: avoid elites when hurt.' },
      { cost: { scrap: 500, copper: 90, cores: 1 }, text: 'Rule: relaunch automatically after repairs.' },
    ],
  },
  {
    id: 'forge',
    name: 'Forge',
    icon: 651,
    description: 'Merges two identical modules into one of the next level.',
    flag: 'forge',
    levels: [{ cost: { scrap: 100, copper: 20 }, text: 'Merge modules (up to level 5).' }],
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
