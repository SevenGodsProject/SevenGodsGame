import { describe, expect, it } from 'vitest'
import { CORE_ENEMIES, ENEMIES, ENEMY_IDS, pickEnemyId } from './enemies'

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

  // v1.0.1 ★再付番（AI 判断・実測）：旧 golden「影1/鬼将2/魔獣2/怨霊3/龍神3/機工師4/道化4」（LANE-D 叩き台）は
  // 実測難易度と負相関（ρ −0.31）だったため、`docs/evidence/v1_0_1-rc/star-reeval.json`（enemy-audit matrix 14,112 局の再集計）
  // の規則（normal 全体指数の降順・同点は hard 指数・4/4/3/3/2/2/1）で付け直した。表示専用・HP・actions は無変更
  it('assigns the measured threat ranks (龍神4/怨霊4/魔獣3/鬼将3/影2/機工師2/道化1) (v1.0.1)', () => {
    // v1.0.2 統合：★再付番の golden は CORE 7 体の性質。Pilot 敵（enemy_09）は本体 enemy_02 の★を継承するだけ（coreRoster.test.ts）
    const rankById = new Map(CORE_ENEMIES.map((e) => [e.id, e.rank]))
    expect(rankById.get(ENEMY_IDS.ryujin)).toBe(4)
    expect(rankById.get(ENEMY_IDS.onryo)).toBe(4)
    expect(rankById.get(ENEMY_IDS.juuma)).toBe(3)
    expect(rankById.get(ENEMY_IDS.oni)).toBe(3)
    expect(rankById.get(ENEMY_IDS.trial)).toBe(2)
    expect(rankById.get(ENEMY_IDS.karakuri)).toBe(2)
    expect(rankById.get(ENEMY_IDS.doukeshi)).toBe(1)
  })

  it('threat ranks follow the measured normal difficulty index order with a 4/4/3/3/2/2/1 split (v1.0.1)', () => {
    // enemy-audit matrix.json `index.normal`（6 打ち筋平均・v1.0.0 engine・2026-10-10）。同点なし（再集計で確認）。
    // 値を変えるときは scripts/v1_0_1-rc/star-reeval.mjs を再実行し、この表と rank を同時に更新する
    const normalIndex: Record<string, number> = {
      enemy_01: 33.8,
      enemy_02: 33.9,
      enemy_03: 36.5,
      enemy_04: 31.4,
      enemy_05: 34.0,
      enemy_06: 37.7,
      enemy_07: 28.6,
    }
    const split = [4, 4, 3, 3, 2, 2, 1]
    const ordered = [...CORE_ENEMIES].sort((a, b) => normalIndex[b.id] - normalIndex[a.id])
    expect(ordered.map((e) => e.rank)).toEqual(split)
    // 指数が高い敵ほど ★ が高い（単調）。★5 は Boss 予約なので 1〜4 に収まる
    for (let i = 1; i < ordered.length; i++) expect(ordered[i].rank).toBeLessThanOrEqual(ordered[i - 1].rank)
    expect([1, 2, 3, 4, 5].map((s) => CORE_ENEMIES.filter((e) => e.rank === s).length)).toEqual([1, 2, 2, 2, 0])
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
    // Threat Branch Pilot v1：舞台の一意性は既存 7 体（CORE）の性質。Pilot 敵（enemy_09）は鬼将の舞台を共有する（新規素材 0）
    const bgs = ENEMIES.map((e) => e.stage.bg)
    for (const bg of bgs) {
      expect(bg).toBeDefined()
      expect(bg).toMatch(/^\/assets\/backgrounds\/stages\/[0-9]{2}-[a-z-]+\.webp$/)
    }
    expect(new Set(CORE_ENEMIES.map((e) => e.stage.bg)).size).toBe(CORE_ENEMIES.length)
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
