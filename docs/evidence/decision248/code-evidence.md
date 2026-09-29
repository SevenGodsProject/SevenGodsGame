# Decision248 — code evidence（Production bcfd530・worktree `SevenGodsGame-d247`＝origin/master）

| 事実 | file:line |
|---|---|
| カード 60 枚（32 共通＋4×7）。効果は `Effect[]` データのみ | `src/core/data/cards/*.ts`、`docs/evidence/decision244/card-table-60-and-recommended-decks.md`（決定244 以降 diff 0） |
| 入力ロック＝cast 280ms | `src/hooks/useGameEngine.ts:74`（`CARD_PLAY_REVEAL_MS = 280`） |
| 閃光：type 別 6 画像・中央 fixed・0.35s・power tier で光量 | `BattleScreen.tsx:446-457`、`cardStyle.ts:26-33`（`CAST_FX`）、`battle.css:185-235・319-403`、決定237 `battle.css:6874` |
| 構えは敵ダメージ札だけ | `BattleScreen.tsx:320`（`windUp = dealsEnemyDamage(...)`）、`battle.css:4362-4368` |
| 飛翔（決定239） | `useCardTravel.ts:14-52`、`cardTravel.css` |
| fx キーの生成（heal／block／godAttack／burst／evolve） | `useBattleFx.ts:96-372` |
| BUFF_APPLIED・CARD_DRAWN・RESONANCE_GAINED はミニ結果／ゲージのみ | `useBattleFx.ts:187-193` |
| 神の突き（tier で軽重）・自傷の揺れ | `PlayerPanel.tsx:126-137`、`battle.css:4369-4379・6843-6847` |
| 盾バッジ pulse・HP バー pulse | `PlayerPanel.tsx:97-107`、`battle.css:587・1367` |
| 敵の反応 wrapper（stop／kb を inline 変数で受ける） | `EnemyPanel.tsx:42-56`、`combatTimeline.ts:175-190`（`enemyReactions`） |
| 敵にデバフの視覚反応が無い（バフ欄の文字のみ） | `EnemyPanel.tsx:139-146`、`useBattleFx.ts:192` |
| OTOMO の反応は神の一撃・進化のみ | `GodOtomoPanel.tsx:117-146`、`battle.css:1411-1425` |
| 手札の出現アニメは無い（消える側 `card-play` のみ） | `battle.css:2478-2497`、`useBattleFx.ts:190` |
| hit stop・着弾時刻・溜め | `enemyVfxTiming.ts`（`CARD_IMPACT_MS 90`・`CARD_HEAVY_IMPACT_MS 150`・`HIT_STOP_MS 30/40/45/60`・`BONUS_HIT_STOP_MS 50`・`BURST_HIT_STOP_MS 80`） |
| feel tier（L1〜L4） | `feelTier.ts:8-20`（内部値 10／15／25） |
| 決定240 の構え（`filter` を変数で差し替え・`translate` 縦） | `battle.css:6880-6975` |
| 決定247 の反転（`scale` 独立プロパティ・`--atk-x`） | `battle.css:6957-6975`（末尾） |
| reduced-motion のブロック（揺れ・突き・崩壊を止める） | `battle.css:4227・4616-4640・6853-6856`、`reducedMotion.ts` |
| SE 20 本（すべて `scripts/gen-se.mjs` 合成）・長さ | `public/assets/se/*.wav`（block 90ms・heal 440ms・card_draw 110ms・resonance_gain 150ms・reward 510ms） |
| SE gain 階層 | `feelTier.ts:33-42` |
| SP の舞台サイズ（神 ≤240px・敵 ≤300px・OTOMO 0.75） | `battle.css:6717-6720` |
| Tier 表（決定224 §11）・ladder（LANE2 §1／決定232） | `docs/DECISION224_VISUAL_STANDARD_GATE.md:140-153`、`docs/LANE2_COMBAT_FEEL_V2_PRE_AUDIT.md:52-72` |
