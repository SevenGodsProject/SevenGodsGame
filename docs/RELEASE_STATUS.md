# SEVEN GODS 8/31 Public Beta リリースステータス（2026-08-31 Phase 2「Game Feel」追加・RELEASED）

8/31公開版の「確定状態」を一目で確認するための要約です。新しい仕様判断は含みません（詳細・根拠は`docs/DECISIONS.md` 決定119〜125を参照）。

## Release Summary

| 項目 | 状態 |
|---|---|
| **Release** | SEVEN GODS 8/31 Public Beta |
| **Production HEAD** | `38d706a` feat: add game feel phase (tiered feedback, SE, boss entrance, victory/defeat)（80点化計画 Phase 2、決定128） |
| **origin/master** | `38d706a`（local HEAD と完全一致、ahead/behind 0/0） |
| **Production URL** | https://seven-gods-game.vercel.app/ |
| **Production bundle** | `assets/index-BWFlr5zp.js`（`git archive 38d706a` の clean build と同一ハッシュを本番配信で確認） |
| **Production QA** | PASS（2026-08-31、Phase 2 Production Release Gate。下記「Production QA」参照） |
| **Final Verdict** | **RELEASED** |
| **8/31 Release Status** | **READY** |
| **Code Freeze** | 解除（80点化計画へ移行。Phase 1「神階」を決定126で採用・本番反映。以後は CLAUDE.md §6 のAI自律判断ポリシーで Phase ごとに進める。PV・BGMは変更しない） |

## Production Release commits（`7f89e9e` 以降）

| commit | 内容 | 決定 |
|---|---|---|
| `8b2a980` | feat: add boss stage backgrounds | 決定124 |
| `b38d1bb` | feat: improve mobile battle action visibility | 決定125 |
| `1aab902` | fix: prevent mobile auto focus after battle end | 決定125フォローアップ |
| `f579eb3` / `c260b07` | docs（RELEASE_STATUS・AI自律判断ポリシー） | — |
| `5552ae4` | feat: add shinkai stake ladder (神階Ⅰ〜Ⅶ) — 80点化計画 Phase 1 | 決定126 |
| `de69404` / `c260b07` | docs | — |
| **`38d706a`** | **feat: add game feel phase (tiered feedback, SE, boss entrance, victory/defeat)** — 80点化計画 Phase 2 | **決定128（AI判断・CEO Audio QA PASS→deploy承認）** |

（それ以前：`32697ee` feat: polish enemy select cards（決定123）＝8/31版の基盤、`7f89e9e` docs: mark 8/31 release ready）

## Quality Gate（`38d706a` clean copy＝`git archive HEAD`）

- typecheck（`npx tsc -b --noEmit`）PASS
- lint（`npx oxlint .`）PASS
- tests **50 files / 577 tests** PASS（canonical。作業ツリーで`.claude/worktrees`の古いコピーが混入した件数は公式値ではない）
- balanceSim「STAKE-01」神の公平性ゲート PASS（神階Ⅰ〜Ⅶ×7神×7敵×3戦略）
- production build PASS（`index-BWFlr5zp.js` / `index-BuuelT8Q.css`）
- normal smoke PASS／Daily smoke PASS／Daily e2e（実プレイで決着→Daily Result→戦績）PASS
- 375px focused QA PASS／Desktop 1280 回帰 PASS
- console error 0／HTTP 4xx/5xx 0

## 8/31版に正式採用した機能

| 機能 | 状態 | 根拠 |
|---|---|---|
| Daily Challenge（今日の神域挑戦） | READY | 決定121。JST 0:00切替、週替わりシャッフル、1日3回、★5神域強化（敵HP×1.25／攻撃×1.15）、Seed ID表示、通常戦績と分離、saveVersion 8 |
| BURST Preview（共鳴パネル常時表示）・進行中セーブ破棄前の確認ダイアログ | READY | 決定122 |
| Enemy Select Visual Polish | READY | 決定123。2層カード、アート161px、hover/focusマーカー |
| **7ボス専用Stage Background** | **READY** | 決定124。試練の影=月夜の廃神殿／業斧の鬼将=炎上する鬼ヶ城／藍花の怨霊=紫陽花と彼岸花の幽世／銀甲の機工師=和風機巧工房／双牙の魔獣=月光の霊峰・獣道／蒼海の龍神=荒波の海上神殿／乱舞の道化=妖しい紅色の祭舞台。`public/assets/backgrounds/stages/01〜07.webp`（1600×900 WebP q70、合計1.93MB）。既存hook `EnemyStageDef.bg` → `BattleScreen`の`--stage-bg`をそのまま利用。Normal／Daily共通 |
| **Enemy Selectへの専用背景反映** | **READY** | 決定124。同じ`stage.bg`を`--enemy-stage-bg`として5:4 visual areaに表示（敵artと背景が同化しないことをQAで確認） |
| **Mobile Battle Auto Focus** | **READY** | 決定125。`(max-width:700px)`のみ。**攻撃カード／Multi Hit／BURST／Enemy Attack／Enemy Special**（＋敵ダメージを伴う託宣）で敵パネルへスクロールし演出を可視化、演出後に使用直前のscrollYへ復帰。**Heal／BlockではAuto Focusしない**。復帰待ち中の**ユーザー操作（pointerdown/touchstart/wheel/keydown）でAuto Returnをキャンセル**。**prefers-reduced-motion**はinstant移動（フォーカス自体は維持）。Desktopは完全不変。engine・save・balance不接触 |
| **battle終了後の不要なAuto Focus防止** | **READY** | 決定125フォローアップ（`1aab902`）。勝敗確定後（RewardOverlay/GameOverOverlay表示中）は新しいセッションを開始しない。セッション制御は`autoFocusSession.ts`（node環境の回帰テスト10件） |
| **神階（しんかい）Ⅰ〜Ⅶ** | **RELEASED** | 決定126（Phase 1）。累積制約：Ⅰ参道＝託宣4回＋R5以降 敵ATK+20%＋敵ATK+10%／Ⅱ鳥居＝＋初期手札−1／Ⅲ拝殿＝＋敵HP+10%／Ⅳ本殿＝＋ブロック効率75%／Ⅴ奥宮＝＋回復効率60%／Ⅵ禁足地＝＋必殺・連撃+20%（機工師主砲は+10%上限）／Ⅶ高天原＝＋最終試練の選択（巨躯／猛威／静寂）。難易度「ふつう」固定・神ごと解放（むずかしい1回撃破→Ⅰ）・スコア×(1+0.08×段)・段別ベスト（`sevengods.stakes` v1）・saveVersion 9（v3〜v8連鎖移行）・Dailyとは完全分離 |
| **Seed共有（挑戦状コピー・`?seed=&stake=`）** | **RELEASED** | 決定126。結果画面から段・神・敵・Seed・スコア・URLをコピー。真正性は自己申告 |
| **Game Feel（演出強度4段階・自作SE・BURST READY・Boss Entrance・勝利/敗北演出）** | **RELEASED** | 決定128。与ダメ量で L1〜L4（シェイク・斬撃・数字・SE音量）、自作WAV 20本（`docs/SE_ASSETS.md`、外部素材ゼロ）、7/7到達でゲージ発光＋上昇音、新規開始時の Boss Entrance（約1.5s・操作を奪わない・続きからでは非表示）、撃破の一拍→報酬→「神域制覇」→スコアロールアップ、敗因表示、「自己ベスト更新」は勝利時のみ、reduced-motion 対応。CEO ローカル Audio QA PASS |
| **BURST任意発動** | **不採用** | 決定127（約50,000試合でオラクルでも+0.5pt）。7/7自動発動を維持。カードシナジー＋共鳴経済の再設計時に再検討 |
| PV | VISUAL LOCK / FINAL | v3 FINAL承認済み。変更しない（新背景の収録はPV v2以降） |
| BGM | license verified / unchanged | 決定120 |
| VFX-04 背景ドリフト最適化 | 完了 | 決定119 |

## Production QA（本番URL、2026-08-30 最終）

| 項目 | 結果 |
|---|---|
| Home／God Select（7神）／Difficulty | PASS |
| Enemy Select（8カード・Visual Polish・アート161px・横overflowなし） | PASS |
| Deck（対戦相手チップ一致）／Battle | PASS |
| BURST（プレビュー表示・演出・撃破） | PASS |
| Result（RewardOverlay「報酬カードを1枚選ぼう」） | PASS |
| **Boss Backgrounds** | **7/7 PASS**（Enemy Select Desktop/375・Battle Desktop/375とも正しい専用背景、混線なし、asset 404なし） |
| **Mobile Auto Focus**（375px） | **PASS**（通常攻撃／Multi Hit／BURST／Enemy Attack／Enemy Special の演出がviewport内、Heal/Blockはスクロールなし、手動キャンセル、reduced-motion、BURST撃破後の不要な復帰スクロールなし） |
| Daily（本日ボス・★★★★★神域強化・Seed ID・専用背景・Auto Focus・attempt/score/seedルール不変・**神階非干渉**） | PASS |
| **神階**（未解放表示／到達チップ／Ⅲ選択とふつう固定／HUDタグ／save v9／続きから／勝利→倍率行・突破・段別ベスト・次段解放・挑戦状コピー／もう一度で段維持／戦績／`?seed=&stake=`／Ⅶ3択／375px） | **PASS 21/21** |
| **Game Feel**（Boss Entrance 表示・1.5sで消える・操作非阻害・続きからでは非表示／L2・L4 の段階クラス／7/7 ゲージ発光＋カットイン／撃破の一拍→報酬→神域制覇→スコアロール→自己ベスト／敗因表示・敗北時は自己ベスト非表示／溜め警告音経路／reduced-motion／375px 登場・overflowなし・Auto Focus／SE 20本配信） | **PASS 19/19** |
| 通常モード かんたん／ふつう／むずかしい（神階なし・数値不変）／旧save（v7）→v9移行と続きから | PASS |
| Desktop regression（1280pxでscrollY不変、Enemy Select/Battle 7体） | PASS |
| console error | 0 |
| HTTP 4xx/5xx | 0 |
| BGM home／battle／victory／defeat | 4種とも HEAD 200 |
| Production bundle | `assets/index-BWFlr5zp.js`（clean buildと一致） |

証跡：`Videos/SEVENGODS-PV-REVIEW/gamefeel-phase2/prod/`（feel／flows／stage／mobile／end／stake／daily-e2e／p0）、Phase 1 は `shinkai-phase1/prod/`、8/31版は `prod-final-0831/`・`final-gate-0831/`・`minor-fix-gate/`

## Known Non-blockers（MINOR / Post-release）

いずれも **8/31 blockerではない**（CEO承認済み）。対応は9月以降。

1. **Mobile Auto Focus の smooth scroll が目標位置（147px）の手前で停止することがある**（本番で196〜254px。ラウンド終了やカード使用直後のレイアウト変更・画像読込との競合）。停止位置でも敵art／HP／予兆／被弾演出はviewport内に収まり、復帰も正常なためRelease許容。**9月：フォーカス約600ms後のsettle/reassert補正（必要ならinstant）を検討**
2. **#7 紅背景（乱舞の道化）で浮遊ダメージ数字（赤文字）のコントラストが低め**。HUDトーストとHPバーで情報は担保。数字への縁取り追加を検討
3. **Enemy Select cold load**：背景7枚（1.93MB）＋敵art（PNGのみ配信の3体）を同時読込するため初回表示が1〜3秒遅れることがある。preload/CSS変更は未追加
4. **復帰位置の scroll anchoring 差**：Auto Focusは使用直前のscrollYへ正確に戻すが、その後のMiniResult消滅・手札枚数変化でブラウザ標準のscroll anchoringにより50〜80px程度ずれることがある（既存挙動）
5. **701〜899px Battle縦スクロール**：PC幅701〜899pxで「ラウンドを終える」まで縦スクロールが必要（決定88で発見、横スクロール・重なりは無し）
6. **Daily Phase 1：端末時計／localStorage依存**（決定121で了承済み。公開ランキング時にサーバー権威へ移行）
7. **寿楽の一強**（神階Ⅶで最良戦略86%、蒼毘・笑蓮は36〜45%）：神階以前からの不均衡。神階のための緊急nerfはせず、次の独立したBalance Phaseで実測＋simulationに基づき扱う（CEO方針）
8. **375pxの難易度画面が812→899px**（神階セレクタ追加分。フレーバー文は畳み済み）
9. **挑戦状の真正性は自己申告**（サーバー無し）
10. **SE は数式合成の自作音源**：収録素材ほどの質感はない（CEO Audio QA では「以前より大幅に良い」でPASS）。有料/収録素材への差し替えは CEO 判断事項
11. **Boss Entrance 中もカードは押せる**（操作を奪わない方針。登場と同時に攻撃すると演出が重なる＝許容）

その他：stale `.claude/worktrees`（ローカル作業環境のみ。テスト件数混入の原因、削除は別途）

## Post-release Priorities（9月以降）

### P1（最優先）
0. ~~神階（Stakes）~~ → Phase 1 として RELEASED（決定126）
1. ~~BURST任意発動~~ → 不採用（決定127）。カードシナジー＋共鳴経済の再設計と同時に再検討
2. ~~SE実音源~~ → Phase 2 として自作SEで RELEASED（決定128）
3. Daily共有
4. 戦略深度改善
（＋上記Known Non-blockers 1のsettle補正）

### P2
- 神域行動
- 神バランス
- Mobile 1画面化（Battle redesign。決定125のAuto Focusはそれまでの対策）
- 7神バランス（寿楽一強・蒼毘/笑蓮下位）＝独立したBalance Phase
- 神階の拡張（Ⅴ以上での選択式、曜日Daily階位）
- PV v2（新ステージ背景の収録・9:16版）

## Excluded Local Files（コミット対象外）

- `.claude/settings.local.json`（ローカル設定。git追跡済みだがローカル変更は含めない）
- 未追跡 `敵画像`（ローカルのメモファイル。含めない）

## 8/31当日の運用メモ（決定88の更新版）

- 本番当日は最初に1回だけ`sevengods.*`のlocalStorageを初期化し、以降は削除しない
- デモ用に進行中バトルを仕込む場合は「続きから」で再開する。「神を選ぶ」「今日の神域挑戦」から新規開始しようとすると**確認ダイアログ**が出るため（決定122）、即時消去の事故は起きないが、ダイアログで「破棄」を選ばないこと
- 本番QAではDailyの挑戦回数を消費していない（当日は3回フルに使える）
- スマホ実機では攻撃時に敵パネルへ自動スクロールする（決定125）。演出中に画面を触ると自動復帰は止まる（仕様）
- BGM／SEの可聴性・ミュート切替はCEO実機確認項目（自動化不可）
