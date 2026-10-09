# CM-01 Public Face Pack v1 — Preflight ＋ 実装 ＋ Fast Gate

- 日付：2026-10-09（Lane 1・**AI 判断**（CLAUDE.md §6-2）・`docs/ROADMAP_TO_RELEASE.md` §2 #1 の実体化。CEO 指示 2026-10-07「NEXT NOW＝Public Face Pack v1」・2026-10-09「未完了なら Preflight → 実装 → Fast Gate まで」）
- 状態：**IMPLEMENTED ON BRANCH — Fast Gate PASS（v2：OGP 画像 1200×630 対応済み）— CEO 条件付き承認（2026-10-09 Gate Review）に基づき master 統合**（push・deploy 0）
- worktree／branch：`SevenGodsGame-cm01`／`feat/cm01-public-face-pack`（基点 integ `master` `6c8b226`）
- Human QA：**省略可**（ROADMAP「決定247 型」）。Production 反映後に X／Discord で挑戦状 URL のカード表示を CEO が目視する（§5）
- 不変：`src/core` 差分 0／save 0／Daily 0／Ranking 0／CSS 追加 1 ルール（version 表示のみ）／既存画像の追加・差し替え 0

---

## 1. Preflight（着手前の確認）

| 項目 | 確認結果 |
|---|---|
| 現在地 | master `6c8b226` に CM-01 の痕跡 0（`index.html` は title＋favicon のみ・`og:` 0・`package.json` 0.0.0・専用 branch なし）→ **未着手** |
| ROADMAP の範囲 | meta description／OGP（title・description・image＝既存 keyvisual-hero 流用・url）／twitter:card／theme-color／apple-touch-icon／manifest 最小／ブランド favicon（新規生成なし）／アプリ内 version 表示（0.0.0 → 1.0.0-rc.1・短 sha を Home 隅と Feedback snapshot） |
| 編集競合（Lane 2 公式ボイス） | Lane 2 は `src/components/battle/*`・`public/assets/voice/`・`docs/ASSET_RIGHTS_LEDGER.md`・`docs/assets-kit/`。Lane 1 は `index.html`・`public/*.png,svg,webmanifest`・`package.json`・`vite.config.ts`・`src/buildInfo.ts`・`HomeScreen.tsx`・`setup.css`・`feedbackSnapshot.ts`。**同一ファイル 0**。`docs/DECISIONS.md`／`RELEASE_STATUS.md` は両 Lane とも本 branch では触らない（統合時に Lane 1 → Lane 2 の順で 1 行ずつ） |
| og:image の権利 | `gods/ebisu/keyvisual-hero.webp` は台帳 GOD-K 系（出所 **UNKNOWN-ACCEPTED**・2026-10-07 CEO B 条件付き承認で配信継続）。Home で既に全訪問者へ配信中の画像を OGP に流用する＝新しい公開範囲は SNS カードのキャッシュのみ。**代替**：Kit 公式 `gods/ebisu/front.webp`（1600²・KNOWN ◎）へ 1 行で切替可（§6） |
| favicon の出所 | 既存 `public/favicon.svg`（9.5KB・紫のロゴ・台帳に行なし＝出所不明）→ **「七」モチーフの自作 SVG に置換**（`scripts/public-face/gen-icons.mjs`：幾何＋zlib だけで SVG と PNG を決定論的に生成。外部素材・生成 AI・フォント 0） |
| PWA | ROADMAP §7「DoD に含めないもの」に PWA → manifest は `display: "browser"`・Service Worker 0 |

## 2. 実装

| ファイル | 変更 |
|---|---|
| `index.html` | `meta description`（160 字以内・「SEVENGODS（SGG）二次創作」を明記＝Kit Guidelines §6 の誤認防止）／`theme-color #141230`／icon（svg＋png 192）／`apple-touch-icon` 180／`manifest`／`canonical`／`og:*` 11 項目（image＝`https://seven-gods-game.vercel.app/og-image.jpg`・**1200×630**・alt）／`twitter:*` 5 項目（`summary_large_image`） |
| `public/og-image.jpg`（新規・1200×630・159,611B・sha256 `9c38e40fd32863113986e18977ef84742431ff3fb71a560baeb0ea48fd53989f`）・`scripts/public-face/gen-og-image.mjs` | **CEO Gate Review（2026-10-09）「縦長クロップを解消・既存画像で 1200×630・重要部分を切らず正式名称が分かる構図・新規 AI 生成なし」**の実体。右側に既存 `keyvisual-hero.webp` を**切らずに**高さ 630 で全身表示、左側に「SEVEN GODS／共鳴カードバトル／七柱の神と挑む、七日間の物語。／SEVENGODS（SGG）二次創作／URL」を HTML/CSS（OS フォント）で描画し、Chromium（Playwright）で JPEG q86 に書き出す。生成 AI・外部素材 0。OS フォント依存のためバイト決定論は保証せず、sha256 を台帳に記録 |
| `public/favicon.svg`（置換・467B）・`public/apple-touch-icon.png`（180²・6,971B）・`public/icon-192.png`（7,766B）・`public/icon-512.png`（24,994B）・`public/site.webmanifest` | `gen-icons.mjs` の出力（再実行で sha256 一致＝決定論【実測】） |
| `scripts/public-face/gen-icons.mjs`・`scripts/public-face/check-head.mjs` | 生成器／OGP バリデータ相当の静的検査（39 項目） |
| `package.json` | `version` 0.0.0 → **1.0.0-rc.1** |
| `vite.config.ts` | `define`：`__APP_VERSION__`（package.json）・`__BUILD_SHA__`（`VERCEL_GIT_COMMIT_SHA` → `VITE_COMMIT_SHA` → `GITHUB_SHA` → ローカル git → `local`） |
| `src/buildInfo.ts`（新規） | `APP_VERSION`／`BUILD_SHA`／`buildLabel()`＝`v1.0.0-rc.1 (<sha7>)`。`gameVersion.ts`（ルールの版）とは混ぜない |
| `src/components/setup/HomeScreen.tsx`＋`setup.css` | Home 右下に `.home-version`（10px・opacity .6・absolute・pointer-events none＝layout 非参加・CLS 0）1 行 |
| `src/components/feedback/feedbackSnapshot.ts` | フィードバック本文に `ビルド: v1.0.0-rc.1 (<sha>)` 1 行 |
| `src/publicFace.test.ts`（新規） | head の契約・二次創作表記・og:image が既存配信画像・manifest 整合・buildInfo（4 件） |

## 3. Fast Gate（2026-10-09・本 worktree）

| 項目 | 結果 |
|---|---|
| tsc -b | **0 error** |
| vitest（targeted：feedback・setup・entranceWiring・publicFace） | v1：90 PASS → **v2：95 PASS**（publicFace の og:image 契約を 1200×630／jpeg に更新）。**full vitest（v1 時点）1,335 PASS・9 skip・0 fail** |
| oxlint | **error 0** |
| build | PASS。`dist/index.html` 0.50 → **2.74kB**（head 追加分）・JS 460.48kB（gzip 143.10）・CSS 191.03kB（+0.22kB＝version 1 ルール） |
| `check-head.mjs`（dist） | v1：39／39 PASS → **v2（og-image.jpg）：41／41 PASS**（必須 meta・og:image 実在・JPEG SOF 寸法 1200×630＝宣言と一致・`og:image:type` 一致・159KB ≤ 5MB・icon／manifest／canonical 実在・apple-touch-icon 180² PNG・manifest JSON／theme_color 一致）→ `docs/evidence/cm01/check-head.json` |
| sha 埋め込み | dist に `1.0.0-rc.1` と HEAD 短 sha（`6c8b226`）を確認（Vercel では `VERCEL_GIT_COMMIT_SHA` に置き換わる） |
| CLS（`release-hygiene/cls.mjs`・PC 1508×660／SP 390×760・ホーム→戦闘まで） | **Home のみ CLS 0（PC／SP）**。通し（ホーム→神選択→難易度→敵選択→デッキ→戦闘）の非入力 CLS は PC 0.0061／SP 0.059 で、**master `26a3171` runtime の同一計測（`cls-baseline-master.json`）と完全に同値＝Δ0**（発生箇所はデッキ構築のカード画像読込＝本 Pack の変更外）。44px 未満のタップ領域 0・JS error 0 → `docs/evidence/cm01/cls.json` |
| Home 実表示（PC／SP・version 行・横はみ出し・JS error） | PC 1508×660：`v1.0.0-rc.1 (6c8b226)` を右下（x 1394／y 644・104×10px）に表示・`scrollWidth`＝1508（横はみ出し 0）・JS error 0／SP 390×844：右下（x 276／y 828）・`scrollWidth`＝390・error 0・favicon `/favicon.svg`・title 不変 → `docs/evidence/cm01/home-pc.png`／`home-sp.png` |
| 競合 | `git diff --stat 6c8b226 -- src/core`＝0 行。Lane 2 と同一ファイル 0 |

## 4. 既知の制約・判断

1. ~~og:image は縦長（1086×1448）でクロップされる~~ → **v2 で解消**：1200×630 の専用画像 `og-image.jpg`（既存素材の合成・AI 生成 0）。元の縦長画像は Home 用に従来どおり配信
2. **二次創作表記は description にのみ**（Home UI には出さない。クレジットは任意・Kit §4）。Legal／Credits 画面は CM-02
3. 旧 `favicon.svg`（出所不明）は git 履歴に残るのみ。配信からは外れる
4. 台帳：本 Pack の新規 public ファイル 5 本は統合時に台帳へ追記（同時編集禁止のため本 branch では台帳を触らない）。ICON-01（4 本・**自作**・数式＋zlib・決定論）と OG-01（`og-image.jpg`・**AI 非生成加工**＝既存 `keyvisual-hero.webp`（GOD-K 系・UNKNOWN-ACCEPTED）＋自作 favicon＋OS フォントの文字を Chromium で合成。出所の事実状態は元画像に従い **UNKNOWN-ACCEPTED**・sha256 `9c38e40fd32863113986e18977ef84742431ff3fb71a560baeb0ea48fd53989f`）。ICON-01 の行テキスト：`| ICON-01 | favicon.svg／apple-touch-icon.png／icon-192.png／icon-512.png | scripts/public-face/gen-icons.mjs（決定論） | icon | 自作（幾何＋zlib・素材・AI・フォント 0） | — | 2026-10-09 | — | — | プロジェクト所有 | 可 | — | 不要 | gen-icons.mjs | favicon 4be5dd3c67a67610・ATI 104e9ffc06389e8c・192 50f6f60ceb1d3c69・512 ae743e2128416291 | ◎（KNOWN） |`

## 5. 完了条件（ROADMAP）と残り

- ROADMAP 完了条件「Production で挑戦状 URL が X／Discord でカード表示される」は **Production 反映後にしか確認できない** → merge（CEO 承認）→ Vercel → CEO が X／Discord に URL を貼って目視
- 統合手順（AI）：master へ merge → `docs/DECISIONS.md` 1 行・`RELEASE_STATUS.md` NEXT NOW 更新・台帳 ICON-01 → Release Gate（既存 18 項目）→ Production は CEO（§6-3 #8）

## 6. 切替可能な 1 行（CEO が望む場合）

- og:image を Kit 公式 `front.webp` にする：`index.html` の `og:image`／`twitter:image` の URL と `og:image:width/height` を `…/assets/gods/ebisu/front.webp`・1600・1600 に変更（`publicFace.test.ts` の glob を `*/front.webp` へ）
