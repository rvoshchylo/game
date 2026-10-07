# Rustheart

> *Move your robot. Its weapons fire on their own. Survive 10 minutes in the shaft.*

A **Vampire Survivors–style** action roguelite for the browser: hordes of enemies, auto-attacking weapons, pick 1 of 3 upgrades on every level, boss chests, weapon evolutions, and permanent upgrades / new robots between runs. Works with keyboard or a touch joystick.

**Languages:** Українська · English · Русский (auto-detected, switch in ⚙ Settings). In-game **GUIDE** tab explains every system.

**Stack:** Phaser 4.2 · TypeScript (strict) · Vite · Vitest. No React, 1 runtime dependency (+ Tiny5 OFL font, CC0 Kenney sprites).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + static build into dist/ (deploy anywhere)
npm test           # core logic, boss, saves/migrations, offline, probes, prestige, license manifest
npm run sim -- 5             # balance check: a kiting bot plays N full runs
```

## Deploy (GitHub Pages)

The game is a fully static site — no backend. `.github/workflows/deploy.yml` tests, builds and
publishes `dist/` on every push to the default branch (other branches and PRs only build + test).

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The game is then served at `https://<user>.github.io/<repo>/` (relative asset paths via `base: './'`).

## What is in the game (v3, "Survivors")

- 6 auto weapons (Drill Slash, Spark Bolt, Orbit Saw, Shock Field, Mortar, Laser Lance), 6 passives, 4+4 slots.
- 6 weapon evolutions (max weapon + matching passive → boss chest).
- 7 enemy types joining minute by minute, swarms, 2 bosses (5:00, 8:00); win at 10:00.
- Between runs: 10 permanent upgrades, 4 robots, unlockable weapons, collection & records.
- 3 languages (uk/en/ru), in-game guide, saves with migrations, GitHub Pages deploy.

## Docs (design before code)

| # | Document |
|---|---|
| 1 | [Research: genre analysis & patterns](docs/01-research.md) |
| 2 | [10 concepts, mechanics worth borrowing, 5 hybrids, scoring matrix, winner, hook](docs/02-concepts.md) |
| 3 | *(v1, superseded)* [Game Design Document: loops, click, active/idle, expeditions, bosses, builds, economy, unfolding, discovery, prestige, meta, game feel, balance](docs/03-gdd.md) |
| 4 | [Tech: engine comparison, libraries, architecture, data models, saves, anti-cheat, online, monetization](docs/04-tech.md) |
| 5 | [Assets, license manifest, art direction](docs/05-assets-art.md) · [`assets/manifest.json`](assets/manifest.json) |
| 6 | [MVP scope & roadmap (v1)](docs/06-mvp-roadmap.md) |
| 7 | *(v2, superseded)* [GDD v2 — Engineer](docs/07-gdd-v2-engineer.md) |
| 8 | **[GDD v3 — Survivors (current)](docs/08-gdd-v3-survivors.md)** |

## Architecture in one breath

`src/core` is a headless engine (no Phaser, no DOM): `dispatch(command)` → systems mutate state → typed events.
`src/render` (Phaser) and `src/ui` (HTML/CSS) only read state, listen to events and send commands.
`src/data` holds every enemy, boss, item, upgrade, probe, memory and unlock as data.
`src/services` hides persistence, analytics, content and monetization behind interfaces (local/mock now, remote later).
The same core runs in Node for tests, the pacing simulator, and — later — server-side replay validation.
