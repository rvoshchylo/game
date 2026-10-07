import type Phaser from 'phaser';

interface Floating {
  text: Phaser.GameObjects.Text;
  vy: number;
  life: number;
  max: number;
}

/** Pooled floating damage numbers. Rate-limited so idle damage never floods the screen. */
export class FloatingNumbers {
  private pool: Floating[] = [];
  private active: Floating[] = [];
  private recent = 0;

  constructor(
    private scene: Phaser.Scene,
    private font: string,
  ) {}

  spawn(x: number, y: number, label: string, color: string, size: number, pop = false): void {
    if (this.recent > 10 && !pop) return;
    this.recent++;
    const f =
      this.pool.pop() ??
      ({
        text: this.scene.add.text(0, 0, '', { fontFamily: this.font, stroke: '#120d0b', strokeThickness: 3 }).setOrigin(0.5).setDepth(30).setResolution(2),
        vy: 0,
        life: 0,
        max: 0,
      } as Floating);
    f.text
      .setText(label)
      .setColor(color)
      .setFontSize(size)
      .setPosition(x + (Math.random() - 0.5) * 16, y)
      .setAlpha(1)
      .setVisible(true)
      .setScale(pop ? 1.6 : 1);
    if (pop) this.scene.tweens.add({ targets: f.text, scale: 1, duration: 180, ease: 'Back.out' });
    f.vy = pop ? -46 : -32;
    f.life = f.max = pop ? 0.9 : 0.7;
    this.active.push(f);
  }

  update(dt: number): void {
    this.recent = Math.max(0, this.recent - dt * 14);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const f = this.active[i];
      f.life -= dt;
      f.text.y += f.vy * dt;
      f.text.setAlpha(Math.min(1, (f.life / f.max) * 2));
      if (f.life <= 0) {
        f.text.setVisible(false);
        this.active.splice(i, 1);
        this.pool.push(f);
      }
    }
  }
}
