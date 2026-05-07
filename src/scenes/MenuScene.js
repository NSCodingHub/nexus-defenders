export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background gradient via rectangles
    this.add.rectangle(W / 2, H / 2, W, H, 0x05050f);

    // Subtle grid lines
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a2e, 0.6);
    for (let x = 0; x < W; x += 60) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 60) grid.lineBetween(0, y, W, y);

    // Title
    this.add.text(W / 2, 140, 'NEXUS', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '86px',
      color: '#22d3ee',
      stroke: '#0a3a45',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(W / 2, 230, 'DEFENDERS', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '38px',
      color: '#ffffff',
      stroke: '#0a3a45',
      strokeThickness: 4,
      letterSpacing: 18,
    }).setOrigin(0.5);

    this.add.text(W / 2, 285, 'THE BREACH MUST NOT PASS', {
      fontFamily: 'Exo 2, monospace',
      fontSize: '14px',
      color: '#556677',
      letterSpacing: 4,
    }).setOrigin(0.5);

    const hasSave = !!localStorage.getItem('nexus_save');

    const buttons = [
      { label: 'DEPLOY',  scene: 'HeroSelectScene', col: 0x22d3ee },
      { label: 'TAVERN',  scene: 'TavernScene',      col: 0xa855f7 },
      { label: 'LORE',    scene: 'LoreScene',         col: 0x60a5fa },
    ];

    if (hasSave) {
      buttons.splice(1, 0, { label: 'CONTINUE', scene: null, col: 0x4ade80, load: true });
    }

    const startY = 370;
    buttons.forEach((btn, i) => {
      const y = startY + i * 68;
      this.makeButton(W / 2, y, btn.label, btn.col, () => {
        if (btn.load) {
          this.scene.start('GameScene', { load: true });
        } else {
          this.scene.start(btn.scene);
        }
      });
    });

    // Version
    this.add.text(W - 16, H - 16, 'v2.0', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#333344',
    }).setOrigin(1, 1);
  }

  makeButton(x, y, label, color, cb) {
    const W = 280;
    const H = 50;
    const bg = this.add.rectangle(x, y, W, H, color, 0.12)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, color, 0.7);

    const txt = this.add.text(x, y, label, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '18px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
    }).setOrigin(0.5);

    bg.on('pointerover',  () => { bg.setFillStyle(color, 0.28); txt.setScale(1.04); });
    bg.on('pointerout',   () => { bg.setFillStyle(color, 0.12); txt.setScale(1); });
    bg.on('pointerdown',  cb);

    return bg;
  }
}
