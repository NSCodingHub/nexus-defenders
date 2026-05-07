import { HEROES, BONDS, ABILITY_NODES, STRUCTURE_HP, UPGRADE_COSTS, UPGRADE_BUILD_TIMES } from '../data/heroes.js';
import { DIFFICULTIES } from '../data/difficulties.js';
import { GATES, GAME_W, GAME_H, CRYSTAL, PILLARS, PLACEMENT_CLEARANCE, WAYPOINT_REACH, TOWER_RADIUS } from '../data/map.js';
import { ITEMS, RARITIES, RARITY_COLORS, RARITY_GLOW } from '../data/items.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { buildWave, scaleEnemy } from '../systems/WaveSystem.js';
import { isClearOfPaths, isClearOfTowers, buildTower, startUpgrade, tickUpgrade, upgradeMult } from '../systems/TowerSystem.js';
import { rollDrop, waveCompletionRewards } from '../systems/DropSystem.js';
import { activeBonds, getBonuses, effDmg, effRange, effRate, processTick } from '../systems/CombatSystem.js';

const SAVE_KEY = 'nexus_save';
const MAX_WAVES = 10;
const XP_BASE   = 100;
const XP_GROWTH = 1.15;

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // ─── init ──────────────────────────────────────────────────────────────────
  init(data) {
    this.initData = data;
  }

  // ─── create ───────────────────────────────────────────────────────────────
  create() {
    const d = this.initData || {};

    if (d.load) {
      this.loadState();
    } else {
      this.initState(d.squad || ['AXIOM'], d.diff || 'normal');
    }

    this.buildMapGraphics();
    this.buildHUD();
    this.buildStructurePanel();

    // Input
    this.input.on('pointerdown', this.handleClick, this);
    this.input.on('pointermove', this.handleHover, this);
    this.input.keyboard.on('keydown-ESC', () => this.openPause());

    // Arrow animation timer
    this.arrowPhase = 0;
    this.time.addEvent({ delay: 50, loop: true, callback: () => { this.arrowPhase = (this.arrowPhase + 1) % 20; this.redrawArrows(); } });

    // Start pre-wave grace period
    this.startGrace();
  }

  // ─── state initialisation ─────────────────────────────────────────────────
  initState(squad, diffKey) {
    const diff = DIFFICULTIES[diffKey];
    this.state = {
      squad,
      diffKey,
      diff,
      wave: 0,
      phase: 'grace',     // 'grace' | 'combat' | 'result' | 'gameover' | 'win'
      crystalHP: 100,
      gold: diff.mana,
      towers: [],
      enemies: [],
      nextUid: 1,
      heroLevels:  Object.fromEntries(squad.map(h => [h, 1])),
      heroXP:      Object.fromEntries(squad.map(h => [h, 0])),
      heroStats:   Object.fromEntries(squad.map(h => [h, { ...HEROES[h].stats }])),
      statPoints:  Object.fromEntries(squad.map(h => [h, 0])),
      abilityNodes:Object.fromEntries(squad.map(h => [h, []])),
      inventory:   [],
      equipped:    {},     // heroId -> { Weapon, Armor, Relic, Sigil }
      bonds:       activeBonds(squad),
      graceTimer:  null,
      waveTimer:   null,
      spawnQueue:  [],
      dmgNums:     [],
      toasts:      [],
    };
  }

  loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { this.initState(['AXIOM'], 'normal'); return; }
      const s = JSON.parse(raw);
      this.state = { ...s, diff: DIFFICULTIES[s.diffKey], bonds: activeBonds(s.squad) };
    } catch {
      this.initState(['AXIOM'], 'normal');
    }
  }

  saveState() {
    const { diff, ...rest } = this.state;
    localStorage.setItem(SAVE_KEY, JSON.stringify(rest));
    this.showToast('SAVED', '#4ade80');
  }

  // ─── map graphics ─────────────────────────────────────────────────────────
  buildMapGraphics() {
    const g = this.add.graphics();
    this._mapGfx = g;

    // Floor
    g.fillStyle(0x0d0d1a);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // Stone tile grid
    g.lineStyle(1, 0x1a1a2e, 0.6);
    for (let x = 0; x < GAME_W; x += 40) g.lineBetween(x, 0, x, GAME_H);
    for (let y = 0; y < GAME_H; y += 40) g.lineBetween(0, y, GAME_W, y);

    // Path lanes (slightly lighter)
    GATES.forEach(gate => {
      const wps = gate.waypoints;
      g.lineStyle(36, Phaser.Display.Color.HexStringToColor(gate.hexStr).color, 0.10);
      g.beginPath();
      g.moveTo(wps[0].x, wps[0].y);
      wps.forEach(wp => g.lineTo(wp.x, wp.y));
      g.strokePath();
    });

    // Path outlines
    GATES.forEach(gate => {
      const wps = gate.waypoints;
      const col = Phaser.Display.Color.HexStringToColor(gate.hexStr).color;
      g.lineStyle(2, col, 0.25);
      g.beginPath();
      g.moveTo(wps[0].x, wps[0].y);
      wps.forEach(wp => g.lineTo(wp.x, wp.y));
      g.strokePath();
    });

    // Pillars
    PILLARS.forEach(p => {
      g.fillStyle(0x1e1e30);
      g.fillRect(p.x - 12, p.y - 12, 24, 24);
      g.lineStyle(1, 0x334455);
      g.strokeRect(p.x - 12, p.y - 12, 24, 24);
    });

    // Gate labels
    GATES.forEach(gate => {
      const col = Phaser.Display.Color.HexStringToColor(gate.hexStr).color;
      this.add.text(gate.x, gate.y - 22, gate.label, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '11px',
        color: gate.hexStr,
      }).setOrigin(0.5).setAlpha(0.7);

      // Gate icon circle
      const gc = this.add.graphics();
      gc.lineStyle(2, col, 0.8);
      gc.strokeCircle(gate.x, gate.y, 14);
      gc.fillStyle(col, 0.2);
      gc.fillCircle(gate.x, gate.y, 14);
    });

    // Crystal
    this._crystalGfx = this.add.graphics();
    this._redrawCrystal();

    // Arrow layer (redrawn on timer)
    this._arrowGfx = this.add.graphics();
    this.redrawArrows();

    // Hover range preview
    this._hoverGfx = this.add.graphics();

    // Tower layer
    this._towerGfx = this.add.graphics();

    // Enemy layer
    this._enemyGfx = this.add.graphics();

    // Damage number container
    this._dmgContainer = this.add.container(0, 0);
  }

  _redrawCrystal() {
    const g = this._crystalGfx;
    g.clear();
    const hp = this.state.crystalHP;
    const col = hp > 60 ? 0x22d3ee : hp > 30 ? 0xfb923c : 0xf43f5e;
    g.lineStyle(2, col, 0.9);
    g.strokeCircle(CRYSTAL.x, CRYSTAL.y, 18);
    g.fillStyle(col, 0.25);
    g.fillCircle(CRYSTAL.x, CRYSTAL.y, 18);
    // Inner diamond
    g.fillStyle(col, 0.6);
    g.fillTriangle(
      CRYSTAL.x, CRYSTAL.y - 10,
      CRYSTAL.x + 8, CRYSTAL.y,
      CRYSTAL.x - 8, CRYSTAL.y
    );
    g.fillTriangle(
      CRYSTAL.x, CRYSTAL.y + 10,
      CRYSTAL.x + 8, CRYSTAL.y,
      CRYSTAL.x - 8, CRYSTAL.y
    );
  }

  redrawArrows() {
    const g = this._arrowGfx;
    g.clear();
    GATES.forEach(gate => {
      const wps = gate.waypoints;
      const col = Phaser.Display.Color.HexStringToColor(gate.hexStr).color;
      for (let i = 0; i < wps.length - 1; i++) {
        const a  = wps[i];
        const b  = wps[i + 1];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const len = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
        if (len < 40) continue;
        const nx = (b.x - a.x) / len;
        const ny = (b.y - a.y) / len;

        // Animated offset along the segment
        const offset = ((this.arrowPhase / 20) * 40 - 20);
        const ax = mx + nx * offset;
        const ay = my + ny * offset;
        const perp = 6;
        const back = 8;

        g.fillStyle(col, 0.55);
        g.fillTriangle(
          ax + nx * perp,        ay + ny * perp,
          ax - nx * back - ny * perp, ay - ny * back + nx * perp,
          ax - nx * back + ny * perp, ay - ny * back - nx * perp
        );
      }
    });
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────
  buildHUD() {
    const s = this.state;
    const topY = GAME_H - 1;

    // Bottom HUD bar
    this.add.rectangle(GAME_W / 2, GAME_H - 28, GAME_W, 56, 0x0a0a14, 0.95);

    this._hudGold  = this.add.text(16, GAME_H - 40, '', hudStyle('#fb923c', 14)).setOrigin(0, 0.5);
    this._hudCrystal = this.add.text(160, GAME_H - 40, '', hudStyle('#22d3ee', 14)).setOrigin(0, 0.5);
    this._hudWave  = this.add.text(GAME_W / 2, GAME_H - 40, '', hudStyle('#ffffff', 14)).setOrigin(0.5, 0.5);
    this._hudPhase = this.add.text(GAME_W / 2, GAME_H - 22, '', hudStyle('#556677', 11)).setOrigin(0.5, 0.5);

    // Save button
    const saveBg = this.add.rectangle(GAME_W - 60, GAME_H - 30, 100, 30, 0x1a3322, 0.8)
      .setStrokeStyle(1, 0x4ade80, 0.5).setInteractive({ useHandCursor: true });
    this.add.text(GAME_W - 60, GAME_H - 30, '💾 SAVE', hudStyle('#4ade80', 11)).setOrigin(0.5);
    saveBg.on('pointerdown', () => this.saveState());

    // XP bars (top of screen, per hero)
    this._xpBars = {};
    s.squad.forEach((heroId, i) => {
      const x = 16 + i * 320;
      const hero = HEROES[heroId];
      this.add.text(x, 8, hero.icon + ' ' + hero.name, {
        fontFamily: 'Orbitron, monospace', fontSize: '12px', color: hero.color,
      });
      const barBg = this.add.rectangle(x + 4, 28, 200, 8, 0x1a1a2e).setOrigin(0, 0.5);
      const barFill = this.add.rectangle(x + 4, 28, 0, 8, Phaser.Display.Color.HexStringToColor(hero.color).color).setOrigin(0, 0.5);
      const lvlTxt = this.add.text(x + 210, 28, 'LV 1', { fontFamily: 'Orbitron, monospace', fontSize: '10px', color: hero.color }).setOrigin(0, 0.5);
      this._xpBars[heroId] = { barFill, lvlTxt, barBg };
    });

    // Bonds HUD
    this._bondTxts = [];
    if (s.bonds.length > 0) {
      s.bonds.forEach((bond, i) => {
        const txt = this.add.text(GAME_W - 16, 10 + i * 22, `⚡ ${bond.name}`, {
          fontFamily: 'Exo 2, monospace', fontSize: '11px', color: bond.color,
        }).setOrigin(1, 0);
        this._bondTxts.push(txt);
      });
    }

    // Toast container
    this._toastContainer = this.add.container(GAME_W / 2, GAME_H - 100);

    this.refreshHUD();
  }

  refreshHUD() {
    const s = this.state;
    this._hudGold.setText(`⚡ ${s.gold}g`);
    this._hudCrystal.setText(`💎 ${s.crystalHP}%`);
    this._hudWave.setText(`WAVE ${s.wave} / ${MAX_WAVES}`);
    const phaseLabels = { grace: 'GRACE PERIOD', combat: 'COMBAT', result: 'WAVE COMPLETE', gameover: 'GAME OVER', win: 'VICTORY' };
    this._hudPhase.setText(phaseLabels[s.phase] || '');

    // XP bars
    s.squad.forEach(heroId => {
      const { barFill, lvlTxt } = this._xpBars[heroId];
      const lvl = s.heroLevels[heroId];
      const xp  = s.heroXP[heroId];
      const needed = xpNeeded(lvl);
      const pct = Math.min(xp / needed, 1);
      barFill.setSize(pct * 200, 8);
      lvlTxt.setText(`LV ${lvl}`);
    });
  }

  // ─── structure panel (right sidebar) ──────────────────────────────────────
  buildStructurePanel() {
    const panelX = GAME_W - 200;
    const panelW = 200;
    this.add.rectangle(panelX + panelW / 2, GAME_H / 2 - 28, panelW, GAME_H - 56, 0x080810, 0.97)
      .setStrokeStyle(1, 0x1a1a2e);

    this._structPanel = this.add.container(panelX + 10, 50);
    this.refreshStructPanel();
  }

  refreshStructPanel() {
    this._structPanel.removeAll(true);
    const s = this.state;
    let y = 0;

    s.squad.forEach(heroId => {
      const hero = HEROES[heroId];
      const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;
      const lvl = s.heroLevels[heroId];

      this._structPanel.add(this.add.text(0, y, hero.icon + ' ' + hero.name, {
        fontFamily: 'Orbitron, monospace', fontSize: '12px', color: hero.color,
      }));
      y += 18;

      const structs = ['A', 'C', 'S'];
      if (lvl >= 15) structs.push('S2');

      structs.forEach(type => {
        const def = hero[type];
        const bg = this.add.rectangle(85, y + 16, 170, 34, hexCol, 0.08)
          .setStrokeStyle(1, hexCol, 0.3)
          .setInteractive({ useHandCursor: true });

        const typeLbl = this.add.text(2, y + 6, type, {
          fontFamily: 'Orbitron, monospace', fontSize: '11px', color: hero.color,
        });
        const nameLbl = this.add.text(24, y + 5, def.name, {
          fontFamily: 'Exo 2, monospace', fontSize: '10px', color: '#aabbcc',
        });
        const costLbl = this.add.text(24, y + 18, `${def.emoji} ${def.cost}g`, {
          fontFamily: 'Exo 2, monospace', fontSize: '10px', color: '#778899',
        });

        this._structPanel.add(bg);
        this._structPanel.add(typeLbl);
        this._structPanel.add(nameLbl);
        this._structPanel.add(costLbl);

        bg.on('pointerover', () => bg.setFillStyle(hexCol, 0.22));
        bg.on('pointerout',  () => bg.setFillStyle(hexCol, 0.08));
        bg.on('pointerdown', () => {
          if (s.phase !== 'grace' && s.phase !== 'combat') return;
          if (s.gold < def.cost) { this.showToast('NOT ENOUGH GOLD', '#f43f5e'); return; }
          this.setPlacing(heroId, type);
        });

        y += 38;
      });

      y += 8;
    });

    // Placed towers list
    if (s.towers.length > 0) {
      this._structPanel.add(this.add.text(0, y, 'PLACED', {
        fontFamily: 'Orbitron, monospace', fontSize: '10px', color: '#556677', letterSpacing: 2,
      }));
      y += 14;

      s.towers.forEach(tower => {
        const hero = HEROES[tower.heroId];
        const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;
        const upgLabel = tower.upgBuilding ? `T${tower.upgTier}▶T${tower.upgTier + 1}` : `T${tower.upgTier}`;

        const bg = this.add.rectangle(85, y + 14, 170, 28, hexCol, 0.06)
          .setStrokeStyle(1, hexCol, 0.2)
          .setInteractive({ useHandCursor: true });
        const lbl = this.add.text(2, y + 5, `${hero.icon}${tower.type} ${upgLabel}`, {
          fontFamily: 'Exo 2, monospace', fontSize: '10px', color: hero.color,
        });

        // Upgrade pip cost
        const upgCost = tower.upgTier < 6 ? UPGRADE_COSTS[tower.upgTier] : null;
        if (upgCost !== null) {
          const upgBtn = this.add.text(100, y + 5, `↑${upgCost}g`, {
            fontFamily: 'Orbitron, monospace', fontSize: '10px', color: '#fb923c',
          }).setInteractive({ useHandCursor: true });
          upgBtn.on('pointerdown', () => this.tryUpgrade(tower));
          this._structPanel.add(upgBtn);
        }

        this._structPanel.add(bg);
        this._structPanel.add(lbl);

        bg.on('pointerdown', () => this.selectTower(tower));
        y += 30;
      });
    }
  }

  // ─── placing ──────────────────────────────────────────────────────────────
  setPlacing(heroId, type) {
    this._placing = { heroId, type };
    this.input.setDefaultCursor('crosshair');
    this.showToast(`PLACING ${type} — click to place, ESC to cancel`, HEROES[heroId].color);
    this.input.keyboard.once('keydown-ESC', () => {
      this._placing = null;
      this.input.setDefaultCursor('default');
    });
  }

  handleHover(ptr) {
    const x = ptr.x;
    const y = ptr.y;
    const g = this._hoverGfx;
    g.clear();

    if (!this._placing) return;
    const { heroId, type } = this._placing;
    const hero   = HEROES[heroId];
    const def    = hero[type];
    const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;
    const canPlace = isClearOfPaths(x, y) && isClearOfTowers(x, y, this.state.towers);

    g.lineStyle(2, canPlace ? hexCol : 0xff0000, 0.7);
    g.strokeCircle(x, y, TOWER_RADIUS);

    if (def.range) {
      g.lineStyle(1, hexCol, 0.25);
      g.strokeCircle(x, y, def.range);
    }
  }

  handleClick(ptr) {
    // Right-click cancels placing
    if (ptr.rightButtonDown && this._placing) {
      this._placing = null;
      this.input.setDefaultCursor('default');
      return;
    }

    if (this._placing) {
      this.tryPlace(ptr.x, ptr.y);
      return;
    }

    // Click on existing tower?
    const tower = this.state.towers.find(t => {
      const dx = t.x - ptr.x;
      const dy = t.y - ptr.y;
      return Math.sqrt(dx * dx + dy * dy) <= TOWER_RADIUS + 4;
    });
    if (tower) { this.selectTower(tower); return; }
  }

  tryPlace(x, y) {
    const { heroId, type } = this._placing;
    const hero = HEROES[heroId];
    const def  = hero[type];
    const s    = this.state;

    if (!isClearOfPaths(x, y)) { this.showToast('TOO CLOSE TO PATH', '#f43f5e'); return; }
    if (!isClearOfTowers(x, y, s.towers)) { this.showToast('OVERLAPS EXISTING TOWER', '#f43f5e'); return; }
    if (s.gold < def.cost) { this.showToast('NOT ENOUGH GOLD', '#f43f5e'); return; }

    s.gold -= def.cost;
    const tower = buildTower(heroId, type, x, y, s.nextUid++);
    s.towers.push(tower);

    this._placing = null;
    this.input.setDefaultCursor('default');
    this._hoverGfx.clear();
    this.refreshHUD();
    this.refreshStructPanel();
    this.redrawTowers();
  }

  selectTower(tower) {
    // Show a simple info toast; full radial menu is a future enhancement
    const hero = HEROES[tower.heroId];
    this.showToast(`${hero.icon} ${tower.type} T${tower.upgTier} | HP ${tower.hp}/${tower.maxHp}`, hero.color, 3000);
  }

  tryUpgrade(tower) {
    const s = this.state;
    if (tower.upgTier >= 6 || tower.upgBuilding) return;
    const cost = UPGRADE_COSTS[tower.upgTier];
    if (s.gold < cost) { this.showToast('NOT ENOUGH GOLD', '#f43f5e'); return; }
    s.gold -= cost;
    startUpgrade(tower);
    this.refreshHUD();
    this.refreshStructPanel();
  }

  // ─── wave management ──────────────────────────────────────────────────────
  startGrace() {
    const s = this.state;
    s.phase = 'grace';
    s.wave++;
    if (s.wave > MAX_WAVES) { this.endGame(true); return; }

    const graceDur = s.diff.gw * 1000;
    this.refreshHUD();

    this._graceTimer = this.time.delayedCall(graceDur, () => this.startWave());

    // Grace countdown text
    if (this._graceCountdown) this._graceCountdown.destroy();
    this._graceCountdown = this.add.text(GAME_W / 2, 46, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#4ade80',
    }).setOrigin(0.5);

    const startMs = this.time.now;
    this.time.addEvent({
      delay: 100, loop: true, callback: () => {
        if (s.phase !== 'grace') { this._graceCountdown?.setText(''); return; }
        const elapsed = this.time.now - startMs;
        const remaining = Math.max(0, graceDur - elapsed);
        this._graceCountdown.setText(`WAVE ${s.wave} INCOMING — ${(remaining / 1000).toFixed(1)}s`);
      }
    });
  }

  startWave() {
    const s = this.state;
    s.phase = 'combat';
    s.enemies = [];
    const events = buildWave(s.wave, s.diff);
    s._totalSpawns = events.length;
    s._spawnsDispatched = 0;

    this.refreshHUD();
    this._graceCountdown?.setText('');

    events.forEach(evt => {
      this.time.delayedCall(evt.delay, () => {
        s._spawnsDispatched++;
        this.spawnEnemy(evt);
      });
    });

    // Hard timeout fallback
    const waveDur = s.diff.mw * 1000 + events.length * 600;
    this._waveEndTimer = this.time.delayedCall(waveDur, () => this.checkWaveComplete());
  }

  spawnEnemy(evt) {
    const s = this.state;
    if (s.phase !== 'combat') return;
    const gate = GATES.find(g => g.id === evt.gateId);
    const enemy = scaleEnemy(evt.typeId, s.wave, s.diff);

    // Pick perpendicular offset for lane spread
    const wps = gate.waypoints;
    const laneWps = applyLaneOffset(wps, evt.laneOff || 0);

    s.enemies.push({
      ...enemy,
      uid: s.nextUid++,
      x: laneWps[0].x,
      y: laneWps[0].y,
      waypoints: laneWps,
      waypointIndex: 1,
      pathProgress: 0,
      dead: false,
      counted: false,
      atCrystal: false,
      slowFactor: undefined,
      slowed: false,
      marked: false,
      poisoned: false,
      venomStacks: 0,
      inFracture: false,
      inWell: false,
      laneOff: evt.laneOff,
    });
  }

  checkWaveComplete() {
    const s = this.state;
    if (s.phase !== 'combat') return;
    if (s.enemies.some(e => !e.dead)) {
      // Still enemies — check again in 500ms
      this.time.delayedCall(500, () => this.checkWaveComplete());
      return;
    }
    this.onWaveComplete();
  }

  onWaveComplete() {
    const s = this.state;
    s.phase = 'result';

    const { gold, xp } = waveCompletionRewards(s.wave, s.diff);
    s.gold += gold;

    s.squad.forEach(heroId => {
      this.awardXP(heroId, xp);
    });

    // Item drop
    const item = rollDrop(s.squad, s.diff.guar, s.squad.reduce((acc, h) => acc + s.heroStats[h].Fortune, 0) / s.squad.length);
    if (item) {
      s.inventory.push(item);
      const col = RARITY_COLORS[item.rar] || '#ffffff';
      this.showToast(`DROP: ${item.name} (${item.rar})`, col, 4000);
    }

    this.showToast(`WAVE ${s.wave} COMPLETE  +${gold}g  +${xp}xp`, '#4ade80', 3000);
    this.refreshHUD();

    if (s.wave >= MAX_WAVES) {
      this.endGame(true);
    } else {
      this.time.delayedCall(2000, () => this.startGrace());
    }
  }

  // ─── XP & leveling ────────────────────────────────────────────────────────
  awardXP(heroId, amount) {
    const s = this.state;
    s.heroXP[heroId] += amount;
    const needed = xpNeeded(s.heroLevels[heroId]);
    while (s.heroXP[heroId] >= needed) {
      s.heroXP[heroId] -= xpNeeded(s.heroLevels[heroId]);
      s.heroLevels[heroId]++;
      this.onLevelUp(heroId);
    }
  }

  onLevelUp(heroId) {
    const s = this.state;
    const lvl = s.heroLevels[heroId];
    s.statPoints[heroId] = (s.statPoints[heroId] || 0) + 2;

    // Apply ability nodes
    const nodes = ABILITY_NODES[heroId] || [];
    const node = nodes.find(n => n.lvl === lvl);
    if (node) {
      s.abilityNodes[heroId].push(node);
      this.showToast(`${HEROES[heroId].name} NODE: ${node.name}`, HEROES[heroId].color, 4000);
    }

    this.showToast(`${HEROES[heroId].name} → LEVEL ${lvl}`, HEROES[heroId].color, 3000);

    // XP bar flash
    const bar = this._xpBars[heroId];
    if (bar) {
      this.tweens.add({
        targets: bar.barFill,
        alpha: { from: 1, to: 0.2 },
        yoyo: true, duration: 150, repeat: 4,
        onComplete: () => bar.barFill.setAlpha(1),
      });
    }

    this.refreshHUD();
    if (lvl === 15) this.refreshStructPanel(); // unlock S2
  }

  // ─── game over / win ──────────────────────────────────────────────────────
  endGame(victory) {
    const s = this.state;
    s.phase = victory ? 'win' : 'gameover';
    this.refreshHUD();

    const msg = victory ? 'VICTORY — THE BREACH IS SEALED' : 'THE NEXUS CORE HAS FALLEN';
    const col = victory ? '#4ade80' : '#f43f5e';

    this.add.rectangle(GAME_W / 2, GAME_H / 2, 600, 200, 0x05050f, 0.97)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(col).color);
    this.add.text(GAME_W / 2, GAME_H / 2 - 30, msg, {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: col,
    }).setOrigin(0.5);

    const menuBtn = this.add.text(GAME_W / 2, GAME_H / 2 + 40, '[ MAIN MENU ]', {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: '#22d3ee',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  // ─── update loop ──────────────────────────────────────────────────────────
  update(time, delta) {
    const s = this.state;
    if (s.phase !== 'combat') {
      this.redrawEnemies();
      this.redrawTowers();
      return;
    }

    // Combat tick
    const result = processTick({
      towers: s.towers,
      enemies: s.enemies,
      squad: s.squad,
      heroStats: s.heroStats,
      abilityNodes: s.abilityNodes,
      diff: s.diff,
      bonds: s.bonds,
    }, delta);

    // Upgrade ticks
    let upgradeChanged = false;
    s.towers.forEach(t => {
      if (t.upgBuilding) {
        const done = tickUpgrade(t, delta);
        if (done) upgradeChanged = true;
      }
    });
    if (upgradeChanged) this.refreshStructPanel();

    // Crystal damage
    if (result.crystalHit > 0) {
      s.crystalHP = Math.max(0, s.crystalHP - result.crystalHit);
      this._redrawCrystal();
      this.refreshHUD();
      if (s.crystalHP <= 0) { this.endGame(false); return; }
    }

    // Gold from kills
    result.killed.forEach(e => {
      s.gold += e.gold || 0;
      this.awardXP(s.squad[0], e.xp || 0);
    });

    if (result.killed.length > 0) this.refreshHUD();

    // Damage numbers
    result.dmgNums.forEach(d => this.spawnDmgNum(d.x, d.y, d.val, d.critical));

    // Prune dead enemies
    s.enemies = s.enemies.filter(e => !e.dead || !e.counted);

    this.redrawEnemies();
    this.redrawTowers();

    // Check if all spawns dispatched + all enemies dead
    if (s._spawnsDispatched >= s._totalSpawns && s.enemies.every(e => e.dead)) {
      this.checkWaveComplete();
    }
  }

  // ─── render helpers ───────────────────────────────────────────────────────
  redrawTowers() {
    const g = this._towerGfx;
    g.clear();
    this.state.towers.forEach(tower => {
      const hero   = HEROES[tower.heroId];
      const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;
      const types  = { A: 0, C: 1, S: 2, S2: 3 };
      const radius = tower.type === 'A' ? 18 : tower.type === 'C' ? 14 : 16;

      // Glow for high tiers
      if (tower.upgTier >= 3) {
        g.fillStyle(hexCol, 0.08 * tower.upgTier);
        g.fillCircle(tower.x, tower.y, radius + 10);
      }

      // Upgrade build ring
      if (tower.upgBuilding) {
        const needed = UPGRADE_BUILD_TIMES[tower.upgTier] || 1;
        const pct = tower.upgProgress / needed;
        g.lineStyle(3, 0xfb923c, 0.8);
        g.beginPath();
        g.arc(tower.x, tower.y, radius + 4, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
        g.strokePath();
      }

      // Anchor zone outline
      if (tower.type === 'A') {
        g.lineStyle(1, hexCol, 0.15);
        g.strokeCircle(tower.x, tower.y, tower.def.cost + 20);
      }

      // Body
      g.fillStyle(hexCol, 0.85);
      if (tower.type === 'A') {
        g.fillRect(tower.x - radius, tower.y - radius, radius * 2, radius * 2);
        g.lineStyle(2, hexCol);
        g.strokeRect(tower.x - radius, tower.y - radius, radius * 2, radius * 2);
      } else if (tower.type === 'C') {
        g.fillTriangle(
          tower.x, tower.y - radius,
          tower.x - radius, tower.y + radius,
          tower.x + radius, tower.y + radius,
        );
      } else {
        g.fillCircle(tower.x, tower.y, radius);
        g.lineStyle(2, 0xffffff, 0.2);
        g.strokeCircle(tower.x, tower.y, radius);
      }

      // Upgrade pip dots
      for (let i = 0; i < tower.upgTier; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = tower.x + Math.cos(angle) * (radius + 6);
        const py = tower.y + Math.sin(angle) * (radius + 6);
        g.fillStyle(0xfb923c);
        g.fillCircle(px, py, 2.5);
      }

      // Type label
      // (Text objects are too expensive per-tower in a Graphics redraw — use separate text objects)
    });

    // Tower emoji labels — update or create pool
    this._updateTowerLabels();
  }

  _updateTowerLabels() {
    if (!this._towerLabels) this._towerLabels = new Map();
    const used = new Set();

    this.state.towers.forEach(tower => {
      const hero = HEROES[tower.heroId];
      let lbl = this._towerLabels.get(tower.uid);
      if (!lbl) {
        lbl = this.add.text(tower.x, tower.y, hero[tower.type].emoji || tower.type, {
          fontSize: '14px',
        }).setOrigin(0.5).setDepth(10);
        this._towerLabels.set(tower.uid, lbl);
      }
      lbl.setPosition(tower.x, tower.y).setVisible(true);
      used.add(tower.uid);
    });

    this._towerLabels.forEach((lbl, uid) => {
      if (!used.has(uid)) { lbl.destroy(); this._towerLabels.delete(uid); }
    });
  }

  redrawEnemies() {
    const g = this._enemyGfx;
    g.clear();
    this.state.enemies.forEach(enemy => {
      if (enemy.dead) return;
      const radius = enemy.boss ? 20 : enemy.elite ? 14 : 10;
      const col = enemy.boss ? 0xff3300 : enemy.elite ? 0xffaa00 : 0xee4444;

      // Shadow
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(enemy.x, enemy.y + radius + 2, radius * 2, radius * 0.6);

      // Body
      g.fillStyle(col);
      g.fillCircle(enemy.x, enemy.y, radius);

      // Status rings
      if (enemy.poisoned) { g.lineStyle(2, 0x4ade80, 0.8); g.strokeCircle(enemy.x, enemy.y, radius + 3); }
      if (enemy.slowed || enemy.inFracture) { g.lineStyle(2, 0x60a5fa, 0.7); g.strokeCircle(enemy.x, enemy.y, radius + 5); }
      if (enemy.marked) { g.lineStyle(2, 0xf43f5e, 0.9); g.strokeCircle(enemy.x, enemy.y, radius + 2); }

      // HP bar
      const hpPct = enemy.hp / enemy.maxHp;
      const bw = radius * 2.4;
      const bx = enemy.x - bw / 2;
      const by = enemy.y - radius - 7;
      g.fillStyle(0x1a1a2e);
      g.fillRect(bx, by, bw, 4);
      g.fillStyle(hpPct > 0.5 ? 0x4ade80 : hpPct > 0.25 ? 0xfb923c : 0xf43f5e);
      g.fillRect(bx, by, bw * hpPct, 4);
    });

    this._updateEnemyLabels();
  }

  _updateEnemyLabels() {
    if (!this._enemyLabels) this._enemyLabels = new Map();
    const used = new Set();

    this.state.enemies.forEach(enemy => {
      if (enemy.dead) return;
      let lbl = this._enemyLabels.get(enemy.uid);
      if (!lbl) {
        const etype = ENEMY_TYPES.find(e => e.id === enemy.id);
        lbl = this.add.text(enemy.x, enemy.y, etype?.emoji || '👾', {
          fontSize: enemy.boss ? '22px' : enemy.elite ? '16px' : '12px',
        }).setOrigin(0.5).setDepth(20);
        this._enemyLabels.set(enemy.uid, lbl);
      }
      lbl.setPosition(enemy.x, enemy.y).setVisible(true);
      used.add(enemy.uid);
    });

    this._enemyLabels.forEach((lbl, uid) => {
      if (!used.has(uid)) { lbl.destroy(); this._enemyLabels.delete(uid); }
    });
  }

  spawnDmgNum(x, y, val, critical) {
    const col = critical ? '#f43f5e' : '#ffffff';
    const size = critical ? '18px' : '13px';
    const txt = this.add.text(x, y, `-${val}`, {
      fontFamily: 'Orbitron, monospace', fontSize: size, color: col,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  // ─── pause ────────────────────────────────────────────────────────────────
  openPause() {
    if (this.state.phase === 'gameover' || this.state.phase === 'win') return;
    this.scene.pause();
    this.scene.launch('PauseScene');
  }

  // ─── toasts ───────────────────────────────────────────────────────────────
  showToast(msg, col = '#ffffff', duration = 2500) {
    const txt = this.add.text(GAME_W / 2, GAME_H / 2 - 60, msg, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '15px',
      color: col,
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000088',
      padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha: 1,
      y: GAME_H / 2 - 80,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(duration - 600, () => {
          this.tweens.add({ targets: txt, alpha: 0, duration: 400, onComplete: () => txt.destroy() });
        });
      },
    });
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function xpNeeded(lvl) {
  return Math.floor(XP_BASE * Math.pow(XP_GROWTH, lvl - 1));
}

function hudStyle(color, size) {
  return { fontFamily: 'Orbitron, monospace', fontSize: `${size}px`, color };
}

function applyLaneOffset(waypoints, laneOff) {
  if (!laneOff) return waypoints;
  return waypoints.map((wp, i) => {
    if (i === 0 || i === waypoints.length - 1) return wp;
    const prev = waypoints[i - 1];
    const next = waypoints[i + 1];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Perpendicular
    return { x: wp.x + (dy / len) * laneOff, y: wp.y - (dx / len) * laneOff };
  });
}
