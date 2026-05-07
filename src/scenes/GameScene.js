import { HEROES, BONDS, ABILITY_NODES, STRUCTURE_HP, UPGRADE_COSTS, UPGRADE_BUILD_TIMES } from '../data/heroes.js';
import { DIFFICULTIES } from '../data/difficulties.js';
import { GATES, GAME_W, GAME_H, CRYSTAL, PILLARS, PLACEMENT_CLEARANCE, WAYPOINT_REACH, TOWER_RADIUS } from '../data/map.js';
import { ITEMS, RARITIES, RARITY_COLORS, RARITY_GLOW } from '../data/items.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { buildWave, scaleEnemy } from '../systems/WaveSystem.js';
import { isClearOfPaths, isClearOfTowers, buildTower, startUpgrade, tickUpgrade, upgradeMult } from '../systems/TowerSystem.js';
import { rollDrop, waveCompletionRewards } from '../systems/DropSystem.js';
import { activeBonds, getBonuses, effDmg, effRange, effRate, processTick } from '../systems/CombatSystem.js';
import { createHero, tickHero } from '../systems/HeroSystem.js';
import { tickProjectiles } from '../systems/ProjectileSystem.js';
import { createGroundDrop, tickDrops } from '../systems/GroundLootSystem.js';

const SAVE_KEY  = 'nexus_save';
const MAX_WAVES = 10;
const XP_BASE   = 100;
const XP_GROWTH = 1.15;
const PLAY_W    = GAME_W - 200;
const HUD_H     = 80;

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // ─── init ──────────────────────────────────────────────────────────────────
  init(data) { this.initData = data; }

  // ─── create ───────────────────────────────────────────────────────────────
  create() {
    const d = this.initData || {};
    if (d.load) { this.loadState(); } else { this.initState(d.squad || ['AXIOM'], d.diff || 'normal'); }

    this.buildMapGraphics();
    this.buildHUD();
    this.buildStructurePanel();

    // ── keyboard ──────────────────────────────────────────────────────────
    this._wasd = this.input.keyboard.addKeys({ up:'W', down:'S', left:'A', right:'D' });
    this._arrows = this.input.keyboard.createCursorKeys();
    this._abilityPressed = [false, false, false, false];
    ['Q','E','R','F'].forEach((k, i) => {
      this.input.keyboard.on(`keydown-${k}`, () => { this._abilityPressed[i] = true; });
    });
    this.input.keyboard.on('keydown-B', () => this.toggleInputMode());
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._placing) { this._placing = null; this.input.setDefaultCursor('default'); return; }
      this.openPause();
    });

    // ── pointer tracking ─────────────────────────────────────────────────
    this._ptr = { x: PLAY_W / 2, y: (GAME_H - HUD_H) / 2 };
    this.input.on('pointermove', ptr => { this._ptr.x = ptr.x; this._ptr.y = ptr.y; this.handleHover(ptr); });
    this.input.on('pointerdown', ptr => this.handleClick(ptr));

    // Arrow animation
    this.arrowPhase = 0;
    this.time.addEvent({ delay: 50, loop: true, callback: () => { this.arrowPhase = (this.arrowPhase + 1) % 20; this.redrawArrows(); } });

    this.startGrace();
  }

  // ─── state ────────────────────────────────────────────────────────────────
  initState(squad, diffKey) {
    const diff = DIFFICULTIES[diffKey];
    this.state = {
      squad, diffKey, diff,
      wave: 0, phase: 'grace',
      crystalHP: 100, gold: diff.mana,
      towers: [], enemies: [], projectiles: [], drops: [], companions: [],
      nextUid: 1,
      inputMode: 'move',
      hero: createHero(squad[0]),
      heroLevels:   Object.fromEntries(squad.map(h => [h, 1])),
      heroXP:       Object.fromEntries(squad.map(h => [h, 0])),
      heroStats:    Object.fromEntries(squad.map(h => [h, { ...HEROES[h].stats }])),
      statPoints:   Object.fromEntries(squad.map(h => [h, 0])),
      abilityNodes: Object.fromEntries(squad.map(h => [h, []])),
      inventory: [], equipped: {},
      bonds: activeBonds(squad),
      spawnQueue: [], dmgNums: [], toasts: [],
      _totalSpawns: 0, _spawnsDispatched: 0,
    };
  }

  loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { this.initState(['AXIOM'], 'normal'); return; }
      const s = JSON.parse(raw);
      this.state = {
        ...s,
        diff: DIFFICULTIES[s.diffKey],
        bonds: activeBonds(s.squad),
        projectiles: [], drops: [], companions: [],
        hero: s.hero || createHero(s.squad[0]),
        inputMode: 'move',
      };
    } catch { this.initState(['AXIOM'], 'normal'); }
  }

  saveState() {
    const { diff, projectiles, drops, companions, ...rest } = this.state;
    localStorage.setItem(SAVE_KEY, JSON.stringify(rest));
    this.showToast('SAVED', '#4ade80');
  }

  toggleInputMode() {
    const s = this.state;
    if (s.phase === 'gameover' || s.phase === 'win') return;
    s.inputMode = s.inputMode === 'move' ? 'build' : 'move';
    if (s.inputMode === 'move') { this._placing = null; this.input.setDefaultCursor('default'); }
    this._refreshModeIndicator();
  }

  // ─── map ──────────────────────────────────────────────────────────────────
  buildMapGraphics() {
    const g = this.add.graphics();
    g.fillStyle(0x0d0d1a); g.fillRect(0, 0, GAME_W, GAME_H);
    g.lineStyle(1, 0x1a1a2e, 0.6);
    for (let x = 0; x < GAME_W; x += 40) g.lineBetween(x, 0, x, GAME_H);
    for (let y = 0; y < GAME_H; y += 40) g.lineBetween(0, y, GAME_W, y);

    GATES.forEach(gate => {
      const wps = gate.waypoints;
      const col = Phaser.Display.Color.HexStringToColor(gate.hexStr).color;
      g.lineStyle(36, col, 0.10);
      g.beginPath(); g.moveTo(wps[0].x, wps[0].y);
      wps.forEach(wp => g.lineTo(wp.x, wp.y)); g.strokePath();
      g.lineStyle(2, col, 0.25);
      g.beginPath(); g.moveTo(wps[0].x, wps[0].y);
      wps.forEach(wp => g.lineTo(wp.x, wp.y)); g.strokePath();
    });

    PILLARS.forEach(p => {
      g.fillStyle(0x1e1e30); g.fillRect(p.x-12, p.y-12, 24, 24);
      g.lineStyle(1, 0x334455); g.strokeRect(p.x-12, p.y-12, 24, 24);
    });

    GATES.forEach(gate => {
      const col = Phaser.Display.Color.HexStringToColor(gate.hexStr).color;
      this.add.text(gate.x, gate.y - 22, gate.label, { fontFamily:'Orbitron,monospace', fontSize:'11px', color:gate.hexStr }).setOrigin(0.5).setAlpha(0.7);
      const gc = this.add.graphics();
      gc.lineStyle(2, col, 0.8); gc.strokeCircle(gate.x, gate.y, 14);
      gc.fillStyle(col, 0.2);    gc.fillCircle(gate.x, gate.y, 14);
    });

    this._crystalGfx = this.add.graphics(); this._redrawCrystal();
    this._arrowGfx   = this.add.graphics(); this.redrawArrows();
    this._hoverGfx   = this.add.graphics();
    this._towerGfx   = this.add.graphics();
    this._enemyGfx   = this.add.graphics();
    this._heroGfx    = this.add.graphics();
    this._projGfx    = this.add.graphics();
    this._dropGfx    = this.add.graphics();
    this._dmgContainer = this.add.container(0, 0);
  }

  _redrawCrystal() {
    const g = this._crystalGfx; g.clear();
    const hp = this.state.crystalHP;
    const col = hp > 60 ? 0x22d3ee : hp > 30 ? 0xfb923c : 0xf43f5e;
    g.lineStyle(2, col, 0.9); g.strokeCircle(CRYSTAL.x, CRYSTAL.y, 18);
    g.fillStyle(col, 0.25);   g.fillCircle(CRYSTAL.x, CRYSTAL.y, 18);
    g.fillStyle(col, 0.6);
    g.fillTriangle(CRYSTAL.x, CRYSTAL.y-10, CRYSTAL.x+8, CRYSTAL.y, CRYSTAL.x-8, CRYSTAL.y);
    g.fillTriangle(CRYSTAL.x, CRYSTAL.y+10, CRYSTAL.x+8, CRYSTAL.y, CRYSTAL.x-8, CRYSTAL.y);
  }

  redrawArrows() {
    const g = this._arrowGfx; g.clear();
    GATES.forEach(gate => {
      const wps = gate.waypoints;
      const col = Phaser.Display.Color.HexStringToColor(gate.hexStr).color;
      for (let i = 0; i < wps.length - 1; i++) {
        const a = wps[i], b = wps[i+1];
        const mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
        const len = Math.sqrt((b.x-a.x)**2 + (b.y-a.y)**2);
        if (len < 40) continue;
        const nx = (b.x-a.x)/len, ny = (b.y-a.y)/len;
        const offset = ((this.arrowPhase/20)*40 - 20);
        const ax = mx + nx*offset, ay = my + ny*offset;
        g.fillStyle(col, 0.55);
        g.fillTriangle(ax+nx*6, ay+ny*6, ax-nx*8-ny*6, ay-ny*8+nx*6, ax-nx*8+ny*6, ay-ny*8-nx*6);
      }
    });
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────
  buildHUD() {
    const s = this.state;
    this.add.rectangle(GAME_W/2, GAME_H - HUD_H/2, GAME_W, HUD_H, 0x050510, 0.96).setDepth(90);

    // ── hero HP / mana bars ──────────────────────────────────────────────
    const hx = 12, hy = GAME_H - HUD_H + 10;
    const hero = HEROES[s.squad[0]];
    this.add.text(hx, hy, hero.icon + ' ' + hero.name, { fontFamily:'Orbitron,monospace', fontSize:'11px', color:hero.color }).setDepth(91);

    this.add.rectangle(hx + 2, hy+20, 130, 10, 0x1a1a2e).setOrigin(0,0.5).setDepth(91);
    this._heroHpBar  = this.add.rectangle(hx + 2, hy+20, 130, 10, 0xf43f5e).setOrigin(0,0.5).setDepth(92);
    this._heroHpTxt  = this.add.text(hx + 136, hy+20, '', { fontFamily:'Orbitron,monospace', fontSize:'9px', color:'#f43f5e' }).setOrigin(0,0.5).setDepth(92);

    this.add.rectangle(hx + 2, hy+34, 130, 8, 0x1a1a2e).setOrigin(0,0.5).setDepth(91);
    this._heroManaBar = this.add.rectangle(hx + 2, hy+34, 130, 8, 0x3b82f6).setOrigin(0,0.5).setDepth(92);
    this._heroManaTxt = this.add.text(hx + 136, hy+34, '', { fontFamily:'Orbitron,monospace', fontSize:'9px', color:'#3b82f6' }).setOrigin(0,0.5).setDepth(92);

    // ── ability slots ────────────────────────────────────────────────────
    const abilityKeys = ['Q','E','R','F'];
    this._abilitySlots = [];
    const abilities = HEROES[s.squad[0]].heroAbilities || [];
    abilities.forEach((ab, i) => {
      const ax = hx + 170 + i * 62;
      const ay = GAME_H - HUD_H + 14;
      const col = Phaser.Display.Color.HexStringToColor(hero.color).color;
      this.add.rectangle(ax + 24, ay + 22, 48, 44, col, 0.10).setStrokeStyle(1, col, 0.4).setOrigin(0.5).setDepth(91);
      const keyTxt  = this.add.text(ax + 24, ay + 6,  abilityKeys[i], { fontFamily:'Orbitron,monospace', fontSize:'10px', color:hero.color }).setOrigin(0.5).setDepth(92);
      const nameTxt = this.add.text(ax + 24, ay + 18, ab.name.substring(0,7), { fontFamily:'Exo 2,monospace', fontSize:'8px', color:'#778899' }).setOrigin(0.5).setDepth(92);
      const cdOverlay = this.add.rectangle(ax + 24, ay + 22, 48, 44, 0x000000, 0).setOrigin(0.5).setDepth(93);
      const cdTxt = this.add.text(ax + 24, ay + 32, '', { fontFamily:'Orbitron,monospace', fontSize:'9px', color:'#aaaaaa' }).setOrigin(0.5).setDepth(94);
      this._abilitySlots.push({ cdOverlay, cdTxt, cooldown: ab.cooldown * 1000 });
    });

    // ── respawn label ────────────────────────────────────────────────────
    this._respawnTxt = this.add.text(hx + 2, GAME_H - HUD_H + 56, '', { fontFamily:'Orbitron,monospace', fontSize:'10px', color:'#f43f5e' }).setDepth(92);

    // ── gold / crystal / wave ────────────────────────────────────────────
    this._hudGold    = this.add.text(450, GAME_H - HUD_H + 14, '', hudSty('#fb923c', 13)).setDepth(91);
    this._hudCrystal = this.add.text(450, GAME_H - HUD_H + 32, '', hudSty('#22d3ee', 13)).setDepth(91);
    this._hudWave    = this.add.text(GAME_W/2, GAME_H - HUD_H + 14, '', hudSty('#ffffff', 14)).setOrigin(0.5, 0).setDepth(91);
    this._hudPhase   = this.add.text(GAME_W/2, GAME_H - HUD_H + 32, '', hudSty('#556677', 11)).setOrigin(0.5, 0).setDepth(91);

    // ── mode indicator ───────────────────────────────────────────────────
    this._modeIndicator = this.add.text(GAME_W/2, GAME_H - HUD_H + 52, '', hudSty('#4ade80', 10)).setOrigin(0.5, 0).setDepth(91);
    this._refreshModeIndicator();

    // ── save button ──────────────────────────────────────────────────────
    const saveBg = this.add.rectangle(GAME_W - 60, GAME_H - HUD_H/2, 100, 30, 0x1a3322, 0.8)
      .setStrokeStyle(1, 0x4ade80, 0.5).setInteractive({ useHandCursor:true }).setDepth(91);
    this.add.text(GAME_W - 60, GAME_H - HUD_H/2, '💾 SAVE', hudSty('#4ade80', 11)).setOrigin(0.5).setDepth(92);
    saveBg.on('pointerdown', () => this.saveState());

    // ── XP bars ──────────────────────────────────────────────────────────
    this._xpBars = {};
    s.squad.forEach((heroId, i) => {
      const x = 16 + i * 320;
      const h = HEROES[heroId];
      this.add.text(x, 8, h.icon+' '+h.name, { fontFamily:'Orbitron,monospace', fontSize:'12px', color:h.color }).setDepth(91);
      const barBg   = this.add.rectangle(x+4, 28, 200, 8, 0x1a1a2e).setOrigin(0, 0.5).setDepth(91);
      const barFill = this.add.rectangle(x+4, 28, 0,   8, Phaser.Display.Color.HexStringToColor(h.color).color).setOrigin(0, 0.5).setDepth(92);
      const lvlTxt  = this.add.text(x+210, 28, 'LV 1', { fontFamily:'Orbitron,monospace', fontSize:'10px', color:h.color }).setOrigin(0, 0.5).setDepth(92);
      this._xpBars[heroId] = { barFill, lvlTxt };
    });

    // ── bonds ────────────────────────────────────────────────────────────
    if (s.bonds.length > 0) {
      s.bonds.forEach((bond, i) => {
        this.add.text(GAME_W - 16, 10 + i*22, `⚡ ${bond.name}`, { fontFamily:'Exo 2,monospace', fontSize:'11px', color:bond.color }).setOrigin(1, 0).setDepth(91);
      });
    }

    this._toastContainer = this.add.container(GAME_W/2, GAME_H - 120).setDepth(100);
    this.refreshHUD();
  }

  _refreshModeIndicator() {
    const s = this.state;
    if (s.inputMode === 'move') {
      this._modeIndicator?.setText('[ MOVE MODE — B=BUILD | WASD=Move | LClick=Attack | Q/E/R/F=Abilities ]');
    } else {
      this._modeIndicator?.setText('[ BUILD MODE — B=MOVE | Click=Place/Select Tower ]');
    }
  }

  refreshHUD() {
    const s = this.state;
    this._hudGold.setText(`⚡ ${s.gold}g`);
    this._hudCrystal.setText(`💎 ${s.crystalHP}%`);
    this._hudWave.setText(`WAVE ${s.wave} / ${MAX_WAVES}`);
    const phases = { grace:'GRACE PERIOD', combat:'COMBAT', result:'WAVE COMPLETE', gameover:'GAME OVER', win:'VICTORY' };
    this._hudPhase.setText(phases[s.phase] || '');

    s.squad.forEach(heroId => {
      const { barFill, lvlTxt } = this._xpBars[heroId];
      const lvl = s.heroLevels[heroId], xp = s.heroXP[heroId];
      barFill.setSize(Math.min(xp / xpNeeded(lvl), 1) * 200, 8);
      lvlTxt.setText(`LV ${lvl}`);
    });
  }

  refreshHeroHUD() {
    const s = this.state;
    const hero = s.hero;
    const hpPct   = hero.dead ? 0 : hero.hp / hero.maxHp;
    const manaPct = hero.dead ? 0 : hero.mana / hero.maxMana;
    this._heroHpBar.setSize(Math.max(0, hpPct) * 130, 10);
    this._heroManaBar.setSize(Math.max(0, manaPct) * 130, 8);
    this._heroHpTxt.setText(hero.dead ? 'DEAD' : `${Math.ceil(hero.hp)}/${hero.maxHp}`);
    this._heroManaTxt.setText(`${Math.floor(hero.mana)}/${hero.maxMana}`);

    if (hero.dead) {
      this._respawnTxt.setText(`RESPAWNING ${(hero.respawnTimer/1000).toFixed(1)}s`);
    } else {
      this._respawnTxt.setText('');
    }

    // Ability cooldowns
    const abilities = HEROES[s.squad[0]].heroAbilities || [];
    this._abilitySlots.forEach((slot, i) => {
      const cd = hero.abilityCooldowns[i] || 0;
      const maxCd = abilities[i]?.cooldown * 1000 || 1;
      const pct = cd / maxCd;
      slot.cdOverlay.setFillStyle(0x000000, pct * 0.7);
      slot.cdTxt.setText(cd > 0 ? (cd/1000).toFixed(1) : '');
    });
  }

  // ─── structure panel ──────────────────────────────────────────────────────
  buildStructurePanel() {
    const panelX = GAME_W - 200;
    this.add.rectangle(panelX + 100, GAME_H/2 - HUD_H/2, 200, GAME_H - HUD_H, 0x080810, 0.97).setStrokeStyle(1, 0x1a1a2e).setDepth(89);
    this._structPanel = this.add.container(panelX + 10, 50).setDepth(91);
    this.refreshStructPanel();
  }

  refreshStructPanel() {
    this._structPanel.removeAll(true);
    const s = this.state;
    let y = 0;

    s.squad.forEach(heroId => {
      const hero   = HEROES[heroId];
      const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;
      const lvl    = s.heroLevels[heroId];

      this._structPanel.add(this.add.text(0, y, hero.icon+' '+hero.name, { fontFamily:'Orbitron,monospace', fontSize:'12px', color:hero.color }));
      y += 18;

      const structs = ['A','C','S'];
      if (lvl >= 15) structs.push('S2');

      structs.forEach(type => {
        const def = hero[type];
        const bg = this.add.rectangle(85, y+16, 170, 34, hexCol, 0.08)
          .setStrokeStyle(1, hexCol, 0.3).setInteractive({ useHandCursor:true });
        this._structPanel.add(bg);
        this._structPanel.add(this.add.text(2,  y+6,  type,     { fontFamily:'Orbitron,monospace', fontSize:'11px', color:hero.color }));
        this._structPanel.add(this.add.text(24, y+5,  def.name, { fontFamily:'Exo 2,monospace', fontSize:'10px', color:'#aabbcc' }));
        this._structPanel.add(this.add.text(24, y+18, `${def.emoji} ${def.cost}g`, { fontFamily:'Exo 2,monospace', fontSize:'10px', color:'#778899' }));

        bg.on('pointerover', () => bg.setFillStyle(hexCol, 0.22));
        bg.on('pointerout',  () => bg.setFillStyle(hexCol, 0.08));
        bg.on('pointerdown', () => {
          if (s.phase !== 'grace' && s.phase !== 'combat') return;
          if (s.gold < def.cost) { this.showToast('NOT ENOUGH GOLD', '#f43f5e'); return; }
          s.inputMode = 'build';
          this._refreshModeIndicator();
          this.setPlacing(heroId, type);
        });
        y += 38;
      });
      y += 8;
    });

    if (s.towers.length > 0) {
      this._structPanel.add(this.add.text(0, y, 'PLACED', { fontFamily:'Orbitron,monospace', fontSize:'10px', color:'#556677' }));
      y += 14;
      s.towers.forEach(tower => {
        const hero    = HEROES[tower.heroId];
        const hexCol  = Phaser.Display.Color.HexStringToColor(hero.color).color;
        const upgLabel = tower.upgBuilding ? `T${tower.upgTier}▶T${tower.upgTier+1}` : `T${tower.upgTier}`;
        const bg = this.add.rectangle(85, y+14, 170, 28, hexCol, 0.06).setStrokeStyle(1, hexCol, 0.2).setInteractive({ useHandCursor:true });
        const lbl = this.add.text(2, y+5, `${hero.icon}${tower.type} ${upgLabel}`, { fontFamily:'Exo 2,monospace', fontSize:'10px', color:hero.color });
        const upgCost = tower.upgTier < 6 ? UPGRADE_COSTS[tower.upgTier] : null;
        if (upgCost !== null) {
          const upgBtn = this.add.text(100, y+5, `↑${upgCost}g`, { fontFamily:'Orbitron,monospace', fontSize:'10px', color:'#fb923c' }).setInteractive({ useHandCursor:true });
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
    this.showToast(`PLACING ${type} — click to place, ESC/B to cancel`, HEROES[heroId].color);
  }

  handleHover(ptr) {
    const g = this._hoverGfx; g.clear();
    if (!this._placing) return;
    const { heroId, type } = this._placing;
    const hero   = HEROES[heroId];
    const def    = hero[type];
    const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;
    const canPlace = isClearOfPaths(ptr.x, ptr.y) && isClearOfTowers(ptr.x, ptr.y, this.state.towers);
    g.lineStyle(2, canPlace ? hexCol : 0xff0000, 0.7);
    g.strokeCircle(ptr.x, ptr.y, TOWER_RADIUS);
    if (def.range) { g.lineStyle(1, hexCol, 0.25); g.strokeCircle(ptr.x, ptr.y, def.range); }
  }

  handleClick(ptr) {
    if (ptr.rightButtonDown()) {
      if (this._placing) { this._placing = null; this.input.setDefaultCursor('default'); }
      return;
    }

    // In build mode: place tower or select tower
    const s = this.state;
    if (this._placing) { this.tryPlace(ptr.x, ptr.y); return; }

    if (s.inputMode === 'build') {
      const tower = s.towers.find(t => {
        const dx = t.x - ptr.x, dy = t.y - ptr.y;
        return dx*dx + dy*dy <= (TOWER_RADIUS+4)**2;
      });
      if (tower) { this.selectTower(tower); }
    }
    // Move mode attacks are handled via polling in update()
  }

  tryPlace(x, y) {
    const { heroId, type } = this._placing;
    const hero = HEROES[heroId];
    const def  = hero[type];
    const s    = this.state;
    if (!isClearOfPaths(x, y))           { this.showToast('TOO CLOSE TO PATH', '#f43f5e'); return; }
    if (!isClearOfTowers(x, y, s.towers)) { this.showToast('OVERLAPS EXISTING TOWER', '#f43f5e'); return; }
    if (s.gold < def.cost)                { this.showToast('NOT ENOUGH GOLD', '#f43f5e'); return; }
    if (x > PLAY_W - 10)                  { this.showToast('INVALID PLACEMENT', '#f43f5e'); return; }

    s.gold -= def.cost;
    s.towers.push(buildTower(heroId, type, x, y, s.nextUid++));
    this._placing = null;
    this.input.setDefaultCursor('default');
    this._hoverGfx.clear();
    this.refreshHUD();
    this.refreshStructPanel();
    this.redrawTowers();
  }

  selectTower(tower) {
    const hero = HEROES[tower.heroId];
    this.showToast(`${hero.icon} ${tower.type} T${tower.upgTier} | HP ${tower.hp}/${tower.maxHp}`, hero.color, 2500);
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
    const dur = s.diff.gw * 1000;
    this.refreshHUD();

    this._graceTimer = this.time.delayedCall(dur, () => this.startWave());

    if (this._graceCountdown) this._graceCountdown.destroy();
    this._graceCountdown = this.add.text(PLAY_W/2, 46, '', { fontFamily:'Orbitron,monospace', fontSize:'20px', color:'#4ade80' }).setOrigin(0.5).setDepth(95);
    const startMs = this.time.now;
    this.time.addEvent({ delay:100, loop:true, callback:() => {
      if (s.phase !== 'grace') { this._graceCountdown?.setText(''); return; }
      const rem = Math.max(0, dur - (this.time.now - startMs));
      this._graceCountdown.setText(`WAVE ${s.wave} INCOMING — ${(rem/1000).toFixed(1)}s`);
    }});
  }

  startWave() {
    const s = this.state;
    s.phase = 'combat';
    s.enemies = [];
    s.projectiles = [];
    s.drops = [];
    s.companions = [];
    const events = buildWave(s.wave, s.diff);
    s._totalSpawns = events.length;
    s._spawnsDispatched = 0;
    this.refreshHUD();
    this._graceCountdown?.setText('');

    events.forEach(evt => {
      this.time.delayedCall(evt.delay, () => { s._spawnsDispatched++; this.spawnEnemy(evt); });
    });
    const waveDur = s.diff.mw * 1000 + events.length * 600;
    this._waveEndTimer = this.time.delayedCall(waveDur, () => this.checkWaveComplete());
  }

  spawnEnemy(evt) {
    const s = this.state;
    if (s.phase !== 'combat') return;
    const gate  = GATES.find(g => g.id === evt.gateId);
    const enemy = scaleEnemy(evt.typeId, s.wave, s.diff);
    const laneWps = applyLaneOffset(gate.waypoints, evt.laneOff || 0);

    s.enemies.push({
      ...enemy,
      uid: s.nextUid++,
      x: laneWps[0].x, y: laneWps[0].y,
      waypoints: laneWps, waypointIndex: 1,
      pathProgress: 0,
      dead: false, counted: false, escaped: false, dropCounted: false,
      atCrystal: false,
      slowFactor: undefined, slowed: false, marked: false,
      poisoned: false, venomStacks: 0, inFracture: false, inWell: false,
      laneOff: evt.laneOff,
      aggroTarget: null, _atkCd: 0,
      freezeTimer: 0,
      // DD combat stats (come through scaleEnemy's spread of ENEMY_TYPES)
      aggroRange:      enemy.aggroRange      || 150,
      attackRange:     enemy.attackRange     || 35,
      meleeDmgVsHero:  enemy.meleeDmgVsHero  || 8,
      attackRate:      enemy.attackRate      || 1.0,
    });
  }

  checkWaveComplete() {
    const s = this.state;
    if (s.phase !== 'combat') return;
    if (s.enemies.some(e => !e.dead)) {
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
    s.squad.forEach(heroId => this.awardXP(heroId, xp));

    const avgFortune = s.squad.reduce((acc, h) => acc + s.heroStats[h].Fortune, 0) / s.squad.length;
    const item = rollDrop(s.squad, s.diff.guar, avgFortune);
    if (item) {
      s.inventory.push(item);
      this.showToast(`DROP: ${item.name} (${item.rar})`, RARITY_COLORS[item.rar] || '#fff', 4000);
    }
    this.showToast(`WAVE ${s.wave} COMPLETE  +${gold}g  +${xp}xp`, '#4ade80', 3000);
    this.refreshHUD();

    if (s.wave >= MAX_WAVES) { this.endGame(true); }
    else { this.time.delayedCall(2000, () => this.startGrace()); }
  }

  // ─── XP & leveling ────────────────────────────────────────────────────────
  awardXP(heroId, amount) {
    const s = this.state;
    s.heroXP[heroId] += amount;
    while (s.heroXP[heroId] >= xpNeeded(s.heroLevels[heroId])) {
      s.heroXP[heroId] -= xpNeeded(s.heroLevels[heroId]);
      s.heroLevels[heroId]++;
      this.onLevelUp(heroId);
    }
  }

  onLevelUp(heroId) {
    const s = this.state;
    const lvl = s.heroLevels[heroId];
    s.statPoints[heroId] = (s.statPoints[heroId] || 0) + 2;
    const node = (ABILITY_NODES[heroId] || []).find(n => n.lvl === lvl);
    if (node) {
      s.abilityNodes[heroId].push(node);
      this.showToast(`${HEROES[heroId].name} NODE: ${node.name}`, HEROES[heroId].color, 4000);
    }
    this.showToast(`${HEROES[heroId].name} → LEVEL ${lvl}`, HEROES[heroId].color, 3000);
    const bar = this._xpBars[heroId];
    if (bar) {
      this.tweens.add({ targets:bar.barFill, alpha:{from:1,to:0.2}, yoyo:true, duration:150, repeat:4, onComplete:() => bar.barFill.setAlpha(1) });
    }
    this.refreshHUD();
    if (lvl === 15) this.refreshStructPanel();
  }

  // ─── game over ────────────────────────────────────────────────────────────
  endGame(victory) {
    const s = this.state;
    s.phase = victory ? 'win' : 'gameover';
    this.refreshHUD();
    const msg = victory ? 'VICTORY — THE BREACH IS SEALED' : 'THE NEXUS CORE HAS FALLEN';
    const col = victory ? '#4ade80' : '#f43f5e';
    this.add.rectangle(PLAY_W/2, (GAME_H-HUD_H)/2, 600, 200, 0x05050f, 0.97).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(col).color).setDepth(200);
    this.add.text(PLAY_W/2, (GAME_H-HUD_H)/2 - 30, msg, { fontFamily:'Orbitron,monospace', fontSize:'24px', color:col }).setOrigin(0.5).setDepth(201);
    this.add.text(PLAY_W/2, (GAME_H-HUD_H)/2 + 40, '[ MAIN MENU ]', { fontFamily:'Orbitron,monospace', fontSize:'18px', color:'#22d3ee' }).setOrigin(0.5).setInteractive({ useHandCursor:true }).setDepth(201).on('pointerdown', () => this.scene.start('MenuScene'));
  }

  // ─── update loop ──────────────────────────────────────────────────────────
  update(time, delta) {
    const s = this.state;
    if (s.phase === 'gameover' || s.phase === 'win') { this.redrawEnemies(); this.redrawTowers(); return; }

    // ── hero tick ──────────────────────────────────────────────────────────
    const keys = this._getHeroKeys();
    const heroResult = tickHero(s.hero, keys, this._ptr.x, this._ptr.y, delta, s.inputMode);
    this._abilityPressed = [false, false, false, false];

    // Apply hero attack results
    s.projectiles.push(...heroResult.projectiles);
    heroResult.swings.forEach(sw => this.applySwing(sw));
    heroResult.abilityEffects.forEach(ae => this.applyAbilityEffect(ae));

    // ── tower upgrade ticks ────────────────────────────────────────────────
    let upgradeChanged = false;
    s.towers.forEach(t => { if (t.upgBuilding && tickUpgrade(t, delta)) upgradeChanged = true; });
    if (upgradeChanged) this.refreshStructPanel();

    if (s.phase !== 'combat') {
      this.redrawEnemies(); this.redrawTowers();
      this.redrawHero(); this.redrawProjectiles(); this.redrawDrops(); this.redrawCompanions();
      this.refreshHeroHUD();
      return;
    }

    // ── combat tick (towers → enemies) ────────────────────────────────────
    const result = processTick({
      towers: s.towers, enemies: s.enemies,
      squad: s.squad, heroStats: s.heroStats,
      abilityNodes: s.abilityNodes, diff: s.diff, bonds: s.bonds,
      hero: s.hero,
    }, delta);

    // ── projectile tick ────────────────────────────────────────────────────
    const projResult = tickProjectiles(s.projectiles, s.enemies, delta);
    s.projectiles = projResult.remaining;
    projResult.dmgNums.forEach(d => this.spawnDmgNum(d.x, d.y, d.val, d.critical));

    // ── companion tick ─────────────────────────────────────────────────────
    this.tickCompanions(delta);

    // ── hero takes damage ──────────────────────────────────────────────────
    if (result.heroDmgTaken > 0 && !s.hero.dead && !s.hero.invincible) {
      s.hero.hp = Math.max(0, s.hero.hp - result.heroDmgTaken);
      if (s.hero.hp <= 0) { s.hero.dead = true; s.hero.respawnTimer = 8000; this.showToast('HERO DOWN — RESPAWNING IN 8s', '#f43f5e', 4000); }
    }

    // ── collect all newly dead enemies ────────────────────────────────────
    const newlyDead = s.enemies.filter(e => e.dead && !e.dropCounted);
    newlyDead.forEach(e => {
      e.dropCounted = true;
      if (!e.escaped) {
        s.gold += e.gold || 0;
        s.squad.forEach(hId => this.awardXP(hId, e.xp || 0));
        const drop = createGroundDrop(e);
        if (drop) s.drops.push(drop);
      }
    });
    if (newlyDead.some(e => !e.escaped)) this.refreshHUD();

    // ── damage numbers ─────────────────────────────────────────────────────
    result.dmgNums.forEach(d => this.spawnDmgNum(d.x, d.y, d.val, d.critical));

    // ── crystal damage ─────────────────────────────────────────────────────
    if (result.crystalHit > 0) {
      s.crystalHP = Math.max(0, s.crystalHP - result.crystalHit);
      this._redrawCrystal(); this.refreshHUD();
      if (s.crystalHP <= 0) { this.endGame(false); return; }
    }

    // ── drop tick ──────────────────────────────────────────────────────────
    const dropResult = tickDrops(s.drops, s.hero, delta);
    s.drops = dropResult.remaining;
    dropResult.picked.forEach(pick => {
      if (pick.type === 'gold')  { s.gold += pick.value; this.spawnDmgNum(s.hero.x, s.hero.y-20, pick.value, false, '#fb923c'); }
      if (pick.type === 'mana')  { s.hero.mana = Math.min(s.hero.maxMana, s.hero.mana + pick.value); }
      if (pick.type === 'item')  { s.inventory.push(pick.item); this.showToast(`Found: ${pick.item.name}`, RARITY_COLORS[pick.item.rar] || '#fff', 3000); }
    });
    if (dropResult.picked.some(p => p.type === 'gold')) this.refreshHUD();

    // ── prune dead enemies ─────────────────────────────────────────────────
    s.enemies = s.enemies.filter(e => !e.dead || !e.counted);

    // ── wave complete check ────────────────────────────────────────────────
    if (s._spawnsDispatched >= s._totalSpawns && s.enemies.every(e => e.dead)) this.checkWaveComplete();

    // ── render ────────────────────────────────────────────────────────────
    this.redrawEnemies();
    this.redrawTowers();
    this.redrawHero();
    this.redrawProjectiles();
    this.redrawDrops();
    this.redrawCompanions();
    this.refreshHeroHUD();
  }

  // ─── input helpers ────────────────────────────────────────────────────────
  _getHeroKeys() {
    const ptr = this.input.activePointer;
    const inPlayArea = ptr.x < PLAY_W - 10 && ptr.y < GAME_H - HUD_H - 5;
    return {
      up:     this._wasd.up.isDown    || this._arrows.up.isDown,
      down:   this._wasd.down.isDown  || this._arrows.down.isDown,
      left:   this._wasd.left.isDown  || this._arrows.left.isDown,
      right:  this._wasd.right.isDown || this._arrows.right.isDown,
      attack: ptr.leftButtonDown() && inPlayArea && !this._placing,
      q: this._abilityPressed[0], e: this._abilityPressed[1],
      r: this._abilityPressed[2], f: this._abilityPressed[3],
    };
  }

  // ─── combat helpers ───────────────────────────────────────────────────────
  applySwing(sw) {
    const s = this.state;
    s.enemies.forEach(e => {
      if (e.dead) return;
      const dx = e.x - sw.cx, dy = e.y - sw.cy;
      if (dx*dx + dy*dy <= sw.radius * sw.radius) {
        e.hp -= sw.dmg;
        this.spawnDmgNum(e.x, e.y-14, Math.round(sw.dmg), sw.dmg > 40);
        if (e.hp <= 0) { e.hp = 0; e.dead = true; if (!e.counted) e.counted = true; }
      }
    });
    // Visual flash
    const g = this.add.graphics();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(HEROES[s.squad[0]].color).color, 0.3);
    g.fillCircle(sw.cx, sw.cy, sw.radius);
    this.tweens.add({ targets:g, alpha:0, duration:80, onComplete:() => g.destroy() });
  }

  applyAbilityEffect(effect) {
    const s = this.state;
    const hero = s.hero;
    const living = s.enemies.filter(e => !e.dead);
    const ox = effect.heroX, oy = effect.heroY;
    const cx = effect.atCursor ? effect.cursorX : ox;
    const cy = effect.atCursor ? effect.cursorY : oy;

    switch (effect.type) {
      case 'aoe_dmg':
      case 'aoe_dmg_poison':
      case 'aoe_dmg_slow': {
        const r2 = (effect.radius || 120) ** 2;
        living.forEach(e => {
          const dx = e.x - cx, dy = e.y - cy;
          if (dx*dx + dy*dy <= r2) {
            e.hp -= effect.dmg || 50;
            this.spawnDmgNum(e.x, e.y-14, Math.round(effect.dmg || 50), (effect.dmg||50) > 60);
            if (effect.type === 'aoe_dmg_poison') { e.poisoned = true; e.venomStacks = Math.min((e.venomStacks||0)+3,8); }
            if (effect.type === 'aoe_dmg_slow')   { e.freezeTimer = 2500; }
            if (e.hp <= 0) { e.hp=0; e.dead=true; if(!e.counted) e.counted=true; }
          }
        });
        this._spawnAoeVfx(cx, cy, effect.radius || 120, 0xff6600);
        break;
      }
      case 'knockback_aoe': {
        hero.invincible = true; hero.invincibleTimer = Math.max(hero.invincibleTimer, 300);
        living.forEach(e => {
          const dx = e.x - ox, dy = e.y - oy;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist <= (effect.radius || 120)) {
            if (effect.dmg) {
              e.hp -= effect.dmg;
              this.spawnDmgNum(e.x, e.y-14, Math.round(effect.dmg), false);
              if (e.hp <= 0) { e.hp=0; e.dead=true; if(!e.counted) e.counted=true; }
            }
            if (dist > 0.1) { const f = 0.15 * (1 - dist/(effect.radius||120)); e.x += (dx/dist)*250*f; e.y += (dy/dist)*250*f; }
          }
        });
        this._spawnAoeVfx(ox, oy, effect.radius || 120, 0xffffff);
        break;
      }
      case 'pull_aoe': {
        living.forEach(e => {
          const dx = ox - e.x, dy = oy - e.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist <= (effect.radius||280) && dist > 0.1) {
            const f = 0.12 * (1 - dist/(effect.radius||280));
            e.x += (dx/dist) * (effect.pullForce||250) * f;
            e.y += (dy/dist) * (effect.pullForce||250) * f;
          }
        });
        this._spawnAoeVfx(ox, oy, effect.radius||280, 0x9900ff);
        break;
      }
      case 'slow_aoe': {
        living.forEach(e => {
          const dx = e.x - ox, dy = e.y - oy;
          if (dx*dx + dy*dy <= (effect.radius||400)**2) e.freezeTimer = effect.freezeDur || 2000;
        });
        this._spawnAoeVfx(ox, oy, effect.radius||400, 0x00ccff);
        break;
      }
      case 'mark_aoe': {
        living.forEach(e => {
          const dx = e.x - ox, dy = e.y - oy;
          if (dx*dx + dy*dy <= (effect.radius||220)**2) e.marked = true;
        });
        this._spawnAoeVfx(ox, oy, effect.radius||220, 0xff0055);
        break;
      }
      case 'aoe_poison': {
        living.forEach(e => {
          const dx = e.x - ox, dy = e.y - oy;
          if (dx*dx + dy*dy <= (effect.radius||280)**2) {
            e.hp -= effect.dmg || 50;
            this.spawnDmgNum(e.x, e.y-14, Math.round(effect.dmg||50), false);
            e.poisoned = true; e.venomStacks = Math.min((e.venomStacks||0)+4, 8);
            if (e.hp <= 0) { e.hp=0; e.dead=true; if(!e.counted) e.counted=true; }
          }
        });
        this._spawnAoeVfx(ox, oy, effect.radius||280, 0x00ff88);
        break;
      }
      case 'wormhole': {
        const r2 = (effect.radius||180)**2;
        const target = living.filter(e => { const dx=e.x-cx,dy=e.y-cy; return dx*dx+dy*dy<=r2; })
          .sort((a,b) => b.pathProgress - a.pathProgress)[0];
        if (target) {
          target.hp -= effect.dmg || 40;
          this.spawnDmgNum(target.x, target.y-14, Math.round(effect.dmg||40), true);
          if (target.hp <= 0) { target.hp=0; target.dead=true; if(!target.counted) target.counted=true; }
          else {
            target.pathProgress = Math.max(0, target.pathProgress - (effect.pushback||0.4));
            const wpIdx = Math.max(1, Math.floor(target.pathProgress * target.waypoints.length));
            target.waypointIndex = wpIdx;
            const wp = target.waypoints[Math.max(0, wpIdx-1)];
            if (wp) { target.x = wp.x; target.y = wp.y; }
          }
        }
        this._spawnAoeVfx(cx, cy, effect.radius||180, 0xaaff00);
        break;
      }
      case 'execute': {
        living.filter(e => { const dx=e.x-ox,dy=e.y-oy; return dx*dx+dy*dy<=(effect.radius||70)**2; })
          .forEach(e => {
            let dmg = effect.dmg || 80;
            if (e.marked && (e.hp/e.maxHp) <= (effect.execThresh||0.4)) dmg = e.hp + 1;
            else dmg *= e.marked ? 3 : 1;
            e.hp -= dmg;
            this.spawnDmgNum(e.x, e.y-14, Math.round(dmg), true);
            if (e.hp <= 0) { e.hp=0; e.dead=true; if(!e.counted) e.counted=true; }
          });
        break;
      }
      case 'chain_dmg': {
        const marked = living.filter(e => e.marked);
        let lastX = ox, lastY = oy;
        const hit = new Set();
        for (let i = 0; i < (effect.bounces||8); i++) {
          const next = marked.filter(e => !hit.has(e.uid))
            .sort((a,b) => (a.x-lastX)**2+(a.y-lastY)**2 - ((b.x-lastX)**2+(b.y-lastY)**2))[0];
          if (!next) break;
          hit.add(next.uid);
          next.hp -= effect.dmg || 80;
          this.spawnDmgNum(next.x, next.y-14, Math.round(effect.dmg||80), true);
          if (next.hp <= 0) { next.hp=0; next.dead=true; if(!next.counted) next.counted=true; }
          lastX = next.x; lastY = next.y;
        }
        break;
      }
      case 'summon_wolf': {
        s.companions.push({ type:'wolf', x:hero.x+(Math.random()-0.5)*40, y:hero.y+(Math.random()-0.5)*40, hp:80, maxHp:80, duration:effect.duration||8000, attackCooldown:0, uid:s.nextUid++ });
        this.showToast('🐺 Wolf summoned!', '#34d399', 2000);
        break;
      }
      case 'projectile_poison': {
        const fdx = effect.cursorX - hero.x, fdy = effect.cursorY - hero.y;
        const flen = Math.sqrt(fdx*fdx + fdy*fdy) || 1;
        s.projectiles.push({ uid:s.nextUid++, x:hero.x, y:hero.y, vx:(fdx/flen)*350, vy:(fdy/flen)*350, dmg:effect.dmg||40, maxRange:300, traveled:0, color:'#00ff88', radius:7, poison:true, venomStacks:effect.venomStacks||4 });
        break;
      }
    }
  }

  tickCompanions(delta) {
    const s = this.state;
    s.companions = s.companions.filter(c => c.duration > 0);
    s.companions.forEach(c => {
      c.duration -= delta;
      if (c.duration <= 0) return;
      const target = s.enemies.filter(e => !e.dead).sort((a,b) => dist2(a,c) - dist2(b,c))[0];
      if (!target) return;
      const dx = target.x - c.x, dy = target.y - c.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d > 32) { c.x += (dx/d)*200*(delta/1000); c.y += (dy/d)*200*(delta/1000); }
      else {
        c.attackCooldown -= delta;
        if (c.attackCooldown <= 0) {
          c.attackCooldown = 800;
          target.hp -= 30;
          this.spawnDmgNum(target.x, target.y-14, 30, false);
          if (target.hp <= 0) { target.hp=0; target.dead=true; if(!target.counted) target.counted=true; }
        }
      }
    });
  }

  // ─── render ───────────────────────────────────────────────────────────────
  redrawTowers() {
    const g = this._towerGfx; g.clear();
    this.state.towers.forEach(tower => {
      const hero   = HEROES[tower.heroId];
      const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;
      const radius = tower.type === 'A' ? 18 : tower.type === 'C' ? 14 : 16;

      if (tower.upgTier >= 3) { g.fillStyle(hexCol, 0.08*tower.upgTier); g.fillCircle(tower.x, tower.y, radius+10); }
      if (tower.upgBuilding) {
        const pct = tower.upgProgress / (UPGRADE_BUILD_TIMES[tower.upgTier]||1);
        g.lineStyle(3, 0xfb923c, 0.8);
        g.beginPath(); g.arc(tower.x, tower.y, radius+4, -Math.PI/2, -Math.PI/2 + pct*Math.PI*2); g.strokePath();
      }
      if (tower.type === 'A') { g.lineStyle(1, hexCol, 0.15); g.strokeCircle(tower.x, tower.y, tower.def.cost+20); }

      g.fillStyle(hexCol, 0.85);
      if (tower.type === 'A') {
        g.fillRect(tower.x-radius, tower.y-radius, radius*2, radius*2);
        g.lineStyle(2, hexCol); g.strokeRect(tower.x-radius, tower.y-radius, radius*2, radius*2);
      } else if (tower.type === 'C') {
        g.fillTriangle(tower.x, tower.y-radius, tower.x-radius, tower.y+radius, tower.x+radius, tower.y+radius);
      } else {
        g.fillCircle(tower.x, tower.y, radius);
        g.lineStyle(2, 0xffffff, 0.2); g.strokeCircle(tower.x, tower.y, radius);
      }
      for (let i = 0; i < tower.upgTier; i++) {
        const angle = (i/6)*Math.PI*2 - Math.PI/2;
        g.fillStyle(0xfb923c); g.fillCircle(tower.x + Math.cos(angle)*(radius+6), tower.y + Math.sin(angle)*(radius+6), 2.5);
      }
    });
    this._updateTowerLabels();
  }

  _updateTowerLabels() {
    if (!this._towerLabels) this._towerLabels = new Map();
    const used = new Set();
    this.state.towers.forEach(tower => {
      let lbl = this._towerLabels.get(tower.uid);
      if (!lbl) {
        lbl = this.add.text(tower.x, tower.y, HEROES[tower.heroId][tower.type].emoji || tower.type, { fontSize:'14px' }).setOrigin(0.5).setDepth(10);
        this._towerLabels.set(tower.uid, lbl);
      }
      lbl.setPosition(tower.x, tower.y).setVisible(true);
      used.add(tower.uid);
    });
    this._towerLabels.forEach((lbl, uid) => { if (!used.has(uid)) { lbl.destroy(); this._towerLabels.delete(uid); } });
  }

  redrawEnemies() {
    const g = this._enemyGfx; g.clear();
    this.state.enemies.forEach(enemy => {
      if (enemy.dead) return;
      const radius = enemy.boss ? 20 : enemy.elite ? 14 : 10;
      const col    = enemy.boss ? 0xff3300 : enemy.elite ? 0xffaa00 : 0xee4444;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(enemy.x, enemy.y+radius+2, radius*2, radius*0.6);
      g.fillStyle(col); g.fillCircle(enemy.x, enemy.y, radius);
      if (enemy.aggroTarget === 'hero') { g.lineStyle(2, 0xff8800, 0.7); g.strokeCircle(enemy.x, enemy.y, radius+6); }
      if (enemy.poisoned)               { g.lineStyle(2, 0x4ade80, 0.8); g.strokeCircle(enemy.x, enemy.y, radius+3); }
      if (enemy.slowed||enemy.inFracture||enemy.freezeTimer>0) { g.lineStyle(2, 0x60a5fa, 0.7); g.strokeCircle(enemy.x, enemy.y, radius+5); }
      if (enemy.marked)                 { g.lineStyle(2, 0xf43f5e, 0.9); g.strokeCircle(enemy.x, enemy.y, radius+2); }
      const hpPct = enemy.hp / enemy.maxHp;
      const bw = radius*2.4, bx = enemy.x - bw/2, by = enemy.y - radius - 7;
      g.fillStyle(0x1a1a2e); g.fillRect(bx, by, bw, 4);
      g.fillStyle(hpPct > 0.5 ? 0x4ade80 : hpPct > 0.25 ? 0xfb923c : 0xf43f5e);
      g.fillRect(bx, by, bw*hpPct, 4);
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
        lbl = this.add.text(enemy.x, enemy.y, etype?.emoji || '👾', { fontSize: enemy.boss ? '22px' : enemy.elite ? '16px' : '12px' }).setOrigin(0.5).setDepth(20);
        this._enemyLabels.set(enemy.uid, lbl);
      }
      lbl.setPosition(enemy.x, enemy.y).setVisible(true);
      used.add(enemy.uid);
    });
    this._enemyLabels.forEach((lbl, uid) => { if (!used.has(uid)) { lbl.destroy(); this._enemyLabels.delete(uid); } });
  }

  redrawHero() {
    const g = this._heroGfx; g.clear();
    const hero = this.state.hero;
    if (!hero) return;

    if (hero.dead) {
      g.fillStyle(0x444455, 0.4); g.fillCircle(hero.x, hero.y, 14);
      return;
    }

    const heroData = HEROES[hero.id];
    const hexCol   = Phaser.Display.Color.HexStringToColor(heroData.color).color;
    const radius   = 14;

    // Invincibility flash
    if (hero.invincible && Math.floor(this.time.now / 80) % 2 === 0) {
      g.fillStyle(0xffffff, 0.6); g.fillCircle(hero.x, hero.y, radius + 6);
    }

    // Speed boost aura
    if (hero.speedBoost > 1) { g.lineStyle(2, 0x00ffcc, 0.5); g.strokeCircle(hero.x, hero.y, radius+8); }

    // Buff damage aura
    if (hero.buffDmgMult > 1) { g.fillStyle(0xff6600, 0.12); g.fillCircle(hero.x, hero.y, radius+10); }

    // Shadow
    g.fillStyle(0x000000, 0.35); g.fillEllipse(hero.x, hero.y + radius + 2, radius*2.2, radius*0.5);

    // Body
    g.fillStyle(hexCol, 0.92); g.fillCircle(hero.x, hero.y, radius);
    g.lineStyle(2, 0xffffff, 0.25); g.strokeCircle(hero.x, hero.y, radius);

    // Facing direction arrow
    const fx = hero.x + Math.cos(hero.facing) * (radius + 6);
    const fy = hero.y + Math.sin(hero.facing) * (radius + 6);
    g.lineStyle(3, hexCol, 0.9);
    g.lineBetween(hero.x, hero.y, fx, fy);
    g.fillStyle(hexCol); g.fillCircle(fx, fy, 3);

    // HP bar above hero
    const hpPct = hero.hp / hero.maxHp;
    const bw = 30, bx = hero.x - bw/2, by = hero.y - radius - 8;
    g.fillStyle(0x1a1a2e); g.fillRect(bx, by, bw, 4);
    g.fillStyle(hpPct > 0.5 ? 0x4ade80 : hpPct > 0.25 ? 0xfb923c : 0xf43f5e);
    g.fillRect(bx, by, bw * hpPct, 4);

    this._updateHeroLabel();
  }

  _updateHeroLabel() {
    const hero = this.state.hero;
    if (!hero) return;
    if (!this._heroLabel) {
      const heroData = HEROES[hero.id];
      this._heroLabel = this.add.text(hero.x, hero.y, heroData.icon, { fontSize:'16px' }).setOrigin(0.5).setDepth(25);
    }
    this._heroLabel.setPosition(hero.x, hero.y).setVisible(!hero.dead);
  }

  redrawProjectiles() {
    const g = this._projGfx; g.clear();
    this.state.projectiles.forEach(p => {
      const col = Phaser.Display.Color.HexStringToColor(p.color || '#ffffff').color;
      g.fillStyle(col, 0.9); g.fillCircle(p.x, p.y, p.radius || 5);
      g.lineStyle(1, col, 0.4); g.strokeCircle(p.x, p.y, (p.radius||5) + 3);
    });
  }

  redrawDrops() {
    const g = this._dropGfx; g.clear();
    const pulse = 0.7 + 0.3 * Math.sin(this.time.now / 300);
    this.state.drops.forEach(d => {
      if (d.type === 'gold') { g.fillStyle(0xfbbf24, pulse); g.fillCircle(d.x, d.y, 6); }
      else if (d.type === 'mana') { g.fillStyle(0x60a5fa, pulse); g.fillCircle(d.x, d.y, 5); }
      else if (d.type === 'item') { g.fillStyle(0xa855f7, pulse); g.fillCircle(d.x, d.y, 8); g.lineStyle(1, 0xffffff, 0.5); g.strokeCircle(d.x, d.y, 8); }
    });
    this._updateDropLabels();
  }

  _updateDropLabels() {
    if (!this._dropLabels) this._dropLabels = new Map();
    const used = new Set();
    this.state.drops.forEach(d => {
      let lbl = this._dropLabels.get(d.uid);
      if (!lbl) {
        const emoji = d.type === 'gold' ? '🪙' : d.type === 'mana' ? '💧' : '✨';
        lbl = this.add.text(d.x, d.y - 10, emoji, { fontSize:'10px' }).setOrigin(0.5).setDepth(15);
        this._dropLabels.set(d.uid, lbl);
      }
      lbl.setPosition(d.x, d.y - 10).setVisible(true);
      used.add(d.uid);
    });
    this._dropLabels.forEach((lbl, uid) => { if (!used.has(uid)) { lbl.destroy(); this._dropLabels.delete(uid); } });
  }

  redrawCompanions() {
    if (!this._companionGfx) this._companionGfx = this.add.graphics().setDepth(18);
    const g = this._companionGfx; g.clear();
    this.state.companions.forEach(c => {
      if (c.duration <= 0) return;
      g.fillStyle(0xf97316, 0.8); g.fillCircle(c.x, c.y, 9);
      g.lineStyle(1, 0xffffff, 0.3); g.strokeCircle(c.x, c.y, 9);
      const hp = c.hp/c.maxHp;
      g.fillStyle(0x1a1a2e); g.fillRect(c.x-10, c.y-16, 20, 3);
      g.fillStyle(0x4ade80); g.fillRect(c.x-10, c.y-16, 20*hp, 3);
    });
  }

  _spawnAoeVfx(x, y, radius, color) {
    const g = this.add.graphics().setDepth(50);
    g.lineStyle(2, color, 0.8); g.strokeCircle(x, y, radius);
    g.fillStyle(color, 0.15);   g.fillCircle(x, y, radius);
    this.tweens.add({ targets:g, alpha:0, scaleX:1.15, scaleY:1.15, duration:350, ease:'Sine.easeOut', onComplete:() => g.destroy() });
  }

  spawnDmgNum(x, y, val, critical, color) {
    const col  = color || (critical ? '#f43f5e' : '#ffffff');
    const size = critical ? '18px' : '13px';
    const txt = this.add.text(x, y, `${val > 0 ? '-' : '+'}${Math.abs(val)}`, { fontFamily:'Orbitron,monospace', fontSize:size, color:col, stroke:'#000000', strokeThickness:2 }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets:txt, y:y-40, alpha:{from:1,to:0}, duration:900, ease:'Sine.easeOut', onComplete:() => txt.destroy() });
  }

  // ─── pause ────────────────────────────────────────────────────────────────
  openPause() {
    if (this.state.phase === 'gameover' || this.state.phase === 'win') return;
    this.scene.pause();
    this.scene.launch('PauseScene');
  }

  // ─── toasts ───────────────────────────────────────────────────────────────
  showToast(msg, col = '#ffffff', duration = 2500) {
    const txt = this.add.text(PLAY_W/2, (GAME_H-HUD_H)/2 - 60, msg, {
      fontFamily:'Orbitron,monospace', fontSize:'15px', color:col,
      stroke:'#000000', strokeThickness:3, backgroundColor:'#00000088', padding:{x:14,y:6},
    }).setOrigin(0.5).setDepth(100).setAlpha(0);
    this.tweens.add({ targets:txt, alpha:1, y:(GAME_H-HUD_H)/2 - 80, duration:300, ease:'Sine.easeOut',
      onComplete:() => { this.time.delayedCall(duration-600, () => { this.tweens.add({ targets:txt, alpha:0, duration:400, onComplete:() => txt.destroy() }); }); }
    });
  }
}

// ─── module helpers ──────────────────────────────────────────────────────────

function xpNeeded(lvl) { return Math.floor(XP_BASE * Math.pow(XP_GROWTH, lvl - 1)); }
function hudSty(color, size) { return { fontFamily:'Orbitron,monospace', fontSize:`${size}px`, color }; }
function dist2(a, b) { const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; }

function applyLaneOffset(waypoints, laneOff) {
  if (!laneOff) return waypoints;
  return waypoints.map((wp, i) => {
    if (i === 0 || i === waypoints.length-1) return wp;
    const prev = waypoints[i-1], next = waypoints[i+1];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    return { x: wp.x + (dy/len)*laneOff, y: wp.y - (dx/len)*laneOff };
  });
}
