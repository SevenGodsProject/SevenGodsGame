import type { OtomoBondRecord } from '../../hooks/otomoBondStorage'

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
  /** 簡単な絆テキスト */
  bondText: string
}

function computeBondText(record: OtomoBondRecord, level: number): string {
  if (record.battlesPlayed === 0) return 'まだ出会ったばかり'
  if (record.dojiReached > 0 && level >= 5) return '固い絆で結ばれた相棒'
  if (level >= 3) return '息の合った相棒'
  return '共に歩み始めた相棒'
}

export function computeOtomoGrowthDisplay(record: OtomoBondRecord): OtomoGrowthDisplay {
  const level = 1 + Math.floor(record.resonanceCount / POINTS_PER_LEVEL)
  const pointsInLevel = record.resonanceCount % POINTS_PER_LEVEL
  return {
    level,
    pointsInLevel,
    pointsPerLevel: POINTS_PER_LEVEL,
    progressRatio: pointsInLevel / POINTS_PER_LEVEL,
    bondText: computeBondText(record, level),
  }
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
