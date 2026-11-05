# v1.1.6 Quick Win #2：スマホの託宣表示 3 点 — Gate 記録（2026-11-06）

CEO「Quick Win #2 GO」（QW#1 の iPhone Human QA PASS 後）。**runtime の変更は表示専用の文言 3 か所**（`oraclePreview.ts` の短い形と候補なし文言・`tutorialContent.ts` の Tip ⑥）。
託宣の効果（`divination.ts`）・engine・戦闘数値・決定論・save v9・gameVersion・CSS・ボタンの箱に変更なし。外部費用 0。

## 0. 結論

| 項目 | 結果 |
|---|---|
| ① 導きの短縮表示 | SP の短い形を『札名』だけ（例「『神託』」＝託宣と紛れる）から **「出せる:札名」** に。札名が 5 字以上で SP375 の内幅（62px）に収まらないときは札名を出さず **「出せる札＋1」**（CSS の省略で切らない）。長い形（PC「今なら『札名』が出せる」）は不変 |
| ② 候補なし | 「札を1枚引く」→ **「1枚引く＋神力1」**（SP）／「札を1枚引く（出せる札は増えない）」→ **「1枚引く＋神力1（出せる札は増えない）」**（PC）。効果文「カードを1枚引き、神力を1得る」が畳まれる高さ ≤700px・SP でも神力 1 が読める |
| ③ Tip ⑥ | 「押す前に「今なら」の行を見て選びましょう」→ **「押す前にボタン下の行（今使うとどうなるか）を見て選びましょう」**（SP の短い形には「今なら」が無いため。事実だけ・どれを選ぶかは言わない＝決定253／263。「ブロック」の語は遊び方 ③／コツ ③ だけという既存の文言規則（tutorialWording.test）を守る） |
| 文字切れ | SP375（内幅 62px・9px 字）で **3 種とも切れ 0**：「出せる:神託」44px／「出せる札＋1」45px／「1枚引く＋神力1」58px（§3。全 60 札名の実測で「出せる:札名」は 4 字以下 45/60 が収まり、5 字以上 15 札は「出せる札＋1」へ） |
| PC 副作用 | 1508×660／1366×768 とも長い形は不変（候補なしの文言だけ 148 → 165px・枠 324px）。ボタンの箱 342×44／61 不変 |
| 検証 | §2 契約テスト・vitest 1,703 PASS（136 files・skip 17）・lint／tsc・build（JS +0.10 kB・CSS 不変）・実ブラウザ before／after（§3）・S2 44/44 PASS・S5 228/228 PASS・d264 gate-lock（託宣パネル metric lock）14/14 run PASS（3 case × pc／sp／sp660 × before／after：7 ラウンド完走・errors 0・反応 7・神の一撃あり。METRIC LOCK：保存 state の比較 156 行 mismatch 0。初回実行で 4 run が Chromium の Target crashed（開発機 6 GB のメモリ不足・製品側ではない）→ 同 4 run だけを単独再実行して PASS。両方の json／stdout を保存） |
| 残リスク | §5 |

## 1. 変更ファイル

| ファイル | 変更 |
|---|---|
| `src/components/battle/oraclePreview.ts` | `GUIDE_NO_CANDIDATE_TEXT`／`GUIDE_NO_CANDIDATE_SHORT` の文言、`GUIDE_SHORT_NAME_MAX = 4`・`GUIDE_SHORT_GENERIC = '出せる札＋1'` を追加、`previewGuideShort` を「出せる:札名」／「出せる札＋1」に |
| `src/components/battle/oraclePreview.test.ts` | 期待値の更新＋追加（4 字以下は札名付き・5 字以上は効果のみ・候補なしは神力 1 を含む・短い形は「出せる」が先頭） |
| `src/components/tutorialContent.ts` | Tip ⑥ の文言（7 本・③／⑦ は不変） |
| `scripts/release-audit/oracle-sp-probe.mjs` | 新規：実ブラウザで 3 択の状況表示（長い形／短い形）・実文字幅（Range）・ボタン内幅・文字切れ・候補文字列の収まり（全 60 札名）を測る（読み取り専用・託宣は押さない） |

## 2. 契約テスト（`oraclePreview.test.ts`）

- 候補あり（剛撃・2 字）→ 短い形「出せる:剛撃」、長い形「今なら『剛撃』が出せる」（不変）
- 候補あり（秘技・満ちる・6 字）→ 短い形「出せる札＋1」、長い形は札名を出す
- 候補なし → 短い形「1枚引く＋神力1」・長い形「1枚引く＋神力1（出せる札は増えない）」
- 短い形は候補の有無にかかわらず「出せる」で始まる（候補あり）／`GUIDE_SHORT_NAME_MAX` は 4
- 既存：役割語・加護の最低 20・天啓の撃破判定・`cardTextScale.test`（効果文の数値＝効果値）・`tutorialWording.test`（Tip 7 本・③／⑦ 固定）は不変

## 3. 実ブラウザ計測（`oracle-sp-probe.mjs`・大耀 × 業斧の鬼将・R1・headless Chromium）

| build | viewport | 候補なし（R1 開始） | 候補あり | 文字切れ | 効果文 |
|---|---|---|---|---|---|
| before | SP375（375×667） | 「札を1枚引く」43/62px | 「『姉御の号令』」53/62px | なし | 非表示 |
| after | SP375 | **「1枚引く＋神力1」58/62px** | **「出せる札＋1」45/62px**（姉御の号令＝5 字）／**「出せる:神託」44/62px**（seed `qw2-oracle-2`・`-4`） | **なし** | 非表示 |
| after | SP390（390×844） | 58/67px | 45/67px | なし | 非表示 |
| after | SP 390×660 | 58/67px | 45/67px | なし | 非表示 |
| before／after | PC 1508×660 | 「札を1枚引く（出せる札は増えない）」148px →「1枚引く＋神力1（出せる札は増えない）」165px（枠 324） | 「今なら『姉御の号令』が出せる」119px（不変） | なし | 非表示（高さ ≤700） |
| before／after | PC 1366×768 | 同上 | 同上 | なし | 表示 |

- 候補文字列の収まり（全 60 札名・SP375 内幅 62px）：「『札名』」59/60・「出せる『札名』」30/60・「出せる:札名」45/60・「『札名』可」56/60・「出せる札＋1」「1枚引く＋神力1」各 100%。→ 採用：「出せる:札名」（4 字以下 44 札）＋「出せる札＋1」（5 字以上 16 札）＝切れ 0
- ボタンの箱：SP 74×39（375）／79×39（390）・PC 342×44（660）／342×61（768）は before／after で同一。横スクロール 0。JS error 0
- `buttonOverflowY`（scrollHeight > clientHeight）は before／after とも SP で true＝`.divination-choice::after` の 45px タッチ領域（a11y）によるもので文字のはみ出しではない（画面で確認）
- 画面（jpeg）：`docs/evidence/v1_1_6-qw2-oracle-sp/screens/`

## 4. 回帰

| Gate | 結果 | 証跡 |
|---|---|---|
| vitest | 1,703 PASS（136 files・skip 17） | `vitest-stdout.txt` |
| lint（oxlint）／tsc | PASS（warning は master と同数） | — |
| build | JS 492.77 → 492.87 kB（+0.10）・CSS 不変（同一ハッシュ） | — |
| S2 回帰受入（v1.1.6 (ddd966f)＝branch の 1 commit 目を含む最終 build・Tip 数 7・Tip ③） | 44/44 PASS | `s2-acceptance.json`・`s2-stdout.txt` |
| S5 将軍家 公開受け入れ | 228/228 PASS | `s5-acceptance.json`・`s5-stdout.txt` |
| d264 gate-lock（決定253／254：3 名前・3 役割語・状況表示あり・overflow 0・横スクロール 0・託宣が押せる・残り回数・決定240 予告・決定249 反応・console 0・METRIC LOCK：同 seed 同手順で保存 state と結果が before／after 同一） | 14/14 run PASS（3 case × pc／sp／sp660 × before／after：7 ラウンド完走・errors 0・反応 7・神の一撃あり。METRIC LOCK：保存 state の比較 156 行 mismatch 0。初回実行で 4 run が Chromium の Target crashed（開発機 6 GB のメモリ不足・製品側ではない）→ 同 4 run だけを単独再実行して PASS。両方の json／stdout を保存） | `gate-lock/`・`gate-lock-stdout.txt` |
| 決定論（cf2・140 組） | 省略（engine・data 変更 0。表示文言のみ） | — |

## 5. 残リスク

- 「出せる:札名」と「出せる札＋1」の 2 表記が札名の長さで切り替わる（4 字以下／5 字以上）。どちらも「出せる」で始まり効果は同じ。CEO Human QA で違和感がなければ据え置き
- 札名の長い札（5 字以上・16 札）は SP で札名が見えない（PC の長い形では見える）。手札の札には神力の数字があるため、どの札かは手札側で判別できる
- Known K21（導きの人間の使用率は未観測）は不変。Known K40〜K47 不変
- CEO Human QA（iPhone・本番）：託宣バーの 3 行目（今使うとどうなるか）が読める・切れない・Tip ⑥ が画面と一致

## 6. CEO 操作

1. PR #27（branch `feat/v1_1_6-qw2-oracle-sp`）の merge（CI GREEN・CLEAN 確認後・1 回）
2. 本番反映後：AI が本番 S2＋oracle-sp-probe → CEO Human QA（iPhone）→ 第 3 優先（R6〜R7 のラウンド表示強調）へ
