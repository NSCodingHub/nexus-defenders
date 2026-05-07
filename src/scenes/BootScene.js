export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Generate simple programmatic textures — no external assets needed yet
    this.generateTextures();
  }

  generateTextures() {
    // 1x1 white pixel — used for tinting anything
    const px = this.make.graphics({ add: false });
    px.fillStyle(0xffffff);
    px.fillRect(0, 0, 4, 4);
    px.generateTexture('pixel', 4, 4);
    px.destroy();

    // Circle for towers/enemies
    const circ = this.make.graphics({ add: false });
    circ.fillStyle(0xffffff);
    circ.fillCircle(16, 16, 16);
    circ.generateTexture('circle32', 32, 32);
    circ.destroy();

    // Glow circle (soft alpha falloff)
    const glow = this.make.graphics({ add: false });
    for (let r = 40; r > 0; r -= 2) {
      const a = (r / 40) * 0.04;
      glow.fillStyle(0xffffff, a);
      glow.fillCircle(40, 40, r);
    }
    glow.generateTexture('glow80', 80, 80);
    glow.destroy();
  }

  create() {
    const firstRun = !localStorage.getItem('nexus_seen_lore');
    if (firstRun) {
      localStorage.setItem('nexus_seen_lore', '1');
      this.scene.start('LoreScene');
    } else {
      this.scene.start('MenuScene');
    }
  }
}
