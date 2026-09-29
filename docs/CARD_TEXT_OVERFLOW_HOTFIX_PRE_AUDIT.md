# カード文字はみ出し Hotfix PRE-AUDIT（低い SP・カード 140px・『姉御の号令』12.1px）

- 日付：2026-09-27 ／ 担当：Dev＋Designer（AI 判断・docs-only）
- 基準：**Production `73ac787`**（決定237）。`C:/Users/kimi1/SevenGodsGame-d237-rc` の既存 `dist` を `vite preview :4331` で配信（再 build なし）
- 方法：Playwright（`createRequire('C:/Users/kimi1/SevenGodsGame/package.json')`）・seed は ASCII `ovf-audit-1`（大耀 × 蒼海の龍神・初手 1 枚目が本物の『姉御の号令』）。候補の試作は **`page.addStyleTag` の CSS 注入と、手札 1 枚目の文字を 60 種ぶん順に差し替える DOM の一時変更だけ**（元に戻す）。**runtime ファイルの変更 0・worktree／branch／commit 0・画像生成 0・サーバーは終了時に停止**
- 作成物：本書、`scripts/card-text-overflow-audit/`（`measure-all.mjs`・`shots-and-stress.mjs`・`css/card-god-label-lowscreen.css`・`patches/card-god-label-lowscreen.patch`（**未適用**）・`out/`）

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| はみ出すカード | **低い SP（カード 100×140px）でだけ 3 枚**：『姉御の号令』**+12.06px**（大耀専用）、『反撃の刃』『一喝』**+0.81px**（蒼毘専用）。全 60 種 × SP 5 画面 × PC 3 画面で実測。SP 158px・PC 150／164px は **0 枚**（最悪でも −5.94px の余裕） |
| 発生画面 | `@media (max-width: 899px) and (max-height: 720px)`（`battle.css:5570`）が当たる SP：360×640・375×667・390×700（CSS px）。390×844・430×932・PC は無事 |
| 根本原因 | カードの高さが 140px 固定（`battle.css:5571-5573`）なのに、**専用札の本文が「◯◯専用」行＋名前＋効果文 3 行＋条件行 4 行＝約 152px** 必要。`.card-view-body` は `margin-top:auto`（`battle.css:2415-2424`）で下揃えだが、入りきらない分は下端から出る。珠（決定231）の問題ではなく純粋な文字量 |
| 推奨修正（1 つ） | **候補 C：140px の時だけ、本文の中の「◯◯専用」行を出さない**（`battle.css` の同じ media block に **CSS 1 規則 `body.battle-viewport .card-view-body > .card-view-god { display: none }`**）。実測：**60 種すべて 0**（姉御の号令 12.06 → **−5.94**、反撃の刃／一喝 0.81 → **−8**）。専用札でないカードの位置変化 0・158px／PC は 1 バイトも変わらない・決定236 の Art Window（札は本文の外）には当たらない |
| 名前分岐／データ | **0**。カード ID 表も文言データも足さない（CSS のみ・`src/core` 0・test 変更 0） |
| Human QA | **省略可（AI 推奨・決定237 と同じ扱い＝CEO 判断）**。理由は §6。CEO の実機が高さ 700px 級なら、次の Human QA（Card Travel）に 1 問だけ相乗りさせる |
| 次 | 決定238 候補（番号は PM 採番）として worktree で patch 適用 → Fast Gate → `measure-all.mjs` で Before／After → RC → Release Gate（§8） |

## 1. 実測（どのカードが・どの画面で・何 px はみ出すか）

定義：`textOverflowPx` ＝ 本文（`.card-view-body`）の可視の子要素の最下端 − カード外形の下端（正＝はみ出し）。−8 が床（padding 6px＋border 2px）。⚡（成立）と＋（未成立）の接頭辞は幅が同じで差 0（全 60 種で確認）。証拠：`out/measure-all.json`（SP）・`out/measure-all-pc.json`（PC）・`out/shots-and-stress.json`・`out/390x700-anego-{before,after}.png`・`out/390x700-full-{before,after}.png`

### 1-1. 全 60 種 × 8 画面（Production 73ac787・注入なし）

| 画面（CSS px） | カード | 効果文／条件行 font | はみ出し > 0 のカード | 最悪の余裕（次点） |
|---|---|---|---|---|
| **SP 360×640** | 100×**140** | 9px／9px | **姉御の号令 +12.06**・反撃の刃 +0.81・一喝 +0.81 | 大喝 −5.5 |
| **SP 375×667** | 100×140 | 同上 | 同上（同値） | 同上 |
| **SP 390×700** | 100×140 | 同上 | 同上（同値） | 同上 |
| SP 390×844 | 100×158 | 9px／9px | **なし** | 姉御の号令 −5.94 |
| SP 430×932 | 100×158 | 同上 | なし | 姉御の号令 −5.94 |
| PC 1280×620 | 116×**150** | 9.5px／9px | なし | 姉御の号令／反撃の刃 −7.22 |
| PC 1280×800 | 116×164 | 同上 | なし | 全カード −8 |
| PC 1508×660 | 116×164 | 同上 | なし | 全カード −8 |

- ※『豪快な一撃』は計測の都合で「Art Window なしの通常レイアウト」に流し込んだため 140px で +0.81 と出るが、**Production では決定236 の Art Window（`card-view-artwin`）で −6px**（§14 Smoke で確認済み）。本件の対象外
- ※ 3 枚とも **専用札**（本文の先頭に「大耀専用」「蒼毘専用」の行が入る）。非専用札で最も詰まっている『大喝』（効果文 4 行＋条件行 3 行）でも −5.5 で収まる
- console error：全 run で 0

### 1-2. 『姉御の号令』の行構成（SP 140px・実測）

| 行 | 内容 | 高さ（概算） |
|---|---|---|
| `.card-view-god` | 「大耀専用」9px | 約 14px（＋gap 4px） |
| `.card-view-name` | 「🌿 姉御の号令」11.5px・1 行 | 約 17px（＋gap 4px） |
| `.card-view-text` | 「自分の攻撃力を2ラウンドのあいだ30上げる。」9px×1.3・**3 行** | 35.1px（＋gap 4px） |
| `.card-view-bonus` | 「＋ 共鳴が4以上なら、さらに攻撃力+30（1ラウンドのみ）。」9px×1.25・**4 行**＋border／padding | 約 49px |
| 本文 padding | 16px（上）＋6px（下） | 22px |
| 合計 | | **約 152px ＞ 140px（実測差 +12.06）** |

本物の手札（seed `ovf-audit-1`・390×700）でも **+12.06**（`out/390x700-anego-before.png`：最終行「み）。」が縁の外で切れている）。

### 1-3. 候補の試作結果（CSS 注入・同じ 60 種）

| 画面 | Production | **候補 C（専用行を非表示）** | 候補 B'（姉御の号令だけ条件短文 2 行） | C＋B' |
|---|---|---|---|---|
| SP 140px（3 画面同値） | 姉御 +12.06／反撃 +0.81／一喝 +0.81 | **全 60 種 ≤ 0**（姉御 **−5.94**・反撃／一喝 **−8**・非専用札の位置変化 **0**・専用札 28 種の下端は不変） | 姉御 −8 だが **反撃／一喝 +0.81 が残る** | 全 0（C と同じ） |
| SP 158px・PC | 0 枚 | **変化なし**（media が当たらない） | 姉御の条件行が 4→2 行に変わる（QA 済み画面の見た目が変わる） | — |

耐性（端末フォント差の模擬・`letter-spacing` で文字幅を広げる・`out/shots-and-stress.json`）：

| 条件 | SP 140px | SP 158px（参考・Production そのまま） |
|---|---|---|
| 幅 +5%（0.05em） | Production：姉御 +12.06・反撃／一喝 +0.81（不変）／**C：全 0**（最悪 −5.5） | 0 枚 |
| 幅 +10%（0.1em） | C：姉御・笑って許す +11.06（効果文が 1 行増える） | **Production でも姉御・笑って許す +11.06** ＝ 158px 側にもともとある感度で、C が新しく作る弱さではない |

（全角主体の文言では端末フォントで幅が 10% も変わることはまずない。数字・記号の幅差が 2〜3% 程度）

## 2. ROOT CAUSE（file:line）

1. **`src/components/battle/battle.css:5570-5574`** — `@media (max-width: 899px) and (max-height: 720px) { body.battle-viewport .card-view { height: 140px } }`。「390×780（CSS 696）などでアリーナの高さを確保するためカードを一段小さくする」設計（同 5568-5569 のコメント）。158px（`battle.css:5512-5515`）から **18px 減る**
2. **`battle.css:2405-2409`／`5263-5266`** — `.card-view-body` は flex 縦並び・gap 4px・（原画あり）padding 16px 7px 6px・`margin-top:auto`（`2415-2424`）。**高さの上限も `overflow` も無い**ので、中身がカードより高いと下端から出る（カードの `overflow` は既定＝visible。手札列の `overflow-y:hidden` で見た目は切れる）
3. 中身の行数（§1-2）：専用行（`battle.css:2524`／`5259`）＋名前（`5239`）＋効果文 3 行（`5247`／`5517`）＋条件行 4 行（`2549-2556`／`5252-5257`）＝約 152px。**専用札にだけ 1 行（約 18px＝行 14＋gap 4）多い**のが 3 枚に共通する差。文言は `src/core/data/cards/taiyo.ts:44,56`（姉御の号令）・`sobi.ts:35,69`（反撃の刃／一喝）の `text`／`bonus.textJa`
4. 決定231 で珠が流れの外（absolute）に戻り 33.06 → 12.06 になった（§10-1・§11-3）。残りは珠と無関係の純粋な文字量

## 3. 候補比較

| 候補 | 内容 | 効果（140px） | 却下理由／評価 |
|---|---|---|---|
| A. `ART_WINDOW_V2` に姉御の号令を追加（決定236 の許可リスト拡張） | 札を右上の小札へ・帯 45%・条件短文 1 行 | 姉御 0（豪快な一撃と同じ形） | **却下（Hotfix としては）**：①`artWindow.test.ts`「Pilot は…1 枚だけ」を書き換える＝Pilot の範囲変更 ②SP 158／PC でも見た目が変わり Human QA 必須 ③反撃の刃／一喝は別途。**Lane 3 の一般化（After-2 以降）の本筋**であり、Hotfix ではない |
| B. 全カードの条件行を常に短文へ（表示専用のデータ表） | 23 枚分の短文を作り常時表示 | 姉御 0 | **却下**：23 文の文言設計＝ゲームデザイン作業、QA 済み画面の見た目が全部変わる。Hotfix の範囲を超える |
| B'. 短文を **140px の時だけ** CSS で切替（全文／短文の 2 span＋データ表） | データ駆動・名前分岐なし | 姉御 −8。ただし **反撃の刃／一喝は短文が別に要る**（3 枚分） | **却下（C より大きい）**：`CardView.tsx`＋表＋test＋css ≈ 40 行で効果は C と同じ 0。姉御の短文は 1 行に入らず 2 行（`共鳴4以上:攻撃力+30(1R)`）。一般化する時の道具としては有効 |
| **C. 140px の時だけ本文内「◯◯専用」行を非表示（CSS 1 規則）** | `body.battle-viewport .card-view-body > .card-view-god { display:none }` を `battle.css:5570` の block に追加 | **全 60 種 0**（3 枚とも解消・他 57 枚不変） | **採用**。理由は §4 |
| D. 140px を 152px などへ | カード高さ見直し | 姉御 0 | **却下**：140px は 700px 級でアリーナの高さを守るための値（`battle.css:5568`・決定229 の舞台層と競合）。手札が 12px 太ると舞台が 12px 減る |
| E. 140px で条件行 8px など文字縮小 | font-size | 姉御 0 | **却下**：9px が既に読める下限。決定236 Human QA Q5「読みにくくないか」の逆行 |
| F. 帯の可変化（`height:auto; min-height:140px`） | カード高さを中身で伸ばす | 姉御 0 | **却下**：手札列（`overflow-y:hidden`・固定行高）とカード寸法前提の決定224 READY 層・Card Travel のゴースト複製が崩れる |
| G. 本文 padding 16→8＋gap 詰め | 数 px の節約 | 最大 −11px | **却下**：12.06 に届かず、当たったとしても余裕 0 で端末差に負ける |
| H. カードに `overflow:hidden` | 見た目だけ揃える | 文字が切れる | **却下**：欠陥を隠すだけ（今の状態と同じ） |

**決定236 との整合**：決定236 は「◯◯専用」を**本文の中に置かなくてよい副情報**と判断し、本文の外の小札へ出した（`artWindow.css` の `.card-view > .card-view-god`）。C は同じ判断を「140px の時は出さない」へ縮めたもので、Art Window の小札は selector（`.card-view-body >`）が当たらないので**据え置き**。戦闘中の手札は選んだ神の専用札しか来ないため、「大耀専用」は戦闘中は冗長な情報（デッキ構築・報酬では別コンポーネント `.deck-builder-card` で本件の対象外）。専用札であることは金の縁（`.card-view-exclusive`・`battle.css:2519`）で残る。

## 4. ONE RECOMMENDED MINIMAL FIX（データ駆動・名前分岐なし）

**候補 C**。CSS 1 規則・8 行（コメント込み）。

```css
@media (max-width: 899px) and (max-height: 720px) {
  /* 既存：body.battle-viewport .card-view { height: 140px } */
  body.battle-viewport .card-view-body > .card-view-god {
    display: none;
  }
}
```

- 選定理由：①実測で **60 種すべて 0**（3 枚の欠陥を 1 規則で解消・余裕 5.94px 以上・幅 +5% でも 0） ②**当たる範囲が欠陥の範囲と一致**（SP かつ高さ ≤720px＝カード 140px の時だけ。QA 済みの SP 158px／PC 150・164px は不変） ③名前分岐 0・データ 0・`src/core` 0・test 0・JS 不変（CSS のみ＝JS md5 は Production と一致する見込み・決定231／237 と同型） ④決定236 の「専用札は本文の外でよい」と同じ判断 ⑤他レーン（Card Travel）と触るファイルが重ならない
- 落とすもの：140px の画面でだけ「大耀専用」の 1 行。専用札の識別は金の縁で残る。戦闘中は自分の神の専用札しか手札に来ないので、情報としての損失は無い
- patch：`scripts/card-text-overflow-audit/patches/card-god-label-lowscreen.patch`（**未適用**・`git apply --check` を `SevenGodsGame-d237-rc`（73ac787・clean）で実行 → **OK**。worktree は変更していない）

## 5. FINAL SPEC

| 項目 | 値 |
|---|---|
| ファイル | `src/components/battle/battle.css` のみ（+8 行／−0）。`battle.css:5570` の `@media (max-width: 899px) and (max-height: 720px)` block 内、`.card-view { height: 140px }` の直後 |
| 規則 | `body.battle-viewport .card-view-body > .card-view-god { display: none; }`（詳細度 0,3,1・既存の `body.battle-viewport .card-view-god`（`5259`・0,2,1）より高く読み込み順に依存しない） |
| SP／PC | SP（≤899px）かつ高さ ≤720px の時だけ。SP 158px（>720px）・PC（150／164px・`max-height:640px` の 150px も幅 >899 で対象外）は不変 |
| 決定224 READY | 不変（`.card-view-ready-frame`・珠・⚡は本文の外。珠は C 適用後も 26×26@(−1,−1)・absolute を実測） |
| 決定236 Art Window | 不変（`.card-view > .card-view-god` の小札は selector が当たらない。`card-view-artwin` の帯・短文はそのまま） |
| 決定231 | 両立（珠の規則 `battle.css:2507-2516` に触れない） |
| 名前分岐／データ表 | なし（不変ルール 3 の対象外）。`src/core`・`cardBonusText.ts`・`artWindow.ts` は触らない |
| test | 新規なし（CSS のみ）。既存 full suite が PASS すること |
| ファイル競合 | Card Travel lane（`SevenGodsGame-travel`・`feat/card-travel-v1`）の変更は `BattleScreen.tsx`＋新規 `cardTravel.{ts,css,test.ts}`／`useCardTravel.ts` で **`battle.css` に触れていない**（`git status` で確認）。本 Hotfix は `battle.css` だけ → **重ならない**。RC は現 Production `73ac787` の直上に commit 1 つ。Card Travel より先に出しても後でも rebase 衝突 0 の見込み |
| Rollback | CSS 1 規則の revert（JS 不変） |

## 6. ACCEPTANCE

数値（`scripts/card-text-overflow-audit/measure-all.mjs` を After build に向けて SP・PC の両モードで実行し、`out/measure-all*.json` と比較）：

1. SP 360×640／375×667／390×700：**全 60 種 `textOverflowPx ≤ 0`**（姉御の号令 −5.94・反撃の刃／一喝 −8・最悪 −5.5）、`godShown === false`（専用札 28 種）、非専用札 32 種の `textOverflowPx`／行数が Production と **差 0**
2. SP 390×844／430×932・PC 1280×620／1280×800／1508×660：全 60 種の値が Production と **差 0**（`godShown` も true のまま）
3. 珠 26×26@(−1,−1)・absolute（`shots-and-stress.mjs` の `cost`）、Art Window の『豪快な一撃』は `card-view-artwin` の小札が表示されたまま（`.card-view > .card-view-god` の `display !== 'none'`）
4. console error 0、`tsc` 0・`oxlint` 0・`vitest` full PASS・`vite build` 成功、**JS バンドル md5 が Production と一致**（CSS だけ +約 100B）
5. 画像：`390x700-anego-after.png` 相当で最終行「み）。」がカードの中に収まっている

**Human QA 要否（AI 判断：省略可＝CEO 判断）**。根拠：①変更は CSS 1 規則で、当たる画面は高さ 720px 以下の SP のみ ②QA 済みの SP 158px／PC は 1 バイトも変わらない ③落とす情報は戦闘中には冗長（手札は自分の神の専用札のみ・金の縁は残る） ④決定236 で CEO が「専用札は本文の外でよい」を PASS 済み ⑤決定237（CSS 1 宣言・Human QA 省略）と同じ規模。**ただし CEO の実機が 700px 級（iPhone SE／mini 等）なら**、次の Human QA（Card Travel v1）に「140px の手札で『大耀専用』が無くても違和感がないか」の 1 問を相乗りさせる（別セッション不要）。

## 7. Risks

1. **文字幅 +10% 級の端末フォント**では 140px でも 158px でも同じ 2 枚（姉御の号令・笑って許す）が 11px はみ出す＝Production にもともとある感度（§1-3）。C は改善も悪化もしない。根治は Lane 3 の一般化（短文の条件行＋帯 45%）
2. 140px の画面で「◯◯専用」が見えなくなる。戦闘中は冗長だが、**将来「他の神の専用札が手札に混ざる」仕様（OTOMO・託宣など）が入る時は、この規則を外すか小札化（決定236 の形）へ置き換える**必要がある。DECISIONS に明記する
3. 余裕は 5.5〜5.94px。**カードの文言を増やす／条件行を伸ばす変更は 140px で再びはみ出しうる** → `measure-all.mjs` を文言変更時の Gate に組み込む（§8）。`src/core/data/cards` の文言に「効果文 ≤3 行・条件行 ≤4 行（9px・幅 82px）」の目安を残す
4. デッキ構築（`.deck-builder-card`・`setup.css:763` の同型の上書き）は本件の対象外・未検証のまま（§10-1 の別件メモと同じ）
5. Art Window を他カードへ一般化する時、「140px では専用行を出さない」と「小札は常に出す」が共存する。矛盾ではない（本文の中と外）が、Lane 3 の設計書に本規則を引き継ぐ

## 8. NEXT NOW（1 つ）

**決定238 候補（番号は PM 採番）として Narrow Hotfix を出す**：`git worktree add C:/Users/kimi1/SevenGodsGame-d238 -b feat/d238-card-god-label-lowscreen 73ac787` → `git apply scripts/card-text-overflow-audit/patches/card-god-label-lowscreen.patch` → Fast Gate（`tsc -b --noEmit`／`oxlint src`／`vitest run`／`vite build`・JS md5 が Production と一致） → その build を `:4331` 系の空きポートで配信し `measure-all.mjs`（SP・PC）＋`shots-and-stress.mjs` を Before（Production）／After で実行 → §6 の 1〜5 を満たせば RC（`release/d238-…-rc`）→ Release Gate → CEO 承認（Human QA 省略の可否を含む）→ `docs/DECISIONS.md` に AI 判断として記録（Risk 2 の将来条件を明記）。Card Travel lane とは `battle.css` で重ならないため、どちらが先でも良い。

## 9. 実装・Fast Gate（決定238 候補）

- 日付：2026-09-27 ／ 担当：Dev（AI 判断・pipeline slot）。**commit／push／merge／deploy は 0**（CEO のリリース判断待ち）
- worktree：`C:/Users/kimi1/SevenGodsGame-d238`・branch `feat/d238-card-text-overflow`（`master` ＝ Production **`73ac787`** から作成・**未commit**）。他 worktree（`-travel`・`-d237-rc`・`-d236-rc` …）・main worktree・`docs/DECISIONS.md` には触れていない。`-travel` の `:4321`／`:4322` は起動したまま無関係（終了時に LISTENING を確認）
- 変更：`src/components/battle/battle.css` **+8／−0**（§4 の patch `patches/card-god-label-lowscreen.patch` を `git apply` で適用。§5 FINAL SPEC と一致：`@media (max-width: 899px) and (max-height: 720px)` block 内・`.card-view { height: 140px }` の直後に `body.battle-viewport .card-view-body > .card-view-god { display: none; }` を 1 規則）＋ 新規 `src/components/battle/cardGodLabelLowscreen.test.ts`（76 行・CSS 契約 test 4 件・`castFlashBlend.test.ts` と同型）
- 証拠：`scripts/card-text-overflow-audit/out/d238-before/`（Production 73ac787・`:4342`）と `out/d238-after/`（本 build・`:4341`）に `measure-all.json`・`measure-all-pc.json`・`shots-and-stress.json`・`goukai-{before,after}.json`・画像。追加スクリプト `d238-verify-goukai.mjs`（『豪快な一撃』の READY 層・Art Window 小札の実測。seed `ovf-goukai-1` の初手に本物が来る）

### 9-1. 自動 Gate（d238 worktree・`npm ci` 済み）

| 項目 | 結果 |
|---|---|
| 対象 test（`cardGodLabelLowscreen`・`battleViewportLayout`・`readyMaterial`・`artWindow`・`castFlashBlend`・`combatTimeline`） | **6 files／52 tests PASS**（1.9s） |
| `npx vitest run --dir src`（full・ブラウザ計測の前に単独実行） | **99 files／1216 tests PASS**（49.9s・timeout 0） |
| `npx tsc -b --noEmit` | **0 error** |
| `npx oxlint src` | **exit 0** |
| `npx vite build` | 成功（1.30s・166 modules）。`dist` は残してある |

### 9-2. 隔離（Isolation）とバンドル差分

| 項目 | 結果 |
|---|---|
| 変更ファイル | `battle.css`（+8）と新規 test の **2 つだけ**。`src/core`／`public`／`package.json`／`package-lock.json` の diff **0** |
| JS バンドル | **md5 一致**：`e27bdc7598f3ad00b9761549552e1da0`（After `index-DMkxogNp.js` ＝ Production `index-Ct-mStRS.js`・438,536 B・`cmp` 差 0）。ファイル名の hash が違うのは Vite が CSS 側の変化を巻き込むためで中身は同一（決定231／237 と同型） |
| CSS バンドル | 165,615 → 165,680 B（**+65 B**）。minified の diff は `body.battle-viewport .card-view-body>.card-view-god{display:none}` の **1 規則だけ**（Production の CSS に同 selector は 0 件） |
| `index.html` | asset の hash 名だけ差 |

### 9-3. ブラウザ実測（Before `:4342` vs After `:4341`・Playwright・seed `ovf-audit-1`・全 60 種 × 8 画面）

| 画面 | カード | Before（Production） | **After** | 判定 |
|---|---|---|---|---|
| SP 360×640 | 100×140 | 姉御の号令 +12.06・反撃の刃 +0.81・一喝 +0.81（・計測用 通常レイアウトの豪快な一撃 +0.81） | **60 種すべて ≤ 0**：姉御の号令 **−5.94**・反撃の刃／一喝 **−8**・最悪 大喝 −5.5。専用札 28 種 `godShown=false` | PASS |
| SP 375×667 | 100×140 | 同上 | 同上（同値） | PASS |
| SP 390×700 | 100×140 | 同上 | 同上（同値） | PASS |
| SP 390×844 | 100×158 | 0 枚 | **全 60 種・全項目で差 0**（`godShown=true` のまま 28 種） | PASS |
| SP 430×932 | 100×158 | 0 枚 | 差 0 | PASS |
| PC 1280×620 | 116×150 | 0 枚 | 差 0 | PASS |
| PC 1280×800 | 116×164 | 0 枚 | 差 0 | PASS |
| PC 1508×660 | 116×164 | 0 枚 | 差 0 | PASS |

- 140px の 3 画面で値が変わったのは **専用札 28 種の `godShown`／はみ出し量だけ**（非専用札 32 種は `textOverflowPx`・行数・font・`bodyTopPct` すべて差 0。`prod`／`prodReady`（＋／⚡）の両方で確認）
- 珠（決定231）：手札全 5 枚 **26×26@(−1,−1)**・Before／After 同値（`shots-and-stress.json` の `cost`）
- 『豪快な一撃』（決定224 READY Pilot＋決定236 Art Window・seed `ovf-goukai-1`・本物の手札）：390×700 と 390×844 で **Before／After 完全一致** — `card-view-artwin`・はみ出し −6（140px）／−7.44（158px）・帯上端 42.96%／48.55%・READY 層 `.card-view-ready-frame` あり（absolute・z-index 0）・右上の小札 `.card-view > .card-view-god` **`display: block`**（top 5／right 5・「大耀専用」）・本文内の専用行なし・珠 26×26・条件行 1 行
- 耐性（`letter-spacing` +5%）：After は 140px の 3 画面で **0 枚**（Production は 4 枚）。+10% では Production と同じ 2 枚（姉御の号令・笑って許す +11.06）＝ §7 Risk 1 のとおり改善も悪化もしない
- console error：**全 run で 0**（Before／After・SP／PC・shots・goukai）
- 画像：`out/d238-before/390x700-anego-before.png`（最終行「み）。」が縁の外で切れている）→ `out/d238-after/390x700-anego-after.png`（4 行すべてカードの中・下に余白）。`390x700-full-{before,after}.png`・`390x{700,844}-goukai-{before,after}.png` も保存
- サーバー `:4341`／`:4342` は計測後に停止（`:4321`／`:4322` は残っていることを確認）

### 9-4. 逸脱（Deviations）

1. 計測スクリプトのフィクスチャ（`cards.mjs`／`gods.mjs`）は §0 と同じ scratchpad の複製を使った（runtime からの import ではない）。カード文言は Production 73ac787 と同じ
2. 『豪快な一撃』の READY 層は共鳴 <4 の初手で測ったため `opacity: 0`（未成立）。層の存在・位置・z-index は確認済みで、成立時の描画は決定224 の QA 済み範囲（本件は本文の外に触れない）
3. `npm ci` の所要が長く、full vitest はブラウザ計測の前に単独で走らせた（CEO ルールどおり並走なし）

### 9-5. Known Risks（§7 に追加）

1. **情報削除の懸念（決定230「情報削除で逃げない」）** — 下の 9-6 に理由を明記。CEO が「140px でも専用行は残す」と判断する場合は候補 B'（140px だけ条件行を短文へ・`CardView.tsx`＋表＋test ≈ 40 行）へ切り替える。その場合も反撃の刃／一喝の短文が別に要る
2. 将来「他の神の専用札が手札に混ざる」仕様（OTOMO・託宣など）が入る時は本規則を外すか、決定236 の小札（本文の外）へ置き換える。**`docs/DECISIONS.md` に AI 判断として記録する時に明記する**（本セッションでは DECISIONS.md に触れていない）
3. 余裕は 140px で 5.5〜5.94px。文言追加時は `measure-all.mjs` を Gate に組み込む（§7-3）

### 9-6. 「情報削除」ではない理由（CEO 向け・決定230 原則との整合）

- **当たる画面が欠陥の画面と一致する**：SP かつ高さ ≤720px（カード 140px）の 3 画面だけ。QA 済みの SP 158px・PC 150／164px は CSS 1 バイトも変わらず「大耀専用」は今までどおり出る
- **戦闘中の手札には選んだ神の専用札しか来ない**：「大耀専用」は戦闘中は「自分の神の札」という自明の情報で、判断（使う／使わない）に関与しない。デッキ構築・報酬画面は別コンポーネント（`.deck-builder-card`）で本規則の対象外＝そこでは残る
- **専用札であることは残る**：金の縁（`.card-view-exclusive` outline）・金の box-shadow は不変。専用札と共通札は 140px でも見分けられる
- **決定236 で CEO が同じ判断を PASS 済み**：Art Window 札では「◯◯専用」を本文の外の小札へ出した（＝本文に置かなくてよい副情報）。本規則はその判断を「140px では出さない」へ縮めたもので、Art Window の小札は据え置き（実測で `display: block`）
- **代替は情報を増やさず見た目を変える**：候補 B'（条件短文）は 140px で条件文の文言が変わる＝読める情報が減るのは同じで、コードは 5 倍。候補 D（カード 152px）は舞台が 12px 減る。候補 E（8px 文字）は可読性の逆行。**1 行の冗長な札を消す方が、はみ出して「み）。」が切れる現状より情報は多い**

### 9-7. Human QA 推奨（AI 判断）

**省略可（決定237 と同じ扱い）／CEO の実機が高さ 700px 級（iPhone SE・mini・360×640 級 Android）なら Card Travel v1 の Human QA に 1 問だけ相乗り**：「140px の手札で『大耀専用』の行が無くても違和感がないか（金の縁で専用札と分かるか）」。理由：①変更は CSS 1 規則・JS md5 一致 ②当たる画面は 140px の SP のみで、QA 済みの 158px／PC は差 0 を 60 種 × 5 画面で実測 ③READY 層・Art Window・珠は Before／After 完全一致 ④落ちるのは戦闘中に冗長な 1 行で、金の縁が残る ⑤別セッションの Human QA を組む費用に見合う不確実性は残っていない。**唯一の主観判断（「専用行が無い 140px の札の見た目」）は決定230 原則に関わるため CEO が最終判断する**

### 9-8. 次（1 つ）

CEO 承認（Human QA 省略可否を含む）→ `feat/d238-card-text-overflow` を commit（`battle.css`＋test）→ RC（`release/d238-card-text-overflow-rc`）→ Release Gate → `docs/DECISIONS.md` に AI 判断として記録（9-5 の Risk 2 の将来条件を明記）。Card Travel lane（`-travel`・`battle.css` に触れていない）とは重ならず、どちらが先でも rebase 衝突 0 の見込み。

---

## 10. 決定238 Release Gate（2026-09-27）— **PASS／Blocker 0 → PRODUCTION RELEASE READY（CEO 承認待ち：採否＝「専用」行の非表示の是非を含む）**
| 項目 | 結果 |
|---|---|
| commit | Fast Gate 済みの差分をそのまま local commit **`06e8285`**（`feat/d238-card-text-overflow`・`battle.css` +8／−0＋新規 `cardGodLabelLowscreen.test.ts` 76 行。差分は `scripts/card-text-overflow-audit/out/d238-qa.diff`） |
| RC | `release/d238-card-text-overflow-rc`＝**`06e8285`**（新規 worktree `C:/Users/kimi1/SevenGodsGame-d238-rc`・`npm ci`）。親は master＝origin/master＝**`73ac787`**（現 Production）・commit 1 つ・worktree clean |
| Automated | targeted 6 files・**52 PASS**／full 99 files・**1,216 PASS**（Card Travel レーンのブラウザ計測が止まっている時間に実行・タイムアウト 0）／tsc 0／lint 0／clean build PASS |
| Isolation | 変更は `battle.css`（低い画面の media block 内に 1 規則）＋契約テストのみ。`src/core`／`public`（assets 一致）／package 0。**JS は現 Production と md5 一致**（`e27bdc75…`）。CSS 165,615→165,680B（**+65B**） |
| 効果（§9 Fast Gate・全 60 種 × SP 5 画面＋PC 3 画面） | 140px（360×640／375×667／390×700）で **全 60 種のはみ出し ≤0**（姉御の号令 +12.06→−5.94・反撃の刃／一喝 +0.81→−8）、非専用札 32 種は全項目差 0、158px（390×844／430×932）と PC 3 画面は **全 60 種・全項目で差 0**、珠 26×26 不変、豪快な一撃の READY 層・決定236 の小札は Before/After 完全一致、console error 0 |
| 情報の省略について（CEO 判断） | 140px のときだけ本文内の「◯◯専用」行を出さない。戦闘中の手札は自分の神の専用札しか含まず表記は冗長、専用札の目印（金の縁）は残る、決定236 で「専用札は本文の外でよい」が Human QA PASS 済み。将来「他の神の専用札が手札に混ざる」仕様が入るときは規則を外すか小札化 |
| Human QA | **AI 推奨＝省略可**（決定237 と同じ扱い：CSS 1 規則・数値で判定・QA 済み画面は不変）。CEO の実機が 700px 級なら Card Travel v1 の Human QA に「140px の手札で『大耀専用』が無くても違和感がないか」の 1 問だけ相乗り |
| Rollback 先 | 現 Production **`6690568688`**（`73ac787`・決定237） |
| Blockers | **0** |

---

## 11. 決定238 Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認・「低い画面のみ『◯◯専用』行を非表示」の仕様を承認・Human QA 省略）
| 項目 | 値 |
|---|---|
| Release 直前 | master＝origin/master＝`73ac787`／RC `06e8285`・worktree clean・commit 1 つ（依存：なし。決定239 Card Travel は別ファイルのため後続） |
| merge／push | `git fetch . release/d238-card-text-overflow-rc:master`（fast-forward）→ `git push origin master`（19:19 JST・`73ac787..06e8285`） |
| Vercel | deployment **`6690969281`**（`06e8285`・Production）success（2026-09-27T10:20:24Z） |
| 配信 bundle | `index-DMkxogNp.js`／`index-CFpGPcKU.css`＝RC build と **md5 一致**（JS は決定237 と同一） |
| Rollback 先 | **`6690568688`**（`73ac787`・決定237） |
| Narrow Smoke（`measure-all.mjs`・Production・全 60 種の手札） | 360×640／375×667／390×700（カード 140px）：はみ出し **none**（Production 直前は姉御の号令 +12.06・反撃の刃／一喝 +0.81）。390×844／430×932（158px）：none（不変）。console error 0 |

**Decision238 低い SP カード文字はみ出し Hotfix = PRODUCTION LIVE / CLOSED。** Production＝`06e8285`。
