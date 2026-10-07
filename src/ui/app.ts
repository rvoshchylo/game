import type { OfflineReport } from '../core/engine';
import { autopilotChoice, canLaunch, nodeLabel, storageCap } from '../core/expedition';
import { bossById } from '../data/enemies';
import { eventById } from '../data/events';
import { moduleById } from '../data/modules';
import { stratumById } from '../data/strata';
import { formatDuration, formatNumber } from '../utils/format';
import type { UiContext } from './context';
import { h, setDisabled, setText, setWidth, toggleClass, type Panel } from './dom';
import { AutopilotPanel } from './panels/autopilot';
import { CampPanel } from './panels/camp';
import { JournalPanel } from './panels/journal';
import { RigPanel } from './panels/rig';
import { NODE_ICON, RES_ICON, sprite } from './sprites';

const TABS: { id: string; label: string; flag: string | null }[] = [
  { id: 'rig', label: 'RIG', flag: null },
  { id: 'camp', label: 'CAMP', flag: null },
  { id: 'autopilot', label: 'AUTOPILOT', flag: 'radio' },
  { id: 'journal', label: 'JOURNAL', flag: null },
];

const NODE_HINT: Record<string, string> = {
  fight: 'scrap, maybe copper',
  elite: 'tough — carries a blueprint',
  cache: 'loot without a fight',
  rest: 'repair 35% hull',
  event: 'a choice, a risk',
  boss: 'the Warden',
};

/** HTML layer around the Phaser canvas. Rebuilds pieces only when their signature changes. */
export class App {
  readonly stage: HTMLElement;
  private panels: Record<string, Panel>;
  private active = 'rig';
  private panelSig = '';
  private panelHost: HTMLElement;
  private tabBar: HTMLElement;
  private tabSig = '';
  private seenTabs = new Set(['rig']);
  private ops: HTMLElement;
  private opsSig = '';
  private el: Record<string, HTMLElement> = {};
  private live: { countdown?: HTMLElement; launch?: HTMLButtonElement; launchWhy?: HTMLElement } = {};

  constructor(
    root: HTMLElement,
    private ui: UiContext,
  ) {
    this.panels = { rig: new RigPanel(ui), camp: new CampPanel(ui), autopilot: new AutopilotPanel(ui), journal: new JournalPanel(ui) };
    const e = this.el;
    const b = (k: string, el: HTMLElement) => ((e[k] = el), el);
    this.stage = h('div', { id: 'stage' });
    this.panelHost = h('main', { class: 'panel' });
    this.tabBar = h('nav', { class: 'tabs', role: 'tablist' });
    this.ops = h('div', { class: 'ops' });

    const res = (key: keyof typeof RES_ICON, title: string) =>
      b(`${key}Box`, h('div', { class: `cur ${key}`, title }, sprite('onebit', RES_ICON[key], 1), b(key, h('b', {}))));
    const hud = h(
      'header',
      { class: 'hud' },
      h('div', { class: 'brand' }, 'RUSTHEART'),
      h('div', { class: 'grow' }),
      res('scrap', 'Scrap'),
      res('copper', 'Copper'),
      res('cores', 'Warden cores'),
      h('button', { class: 'btn ghost icon', 'aria-label': 'Settings', onclick: () => this.openSettings() }, '⚙︎'),
    );
    const bars = h(
      'div',
      { class: 'bars' },
      h('div', { class: 'meter hull' }, b('hullFill', h('div', { class: 'fill' })), b('hullText', h('span', { class: 'meter-text' }))),
      b('shieldRow', h('div', { class: 'meter thin shield' }, b('shieldFill', h('div', { class: 'fill' })))),
      b('crates', h('div', { class: 'crates' })),
    );
    root.append(
      h(
        'div',
        { class: 'layout' },
        hud,
        h('section', { class: 'play' }, h('div', { class: 'stage-wrap' }, this.stage), bars, this.ops),
        h('section', { class: 'side' }, this.tabBar, this.panelHost),
      ),
    );
    this.bindEvents();
  }

  private bindEvents(): void {
    const b = this.ui.engine.bus;
    const t = this.ui.toasts;
    b.on('unlock', (e) => t.show(e.message, 'unlock', 6000));
    b.on('blueprint', (e) => t.show(`Blueprint found: ${moduleById(e.defId).name}. It will be in the Workshop when the robot is home.`, 'loot', 5000));
    b.on('combo', (e) => t.show(`Discovery: ${e.name}!`, 'unlock', 5000));
    b.on('lore', () => t.show('An echo log was recovered. See the Journal.', 'lore'));
    b.on('error', (e) => t.show(e.text, 'danger'));
    b.on('eventResult', (e) => t.show(e.text, 'lore'));
    b.on('returned', (e) => {
      const r = e.report;
      t.show(
        r.bossDefeated ? `The Warden is down! Tier ${this.ui.engine.state.tierUnlocked} is open. +${r.scrap} scrap, +${r.copper} copper, +${r.cores} core.` : `${r.broken ? 'Back, battered' : 'Back at camp'}: +${r.scrap} scrap, +${r.copper} copper${r.blueprints.length ? `, ${r.blueprints.length} blueprint(s)` : ''}.`,
        r.broken ? 'danger' : 'loot',
        5000,
      );
      this.ui.actions.saveNow();
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
    const tabs = TABS.filter((tb) => tb.flag === null || s.flags.includes(tb.flag));
    const sig = tabs.map((x) => x.id).join(',') + this.active + [...this.seenTabs].join(',');
    if (sig === this.tabSig) return;
    this.tabSig = sig;
    this.tabBar.replaceChildren(
      ...tabs.map((tb) =>
        h('button', { class: `tab ${tb.id === this.active ? 'on' : ''} ${this.seenTabs.has(tb.id) ? '' : 'new'}`, role: 'tab', onclick: () => (this.ui.sfx.click(), this.setTab(tb.id)) }, tb.label),
      ),
    );
  }

  // ── Expedition controls (under the stage) ─────────────────────────────────

  private opsSignature(): string {
    const s = this.ui.engine.state;
    const x = s.exp;
    if (!x) return `camp|${s.tierUnlocked}|${s.selectedTier}|${s.lastReport?.endedAt}|${s.stats.deepestLayer > 4}`;
    return `exp|${x.phase}|${x.layer}|${x.path.join(',')}|${x.map[x.layer]?.length}`;
  }

  private buildOps(): void {
    const eng = this.ui.engine;
    const s = eng.state;
    const x = s.exp;
    this.live = {};
    const parts: HTMLElement[] = [];
    if (!x) {
      // At camp: launch
      const tiers = h('div', { class: 'segmented tiers' });
      for (let t = 1; t <= s.tierUnlocked; t++)
        tiers.append(h('button', { class: `seg ${t === s.selectedTier ? 'on' : ''}`, onclick: () => ((s.selectedTier = t), (this.opsSig = '')) }, `Tier ${t}`));
      this.live.launch = h('button', { class: 'btn launch', onclick: () => eng.dispatch({ type: 'launch', tier: s.selectedTier }) }, '▼ Send the robot down');
      this.live.launchWhy = h('div', { class: 'hint' });
      parts.push(h('div', { class: 'card' }, h('div', { class: 'row' }, s.tierUnlocked > 1 ? tiers : h('div', { class: 'card-title grow' }, stratumById('rust').name), this.live.launch), this.live.launchWhy));
      if (s.stats.deepestLayer > 4) {
        const boss = bossById(stratumById('rust').bossId);
        parts.push(h('div', { class: 'card warden' }, h('div', { class: 'card-title' }, `⚠ ${boss.name} waits at layer 8`), h('ul', { class: 'phases' }, ...boss.profile.map((p) => h('li', {}, p)))));
      }
      const r = s.lastReport;
      if (r)
        parts.push(
          h(
            'div',
            { class: 'card report' },
            h('div', { class: 'card-title' }, `Last expedition${r.tier > 1 ? ` (tier ${r.tier})` : ''}: ${r.bossDefeated ? 'Warden defeated' : r.broken ? 'broke down' : 'returned'} on layer ${r.layers}`),
            h(
              'div',
              { class: 'desc' },
              `+${r.scrap} scrap · +${r.copper} copper${r.cores ? ` · +${r.cores} core` : ''}${r.blueprints.length ? ` · blueprints: ${r.blueprints.map((b) => moduleById(b).name).join(', ')}` : ''}${r.cratesLost ? ` · ${r.cratesLost} crate(s) lost` : ''}${r.overflow ? ` · ${r.overflow} left outside (storage full)` : ''}`,
            ),
          ),
        );
    } else {
      // Map strip
      const map = h('div', { class: 'map' });
      x.map.forEach((layer, li) => {
        const col = h('div', { class: `map-col ${li === x.layer ? 'here' : li < x.layer ? 'past' : ''}` });
        layer.forEach((n, ni) => col.append(h('span', { class: `map-node ${x.path[li] === ni ? 'taken' : ''}`, title: nodeLabel(n.type) }, sprite('onebit', NODE_ICON[n.type], 1))));
        map.append(col);
      });
      parts.push(map);

      if (x.phase === 'choose' && x.map[x.layer].length > 1) {
        const nodes = x.map[x.layer];
        const auto = autopilotChoice(eng, nodes);
        this.live.countdown = h('div', { class: 'hint' });
        parts.push(
          h(
            'div',
            { class: 'card fork' },
            h('div', { class: 'card-title' }, `Fork on layer ${x.layer + 1}. Where to?`),
            h(
              'div',
              { class: 'choices' },
              ...nodes.map((n, i) =>
                h(
                  'button',
                  { class: `choice ${i === auto ? 'auto' : ''}`, onclick: () => eng.dispatch({ type: 'choose', index: i }) },
                  sprite('onebit', NODE_ICON[n.type], 2),
                  h('div', {}, h('b', {}, nodeLabel(n.type)), h('div', { class: 'desc' }, NODE_HINT[n.type])),
                ),
              ),
            ),
            this.live.countdown,
          ),
        );
      } else if (x.phase === 'event') {
        const node = x.map[x.layer][x.path[x.layer]];
        const ev = eventById(node.eventId!);
        this.live.countdown = h('div', { class: 'hint' });
        parts.push(
          h(
            'div',
            { class: 'card fork' },
            h('div', { class: 'card-title' }, ev.text),
            h(
              'div',
              { class: 'choices' },
              ...ev.options.map((o, i) =>
                h('button', { class: `choice ${i === ev.safe ? 'auto' : ''}`, onclick: () => eng.dispatch({ type: 'eventChoice', index: i }) }, h('div', {}, h('b', {}, o.label), h('div', { class: 'desc' }, o.chance < 1 ? `${Math.round(o.chance * 100)}% chance` : 'safe'))),
              ),
            ),
            this.live.countdown,
          ),
        );
      }
      if (x.phase !== 'return') parts.push(h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => eng.dispatch({ type: 'recall' }) }, '▲ Recall with cargo')));
    }
    this.ops.replaceChildren(...parts);
  }

  private updateOps(): void {
    const eng = this.ui.engine;
    const s = eng.state;
    const x = s.exp;
    if (this.live.countdown && x) {
      const secs = Math.max(0, Math.ceil(x.waitTimer));
      setText(this.live.countdown, x.phase === 'event' ? `No answer in ${secs}s → the robot plays it safe.` : `No choice in ${secs}s → autopilot takes the highlighted path.`);
    }
    if (this.live.launch) {
      const why = canLaunch(eng);
      setDisabled(this.live.launch, !!why);
      setText(this.live.launchWhy!, why ?? `Hull ${Math.round((s.robot.hp / eng.rig.maxHp) * 100)}% · cargo ${eng.rig.cargo} crates · ${formatNumber(eng.rig.dps)} dmg/s`);
    }
  }

  update(): void {
    const eng = this.ui.engine;
    const s = eng.state;
    const rig = eng.rig;
    const e = this.el;

    this.renderTabs();
    const tab = TABS.find((t) => t.id === this.active);
    if (!tab || (tab.flag && !s.flags.includes(tab.flag))) this.active = 'rig';
    const panel = this.panels[this.active];
    const sig = panel.signature();
    if (sig !== this.panelSig) {
      this.panelSig = sig;
      const scroll = this.panelHost.scrollTop;
      this.panelHost.replaceChildren(panel.build());
      this.panelHost.scrollTop = scroll;
    }
    panel.update();

    const osig = this.opsSignature();
    if (osig !== this.opsSig) {
      this.opsSig = osig;
      this.buildOps();
    }
    this.updateOps();

    // HUD
    const cap = storageCap(eng);
    setText(e.scrap, `${formatNumber(s.scrap)}`);
    toggleClass(e.scrapBox, 'full', s.scrap >= cap.scrap);
    setText(e.copper, `${formatNumber(s.copper)}`);
    toggleClass(e.copperBox, 'hidden', s.stats.copperEarned === 0 && s.copper === 0);
    toggleClass(e.copperBox, 'full', s.copper >= cap.copper);
    setText(e.cores, `${s.cores}`);
    toggleClass(e.coresBox, 'hidden', s.cores === 0 && s.stats.bossesWon === 0);

    setWidth(e.hullFill, s.robot.hp / rig.maxHp);
    toggleClass(e.hullFill.parentElement!, 'low', s.robot.hp / rig.maxHp < 0.3);
    setText(e.hullText, `HULL ${formatNumber(Math.max(0, s.robot.hp))}/${formatNumber(rig.maxHp)}${rig.shieldMax ? ` · SHIELD ${formatNumber(s.robot.shield)}` : ''}${rig.armor ? ` · ARMOR ${formatNumber(rig.armor)}` : ''}`);
    toggleClass(e.shieldRow, 'hidden', rig.shieldMax <= 0);
    if (rig.shieldMax > 0) setWidth(e.shieldFill, s.robot.shield / rig.shieldMax);

    const crates = s.exp ? s.exp.crates.length : 0;
    const csig = `${crates}/${rig.cargo}`;
    if (e.crates.dataset.sig !== csig) {
      e.crates.dataset.sig = csig;
      const icons: HTMLElement[] = [h('span', { class: 'lvl' }, 'CARGO ')];
      for (let i = 0; i < rig.cargo; i++) icons.push(sprite('onebit', 390, 1, i < crates ? 'crate full' : 'crate'));
      e.crates.replaceChildren(...icons);
    }
  }

  showOffline(r: OfflineReport): void {
    const lines: HTMLElement[] = [h('p', {}, `You were away for ${formatDuration(r.elapsedSec)}.${r.capped ? ` The robot only remembers the last ${formatDuration(r.countedSec)}.` : ''}`)];
    if (r.clockAnomaly) lines.push(h('p', { class: 'danger-text' }, 'The clock ran backwards. Nothing happened.'));
    if (r.expeditions || r.scrap || r.copper)
      lines.push(h('p', {}, `${r.expeditions} expedition(s) finished: `, h('b', {}, `+${formatNumber(r.scrap)} scrap, +${formatNumber(r.copper)} copper${r.cores ? `, +${r.cores} core` : ''}`), r.breakdowns ? ` (${r.breakdowns} breakdown${r.breakdowns > 1 ? 's' : ''})` : '', '.'));
    else if (!r.clockAnomaly) lines.push(h('p', { class: 'desc' }, 'The robot waited at camp. With a Radio Tower (level 3) it can relaunch on its own.'));
    if (r.journal.length) lines.push(h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'From the journal'), ...r.journal.slice(-12).map((j) => h('div', { class: 'log' }, j))));
    this.ui.modal.open('While you were away', h('div', {}, ...lines), [h('button', { class: 'btn', onclick: () => this.ui.modal.close() }, 'Back to the shaft')]);
  }

  private openSettings(): void {
    const set = this.ui.engine.state.settings;
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
    let armed = false;
    const resetBtn = h('button', { class: 'btn danger' }, 'Hard reset');
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
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
      toggle('Reduced motion (no screen shake)', () => set.reducedMotion, (v) => (set.reducedMotion = v)),
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
      h(
        'p',
        { class: 'desc' },
        'Sprites: Kenney (www.kenney.nl) — 1-Bit Pack and Tiny Dungeon, CC0. Fonts: Pixelify Sans (Stefie Justprince) and Silkscreen (Jason Kottke), SIL Open Font License 1.1. Robot, Warden art and all sounds are generated in code.',
      ),
    );
    this.ui.modal.open('Settings', body, [], () => this.ui.actions.saveNow());
  }
}
