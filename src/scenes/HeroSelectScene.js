import { HEROES } from '../data/heroes.js';
import { STAT_COLORS } from '../data/heroes.js';

const HERO_LIST = Object.values(HEROES);

export default class HeroSelectScene extends Phaser.Scene {
  constructor() { super('HeroSelectScene'); }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.squad = [];   // up to 2 heroes
    this.hovered = null;

    this.drawBg();
    this.drawTitle();
    this.drawHeroCards();
    this.drawDetailPanel();
    this.drawFooter();
  }

  drawBg() {
    this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x05050f);
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a1a2e, 0.5);
    for (let x = 0; x < this.W; x += 60) g.lineBetween(x, 0, x, this.H);
    for (let y = 0; y < this.H; y += 60) g.lineBetween(0, y, this.W, y);
  }

  drawTitle() {
    this.add.text(this.W / 2, 38, 'SELECT YOUR SQUAD', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '28px',
      color: '#22d3ee',
      stroke: '#0a3a45',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(this.W / 2, 70, 'CHOOSE 1–2 HEROES  •  BOTH TRIAD SYSTEMS ACTIVE SIMULTANEOUSLY', {
      fontFamily: 'Exo 2, monospace',
      fontSize: '12px',
      color: '#556677',
      letterSpacing: 2,
    }).setOrigin(0.5);
  }

  drawHeroCards() {
    const cols = 3;
    const rows = 2;
    const cardW = 170;
    const cardH = 160;
    const padX = 24;
    const padY = 18;
    const startX = 60;
    const startY = 100;

    HERO_LIST.forEach((hero, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + padX) + cardW / 2;
      const y = startY + row * (cardH + padY) + cardH / 2;

      const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;

      const bg = this.add.rectangle(x, y, cardW, cardH, hexCol, 0.10)
        .setStrokeStyle(1, hexCol, 0.5)
        .setInteractive({ useHandCursor: true });

      const iconTxt = this.add.text(x, y - 32, hero.icon, { fontSize: '36px' }).setOrigin(0.5);
      const nameTxt = this.add.text(x, y + 10, hero.name, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '15px',
        color: hero.color,
      }).setOrigin(0.5);
      const titleTxt = this.add.text(x, y + 32, hero.title, {
        fontFamily: 'Exo 2, monospace',
        fontSize: '11px',
        color: '#778899',
      }).setOrigin(0.5);

      const badge = this.add.text(x + cardW / 2 - 10, y - cardH / 2 + 10, '', {
        fontFamily: 'Orbitron, monospace',
        fontSize: '11px',
        color: '#4ade80',
      }).setOrigin(1, 0).setVisible(false);

      // Store refs for updating
      bg._heroId = hero.id;
      bg._badge = badge;
      bg._bg = bg;
      bg._hexCol = hexCol;

      this._cards = this._cards || [];
      this._cards.push({ bg, badge, hero, iconTxt, nameTxt, titleTxt });

      bg.on('pointerover', () => {
        this.hovered = hero;
        this.refreshDetail();
        if (!this.squad.includes(hero.id)) {
          bg.setFillStyle(hexCol, 0.22);
        }
      });
      bg.on('pointerout', () => {
        if (!this.squad.includes(hero.id)) {
          bg.setFillStyle(hexCol, 0.10);
        }
      });
      bg.on('pointerdown', () => this.toggleHero(hero.id));
    });
  }

  toggleHero(heroId) {
    if (this.squad.includes(heroId)) {
      this.squad = this.squad.filter(h => h !== heroId);
    } else {
      if (this.squad.length >= 2) {
        this.squad.shift();
      }
      this.squad.push(heroId);
    }
    this.refreshCards();
    this.refreshFooter();
  }

  refreshCards() {
    this._cards.forEach(({ bg, badge, hero }) => {
      const sel = this.squad.includes(hero.id);
      const hexCol = bg._hexCol;
      bg.setFillStyle(hexCol, sel ? 0.35 : 0.10);
      bg.setStrokeStyle(sel ? 2 : 1, hexCol, sel ? 1 : 0.5);
      const slotNum = this.squad.indexOf(hero.id);
      badge.setText(sel ? `P${slotNum + 1}` : '').setVisible(sel);
    });
  }

  drawDetailPanel() {
    const px = 640;
    const py = 90;
    const pw = 350;
    const ph = 530;

    this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, 0x0d0d1a, 0.95)
      .setStrokeStyle(1, 0x223344, 0.8);

    this.detailContainer = this.add.container(px + 20, py + 20);
    this.refreshDetail();
  }

  refreshDetail() {
    this.detailContainer.removeAll(true);
    const hero = this.hovered || (this.squad.length ? HEROES[this.squad[0]] : null);
    if (!hero) {
      this.detailContainer.add(this.add.text(155, 200, 'HOVER A HERO\nTO SEE DETAILS', {
        fontFamily: 'Exo 2, monospace',
        fontSize: '14px',
        color: '#334455',
        align: 'center',
      }).setOrigin(0.5));
      return;
    }

    const hexCol = Phaser.Display.Color.HexStringToColor(hero.color).color;
    let y = 0;

    this.detailContainer.add(this.add.text(0, y, hero.icon + '  ' + hero.name, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '22px',
      color: hero.color,
    }));
    y += 30;

    this.detailContainer.add(this.add.text(0, y, hero.title, {
      fontFamily: 'Exo 2, monospace',
      fontSize: '13px',
      color: '#778899',
    }));
    y += 22;

    this.detailContainer.add(this.add.text(0, y, hero.origin, {
      fontFamily: 'Exo 2, monospace',
      fontSize: '11px',
      color: '#445566',
    }));
    y += 26;

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, hexCol, 0.3);
    div.lineBetween(0, y, 310, y);
    this.detailContainer.add(div);
    y += 14;

    // Lore
    this.detailContainer.add(this.add.text(0, y, hero.lore, {
      fontFamily: 'Exo 2, monospace',
      fontSize: '12px',
      color: '#99aabb',
      wordWrap: { width: 310 },
      lineSpacing: 4,
    }));
    y += 60;

    // Stats
    this.detailContainer.add(this.add.text(0, y, 'BASE STATS', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: '#556677',
      letterSpacing: 2,
    }));
    y += 18;

    Object.entries(hero.stats).forEach(([stat, val]) => {
      const col = STAT_COLORS[stat] || '#ffffff';
      const barW = Math.round((val / 10) * 180);

      this.detailContainer.add(this.add.text(0, y, stat, {
        fontFamily: 'Exo 2, monospace',
        fontSize: '11px',
        color: '#778899',
        fixedWidth: 90,
      }));

      const barBg = this.add.graphics();
      barBg.fillStyle(0x1a1a2e);
      barBg.fillRect(95, y, 180, 10);
      const barFill = this.add.graphics();
      barFill.fillStyle(Phaser.Display.Color.HexStringToColor(col).color);
      barFill.fillRect(95, y, barW, 10);
      this.detailContainer.add(barBg);
      this.detailContainer.add(barFill);

      this.detailContainer.add(this.add.text(280, y, String(val), {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: col,
      }));
      y += 16;
    });
    y += 10;

    // Paths
    this.detailContainer.add(this.add.text(0, y, 'PATHS', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: '#556677',
      letterSpacing: 2,
    }));
    y += 18;

    hero.paths.forEach((path, pi) => {
      const col = hero.pc[pi];
      const pHex = Phaser.Display.Color.HexStringToColor(col).color;
      this.detailContainer.add(this.add.text(0, y, `▸ ${path}`, {
        fontFamily: 'Exo 2, monospace',
        fontSize: '12px',
        color: col,
      }));
      this.detailContainer.add(this.add.text(22, y + 14, hero.pathDesc[pi], {
        fontFamily: 'Exo 2, monospace',
        fontSize: '10px',
        color: '#556677',
        wordWrap: { width: 290 },
      }));
      y += 36;
    });
  }

  drawFooter() {
    const y = this.H - 60;

    // Back button
    const backBg = this.add.rectangle(80, y, 120, 44, 0x334455, 0.3)
      .setStrokeStyle(1, 0x334455)
      .setInteractive({ useHandCursor: true });
    this.add.text(80, y, '← BACK', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#667788',
    }).setOrigin(0.5);
    backBg.on('pointerdown', () => this.scene.start('MenuScene'));

    // Deploy button
    const deployBg = this.add.rectangle(this.W - 130, y, 200, 44, 0x22d3ee, 0.12)
      .setStrokeStyle(1, 0x22d3ee, 0.7)
      .setInteractive({ useHandCursor: true });
    this.deployTxt = this.add.text(this.W - 130, y, 'DEPLOY  →', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      color: '#22d3ee',
    }).setOrigin(0.5);

    deployBg.on('pointerover',  () => deployBg.setFillStyle(0x22d3ee, 0.28));
    deployBg.on('pointerout',   () => deployBg.setFillStyle(0x22d3ee, 0.12));
    deployBg.on('pointerdown',  () => {
      if (this.squad.length === 0) return;
      this.scene.start('MapSelectScene', { squad: this.squad });
    });

    this.footerSquadTxt = this.add.text(this.W / 2, y, '', {
      fontFamily: 'Exo 2, monospace',
      fontSize: '13px',
      color: '#4ade80',
    }).setOrigin(0.5);

    this.refreshFooter();
  }

  refreshFooter() {
    if (this.squad.length === 0) {
      this.footerSquadTxt.setText('Select at least 1 hero');
      this.footerSquadTxt.setColor('#556677');
    } else {
      const names = this.squad.map(id => HEROES[id].name).join(' + ');
      this.footerSquadTxt.setText('Squad: ' + names);
      this.footerSquadTxt.setColor('#4ade80');
    }
    this.refreshCards();
  }
}
