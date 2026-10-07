import type { OfflineReport } from '../core/engine';
import { autopilotChoice, canLaunch, storageCap } from '../core/expedition';
import { bossById } from '../data/enemies';
import { eventById } from '../data/events';
import { stratumById } from '../data/strata';
import { getLang, LANGS, onLangChange, setLang, t } from '../i18n';
import { formatDuration, formatNumber } from '../utils/format';
import type { UiContext } from './context';
import { h, setDisabled, setText, setWidth, toggleClass, type Panel } from './dom';
import { AutopilotPanel } from './panels/autopilot';
import { CampPanel } from './panels/camp';
import { GuidePanel } from './panels/guide';
import { JournalPanel, journalText } from './panels/journal';
import { modName, RigPanel } from './panels/rig';
import { NODE_ICON, RES_ICON, sprite } from './sprites';

const TABS: { id: string; key: string; flag: string | null }[] = [
  { id: 'rig', key: 'tab.rig', flag: null },
  { id: 'camp', key: 'tab.camp', flag: null },
  { id: 'autopilot', key: 'tab.autopilot', flag: 'radio' },
  { id: 'journal', key: 'tab.journal', flag: null },
  { id: 'guide', key: 'tab.guide', flag: null },
];

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
    this.panels = { rig: new RigPanel(ui), camp: new CampPanel(ui), autopilot: new AutopilotPanel(ui), journal: new JournalPanel(ui), guide: new GuidePanel(ui) };
    const e = this.el;
    const b = (k: string, el: HTMLElement) => ((e[k] = el), el);
    this.stage = h('div', { id: 'stage' });
    this.panelHost = h('main', { class: 'panel' });
    this.tabBar = h('nav', { class: 'tabs', role: 'tablist' });
    this.ops = h('div', { class: 'ops' });

    const res = (key: keyof typeof RES_ICON) => b(`${key}Box`, h('div', { class: `cur ${key}` }, sprite('onebit', RES_ICON[key], 1), b(key, h('b', {}))));
    const hud = h(
      'header',
      { class: 'hud' },
      h('div', { class: 'brand' }, 'RUSTHEART'),
      h('div', { class: 'grow' }),
      res('scrap'),
      res('copper'),
      res('cores'),
      h('button', { class: 'btn ghost icon', 'aria-label': 'Guide', onclick: () => this.setTab('guide') }, '?'),
      b('settingsBtn', h('button', { class: 'btn ghost icon', onclick: () => this.openSettings() }, '⚙︎')),
    );
    const bars = h(
      'div',
      { class: 'bars' },
      h('div', { class: 'meter hull' }, b('hullFill', h('div', { class: 'fill' })), b('hullText', h('span', { class: 'meter-text' }))),
      b('shieldRow', h('div', { class: 'meter thin shield' }, b('shieldFill', h('div', { class: 'fill' })))),
      b('crates', h('div', { class: 'crates' })),
    );
    root.append(
      h('div', { class: 'layout' }, hud, h('section', { class: 'play' }, h('div', { class: 'stage-wrap' }, this.stage), bars, this.ops), h('section', { class: 'side' }, this.tabBar, this.panelHost)),
    );
    this.bindEvents();
    onLangChange(() => this.refreshAll());
  }

  /** Force every piece of DOM to rebuild (after a language change). */
  refreshAll(): void {
    this.panelSig = '';
    this.tabSig = '';
    this.opsSig = '';
    this.el.crates.dataset.sig = '';
    this.update();
  }

  private bindEvents(): void {
    const b = this.ui.engine.bus;
    const toast = this.ui.toasts;
    b.on('unlock', (e) => toast.show(t(`unlock.${e.flag}`), 'unlock', 6000));
    b.on('blueprint', (e) => toast.show(t('toast.blueprint', { m: modName(e.defId) }), 'loot', 5000));
    b.on('combo', (e) => toast.show(t('toast.combo', { c: t(`combo.${e.id}.name`) }), 'unlock', 5000));
    b.on('lore', () => toast.show(t('toast.lore'), 'lore'));
    b.on('error', (e) => toast.show(t(e.key), 'danger'));
    b.on('eventResult', (e) => t(e.key) && toast.show(t(e.key), 'lore'));
    b.on('returned', (e) => {
      const r = e.report;
      const p = { s: r.scrap, c: r.copper, k: r.cores, n: r.blueprints.length, tier: this.ui.engine.state.tierUnlocked };
      const key = r.bossDefeated ? 'toast.boss' : r.broken ? 'toast.backBroken' : r.blueprints.length ? 'toast.backBp' : 'toast.back';
      toast.show(t(key, p), r.broken ? 'danger' : 'loot', 5000);
      this.ui.actions.saveNow();
    });
  }

  setTab(id: string): void {
    this.active = id;
    this.seenTabs.add(id);
    this.panelSig = '';
    this.tabSig = '';
    this.update();
  }

  private renderTabs(): void {
    const s = this.ui.engine.state;
    const tabs = TABS.filter((tb) => tb.flag === null || s.flags.includes(tb.flag));
    const sig = tabs.map((x) => x.id).join(',') + this.active + [...this.seenTabs].join(',');
    if (sig === this.tabSig) return;
    this.tabSig = sig;
    this.tabBar.replaceChildren(
      ...tabs.map((tb) =>
        h('button', { class: `tab ${tb.id === this.active ? 'on' : ''} ${this.seenTabs.has(tb.id) ? '' : 'new'}`, role: 'tab', onclick: () => (this.ui.sfx.click(), this.setTab(tb.id)) }, t(tb.key)),
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
      const tiers = h('div', { class: 'segmented tiers' });
      for (let n = 1; n <= s.tierUnlocked; n++)
        tiers.append(h('button', { class: `seg ${n === s.selectedTier ? 'on' : ''}`, onclick: () => ((s.selectedTier = n), (this.opsSig = '')) }, t('ops.tier', { n })));
      this.live.launch = h('button', { class: 'btn launch', onclick: () => eng.dispatch({ type: 'launch', tier: s.selectedTier }) }, t('ops.launch'));
      this.live.launchWhy = h('div', { class: 'hint' });
      parts.push(h('div', { class: 'card' }, h('div', { class: 'row' }, s.tierUnlocked > 1 ? tiers : h('div', { class: 'card-title grow' }, t('zone.rust')), this.live.launch), this.live.launchWhy));
      if (s.stats.deepestLayer > 4) {
        const st = stratumById('rust');
        const boss = bossById(st.bossId);
        parts.push(
          h(
            'div',
            { class: 'card warden' },
            h('div', { class: 'card-title' }, t('ops.wardenAt', { b: t(`boss.${boss.id}.name`), layer: st.layers })),
            h('div', { class: 'tags' }, ...boss.tags.map((tag) => h('span', { class: 'tag' }, t(`bosstag.${tag}`)))),
            h('ul', { class: 'phases' }, h('li', {}, t(`boss.${boss.id}.p0`)), h('li', {}, t(`boss.${boss.id}.p1`))),
          ),
        );
      }
      const r = s.lastReport;
      if (r) {
        const result = t(r.bossDefeated ? 'ops.res.boss' : r.broken ? 'ops.res.broken' : 'ops.res.returned');
        const loot =
          t('ops.loot', { s: r.scrap, c: r.copper }) +
          (r.cores ? t('ops.lootCore', { k: r.cores }) : '') +
          (r.blueprints.length ? t('ops.lootBp', { list: r.blueprints.map(modName).join(', ') }) : '') +
          (r.cratesLost ? t('ops.lost', { n: r.cratesLost }) : '') +
          (r.overflow ? t('ops.overflow', { n: r.overflow }) : '');
        parts.push(
          h(
            'div',
            { class: 'card report' },
            h('div', { class: 'card-title' }, t('ops.last', { tier: r.tier > 1 ? t('ops.lastTier', { n: r.tier }) : '', result, layer: r.layers })),
            h('div', { class: 'desc' }, loot),
          ),
        );
      }
    } else {
      const map = h('div', { class: 'map' });
      x.map.forEach((layer, li) => {
        const col = h('div', { class: `map-col ${li === x.layer ? 'here' : li < x.layer ? 'past' : ''}` });
        layer.forEach((n, ni) => col.append(h('span', { class: `map-node ${x.path[li] === ni ? 'taken' : ''}`, title: t(`node.${n.type}`) }, sprite('onebit', NODE_ICON[n.type], 1))));
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
            h('div', { class: 'card-title' }, t('ops.fork', { layer: x.layer + 1 })),
            h(
              'div',
              { class: 'choices' },
              ...nodes.map((n, i) =>
                h(
                  'button',
                  { class: `choice ${i === auto ? 'auto' : ''}`, onclick: () => eng.dispatch({ type: 'choose', index: i }) },
                  sprite('onebit', NODE_ICON[n.type], 2),
                  h('div', {}, h('b', {}, t(`node.${n.type}`)), h('div', { class: 'desc' }, t(`nodehint.${n.type}`))),
                ),
              ),
            ),
            this.live.countdown,
          ),
        );
      } else if (x.phase === 'event') {
        const ev = eventById(x.map[x.layer][x.path[x.layer]].eventId!);
        this.live.countdown = h('div', { class: 'hint' });
        parts.push(
          h(
            'div',
            { class: 'card fork' },
            h('div', { class: 'card-title' }, t(`event.${ev.id}.text`)),
            h(
              'div',
              { class: 'choices' },
              ...ev.options.map((o, i) =>
                h(
                  'button',
                  { class: `choice ${i === ev.safe ? 'auto' : ''}`, onclick: () => eng.dispatch({ type: 'eventChoice', index: i }) },
                  h('div', {}, h('b', {}, t(`event.${ev.id}.o${i}`)), h('div', { class: 'desc' }, o.chance < 1 ? t('ops.chance', { p: Math.round(o.chance * 100) }) : t('ops.safe'))),
                ),
              ),
            ),
            this.live.countdown,
          ),
        );
      }
      if (x.phase !== 'return') parts.push(h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => eng.dispatch({ type: 'recall' }) }, t('ops.recall'))));
    }
    this.ops.replaceChildren(...parts);
  }

  private updateOps(): void {
    const eng = this.ui.engine;
    const s = eng.state;
    const x = s.exp;
    if (this.live.countdown && x) setText(this.live.countdown, t(x.phase === 'event' ? 'ops.countEvent' : 'ops.countFork', { s: Math.max(0, Math.ceil(x.waitTimer)) }));
    if (this.live.launch) {
      const why = canLaunch(eng);
      setDisabled(this.live.launch, !!why);
      setText(this.live.launchWhy!, why ? t(why) : t('ops.launchInfo', { hp: Math.round((s.robot.hp / eng.rig.maxHp) * 100), cargo: eng.rig.cargo, dps: formatNumber(eng.rig.dps) }));
    }
  }

  update(): void {
    const eng = this.ui.engine;
    const s = eng.state;
    const rig = eng.rig;
    const e = this.el;

    this.renderTabs();
    const tab = TABS.find((x) => x.id === this.active);
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

    const cap = storageCap(eng);
    setText(e.scrap, formatNumber(s.scrap));
    e.scrapBox.title = t('res.scrap');
    toggleClass(e.scrapBox, 'full', s.scrap >= cap.scrap);
    setText(e.copper, formatNumber(s.copper));
    e.copperBox.title = t('res.copper');
    toggleClass(e.copperBox, 'hidden', s.stats.copperEarned === 0 && s.copper === 0);
    toggleClass(e.copperBox, 'full', s.copper >= cap.copper);
    setText(e.cores, `${s.cores}`);
    e.coresBox.title = t('res.cores');
    toggleClass(e.coresBox, 'hidden', s.cores === 0 && s.stats.bossesWon === 0);
    e.settingsBtn.setAttribute('aria-label', t('settings.title'));

    setWidth(e.hullFill, s.robot.hp / rig.maxHp);
    toggleClass(e.hullFill.parentElement!, 'low', s.robot.hp / rig.maxHp < 0.3);
    setText(
      e.hullText,
      t('hud.hull', { a: formatNumber(Math.max(0, s.robot.hp)), b: formatNumber(rig.maxHp) }) +
        (rig.shieldMax ? t('hud.shield', { n: formatNumber(s.robot.shield) }) : '') +
        (rig.armor ? t('hud.armor', { n: formatNumber(rig.armor) }) : ''),
    );
    toggleClass(e.shieldRow, 'hidden', rig.shieldMax <= 0);
    if (rig.shieldMax > 0) setWidth(e.shieldFill, s.robot.shield / rig.shieldMax);

    const crates = s.exp ? s.exp.crates.length : 0;
    const csig = `${crates}/${rig.cargo}`;
    if (e.crates.dataset.sig !== csig) {
      e.crates.dataset.sig = csig;
      const icons: HTMLElement[] = [h('span', { class: 'lvl' }, `${t('hud.cargo')} `)];
      for (let i = 0; i < rig.cargo; i++) icons.push(sprite('onebit', 390, 1, i < crates ? 'crate full' : 'crate'));
      e.crates.replaceChildren(...icons);
    }
  }

  showIntro(onDone: () => void): void {
    const langRow = this.langPicker();
    const body = h('div', {}, langRow, h('p', {}, t('intro.p1')), h('p', {}, t('intro.p2')), h('p', { class: 'desc' }, t('intro.p3')));
    this.ui.modal.open(t('intro.title'), body, [h('button', { class: 'btn', onclick: () => this.ui.modal.close() }, t('intro.start'))], onDone, () => this.showIntro(onDone));
  }

  private langPicker(): HTMLElement {
    const row = h('div', { class: 'segmented langs' });
    for (const l of LANGS) {
      row.append(
        h(
          'button',
          {
            class: `seg ${getLang() === l.id ? 'on' : ''}`,
            onclick: () => {
              this.ui.engine.state.settings.lang = l.id;
              setLang(l.id);
              this.ui.actions.saveNow();
              // reopen whichever dialog is showing, now in the new language
              const reopen = this.ui.modal.reopen;
              if (reopen) reopen();
            },
          },
          l.label,
        ),
      );
    }
    return row;
  }

  showOffline(r: OfflineReport): void {
    const lines: HTMLElement[] = [h('p', {}, t('offline.away', { d: formatDuration(r.elapsedSec) }) + (r.capped ? t('offline.capped', { d: formatDuration(r.countedSec) }) : ''))];
    if (r.clockAnomaly) lines.push(h('p', { class: 'danger-text' }, t('offline.clock')));
    if (r.expeditions || r.scrap || r.copper)
      lines.push(h('p', {}, t('offline.exps', { n: r.expeditions }), ' ', h('b', {}, t('offline.loot', { s: formatNumber(r.scrap), c: formatNumber(r.copper) })), r.breakdowns ? t('offline.breakdowns', { n: r.breakdowns }) : ''));
    else if (!r.clockAnomaly) lines.push(h('p', { class: 'desc' }, t('offline.idle')));
    if (r.journal.length) lines.push(h('div', { class: 'card' }, h('div', { class: 'card-title' }, t('offline.journal')), ...r.journal.slice(-12).map((j) => h('div', { class: 'log' }, journalText(j)))));
    this.ui.modal.open(t('offline.title'), h('div', {}, ...lines), [h('button', { class: 'btn', onclick: () => this.ui.modal.close() }, t('offline.back'))]);
  }

  private openSettings(): void {
    const set = this.ui.engine.state.settings;
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
      this.ui.actions.hardReset();
    });
    const body = h(
      'div',
      { class: 'settings' },
      h('div', { class: 'card-title' }, t('settings.language')),
      this.langPicker(),
      toggle(t('settings.sfx'), () => set.sfx, (v) => (set.sfx = v)),
      h('label', { class: 'setting' }, `${t('settings.volume')} `, vol),
      toggle(t('settings.motion'), () => set.reducedMotion, (v) => (set.reducedMotion = v)),
      h('button', { class: 'btn ghost', onclick: () => (this.ui.modal.close(), this.setTab('guide')) }, t('settings.guide')),
      h('div', { class: 'card-title' }, t('settings.save')),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn', onclick: () => ((exportArea.value = this.ui.actions.exportSave()), exportArea.select()) }, t('settings.export')),
        h('button', {
          class: 'btn ghost',
          onclick: () => {
            const err = this.ui.actions.importSave(importArea.value);
            if (err) this.ui.toasts.show(t(err), 'danger');
          },
        }, t('settings.import')),
        resetBtn,
      ),
      exportArea,
      importArea,
      h('div', { class: 'card-title' }, t('settings.credits')),
      h('p', { class: 'desc' }, t('settings.creditsText')),
    );
    this.ui.modal.open(t('settings.title'), body, [], () => this.ui.actions.saveNow(), () => this.openSettings());
  }
}

