import { describe, expect, it } from 'vitest'

/**
 * Phase 7 Entrance E1（決定193）：入口の配線ガード（ソース固定）。
 *
 * React を描画するテスト基盤が無いため、`enemyIdHardeningWiring.test.ts` と同じくソースを直接検査する。
 * （tsconfig.app の types は vite/client のみのため node:fs ではなく import.meta.glob で読む）
 */
const SOURCES = import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const toSrcPath = (k: string): string => (k.startsWith('./') ? `components/${k.slice(2)}` : k.replace(/^\.\.\//, ''))

const read = (suffix: string): string => {
  const key = Object.keys(SOURCES).find((k) => toSrcPath(k) === suffix || toSrcPath(k).endsWith(`/${suffix}`))
  expect(key, `ソースが見つからない: ${suffix}`).toBeDefined()
  return SOURCES[key as string]
}

/** storage へ書き込む関数（既存のもの全部）。Home の表示部品はどれも呼んではいけない */
const WRITERS =
  /\b(record(GameResult|DailyResult|StakeResult|OtomoBond|MatchupClear)|saveBattle|clearBattleSave|addRewardBonus|saveDeckPreference|startDailyAttempt|markTutorialSeen|clearDailyRecords)\s*\(|localStorage\.(setItem|removeItem|clear)\(/

describe('AC1：起動時に説明モーダルを自動で開かない', () => {
  it('App.tsx の showTutorial の初期値は false で、hasSeenTutorial を起動判定に使わない', () => {
    const app = read('App.tsx')
    expect(app).toMatch(/const \[showTutorial, setShowTutorial\] = useState\(false\)/)
    expect(app).not.toMatch(/hasSeenTutorial/)
  })

  it('完全版の遊び方は残っている（ヘッダーの本のアイコンから開ける）', () => {
    const app = read('App.tsx')
    expect(app).toMatch(/aria-label="遊び方を見る"/)
    expect(app).toMatch(/onClick=\{\(\) => setShowTutorial\(true\)\}/)
    expect(app).toMatch(/\{showTutorial && <TutorialOverlay onClose=\{closeTutorial\} \/>\}/)
  })
})

describe('AC20：Home の表示は storage を書かない（読み取りのみ）', () => {
  it.each(['components/setup/HomeScreen.tsx', 'components/setup/HomeTodayPanel.tsx', 'components/setup/heroGod.ts', 'components/setup/homePrimary.ts', 'components/setup/firstBattle.ts', 'components/FirstBattleBrief.tsx'])(
    '%s に書き込み関数の呼び出しが無い',
    (file) => {
      expect(read(file)).not.toMatch(WRITERS)
    },
  )

  it('Home は神×敵の記録を読まない（初回読み込みで取り込み＝書き込みを行うため）', () => {
    for (const file of ['components/setup/HomeScreen.tsx', 'components/setup/HomeTodayPanel.tsx']) {
      expect(read(file)).not.toMatch(/loadMatchups|matchupStorage/)
    }
  })

  it('loadLastUsedGodId は localStorage を読むだけ', () => {
    const src = read('hooks/deckPreferenceStorage.ts')
    const body = src.slice(src.indexOf('export function loadLastUsedGodId'))
    expect(body).toContain('localStorage.getItem(')
    expect(body).not.toMatch(/localStorage\.(setItem|removeItem|clear)\(/)
  })
})

describe('AC18：Hero の追加で未知 ID の危険な経路を作らない', () => {
  it('HomeScreen は enemies.ts を直接読まず、今日の敵名も safeEnemyName 経由', () => {
    const home = read('components/setup/HomeScreen.tsx')
    expect(home).not.toMatch(/from '\.\.\/\.\.\/core\/data\/enemies'/)
    expect(home).toMatch(/safeEnemyName\(dailyBossFor\(todayKey\)\.enemyId\)/)
  })

  it('HomeTodayPanel が getEnemyDef に渡すのは dailyBossFor（定義由来）の ID だけ', () => {
    const panel = read('components/setup/HomeTodayPanel.tsx')
    const calls = [...panel.matchAll(/getEnemyDef\(([^)]*)\)/g)].map((m) => m[1])
    expect(calls).toEqual(['boss.enemyId'])
    expect(panel).toMatch(/const boss = dailyBossFor\(dateKey\)/)
  })

  it('AC14：今日の敵の絵は Hero 画像の読み込みが終わってから読み込む（LCP の帯域を取り合わない）', () => {
    const home = read('components/setup/HomeScreen.tsx')
    expect(home).toMatch(/onLoad=\{\(\) => setHeroSettled\(true\)\}/)
    expect(home).toMatch(/onError=\{\(\) => setHeroSettled\(true\)\}/)
    expect(home).toMatch(/showEnemyArt=\{heroSettled\}/)
    const panel = read('components/setup/HomeTodayPanel.tsx')
    expect(panel).toMatch(/\{showEnemyArt && \(\s*<img src=\{def\.art\}/)
    // 箱（.home-today-enemy-art）は絵の有無に関係なく常に描く＝読み込み後に高さが跳ねない
    expect(panel).toMatch(/<div className="home-today-enemy-art" aria-hidden="true">\s*\{showEnemyArt/)
  })

  it('Hero God は GODS に存在する神だけを採る（getGodDef のような投げる参照を使わない）', () => {
    const hero = read('components/setup/heroGod.ts')
    expect(hero).toMatch(/GODS\.find\(/)
    expect(hero).not.toMatch(/getGodDef/)
  })

  it('Home は OTOMO を描かない（決定192 の Known Risk に触れない）', () => {
    for (const file of ['components/setup/HomeScreen.tsx', 'components/setup/HomeTodayPanel.tsx', 'components/setup/heroGod.ts']) {
      expect(read(file)).not.toMatch(/getOtomoDef|otomo\.defId/)
    }
  })
})

describe('AC4・AC10・AC16：Primary の配線と P1 の testid', () => {
  it('Primary は selectHomePrimary の結果で 1 つだけ描く', () => {
    const home = read('components/setup/HomeScreen.tsx')
    expect(home).toMatch(/const primary = selectHomePrimary\(/)
    for (const state of ['resume', 'firstBattle', 'daily']) expect(home).toContain(`primary === '${state}' &&`)
    expect(home).toMatch(/className=\{primary === 'normal' \? 'home-cta-primary' : 'home-cta-secondary'\}/)
  })

  it('P1 の testid と文言を維持する（QA スクリプトが依存）', () => {
    const home = read('components/setup/HomeScreen.tsx')
    for (const id of ['home-resume', 'home-start', 'home-today-cta']) expect(home).toContain(`data-testid="${id}"`)
    for (const label of ['続きから', '神を選ぶ', '戦績を見る', 'OTOMOとの絆を見る']) expect(home).toContain(label)
    const panel = read('components/setup/HomeTodayPanel.tsx')
    for (const id of ['home-today', 'home-today-enemy', 'home-today-status', 'home-today-attempts', 'home-today-best', 'home-today-countdown', 'home-today-cta', 'home-today-date', 'home-progress']) {
      expect(panel).toContain(`data-testid="${id}"`)
    }
    expect(panel).toMatch(/`残り \$\{attemptsLeft\}\/\$\{RULES\.daily\.attemptsPerDay\}`/)
  })

  it('「続きから」は既存の onResume（resumeGame）のまま＝1 クリックで再開', () => {
    const flow = read('components/GameFlow.tsx')
    const resume = flow.slice(flow.indexOf('onResume={() => {'), flow.indexOf('engine.resumeGame(savedBattle)') + 40)
    expect(resume).toContain('engine.resumeGame(savedBattle)')
    expect(resume).not.toMatch(/setShowFirstBattleBrief|guardDiscard/)
  })
})

describe('AC7・AC19・AC21：初陣の開始', () => {
  const flow = () => read('components/GameFlow.tsx')
  const startBody = () => {
    const src = flow()
    return src.slice(src.indexOf('const startFirstBattle = () => {'), src.indexOf('const goHome = () => {'))
  }

  it('FIRST_BATTLE_PRESET とおすすめデッキで既存の engine.startGame を呼ぶ', () => {
    const body = startBody()
    expect(body).toContain('const preset = FIRST_BATTLE_PRESET')
    expect(body).toContain('getRecommendedDeck(preset.godId)')
    expect(body).toMatch(/engine\.startGame\(\s*preset\.godId,\s*firstDeck,\s*preset\.difficulty,/)
  })

  it('初陣は神域挑戦の回数に触れず、デッキの好みも保存しない', () => {
    const body = startBody()
    expect(body).not.toMatch(/startDailyGame|beginDailyChallenge|startDailyAttempt|saveDeckPreference/)
    expect(body).toContain('setDailyKey(null)')
  })

  it('結果画面の「もう一度」「デッキを調整」が動くよう、通常戦と同じ state を揃える', () => {
    const body = startBody()
    for (const setter of ['setGodId(preset.godId)', 'setDeck(firstDeck)', 'setDifficulty(preset.difficulty)', 'setStake(0)', 'setStakeChoice(null)', 'setOtomoGrowthPath(preset.otomoGrowthPath)', 'setSelectedEnemyId(preset.enemyId)']) {
      expect(body).toContain(setter)
    }
  })

  it('「初陣へ」は短い説明を開くだけで、そこで何も始めない', () => {
    expect(flow()).toMatch(/onStartFirstBattle=\{\(\) => setShowFirstBattleBrief\(true\)\}/)
    expect(flow()).toMatch(/<FirstBattleBrief\s+onConfirm=\{startFirstBattle\}/)
  })

  it('通常の開始経路（神選択 → 敵選択 → デッキ → startGame／Daily の beginDailyChallenge）は残っている', () => {
    const src = flow()
    expect(src.match(/engine\.startDailyGame\s*\(/g)).toHaveLength(1)
    expect(src).toContain("setSetupScreen('godSelect')")
    expect(src).toContain('<EnemySelectScreen')
    expect(src).toContain('saveDeckPreference(godId, confirmedDeck)')
  })
})
