// All balance math in one place (docs/03-gdd.md §14). Pure functions, unit-tested.

export const BASE_KILLS_PER_DEPTH = 10;
export const OFFLINE_EFFICIENCY = 0.5;
export const OFFLINE_BASE_HOURS = 4;
export const FRACTURE_MULT = 4;
export const FRACTURE_HIT_RADIUS = 0.45;
export const CHAIN_STEP = 0.1;
export const CHAIN_MAX = 5;
export const RETREAT_DEBT_SECONDS = 15;
export const RUST_DEBT_MUL = 0.75;
export const SPAWN_DELAY = 0.35;
export const STRIKE_HEAT = 2;
export const FRACTURE_HEAT = 20;
export const COUNTER_TOLL_HEAT = 40;
export const SHARD_KEEP_ON_COLLAPSE = 0.1;

export const enemyHp = (d: number): number => 20 * Math.pow(1.25, d - 1) * (1 + 0.04 * (d - 1));
export const scrapReward = (d: number): number => 0.8 * Math.pow(1.2, d - 1);
export const enemyDamage = (d: number): number => 0.8 * Math.pow(1.2, d - 1);

/** ×2 power spike every 10 levels: a visible "one more level" goal. */
export const milestoneMul = (lvl: number): number => Math.pow(2, Math.floor(lvl / 10));
export const strikeDamage = (servoLvl: number): number => (1 + servoLvl) * milestoneMul(servoLvl);
export const autoDps = (motorLvl: number): number => 0.5 * motorLvl * milestoneMul(motorLvl);
export const maxIntegrity = (platingLvl: number): number => 20 * (1 + 0.5 * platingLvl) * Math.pow(1.05, platingLvl);
export const baseRegen = (maxInt: number): number => 1 + 0.02 * maxInt;

export const upgradeCost = (base: number, growth: number, level: number): number => Math.ceil(base * Math.pow(growth, level));

export const chainMultiplier = (chain: number): number => 1 + CHAIN_STEP * Math.min(chain, CHAIN_MAX);

export const offlineCapHours = (hopperLvl: number): number => Math.min(12, OFFLINE_BASE_HOURS + hopperLvl);

/** Echoes for collapsing now. Requires the run to have reached past depth 5. */
export const echoesFor = (maxDepth: number, wardensThisRun: number, echoMul = 1): number => {
  const base = maxDepth > 5 ? Math.floor(Math.pow(maxDepth - 5, 1.5) / 3) : 0;
  return Math.floor((base + 2 * wardensThisRun) * echoMul);
};

/** Smallest depth that would yield one more Echo than the current max depth. */
export const nextEchoDepth = (maxDepth: number, wardens: number, echoMul = 1): number => {
  const now = echoesFor(maxDepth, wardens, echoMul);
  let d = maxDepth + 1;
  while (echoesFor(d, wardens, echoMul) <= now && d < maxDepth + 500) d++;
  return d;
};

export const isBossDepth = (d: number, every: number): boolean => d % every === 0;

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Unspent Echoes resonate: +2% damage each. Spending them on Memories is a real trade-off. */
export const ECHO_RESONANCE = 0.02;
export const echoResonance = (unspentEchoes: number): number => 1 + ECHO_RESONANCE * unspentEchoes;
