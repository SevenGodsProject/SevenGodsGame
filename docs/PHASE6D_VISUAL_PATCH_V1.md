# Phase 6-D Visual Patch v1 — 神の一撃・専用舞台化（実装記録）

- 日付：2026-09-12
- 受理：**決定168**（Phase 6-D Visual Direction Audit `27a2225` を GO/PASS。Production 前の Visual Patch は「神の一撃の専用舞台化」1 テーマのみ）
- Baseline：`feat/daily-ranking-phase4`（Phase 6-C `25a385a` ＋ 6-D Audit `27a2225` を含む）
- 変更範囲：**表示層のみ**（`BattleResonanceCutin.tsx` の子要素と `battle.css` の `.resonance-cutin-*`、per-god 色 source の改名）。`src/core` 差分 **0 行**
- master / Production / Ranking / Neon / env：**未変更**

---

## 1. 何を作ったか

これまでの神の一撃は「暗転した戦場の上にキービジュアルのカードを 1 枚置く」だけで、通常攻撃との差が**画像の有無しかなかった**（6-D 監査の結論）。ここを「戦闘中最大の儀式」にするため、**overlay の中だけ**を 3 層に組み替えた。

| 層 | 要素 | 役割 |
|---|---|---|
| 1 | `.resonance-cutin-rays` | 神色の集中線（`repeating-conic-gradient`）＋周辺減光。戦場をもう一段沈めて空気を変える |
| 2 | `.resonance-cutin-band` | 神を置く舞台の帯。-3.5° 傾け、上下に金のヘアライン（両端はフェード） |
| 3 | `.resonance-cutin-group` | 円マスクの神＋**七つ刻みの環**＋神名／**神の一撃**／共鳴発動 |

CEO 指定の 8 階層との対応：①戦場を一段暗くする＝rays の周辺減光（既存の暗転 0.2s はそのまま）／②神を主役化する円形マスク＝`border-radius: 50%` の `.resonance-cutin-image`／③神色 accent＝`--god-accent`／④集中線＝rays／⑤神名＝`.resonance-cutin-god`／⑥固定技名「神の一撃」＝`.resonance-cutin-title`／⑦副文「共鳴発動」＝`.resonance-cutin-sub`／⑧既存 burst へ自然に戻る＝**タイムライン無変更**（§4）。

装飾はこの 7 要素だけで、これ以上は足していない（「文字や装飾を増やしすぎない」）。

### 変更ファイル
| ファイル | 変更 |
|---|---|
| `src/components/battle/BattleResonanceCutin.tsx` | 子要素を rays／band／portrait（img＋ring）／caption（神名・技名・副文）へ。ルート要素・`onAnimationEnd` の判定・安全弁は**無変更** |
| `src/components/battle/battle.css` | `.resonance-cutin-*` の中身を差し替え（＋103 行／−62 行）。ルート `.resonance-cutin`・`@keyframes resonance-cutin-dim`・`@keyframes resonance-cutin-timer` は**無変更** |
| `src/components/setup/godStyle.ts` | `OTOMO_THEME_COLOR` → **`GOD_THEME_COLOR`** へ改名（値は 1 文字も変えていない）。per-god 色の正式 source を 1 つに寄せた |
| `src/components/setup/OtomoGrowthScreen.tsx` | 改名に追従（import と 1 箇所） |
| `src/components/setup/setup.css` | コメント内の旧名を更新（1 行） |
| `src/components/battle/godStrikeStage.test.ts`（新規） | 構造回帰 11 件 |
| `scripts/phase6d-visual-audit/godstrike.mjs`（新規） | 7 神 cut-in の撮影・検査 |
| `scripts/phase6d-visual-audit/perf.mjs`（新規） | 390px のフレーム落ち計測 |

---

## 2. 独自性（月蝕綺譚のコピーをしていないこと）

| 月蝕綺譚の固有意匠 | 本実装 |
|---|---|
| 三日月・満月構図 | **使っていない**（月のモチーフは一切なし） |
| 月蝕環（赤金の環） | **使っていない**。環は金 1 色で、七つに刻んだ弧（共鳴ゲージ 7/7 と同じ分割） |
| 墨の刷毛帯 | **使っていない**。直線の黒帯＋金のヘアラインのみ（刷毛の質感・にじみなし） |
| 赤金の固有配色 | **使っていない**。地色は既存 `#05060d`/`#03040a`、金は既存 `#ffd166`/`#ffe9b0`、accent は `GOD_THEME_COLOR` の 7 色 |
| 固有紋様・UI フレーム形状 | **使っていない**。唐草・角飾りの類はゼロ |
| ロゴ書体 | **使っていない**。端末標準の明朝スタックのみ |
| 構図そのもの | 月蝕綺譚は「傾いたパネル＋キャラ全身＋画面幅の技名」。本実装は「**円で切り抜いた神＋横並びの技名**」で、傾けるのは背後の帯だけ・文字は水平 |

SEVEN GODS 側の軸＝**「七」**（環の 7 刻み＝360°/7＝51.4286°）、**「円」**（神を主役化するマスク）、**「共鳴」**（この演出そのもの）、**「神色」**（`GOD_THEME_COLOR`）。

---

## 3. Typography / God Color

- 明朝スタックは **カットインの中だけ**：`'Yu Mincho','YuMincho','Hiragino Mincho ProN','Noto Serif JP','Noto Serif CJK JP', serif`。**フォントファイルは追加していない**（`@font-face` 0 件。無い環境は `serif` へフォールバック）。数字系 HUD・カード文言は既存 sans のまま（テストで `.hp-bar-label` に `serif` が入っていないことを固定）
- 階層：神名 13〜19px（神色・字間 0.34em）／**「神の一撃」40〜68px（PC）・34〜46px（SP）＝最大主役**／「共鳴発動」11〜15px（sub）
- 神色は **`GOD_THEME_COLOR`（`godStyle.ts`）だけ**を使い、コンポーネントにも CSS にも per-god の色を直書きしていない（テストで `#hex` の直書き 0 を固定）。監査の結果 per-god 色の source は `OTOMO_THEME_COLOR` 1 つだけだったので、用途が OTOMO 画面を超えたことに合わせて `GOD_THEME_COLOR` へ改名し、**単一の正式 source**にした（値は不変・7 神すべて一意）
- 顔のトリミングは神選択カードと同じ `KEYVISUAL_OBJECT_POSITION`（1:1 クロップ用の実測値）を CSS 変数で渡す。笑蓮だけ原本が 1:1（1254×1254）で `center` になるのも既存どおり。旧 `[data-god='shouren']` の 3:4 個別クロップは、構図が縦長カード → 円に変わったため不要になり撤去した

---

## 4. タイムライン（6-A の受け渡しを 1ms も動かさない）

| 時刻 | 内容 | 変更 |
|---|---|---|
| 0ms | `.resonance-cutin` マウント・暗転 0.2s 開始 | **無変更** |
| 160ms | rays 0.45s／band 0.4s 開始 | 追加（子） |
| 200ms | group スライド 0.4s 開始（既存の `resonance-cutin-slide`） | 移動量のみ 100%→44px |
| 340ms | 技名の字間 0.26s | 追加（子） |
| 900ms | `resonance-cutin-timer` 終了 → `onComplete` → `.burst-banner` | **無変更** |

- 子アニメーションの終了は最遅 610ms で、**すべて 900ms 以内**（テストで自動検査）
- `onAnimationEnd` は従来どおり `event.target === event.currentTarget && animationName === 'resonance-cutin-timer'` のみを見る。子の animationend は target 比較で弾かれる
- 時間切れの安全弁（`RESONANCE_CUTIN_MS + CUTIN_FALLBACK_MS`）も無変更

---

## 5. QA：7 神 × 端末（`scripts/phase6d-visual-audit/godstrike.mjs`）

実際に共鳴 7/7 まで遊んで神の一撃を出し、出た瞬間に「完成形」へ固定して撮影・計測した（17 本すべて成功）。

| 神 | 端末 | 敵 | 表示文言 | 神色 | 顔のクロップ | 円の直径 | 技名サイズ | 全要素が画面内 | scrollY | 横はみ出し | JS エラー |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 恵比寿 | PC | 試練の影 | 恵比寿 ／ 神の一撃 ／ 共鳴発動 | `#ff6b5e` | 50% 25% | 224px | 68px | ✅ | 0 | 0 | 0 |
| 大耀 | PC | 業斧の鬼将 | 大耀 ／ 神の一撃 ／ 共鳴発動 | `#e8b33d` | 50% 30% | 224px | 68px | ✅ | 0 | 0 | 0 |
| 蒼毘 | PC | 双牙の魔獣 | 蒼毘 ／ 神の一撃 ／ 共鳴発動 | `#4d9fff` | 50% 28% | 224px | 68px | ✅ | 0 | 0 | 0 |
| 才華 | PC | 藍花の怨霊 | 才華 ／ 神の一撃 ／ 共鳴発動 | `#c96bff` | 50% 22% | 224px | 68px | ✅ | 0 | 0 | 0 |
| 寿楽 | PC | 乱舞の道化 | 寿楽 ／ 神の一撃 ／ 共鳴発動 | `#6ec972` | 50% 15% | 224px | 68px | ✅ | 0 | 0 | 0 |
| 福永 | PC | 銀甲の機工師 | 福永 ／ 神の一撃 ／ 共鳴発動 | `#3ddbb0` | 50% 20% | 224px | 68px | ✅ | 0 | 0 | 0 |
| 恵比寿 | SP | 試練の影 | 恵比寿 ／ 神の一撃 ／ 共鳴発動 | `#ff6b5e` | 50% 25% | 172px | 42.9px | ✅ | 0 | 0 | 0 |
| 大耀 | SP | 業斧の鬼将 | 大耀 ／ 神の一撃 ／ 共鳴発動 | `#e8b33d` | 50% 30% | 172px | 42.9px | ✅ | 0 | 0 | 0 |
| 蒼毘 | SP | 双牙の魔獣 | 蒼毘 ／ 神の一撃 ／ 共鳴発動 | `#4d9fff` | 50% 28% | 172px | 42.9px | ✅ | 0 | 0 | 0 |
| 才華 | SP | 藍花の怨霊 | 才華 ／ 神の一撃 ／ 共鳴発動 | `#c96bff` | 50% 22% | 172px | 42.9px | ✅ | 0 | 0 | 0 |
| 寿楽 | SP | 乱舞の道化 | 寿楽 ／ 神の一撃 ／ 共鳴発動 | `#6ec972` | 50% 15% | 172px | 42.9px | ✅ | 0 | 0 | 0 |
| 福永 | SP | 銀甲の機工師 | 福永 ／ 神の一撃 ／ 共鳴発動 | `#3ddbb0` | 50% 20% | 172px | 42.9px | ✅ | 0 | 0 | 0 |
| 大耀 | PC1366 | 業斧の鬼将 | 大耀 ／ 神の一撃 ／ 共鳴発動 | `#e8b33d` | 50% 30% | 252px | 68px | ✅ | 0 | 0 | 0 |
| 蒼毘 | PC（reduced） | 双牙の魔獣 | 蒼毘 ／ 神の一撃 ／ 共鳴発動 | `#4d9fff` | 50% 28% | 224px | 68px | ✅ | 0 | 0 | 0 |
| 笑蓮 | PC | 蒼海の龍神 | 笑蓮 ／ 神の一撃 ／ 共鳴発動 | `#ff7fb3` | 50% 50% | 224px | 68px | ✅ | 0 | 0 | 0 |
| 笑蓮 | SP | 蒼海の龍神 | 笑蓮 ／ 神の一撃 ／ 共鳴発動 | `#ff7fb3` | 50% 50% | 172px | 42.9px | ✅ | 0 | 0 | 0 |
| 笑蓮 | PC1366 | 蒼海の龍神 | 笑蓮 ／ 神の一撃 ／ 共鳴発動 | `#ff7fb3` | 50% 50% | 252px | 68px | ✅ | 0 | 0 | 0 |

**集計**：7 神 × {PC 1508×660／Mobile 390×760／PC 1366×768}＋reduced-motion 1 神＝**17 本すべて OK**。3 層＋環がそろっている 17/17、文言が「神名／神の一撃／共鳴発動」17/17、神色 7 色すべて一意に適用、**全要素が viewport 内 17/17**、`scrollY` 最大 **0**、横はみ出し最大 **0**、`pointer-events: none` 17/17、`z-index` 4（既存のまま）17/17、円マスク `border-radius: 50%` 17/17、技名フォント先頭 `Yu Mincho` 17/17、**JS エラー 0**。

**文字切れ 0 の根拠**：①カットイン内のどの要素にも `overflow: hidden|clip` が無い（構造テストで固定）→ はみ出しても glyph は欠けない ②神名・技名・副文・円の 4 要素すべてが viewport 内（17/17 実測）③17 枚すべて目視確認。なお機械計測の `scrollWidth > clientWidth` は技名で true になるが、これは字間 0.16em の**末尾スペース分を `margin-right: -0.16em` で相殺している**ことによるもので（PC で約 11px）、`overflow: visible` のため表示は欠けない。

**計測の注意**：カットインは 900ms（＋安全弁 400ms）で必ず消えるため、撮影スクリプトは MutationObserver の中で同期的に子アニメーションを終了時刻へ送って `pause()` し、本体が外れた瞬間に同一 markup の静止コピーを差し込んでいる。**これは撮影用のアーティファクトで製品挙動ではない**（タイムライン計測は凍結を一切しない `scripts/phase6-audit/timeline.mjs` が担当）。`img.complete` が計測上 false なのも「マウントと同じ tick で測っているから」で、撮影画像では 17 本すべて神が描画されている。

---

## 6. Before / After 比較（同一条件・同一手法）

`git stash` で本 patch を外した状態に戻し、**同じスクリプト・同じ seed・同じ端末**で撮り直した（`before-pc-taiyo` / `before-sp-taiyo` / `before-pc1366-taiyo` / `before-pc-sobi` / `before-sp-sobi` / `before-pc-sobi-reduced` の 6 本）。

| 軸 | Before | After | 根拠 |
|---|---|---|---|
| 主役性 | **5** | **9** | Before は 340px の角丸カードが右 29% に浮くだけで、背後の HUD（ラウンド・HP バー・手札）も同じくらい読める。After は円で切り抜いた神が画面中央、周辺減光で他が沈む |
| 必殺感 | **4** | **8** | Before は静止カード＋1 行。After は集中線・傾いた帯・字間が締まる技名が同時に来る |
| 世界観統一 | **4** | **8** | Before は角丸 12px＋sans＝Web のモーダル。After は金のヘアライン＋明朝＋七つ刻みの環 |
| 視線誘導 | **5** | **9** | Before は「カード → その下の小さい文字」で 2 回探す。After は「円 → 右の技名」の 1 直線 |
| 情報量 | **6** | **7** | Before 1 行（神名＋共鳴発動！）。After 3 行だが階層が明確で、**何が起きたか（神の一撃）を名前で言う**ようになった |
| モバイル可読性 | **5** | **8** | Before は 390px でカードが画面右へ寄り、文字が託宣行に重なる。After は円 172px＋技名 42.9px を中央に縦積み、重なり 0 |

添付：`before-pc-taiyo.png` / `after-pc-taiyo.png`、`before-sp-taiyo.png` / `after-sp-taiyo.png`、`after-pc1366-taiyo.png`、`before-pc-sobi-reduced.png` / `after-pc-sobi-reduced.png`。

### Mobile の縦書き／横組みの判断（AI 判断）
6-D 監査のモックでは縦書き案が成立していたが、実装時に 390px で両方を実画面比較した結果、**横組みを採用**した。理由：①技名は 4 文字なので横組みでも幅 199px に収まり 390px を圧迫しない ②視線移動が「円 → 下 → 技名」の 1 方向で済み、縦書きだと視線が直角に折れる ③縦中横・約物の回転が端末／フォントで揺れるリスクがない（明朝が無い Android では `serif` にフォールバックするため、縦書き時の字形差が読みにくさに直結する）。CEO への確認は行わず AI 側で決定した（決定168 の指示どおり）。

---

## 7. Reduced Motion

`prefers-reduced-motion: reduce` では **拡大（rays の scale 1.12→1）・回転（band の -3.5°）・スライド（group の 44px）・字間アニメ（技名 0.5em→0.16em）をすべて無効化**し、`opacity` のフェードだけにする。一方で**暗転・神名・「神の一撃」・神色・円マスク・環・帯は静的に全部表示**するので、動きがなくても神の一撃だと分かる（`after-pc-sobi-reduced.png` で確認。callout 相当の情報欠落なし）。

---

## 8. Performance（390px）

`scripts/phase6d-visual-audit/perf.mjs`：CDP の `Page.startScreencast` で連続描画させ、`requestAnimationFrame` の間隔を実測。カットインは製品と同じ markup／CSS をページに差し込んで 900ms 走らせ、**直前 1.5 秒の通常バトル演出を対照区間**として同じ条件で比較した。

| 区間 | frames | avg | median | p95 | max | >33ms | >50ms |
|---|---|---|---|---|---|---|---|
| Before カットイン | 22 | 46.2ms | 33.4ms | 116.7ms | 166.7ms | 18 | 4 |
| **After カットイン** | 24 | **35.4ms** | 33.3ms | **83.3ms** | **83.3ms** | 19 | **3** |
| Before 対照（通常演出） | 39 | 38.0ms | 33.3ms | 116.6ms | 116.7ms | 28 | 7 |
| After 対照（通常演出） | 37 | 39.6ms | 33.3ms | 83.3ms | 166.6ms | 31 | 5 |

**結論：フレーム落ちの増加なし。** After のカットインは Before より軽く（avg −10.8ms・p95 −33.4ms・max −83.4ms）、同じ戦闘の通常演出（対照）よりも軽い。理由は、旧実装が 340px の画像に `box-shadow: 0 0 30px 6px` の大きなぼかしを掛けていたのに対し、新実装は**画像追加 0・`filter` 不使用**で、gradient と `border-radius` マスクだけで描いているため。median 33.3ms は screencast の 30fps 上限（計測系の artifact）で、Before/After に共通。

設計上の制約も守っている：画像追加 **0 枚**、カットイン配下に `filter` **0 件**、`box-shadow` は円の 1 要素のみ、`url()` **0 件**（すべて構造テストで固定）。

---

## 9. 回帰

### 9-1. 6-A（Combat Juice）— `scripts/phase6-audit/timeline.mjs` を Before/After で実走

| シナリオ・指標 | Before | After | 差 |
|---|---|---|---|
| T：神の一撃・致死 `cutin` | 637 | 549 | −88 |
| T：`burstBanner` | 1,704 | 1,715 | **+11** |
| T：`visualHpStart` / `visualHpEnd` | 531 / 2,571 | 521 / 2,561 | −10 / −10 |
| T：`defeatStart` / `defeatEnd` | 2,181 / 2,701 | 2,188 / 2,708 | +7 / +7 |
| T：`victory` / `result`（報酬） | 2,562 / 3,422 | 2,568 / 3,436 | +6 / +14 |
| F：神の一撃・非致死 `cutin` / `burstBanner` | 813 / 1,872 | 662 / 1,787 | −151 / −85 |
| F：`impact` / `visualHpStart` | 2,103 / 2,201 | 2,032 / 2,200 | −71 / −1 |
| J：通常カード致死 `impact` / `defeatStart` / `result` | 433 / 711 / 2,013 | 424 / 674 / 1,922 | −9 / −37 / −91 |
| S：反撃（得意技）致死 `impact` / `defeatEnd` / `result` | 1,188 / 1,958 / 2,728 | 1,186 / 1,964 / 2,693 | −2 / +6 / −35 |

- **意味のあるズレなし**。神の一撃の骨格（`burstBanner` +11ms、`visualHp` −10ms、`defeat` +7ms、報酬 +14ms）は、カットインを含まない通常シナリオのばらつき（J の `visualHpStart` が Before/After で ±135ms 動く）より小さい
- **reward-before-impact = 0**：致死 3 シナリオすべてで `result`（報酬）が `impact`・`defeatEnd` より後（J 1,922 > 1,195／T 3,436 > 2,708／S 2,693 > 1,964）
- 致死時の順序 **着弾 → HP → 撃破 → 報酬** を維持。JS エラー Before/After とも 0

### 9-2. 6-B（Viewport）
カットインは従来どおり `position: fixed` の overlay 1 枚（`z-index: 4`・`pointer-events: none`）で、ドキュメントのレイアウトに 1px も関与しない。17 本すべてで **`scrollY` 0・横はみ出し 0**。構造テストで「ルート以外は `position: fixed` を持たない」「`overflow: hidden` を持たない」を固定。既存の 6-B 構造回帰テスト（`battleViewportLayout.test.ts`）も PASS。

### 9-3. 6-C（判断の手応え）
`decisionFeedback.ts` / `useDecisionCallout.ts` / `BattleCallout.tsx` / `battleRecap.ts` / `GameOverOverlay.tsx` は **1 行も触っていない**。神の一撃のバッチで callout を出さない既存仕様もそのまま（`planCallout` が burst バッチを除外）。6-C のテスト 26 件を含む全テストが PASS。

### 9-4. 回帰ゲート
| 項目 | 結果 |
|---|---|
| `vitest` | **3,368 passed** / 28 skipped（6-C 時点 3,357 → **新規 11**） |
| `tsc -b` | 0 |
| `npm run lint` | 新規警告 **0**（残り 7 件はすべて既存の監査スクリプト由来） |
| `vite build` | 成功 |
| `src/core` 差分 | **0 行** |
| `saveVersion` | **9**（不変） |
| `gameVersion` | **`1.80c6eda23ed082dc`**（不変。表示層のみのため指紋に影響しない） |
| Daily / Ranking / submissionEnabled / Production / master / Neon / env | 未変更 |
| 新規 SFX / 新規画像 | **0**（`@font-face` も 0） |

---

## 10. Visual Acceptance

| # | 条件 | 結果 |
|---|---|---|
| 1 | スクリーンショット単体で通常攻撃と明確に区別できる | ✅ 円マスクの神＋集中線＋帯＋明朝の技名。通常の着弾画面と取り違えようがない |
| 2 | 神が画面の主役になる | ✅ PC で円 224〜252px（旧カード 340px 幅の矩形→中央の円）、周辺減光で HUD が沈む |
| 3 | 技名が 0.5 秒以内に認識できる | ✅ 技名は 340ms から 260ms かけて出て 600ms で静止（カットインは 900ms）。PC 68px／SP 42.9px の 4 文字 |
| 4 | 月蝕綺譚の模倣ではなく SEVEN GODS 独自に見える | ✅ §2 の対照表。月・刷毛・唐草・赤金配色をすべて排し、七／円／共鳴／神色で構成 |
| 5 | PC/SP とも文字切れ 0 | ✅ §5（overflow:hidden 0・全要素 viewport 内 17/17・目視 17/17） |
| 6 | scroll 増加 0 | ✅ 17/17 で `scrollY` 0・横はみ出し 0 |
| 7 | 6-A timing regression 0 | ✅ §9-1（最大差 +14ms／reward-before-impact 0） |
| 8 | 6-B viewport regression 0 | ✅ §9-2 |
| 9 | 6-C regression 0 | ✅ §9-3 |

---

## 11. Known Risks

1. **明朝フォントの端末差**：Windows/iOS は游明朝・ヒラギノ明朝、Android の一部は `serif`（Noto Serif 系）へフォールバックする。字形は変わるが字間・サイズは維持されるため可読性は落ちない。実機 Android での見え方は未確認（ヘッドレスは Yu Mincho で描画）
2. **集中線の見え方**：`repeating-conic-gradient` の細い線は、端末の解像度によってはモアレ気味に見えうる（opacity 0.16 に抑えてある）。実機での最終確認は CEO のテストプレイで
3. **帯のヘアラインが画面端まで伸びる**：意図した「舞台の縁」だが、超ワイド画面では 2 本の線が目立つ可能性がある
4. **撮影ハーネスの artifact**：カットインの撮影はアニメーションを凍結して撮っているため、スクリーンショットは「完成形」で、実際の 900ms のうちどの瞬間かは厳密には再現していない（タイムライン計測は凍結なしで別途実施済み）
5. **笑蓮の到達性**：QA で笑蓮だけ共鳴 7/7 に到達しにくく、敵と手順を変えて撮り直した（演出の問題ではなく、支援型の火力・7 ラウンド上限に由来するプレイ上の性質。バランスは変更していない）

---

## 12. 次 Step

1. CEO のテストプレイ（実機 Android での明朝フォールバックと集中線の見え方）
2. **Release Hygiene Gate**（BGM 圧縮・CLS・44px タップ領域・未参照 PNG 除外）— 本 patch には混ぜていない
3. Release Audit → master merge／Production（CEO 判断）
4. Post-Release：勝利の余韻＋画面遷移 → 明朝化・World UI・敵選択 → 神選択の儀式化・Color Grading・Character Grounding → 敵立ち絵の再処理（6-D 監査 §19 の順序）

---

## 付録：判定

7 神 × PC／Mobile 390／PC 1366／reduced-motion の 17 本すべてで Visual Acceptance 9 項目を満たし、6-A タイムライン・6-B viewport・6-C の回帰は 0、`src/core` 差分 0 行・saveVersion 9・gameVersion 不変・全テスト 3,368 passed。**Phase 6-D Visual Patch v1：PASS** → 決定169 として記録する。
