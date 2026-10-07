import { applyOption, chestContents, levelUpOptions, step, type Run } from '../src/run/sim';

/** A simple kiting player: flees the local crowd while circling; takes the first offered upgrade. */
export function playRun(run: Run, seconds: number, opts: { pick?: (o: ReturnType<typeof levelUpOptions>) => number } = {}): void {
  const dt = 1 / 30;
  let ang = 0;
  for (let t = 0; t < seconds && !run.over; t += dt) {
    while (run.pendingChests > 0) {
      applyOption(run, chestContents(run));
      run.pendingChests--;
    }
    while (run.pendingLevelUps > 0) {
      const o = levelUpOptions(run);
      applyOption(run, o[opts.pick ? opts.pick(o) : 0]);
      run.pendingLevelUps--;
    }
    let fx = 0;
    let fy = 0;
    for (const e of run.enemies) {
      const dx = run.px - e.x;
      const dy = run.py - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 40 * 40) {
        fx += dx / (d2 + 1);
        fy += dy / (d2 + 1);
      }
    }
    ang += dt * 0.6;
    const ix = fx * 400 + Math.cos(ang) * 0.6;
    const iy = fy * 400 + Math.sin(ang) * 0.6;
    step(run, dt, ix, iy);
  }
}
