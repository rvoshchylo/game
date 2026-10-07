# 03 — RUSTHEART · Game Design Document

> **Hook:** *You are a buried drilling automaton, and every stratum you break teaches your machine a new instinct — but when the shaft collapses, you keep only what you remember.*

Робоча назва: **Rustheart** (перед релізом — перевірити торгові марки).

---

## 0. Design rules (фільтр для КОЖНОЇ нової механіки)

1. **"Does this change what the player DOES?"** Якщо механіка лише +N% — вона не потрапляє в гру як окрема система (може бути тільки властивістю предмета/Memory, що має *ціну*).
2. **Кожен ресурс має source, sink, bottleneck і щонайменше 2 споживачі.**
3. **Кожна дія, яку треба зробити >200 разів, повинна отримати автоматизацію** — але автоматизація має бути *ціною* (слот, Echoes), а не безкоштовна.
4. **Active ≠ швидше idle.** Active дає **інший** ресурс (Shards) і доступ до боса; idle дає стабільний Scrap.
5. **Новий шар = нове дієслово.** Strike → Vent → Push/Hold → Equip → Dispatch → Forge → Challenge → Collapse → Choose Doctrine → Remember.
6. Гравець завжди бачить **наступну ціль + силует ще однієї**.

---

## 1. Світ і фантазія

Поверхня мертва. Під нею — Шахта, що веде до Ядра. Ти — **Rustheart**, буровий автомат, який прокинувся на дні забутого стовбура. Ти майже нічого не пам'ятаєш. Кожна страта (шар породи) охороняється **Warden**-ом — древнім механізмом-вартовим. Перемагаючи Wardens, ти "згадуєш" нові інстинкти. Коли стовбур обвалюється (Collapse), ти повертаєшся до поверхні, але те, що ти **запам'ятав** (Memories), лишається.

Лор подається тільки через **Echo Logs** — 1–2 речення, знайдені на глибинах/у probes. Жодних діалогових стін.

---

## 2. Core gameplay loop (PART 6)

```
ACTIVE LOOP (секунди)
  Tap enemy ──► Strike dmg + Heat
  Tap FRACTURE ──► ×4 dmg + Shard + Heat + Chain
        │
        └─► Heat 100 ──► VENT (6s ×2 dmg, тріщини частіше, ламає щит боса)
                              │
                              └─► Рішення: Vent зараз чи тримати під боса?

IDLE LOOP (хвилини-години)
  Drill Motor (auto DPS) ──► kills ──► Scrap ──► upgrades
  Offline: farm на пройденій глибині (50%) + Probes завершуються
  Return ──► "While you were away" ──► витратити ──► оптимізувати білд

EXPEDITION LOOP (хвилини)
  Prepare (Scrap, Probe Hull) ─► Destination ─► Stance (Cautious/Standard/Reckless)
  ─► таймер ─► success/fail (зарол при запуску) ─► Shards / Module / Echo Log

DESCENT LOOP (push/farm)
  Push ─► глибина ↑ ─► вороги сильніші ─► Integrity падає
  ─► Retreat (−1 depth, Rust Debt) або Hold/farm ─► upgrade ─► Push знову
  ─► Depth 9 → Warden profile ─► "Ще один апгрейд" ─► Challenge ─► Boss ─► Drop

META LOOP (години)
  Run ─► max depth ─► Collapse ─► Echoes ─► Memories (нові verbs) + Doctrine
  ─► новий run швидше/інакше ─► глибше ─► нові страти
```

Усі петлі зшиті через ресурси: active дає Shards → Forge → модулі → глибина → Echoes → Memories автоматизують active → увага звільняється для Probes/боса.

---

## 3. THE CLICK MUST MATTER (PART 7) — **Fractures**

- На ворогові кожні ~3.5с з'являється **Fracture** (тріщина, що світиться) на ~1.6с у випадковій точці.
- Tap по тріщині: **×4 damage**, **+1 Shard**, **+20 Heat**, **+1 Chain**.
- **Chain**: кожне послідовне влучання +0.1× (до ×1.5). Пропущена тріщина = chain скидається.
- Tap повз тріщину: звичайний strike (+2 Heat). Немає штрафу — клік ніколи не "поганий".
- Чому не виснажує: подія **раз на кілька секунд**, а не спам; ритм "подивився → влучив". Через 5 годин її можна автоматизувати:
  - модуль **Governor Relay** (займає слот!) — б'є тріщини сам з шансом;
  - Memory **Governor Instinct** — вбудований governor 25%.
- Бос робить клік тактичним: **Shelled phase** (тільки тріщини проходять повністю) та **Counter-Toll** (tap по босу у вікно дзвону скасовує удар — прихована механіка).

## 4. ACTIVE vs IDLE (PART 8)

| | Active | Idle/Offline |
|---|---|---|
| Damage | auto + strikes + fractures ×4 + vent ×2 | auto only |
| Scrap | 100% | **50%** efficiency |
| Shards | fractures, signals, probes | **тільки probes** |
| Depth | push, бос | **farm** на `min(current, maxCleared)` — ніколи не просуває глибину |
| Items | drops, forge | тільки probes |
| Cap | — | 4h + 1h/рівень Scrap Hopper (max 12h) |

**Offline calculation** (`core/systems/offline.ts`):
1. `elapsed = clamp(now − lastTick, 0, cap)`; якщо `now < lastTick` → clock rollback: elapsed = 0, лічильник аномалій++.
2. `farmDepth` = поточна глибина (не бос). Перевірка виживання: якщо `enemyDps > regen` і `timeToKill × enemyDps > maxIntegrity` → farmDepth−1 (цикл).
3. `kills = elapsed × autoDps × 0.5 / avgHp(farmDepth)`; `scrap = kills × avgScrap(farmDepth)`.
4. Probes: завершуються за wall-clock часом; результат **визначений при запуску** (seed) → reload не змінює результат (anti save-scum).
5. Те саме використовується при поверненні на вкладку (`visibilitychange`), якщо вкладка була прихована > 15с.

---

## 5. Descent & Expedition system (PART 9)

### 5.1 Descent (основна вісь)
- Глибина `d`. Для переходу: **10 kills** (9 з Depth Gauge).
- Переможений у цьому run-і Warden "відкриває" свою глибину: Retreat через неї не змушує бити боса знову.
- **Push** — автоматичний перехід; **Hold** — фарм на місці; **▲ Ascend** — піднятися на 1.
- Integrity = 0 → **Retreat**: `d−1`, Integrity 50%, **Rust Debt** (−25% dmg, 15с), режим → Hold.
- Кожна 10-та глибина — **Warden**. Push зупиняється перед ним, потрібен свідомий **Challenge**.

### 5.2 Probes (експедиції)
Кожна має: destination, difficulty (risk%), expected time, rewards, modifiers, boss chance (Warden Echo), rare discoveries.

| Destination | Unlock | Time | Base risk | Rewards | Rare |
|---|---|---|---|---|---|
| **Shallow Seam** | depth 6 | 2 min | 0% | Scrap ×40 kills, 3 Shards | — |
| **Collapsed Gallery** | depth 8 | 8 min | 15% | 15 Shards, 30% module | 10% Echo Log |
| **Abyssal Fissure** | Warden killed | 30 min | 40% | 60 Shards, 80% module (rare+) | 35% Echo Log, 10% relic |

**Stance** (вибір перед стартом): Cautious (risk ×0.5, reward ×0.7) · Standard · Reckless (risk ×1.5, reward ×1.6).
**Probe Hull** upgrade: `risk × 0.9^lvl`. **Failure**: втрачаєш вартість запуску, отримуєш 20% Shards.
**Cost:** `probeCost = destination.costMul × scrapReward(maxDepth) × 10`.

Push-vs-farm рівень експедицій: SAFE (Shallow Cautious) = гарантований дохід; DEEP (Abyssal Reckless) = 60% провал, але єдиний шанс relic.

---

## 6. Boss design (PART 10) — Wardens

Кожен Warden: **profile tags** (видно з глибини d−1), **phases**, **special rule**, **unique reward**, **таймер стовбура** (shaft timer — поки він тікає, шахта тримається).

### MVP Warden — **The Hollow Bell** (depth 10, повтор кожні 10)
| Phase | HP | Правило | Що робить гравець |
|---|---|---|---|
| I · Toll | 100–60% | Кожні 6с **Toll**: −15% max Integrity | Plating/Repair Drone або Counter-Toll |
| II · Shell | 60–25% | **Shelled**: auto ×0.2, strike ×0.35, fractures ×1.5 | **Примушує active play** (або Governor); Vent знімає щит |
| III · Resonance | <25% | Toll кожні 3с | Burst (тримай Vent) + survivability |
- HP = `hp(d) × 20`, timer 75с. Fail → Retreat на d−1.
- **Counter-Toll** (secret): tap по Дзвону у вікно 0.45с до удару скасовує Toll і дає +40 Heat.
- **Unique reward** (перше вбивство): **Clapper Core** — core, що перетворює Vent на лікування й дає Heat від Toll-ів.

### Post-MVP Wardens (кожен змінює ОДИН аспект)
| Warden | Страта | Змінює | Вимагає |
|---|---|---|---|
| **The Hollow Bell** | Rust | змушує active play (Shell) | Vent timing / Governor |
| **Slag Mother** | Rust deep (20) | **punishes low survivability**: спавнить личинок, що б'ють постійно | Plating/Bulwark build |
| **The Siphon Choir** | Glass Veins (30) | **resource drain**: краде Heat і Scrap/с | швидкий burst, Thermal Siphon |
| **Lantern Tyrant** | Glass Veins (40) | **changes production**: auto dmg = 0 у темряві, тільки fractures підсвічують | active/Governor + Echo Antenna |
| **Mirror Engine** | Hollow Deep (50) | **requires specialized build**: відбиває strike, вразливий тільки до auto | Spinner Auger idle build |

Scalable: бос = `BossDefinition` з масивом `phases[{hpBelow, rules[]}]`; rules — enum ефектів (`autoMul`, `fractureMul`, `tollInterval`, `drainHeat` …), обробляються generic системою.

---

## 7. Equipment & builds (PART 11)

Слоти: **CORE** · **MODULE ×2** · **UTILITY** (4 предмети — кожен помітний).
Rarity: Common ×1.0 · Rare ×1.35 · Epic ×1.75 · Relic ×2.3 — множник до **позитивної** частини ефекту (мінуси не скейляться → rare = кращий trade-off).

| Item | Slot | Ефект (playstyle) |
|---|---|---|
| Piston Bit | core | стартовий, без ефектів |
| Seismic Maul | core | strike ×2, fractures ×1.5, **auto ×0.6** |
| Spinner Auger | core | auto ×1.6, **strike ×0.5** |
| Clapper Core | core (boss) | Vent лікує 30%, +3с Vent, Toll дає +25 Heat |
| Governor Relay | module | авто-удар по тріщині з шансом 35% |
| Prospector Lens | module | +1 Shard з тріщини, **тріщини −20% частіше** |
| Salvage Rake | module | Scrap +40%, **strike −15%** |
| Overclock Coil | module | strike +100%, **кожен strike −0.5% Integrity** |
| Bulwark Plates | module | max Integrity +50%, **auto −10%** |
| Thermal Siphon | module | auto-damage генерує Heat (idle Vent) |
| Echo Antenna | module | Strange Signals ×3, rare enemies ×2 |
| Repair Drone | utility | regen +1% max/с |
| Probe Bay | utility | +1 слот Probe |
| Depth Gauge | utility | 9 kills на глибину замість 10 |

### Archetypes (назви світу)
| Build | Ідея | Ключові предмети |
|---|---|---|
| **Striker** (active) | б'єш руками, chain, Vent вчасно | Seismic Maul, Overclock Coil, Prospector Lens |
| **Engine** (auto/idle) | все само | Spinner Auger, Governor Relay, Thermal Siphon + Auto-Vent |
| **Prospector** (resource) | максимум Shards/Scrap | Prospector Lens, Salvage Rake, Probe Bay |
| **Breaker** (boss) | burst під щит | Clapper Core, Overclock, Repair Drone |
| **Deepdiver** (risk) | push через біль | Bulwark, Repair Drone, Depth Gauge |
| **Courier** (speed/expedition) | Probes і швидкий push | Depth Gauge, Probe Bay, Spinner |

**Forge:** 25 Shards → випадковий модуль (Common 70 / Rare 22 / Epic 7 / Relic 1). **Salvage:** предмет → Shards (5/10/20/40). Інвентар: 12.

---

## 8. Resource economy (PART 12)

| Resource | Source | Sink | Bottleneck | Value |
|---|---|---|---|---|
| **Scrap** | kills (auto/strike), offline, Shallow probes | upgrades, запуск probes | ріст вартості `1.15^n` vs ріст HP `1.2^d` | "сила зараз" |
| **Shards** | **тільки активні дії**: fractures, Glimmerworm, Signals, probes | Forge, (пост-MVP) Research | швидкість тріщин; probes з ризиком | "вибір білду" |
| **Heat** (тимчасовий) | strikes, fractures, Toll (Clapper), Thermal Siphon | Vent | cap 100 | "timing" |
| **Integrity** (стан) | regen, Repair Drone, Clapper | удари ворогів, Overclock | max/regen | "межа push" |
| **Echoes** | Collapse (від max depth + Wardens) | Memories, Doctrine | вимагає глибини | "нові verbs" |
| *Ember* (пост-MVP) | надлишок Heat у Glass Veins | Research | — | — |

```
          ┌──────── active ─────────┐
 Tap ──► Fracture ──► Shards ──► Forge ──► Modules ──┐
  │          │                                        ▼
  │          └─► Heat ──► Vent ──► Boss shell ──► Warden kill ─► unique core
  ▼                                                   │
 Kills ──► Scrap ──► Upgrades ──► Depth ──────────────┤
  ▲          └──► Probes ──► Shards/Modules/Logs      ▼
 Motor (idle)                                   Collapse ─► Echoes ─► Memories
                                                              (automate active)
```
**Чому краще за 6 незалежних валют:** кожен ресурс керує іншим **типом рішення** (Scrap = скільки сили, Shards = який білд, Heat = коли, Integrity = як глибоко, Echoes = як грати наступний run). Нема "ресурсу заради ресурсу".

---

## 9. Unfolding content (PART 13) — що бачить гравець

| Час | Глибина | Що з'являється |
|---|---|---|
| 0:00 | 1 | Ворог, tap, Scrap, **Servo Arm**. Підказка "Strike the glowing crack". |
| ~0:45 | 1–2 | **Drill Motor** (auto) — "О, воно саме" |
| ~2:00 | 2 | Heat gauge → **VENT** |
| ~3:00 | 3 | Integrity починає падати → **Plating** |
| ~5:00 | 4 | **Push/Hold**, ▲, шанс Glimmerworm |
| ~8:00 | 3+ | Перший drop → вкладка **RIG** (equipment) |
| ~12:00 | 6 | **PROBES** |
| ~15:00 | 7–9 | **Forge**, Warden profile, "Challenge" |
| 25–40 хв | 10 | Перший Warden → Clapper Core → **COLLAPSE** тизер, Abyssal Fissure |
| ~1–1.5 год | 15–20 | Перший Collapse → **MEMORIES**, **Doctrine** |
| 3 год | 25–35 | 3–5 collapse, Auto-Vent + Governor → гра ідле-здатна; Deep Start |
| 10 год | 40+ | (пост-MVP) Glass Veins, нові Wardens, Fault Lines |
| 1 день | — | Research (Shards → Schematics), loadout presets |
| 1 тиждень | — | 2-й prestige-шар **Rekindle** (змінює шасі автомата: Crawler / Lancer / Hive) |
| 1 місяць | — | Daily Seed Shaft, сезонні Fault Lines, Codex 100% |

Заблоковані вкладки показуються як **"▒▒ faint signal"** з однорядковою підказкою умови — гравець бачить, що гра більша.

## 10. Discovery (PART 14)
- **Glimmerworm** — рідкісний ворог, тікає за 7с, 8 Shards (+шанс Echo Log).
- **Strange Signal** — гліф на краю екрану кожні 3–6 хв active: Scrap cache / Shard vein / Ghost Fracture (10 тріщин ×2) / hidden module.
- **Echo Logs** — фрагменти лору на глибинах 3, 7, 10, 15, 25, у Abyssal probes.
- **Counter-Toll** — прихована механіка боса (знаходиться через спостереження).
- **Codex** — силуети незнайдених предметів ("???").
- Пост-MVP: страти змінюють палітру/правила; секретні комбінації модулів (Thermal Siphon + Clapper = "Bellforge" synergy).

## 11. Prestige — Collapse (PART 15)
- Доступний після першого Warden. `Echoes = floor((maxDepth − 5)^1.5 / 3) + 2 × wardensThisRun` (× Doctrine).
- UI показує: "+X Echoes now · next Echo at depth Y" → **рішення "ще 20 хвилин?"**
- **Скидається:** depth, Scrap, Shards (крім 10%), upgrades, модулі (крім Heirloom), probes у польоті.
- **Resonance:** кожен *невитрачений* Echo дає +2% damage → рішення "Hoard or Remember".
- **Лишається:** Echoes, Memories, Logs, Codex, best depth, статистика, achievements.
- **Doctrine** (вибір на кожен run, з tradeoff):
  - **Hammer** — strike ×2, auto ×0.5
  - **Engine** — auto ×1.75, тріщини −30%
  - **Deep** — HP ворогів ×1.25, Scrap ×1.6, Echoes +25%
  - **None**

## 12. Meta — Memories (PART 17) — кожна змінює *що ти робиш*
| Memory | Cost | Що змінює |
|---|---|---|
| Muscle Memory | 3 | Старт з Servo 5 / Motor 5 — ранній run не нудний |
| Probe Memory | 5 | Probes −25% часу; 1 Shallow на старті |
| Auto-Vent | 6 | Vent сам при 100 Heat (ти втрачаєш timing, але можеш піти) |
| Push Reflex | 7 | Після Retreat через 30с режим повертається в Push |
| Governor Instinct | 8 | Вбудований 25% Governor — звільняє слот |
| Heirloom Socket | 10 | 1 обраний модуль переживає Collapse |
| Deep Start | 12 | Старт з depth 5 (якщо best ≥ 15) |
| Utility Socket II | 20 | Другий Utility слот — нові білди |

---

## 13. Game feel (PART 24)
- **Strike:** спрайт ворога стискається (squash 50мс), білий FILL-tint flash, 4 іскри, джеб буром, short "tick" (pitch random).
- **Fracture hit:** hit-stop 40мс, кільце-shockwave, 12 помаранчевих іскор, ±2px shake, гучніший "clank" з pitch за chain; floating number більший і жовтий; Shard летить до лічильника.
- **Floating numbers:** звичайні — білі дрібні; crit/fracture — жовті з bounce; boss — червоні; групуються, якщо >6/с.
- **Kill:** розпад на 20 частинок кольору ворога, Scrap "монетки" летять у HUD (tween), counter "pop".
- **Vent:** екран тоншає помаранчевим, бур світиться, низький "whoomp", heat bar дренується.
- **Boss transition:** затемнення, напис "WARDEN · THE HOLLOW BELL", дзвін; shell phase — перехід з металевим звуком; Toll — хвиля і shake 6px.
- **Reward:** drop модуля — промінь кольору rarity, 0.6с; нова вкладка — "розкопується" (glitch-reveal + звук).
- **Progression:** depth-up — свайп фону вниз, номер глибини "клацає" як одометр.

## 14. Balance model (PART 25)

Формули — `src/core/formulas.ts` (єдине джерело), значення апгрейдів — `src/data/upgrades.ts`.

```
hp(d)          = 10 · 1.25^(d−1) · (1 + 0.15·(d−1))          // × enemy.hpMul × doctrine
bossHp(d)      = hp(d) · 20                                   // Hollow Bell, 75s shaft timer
scrap(d)       = 1.5 · 1.2^(d−1)                              // × enemy.scrapMul × scrapMul
enemyDmg(d)    = 1.0 · 1.2^(d−1)                              // per attack, × atkMul
milestone(l)   = 2^floor(l/10)                                // ★ ×2 every 10 levels
strike(l)      = (1 + l) · milestone(l) · resonance           // Servo Arm
autoDps(l)     = 0.5 · l · milestone(l) · resonance           // Drill Motor
maxIntegrity   = 20 · (1 + 0.5·l) · 1.05^l                    // Plating
regen/s        = 1 + 0.02·maxIntegrity (+ regenPct·max)
cost(n)        = base · growth^n
   Servo 8·1.19^n · Motor 10·1.19^n · Plating 15·1.2^n
   Exchanger 60·1.45^n (≤10) · Hopper 200·1.8^n (≤8) · Hull 120·1.5^n (≤10)
fracture       = strike · 4 · fractureMul · chain(1 + 0.1·min(chain,5)) · vent(×2) · ghost(×2)
kills/depth    = 10 (9 з Depth Gauge)
offline        = min(elapsed, 4h + hopper) · autoDps · 0.5 / hp(farmD) · scrap(farmD)
echoes         = floor((maxDepth − 5)^1.5 / 3) + 2·wardensThisRun   (× echoMul)
resonance      = 1 + 0.02 · unspentEchoes                     // "Hoard or Remember"
```

**Логіка кривих.**
- HP росте `1.25^d` з лінійним множником, дохід — `1.2^d`: кожна глибина трохи менш вигідна → м'яка стіна, де треба фармити, міняти білд або робити Collapse.
- Апгрейд коштує `×1.19` за рівень, а дає ~+10% (лінійно) плюс **★×2 кожні 10 рівнів** — видима ціль "ще 2 рівні до зірки".
- Warden = 20× HP звичайного ворога з таймером 75с: потрібен або burst (Vent + Shell), або підготовка (апгрейди/модулі) — саме момент "ще один апгрейд".
- Echoes ростуть як `(d−5)^1.5` — кожні +5 глибин відчутно більше, тому "ще 20 хвилин" завжди має сенс.
- **Resonance**: невитрачені Echoes = +2% damage кожен. Купити Memory (новий verb) чи тримати силу — справжній trade-off prestige-шару.

**Перевірка симуляцією** (`npm run sim -- <хв> <тапів/с> <точність>`; бот купує найдешевший апгрейд, вентить, кидає виклик Warden-у):

| Профіль | depth 4 | depth 10 | 1-й Warden | depth 20 | 1-й Collapse |
|---|---|---|---|---|---|
| Легкий active (0.4 тапа/с, 50%) | 4:25 | 13:10 | ~36 хв | ~64 хв | ~75 хв |
| Дуже активний (1.5 тапа/с, 60%) | 1:22 | 4:55 | ~8 хв | ~18 хв | ~28 хв |

Подальші run-и проходять перші 10 глибин за 2–4 хв (Muscle Memory + Resonance), а стіна зсувається на Warden 20 → 30.

## 15. UX (PART 31)
- Mobile-first: верхня половина — Phaser сцена (ворог, автомат, тріщини), нижня — HTML-панелі.
- HUD: Depth · Scrap · Shards · Integrity · Heat/Vent · Push/Hold.
- Вкладки (з'являються по одній): **DRILL** (upgrades) · **RIG** (equipment, forge) · **PROBES** · **COLLAPSE** · **CODEX**.
- Немає hover-only: всі пояснення в tap-картках. Кнопки ≥ 44px.
