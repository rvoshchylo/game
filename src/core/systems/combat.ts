import { bossById } from '../../data/bosses';
import { ENEMIES, enemyById, RARE_ENEMY_CHANCE } from '../../data/enemies';
import { itemById } from '../../data/items';
import { VENT } from '../../data/skills';
import type { BossDefinition, BossPhase } from '../../data/types';
import { zoneForDepth } from '../../data/zones';
import type { Ctx } from '../context';
import * as F from '../formulas';
import { nextRandom, randRange, weightedPick } from '../rng';
import type { EnemyState } from '../state';
import { discoverLog } from './discovery';
import { addHeat, gainScrap, gainShards } from './economy';
import { grantItem, randomDroppable, rollDrop, rollRarity } from './equipment';
import { advance, isBossAt, onKillProgress } from './progression';

// ── Enemy parameters (boss or normal, uniformly) ─────────────────────────────

interface EnemyParams {
  fractureInterval: number;
  fractureLifetime: number;
}

export function enemyBoss(e: EnemyState): BossDefinition | null {
  return e.isBoss ? bossById(e.defId) : null;
}

function params(e: EnemyState): EnemyParams {
  const b = enemyBoss(e);
  return b ?? enemyById(e.defId);
}

export function currentPhase(e: EnemyState): BossPhase | null {
  const b = enemyBoss(e);
  return b ? b.phases[e.bossPhase] : null;
}

export interface BossMods {
  autoMul: number;
  strikeMul: number;
  fractureMul: number;
  tollInterval: number;
}

/** Rule modifiers of the active phase. Vent breaks shells. */
export function bossMods(ctx: Ctx): BossMods {
  const mods: BossMods = { autoMul: 1, strikeMul: 1, fractureMul: 1, tollInterval: 0 };
  const e = ctx.s.enemy;
  const b = e && enemyBoss(e);
  if (!e || !b) return mods;
  mods.tollInterval = b.tollInterval;
  const phase = b.phases[e.bossPhase];
  if (phase.shell && ctx.s.ventTime > 0) return mods;
  for (const r of phase.rules) mods[r.kind] = r.kind === 'tollInterval' ? r.value : mods[r.kind] * r.value;
  return mods;
}

export const damageMul = (ctx: Ctx): number =>
  (ctx.s.ventTime > 0 ? VENT.damageMul : 1) * (ctx.s.rustDebt > 0 ? F.RUST_DEBT_MUL : 1);

// ── Spawning ────────────────────────────────────────────────────────────────

export function spawnEnemy(ctx: Ctx): void {
  const s = ctx.s;
  const zone = zoneForDepth(s.depth);
  const hpBase = F.enemyHp(s.depth) * ctx.stats.enemyHpMul;
  if (isBossAt(s, s.depth)) {
    const b = bossById(zone.bossId);
    const hp = hpBase * b.hpMul;
    s.enemy = {
      defId: b.id,
      isBoss: true,
      hp,
      maxHp: hp,
      attackTimer: 0,
      fractureTimer: 1.5,
      fracture: null,
      age: 0,
      bossPhase: 0,
      tollTimer: b.tollInterval,
      tollWarned: false,
      tollCountered: false,
      bossTimer: b.timer,
    };
    ctx.bus.emit('enemySpawn', { defId: b.id, isBoss: true });
    return;
  }
  const rares = ENEMIES.filter((e) => e.rare && e.minDepth <= s.depth);
  let def;
  if (rares.length && nextRandom(s) < F.clamp01(RARE_ENEMY_CHANCE * ctx.stats.rareMul)) {
    def = rares[Math.floor(nextRandom(s) * rares.length)];
  } else {
    const pool = zone.enemies.map(enemyById).filter((e) => e.minDepth <= s.depth);
    def = weightedPick(s, pool, (e) => e.weight);
  }
  const hp = hpBase * def.hpMul;
  s.enemy = {
    defId: def.id,
    isBoss: false,
    hp,
    maxHp: hp,
    attackTimer: def.attackInterval,
    fractureTimer: def.fractureInterval * randRange(s, 0.4, 0.8),
    fracture: null,
    age: 0,
    bossPhase: 0,
    tollTimer: 0,
    tollWarned: false,
    tollCountered: false,
    bossTimer: 0,
  };
  ctx.bus.emit('enemySpawn', { defId: def.id, isBoss: false });
}

// ── Damage & fractures ──────────────────────────────────────────────────────

function damageEnemy(ctx: Ctx, dmg: number): void {
  const e = ctx.s.enemy;
  if (!e) return;
  e.hp -= dmg;
  ctx.s.stats.totalDamage += dmg;
}

function nextFractureIn(ctx: Ctx, e: EnemyState): number {
  return (params(e).fractureInterval / ctx.stats.fractureFreqMul) * randRange(ctx.s, 0.8, 1.2);
}

function spawnFracture(ctx: Ctx, e: EnemyState): void {
  const s = ctx.s;
  const life = params(e).fractureLifetime;
  const governed = nextRandom(s) < ctx.stats.governorChance;
  e.fracture = {
    id: ++s.fractureSeq,
    nx: randRange(s, -0.6, 0.6),
    ny: randRange(s, -0.55, 0.45),
    life,
    maxLife: life,
    govAt: governed ? life * 0.45 : null,
  };
  ctx.bus.emit('fractureSpawn', { nx: e.fracture.nx, ny: e.fracture.ny, life });
}

function hitFracture(ctx: Ctx, governed: boolean): void {
  const s = ctx.s;
  const e = s.enemy;
  const f = e?.fracture;
  if (!e || !f) return;
  const ghost = s.ghostFractures > 0;
  if (ghost) s.ghostFractures--;
  if (!governed) s.chain = Math.min(s.chain + 1, F.CHAIN_MAX);
  const dmg =
    ctx.stats.strike *
    F.FRACTURE_MULT *
    ctx.stats.fractureMul *
    bossMods(ctx).fractureMul *
    F.chainMultiplier(s.chain) *
    damageMul(ctx) *
    (ghost ? 2 : 1);
  damageEnemy(ctx, dmg);
  const shards = gainShards(ctx, ctx.stats.fractureShards, () => nextRandom(s));
  addHeat(ctx, F.FRACTURE_HEAT);
  s.stats.fracturesHit++;
  e.fracture = null;
  e.fractureTimer = nextFractureIn(ctx, e);
  ctx.bus.emit('fractureHit', { dmg, nx: f.nx, ny: f.ny, chain: s.chain, governed, shards });
}

/** A tap anywhere on the arena. Position is relative to the enemy (−1..1). */
export function tap(ctx: Ctx, nx: number, ny: number): void {
  const s = ctx.s;
  const e = s.enemy;
  if (!e || s.spawnDelay > 0) return;
  const b = enemyBoss(e);
  if (b && e.tollTimer <= b.tollWindow && !e.tollCountered) {
    e.tollCountered = true;
    s.stats.countersTolled++;
    addHeat(ctx, F.COUNTER_TOLL_HEAT);
    ctx.bus.emit('counterToll', {});
    discoverLog(ctx, 'log_counter');
  }
  const f = e.fracture;
  if (f && Math.hypot(nx - f.nx, ny - f.ny) <= F.FRACTURE_HIT_RADIUS) {
    hitFracture(ctx, false);
  } else {
    const dmg = ctx.stats.strike * bossMods(ctx).strikeMul * damageMul(ctx);
    damageEnemy(ctx, dmg);
    addHeat(ctx, F.STRIKE_HEAT);
    if (ctx.stats.strikeIntegrityCost > 0) {
      s.integrity = Math.max(1, s.integrity - ctx.stats.strikeIntegrityCost * ctx.stats.maxIntegrity);
    }
    ctx.bus.emit('strike', { dmg, nx, ny });
  }
  resolveDeaths(ctx);
}

// ── Vent ────────────────────────────────────────────────────────────────────

export function vent(ctx: Ctx): boolean {
  const s = ctx.s;
  if (!s.flags.includes('heat') || s.heat < VENT.heatCost || s.ventTime > 0) return false;
  s.heat = 0;
  s.ventTime = ctx.stats.ventDuration;
  s.integrity = Math.min(ctx.stats.maxIntegrity, s.integrity + ctx.stats.ventHeal * ctx.stats.maxIntegrity);
  s.stats.ventsUsed++;
  ctx.bus.emit('ventStart', { duration: s.ventTime });
  return true;
}

// ── Outcomes ────────────────────────────────────────────────────────────────

export function retreat(ctx: Ctx): void {
  const s = ctx.s;
  const from = s.depth;
  s.depth = Math.max(1, s.depth - 1);
  if (isBossAt(s, s.depth)) s.depth--;
  s.kills = 0;
  s.enemy = null;
  s.spawnDelay = 1;
  s.chain = 0;
  s.integrity = ctx.stats.maxIntegrity * 0.5;
  s.rustDebt = F.RETREAT_DEBT_SECONDS;
  s.mode = 'hold';
  s.stats.retreats++;
  if (ctx.stats.grants.has('pushReflex')) s.pushReflexTimer = 30;
  ctx.bus.emit('retreat', { depth: s.depth });
  if (from !== s.depth) ctx.bus.emit('depthChanged', { depth: s.depth, dir: -1 });
}

function onBossDefeated(ctx: Ctx, b: BossDefinition): void {
  const s = ctx.s;
  const firstKill = !s.codex.includes(b.firstKillItem);
  const scrap = F.scrapReward(s.depth) * b.scrapMul * ctx.stats.scrapMul;
  gainScrap(ctx, scrap);
  gainShards(ctx, b.shardReward, () => nextRandom(s));
  s.stats.wardens++;
  s.runWardens++;
  s.clearedWardens.push(s.depth);
  s.stats.kills++;
  if (firstKill) grantItem(ctx, b.firstKillItem, 'rare', 'boss');
  else grantItem(ctx, randomDroppable(ctx), rollRarity(ctx, 'rare'), 'boss');
  s.integrity = ctx.stats.maxIntegrity;
  ctx.bus.emit('enemyKilled', { defId: b.id, isBoss: true, scrap });
  ctx.bus.emit('bossDefeated', { bossId: b.id, firstKill });
  advance(ctx);
}

function onKill(ctx: Ctx): void {
  const s = ctx.s;
  const e = s.enemy!;
  s.enemy = null;
  s.spawnDelay = F.SPAWN_DELAY;
  const b = enemyBoss(e);
  if (b) return onBossDefeated(ctx, b);
  const def = enemyById(e.defId);
  s.stats.kills++;
  const scrap = F.scrapReward(s.depth) * def.scrapMul * ctx.stats.scrapMul;
  gainScrap(ctx, scrap);
  if (def.rare) {
    gainShards(ctx, def.rare.shards, () => nextRandom(s));
    if (nextRandom(s) < def.rare.logChance) discoverLog(ctx, 'log_glimmer');
  }
  rollDrop(ctx);
  ctx.bus.emit('enemyKilled', { defId: def.id, isBoss: false, scrap });
  onKillProgress(ctx);
}

function resolveDeaths(ctx: Ctx): void {
  const s = ctx.s;
  if (s.enemy && s.enemy.hp <= 0) onKill(ctx);
  if (s.integrity <= 0) {
    if (s.enemy?.isBoss) ctx.bus.emit('bossFailed', { reason: 'integrity' });
    retreat(ctx);
  }
}

// ── Tick ────────────────────────────────────────────────────────────────────

function tickBoss(ctx: Ctx, e: EnemyState, b: BossDefinition, dt: number): void {
  const s = ctx.s;
  const ratio = e.hp / e.maxHp;
  let phase = e.bossPhase;
  while (phase + 1 < b.phases.length && ratio <= b.phases[phase + 1].below) phase++;
  if (phase !== e.bossPhase) {
    e.bossPhase = phase;
    const p = b.phases[phase];
    ctx.bus.emit('bossPhase', { index: phase, name: p.name, description: p.description });
  }
  const mods = bossMods(ctx);
  e.tollTimer = Math.min(e.tollTimer, mods.tollInterval);
  e.tollTimer -= dt;
  if (!e.tollWarned && e.tollTimer <= b.tollWindow) {
    e.tollWarned = true;
    ctx.bus.emit('tollWarn', {});
  }
  if (e.tollTimer <= 0) {
    if (!e.tollCountered) {
      const dmg = b.tollDamagePct * ctx.stats.maxIntegrity;
      s.integrity -= dmg;
      addHeat(ctx, ctx.stats.tollHeat);
      ctx.bus.emit('toll', { dmg });
    }
    e.tollTimer = mods.tollInterval;
    e.tollWarned = false;
    e.tollCountered = false;
  }
  e.bossTimer -= dt;
  if (e.bossTimer <= 0 && e.hp > 0) {
    ctx.bus.emit('bossFailed', { reason: 'timer' });
    retreat(ctx);
  }
}

export function tickCombat(ctx: Ctx, dt: number): void {
  const s = ctx.s;
  const st = ctx.stats;

  if (s.ventTime > 0) {
    s.ventTime -= dt;
    if (s.ventTime <= 0) {
      s.ventTime = 0;
      ctx.bus.emit('ventEnd', {});
    }
  }
  if (s.rustDebt > 0) s.rustDebt = Math.max(0, s.rustDebt - dt);
  s.integrity = Math.min(st.maxIntegrity, s.integrity + st.regen * dt);

  if (!s.enemy) {
    s.spawnDelay -= dt;
    if (s.spawnDelay <= 0) {
      s.spawnDelay = 0;
      spawnEnemy(ctx);
    }
    return;
  }
  const e = s.enemy;
  e.age += dt;

  // Drill (auto)
  const auto = st.autoDps * damageMul(ctx) * bossMods(ctx).autoMul * dt;
  if (auto > 0) {
    damageEnemy(ctx, auto);
    s.autoDamageAcc += auto;
    if (st.heatFromAuto > 0) addHeat(ctx, st.heatFromAuto * dt);
  }
  s.autoDamageTimer += dt;
  if (s.autoDamageTimer >= 0.5) {
    if (s.autoDamageAcc > 0) ctx.bus.emit('autoDamage', { dmg: s.autoDamageAcc });
    s.autoDamageAcc = 0;
    s.autoDamageTimer = 0;
  }

  // Fractures
  if (!e.fracture) {
    e.fractureTimer -= dt * (s.ventTime > 0 ? VENT.fractureRateMul : 1);
    if (e.fractureTimer <= 0) spawnFracture(ctx, e);
  } else {
    const f = e.fracture;
    f.life -= dt;
    if (f.govAt !== null && f.life <= f.govAt) {
      hitFracture(ctx, true);
    } else if (f.life <= 0) {
      e.fracture = null;
      s.chain = 0;
      e.fractureTimer = nextFractureIn(ctx, e);
      ctx.bus.emit('fractureExpire', {});
    }
  }

  // Enemy offense
  const b = enemyBoss(e);
  if (b) {
    tickBoss(ctx, e, b, dt);
  } else {
    const def = enemyById(e.defId);
    if (def.rare && e.age >= def.rare.fleeAfter && e.hp > 0) {
      s.enemy = null;
      s.spawnDelay = F.SPAWN_DELAY;
      ctx.bus.emit('enemyFled', { defId: def.id });
      return;
    }
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = def.attackInterval;
      if (def.atkMul > 0) {
        const dmg = F.enemyDamage(s.depth) * def.atkMul;
        s.integrity -= dmg;
        ctx.bus.emit('enemyAttack', { dmg });
      }
    }
  }

  if (s.ventTime <= 0 && s.heat >= VENT.heatCost && st.grants.has('autoVent') && s.enemy) vent(ctx);
  resolveDeaths(ctx);
}

/** Display helper. */
export function enemyName(e: EnemyState): string {
  return e.isBoss ? bossById(e.defId).name : enemyById(e.defId).name;
}

export const itemName = (defId: string): string => itemById(defId).name;
