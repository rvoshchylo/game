import '@fontsource/tiny5/400.css';
import './styles.css';
import Phaser from 'phaser';
import { Sfx } from './audio/sfx';
import { detectLang, isLang, setLang, t } from './i18n';
import { RunScene } from './render/RunScene';
import { createProfile, type Profile } from './run/meta';
import { FutureSaveError } from './save/migrations';
import { decodeExport, encodeExport, fromSave, toSave } from './save/serializer';
import { NoopAnalyticsService, type AnalyticsService } from './services/analytics';
import { systemClock } from './services/clock';
import { MockMonetizationService } from './services/monetization';
import { LocalGameRepository } from './services/repository';
import { LocalSaveService } from './services/save';
import { Game } from './ui/game';
import { Modal } from './ui/modal';
import { Toasts } from './ui/toast';

/** Composition root: the only place that knows about every layer. */
async function boot(): Promise<void> {
  const clock = systemClock;
  const saves = new LocalSaveService();
  const analytics: AnalyticsService = new NoopAnalyticsService();
  // Content comes through the repository so a remote/live-ops source can replace it later.
  await new LocalGameRepository().loadContent();
  // Present for a future cosmetics menu; gameplay never touches it.
  void new MockMonetizationService();

  let profile: Profile = createProfile();
  let savingDisabled = false;
  let bootMessage: string | null = null;
  const raw = saves.load();
  if (raw) {
    try {
      const res = fromSave(raw);
      profile = res.profile;
      if (res.legacy) bootMessage = 'boot.legacy';
      else if (!res.checksumOk) bootMessage = 'boot.damaged';
    } catch (err) {
      if (err instanceof FutureSaveError) {
        savingDisabled = true;
        bootMessage = 'boot.future';
      } else bootMessage = 'boot.unreadable';
    }
  }
  const lang = isLang(profile.settings.lang) ? profile.settings.lang : detectLang();
  setLang(lang);
  document.documentElement.lang = lang;

  const save = () => {
    if (!savingDisabled) saves.save(toSave(profile, clock.now()));
  };

  const root = document.getElementById('app')!;
  const stage = document.createElement('div');
  stage.id = 'stage';
  const ui = document.createElement('div');
  ui.id = 'ui';
  root.append(stage, ui);

  const sfx = new Sfx(() => game.profile.settings);
  const modal = new Modal(document.body);
  const toasts = new Toasts(document.body);
  const game: Game = new Game(ui, profile, {
    sfx,
    modal,
    toasts,
    save,
    exportSave: () => encodeExport(toSave(game.profile, clock.now())),
    importSave: (text) => {
      try {
        const { profile: imported } = fromSave(decodeExport(text));
        savingDisabled = true;
        saves.save(toSave(imported, clock.now()));
        location.reload();
        return null;
      } catch (e) {
        return e instanceof FutureSaveError ? 'err.importFuture' : 'err.importBad';
      }
    },
    hardReset: () => {
      savingDisabled = true;
      saves.clear();
      location.reload();
    },
  });

  try {
    await Promise.all([document.fonts.load('16px "Tiny5"'), document.fonts.load('16px "Tiny5"', 'Відкликати')]);
  } catch {
    // fonts are cosmetic
  }

  const phaser = new Phaser.Game({
    type: Phaser.AUTO,
    parent: stage,
    pixelArt: true,
    backgroundColor: '#120d0b',
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [new RunScene(game)],
  });

  window.addEventListener('pointerdown', () => sfx.unlock(), { capture: true });
  window.addEventListener('keydown', () => sfx.unlock(), { capture: true });
  if (bootMessage) toasts.show(t(bootMessage), 'danger', 9000);
  if (!profile.settings.introSeen) game.showIntro();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
  window.addEventListener('pagehide', save);
  void analytics;

  // Debug handle for the console and automated smoke tests (no effect on gameplay).
  (window as unknown as { rustheart: unknown }).rustheart = { game, phaser };
}

void boot();
