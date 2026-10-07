import { t } from '../../i18n';
import type { UiContext } from '../context';
import { h, type Panel } from '../dom';
import { NODE_ICON, sprite } from '../sprites';

const SECTIONS = 9;
const ICONS = [289, 488, 488, 616, NODE_ICON.fight, 986, 995, NODE_ICON.boss, 674];

/** In-game guide: one card per topic, always available. */
export class GuidePanel implements Panel {
  id = 'guide';
  constructor(_ui: UiContext) {}

  signature(): string {
    return 'guide';
  }

  build(): HTMLElement {
    const root = h('div', { class: 'panel-inner' }, h('div', { class: 'card' }, h('div', { class: 'card-title' }, t('guide.title'))));
    for (let i = 1; i <= SECTIONS; i++) {
      root.append(
        h(
          'details',
          { class: 'card guide', open: i <= 2 },
          h('summary', { class: 'card-title' }, sprite('onebit', ICONS[i - 1], 1), ' ', t(`guide.s${i}.t`)),
          ...t(`guide.s${i}.b`)
            .split('\n')
            .map((p) => h('p', { class: 'desc' }, p)),
        ),
      );
    }
    return root;
  }

  update(): void {}
}
