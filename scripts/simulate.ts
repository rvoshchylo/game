/**
 * Balance check: a kiting bot plays full runs. Usage: npm run sim -- [runs=5] [char=unit7]
 */
import { createProfile, finishRun, metaInput } from '../src/run/meta';
import { createRun } from '../src/run/sim';
import { playRun } from '../tests/bot';

const runs = Number(process.argv[2] ?? 5);
const charId = process.argv[3] ?? 'unit7';
const p = createProfile();
for (let i = 0; i < runs; i++) {
  const r = createRun(charId, metaInput(p), 1000 + i);
  const marks: string[] = [];
  let next = 60;
  const start = Date.now();
  while (!r.over && r.t < 600) {
    playRun(r, 1);
    if (r.t >= next) {
      marks.push(`${Math.round(r.t / 60)}m:L${r.level}/hp${Math.round(r.hp)}/en${r.enemies.length}`);
      next += 60;
    }
  }
  const res = finishRun(p, r);
  console.log(
    `run ${i + 1}: ${res.result} at ${Math.floor(res.time / 60)}:${String(Math.floor(res.time % 60)).padStart(2, '0')} lvl=${res.level} kills=${res.kills} gold=${res.gold} weapons=${r.weapons.map((w) => w.id + w.level + (w.evolved ? '*' : '')).join(',')} (${Date.now() - start}ms)`,
  );
  console.log('   ', marks.join('  '));
}
console.log(`profile gold=${p.gold} stats=${JSON.stringify(p.stats)}`);
