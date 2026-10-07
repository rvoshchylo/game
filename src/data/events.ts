import type { EventDef } from './types';

export const EVENTS: EventDef[] = [
  {
    id: 'cave_in',
    text: 'A tunnel has caved in. Something glints behind the rubble.',
    safe: 1,
    options: [
      {
        label: 'Dig through',
        chance: 0.6,
        success: [{ kind: 'crate', scrap: 4, copper: 3 }],
        fail: [{ kind: 'damage', pct: 0.25 }],
        successText: 'The rubble gives way to a copper seam.',
        failText: 'The ceiling comes down on the robot.',
      },
      { label: 'Go around', chance: 1, success: [{ kind: 'nothing' }], fail: [], successText: 'A long, quiet detour.', failText: '' },
    ],
  },
  {
    id: 'dead_drill',
    text: 'A drill like you lies in the wall, cold. Its casing is still sealed.',
    safe: 1,
    options: [
      {
        label: 'Salvage it',
        chance: 0.5,
        success: [{ kind: 'blueprint' }],
        fail: [{ kind: 'crate', scrap: 3, copper: 0 }],
        successText: 'Inside: a design you have never seen.',
        failText: 'Only scrap. But useful scrap.',
      },
      { label: 'Leave it be', chance: 1, success: [{ kind: 'lore' }], fail: [], successText: 'You read its serial plate. You remember something.', failText: '' },
    ],
  },
  {
    id: 'spring',
    text: 'Warm water seeps from the rock. The robot’s joints hiss.',
    safe: 0,
    options: [
      { label: 'Rest here', chance: 1, success: [{ kind: 'heal', pct: 0.3 }], fail: [], successText: 'The rust loosens. Hull repaired.', failText: '' },
      {
        label: 'Search the pool',
        chance: 0.5,
        success: [{ kind: 'crate', scrap: 2, copper: 4 }],
        fail: [{ kind: 'damage', pct: 0.1 }],
        successText: 'Copper nuggets line the bottom.',
        failText: 'Something in the water bites.',
      },
    ],
  },
  {
    id: 'signal',
    text: 'A faint signal pulses from a side passage.',
    safe: 1,
    options: [
      {
        label: 'Follow it',
        chance: 0.7,
        success: [{ kind: 'lore' }, { kind: 'crate', scrap: 3, copper: 1 }],
        fail: [{ kind: 'damage', pct: 0.15 }],
        successText: 'An old probe, still transmitting.',
        failText: 'A trap, long forgotten, still works.',
      },
      { label: 'Ignore it', chance: 1, success: [{ kind: 'nothing' }], fail: [], successText: 'The signal fades behind you.', failText: '' },
    ],
  },
];

export const eventById = (id: string): EventDef => {
  const e = EVENTS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown event ${id}`);
  return e;
};
