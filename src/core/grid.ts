import { GRID_SIZES } from '../data/buildings';
import { levelMul, moduleById } from '../data/modules';
import type { ModuleDef, ShapeId } from '../data/types';
import { BASE_CARGO, BASE_HP, type GameState, type ModuleInst, type Placement } from './state';

// ── Shapes ──────────────────────────────────────────────────────────────────

const SHAPES: Record<ShapeId, [number, number][]> = {
  '1': [[0, 0]],
  '2': [
    [0, 0],
    [1, 0],
  ],
  L: [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  '2x2': [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
};

/** Cells of a shape rotated `rot` quarter turns clockwise, normalised to start at (0,0). */
export function shapeCells(shape: ShapeId, rot: number): [number, number][] {
  let cells = SHAPES[shape].map(([x, y]) => [x, y] as [number, number]);
  for (let r = 0; r < ((rot % 4) + 4) % 4; r++) cells = cells.map(([x, y]) => [-y, x]);
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

export const cellsAt = (shape: ShapeId, p: Placement): [number, number][] => shapeCells(shape, p.rot).map(([x, y]) => [x + p.x, y + p.y]);

export function gridSize(s: GameState): [number, number] {
  const lvl = Math.max(1, s.buildings.workshop ?? 1);
  return GRID_SIZES[Math.min(lvl, GRID_SIZES.length) - 1];
}

/** Can `uid` be placed at `p` (ignoring itself)? */
export function canPlace(s: GameState, uid: string, p: Placement): boolean {
  const inst = s.modules.find((m) => m.uid === uid);
  if (!inst) return false;
  const [w, h] = gridSize(s);
  const cells = cellsAt(moduleById(inst.defId).shape, p);
  if (cells.some(([x, y]) => x < 0 || y < 0 || x >= w || y >= h)) return false;
  const taken = new Set<string>();
  for (const m of s.modules) {
    if (!m.pos || m.uid === uid) continue;
    for (const [x, y] of cellsAt(moduleById(m.defId).shape, m.pos)) taken.add(`${x},${y}`);
  }
  return cells.every(([x, y]) => !taken.has(`${x},${y}`));
}

// ── Rig evaluation ──────────────────────────────────────────────────────────

export interface WeaponStat {
  uid: string;
  defId: string;
  damage: number;
  interval: number;
  pierce: boolean;
  aoe: boolean;
}

export interface Note {
  k: string;
  p?: Record<string, number>;
}

export interface PlacedModule {
  inst: ModuleInst;
  def: ModuleDef;
  cells: [number, number][];
  /** Modifiers acting on this module (translation key + params). */
  notes: Note[];
  /** Neighbour uids. */
  adj: string[];
}

export interface RigStats {
  w: number;
  h: number;
  /** cells[y][x] = uid or null */
  cells: (string | null)[][];
  placed: PlacedModule[];
  powerProduce: number;
  powerUse: number;
  efficiency: number;
  weapons: WeaponStat[];
  dps: number;
  maxHp: number;
  armor: number;
  shieldMax: number;
  shieldRegen: number;
  repair: number;
  cargo: number;
  scrapMul: number;
  keep: number;
  extraChoices: number;
  combos: string[];
}

export const armorReduction = (armor: number): number => armor / (armor + 20);

export function computeRig(s: GameState): RigStats {
  const [w, h] = gridSize(s);
  const cells: (string | null)[][] = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  const placed: PlacedModule[] = [];
  for (const inst of s.modules) {
    if (!inst.pos) continue;
    const def = moduleById(inst.defId);
    const c = cellsAt(def.shape, inst.pos);
    if (c.some(([x, y]) => x < 0 || y < 0 || x >= w || y >= h || cells[y][x] !== null)) continue; // invalid after a resize: ignored
    for (const [x, y] of c) cells[y][x] = inst.uid;
    placed.push({ inst, def, cells: c, notes: [], adj: [] });
  }
  const byUid = new Map(placed.map((p) => [p.inst.uid, p]));
  for (const p of placed) {
    const adj = new Set<string>();
    for (const [x, y] of p.cells) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        const n = nx >= 0 && ny >= 0 && nx < w && ny < h ? cells[ny][nx] : null;
        if (n && n !== p.inst.uid) adj.add(n);
      }
    }
    p.adj = [...adj];
  }
  const neighbours = (p: PlacedModule) => p.adj.map((u) => byUid.get(u)!);
  const touches = (p: PlacedModule, id: string) => neighbours(p).filter((n) => n.def.id === id).length;

  // Power
  let produce = 0;
  let use = 0;
  for (const p of placed) {
    if (p.def.power > 0) produce += p.def.power * levelMul(p.inst.level);
    else use += -p.def.power;
  }
  const efficiency = use <= produce ? 1 : Math.max(0.4, produce / use);

  // Effect multiplier per module: level × reactor heat
  const mul = new Map<string, number>();
  for (const p of placed) {
    let m = levelMul(p.inst.level);
    const hot = touches(p, 'reactor') > 0 && p.def.id !== 'reactor' && p.def.id !== 'cooler' && touches(p, 'cooler') === 0;
    if (hot) {
      m *= 0.75;
      p.notes.push({ k: 'note.hot' });
    }
    mul.set(p.inst.uid, m);
  }

  const corners = new Set([`0,0`, `${w - 1},0`, `0,${h - 1}`, `${w - 1},${h - 1}`]);
  const stats: RigStats = {
    w,
    h,
    cells,
    placed,
    powerProduce: produce,
    powerUse: use,
    efficiency,
    weapons: [],
    dps: 0,
    maxHp: BASE_HP,
    armor: 0,
    shieldMax: 0,
    shieldRegen: 0,
    repair: 0,
    cargo: BASE_CARGO,
    scrapMul: 1,
    keep: 0.5,
    extraChoices: 0,
    combos: [],
  };

  for (const p of placed) {
    const d = p.def;
    const m = mul.get(p.inst.uid)!;
    if (d.kind === 'weapon') {
      const batteries = Math.min(2, touches(p, 'battery'));
      const coolers = Math.min(2, touches(p, 'cooler'));
      if (batteries) p.notes.push({ k: 'note.charged', p: { n: batteries, pct: 20 * batteries } });
      if (coolers) p.notes.push({ k: 'note.cooled', p: { n: coolers, pct: Math.round((1 - Math.pow(0.8, coolers)) * 100) } });
      const ws: WeaponStat = {
        uid: p.inst.uid,
        defId: d.id,
        damage: d.damage! * m * (1 + 0.2 * batteries),
        interval: (d.interval! * Math.pow(0.8, coolers)) / efficiency,
        pierce: !!d.pierce,
        aoe: !!d.aoe,
      };
      stats.weapons.push(ws);
      stats.dps += ws.damage / ws.interval;
    }
    if (d.armor || d.hp) {
      const corner = p.cells.some(([x, y]) => corners.has(`${x},${y}`));
      const cm = corner ? 1.5 : 1;
      if (corner) p.notes.push({ k: 'note.corner' });
      stats.armor += (d.armor ?? 0) * m * cm;
      stats.maxHp += (d.hp ?? 0) * m * cm;
    }
    if (d.shield) {
      stats.shieldMax += d.shield * m;
      stats.shieldRegen += (d.shieldRegen ?? 0) * m * efficiency;
    }
    if (d.repair) stats.repair += d.repair * m * efficiency;
    if (d.cargo) {
      const magnets = touches(p, 'magnet');
      if (magnets) p.notes.push({ k: 'note.magnet', p: { n: magnets } });
      stats.cargo += d.cargo + (p.inst.level - 1) + magnets;
    }
    if (d.scrapBonus) stats.scrapMul += d.scrapBonus * m;
    if (d.keepOnBreak) stats.keep = Math.max(stats.keep, Math.min(0.95, d.keepOnBreak + 0.05 * (p.inst.level - 1)));
    if (d.extraChoice) stats.extraChoices += d.extraChoice;
  }
  if (efficiency < 1) for (const p of placed) if (p.def.power < 0) p.notes.push({ k: 'note.underpowered', p: { pct: Math.round(efficiency * 100) } });

  // Named combos (discoveries)
  if (placed.some((p) => p.def.id === 'cooler' && neighbours(p).filter((n) => n.def.kind === 'weapon').length >= 2)) stats.combos.push('thermal_loop');
  if (placed.filter((p) => p.def.id === 'plate' && p.cells.some(([x, y]) => corners.has(`${x},${y}`))).length >= 2) stats.combos.push('bastion');
  if (placed.some((p) => p.def.id === 'battery' && p.adj.length >= 3)) stats.combos.push('power_grid');
  if (placed.some((p) => p.def.id === 'reactor' && p.adj.length > 0 && neighbours(p).every((n) => n.def.id === 'cooler' || touches(n, 'cooler') > 0)))
    stats.combos.push('containment');
  return stats;
}
