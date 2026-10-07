import type { Sfx } from '../audio/sfx';
import { getLang, LANGS, onLangChange, setLang, t } from '../i18n';
import type { SceneHost } from '../render/RunScene';
import { BOSSES, CHARACTERS, ENEMIES, META, metaCost, WEAPON_UNLOCKS, WEAPONS, passiveDef, weaponDef, type CharacterDef, type StatKey } from '../run/data';
import { buyMeta, canUnlockChar, finishRun, metaInput, unlockChar, unlockedWeapons, type Profile, type RunResult } from '../run/meta';
import { applyOption, chestContents, createRun, isPaused, levelUpOptions, step, type Option, type Run, type SimEvent } from '../run/sim';
import { h, setText, setWidth, toggleClass } from './dom';
import type { Modal } from './modal';
import { sprite } from './sprites';
import type { Toasts } from './toast';

const STEP = 1 / 60;
const fmtTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export interface GameDeps {
  sfx: Sfx;
  modal: Modal;
  toasts: Toasts;
  save(): void;
  exportSave(): string;
  importSave(text: string): string | null;
  hardReset(): void;
}

type Screen = 'menu' | 'robots' | 'shop' | 'collection' | 'guide' | 'run';

/** Owns the profile, the current run, input and every screen. Implements the scene's host. */
export class Game implements SceneHost {
  private current: Run | null = null;
  private screen: Screen = 'menu';
  private acc = 0;
  private paused = false;
  private keys = new Set<string>();
  private stick = { active: false, ox: 0, oy: 0, x: 0, y: 0, id: -1 };
  private modalBusy = false;
  private menuLayer: HTMLElement;
  private hud: HTMLElement;
  private joy: HTMLElement;
  private knob: HTMLElement;
  private banner: HTMLElement;
  private el: Record<string, HTMLElement> = {};

  constructor(
    private root: HTMLElement,
    public profile: Profile,
    private deps: GameDeps,
  ) {
    const b = (k: string, e: HTMLElement) => ((this.el[k] = e), e);
    this.menuLayer = h('div', { class: 'menu-layer' });
    this.hud = h(
      'div',
      { class: 'hud hidden' },
      h('div', { class: 'xpbar' }, b('xpFill', h('div', { class: 'fill' })), b('lvl', h('span', { class: 'xp-text' }))),
      h(
        'div',
        { class: 'hud-row' },
        h('div', { class: 'hull' }, b('hullFill', h('div', { class: 'fill' }))),
        b('timer', h('div', { class: 'timer' })),
        h('div', { class: 'hud-right' }, b('kills', h('span', {})), b('gold', h('span', { class: 'gold' })), h('button', { class: 'btn ghost icon', 'aria-label': 'Pause', onclick: () => this.pause() }, '❚❚')),
      ),
      b('slots', h('div', { class: 'slots' })),
    );
    this.joy = h('div', { class: 'joy hidden' });
    this.knob = h('div', { class: 'knob' });
    this.joy.append(this.knob);
    this.banner = h('div', { class: 'banner' });
    root.append(this.menuLayer, this.hud, this.joy, this.banner);
    this.bindInput();
    onLangChange(() => this.render());
    this.render();
  }

  // ── SceneHost ─────────────────────────────────────────────────────────────

  run(): Run | null {
    return this.current;
  }

  input(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) x += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) y -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) y += 1;
    if (this.stick.active) {
      x += this.stick.x;
      y += this.stick.y;
    }
    return { x, y };
  }

  reducedMotion(): boolean {
    return this.profile.settings.reducedMotion;
  }

  advance(dt: number): void {
    const r = this.current;
    if (!r) return;
    if (!this.paused && !this.modalBusy) {
      this.acc += dt;
      const inp = this.input();
      while (this.acc >= STEP) {
        step(r, STEP, inp.x, inp.y);
        this.acc -= STEP;
        if (isPaused(r)) {
          this.acc = 0;
          break;
        }
      }
    }
    if (!this.modalBusy && !this.paused && !r.over) {
      if (r.pendingChests > 0) this.openChest();
      else if (r.pendingLevelUps > 0) this.openLevelUp();
    }
    this.updateHud();
  }

  onEvent(e: SimEvent): void {
    this.deps.sfx.play(e);
    if (e.k === 'boss') this.showBanner(`${t('run.boss')}\n${t(`bossname.${e.id}`)}`, 'danger');
    else if (e.k === 'swarm') this.showBanner(t('run.swarm'), 'warn');
    else if (e.k === 'revive') this.showBanner(t('run.revive'), 'good');
    else if (e.k === 'kill' && !this.profile.enemiesSeen.includes(e.id)) this.profile.enemiesSeen.push(e.id);
    else if (e.k === 'over') this.endRun();
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private bindInput(): void {
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code)) {
        this.keys.add(e.code);
        if (this.screen === 'run') e.preventDefault();
      }
      if (e.defaultPrevented) return; // the open dialog consumed it
      if ((e.code === 'Escape' || e.code === 'KeyP') && this.screen === 'run' && this.current && !this.current.over && !this.modalBusy) {
        if (this.paused) this.deps.modal.close();
        else this.pause();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.screen === 'run' && this.current && !this.current.over && !this.paused && !this.modalBusy) this.pause();
    });
    const surface = this.root;
    surface.addEventListener('pointerdown', (e) => {
      if (this.screen !== 'run' || this.paused || this.modalBusy) return;
      if ((e.target as HTMLElement).closest('button')) return;
      this.stick = { active: true, ox: e.clientX, oy: e.clientY, x: 0, y: 0, id: e.pointerId };
      this.joy.style.left = `${e.clientX}px`;
      this.joy.style.top = `${e.clientY}px`;
      this.knob.style.transform = 'translate(-50%, -50%)';
      this.joy.classList.remove('hidden');
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.stick.active || e.pointerId !== this.stick.id) return;
      const dx = e.clientX - this.stick.ox;
      const dy = e.clientY - this.stick.oy;
      const d = Math.hypot(dx, dy);
      const R = 44;
      const k = d > R ? R / d : 1;
      this.stick.x = (dx * k) / R;
      this.stick.y = (dy * k) / R;
      this.knob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.active = false;
      this.stick.x = this.stick.y = 0;
      this.joy.classList.add('hidden');
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  // ── Run lifecycle ─────────────────────────────────────────────────────────

  start(): void {
    this.deps.sfx.click();
    this.current = createRun(this.profile.selectedChar, metaInput(this.profile), (Date.now() ^ 0x5bd1e995) | 0);
    this.acc = 0;
    this.paused = false;
    this.modalBusy = false;
    this.screen = 'run';
    this.render();
    this.showBanner(t('run.controls'), 'info', 3500);
  }

  private pause(): void {
    if (!this.current || this.paused) return;
    this.paused = true;
    this.stick.active = false;
    this.joy.classList.add('hidden');
    this.deps.modal.open(
      t('run.paused'),
      h('div', {}, this.buildSlots(true)),
      [
        h('button', { class: 'btn ghost', onclick: () => this.quit() }, t('run.quit')),
        h('button', { class: 'btn', onclick: () => this.deps.modal.close() }, t('run.resume')),
      ],
      () => (this.paused = false),
    );
  }

  private quit(): void {
    if (!this.current) return;
    this.deps.modal.close();
    this.current.over = 'dead';
    this.endRun();
  }

  private optionCard(o: Option, onPick: () => void, highlight = false): HTMLElement {
    let icon = 0;
    let name = '';
    let desc = '';
    let tag = '';
    if (o.kind === 'weapon') {
      icon = weaponDef(o.id).icon;
      name = t(`weapon.${o.id}.name`);
      desc = o.level === 1 ? t(`weapon.${o.id}.desc`) : t('weapon.up');
      tag = o.level === 1 ? t('run.new') : t('run.lvl', { n: o.level });
    } else if (o.kind === 'passive') {
      icon = passiveDef(o.id).icon;
      name = t(`passive.${o.id}.name`);
      desc = t(`passive.${o.id}.desc`);
      tag = o.level === 1 ? t('run.new') : t('run.lvl', { n: o.level });
    } else if (o.kind === 'evolve') {
      icon = weaponDef(o.id).icon;
      name = t(`weapon.${o.id}.evo`);
      desc = t(`weapon.${o.id}.name`);
      tag = t('run.evolve');
    } else if (o.kind === 'gold') {
      icon = 188;
      name = t('run.goldOpt', { n: o.amount });
    } else {
      icon = 529;
      name = t('run.healOpt');
    }
    return h(
      'button',
      { class: `opt ${highlight || o.kind === 'evolve' ? 'evo' : ''}`, onclick: onPick },
      sprite('onebit', icon, 3),
      h('div', { class: 'opt-body' }, h('div', { class: 'opt-head' }, h('b', {}, name), tag ? h('span', { class: 'tag' }, tag) : null), desc ? h('div', { class: 'desc' }, desc) : null),
    );
  }

  private openLevelUp(): void {
    const r = this.current!;
    this.modalBusy = true;
    this.stick.active = false;
    this.joy.classList.add('hidden');
    const opts = levelUpOptions(r);
    const body = h(
      'div',
      { class: 'opts' },
      ...opts.map((o) =>
        this.optionCard(o, () => {
          applyOption(r, o);
          r.pendingLevelUps--;
          this.deps.sfx.click();
          this.deps.modal.close();
        }),
      ),
    );
    this.deps.modal.open(t('run.levelup'), body, [], () => (this.modalBusy = false));
  }

  private openChest(): void {
    const r = this.current!;
    this.modalBusy = true;
    this.stick.active = false;
    this.joy.classList.add('hidden');
    const o = chestContents(r);
    let taken = false;
    const grant = () => {
      if (taken) return;
      taken = true;
      applyOption(r, o);
      r.pendingChests--;
    };
    const take = () => {
      grant();
      this.deps.modal.close();
    };
    this.deps.modal.open(t('run.chest'), h('div', { class: 'opts' }, this.optionCard(o, take, true)), [h('button', { class: 'btn', onclick: take }, t('run.chestTake'))], () => {
      grant(); // closed without taking (Esc/backdrop): chests are never lost
      this.modalBusy = false;
    });
  }

  private endRun(): void {
    const r = this.current;
    if (!r) return;
    const res = finishRun(this.profile, r);
    this.deps.save();
    this.modalBusy = true;
    this.showResults(res);
  }

  private showResults(res: RunResult): void {
    const lines: HTMLElement[] = [
      h('p', { class: 'res-stats' }, t('res.stats', { t: fmtTime(res.time), l: res.level, k: res.kills })),
      h('p', { class: 'res-gold' }, t('res.gold', { n: res.gold })),
      ...res.newWeapons.map((w) => h('p', { class: 'unlock-line' }, t('res.newWeapon', { w: t(`weapon.${w}.name`) }))),
      ...res.newChars.map((c) => h('p', { class: 'unlock-line' }, t('res.newChar', { c: t(`char.${c}.name`) }))),
      ...res.newEvolutions.map((e) => h('p', { class: 'unlock-line' }, t('res.newEvo', { e: t(`weapon.${e}.evo`) }))),
    ];
    const toMenu = () => {
      this.deps.modal.close();
      this.current = null;
      this.modalBusy = false;
      this.screen = 'menu';
      this.render();
    };
    this.deps.modal.open(
      t(res.result === 'win' ? 'res.win' : 'res.dead'),
      h('div', { class: 'results' }, ...lines),
      [
        h('button', { class: 'btn ghost', onclick: toMenu }, t('res.menu')),
        h('button', { class: 'btn', onclick: () => (this.deps.modal.close(), this.start()) }, t('res.again')),
      ],
      () => {
        if (this.screen === 'run' && this.current?.over) toMenu();
      },
    );
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private slotSig = '';
  private buildSlots(big = false): HTMLElement {
    const r = this.current!;
    const wrap = h('div', { class: `slot-row ${big ? 'big' : ''}` });
    for (const w of r.weapons) wrap.append(h('span', { class: `slot ${w.evolved ? 'evo' : ''}`, title: t(`weapon.${w.id}.name`) }, sprite('onebit', weaponDef(w.id).icon, big ? 2 : 1), h('b', {}, `${w.level}`)));
    for (const p of r.passives) wrap.append(h('span', { class: 'slot passive', title: t(`passive.${p.id}.name`) }, sprite('onebit', passiveDef(p.id).icon, big ? 2 : 1), h('b', {}, `${p.level}`)));
    return wrap;
  }

  private updateHud(): void {
    const r = this.current;
    if (!r) return;
    const e = this.el;
    setWidth(e.xpFill, r.xp / r.xpNext);
    setText(e.lvl, t('hud.level', { n: r.level }));
    setWidth(e.hullFill, r.hp / r.stats.maxHp);
    toggleClass(e.hullFill.parentElement!, 'low', r.hp / r.stats.maxHp < 0.3);
    setText(e.timer, fmtTime(r.t));
    setText(e.kills, t('hud.kills', { n: r.kills }));
    setText(e.gold, t('hud.gold', { n: r.gold }));
    const sig = r.weapons.map((w) => `${w.id}${w.level}${w.evolved}`).join() + r.passives.map((p) => `${p.id}${p.level}`).join() + getLang();
    if (sig !== this.slotSig) {
      this.slotSig = sig;
      e.slots.replaceChildren(this.buildSlots());
    }
  }

  private bannerTimer = 0;
  private showBanner(text: string, kind: 'danger' | 'warn' | 'good' | 'info', ms = 2200): void {
    this.banner.textContent = text;
    this.banner.className = `banner show ${kind}`;
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => (this.banner.className = 'banner'), ms);
  }

  // ── Menus ─────────────────────────────────────────────────────────────────

  private go(s: Screen): void {
    this.deps.sfx.click();
    this.screen = s;
    this.render();
  }

  render(): void {
    const inRun = this.screen === 'run';
    toggleClass(this.hud, 'hidden', !inRun);
    toggleClass(this.menuLayer, 'hidden', inRun);
    toggleClass(this.root, 'running', inRun);
    this.slotSig = '';
    if (inRun) return;
    const back = h('button', { class: 'btn ghost back', onclick: () => this.go('menu') }, t('menu.back'));
    let content: HTMLElement;
    switch (this.screen) {
      case 'robots':
        content = this.robotsScreen();
        break;
      case 'shop':
        content = this.shopScreen();
        break;
      case 'collection':
        content = this.collectionScreen();
        break;
      case 'guide':
        content = this.guideScreen();
        break;
      default:
        content = this.mainMenu();
    }
    this.menuLayer.replaceChildren(h('div', { class: `menu-card ${this.screen}` }, this.screen === 'menu' ? null : back, content));
  }

  private mainMenu(): HTMLElement {
    const p = this.profile;
    const ch = CHARACTERS.find((c) => c.id === p.selectedChar)!;
    return h(
      'div',
      { class: 'main-menu' },
      h('h1', { class: 'logo' }, 'RUSTHEART'),
      h('p', { class: 'tagline' }, t('menu.tagline')),
      h('button', { class: 'btn play', onclick: () => this.start() }, t('menu.play')),
      h('div', { class: 'menu-sub' }, t('menu.selected', { name: t(`char.${ch.id}.name`) }), ' · ', h('span', { class: 'gold' }, t('menu.gold', { n: p.gold }))),
      h(
        'div',
        { class: 'menu-grid' },
        h('button', { class: 'btn ghost', onclick: () => this.go('robots') }, sprite('onebit', 25, 1), ' ', t('menu.robots')),
        h('button', { class: 'btn ghost', onclick: () => this.go('shop') }, sprite('onebit', 188, 1), ' ', t('menu.shop')),
        h('button', { class: 'btn ghost', onclick: () => this.go('collection') }, sprite('onebit', 768, 1), ' ', t('menu.collection')),
        h('button', { class: 'btn ghost', onclick: () => this.go('guide') }, sprite('onebit', 674, 1), ' ', t('menu.guide')),
      ),
      h('button', { class: 'btn ghost small', onclick: () => this.openSettings() }, `⚙ ${t('menu.settings')}`),
      p.stats.runs ? h('div', { class: 'hint' }, t('menu.best', { t: fmtTime(p.stats.bestTime), w: p.stats.wins, r: p.stats.runs })) : null,
    );
  }

  private unlockText(c: CharacterDef): string {
    if (c.unlock.kind === 'stat') return t(`unlock.stat.${c.unlock.stat}`, { n: c.unlock.gte });
    return '';
  }

  private robotsScreen(): HTMLElement {
    const p = this.profile;
    return h(
      'div',
      {},
      h('h2', {}, t('robots.title')),
      h('div', { class: 'gold' }, t('menu.gold', { n: p.gold })),
      ...CHARACTERS.map((c) => {
        const owned = p.chars.includes(c.id);
        let action: HTMLElement;
        if (owned)
          action =
            p.selectedChar === c.id
              ? h('button', { class: 'btn', disabled: true }, t('robots.selected'))
              : h('button', { class: 'btn', onclick: () => ((p.selectedChar = c.id), this.deps.save(), this.render()) }, t('robots.select'));
        else if (c.unlock.kind === 'gold')
          action = h('button', { class: 'btn', disabled: !canUnlockChar(p, c.id), onclick: () => (unlockChar(p, c.id) && ((p.selectedChar = c.id), this.deps.save()), this.render()) }, t('robots.buy', { n: c.unlock.cost }));
        else action = h('div', { class: 'hint' }, t('robots.locked', { how: this.unlockText(c) }));
        const robot = h('span', { class: 'robot-swatch', style: `--tint:#${c.tint.toString(16).padStart(6, '0')}` }, sprite('onebit', weaponDef(c.weapon).icon, 2));
        return h(
          'div',
          { class: `card row ${owned ? '' : 'locked'}` },
          robot,
          h('div', { class: 'grow' }, h('b', {}, t(`char.${c.id}.name`)), h('div', { class: 'desc' }, t('robots.weapon', { w: t(`weapon.${c.weapon}.name`) })), h('div', { class: 'sub' }, t(`char.${c.id}.perk`))),
          action,
        );
      }),
    );
  }

  private shopScreen(): HTMLElement {
    const p = this.profile;
    return h(
      'div',
      {},
      h('h2', {}, t('shop.title')),
      h('p', { class: 'desc' }, t('shop.desc')),
      h('div', { class: 'gold big' }, t('menu.gold', { n: p.gold })),
      h(
        'div',
        { class: 'shop-grid' },
        ...META.map((m) => {
          const lvl = p.levels[m.id] ?? 0;
          const maxed = lvl >= m.max;
          const cost = metaCost(m, lvl);
          return h(
            'div',
            { class: 'card shop-item' },
            h('div', { class: 'row' }, sprite('onebit', m.icon, 2), h('div', { class: 'grow' }, h('b', {}, t(`meta.${m.id}.name`)), h('div', { class: 'pips' }, ...Array.from({ length: m.max }, (_, i) => h('i', { class: i < lvl ? 'on' : '' }))))),
            h('div', { class: 'desc' }, t(`meta.${m.id}.desc`)),
            h(
              'button',
              { class: 'btn', disabled: maxed || p.gold < cost, onclick: () => (buyMeta(p, m.id) && (this.deps.sfx.click(), this.deps.save()), this.render()) },
              maxed ? t('shop.max') : t('shop.buy', { n: cost }),
            ),
          );
        }),
      ),
    );
  }

  private collectionScreen(): HTMLElement {
    const p = this.profile;
    const unlocked = unlockedWeapons(p);
    const statHow = (stat: StatKey, gte: number) => t(`unlock.stat.${stat}`, { n: gte });
    const allEnemies = [...ENEMIES, ...BOSSES];
    return h(
      'div',
      {},
      h('h2', {}, t('col.title')),
      h('h3', {}, t('col.weapons')),
      ...WEAPONS.map((w) => {
        const open = unlocked.includes(w.id);
        const lock = WEAPON_UNLOCKS.find((u) => u.weapon === w.id);
        return h(
          'div',
          { class: `card row ${open ? '' : 'locked'}` },
          sprite('onebit', w.icon, 2),
          h('div', { class: 'grow' }, h('b', {}, t(`weapon.${w.id}.name`)), h('div', { class: 'desc' }, open ? t(`weapon.${w.id}.desc`) : t('col.locked', { how: lock ? statHow(lock.stat, lock.gte) : '' }))),
        );
      }),
      h('h3', {}, t('col.evolutions', { n: p.evolutionsFound.length, m: WEAPONS.length })),
      ...WEAPONS.map((w) => {
        const found = p.evolutionsFound.includes(w.id);
        return h(
          'div',
          { class: `card row ${found ? 'evo' : 'locked'}` },
          sprite('onebit', w.icon, 2),
          found
            ? h('div', { class: 'grow' }, h('b', {}, t(`weapon.${w.id}.evo`)), h('div', { class: 'desc' }, t('col.evoHint', { w: t(`weapon.${w.id}.name`), p: t(`passive.${w.evolveWith}.name`) })))
            : h('div', { class: 'grow' }, h('div', { class: 'desc' }, t('col.evoUnknown'))),
        );
      }),
      h('h3', {}, t('col.enemies', { n: p.enemiesSeen.length, m: allEnemies.length })),
      h(
        'div',
        { class: 'enemy-grid' },
        ...allEnemies.map((e) => {
          const seen = p.enemiesSeen.includes(e.id);
          return h('div', { class: `enemy-cell ${seen ? '' : 'unknown'}` }, seen && e.frame >= 0 ? sprite('tiny', e.frame, 2) : h('span', { class: 'qm' }, '?'), h('span', {}, seen ? t(`enemy.${e.id}`) : '???'));
        }),
      ),
      h('h3', {}, t('col.stats')),
      h('p', { class: 'desc' }, t('col.statsText', { r: p.stats.runs, w: p.stats.wins, t: fmtTime(p.stats.bestTime), k: p.stats.kills, b: p.stats.bossKills, l: p.stats.maxLevel })),
    );
  }

  private guideScreen(): HTMLElement {
    const icons = [1062, 1008, 522, 289, 616, 237, 980, 674];
    return h(
      'div',
      {},
      h('h2', {}, t('guide.title')),
      ...Array.from({ length: 8 }, (_, i) =>
        h('details', { class: 'card guide', open: i < 3 }, h('summary', {}, sprite('onebit', icons[i], 1), ' ', t(`guide.s${i + 1}.t`)), h('p', { class: 'desc' }, t(`guide.s${i + 1}.b`))),
      ),
    );
  }

  // ── Settings & intro ──────────────────────────────────────────────────────

  private langPicker(reopen: () => void): HTMLElement {
    return h(
      'div',
      { class: 'segmented langs' },
      ...LANGS.map((l) =>
        h(
          'button',
          {
            class: `seg ${getLang() === l.id ? 'on' : ''}`,
            onclick: () => {
              this.profile.settings.lang = l.id;
              setLang(l.id);
              this.deps.save();
              this.deps.modal.close();
              reopen();
            },
          },
          l.label,
        ),
      ),
    );
  }

  showIntro(): void {
    const s = this.profile.settings;
    this.deps.modal.open(
      t('intro.title'),
      h('div', {}, this.langPicker(() => this.showIntro()), h('p', {}, t('intro.p1')), h('p', {}, t('intro.p2')), h('p', { class: 'desc' }, t('intro.p3'))),
      [h('button', { class: 'btn', onclick: () => this.deps.modal.close() }, t('intro.start'))],
      () => {
        s.introSeen = true;
        this.deps.save();
      },
    );
  }

  openSettings(): void {
    const set = this.profile.settings;
    const exportArea = h('textarea', { class: 'save-text', readonly: true, rows: 3 }) as HTMLTextAreaElement;
    const importArea = h('textarea', { class: 'save-text', rows: 3, placeholder: t('settings.paste') }) as HTMLTextAreaElement;
    const toggle = (label: string, get: () => boolean, put: (v: boolean) => void) => {
      const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
      input.checked = get();
      input.addEventListener('change', () => put(input.checked));
      return h('label', { class: 'setting' }, input, ' ', label);
    };
    const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05 }) as HTMLInputElement;
    vol.value = String(set.volume);
    vol.addEventListener('input', () => (set.volume = Number(vol.value)));
    let armed = false;
    const resetBtn = h('button', { class: 'btn danger' }, t('settings.reset'));
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        resetBtn.textContent = t('settings.resetConfirm');
        return;
      }
      this.deps.hardReset();
    });
    this.deps.modal.open(
      t('settings.title'),
      h(
        'div',
        { class: 'settings' },
        h('div', { class: 'card-title' }, t('settings.language')),
        this.langPicker(() => this.openSettings()),
        toggle(t('settings.sfx'), () => set.sfx, (v) => (set.sfx = v)),
        h('label', { class: 'setting' }, `${t('settings.volume')} `, vol),
        toggle(t('settings.motion'), () => set.reducedMotion, (v) => (set.reducedMotion = v)),
        h('div', { class: 'card-title' }, t('settings.save')),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn', onclick: () => ((exportArea.value = this.deps.exportSave()), exportArea.select()) }, t('settings.export')),
          h('button', {
            class: 'btn ghost',
            onclick: () => {
              const err = this.deps.importSave(importArea.value);
              if (err) this.deps.toasts.show(t(err), 'danger');
            },
          }, t('settings.import')),
          resetBtn,
        ),
        exportArea,
        importArea,
        h('div', { class: 'card-title' }, t('settings.credits')),
        h('p', { class: 'desc' }, t('settings.creditsText')),
      ),
      [],
      () => this.deps.save(),
    );
  }
}

