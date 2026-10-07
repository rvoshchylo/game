import Phaser from 'phaser';
import { BUILDINGS } from '../../data/buildings';
import { bossById, enemyById } from '../../data/enemies';
import { moduleById } from '../../data/modules';
import { stratumById } from '../../data/strata';
import type { GameEngine } from '../../core/engine';
import { STRATUM_ID } from '../../core/expedition';
import { ONEBIT_URL, TINY_URL } from '../../config/constants';
import { formatNumber } from '../../utils/format';
import { FloatingNumbers } from '../fx';
import { generateRock, generateTextures } from '../textures';

export const VIEW_W = 480;
export const VIEW_H = 270;
const FLOOR_Y = 222;
const BOT_X = 120;
const BOT_Y = 186;
const FONT = '"Pixelify Sans", system-ui, sans-serif';
/** Canvas text cannot disable ligatures; a zero-width non-joiner breaks Pixelify's odd 'fi'. */
const noLig = (s: string): string => s.replace(/f(?=[il])/g, 'f\u200C');
/** Camp layout: where each building stands. */
const CAMP_SLOTS: Record<string, number> = { workshop: 220, storage: 290, dock: 360, radio: 420, forge: 165 };

/**
 * Pure presentation. Reads engine.state every frame, reacts to engine.bus events.
 * The player never needs to touch it: it is something to watch.
 */
export class ShaftScene extends Phaser.Scene {
  private rock!: Phaser.GameObjects.TileSprite;
  private rockFar!: Phaser.GameObjects.TileSprite;
  private sky!: Phaser.GameObjects.Graphics;
  private ground!: Phaser.GameObjects.Rectangle;
  private bot!: Phaser.GameObjects.Image;
  private drill!: Phaser.GameObjects.Image;
  private shieldBubble!: Phaser.GameObjects.Arc;
  private enemies: Phaser.GameObjects.Image[] = [];
  private enemyBars!: Phaser.GameObjects.Graphics;
  private buildings = new Map<string, Phaser.GameObjects.Image>();
  private buildingLabels = new Map<string, Phaser.GameObjects.Text>();
  private nodeIcon!: Phaser.GameObjects.Image;
  private banner!: Phaser.GameObjects.Text;
  private caption!: Phaser.GameObjects.Text;
  private numbers!: FloatingNumbers;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private debris = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>();
  private mode: 'camp' | 'shaft' | '' = '';
  private walkPhase = 0;
  private unsub: (() => void)[] = [];

  constructor(private engine: GameEngine) {
    super('shaft');
  }

  preload(): void {
    this.load.spritesheet('onebit', ONEBIT_URL, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiny', TINY_URL, { frameWidth: 16, frameHeight: 16 });
  }

  private get reducedMotion(): boolean {
    return this.engine.state.settings.reducedMotion;
  }

  create(): void {
    generateTextures(this);
    const pal = stratumById(STRATUM_ID).palette;
    generateRock(this, 'rock_rust', pal);

    this.sky = this.add.graphics();
    this.sky.fillGradientStyle(0x1b1530, 0x1b1530, 0x4a2a2a, 0x4a2a2a, 1).fillRect(0, 0, VIEW_W, FLOOR_Y);
    for (let i = 0; i < 40; i++) this.sky.fillStyle(0xf2e9dc, Phaser.Math.FloatBetween(0.2, 0.7)).fillRect(Phaser.Math.Between(0, VIEW_W), Phaser.Math.Between(0, 120), 1, 1);
    this.rockFar = this.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'rock_rust').setOrigin(0).setAlpha(0.35).setTileScale(1.5);
    this.rock = this.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'rock_rust').setOrigin(0).setAlpha(0.55).setTileScale(3);
    this.ground = this.add.rectangle(0, FLOOR_Y, VIEW_W, VIEW_H - FLOOR_Y, 0x0b0807).setOrigin(0);
    this.add.rectangle(0, FLOOR_Y, VIEW_W, 2, 0x5a3a2a).setOrigin(0);

    for (const b of BUILDINGS) {
      const x = CAMP_SLOTS[b.id] ?? 300;
      this.buildings.set(b.id, this.add.image(x, FLOOR_Y - 24, 'onebit', b.icon).setScale(3).setVisible(false));
      this.buildingLabels.set(
        b.id,
        this.add.text(x, FLOOR_Y + 6, b.name, { fontFamily: FONT, fontSize: '10px', color: '#b8aea3' }).setOrigin(0.5, 0).setResolution(2).setVisible(false),
      );
    }

    this.add.ellipse(BOT_X, FLOOR_Y, 70, 10, 0x000000, 0.45);
    this.bot = this.add.image(BOT_X, BOT_Y, 'automaton').setScale(4);
    this.drill = this.add.image(BOT_X + 38, BOT_Y + 2, 'drill').setScale(3).setOrigin(0, 0.5);
    this.shieldBubble = this.add.circle(BOT_X, BOT_Y, 46, 0x6fb3ff, 0).setStrokeStyle(2, 0x6fb3ff, 0);

    this.enemyBars = this.add.graphics().setDepth(5);
    this.nodeIcon = this.add.image(360, FLOOR_Y - 26, 'onebit', 390).setScale(3).setVisible(false);

    this.sparks = this.add.particles(0, 0, 'px', {
      speed: { min: 40, max: 180 },
      angle: { min: 0, max: 360 },
      gravityY: 260,
      lifespan: { min: 250, max: 600 },
      scale: { start: 2, end: 0.5 },
      tint: 0xffd166,
      emitting: false,
    });
    this.sparks.setDepth(10);

    this.banner = this.add
      .text(VIEW_W / 2, 70, '', { fontFamily: FONT, fontSize: '20px', color: '#ffd166', align: 'center', stroke: '#120d0b', strokeThickness: 4 })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(20)
      .setResolution(2);
    this.caption = this.add
      .text(VIEW_W / 2, 14, '', { fontFamily: FONT, fontSize: '12px', color: '#f2e9dc', stroke: '#120d0b', strokeThickness: 3 })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setResolution(2);
    this.numbers = new FloatingNumbers(this, FONT);
    this.bindEvents();
    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
    this.syncFight();
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private shake(ms: number, intensity: number): void {
    if (!this.reducedMotion) this.cameras.main.shake(ms, intensity);
  }

  private debrisFor(color: number): Phaser.GameObjects.Particles.ParticleEmitter {
    let em = this.debris.get(color);
    if (!em) {
      em = this.add.particles(0, 0, 'px', {
        speed: { min: 50, max: 200 },
        angle: { min: 180, max: 360 },
        gravityY: 300,
        lifespan: { min: 300, max: 700 },
        scale: { start: 2, end: 0.5 },
        tint: color,
        emitting: false,
      });
      em.setDepth(10);
      this.debris.set(color, em);
    }
    return em;
  }

  private showBanner(text: string, color = '#ffd166'): void {
    this.banner.setText(noLig(text)).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1500, duration: 400 });
  }

  private enemyX(i: number, count: number): number {
    return 360 + (i - (count - 1) / 2) * 52;
  }

  /** (Re)build enemy sprites from the current fight state (also after a reload mid-fight). */
  private syncFight(): void {
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    const f = this.engine.state.exp?.fight;
    if (!f) return;
    f.enemies.forEach((e, i) => {
      const def = enemyById(e.defId);
      const img = e.boss
        ? this.add.image(this.enemyX(i, f.enemies.length), FLOOR_Y - 56, 'enemy_bell').setScale(4.5)
        : this.add.image(this.enemyX(i, f.enemies.length), FLOOR_Y - 26, 'tiny', def.frame).setScale(e.elite ? 4 : 3);
      img.setFlipX(!e.boss).setVisible(e.hp > 0);
      this.enemies.push(img);
    });
  }

  private bindEvents(): void {
    const bus = this.engine.bus;
    const on = <K extends Parameters<typeof bus.on>[0]>(k: K, fn: Parameters<typeof bus.on<K>>[1]) => this.unsub.push(bus.on(k, fn));

    on('fightStart', (e) => {
      this.syncFight();
      this.enemies.forEach((img, i) => {
        const x = img.x;
        img.x = VIEW_W + 40 + i * 30;
        this.tweens.add({ targets: img, x, duration: 350, ease: 'Cubic.out' });
      });
      if (e.enemies.some((x) => x.boss)) {
        this.showBanner(`WARDEN\n${bossById(e.enemies[0].defId).name.toUpperCase()}`, '#e84a5f');
        this.shake(400, 0.01);
      } else if (e.enemies.some((x) => x.elite)) this.showBanner('ELITE', '#e8c070');
    });
    on('moduleFire', (e) => {
      const def = moduleById(e.defId);
      const icon = this.add.image(BOT_X, BOT_Y - 52, 'onebit', def.icon).setScale(2).setDepth(15);
      this.tweens.add({ targets: icon, y: BOT_Y - 70, alpha: 0, duration: 450, onComplete: () => icon.destroy() });
      this.tweens.add({ targets: this.drill, x: BOT_X + 50, duration: 50, yoyo: true });
      for (const hit of e.hits) {
        const img = this.enemies[hit.index];
        if (!img) continue;
        this.numbers.spawn(img.x, img.y - 20, formatNumber(hit.dmg), def.aoe ? '#e86a5f' : def.pierce ? '#e8c070' : '#f2e9dc', 12);
        this.sparks.explode(def.aoe ? 3 : 5, img.x - 14, img.y);
        img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        this.time.delayedCall(60, () => img.clearTint());
      }
    });
    on('enemyAttack', (e) => {
      const img = this.enemies[e.index];
      if (img) this.tweens.add({ targets: img, x: img.x - 18, duration: 70, yoyo: true });
    });
    on('robotHit', (e) => {
      if (e.absorbed > 0) {
        this.shieldBubble.setFillStyle(0x6fb3ff, 0.18).setStrokeStyle(2, 0x6fb3ff, 0.9);
        this.tweens.add({ targets: this.shieldBubble, fillAlpha: 0, strokeAlpha: 0, duration: 300 });
      }
      if (e.dmg > 0) {
        this.tweens.add({ targets: this.bot, alpha: 0.4, duration: 60, yoyo: true });
        this.numbers.spawn(BOT_X, BOT_Y - 40, `-${formatNumber(e.dmg)}`, '#e84a5f', 11);
      }
    });
    on('enemyDie', (e) => {
      const img = this.enemies[e.index];
      if (!img) return;
      const def = enemyById(e.defId);
      this.debrisFor(def.frame < 0 ? 0xb08d57 : 0xc8643a).explode(def.frame < 0 ? 70 : 18, img.x, img.y);
      img.setVisible(false);
    });
    on('toll', () => {
      const ring = this.add.image(this.enemies[0]?.x ?? 360, FLOOR_Y - 56, 'ring').setTint(0xb08d57).setScale(1).setDepth(12);
      this.tweens.add({ targets: ring, scale: 14, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
      this.shake(220, 0.008);
    });
    on('bossPhase', () => this.showBanner('THE SHELL CLOSES', '#e84a5f'));
    on('fightEnd', (e) => {
      if (!e.won) this.showBanner('BREAKDOWN', '#e84a5f');
      this.time.delayedCall(250, () => this.syncFight());
    });
    on('loot', (e) => {
      const crate = this.add.image(360, FLOOR_Y - 20, 'onebit', 390).setScale(2).setDepth(14);
      this.tweens.add({ targets: crate, x: BOT_X, y: BOT_Y - 30, alpha: e.stored ? 1 : 0, duration: 500, ease: 'Cubic.in', onComplete: () => crate.destroy() });
      if (!e.stored) this.numbers.spawn(360, FLOOR_Y - 50, 'no room!', '#e84a5f', 11);
    });
    on('blueprint', (e) => this.showBanner(`BLUEPRINT\n${moduleById(e.defId).name}`, '#7fd6c2'));
    on('core', () => this.showBanner('WARDEN CORE', '#ffd166'));
    on('heal', (e) => e.amount > 0 && this.numbers.spawn(BOT_X, BOT_Y - 40, `+${formatNumber(e.amount)}`, '#7fd68c', 12));
    on('breakdown', () => this.shake(300, 0.01));
    on('built', () => this.sparks.explode(30, CAMP_SLOTS.workshop, FLOOR_Y - 30));
  }

  override update(time: number, deltaMs: number): void {
    const s = this.engine.state;
    const dt = deltaMs / 1000;
    this.numbers.update(dt);
    const exp = s.exp;
    const mode = exp ? 'shaft' : 'camp';
    if (mode !== this.mode) {
      this.mode = mode;
      const camp = mode === 'camp';
      this.sky.setVisible(camp);
      this.rock.setVisible(!camp);
      this.rockFar.setVisible(!camp);
      this.ground.setFillStyle(camp ? 0x2a1d17 : 0x0b0807);
      this.cameras.main.setBackgroundColor(camp ? 0x1b1530 : 0x120d0b);
      this.syncFight();
    }

    // Camp buildings
    for (const [id, img] of this.buildings) {
      const lvl = s.buildings[id] ?? 0;
      const show = mode === 'camp' && lvl > 0;
      img.setVisible(show).setScale(2.5 + lvl * 0.25);
      this.buildingLabels.get(id)!.setVisible(show).setText(noLig(`${BUILDINGS.find((b) => b.id === id)!.name}${lvl > 1 ? ` ${lvl}` : ''}`));
    }

    // Robot motion
    const walking = !!exp && (exp.phase === 'walk' || exp.phase === 'return' || exp.phase === 'choose');
    const speed = exp?.phase === 'walk' ? 40 : exp?.phase === 'return' ? -60 : 0;
    if (walking && speed) {
      this.rock.tilePositionX += speed * dt;
      this.rockFar.tilePositionX += speed * 0.4 * dt;
      this.rock.tilePositionY += Math.abs(speed) * 0.35 * dt;
      this.walkPhase += dt * 10;
    }
    const bob = walking && speed ? Math.abs(Math.sin(this.walkPhase)) * -4 : Math.sin(time / 450) * 2;
    this.bot.y = BOT_Y + bob;
    this.drill.y = BOT_Y + 2 + bob;
    this.bot.setFlipX(exp?.phase === 'return');
    this.drill.setVisible(exp?.phase !== 'return');
    const hpRatio = s.robot.hp / this.engine.rig.maxHp;
    if (mode === 'camp' && hpRatio < 1 && Math.random() < dt * 4) this.sparks.explode(1, BOT_X + Phaser.Math.Between(-16, 16), BOT_Y - 20);

    // Node visuals
    const node = exp && exp.path[exp.layer] !== undefined ? exp.map[exp.layer][exp.path[exp.layer]] : null;
    const nodeFrame = node && exp!.phase === 'node' ? (node.type === 'cache' ? 390 : 529) : node && exp!.phase === 'event' ? 674 : -1;
    this.nodeIcon.setVisible(nodeFrame >= 0);
    if (nodeFrame >= 0) this.nodeIcon.setFrame(nodeFrame);

    // Enemy HP bars
    this.enemyBars.clear();
    const f = exp?.fight;
    if (f) {
      f.enemies.forEach((e, i) => {
        const img = this.enemies[i];
        if (!img || e.hp <= 0) return;
        const w = e.boss ? 120 : 34;
        const x = img.x - w / 2;
        const y = img.y - img.displayHeight / 2 - 10;
        this.enemyBars.fillStyle(0x120d0b, 1).fillRect(x - 1, y - 1, w + 2, 6);
        this.enemyBars.fillStyle(e.boss ? 0xe84a5f : e.elite ? 0xe8c070 : 0xe0702a, 1).fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 4);
        if (e.armor > 0) this.enemyBars.fillStyle(0xb8aea3, 1).fillRect(x, y + 5, Math.min(w, e.armor * 3), 1);
      });
    }

    // Caption
    let cap = '';
    if (!exp) cap = hpRatio < 1 ? `Camp · repairing ${Math.round(hpRatio * 100)}%` : 'Camp · ready';
    else {
      const layers = exp.map.length;
      const what = exp.phase === 'return' ? (exp.broken ? 'limping home' : 'heading home') : node ? node.type : 'choosing a path';
      cap = `${stratumById(exp.stratumId).name}${exp.tier > 1 ? ` · tier ${exp.tier}` : ''} · layer ${exp.layer + 1}/${layers} · ${what}`;
    }
    cap = noLig(cap);
    if (this.caption.text !== cap) this.caption.setText(cap);
  }
}
