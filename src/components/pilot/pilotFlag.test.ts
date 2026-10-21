/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { isPilotEnabled, parsePilotFlag, resetPilotFlagForTest } from './pilotFlag'

/**
 * Threat Branch Pilot v1：Pilot 専用経路と「既存に影響させない」配線の契約（source-fixed）。
 */
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')

describe('Pilot フラグ（?pilot=threat）', () => {
  afterEach(() => resetPilotFlagForTest())

  it('検索文字列から判定する純関数', () => {
    expect(parsePilotFlag('?pilot=threat')).toBe(true)
    expect(parsePilotFlag('?a=1&pilot=threat&b=2')).toBe(true)
    expect(parsePilotFlag('')).toBe(false)
    expect(parsePilotFlag('?pilot=other')).toBe(false)
    expect(parsePilotFlag('?pilot=shogunate')).toBe(false)
    expect(parsePilotFlag('?enemy=karakuri')).toBe(false)
  })

  it('window が無い環境（Node）では無効', () => {
    expect(isPilotEnabled()).toBe(false)
  })
})

describe('配線（既存の導線・記録に影響させない）', () => {
  it('Enemy Select：通常は CORE_ENEMIES、Pilot 時だけ PILOT_ENEMIES を末尾に足す。Pilot 敵には印と案内（新規 CSS 0）', () => {
    const src = read('../setup/EnemySelectScreen.tsx')
    expect(src).toMatch(/import \{ CORE_ENEMIES, PILOT_ENEMIES, isPilotEnemyId \} from '\.\.\/\.\.\/core\/data\/enemies'/)
    expect(src).toMatch(/const roster = pilot \? \[\.\.\.CORE_ENEMIES, \.\.\.PILOT_ENEMIES\] : CORE_ENEMIES/)
    expect(src).toMatch(/\{roster\.map\(\(enemy\) => \(/)
    expect(src).not.toMatch(/\{ENEMIES\.map/)
    expect(src).toMatch(/data-testid="enemy-pilot-chip"/)
    expect(src).toMatch(/data-testid="enemy-pilot-notice"/)
    expect(src).toContain('Threat Branch Pilot v1：この敵との戦いは戦績・セーブ・報酬に残りません')
    // 攻略済みの印は Pilot 敵に出さない（攻略盤の対象外）
    expect(src).toMatch(/matchups\?\.available && !isPilotEnemyId\(enemy\.id\)/)
    // 新しい CSS クラスを作らない（既存の chip／subtitle を再利用）
    expect(src).not.toMatch(/enemy-select-pilot-/)
  })

  it('49 攻略盤は CORE_ENEMIES だけを並べる', () => {
    const src = read('../setup/MatchupBoard.tsx')
    expect(src).toMatch(/\{CORE_ENEMIES\.map\(\(enemy\) => \{/)
    expect(src).not.toMatch(/[^_]ENEMIES\.map/)
  })

  it('engine hook：Pilot 敵の対局は battleSave・runLog・戦績・攻略盤・神階・絆・Daily・自己ベストを書かない', () => {
    const src = read('../../hooks/useGameEngine.ts')
    expect(src).toMatch(/const pilotBattle = isPilotEnemyId\(result\.state\.enemy\.defId\)/)
    expect(src).toMatch(/if \(!pilotBattle\) \{\n\s+saveBattle\(result\.state\)/)
    expect(src).toMatch(/\} else if \(pilotBattle\) \{\n\s+clearBattleSave\(\)/)
    // Pilot 分岐では記録関数を 1 つも呼ばない
    const begin = src.indexOf('} else if (pilotBattle) {')
    const pilotBlock = src.slice(begin, src.indexOf('} else {', begin))
    expect(pilotBlock).not.toMatch(/recordMatchupClear|recordDailyResult|recordGameResult|recordStakeResult|recordOtomoBond|enqueuePendingRun|saveBattle\(|saveRunLog\(/)
    expect(pilotBlock).toMatch(/setNewBest\(false\)/)
  })

  it('BattleScreen：Pilot 敵の対局は報酬カードを提示しない（報酬・提示履歴を書かない）。既存契約の条件式は不変', () => {
    const src = read('../battle/BattleScreen.tsx')
    expect(src).toMatch(/const pilotBattle = isPilotEnemyId\(state\.enemy\.defId\)/)
    expect(src).toMatch(/const rewardDone = rewardDoneState \|\| pilotBattle/)
    expect(src).toMatch(/state\.status === 'won' && state\.mode !== 'daily' && !rewardDone && rewardOpen && \(/)
    expect(src).toMatch(/rewardPending=\{state\.status === 'won' && state\.mode !== 'daily' && !rewardDone\}/)
  })

  it('seed → 敵・Daily pool・攻略盤・gameVersion は既存 7 体の配列／ENEMY_IDS から導く', () => {
    const enemies = read('../../core/data/enemies.ts')
    expect(enemies).toMatch(/return CORE_ENEMIES\[hash % CORE_ENEMIES\.length\]\.id/)
    expect(enemies).toMatch(/export const ENEMIES: EnemyDef\[\] = \[\.\.\.CORE_ENEMIES, \.\.\.PILOT_ENEMIES\]/)
    const daily = read('../../core/data/dailyBoss.ts')
    expect(daily).toMatch(/DAILY_BOSS_POOL: readonly EnemyId\[\] = Object\.values\(ENEMY_IDS\)/)
    const matchup = read('../../hooks/matchupStorage.ts')
    expect(matchup).toMatch(/MATCHUP_ENEMIES: readonly EnemyId\[\] = Object\.values\(ENEMY_IDS\)/)
    const version = read('../../core/replay/gameVersion.ts')
    expect(version).toMatch(/import \{ CORE_ENEMIES \} from '\.\.\/data\/enemies\.js'/)
    // v1.0.2 統合：v1.0.1 の ★再付番（rank を v1.0.0 値に固定する enemiesForFingerprint）と合流。入力は引き続き CORE 7 体だけ
    expect(version).toMatch(/return CORE_ENEMIES\.map\(/)
    expect(version).toMatch(/enemies: enemiesForFingerprint\(\),/)
    expect(version).not.toMatch(/enemies: ENEMIES,/)
    expect(version).toMatch(/enemyTactic: _enemyTactic, \.\.\.rest \} = RULES/)
  })

  it('engine：軍略の解決は startRound の予告時（nextEnemyAction）で 1 回、実行は intent をそのまま使う', () => {
    const round = read('../../core/engine/round.ts')
    // Pilot v1.1：難易度別しきい値のため state.difficulty を渡す（解決は従来どおり予告時 1 回）
    expect(round).toMatch(/const raw = resolveEnemyTactic\(actionForRound\(enemyDef\.actions, state\.round\), state\.enemy\.hp, state\.enemy\.maxHp, state\.difficulty\)/)
    expect(round).toMatch(/const action = state\.enemy\.intent \?\? nextEnemyAction\(state\)/)
  })

  it('UI：EnemyPanel は tactic を事前に解決して見せない（未来情報の常時表示＝決定263 の境界）。新規 CSS 0', () => {
    const panel = read('../battle/EnemyPanel.tsx')
    expect(panel).not.toMatch(/resolveEnemyTactic|tactic/)
    const css = read('../battle/battle.css')
    // battle.css の既存コメントには決定250 等の『Pilot』が含まれるので、本 Pilot 固有の語だけを見る
    expect(css).not.toMatch(/tactic|threat-branch|enemy-select-pilot|軍略/)
  })
})
