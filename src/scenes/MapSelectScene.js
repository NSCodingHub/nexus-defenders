import { HEROES } from '../data/heroes.js';
import { DIFFICULTIES } from '../data/difficulties.js';

export default class MapSelectScene extends Phaser.Scene {
  constructor() { super('MapSelectScene'); }

  init(data) {
    this.squad = data.squad || ['AXIOM'];
  }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.selectedDiff = 'normal';

    this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x05050f);
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a1a2e, 0.5);
    for (let x = 0; x < this.W; x += 60) g.lineBetween(x, 0, x, this.H);
    for (let y = 0; y < this.H; y += 60) g.lineBetween(0, y, this.W, y);

    this.add.text(this.W / 2, 44, 'DEPLOYMENT BRIEFING', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '28px',
      color: '#22d3ee',
    }).setOrigin(0.5);

    this.drawSquadPreview();
    this.drawDifficultySelector();
    this.drawDiffDetails();
    this.drawFooter();
  }

  drawSquadPreview() {
    this.add.text(160, 100, 'SQUAD', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '12px',
      color: '#556677',
      letterSpacing: 3,
    }).setOrigin(0.5);

    this.squad.forEach((heroId, i) => {
      const hero = HEROES[heroId];
      const x = 80 + i * 160;
      const y = 180;
      const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;

      this.add.rectangle(x, y, 140, 100, hexCol, 0.12).setStrokeStyle(1, hexCol, 0.5);
      this.add.text(x, y - 20, hero.icon, { fontSize: '28px' }).setOrigin(0.5);
      this.add.text(x, y + 16, hero.name, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '14px',
        color: hero.color,
      }).setOrigin(0.5);
      this.add.text(x, y + 34, hero.title, {
        fontFamily: 'Exo 2, monospace',
        fontSize: '10px',
        color: '#667788',
      }).setOrigin(0.5);
    });
  }

  drawDifficultySelector() {
    this.add.text(this.W / 2, 100, 'DIFFICULTY', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '12px',
      color: '#556677',
      letterSpacing: 3,
    }).setOrigin(0.5);

    const diffs = Object.entries(DIFFICULTIES);
    const totalW = diffs.length * 160 - 20;
    const startX = this.W / 2 - totalW / 2 + 60;

    this._diffBtns = {};

    diffs.forEach(([key, d], i) => {
      const x = startX + i * 160;
      const y = 180;
      const hexCol = Phaser.Display.Color.HexStringToColor(d.col).color;

      const bg = this.add.rectangle(x, y, 140, 100, hexCol, 0.10)
        .setStrokeStyle(1, hexCol, 0.4)
        .setInteractive({ useHandCursor: true });

      const lbl = this.add.text(x, y - 16, d.label.toUpperCase(), {
        fontFamily: 'Orbitron, monospace',
        fontSize: '13px',
        color: d.col,
      }).setOrigin(0.5);

      const sub = this.add.text(x, y + 8, `Guar: ${d.guar}`, {
        fontFamily: 'Exo 2, monospace',
        fontSize: '11px',
        color: '#556677',
      }).setOrigin(0.5);

      const sub2 = this.add.text(x, y + 26, `Mana: ${d.mana}`, {
        fontFamily: 'Exo 2, monospace',
        fontSize: '11px',
        color: '#445566',
      }).setOrigin(0.5);

      this._diffBtns[key] = { bg, lbl, hexCol, d };

      bg.on('pointerdown', () => {
        this.selectedDiff = key;
        this.refreshDiffButtons();
        this.refreshDiffDetails();
      });
    });

    this.refreshDiffButtons();
  }

  refreshDiffButtons() {
    Object.entries(this._diffBtns).forEach(([key, { bg, hexCol }]) => {
      const sel = key === this.selectedDiff;
      bg.setFillStyle(hexCol, sel ? 0.35 : 0.10);
      bg.setStrokeStyle(sel ? 2 : 1, hexCol, sel ? 1 : 0.4);
    });
    this.refreshDiffDetails();
  }

  drawDiffDetails() {
    this._detailY = 310;
    this._detailContainer = this.add.container(this.W / 2 - 280, this._detailY);
    this.refreshDiffDetails();
  }

  refreshDiffDetails() {
    if (!this._detailContainer) return;
    this._detailContainer.removeAll(true);
    const d = DIFFICULTIES[this.selectedDiff];
    const col = d.col;

    const lines = [
      ['Enemy HP',       `×${d.hm}`],
      ['Enemy Speed',    `×${d.sm}`],
      ['Enemy Count',    `×${d.cm}`],
      ['Starting Mana',  d.mana],
      ['Wave Timer',     `${d.mw}s`],
      ['Grace Period',   `${d.gw}s`],
      ['Guaranteed Drop', d.guar],
      ['Boss Rate',      `${Math.round(d.br * 100)}%`],
      ['Mana Multiplier', `×${d.mm}`],
    ];

    const cols = 3;
    const colW = 190;
    lines.forEach(([label, val], i) => {
      const cx = (i % cols) * colW;
      const cy = Math.floor(i / cols) * 36;

      this._detailContainer.add(this.add.text(cx, cy, label, {
        fontFamily: 'Exo 2, monospace',
        fontSize: '12px',
        color: '#556677',
      }));
      this._detailContainer.add(this.add.text(cx + 110, cy, String(val), {
        fontFamily: 'Orbitron, monospace',
        fontSize: '13px',
        color: col,
      }));
    });
  }

  drawFooter() {
    const y = this.H - 60;

    const backBg = this.add.rectangle(80, y, 120, 44, 0x334455, 0.3)
      .setStrokeStyle(1, 0x334455)
      .setInteractive({ useHandCursor: true });
    this.add.text(80, y, '← BACK', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#667788',
    }).setOrigin(0.5);
    backBg.on('pointerdown', () => this.scene.start('HeroSelectScene'));

    const deployBg = this.add.rectangle(this.W - 130, y, 200, 44, 0xf43f5e, 0.15)
      .setStrokeStyle(1, 0xf43f5e, 0.8)
      .setInteractive({ useHandCursor: true });
    this.add.text(this.W - 130, y, 'LAUNCH  ⚡', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      color: '#f43f5e',
    }).setOrigin(0.5);
    deployBg.on('pointerover',  () => deployBg.setFillStyle(0xf43f5e, 0.30));
    deployBg.on('pointerout',   () => deployBg.setFillStyle(0xf43f5e, 0.15));
    deployBg.on('pointerdown',  () => {
      this.scene.start('GameScene', {
        squad: this.squad,
        diff: this.selectedDiff,
        load: false,
      });
    });
  }
}
