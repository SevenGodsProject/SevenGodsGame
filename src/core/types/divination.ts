import type { Effect } from './effect'

/**
 * 託宣の選択肢（決定21）。
 *
 * カード「神託」（`oracle`）とは別枠のリソース。
 * 1ゲームにつき`RULES.divination.count`回まで、AP消費なしでいつでも使える。
 * ランダム抽選ではなく、常に同じ3択から状況に応じて選ぶ形式にしている
 * （このゲームの「予告を見て読み、選ぶ」という設計思想に合わせるため）。
 */
export type DivinationChoice = {
  name: string
  text: string
  effects: Effect[]
}
