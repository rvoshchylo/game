import { bossById, enemyById } from '../data/enemies';
import type { Ctx } from './context';
import { armorReduction } from './grid';
import { randRange } from './rng';
import type { EnemyState, FightState } from './state';

export const tierHp = (tier: number): number => Math.pow(1.9, tier - 1);
export const tierDmg = (tier: number): number => Math.pow(1.5, tier - 1);
export const layerHp = (layer: number): number => Math.pow(1.12, layer);
export const layerDmg = (layer: number): number => Math.pow(1.08, layer);

export function makeEnemy(defId: string, layer: number, tier: number, elite: boolean, boss: boolean): EnemyState {
  const d = enemyById(defId);
  const hp = d.hp * tierHp(tier) * (boss ? 1 : layerHp(layer));
  return {
    defId,
    hp,
    maxHp: hp,
    armor: d.armor * (tier > 1 ? 1 + 0.25 * (tier - 1) : 1),
    damage: d.damage * tierDmg(tier) * (boss ? 1 : layerDmg(layer)),
    interval: d.interval,
    timer: d.interval * 0.8,
    elite,
    boss,
  };
}

export function startFight(ctx: Ctx, enemies: EnemyState[]): void {
  const exp = ctx.s.exp!;
  const timers: Record<string, number> = {};
  for (const w of ctx.rig.weapons) timers[w.uid] = w.interval * randRange(ctx.s, 0.25, 0.7);
  const boss = enemies.find((e) => e.boss);
  exp.fight = { enemies, weaponTimers: timers, tollTimer: boss ? bossById(boss.defId).tollInterval : 0, phase2: false, elapsed: 0 };
  exp.phase = 'fight';
  for (const e of enemies) if (!ctx.s.seenEnemies.includes(e.defId)) ctx.s.seenEnemies.push(e.defId);
  ctx.bus.emit('fightStart', { enemies: enemies.map((e) => ({ defId: e.defId, elite: e.elite, boss: e.boss })) });
}

/** Damage after the shield soaks what it can. `trueDamage` ignores armor. */
export function damageRobot(ctx: Ctx, raw: number, trueDamage = false): void {
  const r = ctx.s.robot;
  let dmg = trueDamage ? raw : raw * (1 - armorReduction(ctx.rig.armor));
  const absorbed = Math.min(r.shield, dmg);
  r.shield -= absorbed;
  dmg -= absorbed;
  r.hp -= dmg;
  r.shieldDelay = 2;
  ctx.bus.emit('robotHit', { dmg, absorbed });
}

/** Passive systems that run whenever the robot is out in the shaft. */
export function tickRobotField(ctx: Ctx, dt: number): void {
  const r = ctx.s.robot;
  if (ctx.rig.repair > 0 && r.hp > 0) r.hp = Math.min(ctx.rig.maxHp, r.hp + ctx.rig.repair * dt);
  if (r.shieldDelay > 0) r.shieldDelay -= dt;
  else if (r.shield < ctx.rig.shieldMax) r.shield = Math.min(ctx.rig.shieldMax, r.shield + ctx.rig.shieldRegen * dt);
}

/** Returns 'won' | 'lost' | null (still fighting). */
export function tickFight(ctx: Ctx, f: FightState, dt: number): 'won' | 'lost' | null {
  f.elapsed += dt;
  const alive = () => f.enemies.filter((e) => e.hp > 0);

  for (const w of ctx.rig.weapons) {
    let t = (f.weaponTimers[w.uid] ?? w.interval) - dt;
    while (t <= 0 && alive().length) {
      const targets = w.aoe ? alive() : [alive()[0]];
      const hits = targets.map((e) => {
        const dmg = Math.max(1, w.damage - (w.pierce ? 0 : e.armor));
        e.hp -= dmg;
        return { index: f.enemies.indexOf(e), dmg };
      });
      ctx.bus.emit('moduleFire', { uid: w.uid, defId: w.defId, hits });
      for (const hIt of hits) {
        const e = f.enemies[hIt.index];
        if (e.hp <= 0) ctx.bus.emit('enemyDie', { index: hIt.index, defId: e.defId });
      }
      t += w.interval;
    }
    f.weaponTimers[w.uid] = Math.max(t, 0.05);
  }
  if (!alive().length) return 'won';

  for (const e of alive()) {
    e.timer -= dt;
    while (e.timer <= 0) {
      damageRobot(ctx, e.damage);
      ctx.bus.emit('enemyAttack', { index: f.enemies.indexOf(e) });
      e.timer += e.interval;
    }
    if (e.boss) {
      const b = bossById(e.defId);
      if (!f.phase2 && e.hp <= e.maxHp * b.phase2At) {
        f.phase2 = true;
        e.armor += b.phase2Armor;
        ctx.bus.emit('bossPhase', {});
      }
      f.tollTimer -= dt;
      while (f.tollTimer <= 0) {
        const dmg = b.tollDamage * tierDmg(ctx.s.exp!.tier);
        damageRobot(ctx, dmg, true);
        ctx.bus.emit('toll', { dmg });
        f.tollTimer += b.tollInterval;
      }
    }
  }
  tickRobotField(ctx, dt);
  if (ctx.s.robot.hp <= 0) return 'lost';
  return null;
}
