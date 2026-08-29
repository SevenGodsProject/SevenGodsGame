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
  // v3→v4→…→現行へ連鎖させる（DAILY-01：v8の`mode`補完はmigrateBattleSaveV7が担う）
  return migrateBattleSaveV4({
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
    mastery: {
      roundDamage: 0,
      bestRoundDamage: 0,
      attackCount: 0,
      reductionRateSum: 0,
      strongNeutralized: false,
      guardAttackCount: 0,
      fullyBlockedCount: 0,
      minHp: state.player.hp,
      riskCardEffDamage: 0,
    },
  })
}

/**
 * saveVersion 4 → 5 への移行（STEP-SCORE2-G1b）。
 * v5でMasteryStateへ寿楽「無力化」用3フィールドが追加された。
 * 既存の大耀用集計（roundDamage/bestRoundDamage）は保持し、
 * 寿楽用フィールドはdefault-fillで補完する（旧saveを破棄しない）。
 * v6導入後は続けてmigrateBattleSaveV5で蒼毘フィールドも補完される。
 * ※Battle Score（score）はv4と同一構造のため無変更＝移行でスコアは変わらない。
 */
export function migrateBattleSaveV4(state: GameState): GameState {
  const old = state.mastery as Partial<GameState['mastery']> | undefined
  return migrateBattleSaveV5({
    ...state,
    mastery: {
      roundDamage: old?.roundDamage ?? 0,
      bestRoundDamage: old?.bestRoundDamage ?? 0,
      attackCount: 0,
      reductionRateSum: 0,
      strongNeutralized: false,
      guardAttackCount: 0,
      fullyBlockedCount: 0,
      minHp: state.player.hp,
      riskCardEffDamage: 0,
    },
  })
}

/**
 * saveVersion 5 → 6 への移行（STEP-SCORE2-G3）。
 * v6でMasteryStateへ蒼毘「鉄壁」用2フィールドが追加された。
 * 大耀・寿楽の既存集計はすべて保持し、蒼毘用フィールドのみdefault-fillする
 * （旧saveを破棄しない）。Battle Score（score）は無変更＝移行でスコアは変わらない。
 */
export function migrateBattleSaveV5(state: GameState): GameState {
  const old = state.mastery as Partial<GameState['mastery']> | undefined
  return migrateBattleSaveV6({
    ...state,
    mastery: {
      roundDamage: old?.roundDamage ?? 0,
      bestRoundDamage: old?.bestRoundDamage ?? 0,
      attackCount: old?.attackCount ?? 0,
      reductionRateSum: old?.reductionRateSum ?? 0,
      strongNeutralized: old?.strongNeutralized ?? false,
      guardAttackCount: 0,
      fullyBlockedCount: 0,
      minHp: state.player.hp,
      riskCardEffDamage: 0,
    },
  })
}

/**
 * 福永「大勝負」G4 prototype：MasteryStateの福永用2フィールド
 * （minHp/riskCardEffDamage）が欠けているセーブをdefault-fillで補完する。
 *
 * saveVersionは7のまま据え置いたため、「G4導入前に保存されたv7セーブ」には
 * この2フィールドが無い。version番号では区別できないので、フィールドの有無
 * そのものを見て補完する（migrateBattleSaveV6経由のv3〜v6セーブと、
 * 同一version=7のセーブの両方をここで吸収する）。
 * minHpは保存時点の現在HPで初期化する：過去ラウンドの最低HPは復元できないため
 * 「移行対局の立て直し幅は過去分を含まず過小になりうる」1戦限りの既知の制約
 * （v3移行時のMastery 0開始と同じ方針。プレイヤーに不利益な破壊はしない）。
 * 正式採用時にsaveVersionを8へbumpするかはレビューで判断する。
 */
export function fillFukueiMasteryFields(state: GameState): GameState {
  const old = state.mastery as Partial<GameState['mastery']> | undefined
  if (typeof old?.minHp === 'number' && typeof old?.riskCardEffDamage === 'number') {
    return state
  }
  return {
    ...state,
    mastery: {
      ...state.mastery,
      minHp: typeof old?.minHp === 'number' ? old.minHp : state.player.hp,
      riskCardEffDamage:
        typeof old?.riskCardEffDamage === 'number' ? old.riskCardEffDamage : 0,
    },
  }
}

/**
 * saveVersion 6 → 7 への移行（ENEMY-IDENTITY-PROTOTYPE-02）。
 * v7ではEnemyActionDefへmultiAttack/specialが追加されたが、state構造自体は
 * 不変のため、HP・deck・round・God・OTOMO・score・Masteryはすべて無変更で
 * 引き継がれる。唯一の対応は`enemy.intent`の正規化：
 * - v6以前の正当なintent（attack/charge）はそのまま保持する
 * - 未知のkindを持つintentはnullへ落とす。intentがnullでもrunEnemyTurnが
 *   `state.enemy.intent ?? nextEnemyAction(state)`で現在の敵テーブルから
 *   行動を再導出するため、進行不能にはならない
 * なお、敵テーブル自体が変わった敵（機工師・魔獣）の移行対局では、保存時に
 * 予告済みだった旧行動が「そのラウンドに限り」実行される（プレイヤーに
 * 予告した内容を守る側へ倒す。次ラウンド以降は新テーブルで進行する）。
 */
export function migrateBattleSaveV6(state: GameState): GameState {
  const intent = state.enemy?.intent ?? null
  const validKinds = ['attack', 'charge', 'multiAttack', 'special']
  const normalizedIntent =
    intent && typeof intent === 'object' && validKinds.includes((intent as { kind?: string }).kind ?? '')
      ? intent
      : null
  return migrateBattleSaveV7({
    ...state,
    enemy: { ...state.enemy, intent: normalizedIntent },
  })
}

/**
 * saveVersion 7 → 8 への移行（DAILY-01）。
 * v8ではGameStateへ`mode`（'normal' | 'daily'）・`dailyKey`・`modifier`が追加された。
 * v7以前のセーブは全て通常モードの対局なので`mode:'normal'`を補完するだけで、
 * HP・deck・round・God・OTOMO・score・Masteryはすべて無変更で引き継がれる
 * （`dailyKey`/`modifier`は通常モードでは持たないため付けない）。
 * 福永フィールドのfill（G4）もここで同時に吸収する。
 */
export function migrateBattleSaveV7(state: GameState): GameState {
  return fillFukueiMasteryFields({
    ...state,
    version: RULES.saveVersion,
    mode: state.mode ?? 'normal',
  })
}

/** 保存済みの進行中バトルがあれば返す。無い／壊れている／未知バージョンならnull */
export function loadBattleSave(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSavedBattle(parsed)) return null
    if (parsed.state.status !== 'playing') return null
    // 同一versionでも欠落フィールドはfillで補完する（揃っていれば無変更で返る）
    if (parsed.version === RULES.saveVersion) return migrateBattleSaveV7(parsed.state)
    // v3〜v7セーブは移行して読み込む（勝手に破棄しない）。それ以外の未知版はnull。
    if (parsed.version === 7) return migrateBattleSaveV7(parsed.state)
    if (parsed.version === 6) return migrateBattleSaveV6(parsed.state)
    if (parsed.version === 5) return migrateBattleSaveV5(parsed.state)
    if (parsed.version === 4) return migrateBattleSaveV4(parsed.state)
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
