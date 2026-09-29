# 決定241 結果トースト `.result-toast` の名札重なり Hotfix（CSS のみ・Fast Gate）

- 日付：2026-09-27
- 種別：**Hotfix（runtime：`src/components/battle/battle.css` の `.result-toast` 規則のみ）**。JS／文言／時間（1.4s）／z-index／見た目（pill 材質）は変更 0。`src/core` 0・asset 0・test 変更 0
- 判断主体：AI チーム（CLAUDE.md §6-2「バグ修正」「軽微な UI・UX 調整」）。CEO は Hotfix GO（`PREMIUM_REAUDIT_2026-09-27.md` §0「先に出せる Hotfix 候補」→ 最小 CSS → Fast Gate → 数値・画像で完全判定できれば Human QA 省略可）
- ブランチ：`hotfix/d241-result-toast`（worktree `C:/Users/kimi1/SevenGodsGame-toast`、Production `f8183eb` 直上）。commit **`361a1c6`**（ローカルのみ）。merge／push／deploy はしていない
- 証拠：`scripts/decision241-toast/`（`measure.mjs`・`compare.mjs`・`out/*.png`・`out/*-log.json`・`out/compare.md`）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 根本原因 | `.result-toast { position: fixed; top: 100px }`（`battle.css:1990`）が **ビューポート基準の固定 px** で、決定235 の名札（アリーナ上端 y≈108〜200px）の真上に落ちていた。fixed にした当初の理由「手札までスクロールしても見える」は、戦闘画面が `body.battle-viewport` の 3 行 grid（上部バー／アリーナ／ドック）・`overflow:hidden` の非スクロール構成になった時点で消えていた |
| 修正 | `position: absolute; grid-area: arena; top: max(104px, 32%)`（PC）／`top: max(150px, 38%)`（SP ≤899px）。**包含ブロックをアリーナ行にして、アリーナ高さ比で名札の下に置く**。宣言差分：置換 2・追加 1・SP 上書き 1 |
| Gate | tsc 0・lint 0 error（warning 3 は既存 `scripts/` のもの・差分外）・battle tests 31 files / 305 passed・build OK・Playwright Before／After 6 条件（PC 1508×660・1280×720・SP 390×844・360×780・reduced-motion PC/SP）＋勝利の舞台 2 条件：**名札∩トースト 3,331／3,318／2,613／2,540 px² → 全 0**、予告 0、手札 0、ビューポート内 100%、トースト寸法・x 同一、他要素 box 差分 0（立ち絵の揺れ位相ぶん ≤1.1px を除く）、console error 0 |
| Human QA | **省略可（数値・画像で完全判定）**。理由は §5 |
| Release-ready | **YES**（§6） |

---

## 1. 根本原因監査

### 1-1. どこで出るか
- レンダリング：`src/components/battle/BattleScreen.tsx:389-397`。`fx.resultToastKey > 0` のとき `<div className="result-toast" style={{ animationDelay: revealDelayMs }}>` を **`.battle` 直下（`.battle-main` の兄弟・前）** に描画。key 増分で CSS アニメを再生する方式
- 発火：`useBattleFx.ts:220/263/279/293`（カード使用結果：攻撃／回復／防御／共鳴）。1 手ごとに 1 回、**1.4s**（`result-toast-pop`、`battle.css:1971-1988`）。着弾まで inline の `animation-delay` で不可視（`battle.css:4586` の `animation-fill-mode: both`）
- 本監査の実測（大耀 × 蒼海の龍神、`?seed=d241-toast-01`）：1 手目「⚔ 敵に140ダメージ」、トースト box **132.7×37.5px**、`position: fixed; top: 100px`（全 6 条件で同値）

### 1-2. 名札の幾何（Before・全条件でアリーナ上端 y=91.5）

| 条件 | 敵名札 (y〜bottom) | 神名札 (y〜bottom) | 共鳴札 (y〜bottom) | 神タイトル「大耀」 | トースト Before | 重なり（px²） |
|---|---|---|---|---|---|---|
| PC 1508×660 | 112.5〜198.5 | 112.5〜190.5 | 112.5〜188.0 | 652,119.5 29×21 | 688,100 133×37.5 | 神名札 **3,331**（頭の行を右から覆う） |
| PC 1280×720 | 112.5〜198.5 | 112.5〜190.5 | 112.5〜188.0 | 538,119.5 29×21 | 574,100 133×37.5 | 神名札 **3,318** |
| SP 390×844 | 108.5〜184.5 | 108.5〜180.5 | 108.5〜202.0 | 178,113.5 26×19 | 129,100 133×37.5 | 神名札 **2,613**・**神タイトル 485**・敵名札 **539** |
| SP 360×780 | 108.5〜184.5 | 108.5〜180.5 | 108.5〜202.0 | 166,113.5 26×19 | 114,100 133×37.5 | 神名札 **2,540**・**神タイトル 485**・敵名札 **623** |

- PC はタイトル文字そのものには当たらないが、名札の頭の行（タイトル右側）と上辺・金の角金具を覆う。SP はタイトル「大耀」と敵名札の右上に直接被る（`PREMIUM_REAUDIT` の `pc-03`／`sp-03` と一致）
- 勝利の舞台（`.victory-stage`：`position: fixed; inset: 0; z-index: 7`、`BattleScreen.tsx:593` で `.battle` 直下）と同じ stacking context にトースト（z-index 4）がいるため、**舞台の下に描かれる**（§3-3 で `elementFromPoint` により確認）。`pc-12` で明るく見えていたのは、舞台の暗転帯（`victory-stage-band`・高さ 44vh・中央）が名札の高さまで届かず、そこにトーストが居たため

### 1-3. 空いている場所（Before 実測）
- PC：神名札の下端（190.5）と神の立ち絵 box 上端（1508：231.4／1280：239.1）の間の **41〜48px**。絵の実体（帽子の頂点）は box 上端より ≈10px 下
- SP：名札の下端（≤202、バフ 3 行時 ≈238）と立ち絵の上端（390：389／360：340）の間の **≈140〜190px の空き帯**（吹き出しは左寄せ y 189.5〜222.5 のみ）。決定229 Known Risk 7 の「空いた帯」

## 2. 修正（CSS diff・`battle.css` `.result-toast` 規則に閉じる）

```diff
 .result-toast {
-  position: fixed;
-  top: 100px;
+  position: absolute;
+  grid-area: arena;
+  top: max(104px, 32%);
   left: 50%;
   z-index: 4;
   …（以下不変）
 }
+
+@media (max-width: 899px) {
+  .result-toast {
+    top: max(150px, 38%);
+  }
+}
```

- **アリーナ基準を選んだ理由**：`body.battle-viewport .battle` は `position: relative` の grid（`grid-template-areas: 'topbar' 'arena' 'dock'`）。grid コンテナが包含ブロックのとき、絶対配置の子は `grid-area` で **そのグリッド領域を包含ブロックにできる**（CSS Grid §9・Chrome／Safari／Firefox 全対応、列も行も消費しない）。これで「名札の下」をビューポート px ではなくアリーナの高さ比で指定でき、PC 1508／1280／SP 390／360 とも同じ規則で名札の外に出る。`left: 50%` は「アリーナ中央」＝従来のビューポート中央と同じ x（実測 x 差 0）
- **PC 32%（最低 104px）**：1508 で `top` 104.5px → y 196〜233.5（神名札下端 190.5 の 5.5px 下・立ち絵 box の上端 231.4 とは 2px 触れるが絵の実体は ≈10px 下）。1280 で 118.2px → y 209.7〜247.2。`max(104px, …)` は高さ 600px 前後の低い PC 窓（アリーナ ≈270px）で 32% が 87px に縮んで名札に戻るのを防ぐ
- **SP 38%（最低 150px）**：390 で 181.4px → y 272.9〜310.4、360 で 157.1px → y 248.7〜286.2。空き帯の中央寄り。`max(150px, …)` は決定228 のバフ 3 行の名札（130px → 下端 ≈238.5）より下を保証する
- 見た目（pill・材質）は **変えない**。決定235 の漆黒＋金の札との材質差（`PREMIUM_REAUDIT` §2-G「トースト pill」）は別件の follow-up（§7）
- `prefers-reduced-motion`：`.result-toast` に既存の reduce 上書きは無く（fill-mode のみ）、今回も追加しない。reduced-motion 条件でも同じ位置に出ることを実測

## 3. Fast Gate

### 3-1. 静的
| 項目 | 結果 |
|---|---|
| `tsc -b`（`npm run build` 内） | 0 error |
| `oxlint` | 0 error（warning 3 は `scripts/enemy-visual-batch-a`・`scripts/phase3-audit` の既存・本差分外） |
| `vitest run src/components/battle` | 31 files / **305 passed** |
| `vite build` | OK（`index-DJa_3VNP.css` 166.29 kB、CSS 差分 +20/−2 行） |

### 3-2. Playwright（Before `d239-rc/dist` :4371 ＝ Production ／ After 本 worktree :4372、`?seed=d241-toast-01`、トースト opacity ≥0.98 の瞬間）

| viewport | toast box Before → After (x,y w×h) | ∩神名札 | ∩神タイトル | ∩敵名札 | ∩共鳴札 | ∩予告 | ∩手札 | ∩カード | ビューポート内 | 他要素 box 差分 (max px) | console err |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pc1508 (1508×660) | 687.7,100.1 132.7×37.5 → 687.7,196 132.7×37.5（寸法・x 同一） | 3331 → **0** | 0 → **0** | 0 → **0** | 0 → **0** | 0 → 0 | 0 → 0 | 0 → 0 | true → true | 0.0・cards 同一 | 0 → 0 |
| pc1280 (1280×720) | 573.7,100 132.7×37.5 → 573.7,209.7 132.7×37.5（寸法・x 同一） | 3318 → **0** | 0 → **0** | 0 → **0** | 0 → **0** | 0 → 0 | 0 → 0 | 0 → 0 | true → true | 6.8（敵立ち絵 x：被弾ノックバック 4px＋揺れ ±4px の位相差・決定232。calm 時は 0.5）・cards 同一 | 0 → 0 |
| sp390 (390×844) | 128.7,100 132.7×37.5 → 128.7,272.9 132.7×37.5（寸法・x 同一） | 2613 → **0** | 485 → **0** | 539 → **0** | 0 → **0** | 0 → 0 | 0 → 0 | 0 → 0 | true → true | 0.0・cards 同一 | 0 → 0 |
| sp360 (360×780) | 113.7,100.1 132.7×37.5 → 113.7,248.7 132.7×37.5（寸法・x 同一） | 2540 → **0** | 485 → **0** | 623 → **0** | 0 → **0** | 0 → 0 | 0 → 0 | 0 → 0 | true → true | 0.0・cards 同一 | 0 → 0 |
| pc1508-rm（reduced-motion） | 687.7,100 132.7×37.5 → 687.7,196 132.7×37.5（寸法・x 同一） | 3318 → **0** | 0 → **0** | 0 → **0** | 0 → **0** | 0 → 0 | 0 → 0 | 0 → 0 | true → true | 0.1・cards 同一 | 0 → 0 |
| sp390-rm（reduced-motion） | 128.7,100 132.7×37.5 → 128.7,272.9 132.7×37.5（寸法・x 同一） | 2613 → **0** | 485 → **0** | 539 → **0** | 0 → **0** | 0 → 0 | 0 → 0 | 0 → 0 | true → true | 0.1・cards 同一 | 0 → 0 |

- 「他要素 box 差分」は上部バー・アリーナ・ドック・手札・名札 3 枚・タイトル 3 つ・予告・HP 2 本・共鳴ゲージ・立ち絵 2 体・OTOMO・吹き出し・ミニ結果・ラウンド終了ボタンの x/y/w/h（各 20 要素 × 4 値）と手札カード全枚の box を突き合わせた最大差。**レイアウト要素（名札・HP・ドック・手札・カード）は全条件で 0**。絶対配置の grid 子はトラック寸法に関与しないため理論上も 0
- calm（トースト無し）状態の突き合わせも 6 条件で ≤0.5px（sp390-rm のみ立ち絵の 1.1px＝待機モーションの位相差）
- After のその他の重なり：SP は吹き出し・ミニ結果・立ち絵と全て 0。PC は神の立ち絵 **box** と 234 px²（1508）／859 px²（1280）触れるが、絵の実体（帽子の頂点）より上の透明部分（画像 `after-pc1508-01-toast.png`・`after-pc1280-01-toast.png` で確認：トーストの下端と帽子の間に余白がある）

### 3-3. 勝利の舞台（決定226）との関係（1 戦通し・撃破の瞬間）

1 戦通し（PC 1508×660／SP 390×844・同 seed・R6 撃破「⚔ 敵に280ダメージ」・Before／After とも console error 0）で、撃破の瞬間に `.victory-stage` が出た 250ms 後を採取。

| 条件 | トースト box | ∩神名札 | ∩敵名札 | ∩予告 | ∩手札 | ∩舞台タイトル「勝利」 | ∩舞台 caption（撃破／勝利／神×敵） | ∩舞台 group box（余白込み） | トースト中心の最前面要素（`elementFromPoint`） |
|---|---|---|---|---|---|---|---|---|---|
| PC Before | 686.8,100 134.4×37.5 | **3,360** | 0 | 0 | 0 | 0 | 0 | 0 | `.victory-stage-rays`（舞台が上・トーストは名札の上に明るく残る） |
| PC After | 686.8,217.4 134.4×37.5 | **0** | 0 | 0 | 0 | **0**（title y 282.2〜） | **0**（caption y 255.2〜） | 3,105（portrait と caption の間の空き部分） | `.victory-stage-group`（**舞台の暗転帯の下**に描かれ、薄く透けるだけ） |
| SP Before | 127.8,100 134.4×37.5 | **2,636** | 0 | 0 | 0 | 0 | 0 | 0 | `.victory-stage-rays` |
| SP After | 127.8,333 134.4×37.5 | **0** | 0 | 0 | 0 | **0**（title y 482.4〜） | **0**（caption y 462.6〜） | 5,040（＝portrait 円の box の内側） | `.victory-stage-ring`（**ポートレートの裏**で見えない） |

- 撃破時は手札が空になりドックが縮む → アリーナが伸びる → `top: 32%／38%` も伸びる（PC 196 → 217.4、SP 272.9 → 333）。この状態でも名札との重なりは 0（PC：神名札下端 190.5 に対し 27px 下）
- 舞台（z-index 7）はトースト（z-index 4）と同じ stacking context（`.battle` 直下の兄弟、`.battle` は z-index 無し）にあり **常に上に描かれる**。`elementFromPoint` の結果がそれを示す。After の PC では暗転帯の下で薄く透け（画像 `after-pc1508-12-victory-toast.png`：「撃破」の左上にごく薄い pill）、SP ではポートレートの裏で完全に隠れる（`after-sp390-12-victory-toast.png`）。Before は名札の上に **明るいまま** 残っていた（`before-*-12-victory-toast.png`）
- 各ラウンド末の名札の高さ（バフで伸びた状態）：PC 敵 86／神 78〜83／共鳴 75.5、SP 敵 76〜93／神 72〜103.8／共鳴 93.5（`*-log.json` の `rounds`）。最大の神名札（SP 103.8 → 下端 212.3）に対しても SP After のトースト上端 272.9（390）／248.7（360）は下。`max(150px, …)` の下限 150px（下端 241.5）は決定228 の最悪値 130px（下端 238.5）より下

## 4. 画像（`scripts/decision241-toast/out/`）
- Before：`before-pc1508-01-toast.png`・`before-pc1280-01-toast.png`・`before-sp390-01-toast.png`・`before-sp360-01-toast.png`・`before-*-rm-01-toast.png`（名札の上にトースト）
- After：`after-pc1508-01-toast.png`・`after-pc1280-01-toast.png`・`after-sp390-01-toast.png`・`after-sp360-01-toast.png`・`after-*-rm-01-toast.png`（PC：名札と神の頭の間／SP：名札と立ち絵の間の空き帯の中央）
- 勝利の舞台：`before-pc1508-12-victory-toast.png`・`after-pc1508-12-victory-toast.png`・`before-sp390-12-victory-toast.png`・`after-sp390-12-victory-toast.png`
- 数値：`*-log.json`（box・重なり・computed style）、`compare.md`／`compare.json`（Before／After 表）

## 5. Human QA の要否：**省略可（数値・画像で完全判定）**

- 判定基準（重なり 0・寸法同一・ビューポート内・他要素不変・console 0）は **全て DOM 実測で数値化**でき、6 条件＋勝利 2 条件で全部 PASS
- 「読めるか」「他を隠さないか」は画像で確認済み：PC は名札と神の頭の間の帯、SP は「吹き出しだけの空き帯」の中央で、文字の背景は舞台の背景のみ
- 位置以外（文言・時間・材質・アニメ）は変更 0 なので、「感触」の評価対象が無い。決定237／238 と同型
- 残る主観要素は「PC で神の頭に近い（帽子の上 ≈10px）」だけで、これは画像で確認できる範囲

## 6. Release-ready statement

- **Release-ready：YES**。`hotfix/d241-result-toast` の 1 commit `361a1c6`（CSS +20/−2 行）。計測サーバー（:4371／:4372）は停止済み。Production `f8183eb` に対し runtime 差分は `.result-toast` 規則と SP 上書き 1 つのみ。他 lane（決定240：`battle.css` 末尾追記）とは行範囲が離れており rebase 衝突なし
- 影響範囲：結果トーストの表示位置のみ。発火条件・回数・文言・時間・材質・z-index は不変。`src/core` 0・test 0・asset 0
- ロールバック：`git revert <commit>`（CSS 1 ファイルのみ）で `position: fixed; top: 100px` に戻る。データ・セーブ非依存

## 7. Follow-up（本 Hotfix では触らない）
- トースト pill（`border-radius: 999px`・半透明グラデ）→ 決定235 の漆黒＋金の札材質へ（`PREMIUM_REAUDIT` §2-G 残項目）
- トースト／ミニ結果／浮遊数字の「文章の三重表示」整理（同 §2-G・決定225 G9）
- PC の神の頭上の余白が小さい（≈10px）ので、将来 PC の名札が高くなる変更（バフ行の折返し等）が入ったら 32% と `max(104px)` を再計測する

---

## Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認・Human QA 省略）
| 項目 | 値 |
|---|---|
| 重い core テスト | 全 vitest：1,228 PASS・2 timeout（決定240 レーンの計測と同時のため）→ balanceSim／actionLog／determinism を単独再実行 **30/30 PASS** |
| RC | `release/d241-result-toast-rc`＝**`361a1c6`**（`f8183eb` 直上 1 commit・衝突 0）。RC build＝Gate build と JS/CSS md5 一致（`0e165ec0…`／`bd95022b…`） |
| merge／push | fast-forward `f8183eb`→`361a1c6`、`git push origin master`（20:59 JST） |
| Vercel | deployment **`6691898960`** success |
| 配信 bundle | `index-CtEyaEME.js`／`index-DJa_3VNP.css`＝RC と **md5 一致** |
| Narrow Smoke（Production・`measure.mjs`） | PC 1508／1280・SP 390／360・reduced 2 条件：トースト∩神名札・タイトル・敵名札・共鳴・予告・手札 **すべて 0**、ビューポート内 100%、トースト位置は Gate と ±0.1px（PC1280 y 209.7／SP360 y 248.6）、console error 0。勝利の舞台：名札 ∩ 0・victoryGroup 3,105／5,040 は Gate と同値（舞台が上・タイトル ∩ 0） |
| Rollback 先 | **`6691009755`**（`f8183eb`・決定239） |

**Decision241 = PRODUCTION LIVE / CLOSED。** Production＝**`361a1c6`**。証拠 `scripts/decision241-toast/out/prod/`。
