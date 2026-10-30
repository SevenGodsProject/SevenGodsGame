# v1.0.6 Integration Gate — 忠次 v0.6 × CSM v1 × 神 HP 危険帯 v1 × 大耀 crisis ボイス v1（2026-10-31・AI-PM）

- 状態：**INTEGRATED（local）— 統合 Gate ALL PASS（FAIL 0・WARN 0）— CEO iPhone 最終 QA READY（LAN preview `http://192.168.11.6:4190/`）**。push／PR／merge／deploy は未実施（CEO）
- worktree／branch：`SevenGodsGame-integ-v106`／`release/v1_0_6-integration`（起点 Production v1.0.5 `a96a409`）。CEO 承認：2026-10-31「v1.0.6 Local Integration GO」（順序 C→B→D→A・local merge のみ）
- 設計根拠：`docs/INTEGRATION_READINESS_AUDIT_V1_0_6.md`（lane3plan `cd46d1e`・READ-ONLY 監査：6 ペア＋直列 conflict 0・参照無し tree で tsc 0／vitest 1,658／build PASS）
- 禁止事項の遵守：Production master への merge／push／deploy 0・main repo の dirty 12 ファイル無接触・4 lane worktree の untracked 証跡無変更・重量処理は直列（各処理前に空きメモリを記録）・康政 Pilot 実装 0

---

## 0. 結論表

| # | 問い | 結論 |
|---|---|---|
| 0-1 | 統合 Gate | **ALL PASS（FAIL 0）**：各 merge 直後 tsc 0＋targeted 246/246／統合後 full vitest **1,658 PASS**（version 固定テストを 1.0.6 に追従）／build **PASS**（JS 481.11 kB・CSS 198.64 kB）／cf2 7 敵決定論 **8/8 一致**／a11y **69/69**／危険帯 **160/160**／CSM **22 run はみ出し 0**／忠次 probe normal 6・hard 4 run **基準一致**＋acceptance **138/138**／voice **8/8**（1 回目は QA スクリプトの記号未対応で FAIL → スクリプトのみ修正・runtime 変更 0） |
| 0-2 | merge commit | §1 の 5 本（機能 4＋v1.0.5 LIVE 記録 1）。すべて `--no-ff`・conflict 0・`BattleScreen.tsx` と権利台帳は自動 merge（追加 hunk のみ） |
| 0-3 | version | `package.json`／`package-lock.json` 1.0.5 → **1.0.6**（Home 表示 `v1.0.6 (<sha>)`） |
| 0-4 | 既存 7 敵・60 カード・セーブ | `src/core` 差分は忠次の `enemies.ts`（PILOT 配列追加＋`isPilotEnemyId` OR）のみ。cards 0・rules 0・save v9 不変・gameVersion 指紋 CORE 7 体のみ（契約テスト PASS） |
| 0-5 | 残リスク | §5（忠次 hard W1・危険帯 25% 以下／回復重なり・crisis の iOS サイレント／Safari 復帰＝いずれも iPhone 最終 QA で確認） |
| 0-6 | CEO 判断 | Production 公開承認（CLAUDE.md §6-3 #8）のみ。push／PR／merge は CEO |

## 1. merge 一覧（`git log --first-parent a96a409..HEAD`）

| 順 | merge commit | 取り込み | 内容 | 直後の Gate |
|---|---|---|---|---|
| 1 | `05ad080` | C `cb25b3c` feat/self-hp-danger-band-v1 | 神 HP 危険帯 Static v1（`PlayerPanel` `HpBar` `hudPlate.css`） | tsc 0・targeted 3 files **32/32** |
| 2 | `c09fcf3` | B `c6c53e9` feat/cost-short-marking-v1 | Cost-Short Marking v1（`CardView` `cardShort.css` `BattleScreen` 1 行） | tsc 0・targeted 2 files **15/15** |
| 3 | `c2ebb2d` | D `a8b5495` feat/official-voice-crisis-pilot-v1 | 大耀 crisis ボイス（`crisisVoice.ts` `feelTier` `sound` `creditsText` `BattleScreen` 8 行・`crisis.mp3`） | tsc 0・targeted 6 files **75/75** |
| 4 | `4a5f49d` | A `f904522` feat/shogunate-pilot-v0.6 | 忠次 v0.6（`?pilot=shogunate` 限定・`enemies.ts` PILOT 追加・`battle.css` enemy_08 限定） | tsc 0・targeted 11 files **124/124** |
| 5 | `3120c32` | `98222ee` release/v1_0_5-rc | **決定285 v1.0.5 PRODUCTION LIVE 記録**（docs／evidence 34 files・runtime 0）。v1.0.5 公開時に「次 Release に同梱」と決めていた記録。merge-tree conflict 0 | runtime 差分 0（Gate 不要） |

証跡：`docs/evidence/integration-v1_0_6/01C-*`〜`04A-*`。

## 2. 統合後 自動 Gate（直列・6 GB）

| # | 項目 | 結果 | 証跡 |
|---|---|---|---|
| 2-1 | 空きメモリ（full vitest 前／build 前） | 1,546 MB／1,527 MB（6,020 MB 機） | `05-mem-before-full-vitest.txt`・`06-mem-before-build.txt` |
| 2-2 | full vitest（`--no-file-parallelism`） | **1,657 PASS・1 FAIL・17 skip**（134 files・71.6s）。FAIL は `publicFace.test.ts` の version 固定（1.0.5 期待）＝version bump の想定内。先例（v1.0.2〜1.0.5 の bump commit は毎回この test を同梱）どおり 1.0.6 に追従 → 当該 file 再実行 **5/5 PASS**。実質 **1,658 PASS・0 fail**（統合監査の参照無し tree と同数） | `05-vitest-full.txt`・`05b-vitest-publicFace-after-version-fix.txt` |
| 2-3 | build（`tsc -b && vite build`） | **PASS**：JS `index-DBJFGX_C.js` **481.11 kB**（v1.0.5 475.99 → +5.12 kB・gzip 149.92）／CSS `index-Tat7Jjqr.css` **198.64 kB**（+3.56）。サイズは統合監査の参照無し tree と同一（JS ハッシュだけ version／sha 文字列で変わる・CSS は同一ハッシュ） | `06-build.txt` |
| 2-4 | `src/core` 差分 | `enemies.ts`（+76/−4・PILOT 配列追加＋`isPilotEnemyId` OR）と test 4 本のみ。`cards/`・`rules.ts`・engine・save・`gameVersion.ts` 変更 0 | `07-core-diff.txt` |
| 2-5 | 既存 7 敵の決定論（cf2 probe・大耀 × 7 敵 PC＋龍神 SP375＝8 run・After 4190） | **8/8 完全一致**（忠次 v0.6 Gate #11 の基準＝v1.0.2 RC G8 と同値）：手数・札数・heavy・帯遷移 turn がすべて一致。試練 23/17/5（T17 half・T21 quarter）・鬼将 23/17/5・怨霊 18/13/2・機工師 19/14/2・魔獣 21/16/3・龍神 22/16/4・道化 21/16/3・龍神 SP375 22/16/4（offViewport 3＝基準 3・既知）。JS error 0・名札被り 0 | `08-cf2-core7/*-summary.json`・`COMPARE_VS_V0_6_BASELINE.txt` |

## 3. ブラウザ probe（Playwright chromium・headless・1 browser 直列・After＝本 build preview／Before＝v1.0.5 build preview）

preview：After `:4190`＝本 branch の `dist`（`index-DBJFGX_C.js`）／Before `:4191`＝v1.0.5 RC build（`index-S5PX1Ko7.js`）。すべて 1 browser 直列・他の重量処理と同時実行なし。各 chunk 前に空きメモリを記録（`*/mem-before.txt`・1.1〜1.5 GB）。

| # | probe | 対象 | 結果 | 基準との比較 | 証跡 |
|---|---|---|---|---|---|
| 3-1 | a11y minimum pack | pc／sp／sp375 × 23 項目 | **69/69 PASS**・JS error 0 | 危険帯 v1・CSM v1 単体 Gate と同数 | `09-a11y/acceptance-after.json` |
| 3-2 | 神 HP 危険帯 probe（After vs Before） | 大耀 × 双牙の魔獣（R2 末 half）・× 試練の影（R3 末 quarter）× pc／sp375 | **160/160 PASS**：half 橙 `▽`／quarter 橙赤 `▼`・fill／枠／記号／コントラスト（11.73→11.55／12.11）・名札とバーの箱 Before/After Δ0・敵バー不変・JS error 0 | 危険帯 v1 単体 Gate と同値 | `10-danger-band/summary.json`・PNG 20 枚 |
| 3-3 | CSM 60 札 はみ出し・コントラスト probe | 7 神 × seed・sp375／sp360／sp390／pc660／pc800＝22 run・402 帯 | **PASS**：はみ出し 0・交差 0・font 10px・最小コントラスト 5.25:1・敵ターン中の帯 0・JS error 0。札 47 種を観測（CSM v1 Gate と同じ 47）・「あと N」44 種 | perVp は CSM v1 Gate 基準と**同値**。pc660 だけ基準にあったコントラスト WARN 2 件が 0（改善・回帰なし） | `12-csm-overflow/summary.json`・`COMPARE_VS_CSM_V1_BASELINE.txt` |
| 3-4 | 忠次 probe normal | seed 01〜03 × pc／sp375（6 run） | **PASS**：R1 50／R2 90／R3「⚠ 傷が浅ければ次は総攻め」＋「あと N で総攻めを止める」／R4 seed01 強打 120（then・half）・seed02／03 総攻め 240（else）。JS error 0 | PC 3 run は v0.6 Gate `07-probe-normal` と**完全一致**。sp375 3 run は intent／帯／HP／文言が一致し、行の箱だけ W2 修正後（h15・1 行・11px）＝`13-w2-fix` 基準と一致 | `13-shogunate/probe-normal/summary.json`・`COMPARE_*` 2 本 |
| 3-5 | 忠次 probe hard | seed 01〜02 × pc／sp375（4 run） | **PASS**：R1 60／R2 強打 100／R3 文言／R4 seed01 強打 140（then・half）・seed02 総攻め 280（else）。JS error 0 | 同上（PC 完全一致・sp375 は W2 後の箱で一致） | `13-shogunate/probe-hard/summary.json` |
| 3-6 | 忠次 敵選択 acceptance | normal／shogunate／all × pc／sp | **138/138 PASS**：通常導線の敵カードは 8（7＋委任）で忠次・enemy_09 非表示、`?pilot=shogunate` で 9、`?pilot=all` で 10 | v0.6 Gate と同値 | `13-shogunate/acceptance-after.json` |
| 3-7 | 大耀 crisis ボイス受入（G-B 8 ケース） | greeting／crisis × pc／sp × ミュート有無 | 1 回目 **FAIL（QA スクリプトの記号未対応・下記）** → スクリプト修正後 2 回目 **8/8 ALL PASS**：crisis × 音あり pc／sp＝着弾 +**299／299 ms**（期待 300±50）・声 1 回（8.858s）・duck 0.343 で必殺 duck と合流（merged）・声の重なり 0・R5 で再発火なし。crisis × ミュート＝要求 0・start 0。greeting 4 ケース PASS | crisis v1 単体 Gate（296〜299 ms）と同値 | `11-voice/acceptance-run2.json`・`acceptance-run1-FAIL-marker-parse.json` |
| 3-8 | 既存 7 敵の決定論（cf2 8 run） | §2-5 に記載 | **8/8 一致** | | `08-cf2-core7/` |

**統合特有の相互作用で見つかった事象（runtime 不具合ではない）**：voice 受入 1 回目は crisis 4 ケースが FAIL。原因は QA スクリプトが神の HP ラベルを「100 / 300」で前方一致していたのに対し、危険帯 v1 で 50% 以下のラベルが「▽ 100 / 300」（記号は `aria-hidden`・pill 内）になったこと。声そのものは R4 の着弾後に 1 回（8.858s）正しく鳴り、HP 経路 260→260→300→100→70 も仕様どおりだった（`acceptance-run1-FAIL-marker-parse.json`）。対応＝スクリプトの読み取り 3 箇所で先頭の非数字を除去（`scripts/official-voice-pilot/acceptance.mjs`・runtime 変更 0）→ 再実行（3-7）。

## 4. iPhone 最終 Human QA（CEO・3 戦・約 8 分）

preview（1 本だけ・LAN）：**`http://192.168.11.6:4190/`**（本 branch の build・Home 右下に `v1.0.6 (df82af7)` 相当の表示）。音は iPhone のミュートを OFF にして開始。

| 戦 | URL | 見るもの | 回答 |
|---|---|---|---|
| 1 | `http://192.168.11.6:4190/?enemy=ryujin&seed=crisis-003`（大耀 × 蒼海の龍神・ふつう） | R4「大海嘯」被弾 → 自分の HP バーが**橙＋▽**になった直後に「ピンチ」の声が 1 回。手札に「あと N」帯（コスト不足）。R5 以降に声は再び鳴らない | Q1 絵→声の順に違和感なし／Q2 声は 1 回だけ／Q3 帯と橙が邪魔にならない |
| 1 の途中 | 同上 | **サイレントスイッチ ON** で声・BGM が止まる／**ホーム → 復帰**で BGM が戻り、進行が続く | Q4 止まる・戻る |
| 2 | `http://192.168.11.6:4190/?seed=hpband-trial`（大耀 × 試練の影・札を出さず R3 末まで「ラウンドを終える」） | HP 60/300 で**橙赤＋▼＋外光**。その後 回復札（活力の祈り等）を 1 枚使う → 緑の回復演出と橙枠の重なりが**うるさくないか** | Q5 25% 以下に気づく／Q6 回復時の重なりが過剰でない |
| 3 | `http://192.168.11.6:4190/?pilot=shogunate&seed=sg-v04-01`（大耀 × 忠次・ふつう） | R3「あと N で総攻めを止める」が 1 行・N を削ると「✓ 止めた」→ R4 強打 120。大耀なので HP 50% 到達で crisis 声（忠次カットイン SE と共存） | Q7 1 行で読めた／Q8 声とカットイン SE が濁らない |
| 3（任意） | 同 URL を むずかしい | 「あと 130」→「✓ 止めた」の後、崩れ（赤帯 50%）が次の札で起きる（W1） | Q9 ずれが気になるか |

判定：Q1〜Q8 すべて肯定 → **Production 公開候補（CEO 承認へ）**。否定が 1 つでもあれば該当機能の 1 行修正（危険帯 §4 の NG 対応・voice §7 の NO 対応・忠次は文言のみ）か、該当 merge commit の `git revert -m 1` で外して再 Gate。

## 5. 残リスク

| # | 事象 | 影響 | 確認方法 |
|---|---|---|---|
| R1 | 忠次 hard W1：崩れ 50% と「✓ 止めた」60% が別瞬間 | Pilot 限定（`?pilot=shogunate`）。通常導線に出ない | §4 戦 3 を むずかしい で遊んだときに 1 問 |
| R2 | 危険帯 25% 以下（橙赤 `▼`・2px 枠＋外光）と回復演出（緑 0.7s）の重なりが実機未確認 | 一瞬 2 色が重なる可能性 | §4 戦 2 |
| R3 | crisis ボイスの iOS サイレントスイッチ・Safari 復帰が未確認 | greeting（決定282）と同経路＝既知挙動と同じと推定 | §4 戦 1 の途中で操作 |
| R4 | crisis ボイスが忠次戦（大耀）でも鳴る | 設計どおり（HP ≤ 50% 初回）。忠次カットイン SE と duck 合流 | §4 戦 3 を大耀で |

## 6. Production 公開までの残作業（CEO 作業を含む）

1. CEO：§4 iPhone 最終 QA（preview は AI が 1 本だけ起動・§4 に URL）
2. QA PASS → CEO：`release/v1_0_6-integration` を新規 remote branch へ push → PR → CI GREEN → CEO merge（= Vercel Production deploy）。AI は push／merge をしない
3. 公開後 AI：本番 URL で Smoke（Home version 表示・受入・a11y 1 run・cf2 1 run・音声 1 戦）→ `docs/V1_0_6_PRODUCTION_SMOKE.md`・`DECISIONS.md` 決定286 を LIVE に更新・`RELEASE_STATUS.md` に deployment ID と Rollback 先（`7291166485`＝v1.0.5）
4. Rollback：Vercel で `7291166485` を Promote（CEO）。1 機能だけ外す場合は該当 merge commit の `git revert -m 1`
