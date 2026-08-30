import type { GameState } from '../../core/types'
import { getGodDef } from '../../core/data/gods'
import { getEnemyDef } from '../../core/data/enemies'
import { stakeLabel } from '../../core/data/stakes'
import { seedIdOf } from '../../core/data/dailyBoss'
import { formatScaled } from '../displayScale'

/**
 * 決定126（Seed共有）：結果画面からコピーする挑戦状テキスト。
 * 「同じ条件（Seed・神階・神・敵）で自分の方が上手いか」をサーバー無しで比べるための文字列。
 * 通常モードは `?seed=&stake=` で同条件を再現できるURLを添える（決定論エンジン）。
 * Daily は日付・Seed ID で十分に条件が特定でき、URLからは開始できない（Dailyの公平性を守る）ため
 * URLパラメータは付けない。真正性は担保しない（自己申告）。
 */
export const SHARE_BASE_URL = 'https://seven-gods-game.vercel.app/'

const STATUS_JA: Record<GameState['status'], string> = {
  playing: '進行中',
  won: '勝利',
  lost: '敗北',
  finished: '未撃破',
}

export function buildShareText(state: GameState, finalScore: number, baseUrl: string = SHARE_BASE_URL): string {
  const god = getGodDef(state.godId).nameJa
  const enemy = getEnemyDef(state.enemy.defId).name
  const result = `${formatScaled(finalScore)}pt（${STATUS_JA[state.status]}・R${state.round}）`
  if (state.mode === 'daily') {
    const dateKey = state.dailyKey ?? ''
    return `SEVEN GODS 神域挑戦 ${dateKey}｜${enemy}｜Seed ID ${seedIdOf(state.seed)}｜${god}｜${result} 超えられる？ ${baseUrl}`
  }
  const stake = state.stake ?? 0
  const parts = ['SEVEN GODS', stake > 0 ? stakeLabel(stake) : `難易度 ${DIFF_JA[state.difficulty]}`, enemy, god, `Seed ${state.seed}`, result]
  const url = `${baseUrl}?seed=${encodeURIComponent(state.seed)}${stake > 0 ? `&stake=${stake}` : ''}`
  return `${parts.join('｜')} 超えられる？ ${url}`
}

const DIFF_JA: Record<GameState['difficulty'], string> = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' }

/** クリップボードへコピー（失敗しても例外を投げない）。成功可否を返す */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 権限拒否・非セキュアコンテキスト等 → フォールバックへ
  }
  try {
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
