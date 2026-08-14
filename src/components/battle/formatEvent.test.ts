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
    expect(text).toBe('自分の攻撃力が+2（2ラウンド）')
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
    expect(text).toBe('敵の防御力が-3（1ラウンド）')
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
})
