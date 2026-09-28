import { useLayoutEffect, useRef, useState } from 'react'
import type { GameEvent } from '../../core/types'
import { planReaction, type ReactionPlan } from './cardSemantic'

/**
 * 決定249 Reaction Language v1：直近の操作（1 バッチ）の反応を「誰が」まで決めて、
 * 各パネルが再マウントで CSS animation を再生するための key を配る。
 *
 * - `useBattleFx` とは独立（既存の突き・被弾・⚡・神の一撃の経路には触れない）
 * - `useLayoutEffect` で state を更新する：描画前に確定させ、引いた札が「一瞬素で見えてから動く」ことを防ぐ
 * - 表示専用。engine・入力ロック（280ms）・seed・score には関与しない
 */
export type ReactionLanguageFx = {
  /** 神：構える（GUARD） */
  braceKey: number
  /** 神：息を吹き返す（MEND） */
  breatheKey: number
  /** 神：高まる（ATTUNE／EMPOWER） */
  riseKey: number
  riseTone: 'resonance' | 'power' | null
  /** 敵：よろめく（WEAKEN） */
  staggerKey: number
  /** OTOMO：小さく応える（MEND・ATTUNE） */
  otomoKey: number
  /** 手札：このバッチで引いた札（立ち上がる）。key は配り直しの回数 */
  dealKey: number
  dealUids: ReadonlySet<string>
  /** 神力ゲージ：1 回明滅 */
  apFlashKey: number
  /** 直近の計画（テスト・計測用） */
  last: ReactionPlan | null
}

const INITIAL: ReactionLanguageFx = {
  braceKey: 0,
  breatheKey: 0,
  riseKey: 0,
  riseTone: null,
  staggerKey: 0,
  otomoKey: 0,
  dealKey: 0,
  dealUids: new Set(),
  apFlashKey: 0,
  last: null,
}

/** 純関数：前の fx と新しいバッチから次の fx を作る（hook の外でもテストできる） */
export function nextReactionFx(prev: ReactionLanguageFx, plan: ReactionPlan): ReactionLanguageFx {
  if (!plan.primitive) return { ...prev, last: plan }
  switch (plan.primitive) {
    case 'brace':
      return { ...prev, braceKey: prev.braceKey + 1, last: plan }
    case 'breathe':
      return { ...prev, breatheKey: prev.breatheKey + 1, otomoKey: plan.otomo ? prev.otomoKey + 1 : prev.otomoKey, last: plan }
    case 'rise':
      return { ...prev, riseKey: prev.riseKey + 1, riseTone: plan.tone, otomoKey: plan.otomo ? prev.otomoKey + 1 : prev.otomoKey, last: plan }
    case 'stagger':
      return { ...prev, staggerKey: prev.staggerKey + 1, last: plan }
    case 'deal':
      return {
        ...prev,
        dealKey: prev.dealKey + 1,
        dealUids: new Set(plan.dealUids),
        apFlashKey: plan.apFlash ? prev.apFlashKey + 1 : prev.apFlashKey,
        last: plan,
      }
  }
}

export function useReactionLanguage(log: GameEvent[], seed: string | null): ReactionLanguageFx {
  const [fx, setFx] = useState<ReactionLanguageFx>(INITIAL)
  const seen = useRef(0)
  const seedRef = useRef(seed)
  useLayoutEffect(() => {
    if (seed !== seedRef.current || log.length < seen.current) {
      // 新しい試合・再開：数え直し（古い試合の反応を新しい試合で再生しない）
      seedRef.current = seed
      seen.current = log.length
      setFx(INITIAL)
      return
    }
    const fresh = log.slice(seen.current)
    seen.current = log.length
    if (fresh.length === 0) return
    // 意味の無いバッチ（敵ターン等）でも `last` を更新する：直前の反応クラスを次の描画に持ち越さない
    const plan = planReaction(fresh)
    setFx((prev) => nextReactionFx(prev, plan))
  }, [log, seed])
  return fx
}
