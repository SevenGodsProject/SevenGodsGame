> **状態（2026-10-10・CEO 正式承認「v1.0.0 Production Smoke Test」・AI 実施・read-only）：S1〜S6 **全 PASS**（未実施項目なし・PASS 扱いの未確認 0）。Production・Git・Vercel への追加操作は 0。CEO 判断待ち。**

# v1.0.0 Production Smoke Test — 結果

- 対象：`https://seven-gods-game.vercel.app/`（**CEO 指示の `https://seven-gods.vercel.app/` は 404＝本プロジェクトの URL ではない**。配信中の本番は `seven-gods-game`・公開 commit `d2135d2`・Vercel deployment `6973326943`・rollback 候補 `6894630098`）
- 方法：通常のブラウザ操作のみ（Playwright headless Chromium・**隔離プロファイル**＝localStorage は各ケースの新規 context に閉じ、本番サーバーに書き込む経路は存在しない）。本番ユーザーデータの削除・変更 0。全リクエストを記録し「外部オリジン／`/api/`／失敗」を数えた
- 端末・ブラウザ：headless Chromium（Playwright 1.63）× PC 1366×768／PC 1508×660／SP 390×760（mobile・touch）／SP 390×844（mobile・touch）。**CEO 実機（iPhone・PC ブラウザ）は未実施**（S1〜S6 の自動確認は完了・実機確認は CEO 任意）
- Evidence：`docs/evidence/v1-0-production-smoke/`（JSON 6・スクリーンショット 104）

## 結果

| 項目 | 判定 | 確認した端末 | 証拠 | 問題点 |
|---|---|---|---|---|
| **S1** Home 表示・v1.0.0 配信 | **PASS** | PC 1508／SP 390 | `s1-home.json` 22/22：HTTP 200・title「SEVEN GODS：共鳴カードバトル」・右下ラベル **`v1.0.0 (d2135d2)`**・favicon・og:title・description・開始ボタン・横はみ出し 0・console error 0・失敗リクエスト 0・外部オリジン通信 0。`s1-home-pc1508.png`／`s1-home-sp390.png` | なし |
| **S2** 新規開始・神選択・デッキ編成・戦闘開始 | **PASS** | PC 1366／1508・SP 760／844 | `s2-s4-qa-flow.json`：Home → 神（大耀）→ 難易度 → 敵（業斧の鬼将）→ デッキ → 戦闘。4 viewport すべて敵立ち絵 inView・予告「50」表示・手札 5/5・「ラウンドを終える」有効・scroll 0・横はみ出し 0。`qa-flow-shots/*-a01〜a06` | なし |
| **S3** カード使用・神託・Enemy Intent・勝敗処理 | **PASS** | PC 1366／1508・SP 760／844 | カード使用 13〜15 枚・神の一撃カットイン 1 回・HP ghost・Enemy Intent 表示。**勝利**：4 viewport すべて「勝利／ラウンド6で撃破／報酬カードを選ぶ › ／報酬 3 択」（SP は初回 run、PC 2 つは予算 420 秒の再 run `s3-pc-victory-qa-flow.json`・`s3-pc1366-victory-qa-flow.json`）。**敗北**：PC 1508 で「敗北／敗因：R4：業斧の鬼将の『業斧・断岩』で 260 ダメージ」・振り返り 2 行。神託 3 択の表示は戦闘画面で確認（`pc1508-a06-battle.png`・使用は自動プレイ対象外＝表示のみ） | 初回 run の PC 2 viewport は自動プレイ予算 150 秒で決着前に切れた（**スクリプトの時間予算**・PC は 1 枚のスクリーンショットが重い。ゲーム側はラウンド 5/7・HP・ボタンすべて正常）。予算 420 秒で再実行し勝利を確認。RC Gate（ローカル build）でも同じ挙動＝本番固有ではない |
| **S4** Save／Resume | **PASS** | PC 1366／1508・SP 760／844 | 戦闘 1 ラウンド後にリロード → Home に「**続きから大耀 vs 業斧の鬼将・ラウンド2**」→ 再開後 round=2・手札 6・敵 inView・終了ボタン有効。神域挑戦も「続きから神域挑戦…ラウンド2」で再開し残り回数「挑戦開始（残り2回）」を保持。`*-a07-home-resume.png`・`*-a08-resumed.png` | なし |
| **S5** 公式ボイス・BGM duck・ミュート | **PASS** | PC・SP | `s5-official-voice.json` 4/4：大耀で開戦 → 入口の終わりに **5 秒超の buffer の start 1 回**（＝ボイス）・BGM の `linearRampToValueAtTime` がボイス開始直後に 1 未満へ下がり終了後に 1 へ戻る予約・**ミュート時はボイス 0**・`/assets/voice/taiyo/greeting.mp3` 200 | なし（Known K36「入口 skip でも鳴る」は仕様どおり） |
| **S6** Legal／Credits 画面・承認文言 | **PASS** | PC・SP 375 | `s6-legal-credits.json` 40/40：Home「クレジット・権利表記」→ 画面表示・本文（非公式ファン作品／二次創作ガイドライン／公式・公認・提携作品ではありません／Creator Kit／Suno／生成 AI／localStorage／Vercel 但し書き／問い合わせ先は準備中＋SGG 運営へ送らない／制作：SEVENDAO GAMES（SGG 運営とは別の個人制作スタジオです）／大耀の音声（あいさつ）／S6 生成記録の文）・禁止語 0・横はみ出し 0・「戻る」で Home・localStorage 不変・JS error 0 | なし |

### 通信・エラー（全 run 共通）

| run | リクエスト総数 | 外部オリジン | `/api/` | 失敗 | console error |
|---|---|---|---|---|---|
| 初回 4 viewport | 280／377／268／273 | 0 | 0 | 0 | 0 |
| PC 1508 再 run（420 秒） | 387 | 0 | 0 | 0 | 0 |
| PC 1366 再 run（420 秒） | 293 | 0 | 0 | 0 | 0 |
| S1／S5／S6 | — | 0 | 0 | 0 | 0 |

意図しない外部 API 通信：**0**（同一オリジンの静的アセットのみ）。表示崩れ：横はみ出し 0・敵立ち絵／予告／HP バー inView（4 viewport）。

## 未実施・制限（PASS 扱いにしていないもの）

- CEO 実機（iPhone Safari・PC ブラウザ）での目視は未実施（自動確認のみ）
- 神託（託宣）の**使用**は自動プレイに含まれない（表示のみ確認。ロジックは RC Gate の vitest・決定267 以降の Production で不変）
- BGM／SE の実音量・音質は headless のため聴感確認なし（API 呼び出しの記録で確認）

## スクリプト変更（テスト用・runtime 外）

- `scripts/release-audit/home-version-smoke.mjs`（新規・S1）
- `scripts/release-audit/qa-flow.mjs` に `--only <viewport>`・`--play-timeout <ms>` を追加（PC の自動プレイ予算のため）

## 次（CEO 判断待ち・AI は追加操作しない）

Known 凍結（K36〜K39）・tag `v1.0.0`・RELEASE_STATUS の「正式公開」行は CEO 判断後。rollback 候補 `6894630098` は本 Smoke で使う理由が生じなかった。
