import type { EventDef } from './types';

export const EVENTS: EventDef[] = [
  {
    id: 'cave_in',
    safe: 1,
    options: [
      {
        chance: 0.6,
        success: [{ kind: 'crate', scrap: 4, copper: 3 }],
        fail: [{ kind: 'damage', pct: 0.25 }],
      },
      { chance: 1, success: [{ kind: 'nothing' }], fail: [] },
    ],
  },
  {
    id: 'dead_drill',
    safe: 1,
    options: [
      {
        chance: 0.5,
        success: [{ kind: 'blueprint' }],
        fail: [{ kind: 'crate', scrap: 3, copper: 0 }],
      },
      { chance: 1, success: [{ kind: 'lore' }], fail: [] },
    ],
  },
  {
    id: 'spring',
    safe: 0,
    options: [
      { chance: 1, success: [{ kind: 'heal', pct: 0.3 }], fail: [] },
      {
        chance: 0.5,
        success: [{ kind: 'crate', scrap: 2, copper: 4 }],
        fail: [{ kind: 'damage', pct: 0.1 }],
      },
    ],
  },
  {
    id: 'signal',
    safe: 1,
    options: [
      {
        chance: 0.7,
        success: [{ kind: 'lore' }, { kind: 'crate', scrap: 3, copper: 1 }],
        fail: [{ kind: 'damage', pct: 0.15 }],
      },
      { chance: 1, success: [{ kind: 'nothing' }], fail: [] },
    ],
  },
];

export const eventById = (id: string): EventDef => {
  const e = EVENTS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown event ${id}`);
  return e;
};
