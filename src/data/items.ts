import type { ItemDefinition, Rarity } from './types';

export const ITEMS: ItemDefinition[] = [
  // ── Cores: define how you fight ──
  {
    id: 'piston_bit',
    name: 'Piston Bit',
    slot: 'core',
    archetype: 'Balanced',
    description: 'The bit you woke up with. Honest, unremarkable.',
    effects: [],
  },
  {
    id: 'seismic_maul',
    name: 'Seismic Maul',
    slot: 'core',
    archetype: 'Striker',
    description: 'Your hands do the work. Strikes ×2, fractures ×1.5, but the drill idles (auto ×0.6).',
    effects: [
      { stat: 'strikeMul', op: 'mul', value: 2, scales: true },
      { stat: 'fractureMul', op: 'mul', value: 1.5, scales: true },
      { stat: 'autoMul', op: 'mul', value: 0.6 },
    ],
  },
  {
    id: 'spinner_auger',
    name: 'Spinner Auger',
    slot: 'core',
    archetype: 'Engine',
    description: 'The drill does the work. Auto ×1.6, strikes ×0.5.',
    effects: [
      { stat: 'autoMul', op: 'mul', value: 1.6, scales: true },
      { stat: 'strikeMul', op: 'mul', value: 0.5 },
    ],
  },
  {
    id: 'clapper_core',
    name: 'Clapper Core',
    slot: 'core',
    archetype: 'Breaker',
    unique: true,
    description: "The Bell's tongue. Vent heals 30% and lasts +3s. Each toll you suffer feeds +25 Heat.",
    effects: [
      { stat: 'ventHeal', op: 'add', value: 0.3, scales: true },
      { stat: 'ventDurationAdd', op: 'add', value: 3, scales: true },
      { stat: 'tollHeat', op: 'add', value: 25, scales: true },
    ],
  },
  // ── Modules: change behaviour ──
  {
    id: 'governor_relay',
    name: 'Governor Relay',
    slot: 'module',
    archetype: 'Engine',
    description: 'Strikes fractures for you — 35% of them.',
    effects: [{ stat: 'governorChance', op: 'add', value: 0.35, scales: true }],
  },
  {
    id: 'prospector_lens',
    name: 'Prospector Lens',
    slot: 'module',
    archetype: 'Prospector',
    description: '+1 Shard per fracture, but fractures open 20% less often.',
    effects: [
      { stat: 'fractureShards', op: 'add', value: 1, scales: true },
      { stat: 'fractureFreqMul', op: 'mul', value: 0.8 },
    ],
  },
  {
    id: 'salvage_rake',
    name: 'Salvage Rake',
    slot: 'module',
    archetype: 'Prospector',
    description: 'Scrap +40%, strikes −15%.',
    effects: [
      { stat: 'scrapMul', op: 'mul', value: 1.4, scales: true },
      { stat: 'strikeMul', op: 'mul', value: 0.85 },
    ],
  },
  {
    id: 'overclock_coil',
    name: 'Overclock Coil',
    slot: 'module',
    archetype: 'Deepdiver',
    description: 'Strikes +100%. Every manual strike burns 0.5% of your Integrity.',
    effects: [
      { stat: 'strikeMul', op: 'mul', value: 2, scales: true },
      { stat: 'strikeIntegrityCost', op: 'add', value: 0.005 },
    ],
  },
  {
    id: 'bulwark_plates',
    name: 'Bulwark Plates',
    slot: 'module',
    archetype: 'Deepdiver',
    description: 'Max Integrity +50%, auto −10%.',
    effects: [
      { stat: 'integrityMul', op: 'mul', value: 1.5, scales: true },
      { stat: 'autoMul', op: 'mul', value: 0.9 },
    ],
  },
  {
    id: 'thermal_siphon',
    name: 'Thermal Siphon',
    slot: 'module',
    archetype: 'Engine',
    description: 'The drill itself builds Heat (+2/s). Vent without touching.',
    effects: [{ stat: 'heatFromAuto', op: 'add', value: 2, scales: true }],
  },
  {
    id: 'echo_antenna',
    name: 'Echo Antenna',
    slot: 'module',
    archetype: 'Courier',
    description: 'Strange Signals ×3, rare creatures ×2.',
    effects: [
      { stat: 'signalMul', op: 'mul', value: 3, scales: true },
      { stat: 'rareMul', op: 'mul', value: 2, scales: true },
    ],
  },
  // ── Utility ──
  {
    id: 'repair_drone',
    name: 'Repair Drone',
    slot: 'utility',
    archetype: 'Deepdiver',
    description: 'Regenerates +1% Integrity per second.',
    effects: [{ stat: 'regenPct', op: 'add', value: 0.01, scales: true }],
  },
  {
    id: 'probe_bay',
    name: 'Probe Bay',
    slot: 'utility',
    archetype: 'Courier',
    description: '+1 Probe slot. Probes return 10% faster.',
    effects: [
      { stat: 'probeSlots', op: 'add', value: 1 },
      { stat: 'probeTimeMul', op: 'mul', value: 0.9 },
    ],
  },
  {
    id: 'depth_gauge',
    name: 'Depth Gauge',
    slot: 'utility',
    archetype: 'Courier',
    description: 'One fewer kill needed per depth.',
    effects: [{ stat: 'killsPerDepthDelta', op: 'add', value: -1 }],
  },
];

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'relic'];
export const RARITY_SCALE: Record<Rarity, number> = { common: 1, rare: 1.35, epic: 1.75, relic: 2.3 };
export const RARITY_WEIGHTS: Record<Rarity, number> = { common: 70, rare: 22, epic: 7, relic: 1 };
export const SALVAGE_VALUE: Record<Rarity, number> = { common: 5, rare: 10, epic: 20, relic: 40 };
export const FORGE_COST = 25;
export const INVENTORY_CAP = 12;

export const itemById = (id: string): ItemDefinition => {
  const i = ITEMS.find((x) => x.id === id);
  if (!i) throw new Error(`Unknown item ${id}`);
  return i;
};

/** Items that can drop or be forged. */
export const DROPPABLE_ITEMS = ITEMS.filter((i) => !i.unique && i.id !== 'piston_bit');
