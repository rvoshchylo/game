# 01 — Research: incremental / idle / auto-RPG design patterns

> Мета — не скопіювати, а витягти **decision structures**. Кожна гра розібрана за однаковою схемою,
> а в кінці — "що з цього беремо" і "що переосмислюємо".

Позначення: ✅ — беремо принцип, ♻️ — переосмислюємо, ❌ — свідомо уникаємо.

---

## 1. Trimps

| Аспект | Аналіз |
|---|---|
| Core loop | Збір ресурсів → housing/workers → армія → бій по зонах (1 зона = 100 клітинок) → map runs за loot |
| Progression | Лінійні зони з різкими стрибками складності; кожні ~10 зон новий unlock |
| Automation | Розблоковується повільно (AutoFight, AutoStorage, потім "Auto…" в meta) — автоматизація як нагорода |
| Active interaction | Мінімальна після першої години; рішення — коли пушити/фармити, що купувати |
| Resource design | 4 базові ресурси + помножувачі; housing як bottleneck для армії |
| Reset/prestige | Portal: Helium → perks; Challenges змінюють правила run-у |
| Exploration | Maps — опціональні "кишені" з модифікаторами рівня/loot |
| Equipment | Prestige-upgrades обладунку — оптимізація "metal на що?" |
| Bosses | Improbability на кінці зони; "Void maps" як рідкісні спецкімнати |
| Addictive | **Push vs Farm**: "я майже пробиваю зону 60 — піду фармити map чи поставлю на ніч?" |
| Нудне | Сотні годин майже без нових рішень; UI-стіна; challenges як обов'язкова "домашка" |
| Для нас | ✅ push/farm decision ✅ challenges як run-модифікатори ✅ "map" = опціональна кишеня з loot ♻️ автоматизація як нагорода, але **раніше** і у вигляді **модулів**, а не галочок |

## 2. Kittens Game

| Аспект | Аналіз |
|---|---|
| Core loop | Catnip → kittens → jobs → buildings → science → нові ресурси |
| Progression | Tech tree, що поступово відкриває нові ланцюги |
| Automation | Майже відсутня у ванілі (тому популярні скрипти) — **антипатерн** |
| Resource design | Взаємозалежні ресурси, storage caps як bottleneck, crafting (wood→beam→…) |
| Reset | Reset за Paragon/Karma — permanent bonuses + challenges |
| Addictive | Відчуття "живої економіки" і постійного розширення; кожна будівля — нова залежність |
| Нудне | Clicking craft кнопок, "чекання капу", відсутність автоматизації, екрани таблиць |
| Для нас | ✅ interdependent resources, де **кожен ресурс має sink у іншій системі** ✅ storage cap як рішення ("витратити зараз чи чекати") ❌ ручний craft-грайнд |

## 3. A Dark Room

| Аспект | Аналіз |
|---|---|
| Core loop | Підкидай дрова → незнайомець → село → карта світу |
| Progression | Narrative-gated: кожна дія відкриває нову вкладку/механіку |
| Exploration | Ascii-карта з виживанням та ризиком повернення (вода/їжа) |
| Discovery | Гра **приховує свій розмір** — "кімната" стає світом |
| Addictive | Цікавість: "що відкриється далі?" — найсильніший гачок у жанрі |
| Нудне | Майже немає replay; після відкриття всього лишається тільки grind |
| Для нас | ✅ unfolding UI (вкладки з'являються, а не відмикаються з замочком) ✅ **"гра більша, ніж здається"** ✅ risk "повернутися з тим, що несеш" |

## 4. Orb of Creation

| Аспект | Аналіз |
|---|---|
| Core loop | Mana → spells → buildings → нові шари (alchemy, artifacts, minions, exploration) |
| Progression | Multi-layer; кожен шар має власні правила і зшивається з попередніми |
| Automation | Через внутрішньоігрові механіки (spell-autocast, rituals), а не налаштування |
| Active | "Active incremental" — короткі таймери, багато рішень |
| Reset | Кілька рівнів reset-у з різними "законами" |
| Addictive | **Кожен новий шар — нова міні-гра**, яка впливає на старі |
| Нудне | Перевантаження UI і пізній мікроменеджмент |
| Для нас | ✅ кожен шар = новий тип рішення ✅ автоматизація як ігровий об'єкт ❌ 15 панелей одночасно |

## 5. Synergism

| Аспект | Аналіз |
|---|---|
| Core loop | Coins → buildings → multipliers → 5+ шарів prestige (Prestige, Transcend, Reincarnate, Ascend…) |
| Progression | Дуже глибока "numbers go up" з challenge-шарами |
| Automation | Агресивна; гра навчає автоматизувати попередній шар перед новим |
| Addictive | Відчуття "ще один шар зверху"; швидкі ранні reset-и |
| Нудне | Більшість шарів = ще один multiplier; без розуміння формул відчувається як таблиця |
| Для нас | ✅ автоматизувати попередній шар, щоб звільнити увагу для нового ❌ **шари без зміни геймплею** — саме те, від чого нас застеріг brief (PART 34) |

## 6. Increlution

| Аспект | Аналіз |
|---|---|
| Core loop | Життя персонажа: обрати jobs/constructions на таймлайні до смерті |
| Progression | Кожне життя накопичує "навички" (exp multipliers) |
| Reset | Смерть = вбудований, лорний prestige |
| Active | Планування черги дій, мікрорішення про пріоритети |
| Addictive | "У наступному житті я пройду далі" — **prestige як частина фантазії** |
| Нудне | Великі шматки часу, коли дивишся на таймер |
| Для нас | ✅ prestige, вплетений у лор ✅ "знання" між run-ами |

## 7. Stone Story RPG

| Аспект | Аналіз |
|---|---|
| Core loop | Персонаж сам йде локацією і б'ється; гравець вибирає loadout (2 руки + щит + потіони) |
| Automation | Повна автоматизація ходьби/атак; пізніше — **Stonescript**: програмування поведінки |
| Active | Таймінг потіонів/спеціальних здібностей; зміна зброї під ворога |
| Bosses | Кожен бос — **головоломка під loadout** (вогонь/лід/яд, щит vs dps) |
| Addictive | "Збери правильний набір → пройди боса", крафт-поліпшення речей |
| Нудне | Повторні проходи тих самих локацій для крафту |
| Для нас | ✅ бос як build-check ✅ automation через ігрові модулі (наш "Governor") ✅ малий набір слотів, кожен предмет змінює поведінку |

## 8. Evolve Idle

| Аспект | Аналіз |
|---|---|
| Core loop | Від протоклітини до цивілізації; раса з трейтами |
| Progression | Довгі епохи; багато prestige-типів, кожен змінює кінцевий сценарій |
| Reset | **Різні reset-шляхи з різними нагородами** — вибір, а не кнопка |
| Addictive | Вибір раси/трейтів = новий run з іншими правилами |
| Нудне | Повільні ранні години кожного run-у |
| Для нас | ✅ prestige-вибір (Doctrine) змінює наступний run ♻️ ранні хвилини run-у мають бути **швидшими** з кожним prestige |

## 9. The Final Earth 2

| Аспект | Аналіз |
|---|---|
| Core loop | Будуй місто на 2D-зрізі, люди живуть/працюють, нові світи |
| Progression | Просторова: місто **візуально росте** |
| Exploration | Нові планети/світи з власними правилами |
| Addictive | Видимий фізичний прогрес — ти бачиш, що побудував |
| Нудне | Мікроменеджмент розміщення пізніше |
| Для нас | ✅ **візуальна, просторова** progression: наш автомат фізично змінюється з модулями, шахта видимо глибшає |

## 10. Інші знахідки (niche)

| Гра | Сильний патерн | Для нас |
|---|---|---|
| **Melvor Idle** | Багато "скілів", що годують один одного; offline як основний режим | ✅ offline чесний і прогнозований |
| **Unnamed Space Idle** | Корабель + зброя проти конкретних типів ворогів; поступове розгортання систем | ✅ "контр-білд" під тип ворога |
| **Antimatter Dimensions** | Challenges, що змушують перебудувати стратегію; автоматизатор-скрипт як пізній unlock | ✅ challenges = "Fault Lines" |
| **NGU Idle** | Гумор + десятки міні-систем | ❌ надлишок систем |
| **Idle Pinball / Idle Slayer** | Active-бонуси, що не обов'язкові | ✅ active = швидше, idle = стабільніше |
| **Loop Hero** | Run з поверненням ресурсів, ризик "піти далі" | ✅ retreat-рішення з частковою втратою |
| **Vampire Survivors / Brotato** | Синергії предметів, видимі зміни білду | ✅ модулі з помітними ефектами |

---

## 11. Критика жанру (що ми свідомо НЕ робимо)

1. **Multiplier-stacking як "нова механіка"** — +20%, ×2, +5% без нового рішення. Наш фільтр: *"Does this change what the player DOES?"* (див. `03-gdd.md`, розділ "Design rules").
2. **Wall of tabs** — гравець бачить 20 вкладок і не розуміє, що робити. У нас вкладки з'являються по одній, кожна з'являється з анімацією і поясненням в одне речення.
3. **Click fatigue** — клік як +1. У нас клік — **тактичний вибір цілі** (Fracture), і його можна автоматизувати модулем.
4. **Dead offline / overpowered offline** — або гра стоїть, або active не має сенсу. У нас offline = farm на вже пройденій глибині з 50% ефективністю + probe-експедиції (які тільки й працюють офлайн).
5. **Prestige як "почни заново +10%"** — у нас prestige дає вибір Doctrine та Memories, які змінюють механіку (автоматизація, новий слот, стартова глибина).
6. **Обов'язковий ручний грайнд** (Kittens craft-кліки) — все, що треба робити 1000 разів, повинно отримати автоматизацію.
7. **Ранні 10 хвилин після prestige — нудні** — у кожному Memory-дереві є "швидкий старт".

## 12. Механіки, які варто переосмислити

| Оригінальний патерн | Проблема | Наше переосмислення |
|---|---|---|
| Trimps zone push | Рішення пасивне (галочка) | **Push/Hold** + Integrity: смерть = відкат на глибину вище і ремонт — ціна помилки відчутна, але не катастрофічна |
| Kittens storage cap | Гравець просто чекає | **Scrap Hopper** cap: переповнення = рішення "витратити зараз або вкласти в Probe" |
| ADR discovery | Одноразова | Discovery через **рідкісні події та Strange Signals**, які повторюються з варіаціями |
| Stone Story loadout | Перемикання вручну | **Loadout presets** (2 збережені білди) + бос показує свій "профіль" наперед |
| Synergism layers | Шари = множники | Кожен шар = **новий verb**: strike → vent → dispatch → forge → collapse |
| Increlution death | Довгі "порожні" життя | Collapse — коли сам вирішиш; Doctrine дає вибір стилю наступного run-у |

---

## 13. Tech ecosystem research (стан на жовтень 2026)

- **Phaser 4** — стабільний з v4.0.0 "Caladan" (10.04.2026), далі v4.1.0 "Salusa" (30.04.2026); на npm `latest` = **4.2.1** (перевірено `npm view phaser`). Вбудовані TS-типи, WebGL renderer переписаний, API здебільшого сумісний з Phaser 3.
- **PixiJS v8** — дуже активний (v8.18–8.20 у 2026, WebGPU-first, 500k+ weekly downloads). Тільки renderer: сцени, input, audio, tweens — самостійно.
- **KAPLAY** (наступник Kaboom.js, v3001.x) — дуже простий API, добрий для jam-ігор, але слабший для великого UI/довгого проєкту.

Детальне порівняння — `04-tech.md`.

## 14. Asset research

Детально — `05-assets.md` та `assets/manifest.json`. Ключове: Kenney (CC0), Juhani Junkala chiptunes (CC0, OpenGameArt), game-icons.net (CC BY 3.0 — **потрібна атрибуція**).

## Sources

- [Phaser v4.0.0 "Caladan"](https://phaser.io/download/stable), [Phaser 4 download](https://phaser.io/download/phaser4)
- [PixiJS Update — June 2026](https://pixijs.com/blog/june-2026), [PixiJS v8.20 released](https://gamedev.net/news/5221-pixijs-v8200-released/)
- [Kaboom.js is now KAPLAY](https://jslegenddev.substack.com/p/kaboomjs-is-now-kaplay), [kaplay on npm](https://www.npmjs.com/package/kaplay)
- [Kenney 1-Bit Pack](https://kenney-assets.itch.io/1-bit-pack), [Kenney Tiny Dungeon](https://kenney-assets.itch.io/tiny-dungeon), [Interface Sounds on OGA](https://opengameart.org/content/interface-sounds)
- [4 Chiptunes (Adventure) — Juhani Junkala](https://opengameart.org/node/74001)
- [game-icons.net about/license](https://game-icons.net/about.html)
- [Orb of Creation — itch.io](https://marple.itch.io/orb-of-creation), [Orb of Creation — Steam](https://store.steampowered.com/app/1910680/)
- [Antimatter Dimensions](https://www.moddb.com/games/antimatter-dimensions)
