// Survivors-style content. Texts live in i18n (weapon.<id>.name/desc, passive.<id>…, enemy.<id>, char.<id>…).

export type WeaponId = 'drill' | 'bolt' | 'saw' | 'shock' | 'mortar' | 'lance';
export type PassiveId = 'plating' | 'servo' | 'magnet' | 'capacitor' | 'amplifier' | 'coolant';

export interface WeaponDef {
  id: WeaponId;
  /** Kenney 1-Bit frame used as the card icon. */
  icon: number;
  maxLevel: number;
  /** Max level + this passive → evolution (from a boss chest). */
  evolveWith: PassiveId | null;
}

export const WEAPONS: WeaponDef[] = [
  { id: 'drill', icon: 289, maxLevel: 5, evolveWith: 'amplifier' },
  { id: 'bolt', icon: 616, maxLevel: 5, evolveWith: 'capacitor' },
  { id: 'saw', icon: 430, maxLevel: 5, evolveWith: 'coolant' },
  { id: 'shock', icon: 632, maxLevel: 5, evolveWith: 'plating' },
  { id: 'mortar', icon: 486, maxLevel: 5, evolveWith: 'magnet' },
  { id: 'lance', icon: 1062, maxLevel: 5, evolveWith: 'servo' },
];

export interface PassiveDef {
  id: PassiveId;
  icon: number;
  maxLevel: number;
}

export const PASSIVES: PassiveDef[] = [
  { id: 'plating', icon: 185, maxLevel: 5 },
  { id: 'servo', icon: 1007, maxLevel: 5 },
  { id: 'magnet', icon: 188, maxLevel: 5 },
  { id: 'capacitor', icon: 488, maxLevel: 5 },
  { id: 'amplifier', icon: 522, maxLevel: 5 },
  { id: 'coolant', icon: 523, maxLevel: 5 },
];

export interface EnemyDef {
  id: string;
  /** Kenney Tiny Dungeon frame; -1 = procedural (the Bell). */
  frame: number;
  hp: number;
  speed: number;
  damage: number;
  /** Collision radius in world px. */
  radius: number;
  xp: number;
  /** From which minute this enemy joins the spawn pool. */
  fromMinute: number;
  scale?: number;
  boss?: boolean;
}

export const ENEMIES: EnemyDef[] = [
  { id: 'rat', frame: 123, hp: 6, speed: 34, damage: 6, radius: 6, xp: 1, fromMinute: 0 },
  { id: 'bat', frame: 120, hp: 4, speed: 52, damage: 4, radius: 5, xp: 1, fromMinute: 1 },
  { id: 'slime', frame: 108, hp: 18, speed: 24, damage: 8, radius: 7, xp: 2, fromMinute: 2 },
  { id: 'spider', frame: 122, hp: 12, speed: 44, damage: 8, radius: 6, xp: 2, fromMinute: 3 },
  { id: 'ghost', frame: 121, hp: 16, speed: 38, damage: 10, radius: 6, xp: 3, fromMinute: 4 },
  { id: 'crab', frame: 110, hp: 40, speed: 30, damage: 12, radius: 7, xp: 4, fromMinute: 6 },
  { id: 'imp', frame: 111, hp: 30, speed: 50, damage: 12, radius: 6, xp: 4, fromMinute: 7 },
];

export const BOSSES: EnemyDef[] = [
  { id: 'cyclops', frame: 109, hp: 500, speed: 30, damage: 20, radius: 14, xp: 60, fromMinute: 5, scale: 2.5, boss: true },
  { id: 'bell', frame: -1, hp: 1500, speed: 26, damage: 28, radius: 18, xp: 120, fromMinute: 8, scale: 1, boss: true },
];

export const RUN_LENGTH = 600; // seconds: survive 10 minutes to win
export const MAX_SLOTS = 4;

export interface CharacterDef {
  id: string;
  weapon: WeaponId;
  tint: number;
  /** Small built-in perk, shown on the card. */
  perk: { might?: number; speed?: number; area?: number; cooldown?: number; maxHp?: number };
  unlock: { kind: 'free' } | { kind: 'gold'; cost: number } | { kind: 'stat'; stat: StatKey; gte: number };
}

export type StatKey = 'runs' | 'kills' | 'bestTime' | 'bossKills' | 'maxLevel' | 'wins' | 'evolutions';

export const CHARACTERS: CharacterDef[] = [
  { id: 'unit7', weapon: 'drill', tint: 0xffffff, perk: { maxHp: 20 }, unlock: { kind: 'free' } },
  { id: 'sparky', weapon: 'bolt', tint: 0x7fd6e8, perk: { cooldown: 0.1 }, unlock: { kind: 'gold', cost: 250 } },
  { id: 'sawbones', weapon: 'saw', tint: 0xe86a5f, perk: { area: 0.15 }, unlock: { kind: 'stat', stat: 'bestTime', gte: 300 } },
  { id: 'tesla', weapon: 'shock', tint: 0xc9a6ff, perk: { might: 0.15 }, unlock: { kind: 'stat', stat: 'kills', gte: 2000 } },
];

/** Weapons that are not in the level-up pool until unlocked. */
export const WEAPON_UNLOCKS: { weapon: WeaponId; stat: StatKey; gte: number }[] = [
  { weapon: 'mortar', stat: 'bossKills', gte: 1 },
  { weapon: 'lance', stat: 'maxLevel', gte: 15 },
];

export type MetaId = 'might' | 'armor' | 'maxHp' | 'recovery' | 'speed' | 'magnet' | 'greed' | 'cooldown' | 'area' | 'revival';

export interface MetaDef {
  id: MetaId;
  icon: number;
  max: number;
  baseCost: number;
  /** Bonus per level (meaning depends on the stat). */
  per: number;
}

export const META: MetaDef[] = [
  { id: 'might', icon: 522, max: 5, baseCost: 60, per: 0.05 },
  { id: 'maxHp', icon: 529, max: 5, baseCost: 50, per: 0.1 },
  { id: 'armor', icon: 185, max: 3, baseCost: 80, per: 1 },
  { id: 'recovery', icon: 582, max: 5, baseCost: 70, per: 0.2 },
  { id: 'speed', icon: 1007, max: 3, baseCost: 60, per: 0.05 },
  { id: 'magnet', icon: 188, max: 3, baseCost: 50, per: 0.2 },
  { id: 'cooldown', icon: 488, max: 2, baseCost: 150, per: 0.04 },
  { id: 'area', icon: 523, max: 2, baseCost: 150, per: 0.05 },
  { id: 'greed', icon: 237, max: 5, baseCost: 40, per: 0.1 },
  { id: 'revival', icon: 1063, max: 1, baseCost: 400, per: 1 },
];

export const metaCost = (m: MetaDef, level: number): number => Math.round(m.baseCost * Math.pow(1.6, level));

export const weaponDef = (id: string): WeaponDef => WEAPONS.find((w) => w.id === id)!;
export const passiveDef = (id: string): PassiveDef => PASSIVES.find((p) => p.id === id)!;
export const enemyDef = (id: string): EnemyDef => [...ENEMIES, ...BOSSES].find((e) => e.id === id)!;
