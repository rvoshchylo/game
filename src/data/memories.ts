import type { DoctrineDefinition, MemoryDefinition } from './types';

export const MEMORIES: MemoryDefinition[] = [
  { id: 'muscle_memory', name: 'Muscle Memory', cost: 3, description: 'Start each run with Servo Arm 5 and Drill Motor 5.', effects: [], grants: ['muscleMemory'] },
  { id: 'probe_memory', name: 'Probe Memory', cost: 5, description: 'Probes return 25% faster.', effects: [{ stat: 'probeTimeMul', op: 'mul', value: 0.75 }], grants: [] },
  { id: 'auto_vent', name: 'Auto-Vent', cost: 6, description: 'Vent fires by itself at full Heat. You lose the timing, you gain your hands.', effects: [], grants: ['autoVent'] },
  { id: 'push_reflex', name: 'Push Reflex', cost: 7, description: '30s after a Retreat, descent switches back to PUSH.', effects: [], grants: ['pushReflex'] },
  { id: 'governor_instinct', name: 'Governor Instinct', cost: 8, description: 'A built-in governor strikes 25% of fractures — no slot needed.', effects: [{ stat: 'governorChance', op: 'add', value: 0.25 }], grants: [] },
  { id: 'heirloom', name: 'Heirloom Socket', cost: 10, description: 'Choose one module to survive every Collapse.', effects: [], grants: ['heirloom'] },
  { id: 'deep_start', name: 'Deep Start', cost: 12, description: 'Begin runs at depth 5 (requires best depth 15).', effects: [], grants: ['deepStart'] },
  { id: 'utility_socket', name: 'Utility Socket II', cost: 20, description: 'A second Utility slot.', effects: [], grants: ['utility2'] },
];

export const DOCTRINES: DoctrineDefinition[] = [
  { id: 'none', name: 'No Doctrine', description: 'Dig as you are.', effects: [] },
  {
    id: 'hammer',
    name: 'Doctrine of the Hammer',
    description: 'Strikes ×2, auto ×0.5. A run for your hands.',
    effects: [
      { stat: 'strikeMul', op: 'mul', value: 2 },
      { stat: 'autoMul', op: 'mul', value: 0.5 },
    ],
  },
  {
    id: 'engine',
    name: 'Doctrine of the Engine',
    description: 'Auto ×1.75, fractures 30% rarer. A run for the drill.',
    effects: [
      { stat: 'autoMul', op: 'mul', value: 1.75 },
      { stat: 'fractureFreqMul', op: 'mul', value: 0.7 },
    ],
  },
  {
    id: 'deep',
    name: 'Doctrine of the Deep',
    description: 'Enemies ×1.25 HP, Scrap ×1.6, Echoes +25%.',
    effects: [
      { stat: 'enemyHpMul', op: 'mul', value: 1.25 },
      { stat: 'scrapMul', op: 'mul', value: 1.6 },
      { stat: 'echoMul', op: 'mul', value: 1.25 },
    ],
  },
];

export const memoryById = (id: string): MemoryDefinition => {
  const m = MEMORIES.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown memory ${id}`);
  return m;
};
export const doctrineById = (id: string): DoctrineDefinition => DOCTRINES.find((d) => d.id === id) ?? DOCTRINES[0];
