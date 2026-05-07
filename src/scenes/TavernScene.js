import { ITEMS, RARITIES, RARITY_COLORS } from '../data/items.js';
import { HEROES } from '../data/heroes.js';

export default class TavernScene extends Phaser.Scene {
  constructor() { super('TavernScene'); }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;

    // If launched from GameScene, get its state; otherwise standalone
    this.gameScene = this.scene.get('GameScene');
    this.gState = this.gameScene?.state || null;

    this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x080810, 0.98);

    this.add.text(this.W / 2, 36, '⚔ TAVERN', {
      fontFamily: 'Orbitron, monospace', fontSize: '28px', color: '#a855f7',
    }).setOrigin(0.5);

    this.drawTabs();
    this.activeTab = 'inventory';
    this.drawContent();
    this.drawFooter();
  }

  drawTabs() {
    const tabs = ['INVENTORY', 'EQUIP', 'SHOP'];
    this._tabBtns = {};
    tabs.forEach((tab, i) => {
      const x = 200 + i * 200;
      const key = tab.toLowerCase();
      const bg = this.add.rectangle(x, 74, 160, 36, 0xa855f7, 0.10)
        .setStrokeStyle(1, 0xa855f7, 0.4)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, 74, tab, {
        fontFamily: 'Orbitron, monospace', fontSize: '13px', color: '#a855f7',
      }).setOrigin(0.5);
      bg.on('pointerdown', () => { this.activeTab = key; this.drawContent(); });
      this._tabBtns[key] = { bg, txt };
    });
  }

  drawContent() {
    if (this._contentCont) this._contentCont.destroy();
    this._contentCont = this.add.container(0, 0);

    if (this.activeTab === 'inventory') this.drawInventory();
    else if (this.activeTab === 'equip') this.drawEquip();
    else if (this.activeTab === 'shop') this.drawShop();
  }

  drawInventory() {
    const items = this.gState?.inventory || [];

    if (items.length === 0) {
      this._contentCont.add(this.add.text(this.W / 2, this.H / 2, 'NO ITEMS YET\n\nComplete waves to earn drops.', {
        fontFamily: 'Exo 2, monospace', fontSize: '16px', color: '#334455', align: 'center',
      }).setOrigin(0.5));
      return;
    }

    items.forEach((item, i) => {
      const col = RARITY_COLORS[item.rar] || '#aaaaaa';
      const hexCol = Phaser.Display.Color.HexStringToColor(col).color;
      const x = 60 + (i % 4) * 295;
      const y = 120 + Math.floor(i / 4) * 100;

      const bg = this.add.rectangle(x + 130, y + 40, 260, 80, hexCol, 0.08)
        .setStrokeStyle(1, hexCol, 0.5);
      const nameTxt = this.add.text(x, y + 10, item.name, {
        fontFamily: 'Orbitron, monospace', fontSize: '12px', color: col,
      });
      const rarTxt = this.add.text(x, y + 26, item.rar + ' · ' + item.slot, {
        fontFamily: 'Exo 2, monospace', fontSize: '11px', color: '#556677',
      });
      const descTxt = this.add.text(x, y + 42, item.desc, {
        fontFamily: 'Exo 2, monospace', fontSize: '10px', color: '#778899',
        wordWrap: { width: 250 },
      });

      this._contentCont.add([bg, nameTxt, rarTxt, descTxt]);
    });
  }

  drawEquip() {
    if (!this.gState) {
      this._contentCont.add(this.add.text(this.W / 2, this.H / 2, 'No active game session.', {
        fontFamily: 'Exo 2, monospace', fontSize: '16px', color: '#334455',
      }).setOrigin(0.5));
      return;
    }

    const squad = this.gState.squad;
    squad.forEach((heroId, hi) => {
      const hero = HEROES[heroId];
      const x = 80 + hi * 560;
      const y = 110;

      this._contentCont.add(this.add.text(x, y, hero.icon + ' ' + hero.name, {
        fontFamily: 'Orbitron, monospace', fontSize: '16px', color: hero.color,
      }));

      ['Weapon', 'Armor', 'Relic', 'Sigil'].forEach((slot, si) => {
        const equipped = this.gState.equipped[heroId]?.[slot];
        const sy = y + 30 + si * 50;
        const col = equipped ? RARITY_COLORS[equipped.rar] : '#334455';
        const hexCol = Phaser.Display.Color.HexStringToColor(col || '#334455').color;

        this._contentCont.add(this.add.rectangle(x + 220, sy + 18, 420, 42, hexCol, 0.08)
          .setStrokeStyle(1, hexCol, 0.4));
        this._contentCont.add(this.add.text(x, sy, slot + ':', {
          fontFamily: 'Orbitron, monospace', fontSize: '11px', color: '#556677',
        }));
        this._contentCont.add(this.add.text(x + 80, sy, equipped ? equipped.name : '—', {
          fontFamily: 'Exo 2, monospace', fontSize: '13px', color: col,
        }));
      });
    });
  }

  drawShop() {
    // Basic shop: show all items for reference (buyable items would need gold system)
    this._contentCont.add(this.add.text(this.W / 2, this.H / 2, 'SHOP COMING SOON\n\nComplete more waves to unlock.', {
      fontFamily: 'Exo 2, monospace', fontSize: '16px', color: '#334455', align: 'center',
    }).setOrigin(0.5));
  }

  drawFooter() {
    const bg = this.add.rectangle(this.W / 2, this.H - 36, 200, 50, 0x334455, 0.3)
      .setStrokeStyle(1, 0x334455)
      .setInteractive({ useHandCursor: true });
    this.add.text(this.W / 2, this.H - 36, '← BACK', {
      fontFamily: 'Orbitron, monospace', fontSize: '16px', color: '#667788',
    }).setOrigin(0.5);
    bg.on('pointerdown', () => {
      if (this.scene.isActive('GameScene')) {
        this.scene.stop();
      } else {
        this.scene.start('MenuScene');
      }
    });
  }
}
