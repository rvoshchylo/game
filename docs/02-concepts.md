# 02 — Concepts, patterns, hybrids, choice

## PART 1 — 10 game concepts (10 різних gameplay fantasies)

Для кожного: **fantasy** · primary verb · головне рішення · сильна/слабка сторона.

| # | Концепт | Fantasy | Primary verb | Головне рішення | + | − |
|---|---|---|---|---|---|---|
| A | **Anomaly Expedition** | Науковець, що приборкує неможливе | *Stabilize* (утримати нестабільну аномалію в зеленій зоні) | Скільки нестабільності допустити заради більшого виходу | Боси = зміна законів; сильний discovery | Абстрактна візуалізація, важко зчитується |
| B | **Moving Fortress** | Капітан машини-міста | *Route* (обрати напрямок) + *slot* модулі | Куди їхати, які модулі ставити | Дуже візуальна progression | Великий обсяг арту (модулі фортеці) |
| C | **Living Dungeon** | Ти — підземелля | *Build rooms*, *lure* героїв | Яких героїв заманювати (ризик vs exp) | Інверсія ролей, свіжо | Tower-defense баланс складний для idle |
| D | **Deep Dig** | Шахтар-першопроходець | *Dig* + *Return* | Йти глибше чи повернутися з вантажем | Найчистіший push/farm | Сам по собі монотонний |
| E | **Artificial Ecosystem** | Садівник штучного життя | *Seed / Cull* | Баланс популяцій, мутації | Емерджентність | Важко зробити клік значущим; складна симуляція |
| F | **Abandoned Station** | Відновлювач покинутої станції | *Restore room* | Яку кімнату відкрити наступною | Чудове unfolding (ADR-like) | Після відкриття всього — порожньо |
| G | **Alchemy Engine** | Оптимізатор реакцій | *Combine* | Які ланцюги будувати | Глибока оптимізація | Нішево, слабкий "бос" фентезі |
| H | **Time Loop Expedition** | Мандрівник у петлі | *Spend time budget* | Що встигнути за петлю | Prestige = лор | Тиск таймера втомлює в idle |
| I | **World Underground** | Колонія під руїнами | *Mine → refine → craft* | Розподіл робітників по ланцюгу | Kittens-глибина | Менеджмент-таблиці, мало бойовки |
| J | **The Last Automaton** | Ремонт стародавньої машини | *Power / repair / strike* | Які системи живити | Сильний емоційний якір, автоматизація = лор | Потребує "світу", куди йти |

## PART 2 — Mechanics worth stealing (abstract principles)

| Механіка | 1. Як працює в оригіналі | 2. Чому цікава | 3. Як змінити | 4. Адаптація до нас | 5. Чим зробити своєю |
|---|---|---|---|---|---|
| **Push/Farm** (Trimps) | Зони стають важчими, треба вирішити: пушити чи фармити maps | Постійне рішення з неочевидною відповіддю | Зробити ціну смерті відчутною, але короткою | **Push/Hold** перемикач + Integrity; падіння = Retreat на глибину −1 і 3с ремонту | "Rust Debt": після Retreat наступні 20с −25% dmg — болить, але вчить |
| **Interdependent resources** (Kittens) | Ресурс A потрібен для B, будівлі мають кілька вартостей | Економіка "жива" | Менше ресурсів, але кожен — у 2+ системах | Scrap (upgrades, probes), Shards (forge, research), Echoes (meta) | Shards приходять тільки з **дій** (Fracture, Probes), не пасивно |
| **Behavior automation** (Stone Story) | Персонаж діє сам, пізніше — скриптинг | Гравець — тактик, а не клікер | Автоматизація як **предмет** у слоті | Модуль **Governor** сам б'є Fracture з ймовірністю | Слот під автоматизацію конкурує зі слотом під силу → trade-off |
| **Discovery / unfolding** (A Dark Room) | Нові вкладки з'являються в процесі | Цікавість | Не одноразова: повторювані сигнали | Вкладки "розкопуються", Strange Signals, Echo Logs | Підказки-"тріщини" в UI: заблокована панель видна як щілина з шумом |
| **Risk/reward expedition** (roguelites, Loop Hero) | Чим довше йдеш, тим більше ризик і нагорода | Азарт | Ризик видимий наперед | **Probes**: Shallow/Deep/Abyssal з відсотком втрати | Можна "застрахувати" probe корпусом (Scrap) |
| **Loadout puzzles** (Stone Story) | Бос вимагає конкретних предметів | Сенс у колекції предметів | Показувати "профіль" боса | Бос має теги (Shelled, Draining, Swift) | Два збережених loadout-и, перемикання 1 тапом |
| **Prestige with choice** (Evolve, Increlution) | Reset з вибором шляху | Кожен run різний | Вибір перед run-ом | **Doctrine** при Collapse | Doctrine має мінус (tradeoff), не тільки плюс |
| **Challenges** (Trimps, AD) | Run з обмеженням за унікальну нагороду | Перебудова стратегії | — | **Fault Lines** (пост-MVP) | Нагорода — новий *verb*, а не множник |
| **Milestones unlocks** | Досягнення відкривають фічі | Чітка наступна ціль | Видимі "наступні 1-2" цілі | Depth milestones у HUD ("Depth 6: ???") | Ціль показана як силует/шум |
| **Visible growth** (Final Earth 2) | Місто фізично росте | Гордість за прогрес | — | Автомат візуально отримує модулі; шахта темнішає й змінює палітру | Модулі видимі на спрайті |
| **Active optional bonus** (Idle Slayer) | Клік дає бонус, але гра йде і без нього | Нема вини за idle | — | Fracture = ×5 dmg + Shards | Active дає **інший** ресурс, а не просто швидше |

## PART 3 — 5 Hybrid concepts

### H1 — RUSTHEART (Last Automaton + Deep Dig + Auto-RPG loadouts)
- **Core fantasy:** ти — останній буровий автомат, що прокладає шлях до ядра мертвого світу.
- **Primary action:** удар по **Fracture** (тріщині) на тілі ворога/породи.
- **Idle loop:** бур атакує сам → Scrap → апгрейди мотора.
- **Active loop:** тріщини з'являються → тап → Heat → Vent (burst).
- **Progression:** глибина (Depth) → страти (зони) з новими правилами.
- **Exploration:** Probes у бічні розломи; Strange Signals.
- **Boss system:** Strata Wardens — бос змінює одне правило (щит, дрейн, швидкість).
- **Build system:** Core + 2 Module + Utility; модулі змінюють поведінку.
- **Automation:** модулі (Governor, Auto-Vent Memory), Push toggle.
- **Prestige:** Collapse — шахта обвалюється; Echoes → Memories + Doctrine.
- **Offline:** farm на безпечній глибині + probes завершуються.
- **Monetization:** скіни автомата, теми шахти, supporter pack, expansion strata.
- **Online:** daily "Seed Shaft" (однаковий seed для всіх), leaderboard глибини, сезонні Fault Lines.

### H2 — WARDEN OF THE HOLLOW (Living Dungeon + Prestige + Bosses)
- Fantasy: ти — серце підземелля. Action: *Pulse* — живлення кімнат. Idle: кімнати генерують Essence. Active: тап по героях-загарбникам у слабкі моменти. Bosses: легендарні партії героїв. Build: кімнати-слоти. Prestige: Rebirth підземелля з мутаціями. Offline: оборона за формулою. Monetization: теми підземелля. Online: асинхронні рейди чужих підземель.

### H3 — CARAVAN OF EMBERS (Moving Fortress + Route map + Automation)
- Fantasy: машина-караван. Action: *Stoke* топку в ритм. Idle: рух і збір. Active: вибір розвилок + stoke. Bosses: Колоси на маршруті. Build: модулі вагонів. Prestige: новий караван з реліквіями. Offline: рух по обраному маршруту. Monetization: вагони-косметика. Online: спільна карта світу, яку "розвідують" усі гравці.

### H4 — ANOMALY LAB (Stabilize + Alchemy chains + Discovery)
- Fantasy: дослідник аномалій. Action: утримання стабільності. Idle: генерація Data. Active: стабілізація піків. Bosses: аномалії, що змінюють закон (гравітація, час). Build: інструменти. Prestige: нові "закони". Offline: лабораторія ферментує. Online: community-discovery ("перший, хто знайшов закон X").

### H5 — ECHO LOOP (Time Loop + Expedition + Knowledge)
- Fantasy: експедиція в часовій петлі. Action: витрата "секунд" на дії. Idle: петля сама повторюється. Active: вибір маршруту і ризиків. Bosses: Константи петлі. Build: знання-карти. Prestige = кожна петля. Offline: петлі автоповторюються зі збереженим маршрутом. Online: спільні "seeds" петель.

## PART 4 — Comparison matrix (1–10; для Difficulty — 10 = **легко** розробити)

| Concept | Fun | Orig. | Browser | Dev ease | Assets | Scale | Replay | Monet. | Retention | AI-dev | Online | Visual ID | **Σ** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A Anomaly | 7 | 8 | 9 | 6 | 5 | 8 | 7 | 6 | 7 | 7 | 7 | 8 | 85 |
| B Fortress | 8 | 7 | 8 | 5 | 5 | 9 | 7 | 8 | 8 | 6 | 8 | 9 | 88 |
| C Dungeon | 8 | 8 | 8 | 4 | 8 | 8 | 8 | 7 | 8 | 5 | 9 | 7 | 88 |
| D Deep Dig | 7 | 5 | 10 | 8 | 8 | 8 | 7 | 6 | 8 | 9 | 8 | 6 | 90 |
| E Ecosystem | 6 | 8 | 7 | 4 | 5 | 7 | 7 | 5 | 6 | 5 | 6 | 7 | 73 |
| F Station | 7 | 6 | 9 | 7 | 8 | 7 | 5 | 6 | 7 | 8 | 6 | 7 | 83 |
| G Alchemy | 6 | 7 | 10 | 7 | 9 | 7 | 6 | 5 | 6 | 8 | 6 | 5 | 82 |
| H Time Loop | 7 | 8 | 9 | 6 | 7 | 7 | 9 | 6 | 7 | 7 | 8 | 6 | 87 |
| I Underground | 7 | 5 | 9 | 6 | 8 | 8 | 6 | 6 | 7 | 7 | 6 | 6 | 81 |
| J Automaton | 8 | 8 | 9 | 7 | 7 | 8 | 7 | 8 | 8 | 8 | 7 | 9 | 94 |
| **H1 Rustheart** | **9** | **8** | **10** | **8** | **8** | **9** | **8** | **8** | **9** | **9** | **9** | **9** | **104** |
| H2 Warden | 8 | 8 | 8 | 5 | 8 | 8 | 8 | 7 | 8 | 5 | 9 | 7 | 89 |
| H3 Caravan | 8 | 8 | 8 | 5 | 5 | 9 | 7 | 8 | 8 | 6 | 9 | 9 | 90 |
| H4 Anomaly Lab | 7 | 9 | 9 | 5 | 5 | 8 | 7 | 6 | 7 | 6 | 8 | 8 | 85 |
| H5 Echo Loop | 7 | 8 | 9 | 6 | 7 | 7 | 9 | 6 | 7 | 7 | 9 | 6 | 88 |

### TOP 3
1. **H1 Rustheart** — 104
2. **J The Last Automaton** — 94 (поглинається H1)
3. **D Deep Dig / H3 Caravan** — 90

### Winner: **RUSTHEART**

Чому:
1. **Один персонаж + один екран** — ідеально для browser + mobile і для AI-розробки (мало сутностей, data-driven).
2. **Автоматизація = лор.** Автомат "згадує", як робити речі сам. Unlock автоматизації — це ремонт, а не галочка в налаштуваннях.
3. **Push/Farm вбудований у фантазію** — глибина = ризик.
4. **Prestige = лор**: Collapse (обвал шахти) і Memories.
5. **Візуально масштабується**: модулі на корпусі, палітра страт, глибина як шкала.
6. **Арт реально закрити** процедурною графікою + CC0 1-bit/pixel наборами.
7. **Online-ready**: daily seed-shaft, leaderboard по глибині, Fault Lines як сезонні події.

## PART 5 — Core hook

1. "You are a buried drilling automaton, and every layer you break **rewrites how your machine works** — but each time the shaft collapses, you keep only what you remember."
2. "You are the last machine still digging, and every crack you strike pays in shards, but striking too hot burns your own frame."
3. "You are a forgotten drill descending toward a dead world's heart, and every boss you break teaches your body a new instinct — but every instinct costs a slot you needed for power."
4. "You are a rusted automaton relearning how to live, and every collapse sends you back to the surface — but you return knowing secrets the deep tried to bury."
5. "You are a mining machine with one heart and five slots, and every stratum demands a different machine."

**Обраний (#1, з підсиленням з #3):**

> **"You are a buried drilling automaton, and every stratum you break teaches your machine a new instinct — but when the shaft collapses, you keep only what you remember."**

Він пояснює: хто ти (автомат), що робиш (ламаєш страти), що отримуєш (нові *інстинкти* = механіки, не числа), і ціну (Collapse — prestige як частина світу).
