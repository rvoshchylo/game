import type { ZoneDefinition } from './types';

export const ZONES: ZoneDefinition[] = [
  {
    id: 'rust_strata',
    name: 'The Rust Strata',
    fromDepth: 1,
    palette: { bg: 0x120d0b, rock: 0x2a1d17, rockLight: 0x5a3a2a, accent: 0xe0702a },
    enemies: ['rustmite', 'slag_crawler', 'coil_wisp', 'ore_golem'],
    bossId: 'hollow_bell',
    bossEvery: 10,
  },
];

export const zoneForDepth = (depth: number): ZoneDefinition => {
  let zone = ZONES[0];
  for (const z of ZONES) if (depth >= z.fromDepth) zone = z;
  return zone;
};
