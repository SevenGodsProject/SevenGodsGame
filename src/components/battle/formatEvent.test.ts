import { describe, expect, it } from 'vitest'
import { formatEvent } from './formatEvent'

/**
 * A3監査で発見した「buff/debuffのステータス名が内部キー（atk/def）のまま
 * 表示される」問題の修正確認。`PlayerPanel`/`EnemyPanel`のバッジ表示は
 * `STAT_LABEL`を直接インデックスするだけ（型で保証済み）のためテスト不要だが、
 * `formatEvent`は`GameEvent.stat`が素の`string`型でフォールバックを持つため、
 * ここだけ明示的にテストする。
 */
describe('formatEvent', () => {
  it('BUFF_APPLIEDでstat=atkを「攻撃力」という日本語表示にする', () => {
    const text = formatEvent({
      t: 'BUFF_APPLIED',
      target: 'self',
      stat: 'atk',
      amount: 2,
      rounds: 2,
    })
    // D2b：バフ量は表示×10、ラウンド数は倍率対象外
    expect(text).toBe('自分の攻撃力が+20（2ラウンド）')
    expect(text).not.toContain('atk')
  })

  it('BUFF_APPLIEDでstat=defを「防御力」という日本語表示にする', () => {
    const text = formatEvent({
      t: 'BUFF_APPLIED',
      target: 'enemy',
      stat: 'def',
      amount: -3,
      rounds: 1,
    })
    expect(text).toBe('敵の防御力が-30（1ラウンド）')
    expect(text).not.toContain('def')
  })

  it('未知のstat文字列が来た場合は元の文字列にフォールバックする（安全側）', () => {
    const text = formatEvent({
      t: 'BUFF_APPLIED',
      target: 'self',
      stat: 'unknown-stat',
      amount: 1,
      rounds: 1,
    })
    expect(text).toContain('unknown-stat')
  })

  it('SCORE_GAINEDでreason=oracleを「神託」という日本語表示にする（金額は表示×10）', () => {
    const text = formatEvent({ t: 'SCORE_GAINED', reason: 'oracle', amount: 200 })
    expect(text).toBe('スコア+2,000（神託）')
    expect(text).not.toContain('oracle')
  })

  it('未知のreason文字列が来た場合は元の文字列にフォールバックする（安全側）', () => {
    const text = formatEvent({ t: 'SCORE_GAINED', reason: 'unknown-reason', amount: 10 })
    expect(text).toContain('unknown-reason')
  })

  // D2b：表示スケールの適用範囲を明示的に固定する（damage系×10、AP・共鳴は×1）
  it('DAMAGE_DEALTのダメージ・軽減量は表示×10される', () => {
    const text = formatEvent({ t: 'DAMAGE_DEALT', target: 'enemy', amount: 12, blocked: 3 })
    expect(text).toBe('敵に120ダメージ（30軽減）')
  })

  it('ENEMY_INTENT_SETの攻撃予告値は表示×10される', () => {
    const text = formatEvent({ t: 'ENEMY_INTENT_SET', kind: 'attack', amount: 15 })
    expect(text).toBe('敵の次の行動：攻撃150')
  })

  it('HEALED/BLOCK_GAINEDは表示×10される', () => {
    expect(formatEvent({ t: 'HEALED', amount: 5 })).toBe('HP+50')
    expect(formatEvent({ t: 'BLOCK_GAINED', target: 'self', amount: 8 })).toBe('ブロック+80')
  })

  it('ROUND_ENDEDの神力余りは倍率対象外（APは×10しない）', () => {
    const text = formatEvent({ t: 'ROUND_ENDED', round: 2, unusedAp: 3 })
    expect(text).toBe('ラウンド2終了（神力3余り）')
  })

  it('RESONANCE_GAINEDの共鳴値は倍率対象外（「7」のモチーフ維持）', () => {
    const text = formatEvent({ t: 'RESONANCE_GAINED', amount: 2, total: 5 })
    expect(text).toBe('共鳴+2（5）')
  })

  it('GAME_ENDEDのスコアは表示×10される（カンマ区切り）', () => {
    const text = formatEvent({ t: 'GAME_ENDED', status: 'won', totalScore: 880 })
    expect(text).toBe('決着：勝利（スコア8,800）')
  })
})
