import type { GameState, GodId, OtomoForm } from '../core/types'

/**
 * 決定70（Task C1）：OTOMO育成（経験値・親密度）の永続記録。
 *
 * `recordStorage.ts`（決定48フォローアップ）と全く同じ方針を踏襲する。
 * - Phaser/Reactに依存しないcore層ではなくhooksに置く（不変ルール1）
 * - `RULES.saveVersion`とは独立した専用バージョンを持つ（決定不変ルール5）
 * - godId（＝OTOMOは神と1:1で専属。決定18）をキーに記録する
 *
 * 【表示専用・戦闘バランス非関与】
 * ここで記録する値はGodOtomoPanel等の「見せ方」にのみ使う想定で、
 * GameStateやカード効果・共鳴効果には一切参照されない。将来この値を
 * 戦闘に反映する場合は、不変ルール（core/にPhaser/React禁止）と
 * 同様に、必ず別途CEO承認のうえ設計する。
 *
 * 【加算タイミング・二重加算対策】
 * `recordGameResult`と全く同じ「決着（won/lost/finished）した瞬間の
 * `GameState`を1回だけ読む」方式を採用し、共鳴発動イベントを個別に
 * カウントするような累積カウンタ（useRef等）は持たせない。理由：
 *
 * 1. OTOMOの`form`は毎対局開始時に必ず'spirit'から始まる
 *    （reducer.test.ts「creates a valid round-1 state」で保証済み）。
 *    そのため「決着時点のform」は、その対局1回分の成長を過不足なく
 *    表す値になり、対局をまたいだ累積ズレが原理的に発生しない。
 * 2. `useGameEngine.ts`の`commit()`で決着ブランチ（`status !== 'playing'`）
 *    に入るのは、そのGameStateが'playing'から決着状態へ遷移した
 *    まさにその1回だけ（reducer.tsは決着後の追加アクションを例外で
 *    弾ぶため、reducer.test.ts「throws once the game is already over」
 *    で保証済み）。よって同じ対局結果を2回加算する経路が存在しない。
 * 3. `resumeGame`（セーブ再開）は`commit()`を経由せず`setState`のみを
 *    行うため、再開そのものでは加算が発生しない。再開したバトルが
 *    その後決着すれば、上記2と同じ理由で1回だけ加算される
 *    （＝再開前後で二重加算にはならない。ただし、ブラウザ再読み込みで
 *    失われた「再開前の共鳴発動回数」を復元することはできないため、
 *    途中で共鳴がdoji到達後にさらに発動していた場合は正確な回数より
 *    少なく記録される可能性がある＝過小評価はあっても過大評価は
 *    しない、という安全側の近似）。
 * 4. ブラウザ更新（リロード）だけでは`commit()`が一切呼ばれないため、
 *    再読み込みそのものが加算のトリガーになることはない。
 * 5. 再戦（`startGame`）はSTART_GAMEの結果が`status:'playing'`となり
 *    `commit()`のif分岐（`saveBattle`）に入るため、決着ブランチには
 *    入らない＝前回分の再加算は発生しない。
 */

const STORAGE_KEY = 'sevengods.otomoBond'
const BOND_VERSION = 1

export type OtomoBondRecord = {
  /** 決着（勝敗・7ラウンド終了いずれも含む）した対局数 */
  battlesPlayed: number
  /**
   * 共鳴成長ポイントの累計。各対局終了時点のOTOMO到達形態
   * （spirit=0 / incarnate=1 / doji=2）を加算する。
   * 厳密な「共鳴発動イベントの総回数」ではなく、形態が
   * dojiで頭打ちになるため3回目以降の発動は反映されない
   * （既知の近似。理由は上記コメント3を参照）。
   */
  resonanceCount: number
  /** 対局終了時点でdoji（最終形態）に到達した回数 */
  dojiReached: number
}

const EMPTY_RECORD: OtomoBondRecord = {
  battlesPlayed: 0,
  resonanceCount: 0,
  dojiReached: 0,
}

type BondData = {
  version: number
  /** godId -> OTOMO育成記録 */
  records: Record<string, OtomoBondRecord>
}

/** 対局終了時点のOTOMO到達形態から加算する成長ポイント（決定70） */
const FORM_POINTS: Record<OtomoForm, number> = {
  spirit: 0,
  incarnate: 1,
  doji: 2,
}

function isOtomoBondRecord(value: unknown): value is OtomoBondRecord {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.battlesPlayed === 'number' &&
    typeof v.resonanceCount === 'number' &&
    typeof v.dojiReached === 'number'
  )
}

function isBondData(value: unknown): value is BondData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.version !== 'number' || !v.records || typeof v.records !== 'object') return false
  return Object.values(v.records as Record<string, unknown>).every(isOtomoBondRecord)
}

function load(): BondData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: BOND_VERSION, records: {} }
    const parsed: unknown = JSON.parse(raw)
    if (!isBondData(parsed) || parsed.version !== BOND_VERSION) {
      return { version: BOND_VERSION, records: {} }
    }
    return parsed
  } catch {
    return { version: BOND_VERSION, records: {} }
  }
}

function save(data: BondData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 保存できなくてもゲーム自体には影響しないため無視する
  }
}

/** その神のOTOMO育成記録を読み込む（未記録なら全項目0の空レコード） */
export function loadOtomoBond(godId: GodId): OtomoBondRecord {
  return load().records[godId] ?? EMPTY_RECORD
}

/**
 * 決着（won/lost/finished）したGameStateをOTOMO育成記録に反映する。
 * 'playing'の状態を渡した場合は何もしない（recordGameResultと同じガード）。
 * 戦闘バランス・GameStateには一切書き戻さない、表示専用の永続化。
 */
export function recordOtomoBond(state: GameState): void {
  if (state.status === 'playing') return

  const data = load()
  const prev = data.records[state.godId] ?? EMPTY_RECORD

  const next: OtomoBondRecord = {
    battlesPlayed: prev.battlesPlayed + 1,
    resonanceCount: prev.resonanceCount + FORM_POINTS[state.otomo.form],
    dojiReached: prev.dojiReached + (state.otomo.form === 'doji' ? 1 : 0),
  }

  save({ ...data, records: { ...data.records, [state.godId]: next } })
}
