# Rustheart

> *You are the engineer of the last drilling robot. You don't fight — you build the machine, choose its path, and watch whether your design survives the deep.*

A calm, no-clicking browser game: arrange modules on the robot's grid (shapes, power, neighbour synergies), send it on auto-battling expeditions down a branching shaft, grow a camp that unlocks new systems. Plays fine in 3-minute check-ins; keeps going while you're away.

**Languages:** Українська · English · Русский (auto-detected, switch in ⚙ Settings). In-game **GUIDE** tab explains every system.

**Stack:** Phaser 4.2 · TypeScript (strict) · Vite · Vitest. No React, 1 runtime dependency (+ Tiny5 OFL font, CC0 Kenney sprites).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + static build into dist/ (deploy anywhere)
npm test           # core logic, boss, saves/migrations, offline, probes, prestige, license manifest
npm run sim -- 4             # headless pacing simulation: a scripted engineer plays N hours
```

## Deploy (GitHub Pages)

The game is a fully static site — no backend. `.github/workflows/deploy.yml` tests, builds and
publishes `dist/` on every push to the default branch (other branches and PRs only build + test).

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The game is then served at `https://<user>.github.io/<repo>/` (relative asset paths via `base: './'`).

## What is in the game (v2, "Engineer")

- **Module grid** (3×3 → 5×5): 13 modules with tetromino-like shapes, rotation, a power budget, and neighbour synergies (batteries charge weapons, coolers speed them up, reactors overheat the uncooled, plates love corners, magnets feed cargo holds). Named combos are discoveries.
- **Auto-expeditions**: the robot walks and fights on its own; every module visibly fires. At each fork you pick Fight / Elite / Cache / Rest / Event — or the autopilot does after a few seconds.
- **The Hollow Bell**: a Warden that tolls through armor (bring shields) and armors up at half health (bring Breakers). Beating it opens the next tier.
- **Camp**: Workshop (grid size, crafting), Storage, Repair Dock, Radio Tower (autopilot rules, auto-relaunch), Forge (merge twins into higher levels).
- **Idle**: time away is simulated by the same engine (up to 8 h); you come back to a journal of what happened.
- **Saves** v3 (whole state, including an expedition mid-fight), checksummed, backup slot, export/import. Clicker-era saves start fresh with a notice.

## Docs (design before code)

| # | Document |
|---|---|
| 1 | [Research: genre analysis & patterns](docs/01-research.md) |
| 2 | [10 concepts, mechanics worth borrowing, 5 hybrids, scoring matrix, winner, hook](docs/02-concepts.md) |
| 3 | *(v1, superseded)* [Game Design Document: loops, click, active/idle, expeditions, bosses, builds, economy, unfolding, discovery, prestige, meta, game feel, balance](docs/03-gdd.md) |
| 4 | [Tech: engine comparison, libraries, architecture, data models, saves, anti-cheat, online, monetization](docs/04-tech.md) |
| 5 | [Assets, license manifest, art direction](docs/05-assets-art.md) · [`assets/manifest.json`](assets/manifest.json) |
| 6 | [MVP scope & roadmap (v1)](docs/06-mvp-roadmap.md) |
| 7 | **[GDD v2 — Engineer: module grid, auto-expeditions, camp (current direction)](docs/07-gdd-v2-engineer.md)** |

## Architecture in one breath

`src/core` is a headless engine (no Phaser, no DOM): `dispatch(command)` → systems mutate state → typed events.
`src/render` (Phaser) and `src/ui` (HTML/CSS) only read state, listen to events and send commands.
`src/data` holds every enemy, boss, item, upgrade, probe, memory and unlock as data.
`src/services` hides persistence, analytics, content and monetization behind interfaces (local/mock now, remote later).
The same core runs in Node for tests, the pacing simulator, and — later — server-side replay validation.
