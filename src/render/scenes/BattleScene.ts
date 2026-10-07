import Phaser from 'phaser';
import type { GameEngine } from '../../core/engine';
import { enemyBoss } from '../../core/systems/combat';
import { bossById } from '../../data/bosses';
import { enemyById } from '../../data/enemies';
import { zoneForDepth } from '../../data/zones';
import { RARITY_COLOR } from '../../config/constants';
import { formatNumber } from '../../utils/format';
import { generateRock, generateTextures, SHAPE_KEY } from '../textures';
import { FloatingNumbers } from '../fx';

export const VIEW_W = 480;
export const VIEW_H = 270;
const ENEMY_X = 330;
const ENEMY_Y = 150;
const BOT_X = 118;
const BOT_Y = 186;
const FONT = '"Pixelify Sans", system-ui, sans-serif';

/**
 * Pure presentation: reads engine.state every frame and reacts to engine.bus events.
 * Input is translated to engine commands; no game rules live here.
 */
export class BattleScene extends Phaser.Scene {
  private rock!: Phaser.GameObjects.TileSprite;
  private rockFar!: Phaser.GameObjects.TileSprite;
  private bot!: Phaser.GameObjects.Image;
  private drill!: Phaser.GameObjects.Image;
  private enemy!: Phaser.GameObjects.Image;
  private enemyShadow!: Phaser.GameObjects.Ellipse;
  private hpBar!: Phaser.GameObjects.Graphics;
  private fracture!: Phaser.GameObjects.Image;
  private fractureRing!: Phaser.GameObjects.Graphics;
  private signal!: Phaser.GameObjects.Image;
  private ventGlow!: Phaser.GameObjects.Rectangle;
  private banner!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private numbers!: FloatingNumbers;
  private emitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>();
  private shardEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private enemyBaseScale = 1;
  private enemySize = 48;
  private unsub: (() => void)[] = [];
  private zoneKey = '';
  private hitStop = 0;

  constructor(private engine: GameEngine) {
    super('battle');
  }

  private get reducedMotion(): boolean {
    return this.engine.state.settings.reducedMotion;
  }

  create(): void {
    generateTextures(this);
    this.rockFar = this.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'px').setOrigin(0).setAlpha(0.35).setTileScale(1.5);
    this.rock = this.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'px').setOrigin(0).setAlpha(0.55).setTileScale(3);
    this.applyZone();

    // shaft floor
    this.add.rectangle(0, 222, VIEW_W, 48, 0x0b0807).setOrigin(0);
    this.add.rectangle(0, 222, VIEW_W, 2, 0x5a3a2a).setOrigin(0);

    this.ventGlow = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0xe0702a, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);

    this.add.ellipse(BOT_X, 222, 70, 10, 0x000000, 0.45);
    this.bot = this.add.image(BOT_X, BOT_Y, 'automaton').setScale(4);
    this.drill = this.add.image(BOT_X + 38, BOT_Y + 2, 'drill').setScale(3).setOrigin(0, 0.5);
    this.tweens.add({ targets: [this.bot, this.drill], y: '-=3', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.enemyShadow = this.add.ellipse(ENEMY_X, 222, 80, 10, 0x000000, 0.45);
    this.enemy = this.add.image(ENEMY_X, ENEMY_Y, 'enemy_mite').setVisible(false);
    this.hpBar = this.add.graphics();
    this.nameText = this.add
      .text(ENEMY_X, 30, '', { fontFamily: FONT, fontSize: '12px', color: '#f2e9dc' })
      .setOrigin(0.5)
      .setResolution(2);

    this.fractureRing = this.add.graphics();
    this.fracture = this.add.image(0, 0, 'fracture').setScale(3).setVisible(false);
    this.tweens.add({ targets: this.fracture, scale: 3.6, duration: 260, yoyo: true, repeat: -1 });

    this.signal = this.add.image(0, 0, 'signal').setScale(3).setVisible(false);
    this.tweens.add({ targets: this.signal, alpha: 0.35, angle: 20, duration: 600, yoyo: true, repeat: -1 });

    this.shardEmitter = this.add.particles(0, 0, 'shard', {
      speed: { min: 60, max: 140 },
      angle: { min: 200, max: 340 },
      gravityY: 260,
      lifespan: 700,
      scale: { start: 2, end: 1 },
      emitting: false,
    });

    this.banner = this.add
      .text(VIEW_W / 2, 92, '', { fontFamily: FONT, fontSize: '20px', color: '#ffd166', align: 'center', stroke: '#120d0b', strokeThickness: 4 })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(20)
      .setResolution(2);

    this.numbers = new FloatingNumbers(this, FONT);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointer(p.x, p.y));
    this.bindEvents();
    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
  }

  /** Where the open fracture is drawn, in logical px (used by automated smoke tests). */
  fracturePoint(): { x: number; y: number } | null {
    return this.fracture.visible ? { x: this.fracture.x, y: this.fracture.y } : null;
  }

  private applyZone(): void {
    const zone = zoneForDepth(this.engine.state.depth);
    if (zone.id === this.zoneKey) return;
    this.zoneKey = zone.id;
    const key = `rock_${zone.id}`;
    generateRock(this, key, zone.palette);
    this.rock.setTexture(key);
    this.rockFar.setTexture(key);
    this.cameras.main.setBackgroundColor(zone.palette.bg);
  }

  private onPointer(x: number, y: number): void {
    const s = this.engine.state;
    if (s.signal && this.signal.visible && Phaser.Math.Distance.Between(x, y, this.signal.x, this.signal.y) < 28) {
      this.engine.dispatch({ type: 'tapSignal' });
      return;
    }
    // Same frame of reference the fracture is drawn in (see update()).
    const half = this.enemySize / 2;
    this.engine.dispatch({ type: 'tap', nx: (x - ENEMY_X) / half, ny: (y - this.enemy.y) / half });
  }

  private emitterFor(color: number): Phaser.GameObjects.Particles.ParticleEmitter {
    let em = this.emitters.get(color);
    if (!em) {
      em = this.add.particles(0, 0, 'px', {
        speed: { min: 50, max: 220 },
        angle: { min: 0, max: 360 },
        gravityY: 300,
        lifespan: { min: 300, max: 700 },
        scale: { start: 2, end: 0.5 },
        tint: color,
        emitting: false,
      });
      em.setDepth(10);
      this.emitters.set(color, em);
    }
    return em;
  }

  private shake(ms: number, intensity: number): void {
    if (!this.reducedMotion) this.cameras.main.shake(ms, intensity);
  }

  private enemyColor(): number {
    const e = this.engine.state.enemy;
    if (!e) return 0xffffff;
    return e.isBoss ? bossById(e.defId).visual.color : enemyById(e.defId).visual.color;
  }

  private flashEnemy(): void {
    this.enemy.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(60, () => this.restoreEnemyTint());
    this.tweens.add({
      targets: this.enemy,
      scaleX: this.enemyBaseScale * 0.9,
      scaleY: this.enemyBaseScale * 1.08,
      duration: 50,
      yoyo: true,
    });
  }

  private restoreEnemyTint(): void {
    this.enemy.setTint(this.enemyColor()).setTintMode(Phaser.TintModes.MULTIPLY);
  }

  private jab(): void {
    this.tweens.add({ targets: this.drill, x: BOT_X + 52, duration: 50, yoyo: true });
  }

  private showBanner(text: string, color = '#ffd166'): void {
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1600, duration: 400 });
  }

  private bindEvents(): void {
    const bus = this.engine.bus;
    const on = <K extends Parameters<typeof bus.on>[0]>(k: K, fn: Parameters<typeof bus.on<K>>[1]) => this.unsub.push(bus.on(k, fn));
    const fx = (nx: number, ny: number) => ({ x: ENEMY_X + (nx * this.enemySize) / 2, y: this.enemy.y + (ny * this.enemySize) / 2 });

    on('strike', (e) => {
      const p = fx(Phaser.Math.Clamp(e.nx, -0.8, 0.8), Phaser.Math.Clamp(e.ny, -0.8, 0.8));
      this.numbers.spawn(p.x, p.y, formatNumber(e.dmg), '#f2e9dc', 12);
      this.emitterFor(0xffd166).explode(4, p.x, p.y);
      this.flashEnemy();
      this.jab();
    });
    on('fractureHit', (e) => {
      const p = fx(e.nx, e.ny);
      this.hitStop = 0.04;
      this.numbers.spawn(p.x, p.y - 6, `${formatNumber(e.dmg)}${e.chain > 1 ? ` ×${e.chain}` : ''}`, e.governed ? '#7fd6c2' : '#ffd166', 18, true);
      this.emitterFor(0xffd166).explode(14, p.x, p.y);
      if (e.shards > 0) this.shardEmitter.explode(e.shards * 2, p.x, p.y);
      const ring = this.add.image(p.x, p.y, 'ring').setTint(0xffd166).setScale(0.3);
      this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
      this.flashEnemy();
      this.jab();
      this.shake(80, 0.004);
    });
    on('autoDamage', (e) => {
      if (this.enemy.visible) this.numbers.spawn(ENEMY_X + Phaser.Math.Between(-20, 20), ENEMY_Y + 10, formatNumber(e.dmg), '#b8aea3', 10);
    });
    on('enemySpawn', (e) => this.spawnEnemyView(e.defId, e.isBoss));
    on('enemyKilled', (e) => {
      this.emitterFor(this.enemyColorFor(e.defId, e.isBoss)).explode(e.isBoss ? 80 : 22, ENEMY_X, ENEMY_Y);
      this.numbers.spawn(ENEMY_X, ENEMY_Y - 30, `+${formatNumber(e.scrap)} scrap`, '#e0702a', 13);
      this.enemy.setVisible(false);
      this.fracture.setVisible(false);
      this.fractureRing.clear();
      if (e.isBoss) {
        this.shake(500, 0.012);
        this.showBanner('WARDEN BROKEN');
      }
    });
    on('enemyFled', () => {
      this.tweens.add({ targets: this.enemy, x: VIEW_W + 60, duration: 300, onComplete: () => this.enemy.setVisible(false) });
      this.numbers.spawn(ENEMY_X, ENEMY_Y - 30, 'it got away…', '#ffd166', 12);
    });
    on('enemyAttack', () => {
      this.tweens.add({ targets: this.enemy, x: ENEMY_X - 24, duration: 70, yoyo: true });
      this.tweens.add({ targets: this.bot, alpha: 0.4, duration: 60, yoyo: true });
      this.shake(60, 0.003);
    });
    on('tollWarn', () => {
      const ring = this.add.image(ENEMY_X, ENEMY_Y, 'ring').setTint(0xe84a5f).setScale(5).setAlpha(0.8);
      this.tweens.add({ targets: ring, scale: 1, alpha: 0.2, duration: 420, onComplete: () => ring.destroy() });
    });
    on('toll', () => {
      const ring = this.add.image(ENEMY_X, ENEMY_Y, 'ring').setTint(0xb08d57).setScale(1);
      this.tweens.add({ targets: ring, scale: 14, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
      this.shake(260, 0.01);
      this.tweens.add({ targets: this.bot, alpha: 0.3, duration: 90, yoyo: true, repeat: 1 });
    });
    on('counterToll', () => {
      this.showBanner('COUNTER-TOLL!', '#7fd6c2');
      this.emitterFor(0x7fd6c2).explode(30, ENEMY_X, ENEMY_Y);
    });
    on('bossPhase', (e) => {
      this.showBanner(e.name.toUpperCase(), '#e84a5f');
      this.shake(200, 0.006);
    });
    on('bossFailed', (e) => this.showBanner(e.reason === 'timer' ? 'THE SHAFT GIVES WAY' : 'FRAME BROKEN', '#e84a5f'));
    on('retreat', () => {
      this.cameras.main.flash(250, 120, 20, 30);
      this.showBanner('RETREAT', '#e84a5f');
    });
    on('depthChanged', (e) => {
      this.applyZone();
      this.tweens.add({ targets: this.rock, tilePositionY: this.rock.tilePositionY + e.dir * 48, duration: 450, ease: 'Cubic.out' });
      this.tweens.add({ targets: this.rockFar, tilePositionY: this.rockFar.tilePositionY + e.dir * 20, duration: 450, ease: 'Cubic.out' });
    });
    on('ventStart', () => {
      this.ventGlow.setAlpha(0.18);
      this.tweens.add({ targets: this.ventGlow, alpha: 0.08, duration: 300, yoyo: true, repeat: -1 });
      this.bot.setTint(0xffd166);
      this.emitterFor(0xe0702a).explode(40, BOT_X, BOT_Y);
      this.shake(150, 0.006);
    });
    on('ventEnd', () => {
      this.tweens.killTweensOf(this.ventGlow);
      this.ventGlow.setAlpha(0);
      this.bot.clearTint();
    });
    on('signalSpawn', (e) => {
      this.signal.setPosition(e.nx * VIEW_W, e.ny * VIEW_H).setVisible(true);
    });
    on('signalExpire', () => this.signal.setVisible(false));
    on('signalResult', () => {
      this.emitterFor(0x7fd6c2).explode(30, this.signal.x, this.signal.y);
      this.signal.setVisible(false);
    });
    on('itemFound', (e) => {
      const col = RARITY_COLOR[e.item.rarity];
      const beam = this.add.rectangle(ENEMY_X, 0, 14, VIEW_H, col, 0.55).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: beam, scaleX: 0.1, alpha: 0, duration: 900, onComplete: () => beam.destroy() });
    });
  }

  private enemyColorFor(defId: string, isBoss: boolean): number {
    return isBoss ? bossById(defId).visual.color : enemyById(defId).visual.color;
  }

  private spawnEnemyView(defId: string, isBoss: boolean): void {
    const vis = isBoss ? bossById(defId).visual : enemyById(defId).visual;
    const tex = SHAPE_KEY[vis.shape];
    const native = this.textures.get(tex).getSourceImage().width;
    this.enemySize = vis.size;
    this.enemyBaseScale = vis.size / native;
    const y = isBoss ? ENEMY_Y - 10 : ENEMY_Y + (64 - vis.size) / 2;
    this.enemy
      .setTexture(tex)
      .setPosition(VIEW_W + 40, y)
      .setScale(this.enemyBaseScale)
      .setVisible(true)
      .setAlpha(1);
    this.restoreEnemyTint();
    this.tweens.killTweensOf(this.enemy);
    this.tweens.add({ targets: this.enemy, x: ENEMY_X, duration: isBoss ? 700 : 220, ease: 'Cubic.out' });
    this.enemyShadow.setSize(vis.size * 1.2, 10);
    if (isBoss) {
      this.shake(400, 0.01);
      this.showBanner(`WARDEN\n${bossById(defId).name.toUpperCase()}`, '#e84a5f');
    }
  }

  override update(_time: number, deltaMs: number): void {
    const s = this.engine.state;
    const dt = deltaMs / 1000;
    if (this.hitStop > 0) this.hitStop -= dt;
    this.tweens.timeScale = this.hitStop > 0 ? 0.15 : 1;
    this.numbers.update(dt);
    this.rockFar.tilePositionY += dt * 2;

    const e = s.enemy;
    this.hpBar.clear();
    if (!e || !this.enemy.visible) {
      this.nameText.setText('');
      this.fracture.setVisible(false);
      this.fractureRing.clear();
      return;
    }
    // HP bar
    const w = e.isBoss ? 220 : 120;
    const x = ENEMY_X - w / 2;
    const y = 40;
    const ratio = Math.max(0, e.hp / e.maxHp);
    this.hpBar.fillStyle(0x120d0b, 1).fillRect(x - 2, y - 2, w + 4, 10);
    this.hpBar.fillStyle(e.isBoss ? 0xe84a5f : 0xe0702a, 1).fillRect(x, y, w * ratio, 6);
    const boss = enemyBoss(e);
    if (boss) {
      for (const ph of boss.phases.slice(1)) this.hpBar.fillStyle(0xf2e9dc, 1).fillRect(x + w * ph.below, y - 2, 1, 10);
      const tw = (e.bossTimer / boss.timer) * w;
      this.hpBar.fillStyle(0x7fd6c2, 1).fillRect(x, y + 9, tw, 2);
      this.nameText.setText(`${boss.name} · ${boss.phases[e.bossPhase].name} · ${Math.ceil(e.bossTimer)}s`);
      const shell = boss.phases[e.bossPhase].shell && s.ventTime <= 0;
      this.enemy.setAlpha(shell ? 0.75 + 0.1 * Math.sin(this.time.now / 90) : 1);
    } else {
      this.nameText.setText(enemyById(e.defId).name);
    }
    // Fracture
    const f = e.fracture;
    if (f) {
      const fx = ENEMY_X + (f.nx * this.enemySize) / 2;
      const fy = this.enemy.y + (f.ny * this.enemySize) / 2;
      this.fracture.setPosition(fx, fy).setVisible(true);
      this.fractureRing.clear();
      this.fractureRing.lineStyle(2, 0xffd166, 0.9);
      this.fractureRing.beginPath();
      this.fractureRing.arc(fx, fy, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (f.life / f.maxLife), false);
      this.fractureRing.strokePath();
    } else {
      this.fracture.setVisible(false);
      this.fractureRing.clear();
    }
  }
}
