const SLIDES = [
  {
    title: 'YEAR 2387',
    body: 'An uncontrolled quantum experiment tears open a dimensional rift.\nScientists call it THE BREACH.',
    col: '#22d3ee',
  },
  {
    title: 'TIMELINES COLLIDE',
    body: 'Creatures from 40,000 BC, Void entities, and war machines from the future\npour through the same wound in reality.',
    col: '#a855f7',
  },
  {
    title: 'THE NEXUS CORE',
    body: 'A single crystal at the heart of the rift holds the timelines apart.\nIf it shatters — all of history unravels.',
    col: '#f43f5e',
  },
  {
    title: 'YOU ARE THE LAST LINE',
    body: 'Six heroes, ripped from their own timelines, now stand together.\nBuild. Defend. Survive.',
    col: '#fb923c',
  },
];

export default class LoreScene extends Phaser.Scene {
  constructor() { super('LoreScene'); }

  create() {
    this.index = 0;
    this.W = this.scale.width;
    this.H = this.scale.height;

    // Background
    this.bg = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x05050f);

    // Particle-like stars
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, this.W),
        Phaser.Math.Between(0, this.H),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.6)
      );
      this.stars.push(s);
    }

    this.titleTxt = this.add.text(this.W / 2, this.H / 2 - 100, '', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '42px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    this.bodyTxt = this.add.text(this.W / 2, this.H / 2 + 10, '', {
      fontFamily: 'Exo 2, monospace',
      fontSize: '20px',
      color: '#cccccc',
      align: 'center',
      lineSpacing: 12,
    }).setOrigin(0.5);

    this.hintTxt = this.add.text(this.W / 2, this.H - 60, 'CLICK TO CONTINUE', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#555566',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.hintTxt,
      alpha: { from: 0.2, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.showSlide(0);

    this.input.on('pointerdown', () => this.nextSlide());
    this.input.keyboard.on('keydown', () => this.nextSlide());
  }

  showSlide(i) {
    const slide = SLIDES[i];
    this.titleTxt.setText(slide.title).setColor(slide.col);
    this.bodyTxt.setText(slide.body);

    this.titleTxt.setAlpha(0);
    this.bodyTxt.setAlpha(0);

    this.tweens.add({ targets: this.titleTxt, alpha: 1, duration: 600, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.bodyTxt,  alpha: 1, duration: 800, delay: 200, ease: 'Sine.easeOut' });
  }

  nextSlide() {
    this.index++;
    if (this.index >= SLIDES.length) {
      this.scene.start('MenuScene');
    } else {
      this.showSlide(this.index);
    }
  }
}
