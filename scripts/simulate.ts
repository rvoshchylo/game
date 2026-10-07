/**
 * Pacing simulation: a scripted "reasonable engineer" plays the headless engine with autopilot.
 * Usage: npm run sim -- [hours=4]
 */
import { buildingVisible, canAfford, mergePartner, nextBuildCost } from '../src/core/camp';
import { GameEngine } from '../src/core/engine';
import { canPlace, shapeCells } from '../src/core/grid';
import { createInitialState } from '../src/core/state';
import { MODULES, moduleById } from '../src/data/modules';

const hours = Number(process.argv[2] ?? 4);
const t0 = 1_700_000_000_000;
const eng = new GameEngine(createInitialState(t0, 7), t0);
eng.interactive = false;
const s = eng.state;
const log: string[] = [];
let t = 0;
const fmt = (sec: number) => `${Math.floor(sec / 3600)}h${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}m`;
eng.bus.on('unlock', (e) => log.push(`${fmt(t)} unlock ${e.flag}`));
eng.bus.on('built', (e) => log.push(`${fmt(t)} built ${e.id} L${e.level}`));
eng.bus.on('blueprint', (e) => log.push(`${fmt(t)} blueprint ${e.defId}`));
eng.bus.on('combo', (e) => log.push(`${fmt(t)} combo ${e.name}`));
eng.bus.on('returned', (e) => {
  const r = e.report;
  if (r.bossDefeated || r.broken) log.push(`${fmt(t)} exp#${s.stats.expeditions} tier${r.tier} layers=${r.layers} ${r.bossDefeated ? 'WARDEN DOWN' : 'broken'} +${r.scrap}s +${r.copper}c`);
});

const WANT = (process.argv[3] ?? 'drill,plate,cargo,battery,shield,cooler,hammer,drone,plate,magnet,saw,beacon,drill,reactor,sensor').split(',');

function tryPlace(uid: string): boolean {
  const def = moduleById(s.modules.find((m) => m.uid === uid)!.defId);
  for (let y = 0; y < eng.rig.h; y++)
    for (let x = 0; x < eng.rig.w; x++)
      for (let rot = 0; rot < 4; rot++) {
        if (rot && def.shape === '1') break;
        if (shapeCells(def.shape, rot) && canPlace(s, uid, { x, y, rot })) return eng.dispatch({ type: 'place', uid, x, y, rot });
      }
  return false;
}

function engineer(): void {
  if (s.exp) return;
  for (const id of ['storage', 'dock', 'workshop', 'forge', 'radio']) {
    const c = nextBuildCost(s, id);
    if (c && buildingVisible(s, id) && canAfford(s, c)) eng.dispatch({ type: 'build', id });
  }
  for (const m of [...s.modules]) if (mergePartner(s, m.uid)) eng.dispatch({ type: 'merge', uid: m.uid });
  for (const m of s.modules) if (!m.pos) tryPlace(m.uid);
  const free = eng.rig.w * eng.rig.h - eng.rig.placed.reduce((n, p) => n + p.cells.length, 0);
  if (free > 0 && WANT.some((id) => s.blueprints.includes(id) && !s.modules.some((m) => m.defId === id))) {
    const have = new Map<string, number>();
    for (const m of s.modules) have.set(m.defId, (have.get(m.defId) ?? 0) + 1);
    const counts = new Map<string, number>();
    for (const id of WANT) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if ((have.get(id) ?? 0) >= counts.get(id)!) continue;
      if (!s.blueprints.includes(id) || !canAfford(s, moduleById(id).cost)) continue;
      if (eng.dispatch({ type: 'craft', defId: id })) tryPlace(s.modules[s.modules.length - 1].uid);
      break;
    }
  } else {
    // full grid: craft twins of placed modules for merging
    const forge = s.buildings.forge > 0;
    if (forge)
      for (const p of eng.rig.placed)
        if (p.inst.level < 4 && canAfford(s, moduleById(p.def.id).cost) && s.scrap > 100 && s.modules.filter((m) => !m.pos && m.defId === p.def.id).length < 2) {
          eng.dispatch({ type: 'craft', defId: p.def.id });
          break;
        }
  }
  for (const m of s.modules) if (!m.pos && mergePartner(s, m.uid) === null && s.modules.filter((x) => !x.pos).length > 6) eng.dispatch({ type: 'salvage', uid: m.uid });
  if (s.buildings.radio >= 1 && s.autopilot.priority[1] !== 'elite') eng.dispatch({ type: 'setAutopilot', patch: { priority: ['cache', 'elite', 'fight', 'rest', 'event'] } });
  if (s.buildings.radio >= 2 && !s.autopilot.avoidEliteHpPct) eng.dispatch({ type: 'setAutopilot', patch: { avoidEliteHpPct: 60 } });
  if (s.robot.hp >= eng.rig.maxHp * 0.95) {
    const last = s.lastReport;
    const tier = last?.broken && last.tier > 1 ? last.tier - 1 : s.tierUnlocked;
    eng.dispatch({ type: 'launch', tier });
  }
}

const step = 0.25;
const marks = [0.25, 0.5, 1, 2, 4, 8, 16, 24];
for (t = 0; t < hours * 3600; t += step) {
  if (Math.round(t * 4) % 20 === 0) engineer();
  eng.tick(step, t0 + t * 1000);
  const h = t / 3600;
  if (marks.length && h >= marks[0]) {
    marks.shift();
    log.push(
      `── ${fmt(t)}: exp=${s.stats.expeditions} tier=${s.tierUnlocked} scrap=${Math.round(s.scrap)} cu=${s.copper} cores=${s.cores} grid=${eng.rig.w}x${eng.rig.h} dps=${eng.rig.dps.toFixed(1)} hp=${eng.rig.maxHp.toFixed(0)} armor=${eng.rig.armor.toFixed(1)} shield=${eng.rig.shieldMax.toFixed(0)} cargo=${eng.rig.cargo} mods=${eng.rig.placed.map((p) => p.def.id + p.inst.level).join(',')}`,
    );
  }
}
console.log(log.join('\n'));
void MODULES;
