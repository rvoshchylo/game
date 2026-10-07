import { canAfford, mergePartner, salvageValue } from '../../core/camp';
import { canPlace, shapeCells } from '../../core/grid';
import { COMBOS } from '../../data/lore';
import { MODULES, mergeCost, moduleById } from '../../data/modules';
import type { Cost } from '../../data/types';
import { formatNumber } from '../../utils/format';
import type { UiContext } from '../context';
import { h, setDisabled, type Panel } from '../dom';
import { sprite } from '../sprites';

export const costText = (c: Cost): string =>
  [c.scrap ? `${c.scrap} scrap` : '', c.copper ? `${c.copper} copper` : '', c.cores ? `${c.cores} core${c.cores > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') || 'free';

function shapePreview(shape: Parameters<typeof shapeCells>[0], rot: number, color: string): HTMLElement {
  const cells = shapeCells(shape, rot);
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const hh = Math.max(...cells.map((c) => c[1])) + 1;
  const g = h('span', { class: 'shape', style: `grid-template-columns:repeat(${w},8px);grid-template-rows:repeat(${hh},8px)` });
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) g.append(h('i', { style: cells.some((c) => c[0] === x && c[1] === y) ? `background:${color}` : '' }));
  return g;
}

/** The engineer's bench: the robot's grid, spare modules, crafting. */
export class RigPanel implements Panel {
  id = 'rig';
  private selected: { uid: string; rot: number } | null = null;
  private craftBtns: { id: string; el: HTMLButtonElement }[] = [];

  constructor(private ui: UiContext) {}

  private get eng() {
    return this.ui.engine;
  }

  signature(): string {
    const s = this.eng.state;
    return [
      s.modules.map((m) => `${m.uid}:${m.level}:${m.pos ? `${m.pos.x},${m.pos.y},${m.pos.rot}` : '-'}`).join('|'),
      s.blueprints.length,
      s.buildings.workshop,
      s.buildings.forge,
      !!s.exp,
      this.selected ? `${this.selected.uid}/${this.selected.rot}` : '',
    ].join('#');
  }

  private select(uid: string | null, rot?: number): void {
    if (!uid) this.selected = null;
    else {
      const m = this.eng.state.modules.find((x) => x.uid === uid);
      this.selected = { uid, rot: rot ?? m?.pos?.rot ?? 0 };
    }
  }

  private tapCell(x: number, y: number): void {
    const eng = this.eng;
    const s = eng.state;
    if (s.exp) {
      this.ui.toasts.show('The robot is out in the shaft. You can rebuild it when it returns.', 'info');
      return;
    }
    const occupant = eng.rig.cells[y]?.[x] ?? null;
    if (this.selected) {
      const { uid, rot } = this.selected;
      if (occupant === uid) {
        // tapping the selected module again: deselect
        this.select(null);
        return;
      }
      const target = { x, y, rot };
      if (canPlace(s, uid, target)) {
        eng.dispatch({ type: 'place', uid, x, y, rot });
        this.ui.sfx.click();
        this.select(null);
        return;
      }
      if (occupant) {
        this.select(occupant);
        return;
      }
      this.ui.toasts.show('It does not fit there. Rotate it or pick another spot.', 'danger', 2200);
      this.ui.sfx.error();
      return;
    }
    if (occupant) this.select(occupant);
  }

  private rotate(): void {
    const sel = this.selected;
    if (!sel) return;
    const m = this.eng.state.modules.find((x) => x.uid === sel.uid);
    if (!m) return;
    const rot = (sel.rot + 1) % 4;
    if (m.pos) {
      const at = { x: m.pos.x, y: m.pos.y, rot };
      if (canPlace(this.eng.state, m.uid, at)) this.eng.dispatch({ type: 'place', uid: m.uid, ...at });
      else {
        this.eng.dispatch({ type: 'unplace', uid: m.uid });
        this.ui.toasts.show('No room to turn it in place — it is back in your hands. Tap a cell to set it down.', 'info', 3000);
      }
    }
    this.selected = { uid: sel.uid, rot };
  }

  build(): HTMLElement {
    const eng = this.eng;
    const s = eng.state;
    const rig = eng.rig;
    const away = !!s.exp;
    const root = h('div', { class: 'panel-inner' });
    if (away) root.append(h('div', { class: 'card faint' }, 'The robot is out in the shaft. You can plan here, but changes wait until it is back at camp.'));

    // Grid
    const grid = h('div', { class: 'rig-grid', style: `grid-template-columns:repeat(${rig.w},var(--cell));grid-template-rows:repeat(${rig.h},var(--cell))` });
    const sel = this.selected;
    for (let y = 0; y < rig.h; y++) {
      for (let x = 0; x < rig.w; x++) {
        const uid = rig.cells[y][x];
        const p = uid ? rig.placed.find((pp) => pp.inst.uid === uid)! : null;
        const isAnchor = p && p.cells[0][0] === x && p.cells[0][1] === y;
        const cls = ['cell'];
        if (p) cls.push('filled');
        if (sel && uid === sel.uid) cls.push('selected');
        if (p && p.notes.length) cls.push('boosted');
        const el = h('button', { class: cls.join(' '), style: p ? `--mod:${p.def.color}` : '', 'aria-label': p ? p.def.name : `Empty cell ${x + 1},${y + 1}`, onclick: () => this.tapCell(x, y) });
        if (p) {
          // edges between cells of the same module are hidden for a "piece" look
          const same = (dx: number, dy: number) => rig.cells[y + dy]?.[x + dx] === uid;
          el.style.borderTopColor = same(0, -1) ? 'transparent' : '';
          el.style.borderBottomColor = same(0, 1) ? 'transparent' : '';
          el.style.borderLeftColor = same(-1, 0) ? 'transparent' : '';
          el.style.borderRightColor = same(1, 0) ? 'transparent' : '';
          if (isAnchor) {
            el.append(sprite('onebit', p.def.icon, 2));
            if (p.inst.level > 1) el.append(h('b', { class: 'lvl-badge' }, `${p.inst.level}`));
          }
        }
        grid.append(el);
      }
    }

    // Stats
    const powerBad = rig.efficiency < 1;
    const stat = (label: string, value: string, bad = false) => h('div', { class: `stat ${bad ? 'bad' : ''}` }, h('span', {}, label), h('b', {}, value));
    const stats = h(
      'div',
      { class: 'stats' },
      stat('Power', `${formatNumber(rig.powerUse)}/${formatNumber(rig.powerProduce)}${powerBad ? ` · ${Math.round(rig.efficiency * 100)}%` : ''}`, powerBad),
      stat('Damage/s', formatNumber(rig.dps)),
      stat('Hull', formatNumber(rig.maxHp)),
      stat('Armor', `${formatNumber(rig.armor)}`),
      stat('Shield', formatNumber(rig.shieldMax)),
      stat('Repair/s', formatNumber(rig.repair)),
      stat('Cargo', `${rig.cargo} crates`),
      rig.scrapMul > 1 ? stat('Scrap', `×${rig.scrapMul.toFixed(2)}`) : null,
      rig.keep > 0.5 ? stat('Keep on breakdown', `${Math.round(rig.keep * 100)}%`) : null,
      rig.extraChoices ? stat('Extra paths', `+${rig.extraChoices}`) : null,
    );
    root.append(h('div', { class: 'card rig-card' }, h('div', { class: 'card-title' }, `Robot grid ${rig.w}×${rig.h}`), h('div', { class: 'rig-wrap' }, grid, stats)));

    // Selection card
    if (sel) {
      const m = s.modules.find((x) => x.uid === sel.uid);
      if (m) {
        const def = moduleById(m.defId);
        const placed = rig.placed.find((p) => p.inst.uid === m.uid);
        const partner = mergePartner(s, m.uid);
        const actions: HTMLElement[] = [h('button', { class: 'btn ghost', onclick: () => this.rotate(), disabled: away }, '⟳ Rotate')];
        if (m.pos) actions.push(h('button', { class: 'btn ghost', disabled: away, onclick: () => (this.eng.dispatch({ type: 'unplace', uid: m.uid }), this.select(null)) }, 'Take out'));
        if (s.buildings.forge > 0 && partner)
          actions.push(h('button', { class: 'btn', disabled: away || s.scrap < mergeCost(m.level), onclick: () => this.eng.dispatch({ type: 'merge', uid: m.uid }) }, `Merge → Lv ${m.level + 1} (${mergeCost(m.level)} scrap)`));
        if (!m.pos) actions.push(h('button', { class: 'btn danger', disabled: away, onclick: () => (this.eng.dispatch({ type: 'salvage', uid: m.uid }), this.select(null)) }, `Salvage +${salvageValue(m.defId, m.level)}`));
        actions.push(h('button', { class: 'btn ghost', onclick: () => this.select(null) }, 'Done'));
        root.append(
          h(
            'div',
            { class: 'card selected-card' },
            h('div', { class: 'row' }, sprite('onebit', def.icon, 2), h('div', { class: 'grow' }, h('div', { class: 'card-title' }, `${def.name} · Lv ${m.level}`), h('div', { class: 'desc' }, def.description)), shapePreview(def.shape, sel.rot, def.color)),
            def.synergy ? h('div', { class: 'sub' }, `Synergy: ${def.synergy}`) : null,
            def.power ? h('div', { class: 'desc' }, def.power > 0 ? `Produces ${def.power} power.` : `Uses ${-def.power} power.`) : null,
            placed?.notes.length ? h('ul', { class: 'notes' }, ...placed.notes.map((n) => h('li', {}, n))) : null,
            !m.pos ? h('div', { class: 'hint' }, 'Tap an empty cell to place it (the cell becomes its top-left corner).') : null,
            h('div', { class: 'row actions' }, ...actions),
          ),
        );
      }
    } else {
      root.append(h('div', { class: 'hint pad' }, 'Tap a module to inspect, rotate or move it. Neighbours matter: look for glowing borders.'));
    }

    // Spare modules
    const spare = s.modules.filter((m) => !m.pos);
    root.append(
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, `Spare modules (${spare.length})`),
        spare.length
          ? h(
              'div',
              { class: 'spares' },
              ...spare.map((m) => {
                const def = moduleById(m.defId);
                return h(
                  'button',
                  { class: `spare ${sel?.uid === m.uid ? 'on' : ''}`, onclick: () => this.select(sel?.uid === m.uid ? null : m.uid, 0) },
                  sprite('onebit', def.icon, 2),
                  h('span', {}, `${def.name}${m.level > 1 ? ` ${m.level}` : ''}`),
                  shapePreview(def.shape, 0, def.color),
                );
              }),
            )
          : h('div', { class: 'desc' }, 'Craft modules below. Twins can be merged at the Forge.'),
      ),
    );

    // Crafting
    this.craftBtns = [];
    const known = MODULES.filter((m) => s.blueprints.includes(m.id));
    const unknown = MODULES.length - known.length;
    root.append(
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, 'Workshop — craft'),
        ...known.map((d) => {
          const btn = h('button', { class: 'btn buy', onclick: () => this.eng.dispatch({ type: 'craft', defId: d.id }) }, costText(d.cost));
          this.craftBtns.push({ id: d.id, el: btn });
          return h('div', { class: 'craft-row' }, sprite('onebit', d.icon, 2), h('div', { class: 'grow' }, h('b', {}, d.name), ' ', shapePreview(d.shape, 0, d.color), h('div', { class: 'desc' }, d.description)), btn);
        }),
        unknown ? h('div', { class: 'hint' }, `▒▒ ${unknown} more designs are out there. Elites, caches and strange events carry blueprints.`) : null,
      ),
    );

    if (s.combos.length)
      root.append(
        h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Discovered combos'), ...s.combos.map((id) => {
          const c = COMBOS.find((x) => x.id === id)!;
          return h('div', { class: 'desc' }, h('b', {}, c.name), ` — ${c.text}`);
        })),
      );
    return root;
  }

  update(): void {
    const s = this.eng.state;
    for (const b of this.craftBtns) setDisabled(b.el, !canAfford(s, moduleById(b.id).cost));
  }
}
