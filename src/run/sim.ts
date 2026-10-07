import { nextRandom, randRange } from './rng';
import {
  BOSSES,
  CHARACTERS,
  ENEMIES,
  MAX_SLOTS,
  META,
  PASSIVES,
  RUN_LENGTH,
  WEAPONS,
  type EnemyDef,
  type MetaId,
  type PassiveId,
  type WeaponId,
} from './data';

// ── Types ───────────────────────────────────────────────────────────────────

export interface MetaInput {
  levels: Record<MetaId, number>;
  unlockedWeapons: WeaponId[];
}

export interface Stats {
  might: number;
  area: number;
  cooldown: number;
  speed: number;
  magnet: number;
  maxHp: number;
  armor: number;
  recovery: number;
  greed: number;
}

export interface Enemy {
  uid: number;
  def: EnemyDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  kx: number;
  ky: number;
  /** Seconds until each continuous source may hit again. */
  hitCd: Record<string, number>;
}

export interface Projectile {
  uid: number;
  kind: 'bolt' | 'shell';
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  life: number;
  radius: number;
  hits: number[];
  /** Shells: landing point and blast radius. */
  tx: number;
  ty: number;
  blast: number;
}

export interface Gem {
  uid: number;
  x: number;
  y: number;
  value: number;
  pulled: boolean;
}

export type PickupKind = 'heal' | 'magnet' | 'chest' | 'gold';
export interface Pickup {
  uid: number;
  kind: PickupKind;
  x: number;
  y: number;
}

export interface OwnedWeapon {
  id: WeaponId;
  level: number;
  cd: number;
  evolved: boolean;
}

export type SimEvent =
  | { k: 'hit'; x: number; y: number; dmg: number }
  | { k: 'kill'; x: number; y: number; id: string; boss: boolean }
  | { k: 'slash'; x: number; y: number; dir: number; w: number; h: number }
  | { k: 'beam'; x: number; y: number; dx: number; dy: number; len: number; w: number }
  | { k: 'blast'; x: number; y: number; r: number }
  | { k: 'pulse'; x: number; y: number; r: number }
  | { k: 'shot' }
  | { k: 'hurt' }
  | { k: 'gem' }
  | { k: 'levelup' }
  | { k: 'chest' }
  | { k: 'boss'; id: string }
  | { k: 'swarm' }
  | { k: 'pickup'; kind: PickupKind }
  | { k: 'revive' }
  | { k: 'over'; result: 'win' | 'dead' };

export interface Run {
  charId: string;
  t: number;
  px: number;
  py: number;
  hp: number;
  faceX: number;
  faceY: number;
  level: number;
  xp: number;
  xpNext: number;
  kills: number;
  gold: number;
  weapons: OwnedWeapon[];
  passives: { id: PassiveId; level: number }[];
  enemies: Enemy[];
  projectiles: Projectile[];
  gems: Gem[];
  pickups: Pickup[];
  spawnAcc: number;
  bossesSpawned: string[];
  swarms: number[];
  auraAcc: number;
  sawAngle: number;
  hurtCd: number;
  pendingLevelUps: number;
  pendingChests: number;
  revivals: number;
  over: null | 'win' | 'dead';
  evolutions: WeaponId[];
  bossKills: number;
  rngState: number;
  nextUid: number;
  stats: Stats;
  meta: MetaInput;
  events: SimEvent[];
}

// ── Setup ───────────────────────────────────────────────────────────────────

export const xpForLevel = (level: number): number => (level < 20 ? 5 + (level - 1) * 5 : 100 + (level - 20) * 12);

export function computeStats(run: Run): Stats {
  const lv = run.meta.levels;
  const per = (id: MetaId) => (META.find((m) => m.id === id)!.per ?? 0) * (lv[id] ?? 0);
  const ch = CHARACTERS.find((c) => c.id === run.charId)!;
  const pl = (id: PassiveId) => run.passives.find((p) => p.id === id)?.level ?? 0;
  return {
    might: (1 + per('might') + (ch.perk.might ?? 0) + 0.1 * pl('amplifier')),
    area: (1 + per('area') + (ch.perk.area ?? 0) + 0.1 * pl('coolant')),
    cooldown: Math.max(0.4, (1 - per('cooldown') - (ch.perk.cooldown ?? 0)) * (1 - 0.08 * pl('capacitor'))),
    speed: 70 * (1 + per('speed') + (ch.perk.speed ?? 0)) * (1 + 0.1 * pl('servo')),
    magnet: 50 * (1 + per('magnet')) * (1 + 0.3 * pl('magnet')),
    maxHp: (100 + (ch.perk.maxHp ?? 0)) * (1 + per('maxHp')) * (1 + 0.2 * pl('plating')),
    armor: lv.armor ?? 0,
    recovery: per('recovery'),
    greed: 1 + per('greed'),
  };
}

export function createRun(charId: string, meta: MetaInput, seed: number): Run {
  const ch = CHARACTERS.find((c) => c.id === charId) ?? CHARACTERS[0];
  const run: Run = {
    charId: ch.id,
    t: 0,
    px: 0,
    py: 0,
    hp: 100,
    faceX: 1,
    faceY: 0,
    level: 1,
    xp: 0,
    xpNext: xpForLevel(1),
    kills: 0,
    gold: 0,
    weapons: [{ id: ch.weapon, level: 1, cd: 0.5, evolved: false }],
    passives: [],
    enemies: [],
    projectiles: [],
    gems: [],
    pickups: [],
    spawnAcc: 0,
    bossesSpawned: [],
    swarms: [],
    auraAcc: 0,
    sawAngle: 0,
    hurtCd: 0,
    pendingLevelUps: 0,
    pendingChests: 0,
    revivals: meta.levels.revival ?? 0,
    over: null,
    evolutions: [],
    bossKills: 0,
    rngState: seed | 0,
    nextUid: 1,
    stats: null as unknown as Stats,
    meta,
    events: [],
  };
  run.stats = computeStats(run);
  run.hp = run.stats.maxHp;
  return run;
}

function refreshStats(run: Run): void {
  const before = run.stats.maxHp;
  run.stats = computeStats(run);
  if (run.stats.maxHp > before) run.hp += run.stats.maxHp - before;
  run.hp = Math.min(run.hp, run.stats.maxHp);
}

// ── Spatial grid ────────────────────────────────────────────────────────────

const CELL = 32;
let grid = new Map<number, Enemy[]>();
const key = (cx: number, cy: number) => (cx + 4096) * 8192 + (cy + 4096);

function buildGrid(run: Run): void {
  grid = new Map();
  for (const e of run.enemies) {
    const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    const list = grid.get(k);
    if (list) list.push(e);
    else grid.set(k, [e]);
  }
}

function near(x: number, y: number, r: number, out: Enemy[] = []): Enemy[] {
  out.length = 0;
  const c0 = Math.floor((x - r - 20) / CELL);
  const c1 = Math.floor((x + r + 20) / CELL);
  const r0 = Math.floor((y - r - 20) / CELL);
  const r1 = Math.floor((y + r + 20) / CELL);
  for (let cx = c0; cx <= c1; cx++)
    for (let cy = r0; cy <= r1; cy++) {
      const list = grid.get(key(cx, cy));
      if (list) for (const e of list) if (e.hp > 0) out.push(e);
    }
  return out;
}

// ── Damage ──────────────────────────────────────────────────────────────────

function damage(run: Run, e: Enemy, amount: number, knock = 0): void {
  if (e.hp <= 0) return;
  const dmg = amount * run.stats.might;
  e.hp -= dmg;
  run.events.push({ k: 'hit', x: e.x, y: e.y - 6, dmg });
  if (knock && !e.def.boss) {
    const dx = e.x - run.px;
    const dy = e.y - run.py;
    const d = Math.hypot(dx, dy) || 1;
    e.kx += (dx / d) * knock;
    e.ky += (dy / d) * knock;
  }
}

function kill(run: Run, e: Enemy): void {
  run.kills++;
  run.events.push({ k: 'kill', x: e.x, y: e.y, id: e.def.id, boss: !!e.def.boss });
  run.gems.push({ uid: run.nextUid++, x: e.x, y: e.y, value: e.def.xp, pulled: false });
  if (e.def.boss) {
    run.bossKills++;
    run.pickups.push({ uid: run.nextUid++, kind: 'chest', x: e.x, y: e.y });
    run.gold += Math.round(40 * run.stats.greed);
    return;
  }
  const r = nextRandom(run);
  if (r < 0.06) run.pickups.push({ uid: run.nextUid++, kind: 'gold', x: e.x + 4, y: e.y });
  else if (r < 0.064) run.pickups.push({ uid: run.nextUid++, kind: 'heal', x: e.x, y: e.y });
  else if (r < 0.0655) run.pickups.push({ uid: run.nextUid++, kind: 'magnet', x: e.x, y: e.y });
}

// ── Weapons ─────────────────────────────────────────────────────────────────

const nearestEnemies = (run: Run, n: number, maxDist = 260): Enemy[] =>
  run.enemies
    .filter((e) => e.hp > 0 && Math.hypot(e.x - run.px, e.y - run.py) < maxDist)
    .sort((a, b) => Math.hypot(a.x - run.px, a.y - run.py) - Math.hypot(b.x - run.px, b.y - run.py))
    .slice(0, n);

export const sawCount = (w: OwnedWeapon): number => (w.evolved ? 6 : 1 + Math.floor((w.level - 1) / 2));
export const sawRadius = (run: Run, w: OwnedWeapon): number => 34 * run.stats.area * (w.evolved ? 1.4 : 1);
export const auraRadius = (run: Run, w: OwnedWeapon): number => (30 + 5 * (w.level - 1)) * run.stats.area * (w.evolved ? 1.4 : 1);

function fireWeapon(run: Run, w: OwnedWeapon, dt: number): void {
  const L = w.level;
  const s = run.stats;
  const buf: Enemy[] = [];
  switch (w.id) {
    case 'drill': {
      w.cd -= dt;
      if (w.cd > 0) return;
      w.cd = 1.1 * s.cooldown;
      const dmg = (12 + 6 * (L - 1)) * (w.evolved ? 1.6 : 1);
      const width = 46 * s.area * (w.evolved ? 1.4 : 1);
      const height = 20 * s.area;
      // Forgiving aim: slash toward the side of the nearest enemy (falls back to facing).
      const tgt = nearestEnemies(run, 1, 90)[0];
      const side = tgt ? (tgt.x >= run.px ? 1 : -1) : run.faceX >= 0 ? 1 : -1;
      const dirs = w.evolved || L >= 3 ? [1, -1] : [side];
      for (const dir of dirs) {
        const cx = run.px + (dir * width) / 2;
        run.events.push({ k: 'slash', x: cx, y: run.py, dir, w: width, h: height });
        for (const e of near(cx, run.py, width / 2 + 10, buf)) {
          if (Math.abs(e.x - cx) <= width / 2 + e.radius && Math.abs(e.y - run.py) <= height / 2 + e.radius) damage(run, e, dmg, 50);
        }
      }
      run.events.push({ k: 'shot' });
      return;
    }
    case 'bolt': {
      w.cd -= dt;
      if (w.cd > 0) return;
      w.cd = (w.evolved ? 0.5 : 1.0 - 0.08 * (L - 1)) * s.cooldown;
      const amount = (1 + Math.floor(L / 2)) + (w.evolved ? 3 : 0);
      const targets = nearestEnemies(run, amount);
      if (!targets.length) {
        w.cd = 0.2;
        return;
      }
      for (let i = 0; i < amount; i++) {
        const tgt = targets[i % targets.length];
        const dx = tgt.x - run.px;
        const dy = tgt.y - run.py;
        const d = Math.hypot(dx, dy) || 1;
        const spread = i >= targets.length ? randRange(run, -0.3, 0.3) : 0;
        const ang = Math.atan2(dy, dx) + spread;
        run.projectiles.push({
          uid: run.nextUid++,
          kind: 'bolt',
          x: run.px,
          y: run.py,
          vx: Math.cos(ang) * 240,
          vy: Math.sin(ang) * 240,
          dmg: 9 + 4 * (L - 1),
          pierce: w.evolved ? 3 : L >= 5 ? 1 : 0,
          life: 1.4,
          radius: 4,
          hits: [],
          tx: 0,
          ty: 0,
          blast: 0,
        });
        void d;
      }
      run.events.push({ k: 'shot' });
      return;
    }
    case 'saw': {
      run.sawAngle += dt * 3.2;
      const count = sawCount(w);
      const r = sawRadius(run, w);
      const dmg = (8 + 4 * (L - 1)) * (w.evolved ? 1.5 : 1);
      for (let i = 0; i < count; i++) {
        const a = run.sawAngle + (i / count) * Math.PI * 2;
        const sx = run.px + Math.cos(a) * r;
        const sy = run.py + Math.sin(a) * r;
        for (const e of near(sx, sy, 10, buf)) {
          if (Math.hypot(e.x - sx, e.y - sy) > 7 + e.radius) continue;
          if ((e.hitCd.saw ?? 0) > 0) continue;
          e.hitCd.saw = 0.45;
          damage(run, e, dmg, 40);
        }
      }
      return;
    }
    case 'shock': {
      w.cd -= dt;
      if (w.cd > 0) return;
      w.cd = 0.6 * s.cooldown;
      const r = auraRadius(run, w);
      const dmg = (4 + 2 * (L - 1)) * (w.evolved ? 2 : 1);
      let hits = 0;
      for (const e of near(run.px, run.py, r, buf)) {
        if (Math.hypot(e.x - run.px, e.y - run.py) <= r + e.radius) {
          damage(run, e, dmg, 25);
          hits++;
        }
      }
      if (w.evolved && hits) run.hp = Math.min(s.maxHp, run.hp + Math.min(4, hits * 0.5));
      run.events.push({ k: 'pulse', x: run.px, y: run.py, r });
      return;
    }
    case 'mortar': {
      w.cd -= dt;
      if (w.cd > 0) return;
      w.cd = (2.6 - 0.2 * (L - 1)) * s.cooldown;
      const shells = w.evolved ? 4 : L >= 4 ? 2 : 1;
      const pool = nearestEnemies(run, 12, 230);
      for (let i = 0; i < shells; i++) {
        const tgt = pool.length ? pool[Math.floor(nextRandom(run) * pool.length)] : null;
        const tx = tgt ? tgt.x : run.px + randRange(run, -120, 120);
        const ty = tgt ? tgt.y : run.py + randRange(run, -120, 120);
        run.projectiles.push({
          uid: run.nextUid++,
          kind: 'shell',
          x: run.px,
          y: run.py,
          vx: (tx - run.px) / 0.6,
          vy: (ty - run.py) / 0.6,
          dmg: 22 + 10 * (L - 1),
          pierce: 0,
          life: 0.6,
          radius: 0,
          hits: [],
          tx,
          ty,
          blast: (34 + 4 * L) * s.area * (w.evolved ? 1.3 : 1),
        });
      }
      run.events.push({ k: 'shot' });
      return;
    }
    case 'lance': {
      w.cd -= dt;
      if (w.cd > 0) return;
      w.cd = (2.2 - 0.15 * (L - 1)) * s.cooldown;
      let fx = run.faceX;
      let fy = run.faceY;
      const tgt = nearestEnemies(run, 1, 240)[0];
      if (tgt) {
        const d = Math.hypot(tgt.x - run.px, tgt.y - run.py) || 1;
        fx = (tgt.x - run.px) / d;
        fy = (tgt.y - run.py) / d;
      }
      const dirs: [number, number][] = [[fx, fy]];
      if (w.evolved) dirs.push([-fx, -fy], [-fy, fx], [fy, -fx]);
      else if (L >= 4) dirs.push([-fx, -fy]);
      const len = 230;
      const width = 8 * s.area;
      const dmg = (18 + 9 * (L - 1)) * (w.evolved ? 1.5 : 1);
      for (const [dx, dy] of dirs) {
        run.events.push({ k: 'beam', x: run.px, y: run.py, dx, dy, len, w: width });
        for (const e of run.enemies) {
          if (e.hp <= 0) continue;
          const rx = e.x - run.px;
          const ry = e.y - run.py;
          const along = rx * dx + ry * dy;
          if (along < 0 || along > len) continue;
          const perp = Math.abs(rx * -dy + ry * dx);
          if (perp <= width / 2 + e.radius) damage(run, e, dmg, 30);
        }
      }
      run.events.push({ k: 'shot' });
      return;
    }
  }
}

// ── Spawning ────────────────────────────────────────────────────────────────

const MAX_ALIVE = 200;

function spawnEnemy(run: Run, def: EnemyDef, dist = randRange(run, 250, 300), angle = randRange(run, 0, Math.PI * 2)): void {
  const minute = run.t / 60;
  const hpMul = def.boss ? 1 + 0.08 * minute : 1 + 0.32 * minute + 0.04 * minute * minute;
  run.enemies.push({
    uid: run.nextUid++,
    def,
    x: run.px + Math.cos(angle) * dist,
    y: run.py + Math.sin(angle) * dist,
    hp: def.hp * hpMul,
    maxHp: def.hp * hpMul,
    speed: def.speed * (1 + 0.02 * minute),
    damage: def.damage * (1 + 0.08 * minute),
    radius: def.radius,
    kx: 0,
    ky: 0,
    hitCd: {},
  });
}

function spawnTick(run: Run, dt: number): void {
  const minute = run.t / 60;
  for (const b of BOSSES) {
    if (minute >= b.fromMinute && !run.bossesSpawned.includes(b.id)) {
      run.bossesSpawned.push(b.id);
      spawnEnemy(run, b, 220);
      run.events.push({ k: 'boss', id: b.id });
    }
  }
  for (const at of [2, 4, 7]) {
    if (minute >= at && !run.swarms.includes(at)) {
      run.swarms.push(at);
      const def = ENEMIES.find((e) => e.id === 'bat')!;
      for (let i = 0; i < 28; i++) spawnEnemy(run, def, 230, (i / 28) * Math.PI * 2);
      run.events.push({ k: 'swarm' });
    }
  }
  if (run.enemies.length >= MAX_ALIVE) return;
  run.spawnAcc += dt * (0.9 + 0.55 * minute + 0.05 * minute * minute);
  const pool = ENEMIES.filter((e) => e.fromMinute <= minute);
  while (run.spawnAcc >= 1) {
    run.spawnAcc -= 1;
    // newer enemy types are a bit more likely
    let total = 0;
    for (const e of pool) total += 1 + e.fromMinute;
    let r = nextRandom(run) * total;
    let def = pool[0];
    for (const e of pool) {
      r -= 1 + e.fromMinute;
      if (r <= 0) {
        def = e;
        break;
      }
    }
    spawnEnemy(run, def);
  }
}

// ── Level ups & chests ──────────────────────────────────────────────────────

export type Option =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'evolve'; id: WeaponId }
  | { kind: 'gold'; amount: number }
  | { kind: 'heal' };

export function upgradePool(run: Run): Option[] {
  const pool: Option[] = [];
  for (const w of run.weapons) if (w.level < 5) pool.push({ kind: 'weapon', id: w.id, level: w.level + 1 });
  if (run.weapons.length < MAX_SLOTS)
    for (const w of WEAPONS) if (run.meta.unlockedWeapons.includes(w.id) && !run.weapons.some((x) => x.id === w.id)) pool.push({ kind: 'weapon', id: w.id, level: 1 });
  for (const p of run.passives) if (p.level < 5) pool.push({ kind: 'passive', id: p.id, level: p.level + 1 });
  if (run.passives.length < MAX_SLOTS) for (const p of PASSIVES) if (!run.passives.some((x) => x.id === p.id)) pool.push({ kind: 'passive', id: p.id, level: 1 });
  return pool;
}

export function levelUpOptions(run: Run, count = 3): Option[] {
  const pool = upgradePool(run);
  const out: Option[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(nextRandom(run) * pool.length), 1)[0]);
  if (!out.length) out.push({ kind: 'gold', amount: 25 }, { kind: 'heal' });
  return out;
}

export function applyOption(run: Run, o: Option): void {
  if (o.kind === 'weapon') {
    const w = run.weapons.find((x) => x.id === o.id);
    if (w) w.level = o.level;
    else run.weapons.push({ id: o.id, level: 1, cd: 0.3, evolved: false });
  } else if (o.kind === 'passive') {
    const p = run.passives.find((x) => x.id === o.id);
    if (p) p.level = o.level;
    else run.passives.push({ id: o.id, level: 1 });
    refreshStats(run);
  } else if (o.kind === 'evolve') {
    const w = run.weapons.find((x) => x.id === o.id)!;
    w.evolved = true;
    run.evolutions.push(o.id);
  } else if (o.kind === 'gold') run.gold += o.amount;
  else run.hp = Math.min(run.stats.maxHp, run.hp + run.stats.maxHp * 0.3);
}

/** What a chest gives: an evolution if one is ready, otherwise a random upgrade. */
export function chestContents(run: Run): Option {
  for (const w of run.weapons) {
    const def = WEAPONS.find((d) => d.id === w.id)!;
    if (!w.evolved && w.level >= def.maxLevel && def.evolveWith && run.passives.some((p) => p.id === def.evolveWith)) return { kind: 'evolve', id: w.id };
  }
  return levelUpOptions(run, 1)[0];
}

// ── Step ────────────────────────────────────────────────────────────────────

export const isPaused = (run: Run): boolean => !!run.over || run.pendingLevelUps > 0 || run.pendingChests > 0;

/** Advance the run. `ix, iy` = movement input (any length; normalised here). */
export function step(run: Run, dt: number, ix: number, iy: number): void {
  if (isPaused(run)) return;
  const s = run.stats;
  run.t += dt;

  // Player
  const il = Math.hypot(ix, iy);
  if (il > 0.1) {
    const nx = ix / Math.max(1, il);
    const ny = iy / Math.max(1, il);
    run.px += nx * s.speed * dt;
    run.py += ny * s.speed * dt;
    run.faceX = ix / il;
    run.faceY = iy / il;
  }
  if (s.recovery > 0) run.hp = Math.min(s.maxHp, run.hp + s.recovery * dt);

  spawnTick(run, dt);
  buildGrid(run);

  // Enemies
  const buf: Enemy[] = [];
  let touching = 0;
  for (const e of run.enemies) {
    if (e.hp <= 0) continue;
    for (const k in e.hitCd) e.hitCd[k] -= dt;
    let dx = run.px - e.x;
    let dy = run.py - e.y;
    let d = Math.hypot(dx, dy) || 1;
    if (d > 440 && !e.def.boss) {
      // VS-style: stragglers re-enter ahead of the player
      const a = Math.atan2(run.faceY, run.faceX) + randRange(run, -1, 1);
      e.x = run.px + Math.cos(a) * 270;
      e.y = run.py + Math.sin(a) * 270;
      continue;
    }
    let vx = (dx / d) * e.speed + e.kx;
    let vy = (dy / d) * e.speed + e.ky;
    e.kx *= Math.pow(0.02, dt);
    e.ky *= Math.pow(0.02, dt);
    // separation
    for (const o of near(e.x, e.y, e.radius * 2, buf)) {
      if (o === e) continue;
      const sx = e.x - o.x;
      const sy = e.y - o.y;
      const sd = Math.hypot(sx, sy);
      const min = e.radius + o.radius;
      if (sd > 0 && sd < min) {
        vx += (sx / sd) * (min - sd) * 6;
        vy += (sy / sd) * (min - sd) * 6;
      }
    }
    e.x += vx * dt;
    e.y += vy * dt;
    dx = run.px - e.x;
    dy = run.py - e.y;
    d = Math.hypot(dx, dy);
    if (d < e.radius + 6) touching += Math.max(1, e.damage - s.armor);
  }
  if (touching > 0) {
    run.hp -= Math.min(touching, 60) * dt;
    run.hurtCd -= dt;
    if (run.hurtCd <= 0) {
      run.hurtCd = 0.35;
      run.events.push({ k: 'hurt' });
    }
  }

  // Weapons
  for (const w of run.weapons) fireWeapon(run, w, dt);

  // Projectiles
  for (const p of run.projectiles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'bolt') {
      for (const e of near(p.x, p.y, 12, buf)) {
        if (p.hits.includes(e.uid) || Math.hypot(e.x - p.x, e.y - p.y) > p.radius + e.radius) continue;
        p.hits.push(e.uid);
        damage(run, e, p.dmg, 30);
        if (p.hits.length > p.pierce) {
          p.life = 0;
          break;
        }
      }
    } else if (p.life <= 0) {
      run.events.push({ k: 'blast', x: p.tx, y: p.ty, r: p.blast });
      for (const e of near(p.tx, p.ty, p.blast, buf)) if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.blast + e.radius) damage(run, e, p.dmg, 60);
    }
  }
  run.projectiles = run.projectiles.filter((p) => p.life > 0);

  // Deaths
  for (const e of run.enemies) if (e.hp <= 0) kill(run, e);
  run.enemies = run.enemies.filter((e) => e.hp > 0);

  // Gems
  const mag = s.magnet;
  for (const g of run.gems) {
    const dx = run.px - g.x;
    const dy = run.py - g.y;
    const d = Math.hypot(dx, dy);
    if (!g.pulled && d < mag) g.pulled = true;
    if (g.pulled) {
      const sp = Math.max(160, 360 - d);
      g.x += (dx / (d || 1)) * sp * dt;
      g.y += (dy / (d || 1)) * sp * dt;
    }
    if (d < 9) {
      g.value = -g.value; // mark collected
      run.xp += -g.value;
      run.events.push({ k: 'gem' });
    }
  }
  run.gems = run.gems.filter((g) => g.value > 0);
  if (run.gems.length > 500) {
    // merge the oldest far-away gems into one big one
    const far = run.gems.splice(0, run.gems.length - 400);
    const value = far.reduce((a, g) => a + g.value, 0);
    run.gems.push({ uid: run.nextUid++, x: far[0].x, y: far[0].y, value, pulled: false });
  }
  while (run.xp >= run.xpNext) {
    run.xp -= run.xpNext;
    run.level++;
    run.xpNext = xpForLevel(run.level);
    run.pendingLevelUps++;
    run.events.push({ k: 'levelup' });
  }

  // Pickups
  for (const p of run.pickups) {
    const pd = Math.hypot(run.px - p.x, run.py - p.y);
    if (p.kind === 'gold' && pd < mag && pd > 0) {
      p.x += ((run.px - p.x) / pd) * 220 * dt;
      p.y += ((run.py - p.y) / pd) * 220 * dt;
    }
    if (pd > 12) continue;
    p.x = NaN;
    run.events.push({ k: 'pickup', kind: p.kind });
    if (p.kind === 'heal') run.hp = Math.min(s.maxHp, run.hp + s.maxHp * 0.3);
    else if (p.kind === 'magnet') for (const g of run.gems) g.pulled = true;
    else if (p.kind === 'gold') run.gold += Math.round(5 * s.greed);
    else if (p.kind === 'chest') {
      run.pendingChests++;
      run.events.push({ k: 'chest' });
    }
  }
  run.pickups = run.pickups.filter((p) => !Number.isNaN(p.x));

  // Outcome
  if (run.hp <= 0) {
    if (run.revivals > 0) {
      run.revivals--;
      run.hp = s.maxHp * 0.5;
      for (const e of run.enemies) if (!e.def.boss && Math.hypot(e.x - run.px, e.y - run.py) < 120) e.hp = 0;
      run.enemies = run.enemies.filter((e) => e.hp > 0);
      run.events.push({ k: 'revive' });
    } else {
      run.hp = 0;
      run.over = 'dead';
      run.events.push({ k: 'over', result: 'dead' });
    }
  } else if (run.t >= RUN_LENGTH) {
    run.over = 'win';
    run.events.push({ k: 'over', result: 'win' });
  }
}
