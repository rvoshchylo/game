# 05 — Asset research, license manifest, art direction

## 1. Стратегія

MVP **не залежить від завантажених арт-паків**: вся бойова графіка генерується процедурно (Phaser Graphics → textures), SFX синтезуються Web Audio. Це:
1. дає 100% чисту ліцензію з першого дня;
2. робить білд маленьким;
3. залишає **slot-заміну**: `render/textures.ts` віддає ключі текстур; заміна на спрайт-пак = зміна loader-а, не логіки.

Єдиний сторонній asset у MVP — шрифти (OFL, через `@fontsource`, self-hosted у білді).

Нижче — перевірені паки для production-заміни (Phase 12+). Перевірка ліцензій: сторінки itch.io / OpenGameArt / Google Fonts / game-icons.net (kenney.nl та opengameart.org недоступні з мого середовища напряму, тому ліцензії підтверджені через офіційні itch.io-сторінки Kenney та індексовані OGA-сторінки; **перед імпортом у production — повторно перевірити `License.txt` всередині архіву**).

## 2. Recommended packs

| Pack | URL | Creator | License | Commercial | Attribution | Modify | Relevant assets | Style | Fit |
|---|---|---|---|---|---|---|---|---|---|
| **1-Bit Pack** | https://kenney-assets.itch.io/1-bit-pack | Kenney | CC0 1.0 | ✅ | не потрібна (бажана) | ✅ | 1000+ тайлів: персонажі, вороги, предмети, UI, 16×16 | 1-bit, монохром | ⭐ ідеально: тонуємо палітрою страти |
| **Tiny Dungeon** | https://kenney-assets.itch.io/tiny-dungeon | Kenney | CC0 1.0 | ✅ | не потрібна | ✅ | 130+ спрайтів 16×16, вороги, зброя | кольоровий pixel | добре для ворогів/предметів |
| **Micro Roguelike** | https://opengameart.org/content/micro-roguelike | Kenney | CC0 | ✅ | не потрібна | ✅ | 8×8 персонажі/монстри/тайли | micro pixel | альтернатива для іконок |
| **Particle Pack (80)** | https://opengameart.org/content/particle-pack-80-sprites | Kenney | CC0 | ✅ | не потрібна | ✅ | іскри, дим, вогонь, електрика | HD soft | для Vent/іскор (scaled down + nearest off) |
| **Game Icons** | https://opengameart.org/content/game-icons | Kenney | CC0 | ✅ | не потрібна | ✅ | 105 UI іконок (settings, save, lock, trophy) | flat mono | UI |
| **Interface Sounds** | https://opengameart.org/content/interface-sounds | Kenney | CC0 | ✅ | не потрібна | ✅ | 100 OGG: clicks, confirm, error | clean | UI SFX |
| **Sci-Fi Sounds** | https://opengameart.org/content/sci-fi-sounds | Kenney | CC0 | ✅ | не потрібна | ✅ | 70 OGG: engines, lasers, explosions | sci-fi | бур, Vent, вибухи |
| **Impact Sounds** | https://kenney.nl/assets/impact-sounds | Kenney | CC0 | ✅ | не потрібна | ✅ | металеві удари | — | strikes |
| **4 Chiptunes (Adventure)** | https://opengameart.org/node/74001 | Juhani Junkala | CC0 | ✅ | не потрібна | ✅ | Stage 1/2, Boss Fight, Stage Select (OGG/WAV, looping) | chiptune | музика MVP+ (boss track!) |
| **Pixelify Sans** | https://fonts.google.com/specimen/Pixelify+Sans | Stefie Justprince | OFL 1.1 | ✅ | включити OFL текст | ✅ (rename if modified) | заголовки, числа | pixel | ⭐ використовується |
| **Silkscreen** | https://fonts.google.com/specimen/Silkscreen | Jason Kottke | OFL 1.1 | ✅ | включити OFL текст | ✅ | дрібні мітки | pixel | ⭐ використовується |
| **game-icons.net** | https://game-icons.net | Lorc, Delapouite та ін. | **CC BY 3.0** | ✅ | **ОБОВ'ЯЗКОВА** (автор + посилання) | ✅ | 4000+ іконок предметів/здібностей | silhouette | ✅ тільки з credits-екраном |

### НЕ рекомендовано для production
- Паки itch.io з "free for personal use" або без явного файла ліцензії.
- OGA-паки з **CC BY-SA** / **GPL** без юридичного рішення про share-alike (вплив на похідні асети).
- Будь-які "ripped"/фан-спрайти.

## 3. Asset License Manifest
Файл: [`assets/manifest.json`](../assets/manifest.json). Кожен asset, що потрапляє в білд, **мусить** мати запис; тест `tests/manifest.test.ts` перевіряє, що в усіх `inUse` записів `commercialUse: true` і що attribution-записи мають `attributionText`.

## 4. Art direction (PART 23)

| Параметр | Рішення |
|---|---|
| Стиль | **Low-res pixel, 1-bit + accent-палітра страти** ("rust-punk mono") |
| Внутрішня роздільність | гра рендериться 480×270 логічних px сцени, `pixelArt: true`, масштаб integer-ish через Phaser Scale FIT |
| Perspective | side-view, статична "арена" у стовбурі шахти |
| Sprite sizes | 16×16 нативно (автомат ×4, вороги до 64px), бос 24×24 → 110px, тріщини 9×9 ×3 |
| Environment | вертикальні шари породи, паралакс 2 шари, палітра змінюється зі стратою (Rust: іржаво-помаранчевий, Glass: ціан, Hollow: фіолет) |
| Animation | мінімум кадрів: squash/stretch tweens, bob idle, flash-on-hit замість кадрової анімації (підтримувано без художника) |
| Outline | 1px темний контур (#120d0b) на всіх сутностях |
| UI | темні панелі з 2px "riveted" рамкою, акцент — колір страти; кнопки великі, плоскі, з pixel-тінню |
| Typography | Pixelify Sans — заголовки/числа; Silkscreen — дрібні мітки; system-ui fallback |
| Палітра (Rust Strata) | `#120d0b` bg · `#2a1d17` rock · `#5a3a2a` rock-light · `#e0702a` rust accent · `#ffd166` heat/crit · `#7fd6c2` shards · `#e84a5f` danger · `#f2e9dc` text |

Чому: 1-bit + accent підтримується відкритими паками (Kenney 1-Bit тонується в будь-яку палітру), процедурна графіка в тому ж стилі не виглядає "заглушкою", і страти отримують сильну візуальну ідентичність просто зміною палітри.

## Sources
- [Kenney 1-Bit Pack (itch.io)](https://kenney-assets.itch.io/1-bit-pack), [Kenney Tiny Dungeon (itch.io)](https://kenney-assets.itch.io/tiny-dungeon)
- [Micro Roguelike (OGA)](https://opengameart.org/content/micro-roguelike), [Particle Pack (OGA)](https://opengameart.org/content/particle-pack-80-sprites), [Game Icons (OGA)](https://opengameart.org/content/game-icons)
- [Interface Sounds (OGA)](https://opengameart.org/content/interface-sounds), [Sci-Fi Sounds (OGA)](https://opengameart.org/content/sci-fi-sounds)
- [4 Chiptunes (Adventure) — Juhani Junkala](https://opengameart.org/node/74001)
- [game-icons.net license](https://game-icons.net/about.html)
- [Silkscreen (OFL)](https://awesome.ecosyste.ms/projects/github.com%2Fgooglefonts%2Fsilkscreen), [Pixelify Sans (Fontsource)](https://fontsource.org/fonts/pixelify-sans/about)
