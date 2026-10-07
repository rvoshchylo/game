import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/silkscreen/400.css';
import './styles.css';
import Phaser from 'phaser';
import { Sfx } from './audio/sfx';
import { AUTOSAVE_SECONDS, AWAY_REPORT_MIN_SEC, CATCH_UP_THRESHOLD_MS } from './config/constants';
import { GameEngine, TICK, type OfflineReport } from './core/engine';
import { createInitialState, type GameState } from './core/state';
import { ShaftScene, VIEW_H, VIEW_W } from './render/scenes/ShaftScene';
import { FutureSaveError } from './save/migrations';
import { decodeExport, encodeExport, fromSave, toSave } from './save/serializer';
import { NoopAnalyticsService, type AnalyticsService } from './services/analytics';
import { systemClock } from './services/clock';
import { MockMonetizationService } from './services/monetization';
import { LocalGameRepository } from './services/repository';
import { LocalSaveService } from './services/save';
import { App } from './ui/app';
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

  let now = clock.now();
  let state: GameState;
  let loaded = false;
  let savingDisabled = false;
  let bootMessage: string | null = null;
  const raw = saves.load();
  if (raw) {
    try {
      const res = fromSave(raw, now);
      state = res.state;
      loaded = !res.legacy;
      if (res.legacy) bootMessage = 'Rustheart has been rebuilt from the ground up: you are now the robot’s engineer. Your clicker-era progress could not carry over — welcome to a fresh start.';
      else if (!res.checksumOk) bootMessage = 'Your save looked damaged; recovered what could be read.';
    } catch (err) {
      state = createInitialState(now);
      if (err instanceof FutureSaveError) {
        savingDisabled = true;
        bootMessage = 'This save comes from a newer version of the game. Playing a temporary session; your save is untouched.';
      } else bootMessage = 'Your save could not be read. Starting fresh (a backup copy is kept).';
    }
  } else state = createInitialState(now);

  const engine = new GameEngine(state, now);
  const offline: OfflineReport | null = loaded ? engine.catchUp(now) : null;

  const root = document.getElementById('app')!;
  const sfx = new Sfx(engine);
  sfx.bind();
  const modal = new Modal(document.body);
  const toasts = new Toasts(document.body);

  const saveNow = () => {
    if (!savingDisabled) saves.save(toSave(engine.state, clock.now()));
  };

  const app = new App(root, {
    engine,
    sfx,
    modal,
    toasts,
    actions: {
      saveNow,
      exportSave: () => encodeExport(toSave(engine.state, clock.now())),
      importSave: (text) => {
        try {
          const { state: imported } = fromSave(decodeExport(text), clock.now());
          savingDisabled = true;
          saves.save(toSave(imported, clock.now()));
          location.reload();
          return null;
        } catch (e) {
          return e instanceof FutureSaveError ? 'That save is from a newer version.' : 'That does not look like a Rustheart save.';
        }
      },
      hardReset: () => {
        savingDisabled = true;
        saves.clear();
        location.reload();
      },
    },
  });

  engine.bus.on('returned', (e) => analytics.track('expedition_end', { tier: e.report.tier, layers: e.report.layers, broken: e.report.broken }));
  engine.bus.on('built', (e) => analytics.track('built', { id: e.id, level: e.level }));
  engine.bus.on('unlock', (e) => analytics.track('unlock', { flag: e.flag }));

  try {
    await Promise.all([document.fonts.load('16px "Pixelify Sans"'), document.fonts.load('12px "Silkscreen"')]);
  } catch {
    // fonts are cosmetic
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: app.stage,
    width: VIEW_W,
    height: VIEW_H,
    pixelArt: true,
    backgroundColor: '#120d0b',
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [new ShaftScene(engine)],
  });

  window.addEventListener('pointerdown', () => sfx.unlock(), { capture: true });
  if (bootMessage) toasts.show(bootMessage, 'danger', 9000);
  if (offline && offline.elapsedSec >= AWAY_REPORT_MIN_SEC) app.showOffline(offline);

  // Fixed-step logic, decoupled from rendering.
  let last = performance.now();
  let acc = 0;
  let uiAcc = 0;
  let saveAcc = 0;
  const frame = (t: number) => {
    const dtMs = t - last;
    last = t;
    now = clock.now();
    engine.interactive = document.visibilityState === 'visible';
    if (dtMs > CATCH_UP_THRESHOLD_MS) {
      const r = engine.catchUp(now);
      acc = 0;
      if (r.elapsedSec >= AWAY_REPORT_MIN_SEC && !modal.isOpen) app.showOffline(r);
    } else {
      acc += dtMs / 1000;
      let steps = 0;
      while (acc >= TICK && steps < 30) {
        engine.tick(TICK, now);
        acc -= TICK;
        steps++;
      }
      if (steps >= 30) acc = 0;
    }
    uiAcc += dtMs;
    if (uiAcc >= 100) {
      uiAcc = 0;
      app.update();
    }
    saveAcc += dtMs;
    if (saveAcc >= AUTOSAVE_SECONDS * 1000) {
      saveAcc = 0;
      saveNow();
    }
    requestAnimationFrame(frame);
  };
  app.update();
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
  window.addEventListener('pagehide', saveNow);

  // Debug handle for the console and automated smoke tests (no effect on gameplay).
  (window as unknown as { rustheart: unknown }).rustheart = { engine, game };
}

void boot();
