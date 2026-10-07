import Phaser from 'phaser';
import { ONEBIT_URL, TINY_URL } from '../config/constants';
import { CHARACTERS } from '../run/data';
import { auraRadius, sawCount, sawRadius, type Run, type SimEvent } from '../run/sim';
import { formatNumber } from '../utils/format';
import { FloatingNumbers } from './fx';
import { generateRock, generateTextures } from './textures';

const FONT = '"Tiny5", system-ui, sans-serif';
const PALETTE = { bg: 0x16100d, rock: 0x1c1410, rockLight: 0x251a14 };

export interface SceneHost {
  /** Current run (null in menus). */
  run(): Run | null;
  /** Movement input, any length. */
  input(): { x: number; y: number };
  reducedMotion(): boolean;
  /** Advance the simulation (host decides pausing). */
  advance(dt: number): void;
  /** Called with every simulation event after a frame. */
  onEvent(e: SimEvent): void;
}

/** Renders the survivor arena from the pure simulation state. Holds no game rules. */
export class RunScene extends Phaser.Scene {
  private ground!: Phaser.GameObjects.TileSprite;
  private player!: Phaser.GameObjects.Image;
  private aura!: Phaser.GameObjects.Graphics;
  private enemySprites = new Map<number, Phaser.GameObjects.Image>();
  private enemyHp = new Map<number, number>();
  private gemSprites = new Map<number, Phaser.GameObjects.Image>();
  private pickupSprites = new Map<number, Phaser.GameObjects.Image>();
  private projSprites = new Map<number, Phaser.GameObjects.Image>();
  private saws: Phaser.GameObjects.Image[] = [];
  private bossBars!: Phaser.GameObjects.Graphics;
  private numbers!: FloatingNumbers;
  private debris!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastRun: Run | null = null;
  private idleT = 0;
  private playerFlashUntil = 0;

  constructor(private host: SceneHost) {
    super('run');
  }

  preload(): void {
    this.load.spritesheet('onebit', ONEBIT_URL, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiny', TINY_URL, { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    generateTextures(this);
    generateRock(this, 'ground', PALETTE);
    this.makeTextures();
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    this.ground = this.add.tileSprite(0, 0, 100, 100, 'ground').setOrigin(0).setDepth(-10);
    this.aura = this.add.graphics().setDepth(1);
    this.player = this.add.image(0, 0, 'automaton').setDepth(5);
    this.bossBars = this.add.graphics().setDepth(30);
    this.numbers = new FloatingNumbers(this, FONT);
    this.debris = this.add.particles(0, 0, 'px', {
      speed: { min: 20, max: 90 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 200, max: 450 },
      scale: { start: 1, end: 0.2 },
      tint: [0xc8643a, 0xe0702a, 0x8a6a52],
      emitting: false,
    });
    this.debris.setDepth(8);
    this.sparks = this.add.particles(0, 0, 'px', {
      speed: { min: 30, max: 120 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 150, max: 350 },
      scale: { start: 1, end: 0 },
      tint: 0xffd166,
      emitting: false,
    });
    this.sparks.setDepth(9);
    this.scale.on('resize', () => this.fitCamera());
    this.fitCamera();
  }

  /** Zoom by screen area so phones and desktops see a similar amount of the arena (half-step zoom keeps pixels crisp enough). */
  private fitCamera(): void {
    const { width, height } = this.scale.gameSize;
    const zoom = Math.max(2, Math.round((Math.sqrt(width * height) / 250) * 2) / 2);
    this.cameras.main.setZoom(zoom);
  }

  private makeTextures(): void {
    const g = this.add.graphics();
    // crystal (xp gem)
    g.fillStyle(0x120d0b, 1).fillRect(1, 0, 3, 6).fillRect(0, 1, 5, 4);
    g.fillStyle(0x6fb3ff, 1).fillRect(1, 1, 3, 4);
    g.fillStyle(0xd8ecff, 1).fillRect(2, 1, 1, 2);
    g.generateTexture('gem', 5, 6);
    g.clear();
    // spark bolt
    g.fillStyle(0x7fd6e8, 1).fillCircle(3, 3, 3);
    g.fillStyle(0xffffff, 1).fillCircle(3, 3, 1.5);
    g.generateTexture('bolt', 6, 6);
    g.clear();
    // saw blade
    g.fillStyle(0x120d0b, 1).fillCircle(6, 6, 6);
    g.fillStyle(0xb8aea3, 1).fillCircle(6, 6, 5);
    g.fillStyle(0x6e6259, 1).fillCircle(6, 6, 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(0xf2e9dc, 1).fillRect(6 + Math.cos(a) * 5 - 1, 6 + Math.sin(a) * 5 - 1, 2, 2);
    }
    g.generateTexture('saw', 12, 12);
    g.clear();
    // slash crescent
    g.fillStyle(0xffffff, 1);
    g.slice(16, 16, 15, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false).fillPath();
    g.fillStyle(0x000000, 1);
    g.generateTexture('slashBase', 32, 32);
    g.destroy();
  }

  private flash(img: Phaser.GameObjects.Image): void {
    img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(70, () => img.active && img.clearTint());
  }

  private syncMap<T extends { uid: number }>(map: Map<number, Phaser.GameObjects.Image>, items: T[], make: (t: T) => Phaser.GameObjects.Image, place: (img: Phaser.GameObjects.Image, t: T) => void): void {
    const alive = new Set<number>();
    for (const it of items) {
      alive.add(it.uid);
      let img = map.get(it.uid);
      if (!img) {
        img = make(it);
        map.set(it.uid, img);
      }
      place(img, it);
    }
    for (const [uid, img] of map) {
      if (!alive.has(uid)) {
        img.destroy();
        map.delete(uid);
      }
    }
  }

  private clearAll(): void {
    for (const m of [this.enemySprites, this.gemSprites, this.pickupSprites, this.projSprites]) {
      for (const img of m.values()) img.destroy();
      m.clear();
    }
    this.enemyHp.clear();
    for (const s of this.saws) s.destroy();
    this.saws = [];
    this.aura.clear();
    this.bossBars.clear();
  }

  private handle(e: SimEvent): void {
    const rm = this.host.reducedMotion();
    switch (e.k) {
      case 'hit':
        this.numbers.spawn(e.x, e.y, formatNumber(e.dmg), '#f2e9dc', 7);
        break;
      case 'kill':
        this.debris.explode(e.boss ? 60 : 8, e.x, e.y);
        if (e.boss && !rm) this.cameras.main.shake(400, 0.01);
        break;
      case 'slash': {
        const img = this.add.image(e.x, e.y, 'slashBase').setDepth(6).setAlpha(0.85).setTint(0xffd166);
        img.setDisplaySize(e.w, e.h * 1.6).setFlipX(e.dir < 0);
        this.tweens.add({ targets: img, alpha: 0, scaleY: img.scaleY * 0.4, duration: 160, onComplete: () => img.destroy() });
        break;
      }
      case 'beam': {
        const len = e.len;
        const img = this.add
          .rectangle(e.x + (e.dx * len) / 2, e.y + (e.dy * len) / 2, len, e.w, 0xff6a5f, 0.85)
          .setRotation(Math.atan2(e.dy, e.dx))
          .setDepth(6)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: img, alpha: 0, scaleY: 0.2, duration: 220, onComplete: () => img.destroy() });
        break;
      }
      case 'blast': {
        const ring = this.add.image(e.x, e.y, 'ring').setTint(0xffb347).setDepth(7).setScale(0.2);
        this.tweens.add({ targets: ring, scale: (e.r * 2) / 32, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
        this.sparks.explode(14, e.x, e.y);
        if (!rm) this.cameras.main.shake(80, 0.003);
        break;
      }
      case 'pulse':
        this.aura.setAlpha(1);
        this.tweens.add({ targets: this.aura, alpha: 0.35, duration: 300 });
        break;
      case 'hurt':
        this.playerFlashUntil = this.time.now + 90;
        this.player.setTint(0xff4a4a).setTintMode(Phaser.TintModes.FILL);
        if (!rm) this.cameras.main.shake(60, 0.004);
        break;
      case 'boss':
      case 'swarm':
        if (!rm) this.cameras.main.shake(300, 0.006);
        break;
      default:
        break;
    }
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.host.advance(dt);
    const run = this.host.run();
    const cam = this.cameras.main;
    this.numbers.update(dt);

    if (run !== this.lastRun) {
      this.clearAll();
      this.lastRun = run;
    }

    if (!run) {
      // menu backdrop: the robot idles on a slowly drifting floor
      this.idleT += dt;
      cam.centerOn(this.idleT * 12, 0);
      this.player.setPosition(this.idleT * 12, Math.sin(this.idleT * 3) * 1.5).setTint(0xffffff).setTintMode(Phaser.TintModes.MULTIPLY);
      this.syncGround();
      return;
    }

    for (const e of run.events) {
      this.handle(e);
      this.host.onEvent(e);
    }
    run.events.length = 0;

    // Player
    const ch = CHARACTERS.find((c) => c.id === run.charId)!;
    this.player.setPosition(run.px, run.py - 2 + Math.sin(run.t * 14) * (Math.abs(this.host.input().x) + Math.abs(this.host.input().y) > 0.1 ? 1 : 0.3));
    if (this.time.now > this.playerFlashUntil) this.player.setTint(ch.tint).setTintMode(Phaser.TintModes.MULTIPLY);
    this.player.setFlipX(run.faceX < 0);
    cam.centerOn(run.px, run.py);
    this.syncGround();

    // Enemies
    this.syncMap(
      this.enemySprites,
      run.enemies,
      (e) => {
        const img = e.def.frame < 0 ? this.add.image(e.x, e.y, 'enemy_bell').setScale(0.9) : this.add.image(e.x, e.y, 'tiny', e.def.frame).setScale(e.def.scale ?? 1);
        return img.setDepth(e.def.boss ? 4 : 3);
      },
      (img, e) => {
        img.setPosition(e.x, e.y).setFlipX(e.x > run.px);
        const prev = this.enemyHp.get(e.uid);
        if (prev !== undefined && e.hp < prev) this.flash(img);
        this.enemyHp.set(e.uid, e.hp);
      },
    );
    for (const uid of [...this.enemyHp.keys()]) if (!this.enemySprites.has(uid)) this.enemyHp.delete(uid);

    // Gems & pickups
    this.syncMap(
      this.gemSprites,
      run.gems,
      (g) => this.add.image(g.x, g.y, 'gem').setDepth(2).setTint(g.value >= 20 ? 0xe84a5f : g.value >= 3 ? 0x7fd68c : 0xffffff),
      (img, g) => img.setPosition(g.x, g.y),
    );
    const PICK: Record<string, [string, number]> = { heal: ['tiny', 115], gold: ['onebit', 188], magnet: ['onebit', 1007], chest: ['tiny', 89] };
    this.syncMap(
      this.pickupSprites,
      run.pickups,
      (p) => this.add.image(p.x, p.y, PICK[p.kind][0], PICK[p.kind][1]).setDepth(2).setScale(p.kind === 'gold' ? 0.6 : p.kind === 'chest' ? 1.2 : 0.8),
      (img, p) => img.setPosition(p.x, p.y + Math.sin(run.t * 4 + p.uid) * 1),
    );

    // Projectiles
    this.syncMap(
      this.projSprites,
      run.projectiles,
      (p) => (p.kind === 'bolt' ? this.add.image(p.x, p.y, 'bolt') : this.add.image(p.x, p.y, 'onebit', 486).setScale(0.7)).setDepth(6),
      (img, p) => {
        if (p.kind === 'shell') {
          const k = 1 - p.life / 0.6;
          img.setPosition(p.x, p.y - Math.sin(k * Math.PI) * 28).setRotation(k * 6);
        } else img.setPosition(p.x, p.y);
      },
    );

    // Saws & aura
    const saw = run.weapons.find((w) => w.id === 'saw');
    const n = saw ? sawCount(saw) : 0;
    while (this.saws.length < n) this.saws.push(this.add.image(0, 0, 'saw').setDepth(6));
    while (this.saws.length > n) this.saws.pop()!.destroy();
    if (saw) {
      const r = sawRadius(run, saw);
      this.saws.forEach((s, i) => {
        const a = run.sawAngle + (i / n) * Math.PI * 2;
        s.setPosition(run.px + Math.cos(a) * r, run.py + Math.sin(a) * r).setRotation(run.t * 12);
      });
    }
    const shock = run.weapons.find((w) => w.id === 'shock');
    this.aura.clear();
    if (shock) {
      const r = auraRadius(run, shock);
      this.aura.fillStyle(shock.evolved ? 0xc9a6ff : 0x7fd6e8, 0.12).fillCircle(run.px, run.py, r);
      this.aura.lineStyle(1, shock.evolved ? 0xc9a6ff : 0x7fd6e8, 0.6).strokeCircle(run.px, run.py, r);
    }

    // Boss HP bars (world-space, above the boss)
    this.bossBars.clear();
    for (const e of run.enemies) {
      if (!e.def.boss) continue;
      const w = 40;
      const y = e.y - (e.def.frame < 0 ? 26 : 26);
      this.bossBars.fillStyle(0x120d0b, 1).fillRect(e.x - w / 2 - 1, y - 1, w + 2, 4);
      this.bossBars.fillStyle(0xe84a5f, 1).fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 2);
    }
  }

  private syncGround(): void {
    const v = this.cameras.main.worldView;
    this.ground.setPosition(v.x - 2, v.y - 2).setSize(v.width + 4, v.height + 4);
    this.ground.tilePositionX = v.x - 2;
    this.ground.tilePositionY = v.y - 2;
  }
}
