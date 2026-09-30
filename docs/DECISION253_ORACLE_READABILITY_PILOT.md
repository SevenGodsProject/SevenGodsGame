# 決定253 — Oracle Readability v1 Pilot（2026-10-01）

**状態：AUTOMATED GATE PASS → HUMAN QA READY（STOP）**。merge／push／deploy 0。Production = master = origin/master `6d6c272`（runtime `9316ce1`）不変。
Preflight：`docs/ORACLE_CHOICE_READABILITY_PREFLIGHT.md`（docs-only commit `2b165c1`・保持）。Pilot GO は CEO（2026-10-01）。実装方式・Gate 判定は AI 判断。
branch `feat/d253-oracle-readability`（`2b165c1` から。worktree `C:/Users/kimi1/SevenGodsGame-d253`）。evidence：`docs/evidence/decision253/pilot/`。

## 0. 結論（先に）

| 項目 | 結果 |
|---|---|
| implementation diff | runtime **5 ファイル**：新規 `src/components/battle/oraclePreview.ts`（純関数・+~120 行）／`DivinationPanel.tsx`（役割語・名前の本体＋接尾辞・状況表示の長短 2 表記）／`BattleScreen.tsx`（previews 配線・`previewIntentGuard` 直呼びを廃止）／`battle.css` 末尾追記（+~55 行・既存 token のみ）／`TutorialOverlay.tsx` tips 1 文。テスト新規 1（`oraclePreview.test.ts`・9 件）。**`src/core` 0・数値 0・engine 0・save v9 不変・gameVersion 不変（golden `1.d794038a00b5b53c` のまま PASS）・新規 asset 0** |
| tests | tsc 0／oxlint 0／**vitest 1,275 PASS**（Production 1,266＋9・単独実行。Playwright と同時実行すると重い sim テスト 3 件が 5s timeout する既知事象のため単独で確定）／build OK：`index-CzXreZSv.js`（449.88 KB・Production +2.5 KB）・`index-BT3mxnO_.css`（173.18 KB・+0.7 KB） |
| metric lock | 同 seed・同 action 列（託宣 R1 導き／R4 加護／R6 天啓 等＋毎 R 先頭の出せる札 ≤3 枚）で Before／After の保存 GameState（hand・AP・HP・block・enemy HP／block・託宣残・共鳴・intent・rngCursor・score・status）を毎ラウンド 3 時点で比較：**154 行すべて一致（差 0）** |
| PC／SP | ボタン box PC 342×44／SP 79×39／SP660 79×39 とも Before と**同一**。dock box 同一。横スクロール 0。overflow（枠外へのはみ出し）0。SP は接尾辞「の託宣」を畳んで「加護 守る」＋短い状況表示の 2 行 |
| 3 Oracle preview examples | 加護「今なら ブロック20」→ 予告で変化（鬼将 R4「今なら ブロック130」／道化 R3「今なら ブロック120」）／導き「今なら『一心不乱』が出せる」「今なら『姉御の号令』が出せる」「今なら『豪快な一撃』が出せる」「今なら『速攻』が出せる」、候補なし「札を1枚引く（出せる札は増えない）」／天啓「40ダメージ」→ 敵 HP＋block ≤40 で「今なら 撃破」（鬼将 R7・道化 R6〜7 で実測）。SP 短形：「ブロック20」「『一心不乱』」「40ダメージ」「撃破」「札を1枚引く」 |
| 決定252 regression | 予告文・立ち絵 class（charge／special／stance）・必殺カットイン・託宣残数（通常 3／神階Ⅴ 2）が Before/After で全ラウンド一致。決定249 の反応クラス集合（rl-brace／rl-rise／rl-stagger／rl-breathe／rl-otomo-subtle／rl-ap-flash／tone）も一致 |
| gameVersion／save | 変更 0（`dataFingerprint` は core データのみ。UI は core を読むだけ） |
| Human QA | READY：Before `:4271`（Production dist `index-0DI4r-CG.js`）／After `:4272`（§6） |

## 1. implementation diff（`git diff 2b165c1`）

| ファイル | 変更 |
|---|---|
| `src/components/battle/oraclePreview.ts`（新規） | `ORACLE_ROLE_WORDS`（守る／整える／攻める）／`splitOracleName`／`guideApGain`（導きの gainAp をデータから）／`cardDisplayValue`（決定249 と同系の重み）／`guideUnlockedCards`（cost ∈ (AP, AP＋導き神力] の札を価値順）／`strikeDamage`・`strikeWouldKill`（敵 HP＋block ≤ 天啓ダメージ＝engine の block 先消費と同順）／長形 `previewGuardText`・`previewGuideText`・`previewStrikeText`／短形 `previewGuardShort`・`previewGuideShort`・`previewStrikeShort`／`oraclePreviewTexts`・`oraclePreviewShortTexts`（`DIVINATION_CHOICES` の effects で判定＝並び順に依存しない） |
| `DivinationPanel.tsx` | props `guardPreviews`→`previews`＋`previewsShort`。名前を `.divination-choice-name-main`＋`-suffix`＋`.divination-choice-role` に分割。状況表示は既存 `.divination-choice-preview` の中に `-long`／`-short` の 2 span（CSS で片方だけ表示） |
| `BattleScreen.tsx` | `previews={oraclePreviewTexts(state)}`・`previewsShort={oraclePreviewShortTexts(state)}`。`previewIntentGuard`／`DIVINATION_CHOICES` の直 import を撤去 |
| `battle.css`（末尾追記のみ） | 役割語（琥珀 #ffc868・700）・名前 flex（gap 0・役割語 margin-left 4px）・状況表示 nowrap＋ellipsis・`-short` 既定非表示。≤899px：接尾辞非表示・役割語 10px・margin 3px・`-long` 非表示／`-short` 表示 |
| `TutorialOverlay.tsx` | tips に「託宣は「守る」加護・「整える」導き・「攻める」天啓の3つ。押す前に「今なら」の行を見て選びましょう。」を 1 行追加 |
| 変えていないもの | `divination.ts`・`applyDivination.ts`・`rules.ts`・`effects.ts`・回数 3／2・1R1回・enemies／cards／gods／otomo／score／seed・`dockControls.css`（metric lock 規則）・グリフ（shield／cards／star） |

## 2. tests（`oraclePreview.test.ts`・9 件）
役割語と並び／加護の実数（予告 50→20・予告 260→130）／導きの境界（cost = AP+1 は含む・AP は含まない・AP+2 は含まない）／候補複数は価値順の先頭（同点は手札順）・`costModifier` 反映／候補なし fallback（全部出せる・全部遠い・手札 0）／天啓の撃破判定（block 込み・境界 3+1／3+2）／3 択の並び追随と null 条件／SP 短形（ブロック20・『剛撃』・40ダメージ・撃破・札を1枚引く）／長文（『秘技・満ちる』）は全文を返し省略は CSS。

## 3. Automated Gate

| 項目 | 結果 |
|---|---|
| tsc／lint | 0／0 |
| vitest（scratch 除外・単独） | 104 files・**1,275 passed** |
| build | `index-CzXreZSv.js` 449.88 KB／`index-BT3mxnO_.css` 173.18 KB |
| Playwright（`pilot/gate-d253.mjs.txt`・PC 1508×660／SP 390×844／SP 390×660・大耀×鬼将 通常／恵比寿×魔獣 神階Ⅴ／大耀×道化 通常・Before :4271 vs After :4272） | 3 名前 visible／3 役割語 visible（PC・SP）／状況表示 3 択 visible／枠外 overflow 0／横スクロール 0／託宣ボタン押下可（R1 導き・R4 加護・R6 天啓 等が実際に発動し残数が減る）／託宣残数 Before/After 同一／決定252 予告・立ち絵 class 同一／決定249 反応集合 同一／console error 0 |
| metric lock | `pilot/gate-d253.json` `lock`：154 行・不一致 0（保存 GameState の全比較項目が一致・最終 status／score 一致） |

## 4. 3 Oracle preview examples（実測・After・大耀 × 鬼将 通常 seed `d253-qa1`・カード使用後）

| R | 加護（守る） | 導き（整える） | 天啓（攻める） |
|---|---|---|---|
| R1 | 今なら ブロック20 | 今なら『一心不乱』が出せる | 40ダメージ |
| R2 | 今なら ブロック40 | 今なら『姉御の号令』が出せる | 40ダメージ |
| R4（断岩 260） | 今なら ブロック130 | 今なら『姉御の号令』が出せる | 40ダメージ |
| R5 | 今なら ブロック70 | 今なら『後輩想い』が出せる | 40ダメージ |
| R6 | 今なら ブロック50 | 札を1枚引く（出せる札は増えない） | 40ダメージ |
| R7 | 今なら ブロック30 | 札を1枚引く（出せる札は増えない） | **今なら 撃破** |

道化 通常 R3（狂宴 240）：加護「今なら ブロック120」／導き「今なら『豪快な一撃』が出せる」。魔獣 神階Ⅴ R2：導き「今なら『神託』が出せる」。SP 表示は `oracle-panel-sp-after-R1.png`（「加護 守る／ブロック20」「導き 整える／『一心不乱』」「天啓 攻める／40ダメージ」）。

## 5. known issues
1. 導きの候補が複数のときは価値順の先頭 1 枚だけ（Preflight §8-1）。
2. SP の短形でも長い札名（『秘技・満ちる』8 字）は末尾が ellipsis になる（title 属性に全文）。
3. 状況表示は「今の神力」で計算するため、ラウンド開始直後（神力満タン）は導きが fallback になりやすく、札を使って神力が減ると候補が出る（設計どおり：判断は札を使った後）。
4. Gate 中に Playwright と同時実行した vitest で重い sim テスト 3 件が timeout（既知の負荷事象）。単独実行で 1,275 PASS。

## 6. Human QA（READY）
- Before `http://192.168.11.6:4271`（`SevenGodsGame-d252/dist`＝Production `index-0DI4r-CG.js`）／After `http://192.168.11.6:4272`（`SevenGodsGame-d253/dist`）。PC は `127.0.0.1`。
- iPhone：管理者 PowerShell で `scratchpad/d253/qa-fw-add-d253.ps1`（group "QA D253 (temp)"・TCP 4271／4272）。終了後 `qa-fw-remove-d253.ps1`。未追加。
- 推奨：① `/?seed=d253-qa1&enemy=oni`（大耀・ふつう。R1 で札を 1 枚使うと導きに『一心不乱』、R4 断岩で加護 130）② `/?seed=d253-qa2&enemy=juuma&stake=5`（恵比寿・残り 2 回）。
- Q1 加護／導き／天啓が「守る／整える／攻める」として一目で理解できるか／Q2 導きで「今使うと何ができるようになるか」が理解できるか／Q3 スマホでも 3 択と状況表示が窮屈・読みにくくないか。**3/3 YES で PASS**。

## 7. 触っていないこと・STOP
master merge／push／deploy 0。`scripts/decision253/` は scratch（未コミット・写しを evidence に保存）。Human QA 結果が出るまで Release Gate に進まない。
