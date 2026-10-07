# 06 — MVP scope & development roadmap

## 1. MVP scope (PART 26)

**В MVP (реалізовано в цьому репозиторії):**
- 1 main screen (Phaser арена + HTML панелі), responsive (mobile/desktop)
- 1 entity — автомат Rustheart
- 1 зона — **The Rust Strata** (глибини 1–∞, Warden кожні 10)
- 4 звичайні вороги + 1 рідкісний (Glimmerworm)
- 1 бос — **The Hollow Bell** (3 фази, Shell, Toll, Counter-Toll)
- Click system: **Fractures**, Chain
- Passive: Drill Motor, offline progress
- Currencies: Scrap, Shards, Echoes (+ Heat/Integrity як стани)
- 6 upgrades (Servo, Motor, Plating, Heat Exchanger, Scrap Hopper, Probe Hull)
- Equipment: 4 слоти (+1 через Memory), 14 предметів, rarity, Forge, Salvage
- 1 active ability: **Vent**
- Probes (3 destination × 3 stances)
- Discovery: Strange Signals, Echo Logs, Glimmerworm, Counter-Toll, "faint signal" вкладки
- Prestige: Collapse + 3 Doctrines + 8 Memories
- Achievements (metric-based)
- Save/load (localStorage + backup + export/import), versioned + migrations
- Offline progress (cap, 50%, clock-rollback guard)
- Particles, floating numbers, shake, hit-stop, synth audio

**Поза MVP:** multiplayer, payments, cloud saves, 2+ страти, procedural maps, Research, Fault Lines, loadout presets, music.

## 2. Roadmap — vertical slices (PART 32)
Після кожної фази: `npm run build` ✅, `npm test` ✅, гра запускається.

| Phase | Slice | Результат | Статус |
|---|---|---|---|
| 1 | Core project | Vite + TS strict + Phaser 4 + vitest; порожня сцена | ✅ |
| 2 | Main click loop | Engine tick, strike, Scrap, HUD | ✅ |
| 3 | Enemy system | data-driven вороги, kills, глибина, Fractures, Chain | ✅ |
| 4 | Boss | Hollow Bell: фази, toll, shell, timer, retreat | ✅ |
| 5 | Resources | Shards, Heat/Vent, Integrity | ✅ |
| 6 | Upgrades | 6 upgrades, unfolding unlocks | ✅ |
| 7 | Equipment | слоти, drops, rarity, forge, salvage | ✅ |
| 8 | Save | LocalSaveService, versions, migrations, export/import | ✅ |
| 9 | Offline | offline calc, "while you were away", visibility | ✅ |
| 10 | Expedition | Probes, stances, seeded outcome | ✅ |
| 11 | Meta | Collapse, Echoes, Doctrine, Memories, achievements | ✅ |
| 12 | Polish | particles, shake, sfx, discovery events | ✅ (базово) |
| 13 | Content: Glass Veins | 2-га страта, Siphon Choir, Lantern Tyrant, нова палітра | next |
| 14 | Loadout presets + Research (Schematics) | 2 пресети, Shards-sink #2 | next |
| 15 | Asset pass | Kenney 1-Bit тонований, Junkala музика, credits-екран | next |
| 16 | Fault Lines (challenges) | run-модифікатори з unique verbs | later |
| 17 | Rekindle (2-й prestige) | шасі автомата | later |
| 18 | Online | account, cloud save, daily seed shaft, leaderboard з replay-валідацією | later |

## 3. Code generation workflow (PART 33)
Для кожної фази: файли → код → зв'язки → imports → `tsc --noEmit` → `vite build` → `vitest` → runtime (Playwright smoke + `npm run sim`) → виправлення. Без TODO там, де реалізацію можна завершити.
