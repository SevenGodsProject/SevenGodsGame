import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'

/**
 * ゲーム画面の論理サイズ（ピクセル）。
 * 実際の表示サイズは Scale.FIT が画面幅に合わせて自動で拡大・縮小するので、
 * ここは「ゲーム内の座標系」の広さだと考えてください。
 */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

/** Phaser 全体の設定。ゲームの「初期設定画面」にあたる部分です。 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  // AUTO = WebGL が使えるなら WebGL、無理なら Canvas に自動で切り替える
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0d17',

  scale: {
    // FIT = 縦横比を保ったまま、親要素にちょうど収まるサイズへ調整
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    // arcade = いちばん軽量で扱いやすい物理エンジン（当たり判定・速度）
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // 見下ろし型なので重力なし
      debug: false, // true にすると当たり判定の枠が緑線で見えます
    },
  },

  // 使う場面（シーン）の一覧。先頭が最初に起動します。
  scene: [MainScene],
}
