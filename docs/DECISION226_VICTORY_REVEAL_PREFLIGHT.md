# 決定226 — Victory Reveal v1 Preflight（実装前）

- 日付：2026-09-24
- 種別：**PREFLIGHT ONLY／docs-only**（runtime／tests／assets／branch／SE・画像・動画生成／H3／`src/core`／決定213／Ranking／Neon／secrets／commit／push／merge／deploy：すべて 0）
- 判断主体：AI チーム（CLAUDE.md §6-2）。実装 GO は CEO 判断
- 前提：決定225（Battle Screen Premium Quality Audit）＝GO、TOP TARGET＝「撃破 → 勝利」。Production＝master＝`862367f`。コード参照は Production と同一の RC worktree（862367f）
- 目的：「結果画面を豪華にする」ではなく、**「自分の攻略が成功し、この敵をこの神で倒した」瞬間を、戦闘最大級の PAYOFF として成立させる**。主役は ①勝利した事実 ②使用した神 ③倒した敵。スコアは secondary

---

## 0. 結論（先に）

| # | 項目 | 結論 |
|---|---|---|
| 23 | Verdict | **GO WITH MODIFICATIONS**（修正 5 点・§4） |
| 13 | 追加の強制待機 | **0ms**。現在の「撃破」の拍 850ms と結果の段階表示 1.9s の**中で再構成**する。舞台は結果の上ではなく**結果の後ろ**に置き、時刻表（`planVictory`）は変えない |
| 5 | God keyvisual（7 神） | 7 神とも `keyvisual.webp` あり（675×900 ×5・720×900・900×900、**透過なし＝背景付きの一枚絵**）。`keyvisual-hero` は恵比寿だけ。→ 決定225 案の「切り抜きが立ち上がる」は**7 神で成立しない**。**共鳴カットインと同じ円形ポートレート**（`KEYVISUAL_OBJECT_POSITION`・6-D で 7 神 × 端末 QA 済み）を使う |
| 8 | skip | 舞台（「撃破」の拍）の間だけ tap／click／Enter で `done` へ。結果の段階表示も tap で全表示。outcome・save・score は不変（表示層のみ）。race は `later()` の冪等性で吸収 |
| 11 | First Clear | **既存情報だけで可能**（`recordMatchupClear` は `GAME_ENDED` 時に `useGameEngine` が確定し、`describeMatchupClear` の文言が結果画面に出ている）。舞台の副題にその 1 行を出すだけ。新ルール 0 |
| 15／16 | asset／容量 | 画像 0・動画 0・SE 0。CSS ≈2.5KB＋TSX ≈1.5KB＝**≈4KB**（目標 6KB 内） |
| 14 | 新規 timer | **0**（既存の `later()` 列をそのまま使う。skip は `clearSequence()`） |
| 24 | NEXT NOW | **CEO の GO を受けて、新ブランチで §17 の実装に着手する** |

---

## 1. Current defeat timeline（実コード）

`useCombatPresentation.ts` `next.outcome === 'won'` 分岐 → `planVictory(finalStep, reduced)`（`combatTimeline.ts`）。定数は `enemyVfxTiming.ts`。

| 定数 | 値 | reduced |
|---|---|---|
| `FINAL_HIT_STOP_MS` | 90 | 0 |
| `DEFEAT_FLASH_AFTER_MS` | 170 | 120 |
| `DEFEAT_COLLAPSE_MS` | 520 | 250 |
| `DEFEAT_BEAT_OFFSET_MS` | 380 | round(250×0.8)=200 |
| `VICTORY_BEAT_MS` | 850 | 600 |
| `PRESENTATION_SAFETY_MS` | 1,500 | 1,500 |

最後の一撃の着弾（`finalImpactMs`）は役割で変わる：カード本体 90／⚡ 240（本体＋150）／神の一撃 1,600（commit 基準）。

## 2. ms 単位のイベント表（commit＝0・カード本体で撃破の例。着弾 90）

| 時刻 | 出来事 | 種別 |
|---|---|---|
| −280 | tap → cast（`CARD_PLAY_REVEAL_MS`） | engine（見せ方の遅延）＋CSS |
| 0 | commit：`GAME_ENDED{status:'won'}`・`state.status='won'`・スコア確定・`recordMatchupClear`（`useGameEngine:222`）・records／daily／otomo bond の保存 | **engine／state／storage** |
| 0 | `planBatch` → `planVictory`。`victoryPhase='finishing'`。入力は `isPlayerTurn=false`（`status!=='playing'`）で全停止 | presentation（JS） |
| 90 | 最後の一撃の着弾：hit stop 90・52px・`hit_l4`・敵反応 L4 | CSS＋SE |
| 90〜180 | hit stop（対象要素のみ） | CSS |
| 260 | `victoryPhase='collapse'`（`collapseStartMs`）：`.enemy-defeat` 520ms（brightness 2.8 → 脱色 → 沈み 16px → blur）・白リング 180px・アリーナ揺れ 5px（WAAPI） | timer → CSS |
| **640** | `victoryPhase='beat'`（`beatStartMs`）：`.victory-beat`（全画面・放射グラデ・「撃破！」72px・1s pop）・`sfx.victory()`＋`playJingle('victory')`（BGM は pause） | timer → CSS＋SE |
| 780 | 崩壊終了（敵が消える） | CSS |
| **1,490** | `victoryPhase='done'`（`rewardMs`＝beat+850）→ `presentationDone` → **`GameOverOverlay` mount**（`overlay-card-pop-in` 0.35s） | timer → React mount |
| 1,490〜3,390 | 結果の段階表示：status 0.4s → 神域制覇 +0.25 → 神サムネ +0.4 → スコア +0.6（rAF で count-up 済み：`GameOverOverlay.tsx:157-`）→ 記録 → 内訳 +1.4 → 神技評価 +1.6 → **ボタン +1.9s**（`battle.css:4150-4162`） | CSS |
| 2,990 | 安全弁（`rewardMs + 1,500`）：何があっても `done` | timer |
| ≈3,400 | 「報酬カードを選ぶ」が押せる（操作可能になる最初の時刻） | — |

**現在の強制待機**：着弾 → 結果 mount まで **1,400ms**（スキップ不可）、結果 mount → ボタン表示まで **1,900ms**（スキップ不可）。合計 **≈3.3s**。神の一撃（≈3.4s）と同程度。

## 3. engine／presentation 境界

| 層 | 場所 | Victory Reveal で触るか |
|---|---|---|
| engine | `src/core`（`GAME_ENDED`・score・status） | **触らない** |
| state／storage | `useGameEngine.ts`（records・matchups・daily・bond の保存、`matchupClear` の確定） | **触らない**（読むだけ） |
| presentation（時刻表） | `combatTimeline.planVictory`・`enemyVfxTiming` | **触らない**（値を変えない） |
| presentation（進行） | `useCombatPresentation`（`victoryPhase`・`later()`・SE 発火） | **skip 関数を 1 つ追加**（timers は増やさない） |
| presentation（見た目） | `BattleScreen.tsx` の `victory-beat` ブロック・`battle.css`・`GameOverOverlay.tsx` | `victory-beat` を舞台に置き換え・結果は内容不変 |

`src/core` 変更なしで可能。

## 4. Victory Reveal exact design（決定225 案からの修正 5 点）

| # | 修正 | 理由 |
|---|---|---|
| M1 | 「神の keyvisual が立ち上がる」→ **共鳴カットインと同じ円形ポートレートが帯の上に現れる** | keyvisual は 7 神とも透過なし（§5）。切り抜きは作れない。円形＋`KEYVISUAL_OBJECT_POSITION` は Production で 7 神 × 端末 QA 済み（6-D）。**神の一撃と勝利が同じ視覚文法**になり、Tier 5 の連続性が出る |
| M2 | 舞台は「結果の前に足す」のではなく**「撃破」の拍（850ms）を舞台に置き換え、結果 mount 後は舞台を結果の背景として残す** | 追加待機 0ms。結果の内容・DOM・段階表示は不変 |
| M3 | スコア count-up は**作らない**（既に `GameOverOverlay` が rAF で回している） | 主役は事実・神・敵。既存のまま secondary |
| M4 | First Clear は**既存の `describeMatchupClear` の 1 行を舞台の副題に再掲**するだけ | 新ルール 0・判定は `GAME_ENDED` 時に確定済み |
| M5 | skip は舞台の間＋結果の段階表示の 2 段階。誤操作対策として **報酬・再戦のボタンは skip では押せない**（結果の段階表示を「全部表示」にするだけ） | Law 5・race なし |

### 舞台の構成（時刻は着弾 90 の例・§2 と同じ）
| 時刻 | 段階 | 見た目 | 動かす性質 |
|---|---|---|---|
| 90 | FINAL HIT | 既存（52px・stop 90・揺れ） | — |
| 90〜180 | MICRO PAUSE | 既存 hit stop | — |
| 260〜780 | COLLAPSE | 既存 `.enemy-defeat`（変更なし） | — |
| **640** | VICTORY CONFIRMATION | 舞台 root（fixed・z 7）：暗転 `#05060d` 60%（0.2s）＋神色の帯（`resonance-cutin-band` と同じ形・-3.5°・0.4s）＋集中線（同 rays）。**「撃破！」の文字はここに統合**（小さく上段に） | opacity／transform |
| 700 | GOD PORTRAIT | 円形ポートレート（`clamp(148px, 34vh, 252px)`・`object-position: var(--god-keyvisual-pos)`・神色の環）が 0.3s で上がる（translateY 16px→0・opacity） | transform／opacity |
| 860 | 「勝利」 | 明朝（`battle.css:1738` の書体）`clamp(40px, 5.4vw, 68px)`・字間 0.16em・`resonance-cutin-title-in` と同じ 0.26s | opacity／letter-spacing |
| 980 | 神名 × 敵名 | 「大耀 × 蒼海の龍神」（神色）。First Clear なら副題に `describeMatchupClear` の 1 行 | opacity |
| 1,490 | RESULT | 既存どおり `GameOverOverlay` が mount（z 10）。舞台は**背景として残り**、「勝利」タイトルだけ 0.3s で消える（結果カードの「勝利」と二重にしない）。帯・ポートレートは 40% に落として結果の後ろに | opacity |
| 1,490〜3,390 | RESULT INFORMATION | 既存の段階表示（不変）。tap で全表示（M5） | — |
| 3,390 | RETURN / NEXT | 既存ボタン | — |

- 神の一撃（≈3.4s・暗転あり）と同格の Tier 5。**長さは既存と同じ**（着弾 → ボタン ≈3.3s）。派手さは暗転 60%・帯・円・文字のみ。粒子・虹・白フラッシュ・追加の揺れは**使わない**
- 舞台の色は `GOD_THEME_COLOR[godId].base`（`--god-accent`）。CSS 変数で渡すだけ（`BattleResonanceCutin` と同じ）

## 5. God keyvisual suitability（7 神・実測）

| 神 | `keyvisual.webp` | 透過 | 構図 | 円形 crop（既存 `KEYVISUAL_OBJECT_POSITION`） | 判定 |
|---|---|---|---|---|---|
| 恵比寿 | 675×900 159KB | なし | 縦 | center 25% | ○（`keyvisual-hero` 1086×1448 もあるが 1 神のみ＝使わない） |
| 大耀 | 675×900 143KB | なし | 縦 | center 30% | ○ |
| 蒼毘 | 675×900 198KB | なし | 縦 | center 28% | ○ |
| 才華 | 675×900 167KB | なし | 縦 | center 22% | ○ |
| 寿楽 | 675×900 160KB | なし | 縦・顔が上部 | center 15% | ○（実物確認：顔は上 1/4） |
| 福永 | 720×900 145KB | なし | 縦 | center 20% | ○ |
| 笑蓮 | 900×900 127KB | なし | **正方形・横たわる横構図** | center | ○（円 crop なら顔が中央に入る。**縦帯 crop は不可**：左右 25% ずつ切れる） |
- 結論：**「切り抜きが立ち上がる」設計は不可**（7 神とも背景付き）。**円形ポートレート（既存の切り抜き値）なら 7 神で成立**（6-D §5 で 7 神 × 端末の Visual Acceptance 済み）
- 読み込み：神選択画面で同じ URL を表示済みのため通常はキャッシュ。**「続きから」再開は神選択を通らない**ため、戦闘開始時に `new Image().src = god.art.keyvisual` を 1 行（timer 0・既存の `preloadSe()` と同じ場所）
- 新規 asset：**0**。設計は M1 のとおり縮小済み

## 6. PC design（1508×660）
- 舞台：全画面 fixed。帯 `clamp(196px, 44vh, 320px)`＝290px。円 224px。「勝利」68px 明朝。神名 × 敵名 19px
- 結果 mount 後：帯・円は 40% に落ちて結果カード（中央 680px）の後ろ。カードの左右に帯の端と円の一部が見える＝**「勝った神の前に結果が置かれる」構図**
- 舞台の高さは flow に入らない（fixed）→ 結果カードの位置・CTA の初期可視（決定207 の教訓）に影響なし

## 7. SP design（390×844）
- 帯 `44vh`＝371px→上限 320px。円 `34vh`＝287px→上限 252px。「勝利」`5.4vw`＝21px→下限 40px。神名 × 敵名 13px
- 結果 mount 後：カードは幅いっぱい（既存）。帯の端は上下にのぞく。円は結果の「勝利」の上に重ならないよう **上 12vh に固定**
- safe area：fixed overlay は既存 `.victory-beat`／`.resonance-cutin` と同じ inset 0。`100dvh` 内
- portrait 想定のみ（既存どおり）。landscape SP は既存も未対応・本 Pilot でも対象外
- tap skip：舞台 root の `onPointerDown`（`touch-action: manipulation` は `press.css` 既定）
- 文字：明朝 40px＋13px。潰れない（カットインと同じ値で SP QA 済み）

## 8. skip 設計

| 項目 | 仕様 |
|---|---|
| 範囲 | ①舞台（`victoryPhase==='beat'`）：tap／click／Enter／Space で `skipVictoryBeat()` ②結果の段階表示：カードを tap で `is-staged-skip`（全 `animation-delay: 0`） |
| 実装 | `useCombatPresentation` に `skipVictoryBeat()`：`victoryPhase==='beat'` のときだけ `clearSequence(); setVictoryPhase('done')`。それ以外は no-op |
| SE | `sfx.victory()`／jingle は `beatStartMs` の timer で**既に発火済み**（beat に入った時点）。skip で二重に鳴らない。beat 前（collapse 中）は skip 不可＝音が飛ばない |
| race | `later(() => setVictoryPhase('done'), rewardMs)` と安全弁は残っていても `done`→`done` で冪等。`clearSequence()` で消す。`presentationDone` は `victoryPhase==='done'` だけを見る |
| 誤操作 | skip は「結果を出す」だけ。報酬（`rewardOpen`）・再戦・戻るは既存ボタンを押さないと動かない。舞台の tap がボタンに届かない（舞台は z 7・ボタンは結果 mount 後に z 10 で上） |
| outcome／save／score | 不変（表示層の phase のみ） |
| 初回 vs 繰り返し | **表示は同じ**（判定に新 state を持たない）。繰り返しのプレイヤーは skip で ≈2.6s 短縮（1,490→640 の 850ms＋段階表示 1.9s） |
| tests | `resolveVictorySkip(phase)` を純関数に切り出し：`beat`→`done`、他→不変 |

## 9. reduced-motion
- 既存：collapse 250・beat 600・`victory-beat` は 0.6s・staging は `animation: none`（`battle.css:4211-`）
- Pilot：舞台の暗転・帯のスライド・円の上昇・字間アニメを**なし**（静止で即表示）。「勝利」「神名 × 敵名」「First Clear 1 行」は表示。結果 mount は既存の 920ms（reduced 時刻表）。skip も有効
- 情報を失わない：神・敵の identity（円と文字）・勝利の事実・結果の全内容

## 10. sound plan（新規 SE 0）
| 場面 | 音 | 変更 |
|---|---|---|
| 最後の一撃 | `hit_l4`（1.0） | なし |
| 舞台開始（640） | `victory_sting`（≈1.0s・0.72）＋`victory` ジングル（BGM pause → 終了で復帰、`JINGLE_MAX_MS` でフェード） | **なし**（時刻も同じ） |
| 「勝利」文字（860） | なし | 追加しない |
| 神の一撃の音の再利用 | 使わない（Tier の混同） | — |
| ducking | 既存（`playJingle` が `bg.pause()`） | なし |
- 耳での確認：**未確認**。音の変更は 0 なので Pilot の QA では「音が邪魔になったか」だけを聞く

## 11. First Clear の扱い
- `matchupClear`（`MatchupClearResult`）は `GAME_ENDED` の同一 tick で `useGameEngine` が `recordMatchupClear` を呼んで確定し、`BattleScreen` が prop で持っている。舞台 mount（640ms）時点で利用可能
- 舞台の副題：`describeMatchupClear(matchupClear)` が非 null のときだけ 1 行（「✨ 初撃破：大耀 × 蒼海の龍神（この敵 1/7 神）」「✨ 大耀で七体すべての敵を撃破」等）。結果カードの同文言は**そのまま残す**（内容不変）
- 通常勝利と First Clear で**長さ・音・動きは変えない**（副題の有無だけ）。新ルール・新 state 0

## 12. Result UI との境界
- `GameOverOverlay` の JSX・文言・順序・`data-testid`・ボタン・`resultHub`／`resultTransitions`／mastery／records／49 Matchup／OTOMO 進捗／Next Goal／再戦：**不変**
- 足すのは ①`game-over-card-won` への `is-staged-skip` class（tap で段階表示を全表示・CSS のみ）②舞台が背景にあることによる**カード背景の透過度**（`#0b0d17` → 92%）。②は見た目のみ。②を入れない場合でも成立する（任意）
- Result Hub の redesign はしない

## 13. additional wait time
**0ms**。着弾 → 結果 mount 1,400ms・結果 mount → ボタン 1,900ms は現状と同一。skip で短縮のみ。reduced も同一。

## 14. new timers
**0**。舞台の段階は CSS `animation-delay`（0.2／0.3／0.34／0.46s）で、起点は既存の `beatStartMs` timer 1 つ。skip は既存 timer の解除。

## 15. assets
画像 0・動画 0・SE 0・H3 0。使うのは `gods/<id>/keyvisual.webp`（既存）・`GOD_THEME_COLOR`・`KEYVISUAL_OBJECT_POSITION`・既存 keyframes（`resonance-cutin-band-in`／`-rays-in`／`-title-in`）・既存 SE。preload 1 行のみ。

## 16. bundle estimate
CSS ≈110 行（≈2.5KB・gzip 後 ≈0.7KB）＋`VictoryStage.tsx` ≈70 行＋`BattleScreen`／`useCombatPresentation` の差分 ≈25 行（≈1.5KB）。**≈4KB（≤6KB）**。

## 17. affected files（実装時）
| # | ファイル | 変更 |
|---|---|---|
| 1 | `src/components/battle/VictoryStage.tsx`（新規） | 舞台の表示専用コンポーネント（godId・enemyName・matchupClear・reduced・onSkip） |
| 2 | `src/components/battle/BattleScreen.tsx` | `victory-beat` ブロックを `<VictoryStage>` に置き換え（`data-testid="victory-beat"` は維持：`scripts/phase6-audit/*`・`phase6-commercial-benchmark/play.mjs` が参照）。keyvisual の preload 1 行。`done` 以降も舞台を背景として残す条件 |
| 3 | `src/components/battle/useCombatPresentation.ts` | `skipVictoryBeat()` を返す（`resolveVictorySkip` 純関数） |
| 4 | `src/components/battle/battle.css` | 舞台・背景化・`is-staged-skip`・reduced-motion |
| 5 | `src/components/battle/GameOverOverlay.tsx` | `is-staged-skip` の付与（onPointerDown で state 1 つ）。内容不変 |
| — | `combatTimeline.ts`／`enemyVfxTiming.ts`／`src/core` | **変更なし** |

## 18. tests（追加のみ・既存は不変）
1. `victoryStage.test.ts`：7 神すべてで keyvisual URL・`KEYVISUAL_OBJECT_POSITION`・`GOD_THEME_COLOR` が定義済み／副題は `describeMatchupClear` と一致／reduced で class が付く
2. `useCombatPresentation`：`resolveVictorySkip('beat')==='done'`・他は不変
3. `combatTimeline.test.ts`：`planVictory` の既存値が不変（既存テストで担保）
4. `GameOverOverlay`：`is-staged-skip` の付与だけ（既存の DOM テストは不変）
5. 受け入れ：`victory-beat` の testid が残ることを `scripts/phase6-audit/qa.mjs` で確認

## 19. risks
| リスク | 対処 |
|---|---|
| 「結果 modal を豪華にしただけ」になる | 舞台は結果の前（640〜1,490）に**勝利の事実・神・敵**だけを出し、結果はその後ろで従来どおり。スコアは secondary のまま |
| 神の一撃より長くなる | 時刻表不変（≈3.3s 対 ≈3.4s）。skip あり |
| 繰り返しで鬱陶しい | skip 2 段階（舞台・段階表示）。表示は毎回同じで、学習すれば 1 tap で結果 |
| 舞台が戦場を隠す | 暗転 60%・帯は中央 44vh。結果 mount 後は 40% に落とす。崩壊（〜780ms）は帯の下で見える |
| SP で文字が潰れる | カットインと同じ `clamp` 値（SP QA 済み） |
| skip の race | `clearSequence()`＋冪等な `done`。beat 前は不可 |
| 7 神で崩れる | 円形 crop は既存値・6-D で 7 神確認済み。笑蓮の正方形も円なら顔中央 |
| 崩壊と二重演出 | 崩壊は 260〜780、舞台は 640〜。重なる 140ms は暗転 0.2s のフェード中。敵の消滅は帯の下で完了 |
| keyvisual の pop-in（再開時） | preload 1 行 |
| 決定207（CTA 初期可視） | 舞台は fixed で flow に入らない。カードの高さ不変 |
| z-index | 舞台 z 7 ＜ 報酬 z 9 ＜ 結果 z 10（既存順序を維持） |

## 20. rollback
`VictoryStage.tsx` 削除＋`BattleScreen.tsx`・`useCombatPresentation.ts`・`battle.css`・`GameOverOverlay.tsx` の明示パス revert。`victory-beat` の既存 keyframes は残す。`src/core`・保存データに影響なし。

## 21. Human QA 最終 5 問（同一 seed・同一神・敵・デッキ・難易度。Before＝Production、After＝Pilot）
1. 敵を倒した瞬間が、Before より「勝負が決まった」と感じられましたか？
2. 「この神でこの敵を倒した」という達成感が、Before より強くなりましたか？
3. 戦闘から結果画面までが、一続きのクライマックスに感じましたか？
4. 人気商用ゲームに近い完成度・高級感に、一歩近づいたと感じましたか？
5. 演出が長い・邪魔・毎回見るのが面倒だと感じましたか？（skip を使ったかも記録）

成功：Q1〜Q4 YES・Q5 NO。補助観察：2 戦目で skip を使ったか／SP で文字が読めたか／音が邪魔になったか。

## 22. implementation model
Fable 5.1（現行）または Opus 5 系で妥当。難所は z-index と skip の phase 遷移で、いずれも既存パターン（カットインの handoff・`later()`）の範囲。

## 23. Verdict
**GO WITH MODIFICATIONS**（M1〜M5・§4）

## 24. NEXT NOW（1 つ）
**CEO の GO を受けて、新ブランチ `feat/d226-victory-reveal`（master `862367f` から）で §17 の 5 ファイルと §18 のテストを実装し、Release Gate と Before/After Human QA 環境を用意する。** GO まで runtime には触れない。

---

## 25. 実装記録（2026-09-24・CEO GO 後）— **PENDING HUMAN QA**

### 25-1. Preflight の訂正（時刻表）
§1・§2 の時刻に計算ミスがあった。最後の一撃の hit stop（90ms）を崩壊開始に足していなかった。**実コード（不変）の値は次のとおり**（カード本体で撃破・着弾 90 の例）：

| 段階 | Preflight の記載 | 実コード |
|---|---|---|
| 崩壊開始 | 260 | **350**（90＋stop 90＋170） |
| 拍（舞台）開始 | 640 | **730** |
| 結果 mount | 1,490 | **1,580** |
| ボタン表示 | ≈3,390 | **≈3,480** |

時刻表そのもの（`planVictory`）は変えていないため、設計（追加待機 0ms）への影響はない。テスト `victoryReveal.test.ts` は実コードの値で固定した。

### 25-2. ブランチ・変更
- worktree `C:/Users/kimi1/SevenGodsGame-d226`・ブランチ `feat/d226-victory-reveal`（master `862367f` から）・HEAD **`5263c3d`**（local commit・未 push）
- 変更 7 ファイル：`VictoryStage.tsx`（新規）・`victoryReveal.ts`（新規・段階表示 skip の判定）・`victoryReveal.test.ts`（新規）・`BattleScreen.tsx`・`useCombatPresentation.ts`・`GameOverOverlay.tsx`（class と tap skip のみ・内容不変）・`battle.css`
- 変更なし：`src/core`・`src/hooks`・`public`・`combatTimeline.ts`・`enemyVfxTiming.ts`・SE・BGM

### 25-3. 自動 Gate
| # | Gate | 結果 |
|---|---|---|
| 1 | targeted tests | `victoryReveal.test.ts` 4 PASS |
| 2 | full tests | 93 files PASS／6 skipped・**1,167 PASS**／9 skipped |
| 3 | typecheck（`tsc -b --noEmit`） | PASS |
| 4 | lint（`oxlint src`） | 0 件 |
| 5 | clean build | PASS。`index-B1Bpf-GW.js` 437.39KB／`index-D9GkTIr_.css` 155.82KB |
| 6〜9 | `src/core`・assets・gameVersion・save schema | 差分 0（`src/core`・`src/hooks`・`public` の diff 0。同一 seed で Before／After のスコア一致） |
| 10 | 新規 timer | 0（diff に `setTimeout`／`setInterval`／`requestAnimationFrame` の追加なし） |
| 11 | 追加の強制待機 | **0ms**（25-4） |
| 12 | skip race | 舞台 click → 結果、結果 click → 全表示。報酬オーバーレイは開かない・スコア・outcome 不変（25-5） |
| 13 | 勝利音の重複 | 0（勝利ジングルの再生 1 回／戦。skip しても 1 回） |
| 14 | First Clear | 初回の勝利で `✨ 初撃破：<神> × <敵>（この敵 1/7 神）` が舞台に出る（14 run） |
| 15 | 繰り返しの勝利 | 同じ組み合わせの 2 戦目は副題なし（PC・SP） |
| 16／17 | PC／SP | 25-6 |
| 18 | reduced-motion | 25-7 |
| 19 | console error | 0（全 run） |

**bundle 差（Production 比）**：JS 434.88→437.39KB（**+2.51KB**）・CSS 150.52→155.82KB（**+5.30KB**）＝**+7.81KB**。gzip では JS +0.81KB・CSS +1.15KB＝**+1.96KB**。**目標 6KB（非圧縮）を 1.8KB 超過**。舞台の CSS 規則だけで約 4.8KB（円・帯・光・明朝・SP・reduced）。段階表示 skip のセレクタは `:is()` で圧縮済み。これ以上の削減は演出の削除になるため行っていない。

### 25-4. Before／After timing（同一 seed・同一手順・PC 1508×660・撮影なし・崩壊開始＝0）
| run | 崩壊→舞台（拍） | 崩壊→結果 mount | 崩壊→ボタン表示 | スコア |
|---|---|---|---|---|
| Before 1 | 440 | 1,233 | 3,290 | 9,720 |
| After 1 | 393 | 1,206 | 3,295 | 9,720 |
| Before 2 | 328 | 1,188 | 3,222 | 9,720 |
| After 2 | 377 | 1,233 | 3,279 | 9,720 |
- 理論値（崩壊→拍 380・→結果 1,230）と一致し、Before／After の差は揺れ（±50ms）の範囲。**追加の強制待機 0ms**
- 最後の一撃→崩壊は両ビルドとも着弾＋90＋170ms（コード不変）

### 25-5. skip（最短時間・同一 seed）
| run | 崩壊→舞台 click | →結果 mount | →結果 click | →ボタン表示 |
|---|---|---|---|---|
| Before（click しても何も起きない） | 497 | 1,209 | 1,321 | 3,237 |
| **After（PC）** | 595 | **760** | 905 | **984** |
| After（SP・1 戦目） | 667 | 781 | 850 | 938 |
| After（SP・2 戦目） | 484 | 597 | 709 | 752 |
- **skip でボタンまで約 2.3 秒短縮**（3.2 秒 → 0.75〜1.0 秒）。舞台は拍に入って約 60ms 以降に click できる
- skip しても：勝利ジングル 1 回・報酬オーバーレイは開かない・スコア同一・結果の内容同一
- 段階表示 skip はボタン・リンク・折りたたみを押しても発火しない（`isStagedSkipTarget`・テスト済み）。舞台の skip は click（pointerdown ではない）なので、同じ指の click が結果画面のボタンに落ちない

### 25-6. 7 神 × 敵（PC・SP）
- 恵比寿×試練の影／大耀×蒼海の龍神／蒼毘×業斧の鬼将／才華×銀甲の機工師（SP は業斧の鬼将）／寿楽×双牙の魔獣／福永×藍花の怨霊／笑蓮×乱舞の道化
- **7 神とも PC・SP で顔が円に収まり、神名 × 敵名・初撃破の 1 行が折り返さずに表示**（笑蓮の正方形・横構図も円なら顔が中央）。SP は縦並び（円 188px・「勝利」46〜52px）
- 結果 mount 後：PC は結果カードの左右に円と帯の端が残る。SP は結果カードが幅いっぱいのため、背景の舞台はほぼ見えない（上下の帯の線だけ）
- 自動操作が負けた戦闘（SP の才華×機工師）では舞台は出ず、敗北の結果がそのまま出る（勝利のときだけの演出であることを確認）
- **決定225 の SP 既存問題（バフでプレートが縦に伸び、共鳴が 1 文字幅に潰れる）**：本 Pilot の CSS はプレート・共鳴・HUD・手札のセレクタに触れていない（diff で確認）。悪化なし。修正はしておらず、別 Issue として保持

### 25-7. reduced-motion
- 舞台：暗転・帯・円・文字がすべて静止表示（0.2s の不透明度のみ）。勝利・神名・敵名・初撃破は表示（PC・SP）
- 時刻表は既存の reduced 値（崩壊 250・拍 600）のまま。結果は崩壊から約 800ms で mount、段階表示は既存どおり即時

### 25-8. Known Risk（変更なし・保持）
- 神の一撃直後の⚡数字隣接／SP で READY カードが横スクロール外／共鳴 7 直後の短い入力窓／未使用の金の斬撃線 CSS
- 決定225 の SP プレート縦伸び・共鳴パネル潰れ（別 Issue）
- 本 Pilot の追加：①追加容量が目標超過（+7.8KB・gzip +2.0KB）②SP では結果 mount 後の舞台（背景）がほとんど見えない ③Before／After は別ポート＝別オリジンのため、ブラウザの保存（初撃破の記録）は別々（After では各組み合わせの初回に副題が出る）

### 25-9. 状態
**Decision226 = PENDING HUMAN QA**。push／merge／deploy なし。

---

## 26. Human QA 結果（2026-09-25・CEO 判定）— **PASS**

| # | 質問 | 回答 |
|---|---|---|
| Q1 | 敵を倒した瞬間が、Before より「勝負が決まった」と感じられたか | **YES** |
| Q2 | 「この神でこの敵を倒した」達成感が Before より強くなったか | **YES** |
| Q3 | 戦闘から結果画面までが一続きのクライマックスに感じたか | **YES** |
| Q4 | 人気商用ゲームに近い完成度・高級感に一歩近づいたか | **YES** |
| Q5 | 演出が長い・邪魔・毎回見るのが面倒だと感じたか | **NO** |

成功条件（Q1〜Q4 YES・Q5 NO）をすべて満たした → **Decision226 Human QA = PASS**。
環境：Before `http://127.0.0.1:4186/?seed=d226-qa-01`（Production `862367f`・`index-r-PY8CVw.js`）／After `http://127.0.0.1:4188/?seed=d226-qa-01`（`5263c3d`・`index-B1Bpf-GW.js`）。LAN からも同じポートで配信（`--host 0.0.0.0`）。
Human QA PASS 後の追加改善・仕様変更は行っていない。

## 27. Production Release Gate（2026-09-25）— **PASS／Release Blocker 0 → READY FOR CEO PRODUCTION RELEASE APPROVAL**

判定は **AI 判断**（CLAUDE.md §6-2）。Production 反映は CEO 承認事項（§6-3-8）。**merge／push／deploy はしていない。** runtime の変更 0（監査のみ）。

### 27-1. Baseline と RC
| 項目 | 値 |
|---|---|
| master＝origin/master＝Production | `862367f`（Vercel 配信 `index-r-PY8CVw.js`／`index-CRMbnJyl.css` を GET で確認） |
| RC | ブランチ `release/d226-victory-reveal-rc`＝**`5263c3d`**（新規 worktree `C:/Users/kimi1/SevenGodsGame-d226-rc`・`npm ci` のクリーン環境）。`5263c3d` の親は master `862367f` そのもの＝**clean master の上に commit 1 つ**。新規 commit は作っていない（Human QA 済みの commit をそのまま RC にした） |
| RC build | `index-B1Bpf-GW.js`／`index-D9GkTIr_.css`＝**Human QA の After と同一ハッシュ**（QA で見た bundle と byte 同一） |

### 27-2. Isolation（機械比較）
| 確認 | 結果 |
|---|---|
| 変更ファイル | `src/components/battle/` の 7 ファイルのみ（`BattleScreen.tsx`・`GameOverOverlay.tsx`・`VictoryStage.tsx` 新規・`battle.css`・`useCombatPresentation.ts`・`victoryReveal.ts` 新規・`victoryReveal.test.ts` 新規）・+468／−16 |
| `src/core` | git tree hash が master と一致＝**差分 0** |
| `src/hooks`（保存・storage） | tree hash 一致＝差分 0。diff に `localStorage`／`sevengods.*` の追加 0 |
| save schema／keys | `saveVersion` 9 のまま。勝利後の localStorage は Before と**キー 6 種・値とも同一**（時刻のみ正規化して比較） |
| gameVersion | 指紋の入力（`src/core` の data・rules）が byte 同一＝意図しない変更 0 |
| assets | `public` tree hash 一致。build 出力の非 bundle 210 ファイルが Production build と **md5 一致**。新規 画像／動画／SE **0** |
| `package.json`／lock／`vite.config.ts`／`index.html` | 一致 |
| 決定213（構え）混入 | **0**（追加行に `stance`／`構え`／`溜め返し`／`STANCE_`／`otomoStance` の一致 0。RC の tree に `otomoStance*`・`stanceDeckSwap*` なし） |
| H3／Living Background／決定219〜223 の実験コード | **0**（追加行に `living`／`h3`／`envVfx`／`breath`／`lighting`／`決定219〜223` の一致 0。RC の tree に該当ファイルなし） |
| 新規 timer | **0**（diff に `setTimeout`／`setInterval`／`requestAnimationFrame` の追加なし） |
| 入力ブロック判定 | `isPlayerTurn`・`pendingCardUid`・`CARD_PLAY_REVEAL_MS`・`cutinActive`・`planVictory` のコード変更 0（`VICTORY_BEAT_*` は旧「撃破！」の CSS 変数から外れただけ） |

### 27-3. Automated Gate（RC worktree の `src` のみ・agent copy を含めない）
| # | Gate | 結果 |
|---|---|---|
| 1 | targeted（`victoryReveal`・`combatTimeline`・`readyMaterial`） | 3 files・**26 PASS** |
| 2 | full（`vitest run --dir src`） | **93 files・1,167 PASS**・fail 0 |
| 3 | typecheck（`tsc -b --noEmit`） | exit 0 |
| 4 | lint（`oxlint src`） | 0 件 |
| 5 | clean build（`rm -rf dist && npm run build`） | PASS |

### 27-4. ブラウザ QA（Playwright・RC `:4189` と Production `:4186` を同一 seed・同一 bot で 1 本ずつ）
seed `d226-qa-01`・大耀 × 蒼海の龍神・PC 1508×660／SP 390×844（touch）。1 戦目＝初撃破（skip なし）、同じ context で 2 戦目＝再撃破（舞台 tap → 結果 tap、いずれも**同一フレームに 2 回＝二重タップ**）。

| 確認 | PC | SP |
|---|---|---|
| 通常勝利 → 舞台（`victory-beat` live） | ✅ | ✅ |
| 神の円形ポートレート（keyvisual 読込・`object-position 50% 30%`・画面内） | ✅ 224px | ✅ 172px |
| 「勝利」／神名 × 敵名（折り返しなし） | ✅ 76px 明朝 | ✅ 46.8px |
| 初撃破の 1 行（舞台・結果の両方） | ✅ | ✅ |
| 再撃破で初撃破表示なし（舞台・結果とも） | ✅ | ✅ |
| 舞台 tap → 結果 | ✅ tap 後 52ms で結果 | ✅ 31ms |
| 段階表示 tap → 全表示（`game-over-card-skipped`） | ✅ 残りは各要素のフェード（≤0.44s）で完了 | ✅ ≤0.24s |
| 二重タップ | 結果 1 回・報酬の自動オープン 0・勝利ジングル 1 回 | 同左 |
| 報酬ボタン → 報酬 3 枚（威嚇／守りの陣／共振） | Before と同一 | 同一 |
| 報酬確定後の出口（今日の神域挑戦へ／デッキを調整／同じ構成でもう一度） | Before と同一 | 同一 |
| 再戦「同じ構成でもう一度」→ seed `d226-qa-01`・大耀・`enemy_06`・R1・デッキ 20 | Before と同一。再戦開始時に舞台は残らない | 同一 |
| スコア（skip あり／なし） | 全戦 **8,090**（Before も 8,090） | 同 |
| 勝利ジングル | 各戦 1 回（`victory.webm`） | 同 |
| 敗北（恵比寿 × 蒼海の龍神・無操作） | 舞台 0（`victory-stage`／`victory-beat` 一度も出ない）・「敗北」・`defeat.webm` | 同 |
| console error／外部通信 | 0／0（全 run） | 0／0 |
| 保存互換（Production で R2 まで進めた v9 保存 → RC で「続きから」） | 盤面（R2・HP）一致で再開 → 勝利・舞台表示・error 0。勝利後のリロードで舞台は再表示されない | — |

### 27-5. Reduced Motion（PC・SP）
- 舞台のアニメーションは `resonance-cutin-static-in`（不透明度のみ）に置換、ポートレートの上昇は `none`
- 勝利・神名・敵名・初撃破の 1 行・ポートレートが**すべて不透明度 1**で表示（PC・SP とも計測）＝情報欠損 0
- 時刻表は既存の reduced 値のまま（最後の手 → 結果 mount：Before 1,464／1,501ms、RC 1,501／1,465ms）

### 27-6. Timing／Interaction（最後の手の click＝0。Before／RC）
| 条件 | → 結果 mount | → ボタン表示 |
|---|---|---|
| PC 通常 | 2,071／2,045 | 4,114／4,123 |
| SP 通常 | 2,056／2,033 | 4,077／4,084 |
| PC reduced | 1,464／1,501 | 1,862／1,942 |
| SP reduced | 1,501／1,465 | 1,894／1,834 |
- 差は −36〜+80ms で符号がそろわない＝計測の揺れ。**追加の強制待機 0ms**
- **入力ブロック**（1 手ごとの click → 次に操作可能まで・17 手の中央値）：Before 324／338／316／318／317／339ms、RC 329／326／318／309／307／300ms ＝**増分 0**
- skip の最短経路：最後の手 → ボタン表示が PC 4,123 → **1,928ms**、SP 4,084 → **1,766ms**

### 27-7. 決定224 Regression（seed `d223-pilot-01`・大耀 × 蒼海の龍神・READY を温存する bot。PC・SP とも Before と完全一致）
| 確認 | 結果 |
|---|---|
| 豪快な一撃 READY | 成立 1 回・点火 2 回（2 枚）＝**再点火 0**（Before 同値） |
| 通常⚡ | 34px 金 `rgb(255,209,102)`・`float-up-bonus`（2 回） |
| 撃破と重なる⚡ | 52px 金 `rgb(255,224,138)`・`float-up-max`（seed `d226-qa-01` の撃破⚡-100 で実観測） |
| 金リング（`impact-ring-payoff`） | 2 回（Before 同値） |
| 共鳴／神の一撃 | カットイン 1 回／戦（Before 同値） |
| スコア | 7,900（Before 同値） |

### 27-8. Bundle（Production `862367f` 比・RC clean build）
| | Production | RC | 差 |
|---|---|---|---|
| JS raw | 434,883 B | 437,394 B | **+2,511 B（+2.45 KiB）** |
| JS gzip（`gzip -9`） | 132,207 B | 132,961 B | **+754 B** |
| CSS raw | 150,526 B | 155,820 B | **+5,294 B（+5.17 KiB）** |
| CSS gzip（`gzip -9`） | 27,836 B | 28,951 B | **+1,115 B** |
| 合計 | | | raw **+7,805 B**／gzip **+1,869 B**。新規 画像／動画／SE **0** |

### 27-9. Blocker
**0 件**

### 27-10. Known Risk（記録のみ・今回は修正しない）
1. **決定225 の SP 既存問題**：buff 3〜4 個で God／enemy plate が縦に伸び、Resonance panel が潰れて情報欠損。決定226 は該当セレクタに触れていない（悪化なし）。**Release 後の「② SP 緊急修正」として別 Decision で扱う**
2. 舞台上の初撃破の 1 行は拍（850ms）の 0.46s 目から 0.3s でフェードインする設計。早い tap の skip では舞台上で見えないことがあるが、結果カードに同じ文言が必ず出る（情報欠損なし）。headless 計測ではフレーム落ちで不透明度のサンプルが揺れた（0〜1）
3. 段階表示の tap skip は「待ち時間を 0 にする」方式で、残りの要素は各自のフェード（≤0.44s）で出る。瞬時ではない
4. 追加容量が Preflight の目標（6KB）を超過（raw +7.8KB・gzip +1.9KB）。§25-3 のとおり
5. SP では結果 mount 後の舞台（背景）がほとんど見えない（§25-8）
6. 既存：神の一撃直後の⚡数字の隣接／SP で READY カードが横スクロール外／共鳴 7 直後の短い入力窓／未使用の金の斬撃線 CSS

### 27-11. 判定
**PASS — Release Blocker 0 → READY FOR CEO PRODUCTION RELEASE APPROVAL**
- RC：`release/d226-victory-reveal-rc` HEAD `5263c3d`（local のみ・未 push）
- master `862367f`・origin/master＝Production `862367f` 不変。merge／push／deploy なし
- 本文書と DECISIONS.md は main worktree の未 commit docs に記録（RC に docs を載せていない＝過去の未 Release docs／runtime を混ぜない）

### 27-12. Release 手順（CEO 承認後に実行。本 Gate では実行しない）
1. `git checkout master && git merge --ff-only release/d226-victory-reveal-rc`（`862367f` → `5263c3d`）
2. `git push origin master` → Vercel 自動 deploy → 配信 bundle が `index-B1Bpf-GW.js`／`index-D9GkTIr_.css` であることを確認
3. Production Smoke QA（空のコンテキスト）→ 決定227 として記録
4. Rollback 先：Vercel Instant Rollback で deployment `6620066497`（＝`862367f`）。保存データの巻き戻しは不要（saveVersion 不変）

---

## 28. Production Release（決定227）— **PRODUCTION RELEASE PASS / CLOSED**（2026-09-25 JST・CEO 承認）

| 項目 | 値 |
|---|---|
| 承認 | CEO「Decision226 Production Release 承認。§27-12 の手順で Release」 |
| Release 直前 | master＝origin/master＝`862367f`／RC `release/d226-victory-reveal-rc`＝`5263c3d` |
| merge | `git fetch . release/d226-victory-reveal-rc:master`（fast-forward のみ・master は未チェックアウトのため checkout なし）`862367f..5263c3d` |
| push | `git push origin master`（03:25 JST・`862367f..5263c3d`） |
| Vercel | deployment **`6645113068`**（sha `5263c3d`・Production）success |
| 配信 bundle | `index-B1Bpf-GW.js`／`index-D9GkTIr_.css`。RC clean build と **md5 一致** |
| Rollback 先 | Vercel Instant Rollback で deployment `6620066497`（＝`862367f`）。saveVersion 不変のため保存データの巻き戻し不要 |

### 28-1. 「含まれていない」確認
- 配信 JS に `otomoStance`／`溜め返し`／`連撃の構え`／`stance-deck-swap` の一致 0（決定213 は含まない）。`victory-stage` は含む
- Production と Production 直前の差は §27-2 の 7 ファイルのみ

### 28-2. Production Smoke QA（`https://seven-gods-game.vercel.app`・Playwright・空のコンテキスト・seed `d226-qa-01`・大耀 × 蒼海の龍神）
| 確認 | PC 1508×660 | SP 390×844 |
|---|---|---|
| 舞台（live）・ポートレート・勝利・神名 × 敵名 | ✅ 224px | ✅ 172px |
| 初撃破（1 戦目のみ）／再撃破で非表示 | ✅ | ✅ |
| 舞台 tap（二重）→ 結果 | ✅ | ✅ |
| 段階表示 tap（二重）→ 全表示・報酬の自動オープン 0 | ✅ | ✅ |
| スコア | 8,090（両戦・RC Gate と同値） | 8,090 |
| 報酬 3 枚・出口・再戦（同 seed・同構成） | RC Gate と同一 | 同一 |
| 勝利ジングル | 各戦 1 回 | 各戦 1 回 |
| 決定224：撃破⚡ 52px 金／通常⚡ 34px 金（計算値） | ✅ | ✅ |
| 敗北で舞台 0 | ✅ | — |
| 入力ブロック中央値 | 315／326ms（Gate と同水準） | 322／313ms |
| console error／外部通信 | 0／0 | 0／0 |

### 28-3. Known Risk（そのまま引き継ぐ）
§27-10 のとおり。最優先の次作業は **決定225 の SP 既存問題（buff 3〜4 個で plate 縦伸び・Resonance panel 潰れ）＝「② SP 緊急修正」を別 Decision で**。

### 28-4. 状態
**Decision226 Victory Reveal v1 = PRODUCTION LIVE / CLOSED**。Production＝master＝origin/master＝`5263c3d`。
