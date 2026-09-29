# 決定225 — Battle Screen Premium Quality Audit

- 日付：2026-09-24
- 種別：**AUDIT ONLY／docs-only**（runtime／tests／assets／branch／画像・動画・SE 生成／H3／決定213／Ranking／Neon／secrets／commit／push／merge／deploy：すべて 0。Production 不変）
- 判断主体：AI チーム（CLAUDE.md §6-2）。実装 GO は CEO 判断
- 役割：Commercial Game Visual Director ＋ UX Auditor ＋ Technical Auditor ＋ Red-Team Reviewer
- 問い：**「人気商用カードゲームと並べたとき、SEVEN GODS の戦闘画面の何が安っぽく見えるか」「次に 1 つ直すなら、どこが最も体感品質を上げるか」**
- 評価軸：派手さではなく **「プレイヤーの判断と結果が、商用品質で伝わっているか」**（North Star：解く／組む・うまくなる）

---

## 0. 結論（先に）

| # | 項目 | 結論 |
|---|---|---|
| 17 | **TOP IMPROVEMENT TARGET（1 つ）** | **「撃破 → 勝利」のクライマックス**（最後の一撃 → 崩壊 → 「撃破」 → 結果画面）。今は「敵が灰色になって沈み、72px の文字が出て、黒い帳票モーダルに切り替わる」。北極星の「答えが鮮やかに決まったときがうれしい」の**最終地点が、画面全体で最も弱い**。1 戦に必ず 1 回、Production Core に触れず、既存 asset だけで Before/After と Human QA ができる |
| 18 | Narrow Pilot | **Victory Reveal v1**：崩壊は現状のまま → 「撃破」の拍を、神のキービジュアル（既存 `keyvisual-hero`）が神色の帯とともに立ち上がる **勝利の舞台** に置き換え → 明朝「勝利」＋神名 × 敵名 → スコアの count-up → 既存の結果内容がそのまま下から入る。tap でスキップ。reduced-motion は静止。新規 asset 0・`src/core` 0 |
| 19 | Verdict | **GO** |
| 20 | NEXT NOW | **CEO が Pilot 対象「撃破 → 勝利」を承認したら、実装前 Preflight（決定223 と同じ形式：実コードの二重演出・timing・tests・SP 高さの確認）を行う** |
| — | Web ゲームに見せている最大の要因（3 つ・順位なし） | ① **HUD が「ガラス板のパネル」**（`.panel`：ヘアライン＋blur＋グラデ、system-ui フォント、絵文字アイコン、pill ゲージ、pill ボタン）② **通常プレイの L1 が「押したら数字が出る」で終わる**（ダメージ効果 32 件中 24 件が L1＝hit stop 0・16px・2px の揺れ、カードは手札の位置で縮んで消え、閃光は画面中央の固定 PNG）③ **キャラ層が 4 系統の画風**（神＝線画 640px／敵＝ドット 4 体＋厚塗り 3 体／OTOMO＝光沢スプライト 320px／カード＝セル塗り chibi）で接地影なし |
| — | 決定224 の後に新しく目立った gap | ⚡と READY が premium になった分、**通常カードの CSS 枠・中央の汎用閃光・L1 の無反応**、および **撃破後の帳票**が相対的に弱く見える。手札は「金の物体 1 枚＋CSS ボタン 4 枚」の 2 言語 |
| — | CEO 既知問題「カードを見るため下へ移動すると着弾が画面外」 | **PC・SP とも解消済み**（決定164 の一画面固定 `battle-viewport`）。残るのは①SP で手札 5 枚目以降が横スクロール外 ②PC で手札が 9〜10 枚に増えて 2 段に折り返すと、アリーナが 1fr で潰れ敵の立ち絵が約 100px になる（`handLimit: 10`・実測フレーム `pc-saika-F-cutin`） |

---

## 1. Production baseline

| 項目 | 値 |
|---|---|
| master／origin/master | **`862367f`**（一致・想定どおり） |
| Production bundle | `index-r-PY8CVw.js`／`index-CRMbnJyl.css`（RC clean build と md5 一致・決定224 §31） |
| main worktree | `feat/d224-premium-payoff-pilot`（43c10a4＋未 commit の決定224 差分＝Production と同内容）。**runtime 差分は公開済み内容と同一のため監査に支障なし**。コード参照は Production と同一の RC worktree `SevenGodsGame-d224-rc`（862367f）で行った |
| 決定213 | Production に含まれない（決定224 §31-1 で確認済み） |
| Premium Combat Language（決定224） | CALM → SETUP → READY（豪快な一撃のみ）→ PLAY → IMPACT → ⚡PAYOFF（34px 金／撃破 52px 金）→ CALM。Human QA 5/5 |

## 2. Audit methodology

- **実画面**：Production URL を Playwright（Chromium・DPR 2）で起動。PC 1508×660／SP 390×844。組み合わせ：大耀×蒼海の龍神（PC・SP）、恵比寿×業斧の鬼将（PC）、才華×銀甲の機工師（PC・必殺ビーム）、寿楽×双牙の魔獣（SP・連撃）。seed は `?seed=d225-<label>` で固定
- **フレーム**：CSS アニメーションの `currentTime` が指定値に達した瞬間に `document.getAnimations().pause()` して撮影（burst banner・God Strike の突き・崩壊・共鳴満タン・敵カットイン後の着弾・手札 10 枚時のレイアウトを取得）。**タイマーで DOM が消える 300ms 未満の瞬間（cast-flash・L1 の数字）は撮影遅延で取り切れないため、コードの定数で評価した**
- **等倍切り出し**：敵・神・OTOMO・カード・HUD プレート・ボタンを 100%（DPR 2）で比較
- **実コード**：`battle.css`（6,300 行）・`press.css`・`CardView`・`EnemyPanel`・`PlayerPanel`・`GodOtomoPanel`・`BattleScreen`・`GameOverOverlay`・`combatTimeline`・`enemyVfxTiming`・`feelTier`・`sound.ts`・`bgm.ts`・`useMobileAutoFocus`・`cards/*`・`enemies.ts`・`gods.ts`・`otomo.ts`
- **過去監査**：`PHASE6_COMMERCIAL_BENCHMARK_V2`（22 軸・到達率 69%）、`PHASE6D_VISUAL_DIRECTION_AUDIT`（構図・画風）、決定199／200（押下）、決定223／224
- **音**：コードで到達できる範囲のみ。音量・音色の耳での確認は**未実施＝確認不能**と明記する

## 3. PC findings（1508×660）

| # | 発見 | 事実（実画面・実コード） |
|---|---|---|
| PC-1 | 第一印象は「良い背景の上に、ガラス板の HUD が 3 枚乗っている」 | 敵／神／共鳴の 3 プレート（`.panel`：`border 1px #ffffff1a`・`backdrop-filter: blur(10px)`・グラデ・角丸 14px）がアリーナ上部 30% を覆い、月・社殿の見せ場を隠す。`battle.css:413` |
| PC-2 | キャラが小さく、置かれている | 敵 240×260・神 200×240（アリーナ幅 1240 の 16〜19%・6-D と同じ）。接地影なし（`.enemy-avatar`／`.player-avatar` は発光 `box-shadow 0 0 40px 8px` のみ・`battle.css:1121/1342`）。3 体が横一列 |
| PC-3 | 手札の左右に大きな空き | 手札は中央寄せ・5〜6 枚で幅の 40%。左右は星の散る暗い余白 |
| PC-4 | 手札が 9〜10 枚に増えると 2 段に折り返し、アリーナが潰れる | `.battle-dock-row .hand { flex-wrap: wrap }`（4794）＋ `.battle { grid-template-rows: auto minmax(0,1fr) auto }`（4867）。実測フレーム `pc-saika-F-cutin`：アリーナ高が約 430 → 約 190px、敵立ち絵は `min-height: 104px` まで縮む。`RULES.deck.handLimit = 10` |
| PC-5 | 結果トースト（「⚔ 敵に40ダメージ」）が神の名札のタイトルに重なる | `result-toast` はアリーナ上端中央固定。神プレートの「大耀」「恵比寿」が隠れる（`pc-ebisu-oni-20-callout`） |
| PC-6 | 進化バナーの文字が神の立ち絵に重なる | 「🌱 OTOMOが受肉態に成長した！」がアリーナ中央＝神の上（`pc-saika-karakuri-20-strikehit`） |
| PC-7 | 神の一撃は強い（例外） | 暗転→集中線→神色の帯→円形ポートレート→明朝の技名（6-D）。斜めの光の帯・52px・画面揺れ。商用水準 |
| PC-8 | 勝利は帳票 | 「撃破」文字 850ms → `game-over-card`（黒 `#0b0d17`・1px 枠・箇条書き 3 行・110px の神サムネ・スコア・ボタン）。神の絵が 110px に縮む |

## 4. SP findings（390×844）

| # | 発見 | 事実 |
|---|---|---|
| SP-1 | 一画面固定は成立。着弾が画面外になる問題は**解消** | `body.battle-viewport #root { height: 100dvh; overflow: hidden }`・全フレームで手札と敵が同時に見える |
| SP-2 | **共鳴パネルが 1 文字幅の縦書きに潰れる** | `body.battle-viewport .battle-main { grid-template-columns: 1.18fr 1fr 0.78fr }`（4906）。第 3 列 ≈ 97px。「あと7で神技発動」が 4 行に折れ、バフが付くと「共鳴」が縦 1 文字ずつになる（`sp-taiyo-F-strike`） |
| SP-3 | **バフが 3〜4 個付くと神プレートが縦に伸び、舞台を覆う** | `.player-plate-status` のバッジが縦積み。「攻撃力 +30（1）」×3 で神プレートが柱になる（`sp-taiyo-F-strike`）。敵側も「攻撃力 -50」×4 で敵プレートが舞台の 40% を覆う（`sp-juraku-F-beamhit`） |
| SP-4 | 神が小さい | 龍神の絵の占有が大きく、神は約 100px（設計は敵の 0.82 だが、絵の余白の差で「敵 3：神 1」に見える） |
| SP-5 | 被弾リングが神ではなく舞台中央に出る | 必殺ビームの `impact-ring-beam`（150px）が `player-hit-layer` の中央＝アリーナ中央の空中に描かれる（`sp-juraku-F-beamhit`） |
| SP-6 | 手札 5 枚目以降は横スクロール外（既知 Known Risk） | 4 枚可視・`overflow-x: auto`（5495） |
| SP-7 | 結果画面はスクロールする長い帳票 | 「勝利」→ 3 行 → サムネ → スコア → 自己ベスト → 初撃破 → ボタン → 内訳 → 神技評価（`sp-taiyo-ryujin-30-result`） |
| SP-8 | 吹き出し（敵の掛け声）が舞台の上に常設 | `.enemy-speech-bubble`（1012）が敵プレート直下に固定表示 |

## 5. Layer A〜P findings

### A. OVERALL COMPOSITION
- 重心：上（HUD 3 枚）と下（手札）に情報が集まり、中央の舞台は「キャラ 3 体が横一列に置かれた帯」。視線誘導は色（赤 HP・金ボタン）頼み
- 上下の密度：PC は上 30% が板、下 30% が手札、中 40% が舞台。SP はバフ次第で上半分が板になる（SP-3）
- カードと戦場の分断：手札は舞台の外（暗い星空）に浮き、出したカードは手札の位置で消える（H 参照）。**カードが戦場に入らない**
- スクロール依存：なし（SP-1）。残余：PC-4・SP-6

### B. CARD QUALITY
| 観点 | 事実 | 判定 |
|---|---|---|
| 材質・枠 | `<button>` に `border: 2px solid <タイプ色>`・角丸 10px・inline `box-shadow 0 6px 14px -9px`。枠は CSS 線（`CardView.tsx`・`battle.css:2334`） | UI ボタン（決定223 G-B のまま。READY だけ例外） |
| イラスト | 512×768 WebP・chibi セル塗り・高品質。面積の約 45% が文字帯 | 絵は良い。見せ方が惜しい |
| 文字 | 名前 13px・効果文 11px（SP 9〜9.5px）・system-ui | 読めるが小さい。SP 9px は Mobile UX 監査で既知 |
| コスト | 26px の円・数字 13px・タイプ色 | 見える |
| 条件（⚡） | 成立で金文字（全カード）＋豪快な一撃だけ material | 2 言語 |
| elevation／hover／press | hover：`translateY(-8px) scale(1.04)`＋光沢（PC のみ）。press：1px 沈み 60ms（決定200）。disabled：`filter: grayscale(.35) brightness(.72)`＋神力不足は inline `opacity .45`（**二重に暗く**、手札の半分が「壊れた UI」に見える瞬間がある：`pc-taiyo-ryujin-08-play-0300`） | 押下は成立。無効表示が強すぎる |
| play transition | `card-play` 0.28s：scale 1.08→0.6・上 40px・フェード＝**手札の位置で消滅** | 戦場へ移動しない |
| 手札レイアウト | PC 折返し／SP 横スクロール。選択状態（tap → 確認）なし。単 tap で即使用 | SP の誤タップは press 1px だけが手掛かり |
| READY vs 通常 | READY：神色の縁・面取り・3px lift・接地影・面の光。通常：CSS 線 | **READY が premium になった分、通常カードの「線の枠」が目立つ**。安っぽく「なった」のではなく、元の枠がそのまま見えている |

### C. GOD PRESENCE
- サイズ 200×240（PC）／約 100px（SP）。解像感は 640px WebP で十分（等倍切り出しで線が締まっている）
- lighting：背後に緑／金の楕円グロー（`.battle-arena-glow` のぼかし blob＋`box-shadow`）。**光源方向がない**（絵は左上光、グローは下から）
- depth：接地影なし・足元が石畳の消失点と合わない（6-D）
- pose：idle／攻撃／神の一撃／被弾がすべて同じ 1 枚。動きは translate（3.4s 呼吸・18px 突き・24px 突き）
- God Strike への接続：カットインの円形ポートレート（keyvisual）と、舞台の立ち絵（front_640）が**別の絵**。カットイン後に舞台へ戻ると「同じ神に戻った」感が薄い
- UI との関係：神の名札がプレートとして頭上に載る。結果トースト（PC-5）が名札を隠す
- **判定：「置かれた立ち絵」に見える。原因は解像度ではなく、接地・光源・ポーズ差分・カットインとの絵の不連続**

### D. ENEMY PRESENCE
- サイズ 240×260（PC）／SP は幅の 60% を占める体もある（龍神）
- 画風：`art_hq.webp`（鬼将・魔獣・龍神・怨霊）はドット風、`art.webp`（堕天使・機工師・道化）は厚塗り。**敵 7 体の中でも 2 系統**（等倍：鬼将は 4px 単位のドットが見える／機工師は塗り）
- hit reaction：L1 kb 2px・shake 0.28s・flash 0.25s／L2 5px・0.4s／L3・L4 強化＋画面揺れ（L4）。**32 件のダメージ効果のうち 24 件が L1**（`cards/*` の `amount <10`）＝大半のヒットは 2px の揺れと 16px の数字
- large hit：L3／L4 の hit stop（45／60ms）・数字 30／40px・slash は効いている
- HP threshold：50%／25% で `.enemy-wound`（赤 30% の放射）＝**ほぼ見えない**（`pc-ebisu-oni-20-wound`：450/1000 で差が分からない）
- defeat：フラッシュ→脱色→沈み＋blur 520ms＋白リング（`enemy-defeat`）。**敵の「やられ絵」はなく、同じ絵が灰色になる**
- battlefield integration：接地影なし・楕円グローのみ
- **CEO 既知「HP ゲージを減らす作業」**：6-A で着弾→HP の順序は直った。残る原因は①HP バー（赤い pill・数値中央）が敵の反応より視覚的に大きく速い ②L1 の反応が小さい ③敵の絵が変わらない、の 3 点

### E. OTOMO PRESENCE
- 320px の光沢スプライトを約 50〜60px で表示（PC）。等倍切り出しではぼやけ、透過縁の発光焼き込みが見える
- 神と画風が違う（神＝線画セル／OTOMO＝3D 風グロス）。舞台の右端に単独で浮く
- 反応：神の一撃時のポップ 0.5s・進化 1.2s のみ。通常プレイ・被弾には無反応
- **判定：浮いている。ただし決定214 の結論（OTOMO の戦略的役割が未確定）どおり、見た目だけ先に直す対象ではない**

### F. ENEMY INTENT
- 名札内に「⚔ 40」「💥 強打 110」「🔥 主砲・神滅甲 240」「⚡ 砲身に魔力を溜めている…」。tier で色・枠・脈動（最上位のみ）
- 一目で読める（6-B の名札化・Enemy Intent 80 相当）。数値 ×10 表示、連撃は「70+60」「70×2」
- 空間的関連：**敵の絵ではなく板の中**。敵の構えは変わらない
- アイコン：絵文字（⚔🔥💥⚡）＝端末依存の字形（headless では ⚔ が別字形で描かれた）。L8 の「絵文字 → glyph」は未着手
- **判定：戦術情報としては十分。Premium 感を落としているのは絵文字と「板の中の文字」であって、情報設計ではない**

### G. HUD
| 要素 | 事実 | 「Web アプリのパネル」に見える箇所 |
|---|---|---|
| 上部バー | ラウンド／神力（青い細バー）／スコア。`.battle-topbar`：ヘアライン＋blur＋グラデ | ○（ダッシュボードのヘッダー） |
| 名札 | `.panel`（同上）。HP は `.hp-bar` 18px pill・数値中央 | ○ |
| 共鳴 | 16px pill ゲージ・「あと N で神技発動」・10px の予告 2 行 | ○ |
| 託宣 | 3 つの横長ボタン（1px 枠・角丸 8px） | ○ |
| ラウンドを終える／ログ | 金枠 pill ボタン・小さな灰ボタン | ○ |
| トースト／ミニ結果 | 「⚔ 敵に40ダメージ」pill・「-40 DAMAGE! 敵 HP 420→340」帯 | ○（通知） |
| フォント | 全体 `system-ui`（`index.css:3`）。明朝はカットインだけ（`battle.css:1738`） | ◎ 最大要因 |
| 角丸・余白 | 8／10／12／14px の角丸、10〜14px の padding が全要素に均一 | ○（ブラウザの間隔） |

### H. NORMAL CARD PLAY（フレーム単位・コード定数）
| 時刻 | 何が起きるか | 見え方 |
|---|---|---|
| 0 | tap：`:active` 1px 沈み 60ms・`card_play` SE（音量 0.3×0.85） | 軽い |
| 0〜280 | `card-play`：手札の位置で scale 1.08→0.6・上へ 40px・フェード。同時に `cast-flash`（`position: fixed`・画面中央）に**タイプ別の静止 PNG 320×480**＋アイコンが 0.35〜0.5s。神は 220ms の構え（-7px） | **カードは戦場へ行かない。閃光は神からも敵からも離れた「画面の真ん中」** |
| 280 | commit（engine） | — |
| 370 | 神の突き 18px（`god-strike` 0.34s の 26%）・着弾。L1：hit stop 0・敵 kb 2px・shake 0.28s・flash・数字 16px・`hit_l1` 0.45 | **L1 は「押したら数字が出た」**。L2 以上で初めて重さが付く |
| 460〜 | 表示 HP が減る（+90 lag・ゴースト 340ms） | HP バーの動きが最も大きな視覚変化 |
| 〜1,270 | 数字が消える。トースト・ミニ結果が結果を文章で再掲 | 文章の反復 |
- **決定224 以外の通常カードは「押した瞬間に UI 処理として終わって見える」か → L1（大半）は YES。** 原因は①カードの消滅位置 ②閃光の位置 ③L1 の無 hit stop・16px ④文章トースト、の 4 つ。**L2 以上は NO**（hit stop・22〜40px・slash が効く）

### I. IMPACT / HIT
| 段階 | hit stop | 数字 | 敵 | 画面 | 音量 |
|---|---|---|---|---|---|
| L1（<100） | 0 | 16px | kb 2px・0.28s | — | 0.45 |
| L2（100〜） | 20 | 22px | kb 5px・0.4s・slash | — | 0.6 |
| L3（150〜） | 45 | 30px | 強 | — | 0.8 |
| L4（250〜） | 60 | 40px | 巨 | 揺れ 3〜5px | 1.0 |
| 神の一撃 | 80 | 52px | 巨 | 揺れ・バナー | 1.0 |
| 最後の一撃 | 90 | 52px | 崩壊 | 揺れ・「撃破」 | 1.0＋sting |
- 階層は**数値上は成立**。体感上の問題は「L1 と L2 の差が小さく、L1 が最多」であること。anticipation（構え 220ms）は damage カードのみ・7px＝小さい。攻撃の軌道はない（神が 18px 前に出るだけ）。VFX は静止 PNG の閃光と CSS の斬撃線。SFX は合成トーン（O 参照）

### J. ⚡ PAYOFF（決定224）
- READY（神色の縁・lift・sweep）・cast の金の輪・金リング・34px 金・撃破 52px 金・`reward`×1.5。**画面内で最も「設計された」瞬間**
- 周囲との差：①通常カードの CSS 枠（B）②通常プレイの中央閃光と L1（H）③撃破後の帳票（M）が、⚡の後で相対的に弱く見える。**新しく壊れたものはない。元から弱かったものが、基準ができたことで見えるようになった**

### K. RESONANCE
- buildup：`resonance_gain` チャイム（0.3）・ゲージ 16px・5／6 で発光段階（`getResonanceStage`）・7/7 で 0.9s の満タン発光→カットイン
- **閾値 4 の目印：なし**（決定223 で指摘・`GodOtomoPanel.tsx` の段階は 5／6 のみ）。charged 型の READY が「あと 1」だと分かるのは READY 点火の後だけ
- state change：7/7 → 暗転＋神色の帯＋円形ポートレート＋明朝（6-D）。**READY／⚡より明確に上位**（全画面・暗転・入力ブロック）
- SP：共鳴パネルが潰れる（SP-2）ため、**SP では buildup が読めない**

### L. GOD STRIKE
- 到達反応 200 → カットイン 900 → handoff 200 → 溜め・突き 600 → 着弾（52px・stop 80・揺れ）→ バナー 900 → 進化バナー。合計約 3.4s・スキップ不可
- 最高 Tier としての差：**十分**（唯一の全画面暗転・唯一の明朝・唯一の画面揺れ＋52px）
- 弱点：①突きは静止絵の 24px 移動 ②バナー「✨ 大耀の一撃！」は system-ui＋絵文字（カットインの明朝と不一致）③進化バナーが神に重なる（PC-6）④SP でバナーが龍神の絵に重なる（`sp-taiyo-F-strike`）⑤カットインの絵（keyvisual）と舞台の絵（front）が別

### M. DEFEAT / VICTORY（分解）
| 段階 | 今 | 弱い原因 |
|---|---|---|
| 最後の一撃 | 常に L4・stop 90・52px | 良い |
| 崩壊 | 170ms 後に `enemy-defeat` 520ms：brightness 2.8→脱色→沈み 16px→blur 2px→消滅。白リング 180px | **敵の絵が変わらない**（やられ絵なし）。沈む距離 16px は「倒れた」より「消えた」 |
| 「撃破」 | `victory-beat`：全画面に薄い金の放射＋72px の「撃破」850ms | **文字だけ**。神は無反応（突きの後は idle に戻る） |
| 結果 | `GameOverOverlay`：黒モーダル・「勝利」26px・「神域制覇」・箇条書き 3 行・110px サムネ・スコア（静的）・自己ベスト・初撃破・ボタン・内訳・神技評価 | **帳票**。神の絵が 110px に縮む。スコアは count-up しない。段階表示はあるが tap でスキップ不可（決定200 §14 で見送り） |
| 報酬 | 別オーバーレイ（3 枚 pop-in・`reward` SE） | 儀式化されていない（Benchmark v2 Reward 45） |
- 音：`victory_sting`（0.72）＋ジングル。合成音
- **「倒した！」が弱い理由（1 行）：クライマックスの絵が「灰色になる敵」と「文字」で、勝った神が主役になる瞬間がない**

### N. BACKGROUND / DEPTH
- 7 ステージ 1600×900 は高品質。静止で良い（決定219〜222 の結論を保持）
- depth separation：なし（キャラと背景の縮尺・ぼかし・明度差が同じ層）。`.battle-arena-glow` の 4 つのぼかし blob（緑・紫・金・桃）が舞台に汎用の色を足している
- contrast／focal light：神の後ろの楕円グローだけ。舞台の光源（月・灯籠）と無関係
- grounding：接地影なし（6-D で CSS のみの接地は「少し」と判定済み）
- **判定：静止でも高品質に見える素材はある。足りないのは「キャラが舞台に立っている」ことであり、背景を動かすことではない**

### O. SOUND（コードで確認できる範囲）
| 場面 | 音 | 音量係数 | 確認 |
|---|---|---|---|
| card select／hover | **なし** | — | コード |
| card commit | `card_play`（noise 45ms＋osc） | feedback 0.3 | コード |
| normal hit | `hit_l1`／`hit_l2` | 0.45／0.6 | コード |
| big hit | `hit_l3`／`hit_l4` | 0.8／1.0 | コード |
| READY | **なし**（設計どおり） | — | コード |
| ⚡ | `reward`×1.5 | 0.7 | コード |
| Resonance | `resonance_gain`（0.3）／7-7 `burst_ready`（0.65） | | コード |
| God Strike | `hit_l4`（1.0） | | コード |
| defeat／victory | `defeat_sting`／`victory_sting`（0.72）＋ジングル | | コード |
| BGM | `battle.webm` 単一ループ・音量固定・状況で変化しない | | コード |
- 全 20 音は `gen-se.mjs` の数式合成（Benchmark v2：Sound 48／100「音色 2 系統・固有音 0」）。**音量バランス・音色の質は耳で確認していない＝確認不能**。推測はしない

### P. ART CONSISTENCY
| 層 | 解像度・形式 | 線・塗り | 光 | 色 | 状態 |
|---|---|---|---|---|---|
| 神 | 640px WebP（原本 1600） | 線画セル・白フチ | 左上・単光源 | 高彩度 | 一貫 |
| 敵 | 768（ドット 4 体）／512（厚塗り 3 体） | **2 系統** | まちまち | 高コントラスト | **不一致**（6-D 既知・未解決） |
| OTOMO | 320px | 3D 風グロス・発光焼き込み | 自発光 | 単色 | **不一致** |
| カード | 512×768 | chibi セル（`CARD_ART_STYLE_GUIDE`） | 単光源 | 高彩度 | 概ね一貫（2 世代・既知） |
| 背景 | 1600×900 | 厚塗り風景 | 月・灯籠 | 藍・紫・橙 | 一貫 |
| UI | CSS | フラット・ヘアライン | なし | 藍黒＋金 | 一貫（ただし Web） |
- **過去監査の指摘は現在も残っている**（敵の 2 系統・OTOMO の 320px・接地なし）。決定224 はカード 1 枚の枠だけを変えた

## 6. Web-game feel causes（実コードの原因）

| # | 見え方 | 原因（コード） |
|---|---|---|
| W1 | CSS button 感 | `.card-view` は `<button>`＋`border: 2px solid`（2334）。`.end-round-button`／`.divination-choice`／`.battle-log-toggle` は 1px 枠＋角丸＋グラデの pill |
| W2 | panel 感 | `.panel`／`.battle-topbar`／`.divination-panel`：ヘアライン `#ffffff1a`・`backdrop-filter: blur(8〜10px)`・`linear-gradient(165deg, #14152caa, #0b0d17cc)`（413・67・2073） |
| W3 | browser-like spacing | 角丸 8〜14px・padding 10〜14px・gap 8〜12px が全要素で均一。階層による差がない |
| W4 | flat card | 枠が線、影が `0 6px 14px -9px`（≈0）。面取り・材質は READY のみ |
| W5 | generic border／shadow | `#ffffff14〜22` のヘアラインと `#00000055〜cc` のドロップシャドウが全パネル共通 |
| W6 | text-heavy feedback | `result-toast`（「⚔ 敵に40ダメージ」）＋`BattleMiniResult`（「-40 DAMAGE! 敵 HP 420→340」）＋callout＋ログ＝同じ結果を 3〜4 回文章で出す。結果画面は箇条書き |
| W7 | weak spatial connection | `cast-flash` は `position: fixed; inset: 0; place-items: center`（185）＝カードにも神にも敵にも紐づかない。`card-play` は手札の座標で終わる（2457） |
| W8 | instant disappearance | `card-play` 0.28s で scale 0.6・opacity 0（2457）。カットイン後の handoff は React 再描画（≈200ms）で要素が入れ替わる |
| W9 | lack of physical response | L1 の hit stop 0・kb 2px（`HIT_STOP_MS[1] = 0`・`.react-l1 --kb: 2px`）。神は突き以外で姿勢を変えない |
| W10 | system font | `index.css:3` `font-family: system-ui, 'Segoe UI', …`。明朝はカットインのみ |
| W11 | emoji glyph | 予告・カード種別・バナーに ⚔🔥💥⚡✨🌱（`cardStyle.ts`・`BattleScreen`）。端末で字形が変わる |
| W12 | floating characters | 接地影・床光なし（1121・1342）。`.battle-arena-glow` の blob が汎用の色 |

## 7. Interaction Law violations

| 法則 | 判定 | 根拠 |
|---|---|---|
| 1 pressable things sink | ○ | `press.css`（決定200）：手札 1px・決定ボタンは強め |
| 2 stronger hits feel heavier in time | △ | tier 設計は正しいが、**最多の L1 に時間の重さが 0**。L1→L2 の差（0→20ms・16→22px）が小さい |
| 3 important success responds | ○（⚡・神の一撃・撃破）／△（ブロック成功＝「軽減N」16px＋`block` 音のみ。回復＝pulse＋音） | |
| 4 anticipation → tension → reveal | ○ 神の一撃／△ 撃破（崩壊→文字→帳票。reveal が帳票）／△ 通常プレイ（構え 7px） | |
| 5 repeats are short・skip | **✗** | 神の一撃 3.4s・敵必殺 1.05〜1.6s・撃破〜結果 2.4s・BossEntrance 1.5s が**すべてスキップ不可**（決定200 §14 で見送り・`reward-skip` のみ） |
| 6 presentation does not change outcome | ○ | 表示層は `planBatch` 起点・engine 不変（決定162 以降の設計） |
| 7 frequency × intensity | ○ | 毎手は軽く、⚡・神の一撃・撃破が重い。設計は正しい |

## 8. Art consistency findings
§5-P のとおり。要点：**敵 7 体が 2 画風**（ドット／厚塗り）、**OTOMO が 320px の別質感**、**神・敵・OTOMO とも接地なし**。カード・背景・神は個々には商用水準。

## 9. Sound findings
§5-O のとおり。要点：**音の階層は数値上は設計されている**（feedback 0.3 → impact 0.45〜1.0 → bigMoment 0.9）が、全音が数式合成・固有音 0・BGM 単一ループ。**耳での確認は未実施（確認不能）**。SE 生成は本監査の禁止事項のため、候補には挙げるが Pilot にしない。

## 10. 決定224 の後に新しく目立った gap
1. 手札の 2 言語（READY の material 1 枚 vs CSS 枠 4 枚）
2. cast-flash：⚡は金の輪が付くが、通常は静止 PNG の汎用閃光のまま。**閃光の位置（画面中央）がどちらも神と敵から離れている**
3. 撃破⚡が 52px 金で決まるようになった分、その直後の「灰色の敵 → 文字 → 帳票」の落差が大きい
4. SP：READY のカードが横スクロール外（Known Risk）に加え、バフが付くと共鳴・神プレートが縦に伸びて舞台を覆う（SP-2／SP-3）。READY を確認する手札と、その結果を見る舞台の両方が狭くなる

## 11. Gap classification

| ID | 問題 | Impact | Frequency | Impl Risk | Core Risk | Art Dep | Mobile Risk |
|---|---|---|---|---|---|---|---|
| G1 | 撃破→勝利が「灰色の敵・文字・帳票」 | **HIGH** | HIGH（1 戦 1 回・毎戦） | LOW〜MED | NONE | EXISTING | LOW |
| G2 | 通常プレイ L1 が UI 処理に見える（消滅位置・中央閃光・無 hit stop） | HIGH | **HIGH**（毎手・約 54%） | MED（毎手＝テンポ・階層） | NONE | NONE | MED（座標） |
| G3 | HUD がガラス板・system-ui・絵文字・pill | HIGH（第一印象） | 常時 | **HIGH**（6-B の計測・全画面） | NONE | NONE（フォントは要検討） | HIGH（SP 名札） |
| G4 | キャラ層の画風不一致（敵 2 系統・OTOMO 320）＋接地なし | HIGH（第一印象） | 常時 | HIGH | NONE | **NEW ASSET** | MED |
| G5 | SP：バフでプレートが縦に伸び共鳴が潰れる | MED〜HIGH | MED（バフ 2 個以上のとき） | LOW〜MED | NONE | NONE | —（SP 専用） |
| G6 | PC：手札 9〜10 枚でアリーナ圧縮 | MED | LOW（手札 9 枚以上） | LOW | NONE | NONE | — |
| G7 | 通常カードの CSS 枠（READY との 2 言語） | MED | 常時 | LOW〜MED | NONE | NONE | LOW |
| G8 | 共鳴ゲージに 4 の目印がない | MED | 常時 | LOW | NONE | NONE | LOW |
| G9 | トースト／進化バナーが名札・神に重なる | MED | MED | LOW | NONE | NONE | MED |
| G10 | 演出のスキップ不可（Law 5） | MED | MED（2 戦目以降に効く） | MED（状態機械） | NONE | NONE | LOW |
| G11 | 敵の HP 閾値反応が見えない（wound 30%） | LOW〜MED | MED | LOW | NONE | NONE | LOW |
| G12 | 音：合成音・固有音 0・BGM 単一 | HIGH（体感）／確認不能 | 常時 | MED | NONE | **NEW ASSET（音）** | LOW |
| G13 | 被弾リングが神ではなく舞台中央（SP） | LOW | LOW（必殺のみ） | LOW | NONE | NONE | — |
| G14 | 無効カードの二重減光 | LOW | HIGH | LOW | NONE | NONE | LOW |

## 12. Commercial impact assessment

「これを直した 10 秒動画を初見が見て、今より明確に商用ゲームに見えるか」×「遊んだとき『解く』を邪魔せず強化するか」

| ID | 10 秒動画 | 「解く」 | 判定 |
|---|---|---|---|
| G1 撃破→勝利 | **◎**（勝利の瞬間は最も共有される 10 秒。神が主役になる） | ○（戦闘後。判断を隠さない。P5「重要な結果＝予告→タメ→開示」に直結） | **最優先** |
| G2 通常プレイ | ◎（動画の全秒に効く） | △（毎手の motion はテンポと階層を崩す危険。Pocket の苦情。⚡より弱く保つ制約が要る） | 次点。設計に時間が要る |
| G3 HUD | ○ | ○ | 大規模。1 Pilot にならない |
| G4 キャラ層 | ◎ | ○ | 新 asset・identity リスク（決定211） |
| G5 SP プレート | △（動画では目立たない） | **◎**（SP で共鳴・バフが読めないのは「解く」の情報欠損） | **修正候補として別枠（bug 寄り）。演出ではない** |
| G12 音 | ◎（耳で分かる） | ○ | 音源生成が要る＝本監査では禁止領域。次の候補 |

**両方を満たす最上位は G1。** G5 は演出ではなく可読性の欠損なので、Pilot とは別に「修正」として扱うべき（本監査では直さない）。

## 13. Technical cause mapping（TOP ターゲットの原因 → 場所）

| 症状 | 場所 |
|---|---|
| 敵が灰色になって沈むだけ | `battle.css` `@keyframes enemy-defeat`（brightness→saturate 0→translate 16px→blur）・`EnemyPanel.tsx` `.enemy-collapse` |
| 「撃破」が文字だけ | `BattleScreen.tsx:573` `.victory-beat`（span 72px・放射グラデ）・`battle.css` `victory-beat-pop／-bg` |
| 神が勝利で主役にならない | `PlayerPanel.tsx` は idle に戻る。`GameOverOverlay.tsx` の神は 110px サムネ（`game-over-portrait`） |
| 帳票 | `GameOverOverlay.tsx`（490 行・箇条書き・スコア静的）・`.game-over-card`（黒・1px 枠） |
| スキップ不可 | `useCombatPresentation.ts` `planVictory`（collapse 520 → beat 850 → reward）・タイマー固定 |
| 時刻の真実 | `enemyVfxTiming.ts` `DEFEAT_*`／`VICTORY_BEAT_MS`。`planVictory` が唯一の時刻表 |

## 14. Known risks（保持・未修正）
- 神の一撃直後の⚡数字の隣接
- SP で READY カードが横スクロール外
- 共鳴 7 直後の「ラウンドを終える」短い入力窓（既存 Production 挙動・決定224 対象外）
- 未使用の金の斬撃線 CSS（Known Cleanup）
- 本監査で追加：SP-2／SP-3（プレートの縦伸び・共鳴の潰れ）、PC-4（手札 10 枚でアリーナ圧縮）、SP-5（被弾リングの位置）。**いずれも本監査では直していない**

## 15. What NOT to do
1. 決定224 の成功を理由に**全カード READY 化**しない（READY は「成立した 1 枚」を示す情報。全部が光ると情報が消える）
2. エフェクトの追加を品質と誤認しない（G2 に毎手の motion を足す前に、L1 の「重さ 0」と閃光の位置という**引き算**を先に検討する）
3. 背景を動かす議論に戻らない（決定219〜222 で 4 方式 NO-GO）。H3 再検討禁止
4. 敵 7 体・OTOMO 7 体の再生成へ逃げない（G4 は新 asset・identity・台帳の問題。別監査）
5. HUD の全面リデザイン（G3）を 1 Pilot にしない。フォント変更は 6-B のレイアウト計測を全部やり直す
6. SP の可読性（G5）を演出 Pilot に混ぜない。bug 修正として別に扱う
7. 「解く」情報（予告・HP・共鳴・手札）を演出で隠さない。勝利演出は**戦闘後**にだけ置く
8. God Strike より強い通常演出を作らない。撃破は God Strike と同格の Tier 5 として扱う（既に L4・52px）

## 16. docs integration recommendation（docs-only・runtime と混ぜない）

現状：`feat/otomo-stance-pilot` 系の 11 commit のうち **docs-only は 5**（`1a5dae1`・`e3f69f4`・`ec70ebd`・`88cd077`・`43c10a4`）、runtime を含むものが 4（決定213 の `c6ca3a7`・`efdfdf4`・`6b8f09e` と `748ea63`）、scripts harness を含むものが 2（`f4d1745`・`748ea63`）。加えて未 commit の docs 16 ファイル＋`DECISIONS.md` の追記 22 行（決定212〜225）。

安全な方法（推奨・1 案）：
1. master（`862367f`）から docs 専用ブランチ `docs/d212-d225-integration` を作る
2. docs-only 5 commit を `git cherry-pick`（各 commit を `git show --name-only` で docs／scripts out のみと確認）。`f4d1745`・`748ea63` は **docs 部分だけ**を `git checkout <commit> -- docs/…` で取り込む（scripts harness は別途）
3. 未 commit の docs 16 ファイルと `DECISIONS.md` の追記行を 1 commit に（決定213 の runtime 記述は「Production 未反映」と明記済みなので docs として問題ない）
4. Gate：`git diff master --stat -- src public api index.html package.json` が **0**、clean build の bundle 名が Production と**同一**であること
5. push は Vercel の再 deploy を伴う（bundle は同一＝見た目の変化 0）。**CEO 判断**：docs-only で push するか、次の runtime Release に同梱するか。推奨は「次の runtime Release に同梱」（無意味な deploy を避ける）

## 17. TOP IMPROVEMENT TARGET（1 つ）

**「撃破 → 勝利」のクライマックス（最後の一撃 → 崩壊 → 撃破 → 結果）**

条件の照合：
| 条件 | 判定 |
|---|---|
| 体感改善量が大きい | ◎ 北極星の最終地点。今は画面内で最も弱い（灰色の敵・文字・帳票） |
| 商用品質への寄与 | ◎ 勝利の 10 秒は最も見られ、共有される |
| 「解く」を邪魔しない | ◎ 戦闘後。判断情報を隠さない |
| Production Core を壊しにくい | ◎ `src/core` 0。`planVictory` の時刻表と overlay の見た目だけ |
| Human QA 可能 | ◎ 1 戦で必ず 1 回 |
| Before/After | ◎ 同一 seed・同一手順で撃破まで再現できる |

却下した候補：G2（毎手＝テンポ・階層の設計が先）／G3（大規模）／G4（新 asset）／G12（音源生成が禁止領域）／G5（演出ではなく修正）

## 18. Narrow Pilot proposal — Victory Reveal v1

| 項目 | 内容 |
|---|---|
| exact scene | 敵 HP 0 の最後の一撃（既存 L4・52px・stop 90）→ 崩壊（既存 520ms）→ **ここから**「撃破」の拍 → 結果 |
| exact interaction | 入力なし（自動進行）。**tap／click／Enter で舞台をスキップして結果へ**（P5・Law 5）。skip しても結果内容は同一 |
| 構成（案） | ①崩壊の終盤（+380ms）で舞台が暗転（既存 `resonance-cutin` と同じ暗さ・神色の帯・集中線＝**神の一撃と同じ視覚文法を再利用**）②神のキービジュアル（既存 `keyvisual-hero.webp`）が 0.5s で立ち上がる ③明朝で「勝利」（既存 `battle.css:1738` の書体）＋「大耀 × 蒼海の龍神」④スコアが 0 → 実値へ 600ms で count-up（表示のみ。値は既存 `getFinalScore`）⑤`victory_sting`＋ジングル（既存）⑥1.6s 後（または tap）に既存 `GameOverOverlay` の中身がそのまま舞台の下から入る（DOM・文言・ボタン・内訳・神技評価は**不変**） |
| 階層 | Tier 5（神の一撃と同格）。神の一撃より**長くしない**（舞台 ≤1.6s＋既存 collapse 520）。撃破⚡（52px）はそのまま |
| files likely affected | `BattleScreen.tsx`（`victory-beat` ブロックの置き換え）・`GameOverOverlay.tsx`（外側の舞台 wrapper のみ。内容は不変）・`battle.css`（舞台・count-up・reduced-motion）・`useCombatPresentation.ts`／`enemyVfxTiming.ts`（`VICTORY_BEAT_MS` の見直しと skip の時刻）・`combatTimeline.ts` `planVictory`（rewardMs） |
| asset requirement | **0**（`keyvisual-hero.webp`／`keyvisual.webp`・`GOD_THEME_COLOR`・既存 SE・既存 keyframes を流用） |
| estimated scope | 表示層 4〜5 ファイル・CSS ≈150 行・JS ≈60 行。追加容量 ≤6KB |
| technical risks | ①結果画面のテスト（`resultHub`・`resultTransitions`・`GameOverOverlay` 系）が DOM に依存する → **内容の DOM を変えず wrapper だけ足す** ②`reward-overlay`（z 9）・`victory-beat`（z 7）・`game-over-overlay` の重なり順 ③SP の高さ（keyvisual 675×900 を `max-height` で収める）④skip と `PRESENTATION_SAFETY_MS` の整合 ⑤reduced-motion：暗転・立ち上がり・count-up なし、静止の舞台＋即結果 |
| Human QA（5 問） | Q1 敵を倒した瞬間が「決まった」と感じたか／Q2 勝利の画面で「自分の神が勝った」と感じたか（Before より）／Q3 スコアや結果の内容が見づらくなっていないか（NO）／Q4 長い・待たされると感じたか（NO。skip を使ったか）／Q5 2 戦目でも邪魔にならなかったか |
| Before/After | Before＝Production（`:4184` 相当の master build）、After＝Pilot build。同一 seed・同一手順で撃破まで再現（決定224 の `regress.mjs` と同方式）。同一 seed で 2 戦 |
| rollback | 4〜5 ファイルの明示パス revert。`victory-beat` の既存 keyframes は残す（撤退時に復元不要） |
| 撤退条件 | Q1／Q2 が NO、Q3／Q4 が YES、結果画面のテスト FAIL、`src/core` 差分 ≠0、SP で結果の主要ボタンが初期可視領域外（決定207 の教訓） |

## 19. Verdict
**GO**（Pilot 対象＝撃破 → 勝利。実装は CEO 承認後。決定223 と同じく実装前 Preflight を挟む）

## 20. NEXT NOW（1 つ）
**CEO が Pilot 対象「撃破 → 勝利（Victory Reveal v1）」を承認したら、実装前 Preflight を行う。** それまで runtime には触れない。

---

## 付録：証拠ファイル（scratchpad・repo 外）
- `d225/out/`：PC 3 組・SP 2 組の calm／hover／press／result と見せ場（`20-*`）
- `d225/frames/`：アニメーション時刻で止めたフレーム（`F-strike`・`F-collapse`・`F-cutin`・`F-beamhit` 等）
- `d225/crop-*.png`：等倍切り出し（敵・神・OTOMO・カード・プレート・ボタン）
- 本監査は commit していない。Production・runtime・assets・tests 不変
