# 決定249 — Reaction Language v1 Narrow Pilot（実装 → Fast Gate → Human QA READY）

- 日付：2026-09-28
- 実装 GO：**CEO**（「Decision249 Reaction Language v1 Narrow Pilot を開始」）。実装方式・Gate 判定は **AI 判断**（CLAUDE.md §6-2）
- 仕様の正：`docs/REACTION_LANGUAGE_V1_AUDIT.md`（決定248）§4・§9 と `docs/evidence/decision248/proposed-primitive-table.md`
- Baseline：Production **`bcfd530`**（決定247 LIVE）
- 作業：worktree `C:/Users/kimi1/SevenGodsGame-d249`・branch **`feat/d249-reaction-language-v1`**（`bcfd530` から）・local commit **`b1ae088`**。**merge／push／deploy なし**
- 判定：**自動 Fast Gate PASS → HUMAN QA READY**（§8）
- 証拠：`docs/evidence/decision249/`（Fast Gate の `gate.json`・`summary.tsv`・スクリーンショット 24 枚・スクリプト原文・QA seed）

---

## 0. 結論（先に）

| 項目 | 結果 |
|---|---|
| 変更 | runtime 8 ファイル（新規 2・既存 6）＋テスト 2（新規）。core／data／save／gameVersion：**0** |
| semantic | `cardSemantic.ts`：効果データだけから 7 semantic を導く純関数。**60/60・unknown 0**（STRIKE 20／GUARD 11／MEND 9／WEAKEN 7／ATTUNE 6／TEMPO 5／EMPOWER 2＝決定248 と一致）。PAYOFF／RISK／SETUP は modifier |
| primitive | P1 STRIKE 既存のまま。新規 5：brace（神）／breathe（神＋OTOMO 小）／stagger（敵の外側 wrapper）／rise（神・共鳴色／金）／deal（札＋神力ゲージ）。**1 バッチに体の primitive は 1 つ以下**（突き・被弾・神の一撃・敵ターン・決着のバッチでは出さない） |
| Gate | tsc 0／lint 0／**1,261 PASS**（＋26）／build OK／console error 0。Fast Gate（Playwright・PC／SP × Before／After × 2 戦 ＋ reduced）で **7 semantic すべて「正しい主体だけ」が反応**、Before は rl-* 0、layout 箱差 0px、敵の反転・予告・横スクロール不変、入力ロック中央値 294ms（Before 294ms） |
| Gate 中の修正 | 反応の再マウントで直前の突き（`god-strike`）が再生される不具合を発見→修正（反応中は突きクラスを外す）。rise の specificity（既定のリム規則 0,3,0 に負けていた）→修正 |
| bundle | CSS 167.74→170.97KB（**+3.2KB**・gzip +0.5KB）／JS 441.16→444.93KB（**+3.8KB**・gzip +1.4KB） |
| Human QA | Before `:4251`（Production dist）／After `:4252`。PC `127.0.0.1`・iPhone `192.168.11.6`（ファイアウォール一時許可が必要・§8）。3 問・3/3 YES で PASS |

## 1. 変更ファイルと diff（`git diff --stat bcfd530 b1ae088`：10 files・+723／−8）

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/components/battle/cardSemantic.ts` | 新規 | `semanticScores`／`primarySemantic`／`secondarySemantic`／`semanticModifiers`／`PRIMITIVE_OF`／`planReaction`。重み＝damage 1・block 1・heal 1・draw 4・gainAp 4・buff 2・debuff 2・resonance 2.5・加護＝min×5。同点は `SEMANTIC_ORDER`。⚡と自傷は数えない |
| `src/components/battle/useReactionLanguage.ts` | 新規 | `useLayoutEffect` で新しいバッチだけを `planReaction` に通し、key（brace／breathe／rise＋tone／stagger／otomo／deal＋uid／apFlash）と `last` を配る。`useBattleFx` とは独立 |
| `PlayerPanel.tsx` | 既存 | `reaction` prop。`.player-avatar-wrap` の key に反応回数を含めて再マウント。**反応中は突きクラス（god-strike 系）を外す**（再マウントで突きが再生されないため） |
| `EnemyPanel.tsx` | 既存 | `staggerKey` prop。`.enemy-reaction-idle`（index 0）に `rl-stagger`・key で再生。DOM 階層は不変。内側 `.enemy-avatar` に触れない |
| `GodOtomoPanel.tsx` | 既存 | `subtleKey` prop。figure 内の `img` だけ key 再マウント＋`rl-otomo-subtle`（ラベル無し・figure の `otomo-reacting`／`evolve-glow` と別要素） |
| `CardView.tsx` | 既存 | `dealt` prop → `card-view-dealt`＋`--rl-deal-delay`（枚数順 40ms）。`playing` 中は付けない（`card-play`／reduced の fade を奪わない） |
| `BattleScreen.tsx` | 既存 | hook 呼び出し・配線（`rl.last` が当該 primitive のときだけクラスを付ける＝古い反応を後の再マウントで再生しない）。神力ゲージに `rl-ap-flash` |
| `battle.css` | 既存 | 末尾 107 行追記。既定＝リム／明度／opacity の 120ms（`rl-rim-only`・`rl-stagger-dim`・`rl-otomo-rim`・`rl-deal-fade`・`rl-ap-flash`）。動き（`rl-brace` 0.32s／`rl-breathe` 0.4s／`rl-rise` 0.4s／`rl-stagger` 0.36s／`rl-otomo-subtle` 0.35s／`rl-deal` 0.16s）は **`@media (prefers-reduced-motion: no-preference)` の中だけ**（reduce ブロックを増やさない） |
| `cardSemantic.test.ts`／`useReactionLanguage.test.ts` | 新規 | 26 件（§4） |

runtime 全文：`git -C C:/Users/kimi1/SevenGodsGame-d249 diff bcfd530 b1ae088`。

## 2. semantic mapping result（G1／G2）
- 60/60 が一意の primary を持ち unknown 0（テストで固定）。内訳は決定248 の表と完全一致
- 託宣：加護＝GUARD／導き＝TEMPO／天啓＝STRIKE（同じ語彙）
- 複合札（24 枚）は primary の 1 つだけ体が動き、secondary は既存 HUD（バッジ・ゲージ・数字）
- 決定論：同じ効果列 → 同じ semantic → 同じ primitive（`PRIMITIVE_OF` は定数）

## 3. primitive implementation（数値は決定248 の上限内）

| primitive | 主体 | 動き（no-preference） | 既定／reduced | 時間 |
|---|---|---|---|---|
| brace | 神 | 相手の逆（`--atk-x`）へ 4px・下 2px・scale 0.98・盾色リム | リム 120ms | 320ms |
| breathe | 神＋OTOMO | 上 3px・scale 1.02・緑リム／OTOMO 上 3px・1.06 | リム 120ms | 400／350ms |
| rise | 神（ATTUNE は OTOMO も） | 上 2px・scale 1.03・共鳴紫／金のリム | リム 120ms | 400ms |
| stagger | 敵（外側 wrapper） | ±3px 2 往復・brightness 0.78 | 明度 120ms | 360ms |
| deal | 札・神力ゲージ | 下 8px から立ち上がる（1 枚 +40ms）・ゲージ明滅 200ms | opacity 120ms | 160ms |

新規 hit stop 0・新規数字 0・新規音 0・入力ロック追加 0（`CARD_PLAY_REVEAL_MS` 不変）。テスト G7 が `useReactionLanguage.ts`／`cardSemantic.ts` に `sfx`／`setTimeout`／`pendingCardUid` が無いことを固定。

## 4. 自動テスト（26 件・全体 1,261 PASS）
| Gate | テスト |
|---|---|
| G1 | 60/60・unknown 0・内訳一致 |
| G2 | 同じ効果 → 同じ semantic（コピーでも同じ）・`PRIMITIVE_OF` 固定 |
| G3 | 7 神 × 7 敵 × 3 seed を実 engine で進め、同 seed 2 回の state が完全一致・**gameVersion `1.6c581e56a02c0730`（決定246 と同じ）** |
| G8 | 全バッチで primitive 数 ≤ 操作数、体の primitive を出すバッチに `DAMAGE_DEALT` 0（二重発火 0）、STRIKE バッチは新規 0 |
| G5／G7 | CSS：末尾追記（決定247 の反転より後）・reduce の @media を増やさない・既定に translate／scale なし・体の動き ≤4px・時間 ≤0.4s・hit stop／数字／音／ロックの持ち込み 0 |
| planReaction | 抑止規則 6 種（strike／hit／burst／enemyTurn／ended／起点なし）と託宣 3 種 |

## 5. Fast Gate（Playwright・`docs/evidence/decision249/fast-gate/`）
- 構成：PC 1508×660／SP 390×844 × Before（Production `bcfd530` の dist・`:4251`）／After（`b1ae088`・`:4252`）× 大耀×蒼海の龍神（seed `rl-qa-7`）／寿楽×乱舞の道化（seed `rl-qa-32`）＋ PC After reduced＝**10 context・48 play**
- 各 play：クリック → 600ms の間 25ms ごとに主体のクラスと `getAnimations()` を採取 → 12 要素の layout 箱（pre／post・After vs Before の paired）・敵 `scale`・予告文字・横スクロール・in-page の入力ロック（MutationObserver）

| semantic | 出したカード | After で動いたもの（getAnimations） | 動かなかったもの | Before |
|---|---|---|---|---|
| GUARD | 鉄壁の構え／長生きの知恵／加護の託宣 | 神 `rl-brace` | 敵・OTOMO | rl-* 0 |
| MEND | 巫女の舞／浄めの光 | 神 `rl-breathe`＋OTOMO `rl-otomo-subtle` | 敵 | 0 |
| WEAKEN | 悪戯 | 敵 `rl-stagger` | 神・OTOMO | 0 |
| ATTUNE | 気まぐれ／神楽舞 | 神 `rl-rise`（tone-resonance）＋OTOMO | 敵 | 0 |
| EMPOWER | 姉御の号令 | 神 `rl-rise`（tone-power） | OTOMO・敵 | 0 |
| TEMPO | 予言／導きの託宣 | 札 `card-view-dealt` 2 枚／神力 `rl-ap-flash` | 神・敵・OTOMO | 0 |
| STRIKE | 一撃／渾身の一撃 | `god-strike`／`god-strike-heavy`（既存） | rl-* 0 | 同じ |

- reduced（PC After）：brace／breathe／rise → `rl-rim-only`、stagger → `rl-stagger-dim`、OTOMO → `rl-otomo-rim`。動きの keyframes は 0
- **layout 箱（After vs Before・同じ play の post）：12 要素 × 全 play で 0px**。pre／post の差（5／15／17px）は Before にも同じ値で出る＝盾・デバフのバッジが名札に増える既存の HUD 反応
- 敵の反転：全 context・全 play で `scale: -1 1`（決定247）不変。予告文字：全 play で不変。横スクロール：0。console error：**0／10 context**
- 入力ロック（in-page・カード 24 play）：**中央値 Before 294ms／After 294ms**。両側に散発的な大きい値（Before 481〜814ms・After 868〜1,515ms）が出るが、同じ play を再計測すると値が入れ替わる（Before 287→499、After 868→1,515）＝harness の採取ループ（25ms ごとの evaluate）と Playwright のスクリーンショットによる計測ノイズ。ロックの時間そのもの（`CARD_PLAY_REVEAL_MS`＝280・`pendingCardUid`）は触れておらず、G7 テストが固定

## 6. 回帰
- 全既存テスト PASS（1,235 → 1,261）。`gameVersion` 不変（データ変更 0）
- 保護：決定224（READY／⚡）・226・229／247（反転は `.enemy-avatar`・反応は外側）・232（reduce ブロック不変・突きは反応中に外す）・240（内側 filter 不変）・246（数値不変）
- OTOMO：ラベル無し・振幅は既存 pop の約 1/2・SP では 38〜50px なので「見えたら良い」扱い

## 7. Known issues
1. 入力ロックの計測に harness 由来の外れ値（§5）。Human QA で体感を確認
2. `disp`（pre／post）の 5〜17px は既存の HUD 反応（バッジ追加）。本 Pilot の対象外
3. OTOMO の小さな反応は SP では小さい（設計どおり）
4. 決定248 §7 のとおり、DEAL はラウンド開始のドローには付けていない（G8：発火 ≤ 操作数）

## 8. Human QA（CEO・PC と iPhone）

| 環境 | Before（Production `bcfd530`） | After（Pilot `b1ae088`） |
|---|---|---|
| PC | `http://127.0.0.1:4251` | `http://127.0.0.1:4252` |
| iPhone（同じ Wi-Fi） | `http://192.168.11.6:4251` | `http://192.168.11.6:4252` |
| 配信 bundle | `index-DgQr5ePZ.js`／`index-DRhlJuWv.css` | `index-C4FpTzqO.js`／`index-X2Ut_uct.css` |

- iPhone 接続には Windows ファイアウォールの一時許可が必要（管理者 PowerShell で `scratchpad/d249/qa-fw-add-d249.ps1`、QA 後に `qa-fw-remove-d249.ps1`・グループ「QA D249 (temp)」・TCP 4251／4252・LocalSubnet のみ）
- 推奨 2 戦（同じ seed で Before／After）：`?seed=rl-qa-7` 大耀 × 蒼海の龍神（R1 手札：鉄壁・一撃・予言・姉御の号令・巫女の舞）／`?seed=rl-qa-32` 寿楽 × 乱舞の道化（気まぐれ・渾身・悪戯・長生きの知恵・予言）。R2 で加護、R3 で導きの託宣

**3 問（3/3 YES で PASS）**
1. 攻撃・防御・回復など、カードの「意味の違い」が以前より感じられるか？
2. カードを使ったとき、God／OTOMO／Enemy が反応し、実際に戦っている感じが増えたか？
3. 演出がうるさすぎず、Enemy Intent・カード・HP を読む邪魔にならないか？

Human QA PASS 後に Release Gate を別途行う。本 Decision では merge／push／deploy をしない。

## 9. CEO Human QA — **PASS**（2026-09-28）

| 問 | 回答 |
|---|---|
| Q1 カードの「意味の違い」が以前より感じられるか | **YES** |
| Q2 God／OTOMO／Enemy が反応し、実際に戦っている感じが増えたか | **YES** |
| Q3 演出がうるさすぎず、Intent・カード・HP を読む邪魔にならないか | **YES** |

3/3 YES → PASS（CEO 判定）。Production Release を CEO が承認。

## 10. Release Gate → Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-29・Release は CEO 承認）

| 項目 | 結果 |
|---|---|
| Release Gate | worktree clean・branch `feat/d249-reaction-language-v1`・HEAD `b1ae088`・origin/master `bcfd530`・差分 1 commit／10 ファイル（すべて `src/components/battle/`。H3／神階／導き／Entry／Voice の混入 **0**）・fast-forward 可能・tsc 0／lint 0／1,261 PASS（balanceSim 11 は単独）・再 build の JS `b2557b14…`／CSS `79f30ae5…`＝Human QA 版（`:4252`）と同一 |
| 統合 | `git push origin b1ae088:refs/heads/master`（`bcfd530..b1ae088`）→ ローカル master も `b1ae088` |
| Vercel | Production deployment **`6713037626`**（sha `b1ae088`・success） |
| 配信 bundle | `index-C4FpTzqO.js`（md5 `b2557b14…`）／`index-X2Ut_uct.css`（md5 `79f30ae5…`）＝承認対象と一致 |
| rollback | Vercel `6711329060`（`bcfd530`・決定247） |

### Production Smoke（`https://seven-gods-game.vercel.app`・Playwright）— **PASS**
| 確認 | 結果 |
|---|---|
| semantic 7 種の代表 | PC 1508×660／SP 390×844 × 大耀×龍神（`rl-qa-7`）・寿楽×道化（`rl-qa-32`）＋ PC reduced＝6 context・42 play。GUARD→神 `rl-brace`／MEND→神 `rl-breathe`＋OTOMO／WEAKEN→敵 `rl-stagger`／ATTUNE→神 `rl-rise`（紫）＋OTOMO／EMPOWER→神 `rl-rise`（金）／TEMPO→札 2 枚＋神力明滅／STRIKE→既存の突きのみ。誤った主体の反応 0 |
| reduced-motion | `rl-rim-only`／`rl-stagger-dim`／`rl-otomo-rim` のみ。移動 keyframe 0 |
| Enemy flip／Intent | 全 play で `scale: -1 1`・予告文字不変 |
| God Strike | PC／SP の勝利ルート（大耀×龍神・攻撃連打）で共鳴 7→カットイン→一撃→R4 勝利を確認。敗北ルート（怨霊 R4 230）も正常 |
| console error／横スクロール | 0／なし（10 context） |

証拠：`docs/evidence/decision249/production-smoke/`（summary.tsv・gate.json・burst-victory-defeat.json・スクリーンショット）。

### 後片付け
- QA サーバー :4251／:4252 停止済み・一時ファイアウォール「QA D249 (temp)」0 件（作成されていない）
- worktree `SevenGodsGame-d249` は保持（過去の Release と同じ運用）
