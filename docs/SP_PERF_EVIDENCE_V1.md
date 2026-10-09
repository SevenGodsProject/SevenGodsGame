# SP Performance Evidence v1（PF-01）— エミュレーション実測と実機確認手順

- 日付：2026-10-09（Lane 2・**AI 判断**（CLAUDE.md §6-2）・`docs/ROADMAP_TO_RELEASE.md` §3 #3「SP 実機 perf evidence（Lighthouse mobile 1 run・別日単独 or CEO iPhone 体感 3 問）＋ Enemy Select preload（結果次第）」）
- 状態：**エミュレーション実測 1 セット取得済み／実 iPhone 計測は未実施（CEO 手順 §4）**。新規機能の追加 0・runtime 変更 0（計測スクリプトと本書のみ）
- ビルド：integ master `b04cc42`（A11y 統合後）＝本 branch と同一 runtime

---

## 1. 既存の計測基準と証拠（整理）

| 基準・証拠 | 何を測っているか | 種別 | 所在 |
|---|---|---|---|
| Release Hygiene Gate：転送量 | 初回ロード／戦闘開始までの転送バイト（種別ごと・音声形式） | PC エミュレーション（Chromium） | `scripts/release-hygiene/transfer.mjs`・`docs/RELEASE_HYGIENE_GATE.md` |
| Release Hygiene Gate：CLS／44px | ホーム→戦闘の layout shift・タップ領域 | PC／SP viewport エミュレーション | `scripts/release-hygiene/cls.mjs`（CM-01 で Δ0 を再実測） |
| 決定254 入口のフレーム計測 | 降臨の間の frame 時間（median／max・over33／over50） | PC Chromium headless | `docs/evidence/decision254/pilot/perf2.json` |
| Known K01 | 入口の JS 予約が重い main thread で ≈230ms 遅れる（映像は時刻どおり） | 実機 QA（CEO）で観測 | `RELEASE_STATUS.md` A-4 |
| UX-05／PF-02 | Enemy Select の cold load 1〜3 秒（背景 7 枚 1.93MB・preload 0） | Human QA 体感 | `MASTER_BACKLOG_AUDIT.md:136` |
| **PF-01（本書）** | Lighthouse mobile 相当の条件（CPU 4×・Fast 3G・iPhone viewport／UA）での LCP／長タスク／転送／heap | **SP エミュレーション**（PC の Chromium） | `scripts/sp-perf/emulated.mjs`・`docs/evidence/sp-perf/emulated-fast3g-cpu4x.json` |

Lighthouse 本体は依存に無い（6GB 機で別途 1 run する案は ROADMAP どおり残す）。本書の数値は Lighthouse の mobile プリセットと同じ減速条件を CDP で再現したもので、**スコア（0〜100）ではなく生の時間**。

## 2. エミュレーションと実機の区別（重要）

| 項目 | エミュレーション（本書 §3） | 実 iPhone（§4） |
|---|---|---|
| エンジン | Chromium（Blink／V8）headless | Safari（WebKit／JavaScriptCore）。JIT・WebAudio・`volume` 無視（K03/K04）・画像デコードが異なる |
| CPU | PC CPU を 4× 減速（Lighthouse mobile 既定） | A 系 SoC の実速度・サーマル |
| 回線 | Fast 3G（1.6Mbps／RTT 150ms）の人工条件 | 実 Wi-Fi／4G・LAN preview では回線はほぼ無視できる |
| 表示 | 390×844・DPR3 の viewport | 実パネル・Safari の UI バー・ノッチ |
| 分かること | 転送量・JS の重さ（長タスク）・入口の順序・回帰の有無 | 体感のもたつき・発熱・音の挙動・実タップ |
| 分からないこと | Safari 固有の挙動・体感 | 回帰の定量比較（毎回条件が変わる） |

結論：**エミュレーションは回帰監視用、実機は体感と Safari 固有の確認用**。両方を 1 セットずつ持つ。

## 3. エミュレーション実測（2026-10-09・cold 2 run・`emulated.mjs`）

条件：iPhone 13 相当（390×844・DPR3・touch・iOS 17.4 UA）・CPU 4×・Fast 3G・新規 context（キャッシュなし）・JS error 0／0。

| 区間 | 指標 | run 1 | run 2 | 中央値 | 目安（Lighthouse mobile の「良好」） | 判定 |
|---|---|---|---|---|---|---|
| Home 初回表示 | TTFB／DCL／load | 34／1,553／1,554 ms | 5／1,321／1,321 ms | load 1,321 | — | — |
| Home | FCP＝LCP（文字が LCP） | 2,416 ms | 1,892 ms | **1,892** | LCP ≤ 2,500 ms | **◎ 良好** |
| Home | 転送（home-screen 表示まで） | 180KB／3 req | 180KB／3 req | 176KB | — | HTML＋CSS gz 35KB＋JS gz 144KB。Hero 画像（523KB）は表示後に読込 |
| Home | 長タスク（>50ms・最初の 10 秒） | 2 件・最大 185 ms | 1 件・最大 58 ms | 最大 58 | 200 ms 未満が望ましい | ○ |
| Home | JS heap | 3.4 MB | 3.4 MB | 3.4 | — | ◎ |
| 敵選択 → デッキ構築 | 画面遷移（背景 7 枚の遅延読込を含む） | 619 ms | 575 ms | 597 | UX-05 の「1〜3 秒」 | ○ Fast 3G でも 1 秒未満（preload は **不要**と判定・§5） |
| 戦闘開始 | 「バトル開始」→ 操作要素が有効（入口演出は別時計） | 544 ms | 443 ms | 443 | — | ○ |
| 戦闘開始 | 長タスク 最大 | **394 ms** | **269 ms** | 269 | 200 ms 未満が望ましい | **△ Known K01 と同根**（入口の JS 予約。CPU 4× で 230ms が 270〜390ms に伸びる。映像は時刻どおり・修正しない方針は維持） |
| 戦闘開始 | 転送（Home 以降） | 511KB | 511KB | 511 | — | 神・敵・舞台・SE 2 本 |
| 戦闘 | JS heap | 5.5 MB | 5.2 MB | 5.2 | — | ◎ |
| 1 ラウンド | カード → ラウンドを終える → 次の操作可能 | 417＋790 ms | 466＋809 ms | 790 | — | ○ 敵の行動演出（設計値）が支配的。長タスク最大 94／65 ms |

**要約**：Fast 3G＋CPU 4× でも Home LCP 1.9 秒・戦闘開始 0.5 秒・1 ラウンド 0.8 秒。重いのは入口の JS 予約（長タスク 270〜390ms＝K01）だけで、v1.0 の Known のまま。

## 4. 実 iPhone での確認（CEO・最短手順・約 5 分）

前提：同じ Wi-Fi・LAN preview（`http://192.168.11.6:<port>/`。Lane 2 公式ボイス用の 4173 は Pilot ビルド、v1.0 候補の確認は integ master を別ポートで配信する＝AI が起動して URL を伝える）。Safari の「設定 → Safari → 履歴と Web サイトデータを消去」で cold にする。

| # | 操作 | 見るもの | YES／NO |
|---|---|---|---|
| P1 | URL を開き、Home の神の絵と「初陣へ」が出るまで | **3 秒以内**に絵と金のボタンが出たか | |
| P2 | 神を選ぶ → 大耀 → 敵を選ぶ → バトル開始 | 入口（降臨の間）の映像が**カクつかず**、終わった直後にカードが押せたか | |
| P3 | 3 ラウンド遊ぶ（カード → ラウンドを終える） | 押してから反応まで**引っかかり**を感じなかったか／本体が熱くならなかったか | |

任意（Mac がある場合のみ）：iPhone を USB 接続 → Mac Safari「開発」メニュー → Web インスペクタ → タイムライン録画で P2 の JS 時間を取る。無ければ上の 3 問で足りる（ROADMAP「CEO iPhone 体感 3 問で代替」）。

### 4-1. 結果（2026-10-10・CEO 実機・`docs/PRACTICAL_QA_V3_RESULT.md` §1）

| # | CEO | 報告文 | 未記録（PASS 扱いにしない） |
|---|---|---|---|
| P1 | **YES** | 「Home 3秒以内」 | 機種・iOS 版・cold（履歴消去）の有無 |
| P2 | **YES** | 「戦闘開始まで滑らか」 | — |
| P3 | **YES** | 「戦闘中の遅延・異常発熱なし」 | — |

- 評価ビルド：integ master `021795b`（preview 4178・LAN）。本書 §3 のエミュレーション（CPU 4×・Fast 3G）と **実機 3 問 YES** が揃ったため DoD #15 は成立（§5）。Known K01・Enemy Select preload 不要の判定は変更なし
- 機種・iOS 版は CEO 報告に無いため記録しない（必要になれば次回 QA で追記）

## 5. 判定（AI）

| 項目 | 判定 | 根拠 |
|---|---|---|
| Enemy Select preload（UX-05／PF-02） | **不要**（v1.0 では入れない） | Fast 3G でも 敵選択→デッキ 0.6 秒。背景は遅延読込のまま体感に出ない。preload は転送量を増やす |
| Known K01 | **維持**（C・修正しない） | CPU 4× で 270〜390ms。映像は時刻どおり・ゲーム進行に影響しない |
| DoD #15「SP 実機 perf evidence が 1 セット存在する」 | **エミュレーション 1 セットで半分**。実機 3 問（§4）が CEO 側で揃えば満たす | — |
| DoD #15（2026-10-10 更新） | **成立**（エミュレーション 1 セット＋CEO 実機 3 問 YES・§4-1） | `PRACTICAL_QA_V3_RESULT.md` §1・§4。機種・iOS 版は未記録 |
| Lighthouse 1 run | 任意（本書の条件は Lighthouse mobile と同じ。スコアが要るときだけ別日に単独実行） | 6GB 制約 |

## 6. 再実行

```
cd <worktree>; npx vite build; npx vite preview --port 4177 --strictPort
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/sp-perf/emulated.mjs docs/evidence/sp-perf/<name>.json http://localhost:4177 --runs 2
```
