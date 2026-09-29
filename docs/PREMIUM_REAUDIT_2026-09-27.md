# Premium 改善 再監査（2026-09-27）— 出荷済み 決定224〜239 の総括と NEXT NOW 1 件

- 日付：2026-09-27
- 種別：**AUDIT ONLY／docs-only**（runtime／tests／assets／branch／worktree／commit／push／deploy：すべて 0。Production `f8183eb` 不変）
- 判断主体：AI チーム（CLAUDE.md §6-2「複数案からの推奨案選定」）。実装 GO は CEO
- 基準：`docs/DECISION225_BATTLE_SCREEN_PREMIUM_QUALITY_AUDIT.md` の A〜P 16 層＋SOUND／RESULT／HOME、`SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md`（North Star＝敵の意図を読み攻略の答えを見つける）
- 対象 build：`C:/Users/kimi1/SevenGodsGame-d239-rc`（HEAD `f8183eb`＝Production。rebuild せず `vite preview :4351` で配信 → 監査後に停止・LISTEN 0）
- 計測：Playwright（Chromium・DPR 1）で **PC 1508×660／SP 390×844** の 大耀 × 蒼海の龍神（`?seed=d223-pilot-01`）を 1 戦通し（各 13 手・6 ラウンド・勝利・スコア 7,870 両環境一致・console error 0）。calm／card play +120ms／着弾 +370ms／+900ms／重い一撃／共鳴カットイン／神の一撃／各ラウンド終了／敵ターン／勝利の舞台／結果／報酬／ホームを撮影（46 枚）し、DOM の寸法・絵文字・pill・書体を JSON に採取。証拠：`scripts/premium-reaudit/out/`（`pc-*.png`・`sp-*.png`・`*-log.json`）、スクリプト `scripts/premium-reaudit/shots.mjs`
- 除外（再提案しない）：Ranking（CEO 判断で dormant）・Lane3 After-2 新原画（CEO 画像待ち）・新 asset／新 SE 購入を要するもの（§5 に「後続」として分離）

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **NEXT NOW（1 件）** | **Enemy Intent Presentation v1「予告を板の文字から敵の構えへ」**：①名札内の予告 `.intent` の絵文字 4 種（⚔／💥／🔥／⚡）を既存 SVG `GlyphIcon`（`cardIcon.tsx`）へ置換 ②予告の危険度（strong／huge／special／charge）を **敵の立ち絵そのもの**に「構えの気配」（既存 `enemy-avatar-charging` と同方式の静的グロー・pulse は charge のみ現状維持）として出す。新 asset 0・新 SE 0・`src/core` 0 |
| なぜこれか | 予告は **画面に 100% の時間出ている唯一の「解く」情報**で、1 戦 5〜7 回変わる。49 行動中 27（55%）が strong／huge／special／charge＝**1 戦の約半分のラウンドで「危険な予告」が出る**のに、今の表現は 20px の絵文字＋文字色（`battle.css:602-660` は text-shadow／outline のみ）で、敵の体は charge の 2 体（機工師・道化師）以外 **何も変わらない**（`EnemyPanel.tsx:97-104`）。決定225 §F の判定「Premium 感を落としているのは絵文字と『板の中の文字』」に対して、出荷済み 16 決定はまだ **1 つも触れていない**（本監査で唯一「未着手のまま残った層」）。HUD 監査（`HUD_PREMIUM_PRE_AUDIT.md` §4 案 D）が「A（決定235）の後に予告 1 行だけで別 Preflight」と先送りした項目でもあり、当時の却下理由（Lane2 と `BattleScreen.tsx` が衝突）は決定232 の出荷で消えている |
| 数値 | 常時可視 100%／変化 5〜7 回・戦／危険予告 27/49 行動（55%）／変更ファイル 3〜4（`cardStyle.ts`・`cardStyle.test.ts`・`EnemyPanel.tsx`・`battle.css` 末尾）／予測容量 ≤2KB／入力ブロック増 0ms／保護決定（224・226・229・232〜239）の CSS ブロックに触れない |
| Human QA | **必要**（3 問・同 seed Before／After・PC と SP）。「板を読む前に体で分かるか」は数値で判定できない |
| 先に出せる Hotfix 候補（NEXT NOW とは別番号） | **結果トースト `.result-toast`（`battle.css:1990-2004`・`position:fixed; top:100px`・pill）が決定235 の名札（大耀）のタイトルに重なる**（PC・SP とも毎手 1.4s・勝利の舞台中も。`pc-03`・`sp-03`・`pc-12`）。CSS 1〜3 宣言で名札の外へ。決定237／238 と同じ「Fast Gate・Human QA 省略可」型 |
| 出荷済み 16 決定の総括 | 決定225 の「Web ゲームに見せる 3 要因」のうち **①HUD ガラス板**は決定234／235 で名札・ゲージ・ドックが解消（残り：上部バーの神力 pill・共鳴予告帯・トースト pill）、**②L1 が押したら数字**は決定232／233／237／239 で「タップ音 0ms → カードが神へ飛ぶ → 神が突く → 敵が 30ms 止まり 4px 退く」の一続きになった（残り：中央の閃光位置・文章の三重表示）、**③4 画風・接地なし**は asset 領域のため未着手（決定229 で大きさ・向きだけ解消）。**TOP TARGET だった撃破→勝利は決定226 で解消**（Human QA 5/5） |

---

## 1. 出荷済み Premium 改善の総括（決定 × 層 × 効果・数値）

| 決定 | 層 | 何が変わったか | 数値（各 Decision の Gate 実測） |
|---|---|---|---|
| 224 | B・J・I | 豪快な一撃だけ READY material（神色の縁・lift 3px・sweep）、全⚡共通 PAYOFF（stop 50ms・34px 金・撃破⚡ 52px 金・`reward`×1.5） | Human QA 5/5・入力ブロック増 0ms・≈3.7KB |
| 226 | M | 「撃破」の拍を勝利の舞台（円形ポートレート・明朝「勝利」・神名×敵名・初撃破）に置換、tap skip 2 段階 | 追加待機 0ms・skip で崩壊→ボタン 3.2s→0.75〜1.0s・Human QA 5/5 |
| 228 | A・G・K（SP） | SP の 3 列幅固定・吹き出し 2 行・バッジ 1 行化 | 360 龍神バフ 3：「あと N」8→3 行・神プレート 237→130px・省略 21/21→0 |
| 229 | A・C・D（SP） | 神・敵の絵を舞台の共通の地面へ（レイヤー分離）、敵だけ左右反転、OTOMO 0.75 | 敵 3.1〜3.5→5.2〜5.5%・神 2.4〜2.7→5.0〜5.3%・着弾中心 100%・向き合い 48/48 |
| 230 | K（SP） | 得意技バッジの折返し・「共鳴」1 行 | 7 神 × 3 幅で切れ 0・画面外 0 |
| 231 | B | コスト珠の楕円潰れ・SP 条件文はみ出しの修正 | 珠 150/150 が 26×26・はみ出し 0 |
| 232 | I・C・D | Card Hit Weight Ladder v1.1：L1 stop 0→30ms・kb 2→4px・揺れ ±2→±4px、L2 20→40ms、tier≥3 の本体は引き 13px→突き 28px（SP 22px）・溜め 150ms | 重い突き 1.99 回／戦・入力ブロック増 0ms・Human QA PASS（v1.1） |
| 233 | O | タップ 0ms に `card_play`・同一音 30ms 内の重複を 1 回に・開幕ドロー音 5→1 | 押下→音 0〜2ms（Before 286ms 以上無音）・重複 10 組→0・iPhone 実機 3/3 |
| 234 | G | ドック（ラウンドを終える・ログ・託宣）を漆黒の札＋金縁・書体統一・🙏→SVG・「ラウンドを／終える」2 行 | ドック外の移動 0・Meiryo／絵文字 0・Human QA 6/6 |
| 235 | G | 名札 3 枚を漆黒の札＋金の細縁＋角金具、HP 2 本と共鳴を角 2px の溝＋金枠＋艶 | 寸法 3,440 値で差 0・名札内 pill 3〜5→0・CSS +2.3KB |
| 236 | B | 豪快な一撃 1 枚だけ Art Window（文字帯を下 45%） | 文字の開始 30.2→54.9%・他カード diff 0 |
| 237 | H | `.cast-flash` の黒い四角（386px）を `mix-blend-mode: screen` 1 宣言で解消 | 閃光内の暗い画素 SP 49.4→3.4%・PC 34.9→0.4% |
| 238 | B（低 SP） | カード 140px 時だけ「◯◯専用」行を非表示 | 60 種 × 3 画面ではみ出し 0 |
| 239 | H・A | 出したカードのゴーストが神の胸元へ 240ms で飛ぶ（WAAPI） | 終点誤差 ≤1.6px・入力ブロック増 PC +4ms／SP +0.5ms・Human QA 3/3 |

決定225 の G1〜G14 との対応：G1（撃破→勝利）＝226 ✔／G2（L1）＝232・233・237・239 ✔（閃光位置・文章は残）／G3（HUD）＝234・235 ◎（残：上部バー pill・トースト）／G4（画風・接地）＝229 で大きさ・向きのみ／G5（SP プレート）＝228・230 ✔／G6（PC 手札 10 枚）未／G7（カード枠 2 言語）未／G8（共鳴 4 の目印）未／G9（トースト・バナーの重なり）未／G10（skip）226 で勝利のみ／G11（wound）未／G12（音）233 で入力応答のみ／G13（SP 被弾リング）未／G14（無効カード二重減光）未。

---

## 2. 現状の再監査（層ごと・残る gap・証拠）

証拠の `pc-NN`／`sp-NN` は `scripts/premium-reaudit/out/` の撮影番号。file:line は d239-rc（＝Production）。

### A. OVERALL COMPOSITION
- 直った：SP は決定228／229 で 3 列固定＋舞台レイヤー分離。神・敵が向き合い（`sp-01`：龍神が右向き・大耀が左向き）、着弾が絵の中（決定229 Gate 100%）
- 残る：SP で HUD 下端（y≈230）と敵の絵の上端（y=387）の間に **≈155px の空いた帯**（吹き出しだけ。決定229 Known Risk 7）。PC で手札 9〜10 枚時のアリーナ圧縮（決定225 PC-4・本戦は最大 6 枚で未再現）。SP 手札 5 枚目以降スクロール外（SP-6・`sp-01` で 4 枚目が右端で切れる）
- 判定：構図の骨格は成立。残りは「帯」（案：舞台の背景の見せ方）で、演出より優先度低

### B. CARD QUALITY
- 直った：READY material（224）・珠（231）・Art Window 1 枚（236）・低 SP 文字（238）・ゴースト飛翔（239）
- 残る：①通常カードは `border: 2px solid <タイプ色>` の CSS 線（`pc-01`：赤・青・金の枠が UI ボタンに見える。G7）②**AP 0 のとき手札全部が grayscale＋暗転で「壊れた UI」**（`pc-03`・`pc-05`：4 枚とも灰色。G14。AP は毎ラウンド 0 になるので 1 戦 5〜7 回・各数秒〜十数秒）③カード名の絵文字は `CardView.tsx:132` の `{style.icon} {def.name}`（表示層。`cardStyle.ts:13-15` の `icon`）＝カード 5 枚に常時 5 個
- 判定：②は CSS 1〜2 規則で直る（`filter` と inline `opacity .45` の二重を片方に）。①は 60 種 × 5 画面の Gate が要り規模が大きい

### C. GOD PRESENCE
- 直った：SP 高さ ×1.4（229）、重い一撃で引き→突き（232）、カードが神の胸元へ（239）
- 残る：接地影なし・ポーズ 1 枚・カットインの絵（keyvisual）と舞台の絵（front）の不連続・**進化バナー「🌱 OTOMOが受肉態に成長した！」が神の顔に重なる**（`pc-08`。決定225 PC-6 そのまま）
- 判定：asset なしで動かせるのはバナー位置と絵文字だけ

### D. ENEMY PRESENCE
- 直った：SP 大きさ・向き（229）、L1 の体の反応（232：30ms・4px）、重い一撃の溜め
- 残る：①HP 50%／25% の `enemy-wound`（`battle.css:4541-4555`：260px の赤い放射 α0.19／0.33）は `pc-06`・`sp-10-round5` で **見える**が静止した赤い円で「追い詰めた」瞬間の合図がない（閾値をまたいだ時の一回性の反応 0）②やられ絵なし（asset）③**予告の危険度が体に出ない**：charge の 2 体だけ `enemy-avatar-charging`（`EnemyPanel.tsx:97-104`・`battle.css:1290`）。強打・特大・必殺は名札の文字色だけ
- 判定：③が F と同じ根で最大。①は「削っている」感（決定225 CEO 既知）の残り 1 要因

### E. OTOMO PRESENCE
- 直った：229 で 0.75 倍（間隔確保）。残る：浮いている・無反応。決定214（戦略的役割未確定）により見た目先行はしない

### F. ENEMY INTENT　← **唯一、出荷済み 16 決定が触れていない層**
- 事実（実測）：`.intent` の内容は `⚔ 40`→`⚔ 50`→`⚔ 70`→`⚔ 90`→`💥 強打 120`→`🔥 特大 160`（`pc-log.json` round1〜6）。書体 `system-ui`・PC 20px／SP 17px（`battle.css:4733`・`5376`）。tier 表現は `intent-tier-strong`（色）・`-huge`（text-shadow＋outline）・`-charge`（同＋::after の呼吸）だけ（`battle.css:619-660`）。絵文字は `cardStyle.ts:98-110` の文字列に埋め込み（HUD 監査 §2 R4「18 箇所」のうち常時可視はここ 1 個）。Windows では Segoe UI Symbol のモノクロ、iOS ではカラー絵文字【推測】
- 敵 49 行動の内訳（`src/core/data/enemies.ts`・閾値 `cardStyle.ts:77-81`：strong ≥100・huge ≥150 表示値）：normal 22（45%）／strong 7（14%）／huge 8（16%）／multiAttack 7（14%・うち必殺付きあり）／special 1（2%）／charge 4（8%）＝**危険予告 27/49（55%）**
- 判定：North Star の第一の対象が「板の中の絵文字＋文字」のまま。決定235 で名札が漆黒＋金になった分、**その中の絵文字が最も浮いて見える**（`pc-06`「💥 強打 120」・`pc-12`「🔥 特大 160」）

### G. HUD
- 直った：名札・ゲージ（235）・ドック（234）・SP 列（228／230）。実測 pill：名札内 0
- 残る：①上部バー「神力 2/2」の **`.ap-gauge` pill**（`battle.css:103-110`・radius 999。実測 pills＝`ap-gauge`,`ap-gauge-fill` の 2 つだけ）②上部バーは半透明箱＋`system-ui`（`pc-01` 上端）③共鳴札の下の予告帯 `.burst-preview`（`GodOtomoPanel.tsx:204`）が半透明の細い帯として舞台に被る（`pc-01` 右上 y≈200）④**`.result-toast` pill が名札に重なる**（`battle.css:1990-2004`：`position:fixed; top:100px; border-radius:999px`。`pc-03`：「⚔ 敵に120ダメージ」が大耀の名札のタイトル行に被る。`sp-03`：龍神と大耀の両名札の上端に被る。`pc-12`：勝利の舞台の上にも「⚔ 敵に280ダメージ」）
- 判定：④は**毎手 1.4s × 12 手／戦**で最も頻繁に見える残余。決定235 の後で相対的に目立つようになった（決定224 後の「基準ができたことで見えた」型）

### H. NORMAL CARD PLAY
- 直った：0ms 押下音（233）・ゴーストが神へ（239）・閃光の黒板（237）・神の突きと敵の反応（232）
- 残る：①`.cast-flash` は依然 `position:fixed` 画面中央（W7。カードは神へ飛ぶが閃光は神から離れた中央）②同じ結果の三重表示（トースト「⚔ 敵に120ダメージ」＋数字「-120」＋ミニ結果「-120 DAMAGE! 敵 HP 1,030→910」。`sp-03` に 3 つ同時）。W6
- 判定：②は決定203／205（可読性）の成果物を含むため文言は保護。位置と材質だけが対象

### I. IMPACT / HIT
- 直った：L1 30ms／4px、L2 40ms、tier≥3 の溜め（232）
- 残る：L1→L2 の差は stop 10ms・kb 1px・数字 16→22px＝小さい。tier<3 の攻め手側の差 0。VFX は PNG 閃光＋CSS 斬撃線のまま
- 判定：CEO Human QA が v1.1 を Final としており、追加調整は「もたつき」再燃リスク。**今は触らない**

### J. ⚡ PAYOFF
- 決定224 のまま成立。決定237 で金の輪がむしろ見えやすくなった。Known：神の一撃直後の⚡数字隣接（未修正・低頻度）

### K. RESONANCE
- 直った：SP の潰れ（228／230）。残る：**閾値 4 の目印なし**（G8・`GodOtomoPanel.tsx` の段階は 5／6 のみ）。charged 型の READY 予告が「あと 1」で分からない

### L. GOD STRIKE
- 変更なし（決定225 のまま強い）。残る：バナー「✨ 大耀の一撃！」が `system-ui`＋絵文字（`BattleScreen.tsx:520`）・進化バナーが神に重なる（`pc-08`）・スキップ不可（Law 5）

### M. DEFEAT / VICTORY
- 直った：勝利の舞台（226）・撃破⚡52px（224）
- 残る：崩壊は同じ絵の脱色（asset）。結果画面は黒モーダル＋1px 金枠の帳票（`pc-13`：10 セクション、PC はカード内スクロール 772px／可視 561px。SP は内訳が折りたたみで **629px に収まりスクロール不要**＝決定225 SP-7 は軽減済み）。**トーストが舞台の上に残る**（`pc-12`）
- 判定：舞台で山は作れた。帳票の材質（名札と同じ漆黒＋金）は候補だが `GameOverOverlay`（502 行・テスト多数）の回帰面が広い

### N. BACKGROUND / DEPTH
- 変更なし（決定219〜222 で背景は静止と決定）。接地影なし。**再検討しない**

### O. SOUND
- 直った：入力応答（233）
- 残る：BGM 1 曲固定・ダッキングなし。ジングルは `bg.pause()` の**即停止 → 再開**（`bgm.ts:163-180`。フェードなし）。iOS で `volume` が効かない R5 未確認（`SOUND_PREMIUM_PRE_AUDIT.md` §R5）→ Web Audio 化が前提＝実機確認必須

### P. ART CONSISTENCY
- 変更なし（敵 2 画風・OTOMO 320px・接地なし）。asset 領域。除外

### RESULT／HOME
- RESULT：M 参照。報酬 3 枚 pop-in は儀式化なし（`pc-15`・`sp-15`）
- HOME：`pc-00`／`sp-00`：恵比寿の keyvisual 全面＋「初陣へ」金 CTA＋今日の神域挑戦カード。**第一印象は既に商用寄り**（P13「5 秒で証明」は Battle 側の課題）。残るのは pill ボタンと `system-ui` 程度＝優先度低

---

## 3. 候補一覧（順位付け・根拠）

体感 impact＝「毎戦どれだけの時間・回数、目に入るか」×「North Star（解く）への寄与」。頻度は Lane2 980 戦シミュ（敵への着弾 12.13 回／戦・L1 6.70・⚡0.94・神の一撃 0.40・撃破 1.0）と本監査の 1 戦（13 手・6 ラウンド）・敵 49 行動の内訳から。

| 順位 | 候補 | 体感 impact（頻度・理由） | 実装コスト（ファイル・保護決定への影響） | asset | Human QA | 回帰面 |
|---|---|---|---|---|---|---|
| **1** | **Enemy Intent Presentation v1**（予告の絵文字→SVG glyph＋危険度を敵の体に「構えの気配」） | **常時 100%**・変化 5〜7 回／戦・危険予告 55% のラウンド。North Star の第一対象。決定225 §F の指摘に未着手 | `cardStyle.ts`（純関数 2 つ追加・既存 `formatEnemyIntent` 不変）・`cardStyle.test.ts`・`EnemyPanel.tsx`（予告 1 行の描画＋avatar クラス 1 つ）・`battle.css` 末尾 ≈30 行。決定229（SP 反転 `scale:-1 1`・`--atk-x`）は box-shadow が要素と一緒に反転するため影響なし。決定232（`.enemy-reaction`）・226（`.enemy-collapse`）とは別要素 | **0** | **要**（3 問） | 中：`.intent` の高さ（PC 25px／SP 21px）を変えない条件で決定228／230／235 の名札寸法が SAME であること。tests 12 件（`cardStyle.test.ts`）は既存関数不変なら通る |
| 2 | **結果トーストの名札重なり Hotfix**（`.result-toast` を名札の外へ・pill→札） | 毎手 1.4s × 12 手／戦＋敵ターン＝**1 戦 ≈20 秒**、決定235 の名札を隠す。勝利の舞台にも残る | `battle.css` 1〜3 宣言（`top` を HUD 下端へ、または `.battle-arena` 内の absolute）。決定203／205 の文言不変 | 0 | 省略可（数値で判定） | 低：SP の `.battle-mini-result` の `top:58px` が `.battle-hud` 高さに依存（`battle.css:614` コメント）→ 位置の衝突を Gate で確認 |
| 3 | **無効カードの二重減光を片方に**（G14） | AP 0 のとき毎ラウンド（5〜7 回／戦）・手札全体が「壊れた UI」に見える（`pc-05`） | `battle.css` 1〜2 規則（`filter: grayscale(.35) brightness(.72)` と inline `opacity .45` の整理。inline の方は `CardView.tsx` 1 行） | 0 | 省略可 | 低：READY（決定224）の無効表示との関係だけ確認 |
| 4 | **HUD 残余の材質統一**（上部バーの神力 pill・共鳴予告帯・上部バー箱） | 常時。ただし小部品 | `hudPlate.css` 末尾追記（決定235 と同じ手法・寸法不変） | 0 | 省略可 | 低：寸法 Gate（決定235 の `gate-diff` を再利用） |
| 5 | **敵 HP 閾値の「追い詰めた」一回性反応**（50%／25% をまたいだ瞬間：敵の短い怯み＋名札の赤フラッシュ＋既存 `hit_l3` 系の再利用）→ 「削っている」感 | 2 回／戦（確定）。CEO 既知の主訴の残り 1 要因 | `EnemyPanel.tsx`（band 変化の検出）・`battle.css`。決定232 の反応と時刻が重なるため `combatTimeline` の計画に乗せる必要あり | 0（SE は既存流用） | 要 | 中：着弾時刻表（決定232）に新しい要素を足す |
| 6 | **結果画面の材質**（黒モーダル→名札と同じ漆黒＋金・見出しを明朝） | 1 回／戦。決定226 で山はできた | `GameOverOverlay` の wrapper CSS のみ（DOM 不変） | 0 | 要 | 中〜高：`resultHub`・`resultTransitions`・段階表示 tests |
| 7 | **進化バナー・神の一撃バナーの位置と絵文字**（神の顔に重なる・✨🌱） | 0.4〜1 回／戦 | `BattleScreen.tsx:520/532`・`battle.css` | 0 | 省略可 | 低 |
| 8 | **共鳴ゲージの「4」の目印**（G8） | 常時（charged 型の神のみ意味あり） | `GodOtomoPanel.tsx`・CSS | 0 | 省略可 | 低 |
| 9 | L1／L2 の差の追加調整（Lane2 残余） | 7.7 回／戦 | 決定232 の定数 | 0 | 要 | 中：CEO が v1.1 を Final と判定済み → **今は見送り** |
| 10 | BGM ダッキング（Web Audio 化） | 0.4＋1 回／戦 | `bgm.ts` 再生方式変更・iOS 挙動 | 0 | **実機必須** | 高：自動再生制限・ループ継ぎ目・R5 未確認 |
| 11 | 通常カードの枠を material に（G7） | 常時 | `CardView`・`battle.css`（60 種 × 5 画面の Gate） | 0 | 要 | 高：決定231／236／238／239（ゴーストが枠を複製） |
| 12 | 中央閃光を神の手元へ（W7 残） | 12 回／戦 | `.cast-flash` の座標化（決定239 の終点計算を流用） | 0 | 要 | 中：決定237 の blend・239 のゴーストと同時刻 |
| — | 敵のやられ絵・被弾ポーズ／画風統一／OTOMO 高解像度 | 高 | — | **新 asset** | — | §5 へ |
| — | 新 SE・BGM 層 | 高（耳） | — | **新音源** | — | §5 へ |
| — | Ranking／Lane3 After-2 | — | — | — | — | 除外（CEO 判断・画像待ち） |

順位の決め方：1 は「常時 100%＋North Star 直結＋未着手層」で単独首位。2〜4 は頻度が高いが「欠陥の修正・小部品」で 1 戦の印象を変える量は 1 より小さく、Hotfix／小 Pilot として **1 と並行して出せる**。5 は良いが時刻表に触る。6 以降は頻度か回帰面で劣後。

---

## 4. NEXT NOW（1 件）— Enemy Intent Presentation v1「予告を敵の構えへ」

### 4-1. CLAUDE.md §6-1 の 9 軸

| 軸 | 評価 |
|---|---|
| Player Value | ◎ 予告は毎ラウンドの判断の起点。「板を読む」前に「敵の様子」で分かる＝解く速度と没入の両方 |
| Strategic Depth | ○ 情報は増やさない（P2：既存の予告 tier をそのまま体に写す）。深さは変えず、読みやすさを上げる |
| Replayability | ○ 7 敵 × 49 行動の「構え」の違いが見える＝敵の個性の可視化 |
| Game Feel | ◎ 「敵が構える → 神が答える → 敵が反応する」の往復のうち、**最初の一手（敵の構え）が今は無い** |
| UX | ◎ 絵文字の端末依存（Windows モノクロ／iOS カラー）を SVG 1 系統に。名札の高さ不変 |
| Retention | ○ 毎戦・毎ラウンド効く（一回性の演出ではない） |
| Implementation Cost | 低〜中：3〜4 ファイル・≤2KB・新 timer 0 |
| Regression Risk | 中：名札寸法（228／230／235）と敵の反応（232）・反転（229）との共存を Gate で数値確認 |
| SEVEN GODS 独自性 | ◎ 「敵の意図を読む」が本作の Primary Fun（`SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md` P1／P2） |

### 4-2. Preflight 概要（実装しない・ここでは輪郭だけ）

| 項目 | 内容 |
|---|---|
| scope ① 予告の絵文字 → SVG | `cardStyle.ts` に **純関数 2 つを追加**：`getIntentGlyph(intent): GlyphKey`（normal→`sword`／strong→`swordHeavy`／huge・special・必殺連撃→`burst`／charge→`bolt`。既存キーのみ・`cardIcon.tsx` 変更 0）と `formatEnemyIntentText(intent)`（`formatEnemyIntent` から先頭絵文字を除いた文言）。**`formatEnemyIntent` 自体は不変**（`cardStyle.test.ts` 12 件・`src/core/engine/intent.ts` のコメント参照・ログ／ミニ結果の文言を守る）。`EnemyPanel.tsx:126` の描画だけ `<GlyphIcon glyph=… className="intent-glyph" /> {text}` に |
| scope ② 構えの気配 | `EnemyPanel.tsx` の avatar クラス組み立て（`:97-104` の `chargingClass` と同じ場所）に `enemy-avatar-intent-strong`／`-huge` を追加（charge は既存 `enemy-avatar-charging` のまま）。CSS は `battle.css` **末尾追記**：strong＝薄い赤のリム（box-shadow 1 層・静的）、huge／special＝紅のリム＋内側の影（既存 `enemy-avatar-charging-super` の色系 `#ff5c5c` を流用・**animation なし**。pulse は CEO 方針「最上位のみ」に従い charge だけ現状維持）。`--atk-x` 反転・`.enemy-reaction`・`.enemy-collapse` には触れない |
| 触らないもの | 決定224（READY・⚡）・226（舞台）・229 の `@media (max-width:899px)` ブロック・232 の末尾ブロック・233（音）・234／235（`dockControls.css`・`hudPlate.css`）・236〜239。`src/core`・rules・save・`formatEnemyIntent`・予告の数値・tier 閾値 |
| 受け入れ（数値・案） | A1 `.intent` の高さ PC 25px／SP 21px ±0（7 敵 × 7 ラウンド × SP 360／390／430／PC 1508）→ 名札 140 項目が Production と SAME／A2 `.intent` 内の絵文字 0・SVG 1／A3 normal の 22 行動で気配クラス 0（静かなラウンドは静かなまま）、strong 7・huge 8・special／必殺連撃・charge 4 で期待クラス／A4 決定232 の着弾時刻（90／150／240／1,600）と hit stop が SAME／A5 決定229：SP 反転 48/48・着弾中心 100%・気配が左右対称／A6 撃破時に気配が消える（`.enemy-defeat` と同時に付かない）／A7 reduced-motion：追加 animation 0（静的リムは残す＝情報保持）／A8 console error 0／A9 JS＋CSS ≤2KB |
| Human QA（要） | 同 seed Before／After・PC と SP 各 1 戦（大耀 × 蒼海の龍神＝R5 強打・R6 特大、＋機工師か道化師＝charge）。Q1 予告の板を読む前に「次は危ない」と敵の様子で分かったか／Q2 予告の数字・技名が読みにくくなっていないか（NO）／Q3 毎ラウンド光って邪魔・うるさい（NO） |
| 撤退条件 | Q2／Q3 が YES、A1 の寸法差 ≠0、A4 の時刻差 ≠0、tests FAIL |
| ブランチ | `feat/d240-enemy-intent-v1`（Production `f8183eb` から・独立 worktree）。Hotfix 候補（§3 #2 トースト）は別番号・別ブランチで先に出してもよい（決定237 の前例） |

### 4-3. 反証（採用前に自分で潰した点）
- 「決定225 §15-2『エフェクト追加を品質と誤認しない』に反しないか」→ 追加するのは**情報の写し**（P2）であり、normal の 45% では何も足さない。pulse も増やさない
- 「HUD 監査 §4 案 D で『却下』では」→ 却下理由は (a) Lane2 と `BattleScreen.tsx` の衝突 (b) A（名札材質）を先に、の 2 点。(a) は決定232 出荷で消滅、(b) は決定235 で完了。同監査は「A の後に予告 1 行だけで別 Preflight」と明記
- 「トースト重なり（#2）の方が目立つのでは」→ 目立つが「欠陥修正」であり、直しても印象は「元に戻る」だけ。#1 は「新しく良くなる」。両方出すのが最善で、#2 は Hotfix 型（Human QA 省略可）として並走できる

---

## 5. 後続候補（分離）

### 5-1. asset なし・AI 判断で進められる（順に）
1. `.result-toast` の名札重なり Hotfix（§3 #2）— CSS 1〜3 宣言
2. 無効カードの二重減光（§3 #3）— CSS 1〜2 規則
3. HUD 残余（神力 pill・共鳴予告帯・上部バー）（§3 #4）— `hudPlate.css` 追記
4. 進化／神の一撃バナーの位置と絵文字（§3 #7）
5. 共鳴ゲージ「4」の目印（§3 #8）
6. 敵 HP 閾値の一回性反応（§3 #5）— 決定232 の時刻表に乗せる Preflight が要る
7. 結果画面の材質（§3 #6）— `GameOverOverlay` の tests を先に棚卸し
8. 中央閃光の座標化（§3 #12）— 決定239 の終点計算を流用

### 5-2. 新 asset／音源が要る（CEO 判断：生成サービス規約・権利＝§6-3 5）
- 敵 7 体の被弾／やられ差分（D 層）・画風統一（P 層）・OTOMO 高解像度（E 層）— 決定211／214 の台帳・identity 問題を先に
- Lane3 After-2（豪快な一撃の新原画）— **CEO 画像待ち・本監査は再提案しない**
- SE の固有音・BGM の層（O 層）— `SOUND_PREMIUM_PRE_AUDIT.md` §5 候補 E／G5

### 5-3. CEO 判断が要る（§6-3）
- BGM ダッキングの前提となる iOS 実機確認（R5）は CEO の iPhone でのみ可能 → 実施タイミング
- Ranking：dormant（P9）。再提案しない

---

## 6. Risks

| # | リスク | 程度 | 対策 |
|---|---|---|---|
| R1 | 気配のグローが `.enemy-avatar` の箱（透明部 7 割）に付き「四角い光」に見える | 中 | 既存 `enemy-avatar-charging` と同じ見え方＝前例あり。Preflight で `filter: drop-shadow`（輪郭追従）案と比較。ただし `impact-flash` の `filter` と衝突しないことを確認 |
| R2 | SVG glyph の幅が絵文字と違い、SP 360 の名札で予告が折り返す | 中 | A1 の寸法 Gate（決定228／230 の計測を再利用）。glyph は `1em` 固定・`vertical-align` で行高を変えない |
| R3 | 毎ラウンド光る＝疲労（決定224 §11 の Tier 侵食） | 中 | normal（45%）は無変化・animation 追加 0・pulse は charge のみ。Human QA Q3 |
| R4 | `formatEnemyIntent` の文言を変えるとログ・ミニ結果・tests が動く | 高→低 | **変えない**。表示用の新関数で分離 |
| R5 | 決定232 の反応と気配の box-shadow が同じ要素で競合（`box-shadow` の上書き） | 中 | 決定232 は `transform`／`animation`、charging は `box-shadow`＝既に共存中。気配も `box-shadow` 1 層で同じ規則に |
| R6 | 本監査の頻度は 1 戦の実測＋heuristic bot（勝率 100%）で、実プレイヤーと手順が違う | 低 | 予告の頻度は静的データ（49 行動）で確定。着弾頻度は Lane2 の比を参考値として使用 |
| R7 | 撮影は headless・DPR 1・音なし。音の残余（O 層）は耳で未確認 | 低 | 音は候補に挙げるが NEXT NOW にしない（決定225 と同じ扱い） |
| R8 | 監査中に `vite preview :4351` を起動 | — | 監査後に停止（LISTEN 0 を確認）。Firewall 変更 0・外部通信 0 |

---

## 付録：本監査の証跡
- `scripts/premium-reaudit/shots.mjs`（撮影・計測。runtime 非変更）
- `scripts/premium-reaudit/out/pc-*.png`／`sp-*.png`（各 23 枚）・`pc-log.json`／`sp-log.json`（寸法・絵文字・pill・書体・結果画面のセクション高さ）
- 主要フレーム：`pc-01-calm`・`pc-03-impact-1-t370`（トースト重なり・手札減光）・`pc-05-after-1-t900`（AP 0 の手札）・`pc-06-heavy-12`（強打の予告・wound）・`pc-08-godstrike-impact`（進化バナーが神に重なる）・`pc-12-victory-stage`（舞台上のトースト・特大の予告）・`pc-13-result`・`sp-01-calm`（空いた帯）・`sp-03-impact-1-t370`（三重表示）・`sp-10-round5-end`・`sp-13-result-full`（629px に収まる）・`pc-00-home`／`sp-00-home`
- runtime／`docs/DECISIONS.md`／他レーンの docs／worktree への変更 0
