import type { UnlockRule } from './types';

/** The order of this list is the order the game unfolds. */
export const UNLOCKS: UnlockRule[] = [
  { flag: 'motor', when: [{ metric: 'totalScrap', gte: 8 }], message: 'Drill Motor salvaged — the drill can turn on its own.' },
  { flag: 'heat', when: [{ metric: 'fracturesHit', gte: 3 }], message: 'Heat builds in your frame. At 100, VENT it.' },
  { flag: 'plating', when: [{ metric: 'maxDepth', gte: 3 }], message: 'Things down here bite back. Plating available.' },
  {
    flag: 'push',
    when: [{ metric: 'maxDepth', gte: 4 }],
    message: 'Descent control online: PUSH deeper or HOLD and farm.',
  },
  { flag: 'push', when: [{ metric: 'retreats', gte: 1 }], message: 'Descent control online: PUSH deeper or HOLD and farm.' },
  { flag: 'exchanger', when: [{ metric: 'ventsUsed', gte: 1 }], message: 'Heat Exchanger schematic recovered.' },
  { flag: 'signals', when: [{ metric: 'maxDepth', gte: 5 }], message: 'Your sensors pick up… something. Watch for strange signals.' },
  { flag: 'hopper', when: [{ metric: 'maxDepth', gte: 5 }], message: 'Scrap Hopper: the shaft keeps working while you are away.' },
  { flag: 'rig', when: [{ metric: 'itemsFound', gte: 1 }], message: 'A module! Your RIG can be rebuilt.', hint: 'Something buried in the rock…' },
  { flag: 'probes', when: [{ metric: 'maxDepth', gte: 6 }], message: 'Side fissures detected. Dispatch PROBES.', hint: 'Fissures branch off around depth 6' },
  { flag: 'hull', when: [{ metric: 'probesSent', gte: 1 }], message: 'Probe Hull upgrade available.' },
  { flag: 'forge', when: [{ metric: 'maxDepth', gte: 7 }], message: 'The FORGE wakes: turn Shards into modules.' },
  { flag: 'warden', when: [{ metric: 'maxDepth', gte: 9 }], message: 'Something enormous waits at depth 10.' },
  { flag: 'codex', when: [{ metric: 'logsFound', gte: 1 }], message: 'Echo Log recovered. CODEX opened.', hint: 'Fragments of memory are scattered below' },
  { flag: 'collapse', when: [{ metric: 'wardens', gte: 1 }], message: 'The shaft groans. You could let it COLLAPSE… and remember.', hint: 'Only a Warden knows the way back' },
];

/** Tabs and their reveal flag, in display order. */
export const TABS: { id: string; label: string; flag: string | null }[] = [
  { id: 'drill', label: 'DRILL', flag: null },
  { id: 'rig', label: 'RIG', flag: 'rig' },
  { id: 'probes', label: 'PROBES', flag: 'probes' },
  { id: 'collapse', label: 'COLLAPSE', flag: 'collapse' },
  { id: 'codex', label: 'CODEX', flag: 'codex' },
];
