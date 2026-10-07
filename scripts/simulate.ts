/**
 * Pacing simulation: a scripted "reasonable player" plays the headless engine.
 * Usage: npm run sim -- [minutes=90] [tapsPerSec=2] [accuracy=0.75]
 */
import { GameEngine, TICK } from '../src/core/engine';
import { createInitialState } from '../src/core/state';
import { UPGRADES } from '../src/data/upgrades';
import { costOf, isMaxed, upgradeVisible } from '../src/core/systems/upgrades';
import { canChallenge } from '../src/core/systems/progression';
import { collapseReward } from '../src/core/systems/prestige';
import { MEMORIES } from '../src/data/memories';

const [minutes = 90, tps = 2, accuracy = 0.75] = process.argv.slice(2).map(Number);
const t0 = 1_700_000_000_000;
const eng = new GameEngine(createInitialState(t0, 12345), t0);
const s = eng.state;
const log: string[] = [];
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
let t = 0;
let tapAcc = 0;
let lastWardenTry = -999;
let collapses = 0;
let lastMax = 0;
let lastProgressAt = 0;
const milestones = new Set<number>();

eng.bus.on('unlock', (e) => log.push(`${fmt(t)} UNLOCK ${e.flag}`));
eng.bus.on('itemFound', (e) => log.push(`${fmt(t)} ITEM ${e.item.defId} (${e.item.rarity}) via ${e.source}`));
eng.bus.on('bossDefeated', () => log.push(`${fmt(t)} WARDEN DEFEATED at depth ${s.depth - 1}`));
eng.bus.on('bossFailed', (e) => log.push(`${fmt(t)} warden failed (${e.reason}) servo=${s.upgrades.servo} motor=${s.upgrades.motor} plating=${s.upgrades.plating}`));
eng.bus.on('collapsed', (e) => log.push(`${fmt(t)} COLLAPSE +${e.echoes} echoes`));

const auto = s.flags; // keep reference for typing
void auto;

for (t = 0; t < minutes * 60; t += TICK) {
  const now = t0 + t * 1000;
  // Tapping
  tapAcc += tps * TICK;
  while (tapAcc >= 1) {
    tapAcc--;
    const f = s.enemy?.fracture;
    if (f && Math.random() < accuracy) eng.dispatch({ type: 'tap', nx: f.nx, ny: f.ny });
    else eng.dispatch({ type: 'tap', nx: 0.9, ny: 0.9 });
  }
  if (s.heat >= 100 && (!s.enemy?.isBoss || s.enemy.bossPhase >= 1)) eng.dispatch({ type: 'vent' });
  if (s.signal) eng.dispatch({ type: 'tapSignal' });

  // Greedy upgrades: cheapest visible one, preferring offense, plating if retreating.
  for (let k = 0; k < 5; k++) {
    const opts = UPGRADES.filter((u) => upgradeVisible(s, u) && !isMaxed(s, u) && u.id !== 'hopper' && u.id !== 'hull');
    opts.sort((a, b) => costOf(s, a) - costOf(s, b));
    const pick = opts[0];
    if (pick && s.scrap >= costOf(s, pick)) eng.dispatch({ type: 'buyUpgrade', id: pick.id });
    else break;
  }
  // Equip anything new (naive)
  for (const it of s.inventory) {
    if (it.defId === 'governor_relay' && !s.equipped.module1) eng.dispatch({ type: 'equip', uid: it.uid, slot: 'module1' });
    if (it.defId === 'clapper_core') eng.dispatch({ type: 'equip', uid: it.uid, slot: 'core' });
    if (it.defId === 'repair_drone' && !s.equipped.utility) eng.dispatch({ type: 'equip', uid: it.uid, slot: 'utility' });
  }
  const equippedUids = new Set(Object.values(s.equipped));
  const loose = s.inventory.filter((i) => !equippedUids.has(i.uid) && i.defId !== 'piston_bit');
  if (loose.length > 8) eng.dispatch({ type: 'salvage', uid: loose[0].uid });
  if (s.flags.includes('forge') && s.shards >= 25) eng.dispatch({ type: 'forge' });
  if (s.mode === 'hold' && s.rustDebt <= 0 && s.integrity > eng.stats.maxIntegrity * 0.95) eng.dispatch({ type: 'setMode', mode: 'push' });
  if (canChallenge(eng) && t - lastWardenTry > 120) {
    lastWardenTry = t;
    log.push(`${fmt(t)} challenge warden (strike=${eng.stats.strike.toFixed(1)} dps=${eng.stats.autoDps.toFixed(1)} int=${eng.stats.maxIntegrity.toFixed(0)})`);
    eng.dispatch({ type: 'challengeWarden' });
  }
  // Collapse heuristic: when stuck and reward >= 8
  if (s.maxDepth > lastMax) {
    lastMax = s.maxDepth;
    lastProgressAt = t;
  }
  if (s.flags.includes('collapse') && collapseReward(eng) >= 5 && t - lastProgressAt > 600) {
    lastMax = 0;
    eng.dispatch({ type: 'collapse', doctrineId: 'none' });
    collapses++;
    for (const m of MEMORIES) if (['muscle_memory', 'auto_vent', 'governor_instinct'].includes(m.id)) eng.dispatch({ type: 'buyMemory', id: m.id });
  }
  if (!milestones.has(s.maxDepth)) {
    milestones.add(s.maxDepth);
    log.push(`${fmt(t)} depth ${s.maxDepth}  scrap=${s.scrap.toFixed(0)} shards=${s.shards}`);
  }
  eng.tick(TICK, now);
}

console.log(log.join('\n'));
console.log(`\nEnd ${minutes}min: depth=${s.depth} max=${s.maxDepth} best=${s.bestDepth} collapses=${collapses} echoes=${s.echoes}`);
console.log(`upgrades=${JSON.stringify(s.upgrades)} retreats=${s.stats.retreats} fractures=${s.stats.fracturesHit}`);
