# 04 — Technology, libraries, architecture, data, save

## 1. Engine comparison (PART 20)

| Критерій | **Phaser 4** (4.2.1) | **PixiJS v8** (8.20) | **KAPLAY** (3001.x) | Vanilla Canvas/DOM |
|---|---|---|---|---|
| TypeScript | вбудовані типи | вбудовані типи | типи є, API динамічний | повний контроль |
| Rendering | WebGL (новий renderer v4) + Canvas | WebGL/WebGPU, найшвидший | WebGL, простий | 2D canvas |
| Animation | Tweens, timelines, sprite anims | тільки рендер (треба GSAP/власне) | базові | власне |
| Input | pointer/touch/keyboard, hit areas | federated events | є | власне |
| Audio | Web Audio + HTML5 fallback | немає (окрема @pixi/sound) | є | Web Audio вручну |
| Scenes | так | ні | так | ні |
| Particles | вбудований emitter | @pixi/particle-emitter (окремо) | базові | власне |
| Mobile | scale manager, добре | добре | ok | вручну |
| Community | найбільша для 2D web ігор, багато прикладів | величезна, але не "game-framework" | мала, активна | — |
| AI coding suitability | **висока** (великий корпус прикладів Phaser 3, API v4 здебільшого сумісне) | висока для рендеру, але більше власного коду | середня | висока, але багато бойлерплейту |
| Maintainability | висока: все в одному | треба склеювати бібліотеки | для малих ігор | низька на масштабі |

**Висновок:** **Phaser 4 + TypeScript + Vite** підтверджено. Phaser 4 стабільний з 10.04.2026, `latest` на npm = 4.2.1. Він дає сцени, tweens, particles, input, audio, scale-manager без додаткових бібліотек. PixiJS — розумна альтернатива, якщо колись знадобиться WebGPU-рендеринг тисяч об'єктів, але для однієї арени з одним ворогом це зайве.

**React — не потрібен.** UI — це ~6 панелей з кнопками, які оновлюються з тіку стану. Легкий власний DOM-шар (`ui/`) з diff-оновленням текстів дешевший і не тягне другий рендер-цикл. Переглянути, якщо UI виросте до складних форм (research tree editor).

**Hybrid UI:** Canvas (Phaser) — бій, ефекти, частинки, floating numbers. HTML/CSS — панелі, кнопки, текст (доступність, різкий текст, нативний скрол, mobile-friendly).

## 2. Libraries (PART 21)

| Бібліотека | Навіщо | Потрібна? | Альтернатива | + | − |
|---|---|---|---|---|---|
| **phaser** | рендер, tweens, particles, input | **так** | PixiJS | все-в-одному | ~1.2MB min (tree-shaking обмежений) |
| **typescript** | типи | **так** | — | безпека рефакторингу | — |
| **vite** | dev server, build | **так** | esbuild/webpack | швидко, static build | — |
| **vitest** | тести core-логіки | **так (dev)** | jest | нативний для vite, ESM | — |
| howler.js | audio | **ні (поки)** | Phaser Sound / Web Audio | кросбраузерність | зайве; SFX синтезуються Web Audio |
| break_eternity.js | великі числа | **ні (поки)** | `number` | > 1e308 | наші криві до ~глибини 3000 вміщуються у double; додати, коли з'являться пізні шари |
| idb-keyval | IndexedDB | **ні (поки)** | localStorage | async, великі сейви | сейв < 50KB; SaveService дозволяє замінити без змін у core |
| zustand / redux | стан | **ні** | власний store | — | core вже є єдиним джерелом правди |
| GSAP | анімації | **ні** | Phaser tweens | — | дублює Phaser |
| lodash | утиліти | **ні** | 20 рядків `utils/` | — | вага |

Принцип: **4 залежності** (1 runtime + 3 dev).

## 3. Architecture (PART 27)

```
src/
  core/                ← ЧИСТИЙ TypeScript. Без Phaser, без DOM, без window.
    state.ts           GameState типи + createInitialState()
    engine.ts          GameEngine: tick(dt), dispatch(command), events
    commands.ts        Усі дії гравця як типізовані команди
    events.ts          Типізований EventBus (core → render/ui/audio)
    formulas.ts        Усі формули балансу (PART 25)
    stats.ts           computeStats(): upgrades + items + doctrine + memories → Stats
    rng.ts             Детермінований seeded RNG (mulberry32)
    systems/
      combat.ts        удари, тріщини, vent, вороги, смерть, retreat
      boss.ts          фази, правила, toll
      progression.ts   глибина, push/hold, unlock-и
      equipment.ts     drops, forge, equip, salvage
      probes.ts        експедиції
      discovery.ts     signals, logs, rare enemies
      prestige.ts      collapse, echoes, memories, doctrine
      achievements.ts  metric-based ачівки
      offline.ts       офлайн-розрахунок
  data/                ← Definitions (контент = дані)
    enemies.ts bosses.ts items.ts upgrades.ts skills.ts zones.ts
    probes.ts achievements.ts memories.ts doctrines.ts logs.ts
    types.ts           EnemyDefinition, BossDefinition, …
  save/
    schema.ts          SaveData (versioned)
    migrations.ts      v1→v2→v3 …
    serializer.ts      state ⇄ SaveData, checksum
  services/            ← інтерфейси + реалізації (DI в main.ts)
    repository.ts      GameRepository / LocalGameRepository / RemoteGameRepository(stub)
    save.ts            SaveService / LocalSaveService / CloudSaveService(stub)
    analytics.ts       AnalyticsService / NoopAnalyticsService / RemoteAnalyticsService(stub)
    monetization.ts    MonetizationService / MockMonetizationService / RealMonetizationService(stub)
    clock.ts           Clock (тестований час)
  render/              ← Phaser. Тільки читає state і слухає events.
    scenes/BootScene.ts  BattleScene.ts
    textures.ts        процедурні текстури (до заміни на asset packs)
    fx.ts              частинки, shake, floating numbers
  ui/                  ← HTML/CSS панелі
    dom.ts             h() хелпер, кешовані оновлення
    hud.ts tabs.ts panels/*.ts modal.ts toast.ts
  audio/
    sfx.ts             Web Audio синтез
  config/
    constants.ts
  utils/
    format.ts
  main.ts              composition root
tests/                 vitest: formulas, combat, save migrations, offline, probes
scripts/simulate.ts    bot-симуляція пейсингу (npm run sim)
```

**Правило залежностей:** `core` → `data` (тільки). `render`, `ui`, `audio` → `core` (читання стану + events + commands). `services`/`save` → `core` типи. `main.ts` збирає все. Core можна прогнати в Node (тести, симуляція, у майбутньому — **серверна валідація**).

**Потік:** `UI/Phaser input → engine.dispatch(cmd) → systems змінюють state → events → render/audio/ui реагують`. Фіксований tick 10 Гц для логіки + render кожен кадр (інтерполяція не потрібна).

## 4. Data models (PART 28) — див. `src/data/types.ts`

```ts
interface EnemyDefinition { id; name; hpMul; atkMul; attackInterval; scrapMul;
  fractureInterval; fractureLifetime; minDepth; weight; rare?: {fleeAfter; shards};
  visual: { shape; color; size } }
interface BossDefinition { id; name; hpMul; timer; tags[]; phases: BossPhase[];
  tollInterval; tollDamage; firstKillReward: itemId; visual }
interface BossPhase { below: number; name; rules: BossRule[] }   // rule = {kind, value}
interface ItemDefinition { id; name; slot; description; effects: Effect[]; unique?; forgeable }
interface Effect { stat: StatKey; op: 'add'|'mul'; value; scales?: boolean }  // rarity scaling
interface UpgradeDefinition { id; name; description; baseCost; growth; max?; unlock: UnlockCondition }
interface SkillDefinition { id; name; heatCost; duration; damageMul }
interface ZoneDefinition { id; name; fromDepth; toDepth; palette; enemies[]; bossId }
interface ExpeditionDefinition { id; name; duration; risk; costMul; rewards; unlock }
interface AchievementDefinition { id; name; metric; threshold; rewardShards }
interface MemoryDefinition { id; name; cost; description; requires? }
```
Новий ворог/бос/предмет = новий об'єкт у масиві `data/*`. Системи generic.

## 5. Save system (PART 29)

**Вибір: localStorage (через SaveService), з можливістю перейти на IndexedDB.**
- Сейв — один JSON ~5–30KB; localStorage синхронний, але запис 30KB — <1мс. Квота 5MB.
- Синхронність корисна: сейв на `beforeunload/pagehide` гарантовано встигає (IndexedDB async — може не встигнути).
- IndexedDB варто, коли: історія run-ів, реплеї, бінарні дані. Тоді `IndexedDbSaveService` реалізує той самий інтерфейс.
- Два слоти: `rustheart.save` + `rustheart.save.bak` (попередній валідний) — захист від битого запису.
- Export/Import: base64 рядок.

```ts
interface SaveData {
  version: number;          // SAVE_VERSION
  player:  { depth; maxDepth; integrity; heat; mode; bestDepthEver; doctrine };
  currencies: { scrap; shards; echoes };
  progression: { upgrades: Record<id, lvl>; unlocks: string[]; wardensDefeated; collapses; logs: string[]; memories: string[] };
  equipment: { core; module1; module2; utility; utility2 };   // instance ids
  inventory: ItemInstance[];
  probes: ProbeRun[];
  stats: Record<string, number>;
  achievements: string[];
  settings: { sfx; volume; reducedMotion; numberFormat };
  timestamps: { created; lastSaved; lastTick };
  rngSeed: number;
  checksum: string;          // НЕ безпека — детект пошкодження
}
```
**Migrations:** `migrations: Record<fromVersion, (old) => new>`; при завантаженні сейв проганяється ланцюгом `v1→v2→…→current`. Невідомі поля ігноруються, відсутні — заповнюються з `createInitialState()` (deep-merge з дефолтами). Тест на кожну міграцію в `tests/save.test.ts`. Сейв з **майбутньої** версії не перезаписується (read-only режим + попередження).

## 6. Anti-cheat foundation (PART 30)
- Local save **ніколи** не вважається trustworthy. Checksum — тільки детект пошкодження.
- Усі зміни стану проходять через `engine.dispatch(command)` → у майбутньому **command log** (команди + timestamps + seed) можна відправити на сервер і **перепрограти core у Node** (core не залежить від браузера) для перевірки leaderboard-рекордів.
- `stats` містять інваріанти для валідації: `totalScrapEarned ≥ scrap + spent`, `maxDepth ≤ f(totalDamage)`, `echoesEarned` = сума за формулою по `collapseHistory`.
- Probes: результат залежить від seed, зафіксованого при запуску.
- Clock rollback → elapsed = 0 + лічильник `clockAnomalies`.
- Покупки (майбутнє): entitlement тільки з сервера (`MonetizationService.getEntitlements()`), ніколи з сейву.

## 7. Services, online-ready (PART 19)
```ts
interface GameRepository { loadDefinitions(): Promise<ContentBundle> }    // Local = статичні data/*, Remote = live-ops/seasons
interface SaveService { load(): SaveData|null; save(d); backup(); export(); import(s) }
interface AnalyticsService { track(event, props?) }                       // Noop у MVP
interface MonetizationService { getEntitlements(); purchase(sku); isOwned(sku) }  // Mock у MVP
```
Core нічого не знає про ці сервіси — main.ts підписується на events (`analytics.track('warden_defeated')`) і викликає `save.save(serialize(state))`.

**Майбутній online-шар:** account (OAuth) → CloudSaveService (conflict: newest `lastSaved` + показати вибір) → achievements sync → leaderboard (max depth, валідований replay command log) → **Daily Seed Shaft** (однаковий rngSeed для всіх, окремий короткий run) → async competition → seasonal Fault Lines (контент через RemoteGameRepository) → community stats ("12% гравців знайшли Counter-Toll").

## 8. Monetization (PART 18) — тільки абстракція в MVP
Ethical: **без loot boxes, без pay-to-win, без energy/таймерів на продаж.**
- Cosmetics: скіни автомата (палітри/силуети), теми шахти, ефекти Vent.
- Supporter Pack: косметика + ім'я в credits + soundtrack.
- Optional convenience (без впливу на силу): додаткові слоти loadout presets, розширений статистичний дашборд.
- Expansion packs: нові страти/Wardens (основна гра — повна сама по собі).
- Premium account: cloud save history, кастомні Daily Shafts.
```
MonetizationService ◄── MockMonetizationService (MVP: все "not owned", purchase → no-op)
                    ◄── RealMonetizationService (stub; майбутнє: Stripe/Paddle/Steam через backend)
```
Gameplay **ніколи** не імпортує MonetizationService — тільки UI для cosmetic-меню.
