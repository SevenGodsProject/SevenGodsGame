import { describe, expect, it } from 'vitest'
import { RULES } from '../data/rules'
import { runReplay } from './replay'
import type { ReplayInput } from './types'
import { dataFingerprint, getGameVersion, rankingImpactSnapshot, stableStringify } from './gameVersion'

/**
 * Phase 4.6（決定139 §5-2）：`gameVersion` の golden test。
 *
 * ★このテストが守っている唯一のこと
 * 「**固定リプレイの結果が変わったのに `gameVersion` が変わっていない**」状態を作らせない。
 *
 * ランキングは同じ `dailyKey` の中で版を混在させない設計（day-lock）だが、それは
 * 版が正しく変わることが前提になっている。データの変更は `dataFingerprint()` が
 * 自動で拾うので取りこぼさない。取りこぼすのは **reducer・スコア計算・RNGの挙動変更**で、
 * これはデータに現れないため `RULES.ranking.engineVersion` を人が上げるしかない。
 *
 * ★更新の手順（このテストが落ちたとき）
 *   1. 固定リプレイの結果が変わった＝ゲームの挙動が変わった、ということ
 *   2. データを変えた覚えが無いなら **`RULES.ranking.engineVersion` を +1 する**
 *   3. そのうえで下の `GOLDEN` を新しい値へ更新する（version と outcome は必ずセットで）
 */

/**
 * 固定リプレイ。ハーネスに依存しないよう、生成済みの操作列をそのまま埋め込む
 * （`playRecordedDailyRun` の実装が変わっても、この入力は変わらない）。
 *
 * ★Phase 5-A（決定154）で入力ごと作り直した。
 * カードの効きが変わると、前の操作列は**そもそも再生できなくなる**ことがある
 * （敵が早く倒れて、そのあとの END_ROUND が拒否される）。そうなると結果を比べる
 * 以前の問題なので、入力と期待値をセットで差し替えるしかない。
 * 再生成は `scripts/phase5a-cards/cardsAudit.test.ts`（`P5A_GOLDEN=1`）で行う。
 */
// ブランド型（CardDefId/GodId/CardUid）を素の文字列で書けるようにまとめてcastする。
// 中身の正しさは `runReplay` が本番と同じ検査で保証するので、型の緩さは検証を弱めない。
const GOLDEN_INPUT = {
  version: 1,
  mode: 'daily',
  dailyKey: '2026-09-09',
  godId: 'ebisu',
  deck: [
    'card_ebisu_attack_01',
    'card_ebisu_attack_01',
    'card_ebisu_attack_02',
    'card_ebisu_attack_02',
    'card_ebisu_support_02',
    'card_ebisu_support_02',
    'card_ebisu_support_01',
    'card_ebisu_support_01',
    'card_common_attack_01',
    'card_common_attack_02',
    'card_common_attack_03',
    'card_common_attack_04',
    'card_common_guard_01',
    'card_common_guard_02',
    'card_common_hinder_02',
    'card_common_resonance_01',
    'card_common_resonance_02',
    'card_common_oracle_01',
    'card_common_oracle_02',
    'card_common_oracle_03'
  ],
  otomoGrowthPath: 'guardian',
  actions: [
    { type: 'USE_DIVINATION', choiceIndex: 0 },
    { type: 'PLAY_CARD', uid: 'c19' },
    { type: 'END_ROUND' },
    { type: 'PLAY_CARD', uid: 'c9' },
    { type: 'PLAY_CARD', uid: 'c10' },
    { type: 'PLAY_CARD', uid: 'c8' },
    { type: 'END_ROUND' },
    { type: 'USE_DIVINATION', choiceIndex: 1 },
    { type: 'PLAY_CARD', uid: 'c5' },
    { type: 'PLAY_CARD', uid: 'c7' },
    { type: 'PLAY_CARD', uid: 'c6' },
    { type: 'END_ROUND' },
    { type: 'PLAY_CARD', uid: 'c1' },
    { type: 'PLAY_CARD', uid: 'c12' },
    { type: 'PLAY_CARD', uid: 'c18' },
    { type: 'END_ROUND' },
    { type: 'USE_DIVINATION', choiceIndex: 1 },
    { type: 'PLAY_CARD', uid: 'c16' },
    { type: 'PLAY_CARD', uid: 'c11' },
    { type: 'PLAY_CARD', uid: 'c13' },
    { type: 'END_ROUND' },
    { type: 'PLAY_CARD', uid: 'c15' },
    { type: 'PLAY_CARD', uid: 'c14' },
    { type: 'PLAY_CARD', uid: 'c14' },
    { type: 'END_ROUND' },
    { type: 'PLAY_CARD', uid: 'c4' },
    { type: 'PLAY_CARD', uid: 'c17' },
    { type: 'PLAY_CARD', uid: 'c0' },
    { type: 'END_ROUND' }
  ]
} as unknown as ReplayInput

/** 版と結果は**必ずセットで**更新する（片方だけ直すと検出の意味が無くなる） */
const GOLDEN = {
  // Phase 5-B（決定155）：`RULES.stakes` の3値を変えたので版だけ変わる（Dailyは神階0なので結果は同じ）
  // Phase 5-D：加護を予告連動ブロックへ変更（`RULES.divination` に guardRatio/guardMin が増えた）。
  // この操作列は R1 冒頭で加護を1回使うが、決着（R7敗北・score 345）は同じなので版だけ変わる
  gameVersion: '1.da1ec40838d7ff9a',
  outcome: {
    enemyId: 'enemy_06',
    seedId: 'B6PW1T',
    godId: 'ebisu',
    status: 'lost',
    win: false,
    round: 7,
    score: 345,
    playerHp: 0,
    enemyHp: 8,
    rngCursor: 33,
    actionCount: 29,
  },
}

function currentOutcome() {
  const result = runReplay(GOLDEN_INPUT)
  if (!result.ok) throw new Error(`golden replay が再生できません: ${result.code} ${result.message}`)
  const o = result.outcome
  return {
    enemyId: o.enemyId,
    seedId: o.seedId,
    godId: o.godId,
    status: o.status,
    win: o.win,
    round: o.round,
    score: o.score,
    playerHp: o.playerHp,
    enemyHp: o.enemyHp,
    rngCursor: o.rngCursor,
    actionCount: o.actionCount,
  }
}

describe('gameVersion の形', () => {
  it('`<engineVersion>.<dataFingerprint>` の形をしている', () => {
    expect(getGameVersion()).toMatch(/^\d+\.[0-9a-f]{16}$/)
    expect(getGameVersion()).toBe(`${RULES.ranking.engineVersion}.${dataFingerprint()}`)
  })

  it('同じデータからは何度呼んでも同じ版が出る（決定論）', () => {
    expect(getGameVersion()).toBe(getGameVersion())
    expect(dataFingerprint()).toBe(dataFingerprint())
  })

  it('ランキングの運用つまみ（kill switch・cache秒数など）は版に影響しない', () => {
    // `RULES.ranking` を除いていることの確認。含まれていれば下の文字列が現れる
    const snapshot = rankingImpactSnapshot()
    expect(snapshot).not.toContain('submissionEnabled')
    expect(snapshot).not.toContain('leaderboardCacheSeconds')
    expect(snapshot).not.toContain('pendingRuns')
    // 対局に影響するものは含まれている
    expect(snapshot).toContain('totalRounds')
    expect(snapshot).toContain('card_common_attack_01')
    expect(snapshot).toContain('enemy_06')
  })

  it('キーの並び順を変えただけでは版が変わらない（安定化されている）', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
    expect(stableStringify({ a: [1, { y: 1, x: 2 }] })).toBe(stableStringify({ a: [1, { x: 2, y: 1 }] }))
    // undefined のキーは「無い」と同じに扱う（JSON.stringifyと同じ挙動へ揃える）
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }))
  })

  it('データが1つでも変われば fingerprint が変わる', () => {
    const base = rankingImpactSnapshot()
    // 実データは変更せず、同じ正規化関数へ「1文字違い」を通して感度だけを確かめる
    expect(base).not.toBe(base.replace('"totalRounds":7', '"totalRounds":8'))
  })
})

describe('golden replay（engineVersion の上げ忘れ検出）', () => {
  it('固定リプレイが再生でき、決着している', () => {
    const result = runReplay(GOLDEN_INPUT)
    expect(result.ok).toBe(true)
  })

  it('★結果が変わったなら gameVersion も必ず変わっている', () => {
    const outcome = currentOutcome()
    const outcomeChanged = JSON.stringify(outcome) !== JSON.stringify(GOLDEN.outcome)
    const versionChanged = getGameVersion() !== GOLDEN.gameVersion

    if (outcomeChanged) {
      expect(
        versionChanged,
        [
          '固定リプレイの結果が変わったのに gameVersion が変わっていません。',
          'エンジンの挙動を変えた場合は `RULES.ranking.engineVersion` を +1 してください。',
          `期待していた結果: ${JSON.stringify(GOLDEN.outcome)}`,
          `現在の結果:       ${JSON.stringify(outcome)}`,
        ].join('\n'),
      ).toBe(true)
    }
  })

  it('★gameVersion が変わっていないなら、結果も1つも変わっていない', () => {
    if (getGameVersion() !== GOLDEN.gameVersion) return
    expect(
      currentOutcome(),
      'gameVersion を据え置いたまま対局結果が変わりました（決定論が壊れています）',
    ).toEqual(GOLDEN.outcome)
  })
})
