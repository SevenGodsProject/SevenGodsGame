import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig'

/** プレイヤーの移動速度（ピクセル / 秒） */
const PLAYER_SPEED = 320

/**
 * 最初に表示される場面（シーン）。
 *
 * Phaser のシーンは 3 つのメソッドが順番に呼ばれます。
 *   preload() … 画像や音声を読み込む（1回だけ）
 *   create()  … 画面にモノを配置する（1回だけ）
 *   update()  … 毎フレーム呼ばれる（1秒に約60回）
 */
export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private playerBody!: Phaser.Physics.Arcade.Body
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>

  constructor() {
    // 'MainScene' はこのシーンの名前。他のシーンへ移動するときに使います。
    super('MainScene')
  }

  preload(): void {
    // 画像や音声はここで読み込みます。
    // 例: this.load.image('hero', 'assets/hero.png')
    // 素材は public/assets/ に置いてください（今はまだ何も読み込みません）。
  }

  create(): void {
    // --- 背景の飾り（うっすら光る円）------------------------------
    this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 220, 0x3a4ea8, 0.12)
    this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 140, 0x3a4ea8, 0.12)

    // --- タイトル文字 ---------------------------------------------
    this.add
      .text(GAME_WIDTH / 2, 64, 'SEVEN GODS', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#ffd166',
      })
      .setOrigin(0.5) // 文字の中心を基準に配置する

    this.add
      .text(GAME_WIDTH / 2, 110, '矢印キー / WASD で動かせます', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#9aa3c7',
      })
      .setOrigin(0.5)

    // --- プレイヤー（動作確認用の四角）----------------------------
    this.player = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      48,
      48,
      0xffd166,
    )

    // 四角に「物理のからだ」を持たせる → 速度や衝突が使えるようになる
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true) // 画面の外に出さない

    // --- キーボード入力の準備 --------------------------------------
    // Phaser の型定義上 keyboard は null の可能性があるため ! を付けています
    const keyboard = this.input.keyboard!
    this.cursors = keyboard.createCursorKeys()
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd
  }

  update(): void {
    const left = this.cursors.left.isDown || this.wasd.A.isDown
    const right = this.cursors.right.isDown || this.wasd.D.isDown
    const up = this.cursors.up.isDown || this.wasd.W.isDown
    const down = this.cursors.down.isDown || this.wasd.S.isDown

    // いったん停止させてから、押されているキーの分だけ速度を足す
    this.playerBody.setVelocity(0, 0)

    if (left) this.playerBody.setVelocityX(-PLAYER_SPEED)
    else if (right) this.playerBody.setVelocityX(PLAYER_SPEED)

    if (up) this.playerBody.setVelocityY(-PLAYER_SPEED)
    else if (down) this.playerBody.setVelocityY(PLAYER_SPEED)

    // 斜め移動が速くなりすぎないように、速度の長さを揃える
    this.playerBody.velocity.normalize().scale(PLAYER_SPEED)
  }
}
