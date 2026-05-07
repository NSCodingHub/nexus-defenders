# NEXUS DEFENDERS — CLAUDE.md

## Project Overview
Single-player/multi-hero tower defense RPG. Sci-fi setting (Year 2387). A dimensional rift called "The Breach" merges prehistoric, present, and future timelines. Players defend the Nexus Core crystal against waves of enemies using a squad of heroes, each with a unique Triad structure system (Anchor / Conduit / Striker).

## Tech Stack
- **Current:** Phaser 3 (migrating from vanilla HTML5 Canvas)
- **Language:** JavaScript (ES2020+)
- **Renderer:** Phaser 3 WebGL/Canvas
- **Target:** Browser (desktop-first)
- **Entry point:** `index.html` (loads Phaser, boots game)

## Directory Structure
```
Project 1/
├── index.html              # Entry point
├── src/
│   ├── main.js             # Phaser game config + boot
│   ├── scenes/
│   │   ├── BootScene.js    # Preload assets, first-run lore check
│   │   ├── LoreScene.js    # First-run cinematic intro
│   │   ├── MenuScene.js    # Main menu
│   │   ├── HeroSelectScene.js
│   │   ├── MapSelectScene.js
│   │   ├── GameScene.js    # Core gameplay
│   │   ├── TavernScene.js  # Shop / inventory / upgrades
│   │   └── PauseScene.js   # Pause overlay
│   ├── systems/
│   │   ├── CombatSystem.js
│   │   ├── WaveSystem.js
│   │   ├── TowerSystem.js
│   │   └── DropSystem.js
│   ├── data/
│   │   ├── heroes.js       # All 6 hero definitions
│   │   ├── enemies.js      # Enemy types
│   │   ├── items.js        # Full item pool
│   │   └── difficulties.js
│   └── ui/
│       ├── HeroPanel.js
│       ├── HUD.js
│       ├── TowerMenu.js    # Click-to-manage radial menu
│       └── NodeTree.js
├── assets/
│   ├── maps/               # Phaser tilemaps or background images
│   ├── audio/              # SFX + music (future)
│   └── sprites/            # Tower/enemy/effect sprites (future)
├── CLAUDE.md
└── .gitignore
```

## Core Design Systems

### Triad System
Every hero has exactly 3 structure types:
- **Anchor (A):** Zone controller — buffs nearby structures, debuffs enemies in range. Does not attack.
- **Conduit (C):** Path debuffer — marks/slows/poisons enemies as they pass through.
- **Striker (S):** Damage dealer — normal damage alone, combo multipliers vs Conduit-marked enemies.
- **Striker T2 (S2):** Unlocked at hero level 15. Higher cost, higher damage, AoE.

### 6 Heroes
AXIOM, LYRA, GRAK, NOVA, ZARA, ECLIPSE — each has unique combo mechanics, 3 playstyle paths, and 4 ability nodes (auto-granted at levels 5/10/15/20).

### Resonance Bonds
Cross-hero passive bonuses when both heroes are in the squad:
- **Iron Age** (GRAK + AXIOM): AXIOM Strikers +40% dmg vs GRAK-slowed enemies
- **Event Horizon** (LYRA + NOVA): NOVA Strikers 1.5× inside LYRA Gravity Wells
- **Cursed Ground** (ZARA + ECLIPSE): Poison spreads to adjacent enemies on death

### Combat Loop
- Build phase → place/upgrade towers → Start Wave → combat tick (50ms) → wave complete → drops modal → next wave
- 10 waves per run. Boss (BREACH TITAN) on wave 10 only.
- Enemies route from spawn gates to the Nexus Core via pre-defined waypoints.

### Enemy Pathfinding
- Each spawn gate has a waypoint chain leading to the crystal.
- Enemies follow their gate's waypoint path with smooth steering.
- Towers do NOT block paths (DD1-style: enemies route around them via navmesh).

### Tower Placement (Phaser)
- Free-form — click any valid ground tile.
- Invalid zones: within clearance radius of waypoint paths, on top of other towers.
- Click existing tower → radial menu (Upgrade / Move / Sell).
- Upgrade during combat has a construction timer (2s per tier level).

### XP & Leveling
- XP awarded to all active heroes on every kill.
- `xpNeeded = floor(100 * 1.15^(level-1))`
- Each level: +2 stat points.
- Stats (Power/Resilience/Mana/Range/Haste/Fortune) directly scale combat values.

### Gold
- Earned from kills.
- Spent on: tower upgrades (30g / 70g / 130g per tier), Tavern items, permanent stat boosts.

## Development Rules
1. **No tile grid** — map is free-form. All positions are pixel coordinates.
2. **Solo play must always be viable** — never gate gameplay behind multi-hero requirements.
3. **Combat math is data-driven** — hero/enemy/item stats live in `src/data/`, never hardcoded in scenes.
4. **No reduced fire rate during upgrades** — tower fires normally throughout construction.
5. **Save/Load via localStorage** — key: `nexus_save`. Always versioned (`v` field).
6. **Modular scenes** — each screen is a separate Phaser Scene. GameScene does not reach into other scenes.

## Difficulty Scaling
| Difficulty   | HP   | Speed | Count | Starting Mana | Guaranteed Drop |
|--------------|------|-------|-------|---------------|-----------------|
| Easy         | ×0.6 | ×0.7  | ×0.7  | 320           | Common          |
| Normal       | ×1.0 | ×1.0  | ×1.0  | 270           | Uncommon        |
| Hard         | ×1.5 | ×1.2  | ×1.3  | 230           | Rare            |
| Chaos        | ×2.5 | ×1.5  | ×1.8  | 190           | Epic            |
| Apocalypse   | ×4.0 | ×2.0  | ×2.5  | 160           | Legendary + Epic|

## Item Rarities
Common (grey) → Uncommon (green) → Rare (blue) → Epic (purple) → Legendary (orange) → Mythic (red)

## Known Pending Features
- [ ] Phaser 3 migration (in progress)
- [ ] Free-form tower placement + pathfinding
- [ ] Pause / ESC menu
- [ ] Tavern screen (shop / inventory / upgrades)
- [ ] First-run lore cinematic
- [ ] Mastery Shards + solo milestone challenges
- [ ] Apex Form (level 30)
- [ ] Prestige system
- [ ] Multiple maps
- [ ] Audio (SFX + ambient)
- [ ] Mobile layout

## Lead Dev Instructions
- Role: Lead Game Developer. Zero fluff. Implement exactly what's asked.
- Always read relevant files before editing.
- Combat math changes require updating `src/data/` AND `src/systems/CombatSystem.js`.
- New heroes/items go in `src/data/` only — scenes read from data, never define it inline.
- Prefer targeted edits over full rewrites unless architecture changes require it.
