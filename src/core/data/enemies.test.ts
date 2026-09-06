import { describe, expect, it } from 'vitest'
import { ENEMIES, ENEMY_IDS, pickEnemyId } from './enemies'

describe('ENEMIES', () => {
  it('has a unique id per enemy', () => {
    const ids = ENEMIES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every enemy a positive HP, at least one action, and art', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.maxHp).toBeGreaterThan(0)
      expect(enemy.actions.length).toBeGreaterThan(0)
      expect(enemy.art.length).toBeGreaterThan(0)
    }
  })

  it('gives every enemy at least one battle cry (決定40)', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.battleCries.length).toBeGreaterThan(0)
      for (const line of enemy.battleCries) {
        expect(line.length).toBeGreaterThan(0)
      }
    }
  })

  // STEP3-A（8/31 敵7体ゲーム性監査 処理20＝A案）：EnemyDefへ追加した表示専用
  // メタデータ（typeLabel/typeDescription/visualType）が7体全てに揃っていることを
  // 保証する。HP・actions（数値・行動テーブル）はこのテストの対象外＝無変更のまま。
  it('gives every enemy a short type label and description (STEP3-A)', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.typeLabel.length).toBeGreaterThan(0)
      expect(enemy.typeDescription.length).toBeGreaterThan(0)
      // BattleHud/EnemyPanelの1行表示を圧迫しないよう、短い説明であることを保証する
      expect(enemy.typeDescription.length).toBeLessThanOrEqual(30)
    }
  })

  // LANE-D：Enemy Select＋Stage systemの表示専用メタデータが7体全てに揃っている
  // ことを保証する。HP・actions（数値・行動テーブル）は引き続き対象外＝無変更。
  it('gives every enemy a threat rank between 1 and 4 (★5 is reserved for future bosses) (LANE-D)', () => {
    for (const enemy of ENEMIES) {
      expect(Number.isInteger(enemy.rank)).toBe(true)
      expect(enemy.rank).toBeGreaterThanOrEqual(1)
      expect(enemy.rank).toBeLessThanOrEqual(4)
    }
  })

  it('assigns the CEO-approved threat ranks (影1/鬼将2/魔獣2/怨霊3/龍神3/機工師4/道化4) (LANE-D)', () => {
    const rankById = new Map(ENEMIES.map((e) => [e.id, e.rank]))
    expect(rankById.get(ENEMY_IDS.trial)).toBe(1)
    expect(rankById.get(ENEMY_IDS.oni)).toBe(2)
    expect(rankById.get(ENEMY_IDS.juuma)).toBe(2)
    expect(rankById.get(ENEMY_IDS.onryo)).toBe(3)
    expect(rankById.get(ENEMY_IDS.ryujin)).toBe(3)
    expect(rankById.get(ENEMY_IDS.karakuri)).toBe(4)
    expect(rankById.get(ENEMY_IDS.doukeshi)).toBe(4)
  })

  it('gives every enemy a stage with a name and a #rrggbb accent (LANE-D)', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.stage.nameJa.length).toBeGreaterThan(0)
      expect(enemy.stage.accent).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('gives every enemy its own stage background under /assets/backgrounds/stages/ (決定124)', () => {
    // 7ボス専用Stage Background。BattleScreenが`--stage-bg`として注入し、Enemy Selectも
    // `--enemy-stage-bg`として同じ値を使う（表示専用。ロジック・数値には不関与）。
    const bgs = ENEMIES.map((e) => e.stage.bg)
    for (const bg of bgs) {
      expect(bg).toBeDefined()
      expect(bg).toMatch(/^\/assets\/backgrounds\/stages\/[0-9]{2}-[a-z-]+\.webp$/)
    }
    expect(new Set(bgs).size).toBe(ENEMIES.length)
  })

  it('ships the referenced stage background asset for every enemy', () => {
    // `public/`配下の実ファイルをViteのglobで列挙し、stage.bgのパスが存在することを保証する
    // （node:fsはapp側tsconfigに型が無いため使わない）
    const shipped = Object.keys(import.meta.glob('../../../public/assets/backgrounds/stages/*.webp')).map((k) =>
      k.replace('../../../public', ''),
    )
    for (const enemy of ENEMIES) {
      expect(shipped, `missing asset for ${enemy.name}: ${enemy.stage.bg}`).toContain(enemy.stage.bg)
    }
  })
})

describe('pickEnemyId', () => {
  it('is deterministic for the same seed', () => {
    expect(pickEnemyId('seed-1234')).toBe(pickEnemyId('seed-1234'))
  })

  it('only returns ids that exist in ENEMIES', () => {
    const validIds = new Set(ENEMIES.map((e) => e.id))
    for (const seed of ['a', 'seed-1', 'seed-2', 'seed-999999', 'こんにちは']) {
      expect(validIds.has(pickEnemyId(seed))).toBe(true)
    }
  })
})

describe('enemy art assets (STEP-VISUAL-ASSETS)', () => {
  it('ships the art referenced by every enemy', () => {
    // 7体すべてWebP。datenshi/karakuri/doukeshiは決定99/100の刷新後の絵をそのまま
    // 使い続けており（art.pngは別デザインの旧絵なのでsourceにしない）、
    // oni/juuma/onryo/ryujinのみart.pngから再変換したart_hq.webpを参照する。
    const shipped = Object.keys(import.meta.glob('../../../public/assets/enemies/*/*.webp')).map((k) =>
      k.replace('../../../public', ''),
    )
    for (const enemy of ENEMIES) {
      expect(enemy.art).toMatch(/^\/assets\/enemies\/[a-z]+\/art(_hq)?\.webp$/)
      expect(shipped, `missing art for ${enemy.name}: ${enemy.art}`).toContain(enemy.art)
    }
  })
})
