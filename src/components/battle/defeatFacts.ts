import type { GameEvent, GameState } from '../../core/types'
import { RULES } from '../../core/data/rules'
import { DIVINATION_CHOICES } from '../../core/data/divination'
import { formatScaled } from '../displayScale'
import { splitBatches } from './battleRecap'

/**
 * v1.0.3 RC（Lane 6 `FUN_BALANCE_AUDIT_V1.md` §7 #1「敗北画面の事実行」）：
 * 敗北の決定打を「加護（予告の guardRatio ぶんのブロック）で受けていれば残 HP はいくつだったか」を、
 * ログの事実だけから計算する表示専用の純関数。
 *
 * ★約束（決定263 Closeout の境界）：
 * - 正解・おすすめ行動は書かない。「加護を使え」ではなく「加護で受けていれば残 HP X」という事後の事実だけ
 * - 未来の情報を出さない（計算に使うのは決着済みのログと終了時の GameState だけ）
 * - 推測しない。計算できない（ログが途中から／加護をその R で既に使っていた／加護だけでは残 HP 0）ときは null＝出さない
 * - engine・状態には関与しない（`src/core` 0）。加護の量は engine と同じ式 `max(guardMin, floor(予告 × guardRatio))`
 *
 * 「敵の残り HP Y（あと一歩）」は既存の `GameOverOverlay`（`game-over-enemy-hp`・STEP-UX6-B）が出しているため、
 * ここでは重複させず「残 HP X」の 1 行だけを担う。
 */
export type DefeatGuardFact = {
  /** 決定打の種別語（必殺／連撃／攻撃。`defeatCause.ts` の既定語と同じ） */
  kindLabel: string
  /** 決定打の合計（実際に飛んできた量＝HP へ通った分＋盾が吸収した分。内部値） */
  actedAmount: number
  /** 予告（内部値） */
  intentAmount: number
  /** 加護が得たはずのブロック（内部値） */
  guard: number
  /** 加護で受けていれば残ったはずの HP（内部値・1 以上） */
  hpAfter: number
}

/** 加護（`blockOfIntent`）の選択肢 index と比率・最低保証（データから引く。無ければ null） */
function guardChoice(): { index: number; ratio: number; min: number } | null {
  for (let i = 0; i < DIVINATION_CHOICES.length; i++) {
    const guard = DIVINATION_CHOICES[i].effects.find((e) => e.kind === 'blockOfIntent')
    if (guard && guard.kind === 'blockOfIntent') return { index: i, ratio: guard.ratio, min: guard.min }
  }
  return null
}

export function deriveDefeatGuardFact(log: readonly GameEvent[], state: GameState): DefeatGuardFact | null {
  if (state.status !== 'lost') return null
  // ログが対局の最初から揃っていないと HP を復元できない（「続きから」再開）
  if (!log.some((e) => e.t === 'GAME_STARTED')) return null
  // 加護が神階のブロック効率を受ける設定なら engine の係数が要るので主張しない（現在は受けない＝true）
  if (!RULES.divination.guardIgnoresBlockEfficiency) return null
  const guardDef = guardChoice()
  if (!guardDef) return null

  const batches = splitBatches(log)
  const fatalIndex = batches.findIndex((b) => b.some((e) => e.t === 'GAME_ENDED' && e.status === 'lost'))
  if (fatalIndex < 0) return null
  const fatal = batches[fatalIndex]
  const acted = fatal.find((e): e is Extract<GameEvent, { t: 'ENEMY_ACTED' }> => e.t === 'ENEMY_ACTED')
  if (!acted || acted.kind === 'charge') return null

  // 予告：決着バッチより前の最後の ENEMY_INTENT_SET。HP：maxHp から被弾・回復を順に適用して復元
  let intent: number | null = null
  let hp = state.player.maxHp
  for (let i = 0; i < fatalIndex; i++) {
    for (const e of batches[i]) {
      if (e.t === 'ENEMY_INTENT_SET') intent = e.amount
      else if (e.t === 'DAMAGE_DEALT' && e.target === 'self') hp = Math.max(0, hp - e.amount)
      else if (e.t === 'HEALED') hp = Math.min(state.player.maxHp, hp + e.amount)
    }
  }
  if (intent === null || intent <= 0) return null
  const hpBefore = hp

  // 決着バッチ：決定打の実値（HP へ通った分）と盾が吸収した分。復元が終了時の HP と一致しなければ主張しない
  let dealt = 0
  let blocked = 0
  for (const e of fatal) {
    if (e.t === 'DAMAGE_DEALT' && e.target === 'self') {
      dealt += e.amount
      blocked += e.blocked
      hp = Math.max(0, hp - e.amount)
    } else if (e.t === 'HEALED') hp = Math.min(state.player.maxHp, hp + e.amount)
  }
  if (hp !== state.player.hp || dealt <= 0) return null

  // その R で既に加護を使っていたなら「使っていれば」は成り立たない
  let lastRoundStart = -1
  for (let i = log.length - 1; i >= 0; i--) if (log[i].t === 'ROUND_STARTED') { lastRoundStart = i; break }
  const usedGuard = log.slice(Math.max(0, lastRoundStart)).some((e) => e.t === 'DIVINATION_USED' && e.choiceIndex === guardDef.index)
  if (usedGuard) return null

  // 盾は通った分がある時点で使い切られている（残っていればそれも吸収していた）ので、盾の総量＝吸収量。
  // 加護を足した盾で同じ連撃を順に受けると、吸収の総量は min(盾, 合計) になる
  const guard = Math.max(guardDef.min, Math.floor(intent * guardDef.ratio))
  const actedAmount = dealt + blocked
  const dealtWithGuard = Math.max(0, actedAmount - (blocked + guard))
  const hpAfter = hpBefore - dealtWithGuard
  // 加護だけでは届かない（残 HP 0）なら出さない：「加護でも無理」と読まれ、次の 1 戦の行動を変えないため
  if (hpAfter <= 0) return null

  const kindLabel = acted.kind === 'multiAttack' ? '連撃' : acted.kind === 'special' ? '必殺' : '攻撃'
  return { kindLabel, actedAmount, intentAmount: intent, guard, hpAfter }
}

/** 文言（40 字以内・SP375 で 2 行以内）。例「必殺260を加護（予告の50%のブロック）で受けていれば残HP30」（31 字） */
export function describeDefeatGuardFact(fact: DefeatGuardFact | null): string | null {
  if (!fact) return null
  const pct = Math.round(RULES.divination.guardRatio * 100)
  return `${fact.kindLabel}${formatScaled(fact.actedAmount)}を加護（予告の${pct}%のブロック）で受けていれば残HP${formatScaled(fact.hpAfter)}`
}
