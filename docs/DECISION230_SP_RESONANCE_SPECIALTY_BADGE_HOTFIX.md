# 決定230 — SP Resonance／Specialty Badge Hotfix

- 日付：2026-09-27
- 種別：**Narrow CSS Hotfix**（`battle.css` のみ・SP のみ）。**Fast Gate PASS／CEO 承認待ち**。commit／merge／push／deploy なし
- 判断主体：AI チーム（CLAUDE.md §6-2）。Release は CEO 判断
- Production baseline：master＝origin/master＝**`babe3e5`**（決定229 LIVE・Vercel `6686647810`）
- 注記：決定229 の時点で「V-2 Card Premium v2＝決定230」と仮置きしていたが、CEO 指示により本 Hotfix を決定230 とする。Card Premium v2（豪快な一撃 1 枚）は Lane3 として別番号で扱う

---

## 0. 結論
| 項目 | 結論 |
|---|---|
| 症状 | 得意技を持つ 蒼毘・福永・笑蓮 の SP で、共鳴の札の「得意技 …」バッジが札の外・画面の右端の外へ出て読めない（3〜72px 画面外）。「共鳴」が縦 2 行 |
| 原因 | 見出し `.god-otomo-plate-head` が「共鳴」とバッジを **横 1 列（flex・nowrap・space-between）** に並べていた。バッジは `white-space: nowrap`（80.8〜131.9px・発動中は 113.8〜129.8px）で縮まず、SP の札の中身は 47／55／65px（360／390／430）。**不足 43〜118px**。縮められる「共鳴」が 1 文字幅（13.4px）に潰れて縦 2 行 |
| 決定228 で見落とした理由 | ①決定228 の Gate は得意技の無い大耀・寿楽だけで計測していた ②決定228 より前（`5263c3d`）は列幅が中身で決まり、バッジに押されて共鳴の列が 136〜187px に太り、画面全体が右へはみ出していた（決定228 が直した「列幅の揺れ」の一因）。決定228 で列幅を固定した結果、はみ出しの形が「列が太る」から「札の外へ出る」に変わった。どちらも原因は見出しの 1 列並び |
| 修正 | SP だけ見出しを折り返し可にし、「共鳴」は常に 1 行、バッジは次の行。バッジは語の境目で折り返す（「得意技／反撃の構え」・`word-break: keep-all`）、「発動中」は 3 行目。文字の大きさは既存のまま（10px／9px）。名前 1 語（最長「無傷の慈愛」48.2px）が縮めずに入るよう、バッジを札の左右の余白のうち 7px まで広げる（360px で文字の入る幅 53px） |
| 比較した案 | A 文字を小さく（1 列に収めるには 8px 未満）＝却下（極端に小さくして逃げない）／**B 見出しの折り返し＝採用**／C バッジを神の札へ移す（TSX 変更が要る）・絶対配置（神の札と衝突）＝却下 |
| 変更 | `src/components/battle/battle.css` +45／−0（`@media (max-width: 899px)` の 1 ブロック）。得意技の無い神は見出しが「共鳴」だけなので何も変わらない |
| Human QA の要否（AI 判断） | **自動 Gate で十分と判断**（§4）。CEO 承認待ち |

## 1. Root Cause 実測（Production `babe3e5`・`audit.mjs`）
| 幅 | 札の中身 | 「共鳴」本来の幅 | バッジ本来の幅（発動中） | 札の外へ | 画面の右端の外へ |
|---|---|---|---|---|---|
| 360 | 47px | 26.8px | 蒼毘 96.8（129.8）／福永 80.8（113.8）／笑蓮 131.9（発動中） | 52〜103px | 21〜72px |
| 390 | 55px | 同 | 同 | 44〜95px | 13〜64px |
| 430 | 65px | 同 | 同 | 34〜85px | 3〜54px |
| PC 900〜1508 | 183〜276px | 同 | 同 | 0 | 0 |
- 見出し：`display:flex; flex-wrap:nowrap; justify-content:space-between; gap:6px`／「共鳴」13px・`flex-shrink:1`／バッジ 10px・padding 2px 8px・`white-space:nowrap`
- 得意技の無い 4 神（恵比寿・大耀・才華・寿楽）は「共鳴」1 行・問題なし
- 決定228 前（`5263c3d`）：共鳴の列 136〜187px（得意技の神）／大耀は 50〜80px。バッジは画面の右端の外 18〜100px

## 2. Fast Gate（2026-09-27・CEO 指示で全組合せ Gate から切替）
全組合せの Visual Gate は時間超過のため中断（After 35/35・Before 27/35 run で停止）。取得済みの証跡は `scripts/decision230-reso-badge/out/` に全部保存して再利用した。

| Gate | 範囲 | 結果 |
|---|---|---|
| 修正後の実測（`audit.mjs`） | 7 神 × 360／390／430／768 | 「共鳴」**1 行（28/28）**・バッジは札の枠内・文字の切れ 0・画面外 0・横スクロール 0・error 0。バッジは 360〜430 で「得意技／反撃の構え」「得意技／大勝負」（430 は 1 行）「得意技／無傷の慈愛／発動中」 |
| Visual（取得済みの証跡・`layoutgate.mjs`） | After 35 run（SP 3 幅・768・PC 3 幅 × 大耀×龍神／寿楽×魔獣／蒼毘×龍神／福永×機工師／笑蓮×魔獣）・Before 27 run | 比較できた 270 項目の差は 11 件＝得意技 3 柱の「共鳴」2 行→1 行（意図どおり）だけ。列幅固定・Intent・吹き出し・バッジ・重なり・横切れ・横スクロール・error は同一 |
| 長い Intent（得意技あり） | 福永×銀甲の機工師（溜め「⚡ 砲身に魔力を溜めている…」）・SP 3 幅 | 「共鳴」1 行・横スクロール 0・error 0 |
| バフ 3・デバフ 4（得意技あり・`fastgate.mjs` B） | 蒼毘・福永・笑蓮 × SP 3 幅。名札にバフ 3・敵にデバフ 4 のバッジを**表示だけ**差し込み（得意技の神のデッキでは bot が届かないため。ゲームの数値には触れない） | 9/9：「共鳴」1 行・得意技バッジ枠内・文字の切れ 0・名札どうしの重なり 0・バッジのはみ出し 0・Intent 1 行・横スクロール 0・画面外 0・error 0 |
| SP 全要素比較（アニメ停止・`fastgate.mjs` A） | 蒼毘・福永・笑蓮・大耀 × SP 3 幅 | **大耀＝差分 0**。得意技 3 柱＝差分は共鳴の札の中だけ（＋OTOMO の透明な入れ物の上端）。**OTOMO の絵は位置・大きさとも同一**（360：`310.2,441.2,46.8,46.8`） |
| 決定229 構図（`measure.mjs`） | 8 組（7 神・7 敵）× SP 3 幅・Before／After | 神・敵の大きさ・向き（敵反転・神非反転）・敵↔神／神↔OTOMO の間隔が同一（静止時の差は ±1px の待機アニメの位相のみ。得意技の無い組にも同じ揺らぎ）。神の頭と共鳴の札の間は最小 119px |
| 着弾（`fxprobe.mjs`） | 大耀×龍神（決定224 の seed）／寿楽×魔獣／才華×機工師／大耀×機工師／**蒼毘×龍神** × 4 幅 | 482/482 が絵の中・名札との重なり 0・error 0 |
| 決定224／226 | 静的確認 | 変更したセレクタ（`.god-otomo-plate-head`・`.god-passive-badge`・`.god-passive-armed-mark`）は READY／⚡／勝利の舞台／カットイン／カードのファイルに出てこない＝接点 0。着弾（READY の seed を含む）は上の fxprobe で同一。**再実行なし**（既存の PASS 証跡を再利用） |
| PC | 静的確認＋900×700／1508×660 × 蒼毘（得意技あり）の全要素比較 | 追加ルールはすべて `@media (max-width: 899px)` 内。**全要素差分 0**（151 要素） |
| Automated | — | targeted 6 files・59 PASS／full 93 files・**1,167 PASS**／tsc 0／lint 0／clean build PASS |
| Isolation | — | `battle.css` +45／−0 のみ・JS md5 は Production と一致（`8eedb711…`）・`src/core`／assets（210 ファイル md5 一致）／save／gameVersion 0・決定213／H3 混入 0（「構え」の一致 1 件は蒼毘の得意技名「反撃の構え」のコメント＝誤検出） |
| Bundle | Production 比 | JS ±0／CSS 157,871→158,356B（**+485B**・gzip +106B）／新規 asset 0 |

**計測の不具合と対処**：Fast Gate の初回は URL の seed に神の名前（日本語）を使ったため手札がロードごとに変わり、同じ build 同士でも差分 51 件が出た（計測側の問題）。seed を英字に直して再実行し、上の結果を得た。

## 3. Known Risks
1. 得意技の神の共鳴の札が 15〜27px 縦に伸びる（113→128.5〜140px。OTOMO の絵の位置は不変、神の頭との間は最小 119px）
2. バッジが丸いピル形から角丸の 2〜3 行の札になる（10px のまま）
3. 札の左右の余白のうち 7px をバッジが使う（札の枠の 1px 内側まで）
4. iOS の字形が Chromium より広い場合でも、名前 1 語は 53px の幅に 3px 以上の余裕（最長 48.2px・iOS 見込み 50px）
5. バフ 3・デバフ 4 は表示だけ差し込んだ Stress（得意技の神のデッキで実際にその状態に届くかは未確認）

## 4. Human QA の要否（AI 判断）
**自動 Gate で十分と判断。** 根拠：①情報欠損の修正（画面外で読めなかったものを読めるようにする）で、判定基準が数値（1 行・枠内・切れ 0）で測れる ②変わるのは得意技 3 柱の共鳴の札の中だけで、札の外（神・敵・OTOMO・Intent・手札・PC）は全要素比較で同一 ③演出・タイミング・構図の変更 0。
唯一の主観要素はバッジの形（ピル → 2〜3 行の札）。CEO が見た目を確認したい場合は、Before `babe3e5`／After の 2 環境をすぐ用意できる（一時 Firewall の追加が必要）。

## 5. 状態
**Decision230 = Fast Gate PASS／Blocker 0 — CEO 承認待ち（Release Gate または Human QA）。** worktree `C:/Users/kimi1/SevenGodsGame-d230`・ブランチ `feat/d230-reso-badge-fix`（master `babe3e5` から・未 commit）。証跡 `scripts/decision230-reso-badge/`。

---

## 6. CEO 判断（2026-09-27）
Fast Gate 承認・**Human QA 省略**・Release Gate へ。Release Gate は変更リスクに比例した最小構成（35-run Gate の再実行禁止・Fast Gate 証跡を再利用）。

## 7. Release Gate（2026-09-27）— **PASS／Blocker 0 → PRODUCTION RELEASE READY（CEO 承認待ち）**
| 項目 | 結果 |
|---|---|
| commit | Fast Gate 承認済みの差分をそのまま local commit **`45bfc9e`**（`feat/d230-reso-badge-fix`・`battle.css` +45／−0。差分は `scripts/decision230-reso-badge/out/d230-fastgate.diff`） |
| RC | `release/d230-reso-badge-rc`＝**`45bfc9e`**（新規 worktree `C:/Users/kimi1/SevenGodsGame-d230-rc`・`npm ci`）。親は master＝origin/master＝**`babe3e5`**＝clean Production の上に commit 1 つ・worktree clean |
| Fast Gate 承認差分との一致 | RC clean build の CSS `index-C4vFJN_S.css` md5 **`c0d85ad6…`＝Fast Gate 時の build と byte 同一** → Fast Gate の全証跡（§2：決定229 構図同一・SP 全要素比較・Stress・着弾・PC 差分 0）がそのまま RC に当てはまる |
| Automated | targeted 6 files・59 PASS／full 93 files・**1,167 PASS**／tsc 0／lint 0／clean build PASS |
| JS | `index-DCW9kCba.js` md5 `8eedb711…`＝**Production と同一** |
| Isolation | runtime 変更は `battle.css` のみ（+45／−0・`@media (max-width: 899px)` の 1 ブロック）。`src/core`／`public`（assets 210 ファイル md5 一致）／`package*.json`／`index.html`（ハッシュ名以外）差分 0。save・gameVersion 0。決定213／H3 混入 0 |
| 決定229 regression | SAME（Fast Gate §2 の証跡。RC は byte 同一の CSS） |
| PC impact | 0（全ルールが `max-width: 899px` 内＋900／1508 全要素差分 0） |
| Bundle | JS ±0／CSS +485B（gzip +106B）／新規 asset 0 |
| Blockers | **0** |
| Rollback 先 | 現 Production deployment **`6686647810`**（`babe3e5`・status success） |
| Release 手順（CEO 承認後のみ・未実施） | 決定227〜229 と同じ：`git fetch . release/d230-reso-badge-rc:master`（fast-forward `babe3e5`→`45bfc9e`）→ `git push origin master` → 配信 bundle と RC の md5 一致確認 → Production Smoke（Fast Gate 相当の最小構成） |

**状態：Decision230 = Release Gate PASS／PRODUCTION RELEASE READY — CEO 承認待ち。** merge／push／deploy なし。

---

## 8. Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認）
| 項目 | 値 |
|---|---|
| Release 直前 | master＝origin/master＝`babe3e5`（`git fetch` 後）／RC `45bfc9e`・worktree clean・`master..RC`＝commit 1 つ（`battle.css` のみ） |
| merge／push | `git fetch . release/d230-reso-badge-rc:master`（fast-forward）→ `git push origin master`（13:51 JST・`babe3e5..45bfc9e`） |
| Vercel | deployment **`6688164950`**（`45bfc9e`・Production）success（2026-09-27T04:52:21Z） |
| 配信 bundle | `index-DCW9kCba.js`／`index-C4vFJN_S.css`＝RC build と **md5 一致**（JS は前 Production と同一）。配信 JS に決定213 の一致 0 |
| Rollback 先 | **`6686647810`**（`babe3e5`・決定229） |

### 8-1. Narrow Production Smoke（`https://seven-gods-game.vercel.app`・35-run Gate は再実行しない）
| 確認 | 結果 |
|---|---|
| SP 360／390／430 × 得意技 3 柱（蒼毘・福永・笑蓮）＋大耀（`audit.mjs`） | 「共鳴」1 行（12/12）・得意技バッジは札の枠内・文字の切れ 0・画面外 0・横スクロール 0・error 0（Fast Gate と同一の値） |
| 決定229 構図（`smoke-prod.mjs` A：Production と前 Production `babe3e5` build をアニメ停止で全要素比較） | 大耀＝差分 0。得意技 3 柱＝差分は共鳴の札の中だけ（＋OTOMO の透明な入れ物の上端）。神・敵・OTOMO の絵は同一 |
| Stress（B：バフ 3・デバフ 4 を表示だけ差し込み） | 9/9 PASS（Fast Gate と同一） |
| PC impact（C：900×700／1508×660 × 蒼毘） | 全要素差分 0 |
| console error | 0 |
| Isolation | `battle.css` +45／−0 のみ・`src/core`／assets／save／gameVersion 0 |
- 証跡：`scripts/decision230-reso-badge/out/smoke/`

**Decision230 = PRODUCTION LIVE / CLOSED。** Production＝master＝origin/master＝**`45bfc9e`**。docs は runtime に混ぜず別管理。
