import type { LogDefinition, SignalOutcome } from './types';

export const LOGS: LogDefinition[] = [
  { id: 'log_wake', depth: 3, text: 'UNIT 7 REACTIVATED. SURFACE CONTACT: NONE. DIRECTIVE: DESCEND.' },
  { id: 'log_others', depth: 7, text: 'Other drills lie in the walls here. Their cores are cold. Mine is not.' },
  { id: 'log_bell', depth: 10, text: 'The Bell was built to warn the miners. It never stopped ringing after they left.' },
  { id: 'log_rust', depth: 15, text: 'Rust is only iron remembering the air.' },
  { id: 'log_core', depth: 25, text: 'Below the strata there is a heat that is not fire. It calls the drills home.' },
  { id: 'log_glimmer', text: 'Glimmerworms eat shards. That is why they glow. That is why they run.' },
  { id: 'log_probe', text: 'Probe 3 transmitted for eleven seconds after the collapse. It was singing.' },
  { id: 'log_collapse', text: 'Every collapse I lose the shaft. I keep the shape of my hands.' },
  { id: 'log_counter', text: 'If you strike the Bell as it swings, it forgets its own toll.' },
];

export const SIGNAL_OUTCOMES: SignalOutcome[] = [
  { id: 'cache', weight: 40 },
  { id: 'vein', weight: 30 },
  { id: 'ghost', weight: 22 },
  { id: 'module', weight: 8 },
];

export const logById = (id: string): LogDefinition => {
  const l = LOGS.find((x) => x.id === id);
  if (!l) throw new Error(`Unknown log ${id}`);
  return l;
};
