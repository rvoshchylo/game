import type { BossDefinition } from './types';

export const BOSSES: BossDefinition[] = [
  {
    id: 'hollow_bell',
    name: 'The Hollow Bell',
    title: 'Warden of the Rust Strata',
    hpMul: 20,
    timer: 75,
    tags: ['Tolling', 'Shelled', 'Timed'],
    tollInterval: 6,
    tollDamagePct: 0.15,
    tollWindow: 0.45,
    fractureInterval: 2.4,
    fractureLifetime: 1.4,
    scrapMul: 25,
    shardReward: 10,
    firstKillItem: 'clapper_core',
    phases: [
      { below: 1, name: 'Toll', description: 'Every toll cracks your frame.', rules: [] },
      {
        below: 0.6,
        name: 'Shell',
        description: 'The bell closes. Only fractures ring true. Vent breaks the shell.',
        shell: true,
        rules: [
          { kind: 'autoMul', value: 0.2 },
          { kind: 'strikeMul', value: 0.35 },
          { kind: 'fractureMul', value: 1.5 },
        ],
      },
      {
        below: 0.25,
        name: 'Resonance',
        description: 'The tolls come faster.',
        rules: [{ kind: 'tollInterval', value: 3 }],
      },
    ],
    visual: { shape: 'bell', color: 0xb08d57, size: 110 },
  },
];

export const bossById = (id: string): BossDefinition => {
  const b = BOSSES.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown boss ${id}`);
  return b;
};
