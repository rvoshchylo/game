import { canChallenge } from '../core/systems/progression';
import { enemyBoss } from '../core/systems/combat';
import type { OfflineReport } from '../core/systems/offline';
import { itemById } from '../data/items';
import { logById } from '../data/logs';
import { TABS } from '../data/unlocks';
import { zoneForDepth } from '../data/zones';
import { formatDuration, formatNumber } from '../utils/format';
import type { UiContext } from './context';
import { h, setDisabled, setText, setWidth, toggleClass, type Panel } from './dom';
import { CodexPanel } from './panels/codex';
import { CollapsePanel } from './panels/collapse';
import { DrillPanel } from './panels/drill';
import { ProbesPanel } from './panels/probes';
import { RigPanel } from './panels/rig';

/** Builds the HTML layer around the Phaser canvas and keeps it in sync with the engine. */
export class App {
  readonly stage: HTMLElement;
  private panels: Record<string, Panel>;
  private active = 'drill';
  private panelSig = '';
  private panelHost: HTMLElement;
  private tabBar: HTMLElement;
  private tabSig = '';
  private seenTabs = new Set<string>(['drill']);
  private el: Record<string, HTMLElement> = {};

  constructor(
    root: HTMLElement,
    private ui: UiContext,
  ) {
    this.panels = {
      drill: new DrillPanel(ui),
      rig: new RigPanel(ui),
      probes: new ProbesPanel(ui),
      collapse: new CollapsePanel(ui),
      codex: new CodexPanel(ui),
    };
    const e = this.el;
    const b = (k: string, el: HTMLElement) => ((e[k] = el), el);

    this.stage = h('div', { id: 'stage' });
    this.panelHost = h('main', { class: 'panel' });
    this.tabBar = h('nav', { class: 'tabs', role: 'tablist' });

    const hud = h(
      'header',
      { class: 'hud' },
      h('div', { class: 'depth' }, h('span', { class: 'label' }, 'DEPTH'), b('depth', h('b', {})), b('zone', h('span', { class: 'zone' }))),
      h('div', { class: 'cur scrap', title: 'Scrap' }, h('i', {}, '⚙'), b('scrap', h('b', {}))),
      b('shardsBox', h('div', { class: 'cur shards hidden', title: 'Shards' }, h('i', {}, '◆'), b('shards', h('b', {})))),
      b('echoBox', h('div', { class: 'cur echoes hidden', title: 'Echoes' }, h('i', {}, '✦'), b('echoes', h('b', {})))),
      h('button', { class: 'btn ghost icon', 'aria-label': 'Settings', onclick: () => this.openSettings() }, '⚙︎'),
    );

    const bars = h(
      'div',
      { class: 'bars' },
      h(
        'div',
        { class: 'meter integrity' },
        b('intFill', h('div', { class: 'fill' })),
        b('intText', h('span', { class: 'meter-text' })),
      ),
      b(
        'heatRow',
        h(
          'div',
          { class: 'heat-row hidden' },
          h('div', { class: 'meter heat' }, b('heatFill', h('div', { class: 'fill' })), b('heatText', h('span', { class: 'meter-text' }))),
          b('vent', h('button', { class: 'btn vent', onclick: () => this.ui.engine.dispatch({ type: 'vent' }) }, 'VENT')),
        ),
      ),
    );

    const controls = h(
      'div',
      { class: 'controls' },
      b('ascend', h('button', { class: 'btn ghost hidden', 'aria-label': 'Ascend one depth', onclick: () => this.ui.engine.dispatch({ type: 'ascend' }) }, '▲')),
      b('mode', h('button', { class: 'btn mode hidden', onclick: () => this.toggleMode() })),
      h('div', { class: 'kills grow' }, h('div', { class: 'meter thin' }, b('killFill', h('div', { class: 'fill' }))), b('killText', h('span', { class: 'sub' }))),
      b('challenge', h('button', { class: 'btn danger hidden', onclick: () => this.ui.engine.dispatch({ type: 'challengeWarden' }) }, 'CHALLENGE WARDEN')),
    );

    const hint = b('hint', h('div', { class: 'stage-hint' }, 'Tap the glowing cracks!'));
    const status = b('status', h('div', { class: 'stage-status' }));

    root.append(
      h(
        'div',
        { class: 'layout' },
        hud,
        h('section', { class: 'play' }, h('div', { class: 'stage-wrap' }, this.stage, hint, status), bars, controls),
        h('section', { class: 'side' }, this.tabBar, this.panelHost),
      ),
    );
    this.bindEvents();
  }

  private toggleMode(): void {
    const s = this.ui.engine.state;
    this.ui.engine.dispatch({ type: 'setMode', mode: s.mode === 'push' ? 'hold' : 'push' });
  }

  private bindEvents(): void {
    const b = this.ui.engine.bus;
    const t = this.ui.toasts;
    b.on('unlock', (e) => t.show(e.message, 'unlock', 5000));
    b.on('itemFound', (e) => t.show(`Found ${itemById(e.item.defId).name} (${e.item.rarity})`, 'loot'));
    b.on('logFound', (e) => t.show(`Echo Log: “${logById(e.id).text}”`, 'lore', 7000));
    b.on('achievement', (e) => t.show(`Achievement: ${e.name}`, 'unlock'));
    b.on('probeDone', () => t.show(`A probe has returned. Collect it in PROBES.`, 'info'));
    b.on('signalResult', (e) => t.show(e.text, 'lore'));
    b.on('error', (e) => t.show(e.text, 'danger'));
    b.on('retreat', () => t.show('Retreat! Rust Debt: −25% damage for 15s. Descent set to HOLD.', 'danger'));
    b.on('bossDefeated', (e) => t.show(e.firstKill ? 'The Hollow Bell falls silent. Its clapper is yours.' : 'Warden broken.', 'unlock', 5000));
    b.on('collapsed', (e) => {
      t.show(`The shaft collapses. +${e.echoes} Echoes. You remember.`, 'unlock', 6000);
      this.setTab('drill');
    });
  }

  setTab(id: string): void {
    this.active = id;
    this.seenTabs.add(id);
    this.panelSig = '';
    this.tabSig = '';
  }

  private renderTabs(): void {
    const s = this.ui.engine.state;
    const unlocked = TABS.filter((tb) => tb.flag === null || s.flags.includes(tb.flag));
    const nextLocked = TABS.find((tb) => tb.flag !== null && !s.flags.includes(tb.flag));
    const sig = unlocked.map((x) => x.id).join(',') + '|' + this.active + '|' + [...this.seenTabs].join(',');
    if (sig === this.tabSig) return;
    this.tabSig = sig;
    const btns = unlocked.map((tb) =>
      h(
        'button',
        {
          class: `tab ${tb.id === this.active ? 'on' : ''} ${this.seenTabs.has(tb.id) ? '' : 'new'}`,
          role: 'tab',
          onclick: () => {
            this.ui.sfx.click();
            this.setTab(tb.id);
          },
        },
        tb.label,
      ),
    );
    if (nextLocked) {
      btns.push(
        h('button', { class: 'tab locked', onclick: () => this.ui.toasts.show('A faint signal… something else is down here.', 'info') }, '▒▒▒'),
      );
    }
    this.tabBar.replaceChildren(...btns);
  }

  update(): void {
    const eng = this.ui.engine;
    const s = eng.state;
    const st = eng.stats;
    const e = this.el;

    this.renderTabs();
    if (!(this.active in this.panels) || (TABS.find((x) => x.id === this.active)?.flag && !s.flags.includes(TABS.find((x) => x.id === this.active)!.flag!))) this.active = 'drill';
    const panel = this.panels[this.active];
    const sig = panel.signature();
    if (sig !== this.panelSig) {
      this.panelSig = sig;
      const scroll = this.panelHost.scrollTop;
      this.panelHost.replaceChildren(panel.build());
      this.panelHost.scrollTop = scroll;
    }
    panel.update();

    // HUD
    setText(e.depth, String(s.depth));
    setText(e.zone, zoneForDepth(s.depth).name);
    setText(e.scrap, formatNumber(s.scrap));
    toggleClass(e.shardsBox, 'hidden', s.stats.shardsEarned === 0);
    setText(e.shards, formatNumber(s.shards));
    toggleClass(e.echoBox, 'hidden', s.stats.collapses === 0 && s.echoes === 0);
    setText(e.echoes, formatNumber(s.echoes));

    // Integrity / heat
    setWidth(e.intFill, s.integrity / st.maxIntegrity);
    toggleClass(e.intFill.parentElement!, 'low', s.integrity / st.maxIntegrity < 0.3);
    setText(e.intText, `INTEGRITY ${formatNumber(Math.max(0, s.integrity))}/${formatNumber(st.maxIntegrity)}${s.rustDebt > 0 ? ` · RUST DEBT ${Math.ceil(s.rustDebt)}s` : ''}`);
    const heatOn = s.flags.includes('heat');
    toggleClass(e.heatRow, 'hidden', !heatOn);
    if (heatOn) {
      const venting = s.ventTime > 0;
      setWidth(e.heatFill, venting ? s.ventTime / st.ventDuration : s.heat / 100);
      toggleClass(e.heatFill.parentElement!, 'venting', venting);
      setText(e.heatText, venting ? `VENTING ${s.ventTime.toFixed(1)}s · ×2 DAMAGE` : `HEAT ${Math.floor(s.heat)}${s.chain > 1 ? ` · CHAIN ×${s.chain}` : ''}${s.ghostFractures ? ` · GHOST ${s.ghostFractures}` : ''}`);
      const ready = s.heat >= 100 && !venting;
      setDisabled(e.vent as HTMLButtonElement, !ready);
      toggleClass(e.vent, 'ready', ready);
      setText(e.vent, st.grants.has('autoVent') ? 'AUTO' : 'VENT');
    }

    // Descent controls
    const pushOn = s.flags.includes('push');
    toggleClass(e.mode, 'hidden', !pushOn);
    toggleClass(e.ascend, 'hidden', !pushOn);
    setDisabled(e.ascend as HTMLButtonElement, s.depth <= 1);
    setText(e.mode, s.mode === 'push' ? '▼ PUSH' : '■ HOLD');
    toggleClass(e.mode, 'hold', s.mode === 'hold');
    const need = st.killsPerDepth;
    const boss = s.enemy && enemyBoss(s.enemy);
    setWidth(e.killFill, boss ? s.enemy!.hp / s.enemy!.maxHp : Math.min(1, s.kills / need));
    setText(
      e.killText,
      boss
        ? `WARDEN · ${formatNumber(s.enemy!.hp)} HP`
        : `${Math.min(s.kills, need)}/${need} to descend${s.mode === 'hold' && s.kills >= need ? ' · holding' : ''}${s.pushReflexTimer > 0 ? ` · push in ${Math.ceil(s.pushReflexTimer)}s` : ''}`,
    );
    const challenge = canChallenge(eng);
    toggleClass(e.challenge, 'hidden', !challenge);

    toggleClass(e.hint, 'hidden', s.stats.fracturesHit >= 3);
    const status = s.signal ? 'A strange signal flickers… tap it!' : '';
    setText(e.status, status);
  }

  showOffline(r: OfflineReport): void {
    const lines: HTMLElement[] = [h('p', {}, `You were gone for ${formatDuration(r.elapsedSec)}.${r.capped ? ` The hopper only held ${formatDuration(r.countedSec)}.` : ''}`)];
    if (r.clockAnomaly) lines.push(h('p', { class: 'danger-text' }, 'The clock ran backwards. Nothing happened.'));
    if (r.kills > 0) lines.push(h('p', {}, `The drill destroyed ${formatNumber(r.kills)} things at depth ${r.farmDepth} and hauled `, h('b', {}, `${formatNumber(r.scrap)} scrap`), '.'));
    else if (!r.clockAnomaly) lines.push(h('p', { class: 'desc' }, 'Without a Drill Motor nothing moved while you were away.'));
    if (r.depthLost > 0) lines.push(h('p', { class: 'danger-text' }, `It could not hold depth ${r.farmDepth + r.depthLost} alone and fell back ${r.depthLost}.`));
    if (r.probesReady > 0) lines.push(h('p', {}, `${r.probesReady} probe(s) returned.`));
    lines.push(h('p', { class: 'desc' }, 'Offline the drill works at half efficiency and never pushes deeper. Shards only come from your hands.'));
    this.ui.modal.open('While you were away', h('div', {}, ...lines), [h('button', { class: 'btn', onclick: () => this.ui.modal.close() }, 'Back to the dig')]);
  }

  private openSettings(): void {
    const s = this.ui.engine.state;
    const set = s.settings;
    const exportArea = h('textarea', { class: 'save-text', readonly: true, rows: 3 }) as HTMLTextAreaElement;
    const importArea = h('textarea', { class: 'save-text', rows: 3, placeholder: 'Paste a save string…' }) as HTMLTextAreaElement;
    const toggle = (label: string, get: () => boolean, put: (v: boolean) => void) => {
      const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
      input.checked = get();
      input.addEventListener('change', () => put(input.checked));
      return h('label', { class: 'setting' }, input, ' ', label);
    };
    const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05 }) as HTMLInputElement;
    vol.value = String(set.volume);
    vol.addEventListener('input', () => (set.volume = Number(vol.value)));
    let resetArmed = false;
    const resetBtn = h('button', { class: 'btn danger' }, 'Hard reset');
    resetBtn.addEventListener('click', () => {
      if (!resetArmed) {
        resetArmed = true;
        resetBtn.textContent = 'Tap again to erase everything';
        return;
      }
      this.ui.actions.hardReset();
    });
    const body = h(
      'div',
      { class: 'settings' },
      toggle('Sound effects', () => set.sfx, (v) => (set.sfx = v)),
      h('label', { class: 'setting' }, 'Volume ', vol),
      toggle('Reduced motion (no shake)', () => set.reducedMotion, (v) => (set.reducedMotion = v)),
      h('div', { class: 'card-title' }, 'Save'),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn', onclick: () => ((exportArea.value = this.ui.actions.exportSave()), exportArea.select()) }, 'Export'),
        h('button', {
          class: 'btn ghost',
          onclick: () => {
            const err = this.ui.actions.importSave(importArea.value);
            if (err) this.ui.toasts.show(err, 'danger');
          },
        }, 'Import'),
        resetBtn,
      ),
      exportArea,
      importArea,
      h('div', { class: 'card-title' }, 'Credits'),
      h('p', { class: 'desc' }, 'Rustheart — design & code. Fonts: Pixelify Sans (Stefie Justprince) and Silkscreen (Jason Kottke), SIL Open Font License 1.1. All sprites and sounds are procedurally generated.'),
    );
    this.ui.modal.open('Settings', body, [], () => this.ui.actions.saveNow());
  }
}
