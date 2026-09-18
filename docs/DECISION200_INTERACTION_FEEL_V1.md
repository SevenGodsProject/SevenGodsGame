# 決定200 — Interaction Feel v1 実装（押した瞬間の手応え）

- 日付：2026-09-19（実装）／2026-09-19（CEO Human QA・Close-out）
- branch：`feat/interaction-feel-v1`（**local master `3470545` から分岐**＝決定198 の記録 commit を含む。push・master merge・deploy は未実施）
- 判定：**PASS / CLOSED**（CEO Human QA PASS。**Production 反映はしていない**）
- 区分：実装方式・Tier 分け・判定は **AI判断**（CLAUDE.md §6-2）。着手は **CEO指示**（決定200）
- 上流：`docs/DECISION199_INTERACTION_FEEL_AUDIT.md`（PASS WITH MODIFICATIONS・推奨 IMPLEMENT）
- Production：`origin/master` = `3b416da`（**不変**）

---

## 1. 目的

**「押した瞬間に、自分の入力がゲームへ伝わったと感じられること。」** 新機能は足していない。

決定199 の実測では、押した瞬間に見た目が変わる要素は **0 個**だった（`:active` は全 51 ボタン中 1 件のみ、`touch-action`／tap-highlight／`user-select` は 0 件）。手札カードは押しても 280ms（音）・370ms（着弾）まで何も返らない。ここを **CSS だけ**で埋めた。

---

## 2. 実装

### 2-1. 新規 `src/components/press.css`（1 ファイルに集約）

| # | 内容 | 対象 |
| --- | --- | --- |
| 1 | **Touch hygiene**：`touch-action: manipulation`／`-webkit-tap-highlight-color: transparent`／`user-select: none` | `button`, `summary`（テキストを選ぶ領域・textarea には掛からない） |
| 2 | **Tier 1（頻繁・軽い）**：`translateY(1px) scale(0.985)`、押し込み 60ms | 手札カード・神託 3 択・デッキ ±・ログ・ヘッダーアイコン・Home リンク・結果のテキストリンク・報酬見送り・神の選び直し |
| 3 | **Tier 2（意思決定）**：`scale(0.97)` ＋ `filter: brightness(0.94)`、押し込み 60ms | Home Primary／Secondary・今日の神域・神タイル・この構成で始める・難易度・神階 chip・最終試練・絆経路・敵タイル・デッキ操作／確定・ラウンドを終える・報酬カード・結果ボタン全般・チュートリアル閉じる・感想 |
| 4 | **Tier 3（クライマックス）** | **無変更**（神技・撃破・勝敗演出は既存 Combat Juice のまま） |
| 5 | **押せないカードの手掛かり**：`.card-view:disabled:not(.card-view-playing) { filter: grayscale(0.35) brightness(0.72) }` | 敵ターン中・使用中 |
| 6 | **`:focus-visible`**：`outline: 2px solid #ffd166; outline-offset: 2px` | T1＋T2（敵タイルは既存の金枠があるので除外） |
| 7 | **動きを減らす設定**：`:active` の `transition-duration: 0s` のみ。**押した状態そのものは残す** | 上記すべて |

押し込みは `:active` 側に短い transition（60ms）を置いた。指を離すと元の transition（150〜200ms）に戻るため、**速く沈んで、ゆっくり戻る**。JS タイマーは 1 つも増やしていない。

### 2-2. sticky hover の解消（hover guard）

transform／box-shadow を「none 以外」に変える `:hover` **18 規則**を `@media (hover: hover) and (pointer: fine)` の内側へ移した。PC の見た目は変わらない。

敵選択カードの 2 規則は `:hover` と `:focus-visible` が同じセレクタに同居していたため **分離**し、キーボードの `:focus-visible` は端末を問わず効くように guard の外へ残した。

打ち消し用の 2 規則（`.deck-builder-clear-button:hover`・`.result-link:hover` はいずれも `transform: none`）はそのまま。touch では無害で、guard が失われたときの保険にもなる。

### 2-3. 読み込み

`src/App.tsx` の最後で `import './components/press.css'`。既存 CSS のあとに載る。順序に依存しないよう `:not(:disabled):active`（詳細度 0,3,0）で既存規則（0,2,0）より高くしてある。

---

## 3. Exact Files Changed

| ファイル | 変更 | 行 |
| --- | --- | --- |
| `src/components/press.css` | **新規**（Tier・touch 作法・disabled cue・focus・reduced-motion） | +185 |
| `src/App.tsx` | import 1 行＋コメント 2 行 | +3 |
| `src/components/battle/battle.css` | hover 8 規則を guard へ | +54 / −32 |
| `src/components/setup/setup.css` | hover 8 規則を guard へ＋敵タイルの hover/focus 分離 | +73 / −25 |
| `src/components/tutorial.css` | hover 1 規則 | +6 / −3 |
| `src/components/feedback/feedback.css` | hover 1 規則 | +6 / −3 |
| `src/components/pressFeel.test.ts` | **新規**（静的テスト 11 件） | +180 |
| `scripts/interaction-feel-v1/acceptance.mjs` | **新規**（ブラウザ受け入れ 28 項目・QA 用） | +430 |
| `docs/DECISION200_INTERACTION_FEEL_V1.md` | 本書 | – |

**runtime の TSX 変更は `App.tsx` の import 1 行だけ。`src/core` の差分は 0。**

---

## 4. Interaction Laws — 何が改善されたか

| Law | 改善前 | 改善後 |
| --- | --- | --- |
| **1 押せるものは押した瞬間に反応する** | pointerdown 反応 **0 要素**・`:active` 1/51・tap 制御 0 | **代表 10 要素すべてで押下状態が適用**（実測レイテンシ 0.0ms）・`touch-action`／tap-highlight／`user-select` が全ボタンに |
| 2 強い行動ほど重い | hit stop 4 段 | **無変更** |
| 3 重要な成功には返答 | cut-in・flash・SE | **無変更** |
| 4 予告→タメ→開示 | 共鳴 3 段 | **無変更** |
| 5 繰り返す操作は短く | 報酬 remount・勝利 skip 不可 | **今回は触らない**（§14） |
| 6 演出は結果を変えない | `src/core` 純粋 | **維持**（CSS のみ・`src/core` diff 0） |
| 7 頻度×強度 | なし | **Tier 1／2 で予算を分けた**（最頻のカードが最軽） |

追加で解消：**iOS sticky hover**（決定199 で emulation 再現）、**押せないカードが押せるように見える問題**、**暗い背景で見えない focus ring**。

---

## 5. PC Evidence（`scripts/interaction-feel-v1/out/acceptance.json`）

押下から見た目が変わるまでを **ページ内の rAF で実測**（Playwright の往復時間を除外）。

| 要素 | 押下規則の適用 | 実測レイテンシ |
| --- | --- | --- |
| Home Primary CTA / 神タイル / 難易度 / この構成で始める / 敵タイル / デッキ確定 / **手札カード** / 神託 / ラウンドを終える / 結果 Primary | すべて `true` | **すべて 0.0ms**（CSS 宣言は 60ms） |

`touch-action: manipulation`・tap-highlight `rgba(0,0,0,0)`・`user-select: none` は全対象で確認。

## 6. Mobile Evidence（390×844 emulation）

| 要素 | tap 後 | 判定 |
| --- | --- | --- |
| 神タイル | 画面遷移で unmount | sticky なし |
| 難易度 | `none`（idle と同じ） | **sticky 解消** |
| ラウンドを終える | `none` | **sticky 解消** |
| ラウンドを終える（**敵ターン後**） | `none` | **決定199 で再現した `translateY(-2px)` の残留が消えた** |
| 手札カード | `touch-action: manipulation`・tap-highlight 透明 | OK |

## 7. Card Timing — before / after

| 区間 | 変更前（Production `3b416da`） | 変更後 | 判定 |
| --- | --- | --- | --- |
| click → 手札から消える | 334.8ms | **310.5ms** | 設計値 280ms の帯（240〜420ms）内・差 24ms |
| click → ダメージ表示 | 334.8ms | **310.5ms** | 420ms 以内 |
| click → 敵 HP が減る | 736.7ms | **566.4ms** | どちらも計測機の負荷込み。設計値は 460〜520ms |
| 敵 HP | 1,000→880 | 780→660 | どちらも −120（同じカード） |

**タイミング定数は 1 つも触っていない**（`CARD_PLAY_REVEAL_MS 280`・`CARD_IMPACT_MS 90`・`ENEMY_TURN_REVEAL_MS 700`・hit stop・HP lag はすべて不変）。差は計測機の負荷。

## 8. Core Invariants

| 項目 | 結果 |
| --- | --- |
| `src/core` runtime 差分（Production 比） | **0** |
| `saveVersion` | **9**（不変） |
| `gameVersion` | `1.80c6eda23ed082dc`（不変・テスト 10 件 PASS） |
| 新規 storage キー | **0** |
| 依存追加 | **0**（`package.json`／lock 差分 0） |
| 敵の意図・7R・AP・神託・共鳴・BURST・カード・神・OTOMO・難易度・スコア・seed・Daily・Save・Result Hub・49・Solve Loop | **すべて不変**（CSS のみのため構造的に保証。回帰テストでも確認） |

---

## 9. Automated Tests

### 9-1. 静的（`src/components/pressFeel.test.ts`・11 件 PASS）

touch 作法の存在／T1・T2 の `:active` 存在と値／**押し込みが 60ms 以内**（press.css 内の全 ms 値の最大 ≤60）／disabled cue が `filter` で `!important` を使わない／`focus-visible` の金枠／reduced-motion が時間だけ 0 にし押下状態を消さない／**transform・box-shadow を動かす `:hover` が 1 つ残らず guard 内**（全 CSS を機械走査）／主要 hover が実際に guard 内／敵タイルの `:focus-visible` は guard 外／App の import 順。

### 9-2. ブラウザ（`scripts/interaction-feel-v1/acceptance.mjs`・**28/28 PASS**）

AC1 押下状態（10 要素）／AC2 SP sticky hover（4 項目）／AC3 カードのタイミング（Production を baseline に比較）／AC4 disabled cue と「押しても出ない」／AC5 focus outline／AC6 reduced-motion／AC7 console error・404／AC8 touch-action・tap-highlight・user-select。

### 9-3. 全体

`npx tsc -b` エラー 0 ／ `npx oxlint src` 警告 0 ／ `npm run build` 成功 ／ **`npx vitest run --dir src` 90 files・1,134 tests 全通過**。

---

## 10. Regression（すべて local preview に対して・1 本ずつ順番に実行）

| スイート | 結果 |
| --- | --- |
| Entrance E1 acceptance（4 viewport・AC1〜AC25b） | **ALL PASS** |
| Solve Loop v1 acceptance | **17/17 PASS**（初回 15/17 は自動プレイが敵 HP 40 で惜敗し、製品は正しく「同じ盤面でもう一度」を表示した test 側の揺らぎ。再実行で全 PASS） |
| Invalid Enemy ID Hardening | **ALL PASS**（2 viewport・10 シナリオ） |
| Ranking Absence Gate | **PASS**（18 項目） |
| Secret Audit | **PASS** |
| Daily・Save/Resume・Result Hub・49 progression | 上記スイート内で確認（Daily 回数 1→2・続きから再開・Result Hub の出口・初撃破） |

---

## 11. Performance

| 項目 | 結果 |
| --- | --- |
| CLS PC / SP | **0.0074 / 0.046**（決定170・決定197 と同値） |
| 44px 未満の操作要素 | **0** |
| 全画面スモーク（PC・SP 各 9 画面） | 404 0・JS error 0・壊れた画像 0 |
| 追加した JS | **0**（CSS のみ。rerender 増加なし） |
| アニメーション lib | **0**（依存追加なし） |
| バンドル | CSS 142.52 kB → **147.50 kB**（gzip 26.95 → **27.58 kB**、+0.63 kB）。JS は 432.69 kB で不変 |
| 実装手法 | `transform`／`filter`／`opacity` のみ＝compositor 完結。layout を動かさない |

---

## 12. Ranking / Neon / Secrets

Ranking Absence Gate 18 項目 PASS、Secret Audit PASS、`feat/daily-ranking-phase4` `762168f` 不変、Neon 接続 0、`.env` 0。CSS のみの変更のため構造的に無関係。

---

## 13. Known Issues Not Fixed（決定199 で記録・今回は触らない）

- 結果 Primary の二重押しガード（`runExit` に ref なし）
- 報酬選択後に結果カードが remount され 1.9 秒の演出が再生される
- 勝利の結果到達まで 4.3〜5.8 秒・skip 不可
- ラウンド終了（700ms）・BURST（~1,100ms）の入力復帰が着弾より早い
- `card_draw` がラウンド開始時に枚数ぶん同時発火／`resonance_gain` の高頻度
- ダイアログの focus trap・Escape（Tutorial／Reward／GameOver）
- BossEntrance 1.5 秒中に下の盤面がタップできる
- 画面遷移の fade・BGM クロスフェード
- UI 押下 SFX（v1 では音を足さない。決定200 §12 のとおり別 milestone）

---

## 14. CEO Human QA — PASS（2026-09-19）

- 対象：本ブランチ `feat/interaction-feel-v1` `e359104` のビルドを `vite preview --host --port 4181` で配信（PC `http://localhost:4181/`／実機 `http://192.168.11.6:4181/`）
- 判定：**PASS**（**CEO判断**）
- 確認した質問：「押した瞬間に反応が返ってくる感じがあるか」

| # | 端末 | 確認項目 | CEO コメント（原文） | 判定 |
| --- | --- | --- | --- | --- |
| 1 | PC | Home Primary CTA | 「押した感じがある」 | **PASS** |
| 2 | PC | 神・敵・難易度の選択 | 「選んだ感がある」 | **PASS** |
| 3 | PC | カード 3 枚 | 「押した感じがある」 | **PASS** |
| 4 | iPhone | ラウンド終了後にボタンが浮いたままにならない | 浮いたままにならない | **PASS** |
| 5 | iPhone | デッキ ± を 5 回連打してもズームしない | ズームしない | **PASS** |
| 6 | iPhone | 敵ターン中の手札が「押せない」と分かる | 押せないと分かる | **PASS** |

**この QA で確認された最重要点**：自動テストが証明できるのは「押下規則が適用される」「レイテンシ 0.0ms」「tap 後に hover が残らない」という**事実**までで、それが**手応えとして届いているか**は測れない。CEO の「押した感じがある」「選んだ感がある」という言葉が、決定200 の目的（押した瞬間に入力がゲームへ伝わったと感じられること）を満たした唯一の証拠である。

②の「**選んだ感**」は、決定199 で指摘した「hover と選択状態が alpha 差しか無く区別がつかない」問題に対して、Tier 2 の押し込み（`scale(0.97)` ＋ `brightness(0.94)`）が選択の瞬間を作れたことを示す。

④⑤⑥はいずれも決定199 で実測した具体的な不具合（sticky hover・ダブルタップ拡大・押せないカードが押せるように見える）が実機で解消したことの確認である。

---

## 15. Known Risks

| リスク | 評価 | 対処 |
| --- | --- | --- |
| PC の hover が消える端末がある（hover 対応の判定ミス） | 低 | `@media (hover: hover) and (pointer: fine)` は標準。タッチ対応ノート PC はマウス接続時に `fine` を満たす。hover が出なくても `:active` と `:focus-visible` で操作できる |
| `scale(0.97)` が幅広ボタンで大きく見える | 低 | SP の Primary（幅いっぱい）でも 3% ＝ 約 10px。Human QA で確認 |
| `filter` が多数のカードに掛かる（敵ターン中 最大 10 枚） | 低 | GPU 合成。CLS・スモークとも変化なし |
| 敵タイルの旧 `:active`（−1px scale .99）が残っている | 無害 | press.css の Tier 2 が詳細度で勝つ。press.css が読めなかったときの控えとしてコメント付きで残した |

---

## 16. 判定（Close-out）

**PASS / CLOSED。** CEO Human QA（PC 3 項目・iPhone 3 項目すべて PASS）により、決定200 の実装フェーズを完了とする。

**Production 反映はしていない。** commit は `feat/interaction-feel-v1` ブランチのみで、push・master merge・deploy は未実施（CLAUDE.md §6-3 #8：Production 公開は CEO 判断）。次 Phase（Solve Legibility／Living Hero／OTOMO／Ranking／UI SFX v1.1／§13 の隣接バグ修正）にも着手していない。

次に進むには CEO の Release Gate 実施指示が必要。Release Gate へ進む場合の前提は以下のとおり（本 Decision では実施しない）。

- 本ブランチは local master `3470545` から分岐しているため、**決定198 の記録 commit を含んだまま** Release Gate へ進められる。Production（`origin/master` `3b416da`）との差分は「決定198 docs 1 commit ＋ 本 commit」の 2 つ
- 変更は CSS と import 1 行のみで `src/core` diff 0・storage 0・依存 0 のため、Rollback は Vercel Instant Rollback だけで済む（保存データの巻き戻し不要）
- `docs/DECISIONS.md` には決定200 の行を追記済み。決定199 の監査文書（`docs/DECISION199_INTERACTION_FEEL_AUDIT.md`）と監査スクリプトは、決定199 §22「成果物は原則 untracked・commit 禁止」に従って**未 commit のまま**にしてある（決定194・195 の成果物と同じ扱い）
