export default class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Dim overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65)
      .setInteractive();  // block clicks from reaching GameScene

    this.add.rectangle(W / 2, H / 2, 400, 380, 0x0a0a18, 0.98)
      .setStrokeStyle(2, 0x22d3ee, 0.6);

    this.add.text(W / 2, H / 2 - 150, 'PAUSED', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '32px',
      color: '#22d3ee',
    }).setOrigin(0.5);

    const items = [
      { label: 'RESUME',     col: 0x22d3ee, fn: () => this.resume() },
      { label: 'SAVE',       col: 0x4ade80, fn: () => this.doSave() },
      { label: 'TAVERN',     col: 0xa855f7, fn: () => this.openTavern() },
      { label: 'MAIN MENU',  col: 0xf43f5e, fn: () => this.quitToMenu() },
    ];

    items.forEach((item, i) => {
      const y = H / 2 - 70 + i * 66;
      const bg = this.add.rectangle(W / 2, y, 280, 50, item.col, 0.12)
        .setStrokeStyle(1, item.col, 0.6)
        .setInteractive({ useHandCursor: true });
      this.add.text(W / 2, y, item.label, {
        fontFamily: 'Orbitron, monospace', fontSize: '18px',
        color: Phaser.Display.Color.IntegerToColor(item.col).rgba,
      }).setOrigin(0.5);
      bg.on('pointerover',  () => bg.setFillStyle(item.col, 0.28));
      bg.on('pointerout',   () => bg.setFillStyle(item.col, 0.12));
      bg.on('pointerdown',  item.fn);
    });

    this.input.keyboard.on('keydown-ESC', () => this.resume());
  }

  resume() {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  doSave() {
    this.scene.get('GameScene').saveState();
    this.showFeedback('SAVED');
  }

  openTavern() {
    this.scene.resume('GameScene');
    this.scene.stop();
    this.scene.launch('TavernScene');
  }

  quitToMenu() {
    this.scene.stop('GameScene');
    this.scene.stop();
    this.scene.start('MenuScene');
  }

  showFeedback(msg) {
    const txt = this.add.text(this.scale.width / 2, this.scale.height / 2 + 200, msg, {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#4ade80',
    }).setOrigin(0.5);
    this.time.delayedCall(1500, () => txt.destroy());
  }
}
