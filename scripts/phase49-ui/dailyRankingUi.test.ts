import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Phase 4.9：ランキングUIの「壊れ方」を止める検査。
 *
 * ★なぜ `scripts/` に置くか
 * ①CSSを本文として読む必要がある。`?raw` も `?inline` も `.css` に対しては
 *   Vite の CSS パイプラインが先に効き、node 環境では**空文字**になる
 *   （＝検査が黙って素通りする。実際に一度踏んだ）。
 * ②`node:fs` を使うには node の型が要るが、`tsconfig.app.json` は
 *   ブラウザ用に `types: ["vite/client"]` だけを持つ。ここへ node 型を足すと
 *   クライアントコードから `process` 等が見えてしまい、境界が緩む。
 * `scripts/` はどの tsconfig の include にも入っていないので、
 *   既存の `scripts/phase48-api/fixture.test.ts` と同じくこの制約から自由になる。
 *
 * ★見るのは見た目の好みではなく、壊れると実害が出る4点
 *   1. 通常モードにランキングが漏れない
 *   2. モバイル縦画面で画面を縦に伸ばし切らない
 *   3. 自分の行・同順位を色だけで示していない
 *   4. 長い文字列を切り詰めていない（このリポジトリの方針）
 */

const read = (path: string) => readFileSync(path, 'utf8')

/** コメントを実装と取り違えない */
function stripJs(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const dailyCss = read('src/components/setup/daily.css')
const battleCss = read('src/components/battle/battle.css')
const panelSource = read('src/components/setup/DailyRankingPanel.tsx')
const dailyScreenSource = read('src/components/setup/DailyChallengeScreen.tsx')
const gameOverSource = read('src/components/battle/GameOverOverlay.tsx')
const battleScreenSource = read('src/components/battle/BattleScreen.tsx')
const gameFlowSource = read('src/components/GameFlow.tsx')

/** 新しく足したCSSブロックだけを取り出す */
const rankingStart = dailyCss.indexOf('.daily-ranking')
const rankingCss = rankingStart >= 0 ? dailyCss.slice(rankingStart) : ''

describe('検査そのものが空振りしていない', () => {
  it('CSSとソースを本文として読めている', () => {
    expect(rankingCss.length).toBeGreaterThan(1000)
    expect(battleCss.length).toBeGreaterThan(1000)
    expect(panelSource).toContain('DailyRankingPanel')
  })
})

describe('通常モードへ漏らさない', () => {
  it('ランキングパネルを置いているのは神域挑戦の画面だけ', () => {
    expect(stripJs(dailyScreenSource)).toContain('<DailyRankingPanel')
    for (const [name, source] of [
      ['GameOverOverlay', gameOverSource],
      ['BattleScreen', battleScreenSource],
      ['GameFlow', gameFlowSource],
    ] as const) {
      expect(stripJs(source), `${name} がランキングパネルを描いている`).not.toContain(
        '<DailyRankingPanel',
      )
    }
  })

  it('決着画面のランキング導線は daily ブロックの内側にある', () => {
    const code = stripJs(gameOverSource)
    const dailyBlockStart = code.indexOf('{daily && (')
    const rankBlock = code.indexOf('game-over-daily-rank')
    const afterDaily = code.indexOf('game-over-best-gap')
    expect(dailyBlockStart).toBeGreaterThan(-1)
    expect(afterDaily).toBeGreaterThan(-1)
    expect(rankBlock).toBeGreaterThan(dailyBlockStart)
    expect(rankBlock).toBeLessThan(afterDaily)
  })

  it('BattleScreen は daily のときしか導線を渡さない', () => {
    expect(stripJs(battleScreenSource)).toContain("state.mode === 'daily' ? onOpenRanking : undefined")
  })

  it('GameFlow も daily のときしか導線を渡さない', () => {
    expect(stripJs(gameFlowSource)).toContain(
      "onOpenRanking={inDaily && dailyKey ? () => setSetupScreen('daily') : undefined}",
    )
  })

  it('通常モードの既存表示（自己ベスト差・神階）に触っていない', () => {
    const code = stripJs(gameOverSource)
    expect(code).toContain('game-over-best-gap')
    expect(code).toContain('stakeResult')
  })
})

describe('モバイル縦画面', () => {
  it('上位一覧に高さの上限があり、あふれる分は中でスクロールする', () => {
    expect(rankingCss).toMatch(/\.daily-ranking-list-wrap\s*\{[^}]*max-height:/)
    expect(rankingCss).toMatch(/\.daily-ranking-list-wrap\s*\{[^}]*overflow-y:\s*auto/)
  })

  it('既存の折り返し幅（640px）に合わせた指定がある', () => {
    expect(rankingCss).toContain('@media (max-width: 640px)')
  })

  it('狭い画面ではさらに高さを詰める', () => {
    const mobile = rankingCss.slice(rankingCss.indexOf('@media (max-width: 640px)'))
    expect(mobile).toContain('.daily-ranking-list-wrap')
    expect(mobile).toMatch(/max-height:/)
  })

  it('固定幅を持たない（狭い画面でも横に溢れない）', () => {
    expect(rankingCss).not.toMatch(/\n\s*width:\s*\d+px/)
    expect(rankingCss).not.toMatch(/min-width:\s*\d{3,}px/)
  })

  it('決着画面のリンクは指で押せる大きさ（44px以上）', () => {
    const link = battleCss.slice(battleCss.indexOf('.game-over-rank-link'))
    expect(link.length).toBeGreaterThan(0)
    expect(link).toMatch(/min-height:\s*44px/)
  })
})

describe('アクセシビリティ', () => {
  it('自分の行を色だけで示さない（名前そのものが「あなた」になる）', () => {
    const code = stripJs(panelSource)
    // 見分けを担うのは文字。色（daily-ranking-you）は補助でしかない
    expect(stripJs(read('src/components/setup/dailyRanking.ts'))).toContain("'あなた'")
    expect(code).toContain('daily-ranking-you')
  })

  it('自分の行に印を二重に付けない（読み上げが重複しない）', () => {
    const code = stripJs(panelSource)
    expect(code).not.toContain('← あなた')
  })

  it('同順位を色ではなく文字で示す', () => {
    expect(stripJs(panelSource)).toContain('daily-ranking-tie')
  })

  it('読み込み中・失敗・0人は読み上げに乗せる', () => {
    const statuses = stripJs(panelSource).match(/role="status"/g) ?? []
    expect(statuses.length).toBeGreaterThanOrEqual(3)
  })

  it('領域と表に名前を付ける', () => {
    const code = stripJs(panelSource)
    expect(code).toContain('aria-label="今日のランキング"')
    expect(code).toContain('aria-label="今日の上位"')
  })

  it('長い文字列を切り詰めず折り返す（このリポジトリの方針）', () => {
    expect(rankingCss).not.toContain('text-overflow: ellipsis')
    expect(rankingCss).toContain('overflow-wrap: anywhere')
  })

  it('数字は桁を揃えて読ませる', () => {
    expect(rankingCss).toContain('font-variant-numeric: tabular-nums')
  })
})

describe('パネルの実装が薄いまま保たれている', () => {
  it('順位の計算をコンポーネント側でやらない', () => {
    const code = stripJs(panelSource)
    for (const forbidden of ['.sort(', 'assignRanks', 'getFinalScore']) {
      expect(code, `パネルが順位・スコアを作り直している: ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('表示の組み立ては純関数に任せている', () => {
    expect(stripJs(panelSource)).toContain('buildRankingView')
  })

  it('日付が変わったら取り直し、遅れて来た前の日の応答を捨てる', () => {
    const code = stripJs(panelSource)
    expect(code).toContain('[dateKey]')
    expect(code).toContain('cancelled')
  })

  it('提出用のクライアントを巻き込まない（読み取り専用の口だけを使う）', () => {
    const code = stripJs(panelSource)
    expect(code).toContain('fetchDailyLeaderboard')
    expect(code).not.toContain('startRankedRun')
    expect(code).not.toContain('flushPendingRuns')
  })
})

describe('秘密を画面へ持ち出さない', () => {
  it('ランキング周りのソースが playerSecret に触れない', () => {
    for (const [name, source] of [
      ['DailyRankingPanel', panelSource],
      ['dailyRanking', read('src/components/setup/dailyRanking.ts')],
      ['leaderboardClient', read('src/hooks/leaderboardClient.ts')],
    ] as const) {
      const code = stripJs(source)
      expect(code, `${name} が秘密を扱っている`).not.toContain('playerSecret')
    }
  })

  it('生の32桁IDをそのまま描かない（短縮を通す）', () => {
    expect(stripJs(panelSource)).not.toContain('row.playerId')
  })
})
