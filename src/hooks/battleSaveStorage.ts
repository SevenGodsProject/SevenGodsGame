import type { GameState } from '../core/types'
import { RULES } from '../core/data/rules'

/**
 * 決定29：進行中のバトルのフルセーブ／再開。
 *
 * 決定27（神・デッキ構成のみの永続化）とは別に、GameStateそのもの
 * （手札・HP・ラウンド・共鳴ゲージ等）を丸ごと保存する。GameStateは
 * 関数・Map・Set・class instanceを含まない完全にプレーンなデータ
 * （core/types/state.ts）なので、JSON.stringify/parseでそのまま
 * 往復できる。カスタムシリアライザは不要。
 *
 * 決着（勝敗・時間切れ）がついたセーブを「続きから」で開くと
 * ゲームオーバー画面が即表示されるだけで意味が無いため、保存するのは
 * `status === 'playing'`のときだけ。呼び出し側（useGameEngine）は
 * 決着がついた瞬間に`clearBattleSave`でこのセーブを消す。
 *
 * localStorageはReact側の関心事なので、Phaser/Reactに依存しないcore層
 * ではなくここ（hooks）に置いている（不変ルール1）。
 */

const STORAGE_KEY = 'sevengods.battleSave'

type SavedBattle = {
  version: number
  state: GameState
}

function isSavedBattle(value: unknown): value is SavedBattle {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.version !== 'number' || !v.state || typeof v.state !== 'object') return false
  const s = v.state as Record<string, unknown>
  return (
    typeof s.round === 'number' &&
    typeof s.status === 'string' &&
    typeof s.godId === 'string' &&
    Array.isArray(s.deck) &&
    Array.isArray(s.hand)
  )
}

/** 進行中（status: 'playing'）のバトルを保存する。決着済みなら何もしない */
export function saveBattle(state: GameState): void {
  if (state.status !== 'playing') return
  try {
    const payload: SavedBattle = { version: RULES.saveVersion, state }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 保存できなくてもゲーム自体には影響しないため無視する
  }
}

/**
 * saveVersion 3（BASE-D導入前）のScoreState。
 * migrateBattleSaveV3のためだけに残している型スナップショット。
 */
type ScoreStateV3 = {
  damage?: number
  combo?: number
  apEfficiency?: number
  roundBonus?: number
  oracleBonus?: number
  total?: number
}

/**
 * saveVersion 3 → 4 への移行（STEP-SCORE2-D-PROTO）。
 *
 * 方針：旧セーブ（進行中バトル）は破棄せず読み込み継続できるようにする。
 * - damage / combo はそのまま引き継ぐ（旧式はoverkill込み・×1.0だったため、
 *   移行後の対局は「旧集計＋新集計」のハイブリッドになる。中断を跨いだ1戦
 *   限りの妥協として許容し、totalの連続性を優先する）。
 * - 旧式にしか無い項目（apEfficiency / oracleBonus / roundBonus）は`legacy`へ
 *   畳み込む。保存されるのは`status==='playing'`のみのためroundBonusは実質常に0。
 * - Mastery集計はv3に存在しないため0から開始する（移行対局のMastery評価は
 *   過去ラウンド分を含まず過小になりうる。1戦限りの既知の制約）。
 */
export function migrateBattleSaveV3(state: GameState): GameState {
  const old = state.score as unknown as ScoreStateV3
  const damage = old.damage ?? 0
  const combo = old.combo ?? 0
  const legacy = (old.apEfficiency ?? 0) + (old.roundBonus ?? 0) + (old.oracleBonus ?? 0)
  return {
    ...state,
    version: RULES.saveVersion,
    score: {
      damage,
      combo,
      victory: 0,
      tempo: 0,
      survival: 0,
      difficultyBonus: 0,
      legacy,
      total: damage + combo + legacy,
    },
    mastery: { roundDamage: 0, bestRoundDamage: 0 },
  }
}

/** 保存済みの進行中バトルがあれば返す。無い／壊れている／未知バージョンならnull */
export function loadBattleSave(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSavedBattle(parsed)) return null
    if (parsed.state.status !== 'playing') return null
    if (parsed.version === RULES.saveVersion) return parsed.state
    // v3セーブは移行して読み込む（勝手に破棄しない）。それ以外の未知版はnull。
    if (parsed.version === 3) return migrateBattleSaveV3(parsed.state)
    return null
  } catch {
    return null
  }
}

/** 保存済みのバトルを削除する（決着時、または「はじめから」選択時） */
export function clearBattleSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 削除できなくても致命的ではないため無視する
  }
}
