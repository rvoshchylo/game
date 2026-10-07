# Rustheart

> *You are a buried drilling automaton, and every stratum you break teaches your machine a new instinct — but when the shaft collapses, you keep only what you remember.*

A browser idle / clicker / auto-RPG about descent, builds, Wardens and remembering.
Single-player, static web build, designed to grow for months.

**Stack:** Phaser 4.2 · TypeScript (strict) · Vite · Vitest. No React, 1 runtime dependency (+ OFL fonts).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + static build into dist/ (deploy anywhere)
npm test           # core logic, boss, saves/migrations, offline, probes, prestige, license manifest
npm run sim -- 120 0.4 0.5   # headless pacing simulation: minutes, taps/sec, fracture accuracy
```

## What is in the MVP

- **Fractures** — the click that matters: glowing cracks open on enemies; striking them deals ×4, builds Chain and Heat, and is the *only* source of Shards. Automatable later (Governor Relay / Governor Instinct).
- **Vent** — the active ability: spend 100 Heat for ×2 damage, faster fractures, and a broken boss shell.
- **Descent** — PUSH or HOLD, Integrity, Retreat + Rust Debt; Wardens wait for a deliberate CHALLENGE.
- **The Hollow Bell** — 3-phase Warden: Toll, Shell (forces active play), Resonance; a hidden Counter-Toll.
- **Rig** — Core / 2 Modules / Utility; 14 items that change *how* you play (with trade-offs), rarity, Forge, Salvage.
- **Probes** — real-time expeditions (Shallow / Gallery / Abyssal × Cautious / Standard / Reckless) with outcomes sealed at launch.
- **Discovery** — systems unfold one by one, faint-signal placeholders, Strange Signals, Glimmerworms, Echo Logs, Codex.
- **Collapse** — prestige with Echoes, Doctrines (tradeoffs) and Memories (new verbs), plus Resonance: hoard Echoes for power or spend them to remember.
- **Idle** — offline farming at 50% (never pushes), capped, clock-rollback safe; probes keep running.
- **Saves** — versioned, migrated (v1 → v2), checksummed, backup slot, export/import.

## Docs (design before code)

| # | Document |
|---|---|
| 1 | [Research: genre analysis & patterns](docs/01-research.md) |
| 2 | [10 concepts, mechanics worth borrowing, 5 hybrids, scoring matrix, winner, hook](docs/02-concepts.md) |
| 3 | [Game Design Document: loops, click, active/idle, expeditions, bosses, builds, economy, unfolding, discovery, prestige, meta, game feel, balance](docs/03-gdd.md) |
| 4 | [Tech: engine comparison, libraries, architecture, data models, saves, anti-cheat, online, monetization](docs/04-tech.md) |
| 5 | [Assets, license manifest, art direction](docs/05-assets-art.md) · [`assets/manifest.json`](assets/manifest.json) |
| 6 | [MVP scope & roadmap](docs/06-mvp-roadmap.md) |

## Architecture in one breath

`src/core` is a headless engine (no Phaser, no DOM): `dispatch(command)` → systems mutate state → typed events.
`src/render` (Phaser) and `src/ui` (HTML/CSS) only read state, listen to events and send commands.
`src/data` holds every enemy, boss, item, upgrade, probe, memory and unlock as data.
`src/services` hides persistence, analytics, content and monetization behind interfaces (local/mock now, remote later).
The same core runs in Node for tests, the pacing simulator, and — later — server-side replay validation.
