# 決定253 — Oracle Choice & Readability Preflight（2026-10-01）

**PREFLIGHT ONLY**：runtime／src／Production 変更 0・実装 0・新規生成 0。Audit／Design／Simulation のみ。
Production baseline：master = origin/master `6d6c272`（runtime `9316ce1`・決定252 LIVE / CLOSED）。
simulation は `docs/evidence/decision253/`（**総試合数 1,627,780**＝audit 404,740＋tune 1,223,040・harness `harness.d253.test.ts.txt`）。数値表はすべて `gen253.mjs.txt` で JSON から生成した `SIMULATION_SUMMARY.md` を正とし、本書の数字はそこからの引用のみ（手入力なし）。
判断はすべて **AI 判断**（CLAUDE.md §6-2）。CEO 判断が必要な事項（§6-3）は本 Preflight に含まれない。

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 導き 0% の root cause | **C（AI policy）＋ E（UI）**。効果は弱くない（A ×）・使う場面は毎戦ある（B ×）・上位互換でもない（D ×）。sim の既存方策（reader 等）は加護／天啓しか知らないコードで 0% が構造的に出る。人間側は **PC 1508×660 と SP で効果文が非表示、SP ではグリフも非表示＝10px の名前「導きの託宣」だけ**が見えていて、加護だけに「今なら ブロック20」の状況表示がある（§5） |
| 導きは合理的か | 3 択を期待値で選ぶ **oracleAware** 方策は現行数値のまま **通常で導き 45.2%**（1.53 回/戦のうち 0.68）・hard 33.0・Daily 33.6・Ⅴ 29.4・Ⅶ猛威 25.0% を選び、導き禁止の対照（NoGuide）に対し 通常 +0.4・hard +0.8・**Daily +3.9**・Ⅴ +0.3pt、Ⅶ猛威 −2.7pt（託宣 2 回の段で加護を残さない使い方をした分。必殺前に加護を残す Strict 方策なら +0.3） |
| 役割 | 加護＝**守る**（必殺ラウンド。鬼将・道化・怨霊・龍神で 63〜97%）／導き＝**整える**（R1〜R3 の「あと神力 1 で出せる札」：一撃・呪縛・守護・剛撃・大漁。試練 67%・魔獣 52%）／天啓＝**攻める**（撃破・R5 以降の詰め 10〜23%）。敵・ラウンドで最適解が変わる（§3） |
| 最終 SPEC（1 案） | **Oracle Readability v1＝presentation-only**（数値・engine・回数 3／2 は不変）：①3 択に役割語「守る／整える／攻める」を常時表示（SP 含む） ②状況表示を 3 択すべてに（加護＝既存「今なら ブロック20」／**導き＝「今なら『剛撃』が出せる」**（手札と神力から純関数で算出）／天啓＝「今なら 撃破」or「40ダメージ」） ③SP では名前を「加護／導き／天啓」に短縮し役割語と 2 行化（既存の 39px 枠内・metric lock） ④チュートリアル 1 行に役割を追記。既存 GlyphIcon／CSS token 再利用・新規資産 0 |
| 数値変更 | **不要**（priority 1「AI policy 修正だけで成立」＝人間側では情報提示だけで成立）。導きの数値変種 7 案（神力+2／引く 2／共鳴+1・+2 等）は tune で比較し、**すべて不採用**（§4-2：導き独占 74〜96%・hard／Daily の 3〜9pt 易化・God Strike 率 60〜88% で保護対象に触れる） |
| 決定252 回帰 | 敵表・必殺・HP・AP・cards・God・OTOMO・score・seed・7R 不変（sim は Production engine そのもの）。oracleAware の必殺ラウンド加護率は reader 以上（通常 鬼将 58／道化 79／怨霊 56／龍神 43%、Ⅴ 76〜94%）＝counter timing 維持 |
| GO / NO-GO | **GO**（Pilot＝UI 4 ファイル・純関数＋unit test・Playwright metric-lock Gate・Human QA 3 問） |
| NEXT NOW（1 件） | **決定253 Pilot（Oracle Readability v1）— CEO GO 待ち・自動実装しない** |

---

## 1. CURRENT ORACLE AUDIT（Production `9316ce1`・実コード）

### 1-1. exact effects（`src/core/data/divination.ts`／`engine/applyDivination.ts`／`effects.ts`）

| 択 | index | effects | 内部値 → 表示 | 対象 | timing | 制限 | 補足 |
|---|---|---|---|---|---|---|---|
| 加護の託宣 | 0 | `blockOfIntent{ratio 0.5, min 2}` | 予告合計×0.5 切り捨て・最低 2 → 表示 ×10 | 自分（block） | playerTurn 中いつでも（AP 0） | 1 戦 3 回（神階 2 回）・1 R 1 回 | 予告 0（溜め）は最低 2。神階Ⅳ+ の block 効率 0.75 を**受けない**（決定158）。予告はデバフ込みでない |
| 導きの託宣 | 1 | `draw 1` ＋ `gainAp 1` | — | 自分（手札・AP） | 同上 | 同上 | AP 持ち越し無し（決定7）＝そのラウンド内で使い切る必要 |
| 天啓の託宣 | 2 | `damage enemy 4` | 40 | 敵 | 同上 | 同上 | 敵 block を先に消費。自 atk バフは乗る（`damage` 経路） |

- `DIVINATION_USED` イベント→ 決定249 semantic：加護＝GUARD（`rl-brace`）／導き＝TEMPO（札 `card-view-dealt`＋神力 `rl-ap-flash`）／天啓＝STRIKE（既存の突き）。
- `battleRecap`（敗北の振り返り）は加護だけを助言（G1・G2）。導き・天啓への助言文は無い。
- `TutorialOverlay`：「託宣は1戦3回・各ラウンド1回まで。神力を使わないので、敵の大技に合わせて切りましょう」＝**加護前提**の 1 文。3 択の役割説明は無い。

### 1-2. presentation（`DivinationPanel.tsx`・`battle.css`・`dockControls.css`・Playwright 実測 `readability/readability.json`）

| 面 | 名前 | 効果文 | グリフ（決定94：shield／cards／star） | 状況表示 | ボタン box | 色 |
|---|---|---|---|---|---|---|
| PC 1508×660（標準） | 11px 紫 #c9a8ff | **非表示**（`max-height:700px` で `display:none`・title 属性のみ） | 22px 金 #ffd166 | 加護のみ「今なら ブロック20」 | 342×44 | 3 択とも同色 |
| PC 1280×720 | 11px | 10px #b8bfe0 表示 | 22px | 加護のみ | 342×61 | 同 |
| SP 390×844／390×660 | 10px nowrap | **非表示**（≤899px） | **非表示**（≤899px・幅 0） | 加護のみ | 79×39 | 同 |

**1 秒で「守る／整える／攻める」が分かるか**：加護 ○（グリフ＋「今なら ブロック」）／導き **×**（PC 標準・SP では「導きの託宣」の 5 文字だけ。何が起きるか・今何が出せるかが無い）／天啓 △（「天啓」から攻撃は連想しにくい。40 固定なので状況表示が無い）。色だけの区別は無い（3 択同色）が、逆に**識別情報が漢字 2 字のみ**。

### 1-3. Current usage（現行数値・Production engine・`SIMULATION_SUMMARY.md` §1）

| 面 | 方策 | win | 託宣/戦 | 加護% | 導き% | 天啓% |
|---|---|---|---|---|---|---|
| 通常 | reader（決定252 基準方策） | 99.6 | 0.94 | 27.1 | **0.0** | 72.9 |
| 通常 | naive／greedy | 83.2／73.0 | 3.00 | 0 | 0 | 100 |
| 通常 | **oracleAware** | 99.6 | 1.53 | 41.5 | **45.2** | 13.4 |
| Easy | reader／oracleAware | 100.0／100.0 | 0.49／1.14 | 4.7／29.0 | 0／54.4 | 95.3／16.7 |
| Hard | reader／oracleAware | 97.0／96.1 | 1.62／2.02 | 51.7／54.5 | 0／33.0 | 48.3／12.5 |
| Daily | reader／oracleAware | 91.6／90.0 | 1.79／2.19 | 41.1／51.1 | 0／33.6 | 58.9／15.3 |
| Ⅴ | reader／oracleAware | 85.8／81.9 | 1.50／1.80 | 83.1／65.4 | 0／29.4 | 16.9／5.2 |
| Ⅶ猛威 | reader／oracleAware | 71.4／65.2 | 1.71／1.89 | 93.0／73.0 | 0／25.0 | 7.0／2.0 |

- 既存 5 方策の導きは全面・全段で **0.0%**（コードが加護／天啓しか返さない＝**C**）。
- 使用ラウンド：reader は R5 に 0.60/戦（天啓の「詰め」）、oracleAware は R1 0.23（導き）・R3〜R5 に加護・R5〜6 に天啓。
- Ⅴ〜Ⅶ で oracleAware が reader より 4〜6pt 低いのは **NoGuide（導き禁止）でも同じ**（Ⅴ 81.6・Ⅶ猛威 67.9）＝期待値枠組みが加護を早めに切る癖の差であり、導きの有無の差は Ⅴ +0.3／Ⅶ猛威 −2.7pt。

## 2. ROOT CAUSE — 導き 0%

| 仮説 | 判定 | 根拠（コード・sim） |
|---|---|---|
| A 効果が弱い | **×** | 導き＝神力 1（基準 1AP＝5 ダメージ相当）＋札 1 枚。oracleAware が実際に有効化した札は 一撃 687／呪縛 422／守護 336／剛撃 221／大漁 217 回（通常 100 seed）＝価値 5〜12 で天啓 4 を上回る場面が毎戦ある |
| B 使う場面が無い | **×** | R1（AP 2）〜R3（AP 4）は「あと 1 神力で出せる札」が高頻度。oracleAware の導きは R1 0.23／R2 0.12／R3 0.11／R4 0.12／R5 0.10 回/戦と序盤に厚い |
| C AI policy が使えていない | **○** | reader／readerPlus／naive／greedy／ignoreUlt の `pickOracle` は 0（加護）か 2（天啓）しか返さない。期待値で選ぶ方策に替えるだけで 45%（通常）になり、勝率は不変 |
| D 加護／天啓が常に上位互換 | **×（段による）** | 通常〜Ⅵ では導きあり＞導き禁止（+0.3〜+3.9pt）。託宣 2 回の Ⅶ猛威だけ「加護を残さず導き」で −2.7pt → **役割は「加護を残せるときの整え」**（Strict で +0.3） |
| E UI で価値が理解できない | **○** | §1-2：導きは名前だけ（PC 標準・SP）。加護だけが「今なら ブロック20」を持つ＝比較の土俵が無い。決定244 Practical QA の「導き ≈0%」は人間の値で、これが主因 |

**結論：runtime の数値は変えず、C（sim 方策）と E（UI の状況表示）を直す。**

## 3. CHOICE QUALITY — Enemy × Oracle role map（oracleAware・現行数値・`SIMULATION_SUMMARY.md` §2）

| 敵（決定252 identity） | 通常：加護／導き／天啓 % | 必殺 R での加護 | Ⅴ：加護／導き／天啓 % | 回答候補（何を見て・どれを選ぶか） |
|---|---|---|---|---|
| 試練の影（入門） | 10／**67**／23 | —（必殺なし） | 50／39／11 | 峰 R4 は盾札で足りる → 序盤は**導き**で手を整え、R5 以降は**天啓**で詰める |
| 業斧の鬼将（受け切る） | 39／50／11 | **91.5** | 68／28／4 | R3 溜めまでは**導き**、R4 断岩に**加護** |
| 藍花の怨霊（温存） | 50／39／11 | 70.4 | 72／25／3 | R4 怨嗟の花に**加護**を温存。R1〜R2 の低圧に**導き** |
| 銀甲の機工師（二段） | 57／32／12 | 30.7（R3 220 にも加護 70%） | 77／20／4 | R3・R5 の 2 回に**加護**、間の溜めラウンドに**導き** |
| 双牙の魔獣（速攻） | 37／**52**／11 | 17.8 | 62／35／3 | 序盤連撃は盾札で受け、**導き**で札を回して R5 前に削る |
| 蒼海の龍神（持久） | 40／46／15 | 63.1 | 62／33／6 | R4 大海嘯に**加護**、長い戦いを**導き**で支える |
| 乱舞の道化（開幕） | 49／38／13 | **96.7**（R3） | 66／29／6 | R2 ⚠ を見たら R3 に**加護**、以後**導き**→**天啓** |

- 天啓は「撃破（敵 HP≤40）」と R5〜R6 の詰めに集約（通常 13%・Ⅴ 5%）＝役割は明確。
- ラウンド別（通常 oracleAware）：R1 導き 0.23／R3 加護 0.23・導き 0.11／R4 加護 0.26／R5 加護 0.14・導き 0.10・天啓 0.11／R6 天啓 0.07。
- **3 種が均等ではないが、敵・ラウンド・手札で最適が変わる**（CEO 目標「異なる decision role」）。

## 4. MINIMAL DESIGN

### 4-1. 優先順位どおりの探索
1. **AI policy 修正だけで成立するか → YES**（§1-3・§2-C）。人間に対する等価物は「導きが今何を可能にするかの提示」＝UI。
2. 既存効果の数値調整（tune・§4-2）→ 不要。導きが独占するか、hard／Daily が易化するか、God Strike 経済に触れる。
3. 意味変更／4. 新 mechanic → 不要。

### 4-2. 導き数値変種の比較（oracleAware・40 seed・`SIMULATION_SUMMARY.md` §5）

| 変種 | 導き効果 | 通常 | Hard | Daily | Ⅴ | Ⅶ猛威 | 導き% 通常／Ⅴ | 導き−禁止 通常／Ⅴ／Ⅶ猛威 | GS 通常 | 判定 |
|---|---|---|---|---|---|---|---|---|---|---|
| **prod（採用）** | 引く1・神力+1 | 99.8 | 96.3 | 90.7 | 81.4 | 64.7 | 44.9／29.2 | +0.6／+0.6／−2.1 | 50.7 | ○ 役割が分かれ、勝率を動かさない |
| g_d1a2 | 引く1・神力+2 | 99.9 | 98.2 | 95.2 | 82.9 | 62.1 | **90.5**／74.4 | +0.7／+2.0／−4.6 | 46.8 | × 導き独占・Ⅶ で悪化 |
| g_d2a1 | 引く2・神力+1 | 99.8 | 99.3 | 97.6 | 88.0 | 68.2 | 61.3／42.4 | +0.6／+7.1／+1.4 | 45.1 | × hard +3・Daily +7pt の易化（決定252 直後の balance drift） |
| g_d2a2 | 引く2・神力+2 | 100.0 | 99.8 | 99.6 | 91.8 | 74.1 | 95.9／85.8 | +0.8／+11.0／+7.3 | 32.0 | × 独占・全段易化・GS −19pt |
| g_a2 | 神力+2 | 99.0 | 92.0 | 82.1 | 68.2 | 51.8 | 71.7／58.8 | −0.2／−12.7／−14.9 | 54.0 | × 罠（引かないと神力が余る） |
| g_d1a1r1 | ＋共鳴+1 | 99.8 | 99.0 | 96.6 | 84.9 | 64.1 | 73.5／53.9 | +0.6／+4.0／−2.7 | 59.9 | × 独占寄り・GS +9pt（God Strike 経済に触れる） |
| g_d1a1r2 | ＋共鳴+2 | 99.9 | 99.7 | 99.1 | 90.6 | 72.6 | 89.4／73.1 | +0.7／+9.7／+5.8 | **87.6** | × God Strike ほぼ確定＝保護対象 |
| g_d1a2r1 | 神力+2・共鳴+1 | 100.0 | 99.6 | 98.6 | 88.6 | 68.5 | 95.0／83.7 | +0.8／+7.7／+1.7 | 63.4 | × 独占・易化 |

### 4-3. 最終 SPEC — Oracle Readability v1（presentation-only）

| # | 変更 | 場所 | 内容 |
|---|---|---|---|
| ① | 役割語 | `DivinationPanel.tsx`＋CSS | 各ボタンに **守る／整える／攻める** を常時表示（PC：名前の右に小さく／SP：名前の下段）。文字で示す＝色依存 0 |
| ② | 状況表示 3 択化 | `BattleScreen.tsx`（既存 `guardPreviews` と同型の props）＋新規純関数 `src/components/battle/oraclePreview.ts` | 加護＝既存「今なら ブロック20」／**導き＝手札に「cost ∈ (AP, AP+1]」の札があれば「今なら『剛撃』が出せる」（複数なら価値順の先頭）、無ければ「札を1枚引く」**／天啓＝`enemy.hp + enemy.block ≤ 4` なら「今なら 撃破」、それ以外「40ダメージ」。engine の値（`RULES.divination`・`DIVINATION_CHOICES[2].effects`・カード cost）から算出し、表示と実際が食い違わない |
| ③ | SP 2 行化 | CSS（`battle.css` 末尾／`dockControls.css`） | ≤899px：名前を「加護／導き／天啓」（`の託宣` を span で隠す）＋役割語、下段に状況表示（`text-overflow: ellipsis`）。**ボタン高さ 39px・幅 79px 不変**（加護は今日すでに 2 行なので枠は同じ） |
| ④ | チュートリアル | `TutorialOverlay.tsx` の tips 1 文 | 「守る＝加護／整える＝導き／攻める＝天啓」を 1 行追記 |
| — | 変えない | `divination.ts`・`applyDivination.ts`・`rules.ts`・回数 3／2・グリフ（shield／cards／star・決定94）・PC のボタン寸法・決定249 反応 | 数値・engine・save・gameVersion 0 |

## 5. READABILITY（監査結果と設計）

| 観点 | 現状 | 設計後 |
|---|---|---|
| 名前 | 「◯◯の託宣」×3（差は漢字 2 字） | PC 同じ＋役割語／SP 「加護 守る」等 |
| icon | PC 22px 金（shield／cards／star）・SP 非表示 | 不変（SP は幅 79px のため役割語で代替） |
| short label | 無し | 守る／整える／攻める |
| description | PC 標準・SP で非表示（title のみ） | 不変（状況表示が実質の説明になる） |
| visual hierarchy | 3 択同色・同形 | 役割語＋状況表示の 2 行で「今の最適」が目に入る。押せない（残り 0）時は既存 opacity 0.4 |
| color dependence | 色差なし（文字のみ）→ 問題なし | 同 |
| mobile | 79×39px・10px 名前だけ | 2 行（15px＋14px）で 39px 内・`nowrap+ellipsis`（長い札名「秘技・満ちる」等は省略） |
| 1 秒判定 | 加護 ○／導き ×／天啓 △ | 3 択 ○（言葉＋今の効果） |

## 6. SIMULATION（総括・`SIMULATION_SUMMARY.md`）

- 総試合数 **1,627,780**（audit 404,740：現行数値 × 7 方策 × 通常 0〜Ⅶ × 100 seed ＋ easy／hard／Daily × 60／tune 1,223,040：導き 8 変種 × 6 方策 × 40 seed）。paired seed `d253-0..99`。Production engine そのもの（敵表・必殺・HP・AP・cards・God・OTOMO・score・seed・7R 不変）。
- 最終 SPEC は数値変更 0 のため、**Pilot 後の paired-seed は Production と完全一致**が Gate 条件（UI-only）。
- reader > naive > greedy：全段維持（通常 99.6／83.2／73.0、Ⅴ 85.8／33.8／25.9、Ⅶ猛威 71.4／12.2／7.6）。
- 49 セル reader<50%（現行）：Ⅴ〜Ⅵ 0／Ⅶ猛威 7／Ⅶ巨躯 17／Ⅶ静寂 3（seed 系列が決定252 と異なるため件数は参考。数値変更 0 のため SPEC で不変）。
- 決定252 counter timing：oracleAware の必殺ラウンド加護率 通常 鬼将 58.0／怨霊 56.4／機工師 51.4／龍神 42.7／道化 78.9%（reader 20.3／29.9／16.7／15.9／10.0）、Ⅴ 89.2／85.4／75.7／75.1／93.7%（reader 77.3／77.9／71.5／72.0／56.4）＝維持どころか強化。魔獣（必殺 R3 連撃）は 8〜29% で reader と同水準。

## 7. IMPLEMENTATION COMPLEXITY（Pilot 見積）
- runtime：`DivinationPanel.tsx`（役割語・previews 3 種・SP 短縮名 span）／`BattleScreen.tsx`（previews 配線）／新規 `oraclePreview.ts`（純関数 3 つ・~40 行）／`battle.css` 末尾＋`dockControls.css`（役割語・2 行・ellipsis・~40 行）／`TutorialOverlay.tsx` tips 1 文。合計 +~150 行。`src/core` 0・save 0・gameVersion 0（`dataFingerprint` は core データのみ）。
- tests：`oraclePreview.test.ts`（導き：cost 境界・複数候補・無し／天啓：撃破境界・敵 block）／`DivinationPanel` の文言スナップショット／既存 `cardSemantic`・`useReactionLanguage` 不変。
- Gate：tsc／lint／full tests／build／Playwright metric-lock（PC 1508×660・1280×720・SP 390×844・390×660：`.divination-choice` box ±0、`.battle-dock` 高さ ±0、横スクロール 0、console error 0、決定249 `rl-*` 不変、決定240 予告不変）／paired-seed＝Production 一致。
- Human QA（PC＋iPhone・同 seed Before/After・3 問）：Q1 3 択の役割が 1 秒で分かったか／Q2 導きを「選びたい場面」が分かったか（例：あと神力 1 で剛撃）／Q3 表示が増えてうるさく・読みにくくなっていないか。3/3 で PASS。

## 8. RISKS
1. **導きの「出せる札」候補が複数**（cost = AP+1 の札が 2 枚以上）：価値順の先頭 1 枚だけ表示（純関数で決定論）。プレイヤーの意図と違う札名が出る可能性 → 「など」を付けるか Pilot で判断。
2. **長い札名の SP 省略**（「秘技・満ちる」「豪快な一撃」）：ellipsis。title 属性に全文。
3. **天啓「撃破」判定は敵 block 込み**（`enemy.hp + block ≤ 4`）。表示と engine を同じ式にする。
4. **Ⅶ猛威で導きを早く切ると −2.7pt**：役割語「整える」と必殺 R の「今なら ブロック」表示で「加護を残す」判断が同じ画面に並ぶ。数値で矯正はしない（Strict なら +0.3）。
5. 決定164／165／234 の Dock metric lock（高さ差 0）を崩さないこと。加護が既に 2 行のため、3 択とも 2 行にすると**逆に揃う**。
6. 決定244 の人間データ（導き ≈0%）は本 SPEC で解消される保証はない → Human QA Q2 と、Pilot 後の Practical QA で導き使用が観測されるかを次の判定材料にする。

## 9. GO / NO-GO
**GO**。数値・engine を触らず、①役割語 ②導き・天啓の状況表示 ③SP 2 行化 ④チュートリアル 1 行で「どれを選ぶか」の判断材料を揃える。sim は現行数値で導きが合理的（通常 45%・勝率不変）であることを示し、数値変更が不要であることを確認した。

## 10. exact Pilot scope（CEO GO 後）
1. branch `feat/d253-oracle-readability`（master `6d6c272` から）
2. `oraclePreview.ts`（純関数）＋テスト／`DivinationPanel.tsx`／`BattleScreen.tsx`／`battle.css` 末尾＋`dockControls.css`／`TutorialOverlay.tsx` 1 文
3. Gate：§7。Before/After の Playwright で box ±0・決定249 反応不変・予告不変
4. Human QA：大耀 × 業斧の鬼将 通常（R1 に「今なら『剛撃』が出せる」／R4 に「今なら ブロック130」）・恵比寿 × 双牙の魔獣 神階Ⅴ（残り 2 回での判断）。PC＋iPhone。3 問
5. 任意（Pilot 判断）：`battleRecap` に導き・天啓の助言文（G1／G2 と同型）

## 11. 触っていないこと
src／runtime／Production／assets 0。`scripts/decision253/` は scratch（未コミット・写しを evidence に保存）。ローカル preview（:4291）は測定後に停止。
