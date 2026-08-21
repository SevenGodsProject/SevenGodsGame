import type { OtomoBondRecord } from '../../hooks/otomoBondStorage'
import { OTOMO_FORM_ORDER, type OtomoForm } from '../../core/types'

/**
 * 決定71（Task C2）：OTOMO育成画面の表示専用ロジック（親密度Lv・進捗バー・絆テキスト）。
 *
 * `otomoBondStorage.ts`（決定70）が保存する生データ（battlesPlayed/
 * resonanceCount/dojiReached）を、画面表示用の形に変換するだけの純粋関数。
 * GameState・戦闘バランスには一切関与しない。
 *
 * 【表示名についてのCEO指示（決定70フォローアップ）】
 * `resonanceCount`は「決着時点のOTOMO到達形態（spirit=0/incarnate=1/
 * doji=2）」から導出した近似値であり、共鳴発動の実回数とは一致しない。
 * そのためUI上では「累計共鳴回数」ではなく「共鳴成長ポイント」と表示する
 * （このモジュールが返す値のラベル付けもこの名称に統一する）。
 */

/**
 * 1レベルに必要な共鳴成長ポイント。数値自体に深い意味はなく、
 * 決定58/59で確認済みの「1戦あたりの共鳴発動は平均0〜2回程度」という
 * 実測ペースを踏まえ、「数戦プレイすれば育っている実感が出る」ことを
 * 優先した表示用の仮値（`RULES`には置かない。戦闘バランスに一切関与
 * しない純粋な演出値のため、不変ルール4「調整値はrules.tsに集約」の
 * 対象外と判断した＝rules.tsは戦闘数値の集約先であり、この値は
 * 戦闘外の見せ方専用の定数のため）。
 */
const POINTS_PER_LEVEL = 3

export type OtomoGrowthDisplay = {
  /** 親密度Lv（1から始まる） */
  level: number
  /** 現在のLv内で獲得済みのポイント */
  pointsInLevel: number
  /** 1Lvに必要なポイント */
  pointsPerLevel: number
  /** 次のLvまでの進捗（0〜1、進捗バーの幅に使う） */
  progressRatio: number
  /** 簡単な絆テキスト（＝絆称号。文言は`BOND_TIER_TITLE`と同一） */
  bondText: string
  /**
   * OTOMO育成インセンティブ改善（8/31版）：絆称号の段階（0〜3）。
   * `computeBondText`の条件分岐をそのまま段階化した値で、新しい判定基準は
   * 一切追加していない（既存仕様と完全に一致させるため、判定ロジック自体は
   * `computeBondTier`に一本化し、`computeBondText`はそこから文言を引くだけにした）。
   * カード枠の発光段階（STEP4）・絆ランク★表示にもこの値をそのまま使う。
   */
  bondTier: 0 | 1 | 2 | 3
  /**
   * 次の絆称号解放までの説明テキスト。最上位段階（tier3）に到達済みの場合は
   * これ以上解放される絆称号が存在しないため`null`（＝存在しない報酬を
   * 表示しないためのガード）。
   */
  nextUnlockText: string | null
  /**
   * Phase1.5（3形態ギャラリー）：`bondTier`から導出する、絆画面で閲覧可能な
   * 形態一覧。新しい閾値は増やさず、既存`bondTier`の判定結果をそのまま
   * `OTOMO_FORM_ORDER`（core/types/otomo.ts）のスライスに対応させただけ。
   * メイン肖像（doji固定表示）は変更しない前提のため、これは「記録として
   * 閲覧できる形態」を示す値であり、メイン肖像の切り替えには使わない。
   */
  unlockedForms: readonly OtomoForm[]
}

/** 絆称号（tier→文言）。`computeBondText`の分岐と1:1で対応する。 */
const BOND_TIER_TITLE: Record<0 | 1 | 2 | 3, string> = {
  0: 'まだ出会ったばかり',
  1: '共に歩み始めた相棒',
  2: '息の合った相棒',
  3: '固い絆で結ばれた相棒',
}

/**
 * 絆称号の段階判定。`computeBondText`が元々持っていた条件分岐（決定71）を
 * そのまま段階番号に置き換えただけで、新しい閾値は増やしていない。
 * tier3のみ「level>=5」と「dojiReached>0」の2条件が必要な非対称構造で、
 * `nextUnlockText`はこの非対称さ（童子到達が必須という条件）を隠さず
 * そのまま説明文に反映する。
 */
function computeBondTier(record: OtomoBondRecord, level: number): 0 | 1 | 2 | 3 {
  if (record.battlesPlayed === 0) return 0
  if (record.dojiReached > 0 && level >= 5) return 3
  if (level >= 3) return 2
  return 1
}

/**
 * 絆称号の段階からギャラリー閲覧可能な形態を導出する（Phase1.5 TASK1）。
 * 新しい閾値は増やさず、既存`bondTier`の境界（tier1到達・tier3到達）を
 * そのまま再利用する：tier0=精霊態のみ／tier1・2=+受肉態／tier3=+童子。
 * tier1→2の境界には形態解放を割り当てない（`computeNextUnlockText`と
 * 対応関係を一致させるため）。
 */
function computeUnlockedForms(tier: 0 | 1 | 2 | 3): readonly OtomoForm[] {
  if (tier >= 3) return OTOMO_FORM_ORDER
  if (tier >= 1) return OTOMO_FORM_ORDER.slice(0, 2)
  return OTOMO_FORM_ORDER.slice(0, 1)
}

function computeNextUnlockText(
  record: OtomoBondRecord,
  level: number,
  tier: 0 | 1 | 2 | 3,
  pointsInLevel: number,
): string | null {
  if (tier === 0) {
    // Phase1.5：tier0→1の境界でunlockedFormsが精霊態のみ→+受肉態に変わるタイミングと
    // 一致するため「受肉態の記録」を併記する。メイン肖像（doji固定）は変わらないため、
    // 「姿が見える」ではなく「記録を閲覧できる」という表現にしている（CEO指示）。
    return `絆称号「${BOND_TIER_TITLE[1]}」＋受肉態の記録（初めての対局を終えると解放）`
  }
  if (tier === 1) {
    // 目標Lv3に到達するまでの必要pt。resonanceCount = (level-1)*POINTS_PER_LEVEL + pointsInLevel
    // なので、目標時点のresonanceCount（(3-1)*POINTS_PER_LEVEL）との差分で求める。
    // tier1→2の境界はunlockedFormsに変化がないため、形態記録の文言は追加しない
    // （存在しない報酬を表示しないため）。
    const needed = (3 - level) * POINTS_PER_LEVEL - pointsInLevel
    return `絆称号「${BOND_TIER_TITLE[2]}」（あと${needed}pt）`
  }
  if (tier === 2) {
    // Phase1.5：tier2→3の境界でunlockedFormsが+童子に変わるタイミングと一致するため
    // 「童子の記録」を併記する。
    const needsLevel = level < 5
    const needsDoji = record.dojiReached === 0
    const pointsNeeded = needsLevel ? (5 - level) * POINTS_PER_LEVEL - pointsInLevel : 0
    const conditions: string[] = []
    if (needsLevel) conditions.push(`あと${pointsNeeded}pt`)
    if (needsDoji) conditions.push('童子形態での対局終了が1回以上必要')
    return `絆称号「${BOND_TIER_TITLE[3]}」＋童子の記録（${conditions.join('・')}）`
  }
  // tier3：これ以上解放される絆称号・形態記録が存在しないため、存在しない報酬を示さずnullを返す
  return null
}

export function computeOtomoGrowthDisplay(record: OtomoBondRecord): OtomoGrowthDisplay {
  const level = 1 + Math.floor(record.resonanceCount / POINTS_PER_LEVEL)
  const pointsInLevel = record.resonanceCount % POINTS_PER_LEVEL
  const bondTier = computeBondTier(record, level)
  return {
    level,
    pointsInLevel,
    pointsPerLevel: POINTS_PER_LEVEL,
    progressRatio: pointsInLevel / POINTS_PER_LEVEL,
    bondText: BOND_TIER_TITLE[bondTier],
    bondTier,
    nextUnlockText: computeNextUnlockText(record, level, bondTier, pointsInLevel),
    unlockedForms: computeUnlockedForms(bondTier),
  }
}

export type SevenBondSummary = {
  /** bondTier>=1（＝一度でも対局を終えた）OTOMOの数 */
  achievedCount: number
  /** OTOMOの総数（常に7だが、GODSの実データから導出し固定値にしない） */
  total: number
}

/**
 * 「七柱との絆」全体進捗の集計（Phase1.5 TASK3）。
 * 1体達成条件はbondTier>=1（＝computeOtomoGrowthDisplayの判定をそのまま
 * 再利用、新しい閾値は増やしていない）。新規保存データは使わず、
 * 呼び出し側が渡す既存otomoBondレコードの配列から毎回導出する。
 */
export function computeSevenBondSummary(records: readonly OtomoBondRecord[]): SevenBondSummary {
  const achievedCount = records.filter((record) => computeOtomoGrowthDisplay(record).bondTier >= 1).length
  return { achievedCount, total: records.length }
}

export type OtomoLevelUp = {
  prevLevel: number
  nextLevel: number
}

/**
 * 決定74（Task C3）：対局前後の育成記録からLvを比較し、実際に上がった
 * 場合だけ`OtomoLevelUp`を返す（上がっていなければnull）。
 *
 * 1戦で獲得できる`resonanceCount`は最大2（doji到達時）、1Lvに必要なのは
 * `POINTS_PER_LEVEL`=3のため、1戦で2Lv以上一気に上がることは現在の
 * 数値上は起こらない（2 < 3のため、跨げる境界は最大1つ）。ただし将来
 * `POINTS_PER_LEVEL`や1戦あたりの獲得量が変わっても壊れないよう、
 * `nextLevel - prevLevel`が2以上になるケースも問題なく扱える形にしてある
 * （呼び出し側は`prevLevel`→`nextLevel`をそのまま表示すればよい）。
 */
export function detectOtomoLevelUp(
  prevRecord: OtomoBondRecord,
  nextRecord: OtomoBondRecord,
): OtomoLevelUp | null {
  const prevLevel = computeOtomoGrowthDisplay(prevRecord).level
  const nextLevel = computeOtomoGrowthDisplay(nextRecord).level
  return nextLevel > prevLevel ? { prevLevel, nextLevel } : null
}
