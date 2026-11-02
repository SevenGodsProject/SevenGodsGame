# v1.0.6 Production Smoke（決定286 PRODUCTION LIVE）

> **結論：PASS — v1.0.6 PRODUCTION LIVE**（2026-11-02・PM／AI 判断。merge・deploy は CEO）。
> - PR #6 は CEO が merge：merge commit `10b0cd3`・2026-11-02T14:08:41Z（親 `a96a409` × `c66a633`）
> - master のツリーは CI GREEN の RC head `c66a633`（= 統合 Gate の `5327a95` に test 1 行修正）と**一致**
> - master CI：run `41459151947` success（tsc／oxlint／vitest／build）
> - Vercel Production：deployment **`7494257506`** success（2026-11-02T14:09:32Z・sha `10b0cd3`）
> - Rollback 先は `7291166485`（v1.0.5・`a96a409`）を維持・**未使用**
> - 本番 Smoke 中に見つかった製品異常：**0**。rollback 不要

## 1. 配信物

| 項目 | 結果 |
|---|---|
| Production URL | https://seven-gods-game.vercel.app/ → HTTP 200・`X-Vercel-Cache: MISS`（再検証応答） |
| JS | `index-CH4f08vg.js` **481,118 B**（v1.0.5 475,991 → +5,127）。埋め込み文字列 `1.0.6` / `10b0cd3` |
| CSS | `index-Tat7Jjqr.css` **198,643 B**＝統合 Gate の build と**同一ハッシュ** |
| RC build との一致 | 手元 `dist/assets/index-DBJFGX_C.js`（version bump `df82af7` で build・runtime tree は `10b0cd3` と同一）と比べ、差は埋め込み sha 7 文字（byte 285,688）のみ。sha 正規化後 **JS byte 一致・CSS byte 一致**（`s0-bundle-compare.txt`） |
| 4 機能の文字列 | 危険帯（`hp-bar-self-*`）・CSM（「あと」）・crisis（`crisis.mp3`）・忠次（`pilot=shogunate`・`将軍四天王`）が本番 bundle に存在。通常導線の敵選択は 8 枚のまま（S5） |

## 2. Smoke 結果（headless Chromium・Playwright 1.63・本番 URL 直撃・1 browser 直列）

| S | 項目 | 結果 | 証跡 |
|---|---|---|---|
| S1 | 起動・version（pc1508／sp390） | **ALL PASS**：Home `v1.0.6 (10b0cd3)`・title・favicon・OGP・開始ボタン可視・横はみ出し 0・**console error 0・失敗リクエスト 0・外部オリジン通信 0** | `s1-home-version.json` |
| S2 | 受入（回帰・v1.0.3 以降の確定文言） | **44/44**（pc／sp375） | `s2-acceptance/`・`s2-stdout.txt` |
| S3 | 敗北画面（大耀 × 鬼将 R4 断岩） | **18/18** | `s3-defeat/`・`s3-stdout.txt` |
| S4 | 大耀 crisis ボイス受入（greeting／crisis × pc／sp × ミュート有無＝8） | **8/8 allPass**：crisis 音あり pc／sp＝HP ラベル更新から **+295／+291 ms**（期待 300±50）・1 戦 1 回・duck 0.343 で必殺 duck と合流。ミュート＝要求 0。greeting 4/4 | `s4-voice/acceptance.json`・`s4-stdout.txt` |
| S5 | 忠次 敵選択 acceptance（normal／shogunate／all × pc／sp） | **138/138**：通常 8（7＋委任）・`?pilot=shogunate` 9・`?pilot=all` 10 | `s5-shogunate/`・`s5-stdout.txt` |
| S6 | 忠次 probe normal（seed 01〜03 × pc／sp375＝6）／hard（seed 01〜02 × pc／sp375＝4） | **normal 6/6・hard 4/4 が統合 Gate 基準と一致**：R1 50／R2 90（hard 60／強打 100）／R3「⚠ 傷が浅ければ次は総攻め」＋「あと N で総攻めを止める」（1 行・11px・h15・plate 内）／R4 seed01 強打 120（hard 140・then・half）・seed02／03 総攻め 240（hard 280・else）。JS error 0 | `s6-shogunate/`・`s6-COMPARE_VS_INTEGRATION_GATE.txt` |
| S7 | 神 HP 危険帯 probe（After＝本番 vs Before＝v1.0.5 build preview・juuma／trial × pc／sp375・2 回実行） | **機能チェックは 2 run とも全ケース PASS**（half 橙 `▽`／quarter 橙赤 `▼` `#ff7a45`・2px ring＋12px glow・ラベル コントラスト ≥4.5・`.hp-bar` animation 無し・敵バー不変・横はみ出し 0・JS error 0・数字は Before と同じ）。**WARN**：ホスト間の箱比較（|Δ|≤0.5px）だけが run1 で 1 項目（pc trial R3 fill）・run2 で 10 項目（sp375 juuma R1／R2 の横 3px ずれ）外れた。両 run の和集合で 4/4 ケース PASS。原因は本番（CDN）と手元 preview の描画タイミング差で、統合 Gate（local vs local）は 160/160 | `s7-danger-band/summary-run1.json`・`summary-run2.json`・`s7-run1-stdout.txt`・`s7-run2-stdout.txt` |
| S8 | 旧セーブ互換（v1.0.5 build `index-S5PX1Ko7.js` で作った実セーブ A／B → 本番） | **44/44 PASS**：Home「続きから」文言・残り回数・戦績・復元盤面（ラウンド／手札）・battleSave 差分 0・他キー改変 0・JS error 0 | `s8-save-migration/migration.json`・`s8-stdout.txt` |
| S9 | CSM 60 札 はみ出し・コントラスト probe（7 神 × seed × sp375＋sp360／sp390／pc660／pc800＝22 run）。**2 式＝計 44 run**：①直列ランナーの 22 run 一括（`summary.json`・`runs/`）②フォアグラウンド 3 バッチ 22 run（`batch1〜3/`・§4 参照） | **PASS（44 run とも）**：はみ出し **0**・交差 0・font 10px・敵ターン中の帯 0・JS error 0・notTopmost 16（sp375 3／sp360 3／sp390 10）＝統合 Gate と**同数・同札**（姉御の号令）・①②で同一。**WARN**：帯コントラスト <4.5 の標本が ① 8（大耀 csm1-a R3 の 神楽舞・速攻 × sp360／sp390／pc660／pc800）・② 3（受け流し／呪縛／共振・sp375）。値はすべて **2.32**＝CSM v1 Gate R2 で既知の「配札アニメ `rl-deal-fade`（opacity .4）中 ≤0.5 秒だけ 2.3:1」。標本は `topmost:false / hitEl:null`（配札中）で、同じ札・同じ盤面の別標本は 5.25（① sp375 min 5.25・② pc／sp360／sp390 min 5.25）。CSM v1 Gate 基準にも pc660 で同種 WARN 2 件 | `s9-csm-overflow/summary.json`・`runs/`・`batch1〜3/summary.json`・`overflow-probe.log.txt` |
| S10 | 既存敵の決定論（cf2 probe・大耀 × 試練の影 pc／× 龍神 sp375） | **2/2 一致**（統合 Gate `08-cf2-core7` 基準）：試練 23 手／17 札／heavy 5／帯 T17 half・T21 quarter／offVp 0。龍神 sp375 22／16／4／T17・T21／offVp 3（基準 3・既知）。JS error 0 | `s10-cf2/*/`・`s10-*.stdout.txt` |

**console error／外部通信**：S1（2 viewport）・S2・S8 で console error 0・失敗リクエスト 0・外部オリジン通信 0。probe 全 run（S6 10・S7 8・S9 22・S10 2）で pageerror 0。

## 3. UNVERIFIED（PASS 扱いにしない）

1. **iOS Safari 実機**（サイレントスイッチで声・BGM が止まる／ホーム→復帰で BGM が戻る）：RC preview で CEO が Q4 PASS 済み（統合 Gate §4）。本番では未実施
2. **CEO の実機目視**（本番の危険帯の色味・「あと N」帯・忠次カットイン）：RC preview で 9/9 PASS。本番は headless の DOM・計測のみ
3. **声の聴感**：API 記録（再生要求・開始時刻・duck）で確認。実際の音は未聴取
4. **a11y minimum pack（69 項目）**：本番では再実行していない（統合 Gate 69/69・bundle byte 一致のため省略）
5. **Vercel Preview `7493362328` の中身**：SSO 保護のため deployment state のみ（v1.0.5 と同じ扱い）

## 4. Smoke 実施上の事象（製品異常ではない）

- 6 GB 機の空きメモリ 550 MB 前後で実施。S6〜S10 を 1 本の直列ランナー（bash）でバックグラウンド実行中、Claude Code から「低メモリ保護でランナーと v1.0.5 preview（:4191）を停止した」と通知された。**実際にはどちらのプロセスも生きていて**、ランナーは S8（44/44）→ S9 22 run → S10 2 run まで完走していた（ランナーのログ：S9 23:45〜00:07・S10 00:07〜00:14・DONE 00:14:17）。通知を信じて S7〜S10 をフォアグラウンドで再実行したため、**23:46〜00:18 は headless ブラウザが 2 本同時**に動いた時間帯がある
  - 影響範囲：時刻・箱の比較を含む S7 run2（23:51〜23:55）と S9 ②バッチ（23:57〜00:18）。機能チェック（帯クラス・色・記号・はみ出し・JS error）は同時実行の影響を受けない設計で、全 run PASS。S9 は ①（ランナー・00:07 まで）と ②（バッチ）の 2 式とも §2 に記載
  - S10 はランナー完了後（00:19〜00:25）にフォアグラウンドで再実行したものが最終証跡（ランナーの S10 出力は同じパスに書かれ上書きされた）
  - S6a／S6b・S8 はランナー単独実行（他の browser 無し）
  - **教訓（AI）**：停止通知の後は `tasklist`／`netstat` で実プロセスを確認してから再実行する。6 GB 機では probe を 1 本ずつフォアグラウンドで回す
- ランナーの S7 はブラウザ起動に失敗（`exitCode=3221225794`＝リソース不足・`s7-run1` は再実行の 1 回目）。フォアグラウンド再実行 2 回で機能チェックは全 PASS（§2 S7）
- v1.0.5 preview は Smoke 完了後に停止済み（PID 17264）。node・headless・preview の残留 0 を確認

## 5. 証跡

`docs/evidence/v1_0_6-production-smoke/`：json 65・txt 22 を commit。画像（webp 113・png 67・約 73 MB）は **ローカルのみ**（`C:\Users\kimi1\SevenGodsGame-integ-v106\docs\evidence\v1_0_6-production-smoke\`・untracked）。S8 の旧セーブ画面 webp 10 枚だけ同梱。

## 6. 次

- 決定286 を **PRODUCTION LIVE** として `docs/DECISIONS.md`・`docs/RELEASE_STATUS.md` に記録（本 commit・docs-only）。push／PR／merge は CEO
- 次の新機能（康政 Pilot 等）は本記録の CEO 確認後に着手
