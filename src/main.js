import Phaser from 'phaser';
import BootScene      from './scenes/BootScene.js';
import LoreScene      from './scenes/LoreScene.js';
import MenuScene      from './scenes/MenuScene.js';
import HeroSelectScene from './scenes/HeroSelectScene.js';
import MapSelectScene  from './scenes/MapSelectScene.js';
import GameScene      from './scenes/GameScene.js';
import PauseScene     from './scenes/PauseScene.js';
import TavernScene    from './scenes/TavernScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#0a0a0f',
  scene: [
    BootScene,
    LoreScene,
    MenuScene,
    HeroSelectScene,
    MapSelectScene,
    GameScene,
    PauseScene,
    TavernScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
