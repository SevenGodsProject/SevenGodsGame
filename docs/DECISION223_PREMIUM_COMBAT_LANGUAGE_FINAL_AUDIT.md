# 決定223 — SEVEN GODS Premium Combat Language：Final Design Audit / Red-Team / Reality-Check

- 日付：2026-09-23
- 種別：**AUDIT ONLY**（runtime／assets／image 生成／H3・fal.ai／課金／commit／merge／push／deploy／Ranking／Neon／secrets：すべて 0）
- 判断主体：AI チーム（CLAUDE.md §6-2）。docs-only。本ファイルは未 commit（CEO 指示）
- 前段：`docs/DECISION223_MOTION_STRATEGY_RED_TEAM.md`（同日・初回 red-team）。本書はそれを「Premium Combat Language」「material／depth／card-as-object」「Motion Hierarchy」の軸で再監査した **Final**。初回と結論が同じ箇所は根拠を追加し、変わった箇所は明示する
- 入力：
  - 実コード HEAD `43c10a4`（`src/components/battle/*`、`battle.css` 6,191 行・`@keyframes` 90 本、`enemyVfxTiming.ts`、`combatTimeline.ts`、`useFloatingNumbers.ts`、`useBattleSound.ts`、`sound.ts`、`feelTier.ts`、`CardView.tsx`、`cardStyle.ts`、`EnemyPanel.tsx`、`PlayerPanel.tsx`、`BattleResonanceCutin.tsx`、`press.css`、`reducedMotion.ts`、`useMobileAutoFocus.ts`）
  - 実 assets（`public/assets/` を寸法・容量で実測）
  - 実画面（`scripts/decision213-stance-pilot/out/regression-v03/interaction-feel/pc-battle.png`・`sp-battle.png`）
  - 外部 Benchmark（Web 一次資料優先・本日 27 call・§2）
  - 決定217／218／219／220／221／222、Phase 6-A／6-D、`PHASE6_COMMERCIAL_BENCHMARK_V2.md`
- **CEO 提供参考動画：本セッションから参照不能**（repo・Downloads・scratchpad に該当ファイルなし。Downloads にあるのは H3 テスト動画 5 本のみ）。CEO が列挙した観察 13 項目を一次入力として扱い、見ていない内容は推測しない
- 決定220／222 の未 commit 差分：**working tree には既に存在しない**（`git diff --stat` は `docs/DECISIONS.md` +4 行のみ。決定222 close-out で `git checkout --` 済み）。実装コピーは scratchpad `5e7f71b1…/scratchpad/d220`・`d222`（`living-block.css`・光マップ 3 枚・シミュレーション）に残っており、読むだけで cleanup しない

---

## 0. FINAL VERDICT（先に）

| # | 項目 | 結論 |
|---|---|---|
| 1 | CORE VERDICT「Living Background 中心 → Premium Combat Language 中心」 | **SUPPORTED WITH MODIFICATIONS**（修正 4 点・§6） |
| 3 | CEO 仮説「最新カードゲームでは背景動画が必須」 | **REFUTED**（5＋4 作品・試合中の常時動画背景 0・§2） |
| 4 | 最大 Gap（3 つ・順位なし） | G-A **Payoff 階層の逆転**（解けた瞬間が通常ヒットより弱い）／G-B **カードが物体ではなく UI ボタン**（material／depth／continuity）／G-C **キャラ層の静止と画風の割れ**（§4） |
| 7 | FIRST NARROW PILOT | **「READY → PAYOFF」1 シーケンス：大耀『豪快な一撃』（`card_taiyo_attack_01`・`bonus.when: 'charged'`）が 共振／一心不乱 の仕込みで点灯し、撃って ⚡+40 が決まる瞬間**（§7） |
| 9 | 実装方式 | **CSS（transform／opacity／filter／box-shadow）＋既存 JS タイムライン定数の拡張**。Canvas／WebGL／video／H3 は使わない（§9） |
| 10 | 新規 asset | 画像 **0**・SE **1**（`scripts/gen-se.mjs` で生成）（§10） |
| 13 | H3 | **今は使わない**（§13） |
| 14 | 決定218 | **先に 218 Human QA（現行 visual・baseline）→ 223 Pilot → 同じ QA を再測定**（§14） |
| 17 | NEXT NOW | **決定218 Human QA を実施する**（大耀 × 蒼海の龍神・ふつう・推奨デッキ。Preview は `dist/assets/index-X7cOlknS.js`＝決定222 close-out の clean build と同一ハッシュであることを起動前に確認）（§17） |

---

## 1. 前提：これまでの失敗から立てた新仮説

| 試行 | 結果 | 本監査での読み替え |
|---|---|---|
| A H3 全面 Living Background | canonical drift（石床水没・龍変形）→ NO-GO | 「絵が動く」こと自体は品質ではない。正典が壊れる動きは負の価値 |
| B H3 Environmental VFX Layer（決定219） | spatial drift を分離不能 → NO-GO | 同上 |
| C 決定220 Procedural Water | 「どこが動いているか全然わからない」→ FAIL | 実効カバー率 0%（決定221）＝見えない場所に予算を置いた |
| E 決定222 Lighting Breath | カバー率 34.9%・+19 luma でも「静止画に感じた」→ FAIL | **プレイヤーの操作と因果を持たない緩やかな変化は、注意の外に落ちる**（Blizzard の「常駐 VFX は注意を奪わないこと」を裏から証明した形） |

新仮説：**「motion 予算を置く場所が間違っていた」**。置くべき場所は、①プレイヤーの操作が起こした ②結果が確定した ③しかも「自分の仕込みが効いた」瞬間。決定217／218 が見つけた第 3 の判断「仕込んでから撃つ」の成立点＝`BONUS_TRIGGERED`。

---

## 2. EXTERNAL BENCHMARK（Web 一次資料優先・27 call）

凡例：✅ 一次／準一次で確認、△ メディア・Wiki・コミュニティ、**未確認**＝本調査で裏取りできず（推測を書かない）。出典 URL は §2-4。

### 2-1. 層別比較（A〜P）

| 層 | Pokémon TCG Pocket | Shadowverse: Worlds Beyond | Yu-Gi-Oh! MASTER DUEL | Hearthstone | MARVEL SNAP |
|---|---|---|---|---|---|
| A 盤／背景 | 静止マット（コスメ）△ | リーダー idle＋ステージ効果・**設定 OFF 可** △ | 3D フィールド＋Mate・小 idle △ | **静止盤＋四隅 clickables**（暇つぶし用・ゲーム影響なし）✅ | 3 ロケーションが主役・盤自体は暗いガラス △ |
| B イラスト | 通常／フルアート／**Immersive（3★・環境まで描く＋パン＋音楽）** ✅ | 通常→Premium→**Fully Animated** △ | 公式 TCG 絵＋**Royal Finish**（虹縁＋全面プリズム） △ | Golden（元絵アニメ＋金枠）／Signature（別絵）／**Diamond（3D 新規・レジェンド限定）** ✅ | ベース＋Variant。Finish（Foil／Prism／Ink／Gold）× Flare（Tone／Glimmer／Stardust／Krackle）△ |
| C 枠／material | ◇★👑 レアリティ枠。Immersive は黒渦枠 ✅ | Premium 装飾枠 △ | Basic／Glossy／Royal △ | 金枠／ダイヤ枠 ✅ | Ink＝白黒化・Gold＝金背景 △ |
| D idle | Immersive は**閲覧時**に動く（試合中手札は未確認）✅ | Fully Animated は常時 △ | Royal は箔反射のみ | 上位 3 種は手札・盤で常時 △ | Flare 粒子が常時 △ |
| E hover／select | 未確認（長押し→没入のみ ✅） | 未確認 | 未確認 | 未確認 | 未確認 |
| F play／reveal | 毎操作にアニメ→**スキップ要望が公式コミュニティで継続** △ | 簡易表示設定あり △ | 通常／特殊召喚で別演出・**演出「初回のみ」設定** △ | **トリガー 0.8s→0.2s（−75%）** ✅ | ターン終了で両者同時公開・**ループは自動 Fast Forward** △ |
| G キャラ反応 | 基本なし | 8 リーダー・EN/JP 音声 ✅ | Mate（未確認） | ヒーロー肖像＋エモート（未確認） | なし |
| H 攻撃 | 未確認 | 未確認 | 未確認 | 未確認 | なし（数値） |
| I hit／damage | 未確認 | 未確認 | 未確認 | 未確認（画面揺れトグルは初回監査で△） | 数値変化 |
| J 能力／combo | スキップなし △ | 未確認 | 「初回のみ」△ | **高頻度トリガーほど短く** ✅ | **早送り** △ |
| K 変身／進化 | 重ね置き | **Super-Evolve が目玉** ✅ | — | — | — |
| L 必殺／finisher | KO | Fully Animated 固有演出 △ | **召喚カットイン**（例集あり）△ | Diamond 3D ✅ | Krackle Flare △ |
| M 勝利 | 未確認 | 未確認 | 未確認 | 未確認 | 未確認 |
| N パック／収集 | 開発思想の中核・12h 無料開封・長押し没入 ✅ | ガチャ演出・Fully Animated はポイント報酬 △ | Royal △ | 階層 ✅ | Split 最大 128 回 △ |
| O UI micro | 未確認 | 未確認 | 未確認 | 未確認 | 未確認 |
| P SFX／hit-stop／camera | 未確認 | 未確認 | 未確認 | テンポ方針のみ ✅ | テンポ方針のみ △ |

### 2-2. motion 予算の配分（分類）

| 作品 | 常時動く | 操作で動く | 成功 payoff で強く | 稀・特別だけ cinematic |
|---|---|---|---|---|
| Pocket | Immersive（閲覧時） | 長押し没入・開封 | コイン演出（長い＝批判） | Immersive 3★ |
| Shadowverse WB | Fully Animated | プレイ／進化 | **Super-Evolve** | Fully Animated 固有 |
| Master Duel | Royal 箔 | 召喚 | 特殊召喚 | **召喚カットイン**（初回のみ可） |
| Hearthstone | 上位カード・四隅 clickables | プレイ／攻撃 | トリガーは**あえて短く** | Diamond 3D |
| SNAP | Flare 粒子 | 同時公開 | ループは**早送り** | Ink／Gold＋Krackle |

読み取り（初回監査 9 作品の結果と一致）：
1. **通常カードは全作で静止**。動く素材は課金・レア・進行報酬に住む＝「動くこと」が報酬価値
2. 盤面は静的〜微小。**常時動画背景は 0**
3. 最大の motion は例外なく「プレイヤーが起こした稀な成功」（進化・召喚・レジェンド）に集中
4. テンポは能動的に守られる：0.8s→0.2s／自動早送り／初回のみ／（Pocket は守れずに批判）
5. Web／HTML5 で動く作品は 0（SNAP は Unity ✅・他は未確認）

### 2-3. CEO CLAIM CHECK

「最新カードゲームでは必ず背景動画が必要」→ **REFUTED**。
根拠：5 作品＋初回監査 4 作品（LoR／MTGA／StS／Balatro）の計 9 作品で、試合中に常時動画背景を使う作品は 0。Hearthstone は静止盤＋四隅の玩具 ✅、Pocket は静止マット △、Shadowverse WB は realtime 効果で **OFF 可** △。「質感がすごい」と CEO が感じた対象は、§2-1 B／C／N の通り **カードそのものの material（箔・金・プリズム・3D）と、稀な瞬間のカットイン**であり、背景ではない。

### 2-4. 出典
Pocket：bulbapedia.bulbagarden.net/wiki/Immersive_card_(TCG_Pocket)／play.google.com（jp.pokemon.pokemontcgp）／community.pokemon.com/en-us/discussion/25331／sportskeeda.com／dexerto.com／en.wikipedia.org/wiki/Pokémon_Trading_Card_Game_Pocket
SNAP：snap.fan/guides/infinity-splits-and-frame-breaks-guide／marvelsnap.com／mmobomb.com（Fast Forward patch）／marvelsnapzone.com（fast-forward criteria）／en.wikipedia.org/wiki/Marvel_Snap／marvelsnap.helpshift.com（2026-09-15 patch）
Hearthstone：outof.games/news/758（Blizzard Hadidjah の発言引用・トリガー 0.8s→0.2s）／hearthstone.wiki.gg/wiki/Diamond_card／hearthstone.wiki.gg/wiki/Signature_card／hearthstone.fandom.com/wiki/Battlefield／outof.games/news/341／us.forums.blizzard.com（BG sped-up animations）
Master Duel：ygorganization.com（summoning animation examples）／nexusmods（Royal Finish）／tvtropes／dotesports（451・スニペットのみ）
Shadowverse WB：shadowverse-wb.com/en／store.steampowered.com/app/2584990／gamewith.net/shadowverse-wb/68465・68482／en.wikipedia.org/wiki/Shadowverse:_Worlds_Beyond
取得失敗：Konami 公式（機能記述なし）・Yugipedia（403）・Cygames/DeNA/Konami の開発者講演（発見できず）。**E／H／I／M／O／P 層は一次情報ゼロ**。設計判断に使う場合は実機観察で裏取りする。

---

## 3. SEVEN GODS CURRENT REALITY AUDIT（実コード・実 assets・実画面）

### 3-1. assets 実測

| 種別 | 枚数・寸法・形式 | 容量 | 所見 |
|---|---|---|---|
| カード | 60 枚・**512×768 WebP** | 79〜182KB（中央値 118KB）・計 6.8MB | 2.0〜2.3 頭身 chibi・セル塗り・高彩度（`CARD_ART_STYLE_GUIDE.md` 準拠）。**イラスト品質は高い**（実物 `card_taiyo_attack_01.webp` を確認） |
| 神 | 7 神：front 1600² WebP（戦闘は 640 版使用）＋keyvisual 675×900／1086×1448 | 計 12MB | 線画クリーン・静止 1 枚 |
| 敵 | 7 体：`art_hq.webp` 768²／`art.webp` 512² | 計 3.9MB | **ドット風**。神と画風が割れる（6-D 既知） |
| OTOMO | 7 体 × 3 形態：320² WebP（＋1600² 原本） | 計 6.4MB | 小さく、透過縁に発光焼き込み |
| 背景 | ステージ 7 枚・1600×900 WebP | 計 2.2MB | 品質高い・静止 |
| FX | cast 6 枚・**320×480 PNG**（黒背景・`mix-blend-mode: screen`） | 263〜429KB・計 2.0MB | **静止 1 枚を 0.35〜0.5s で拡大フェードするだけ**。PNG のため容量が大きい |
| SE | 20 種 WAV（`gen-se.mjs` 数式生成） | 計 372KB | 合成トーン。**⚡専用音なし** |
| BGM | 4 曲（mp3＋webm） | 計 20MB | — |
| ビルド | JS 443KB・CSS 150KB（`dist/assets/index-X7cOlknS.*`） | — | React 19・Phaser は `MainScene` のみで戦闘未使用 |

### 3-2. カード UI の実装（`CardView.tsx`・`battle.css:2334-2545`）

| 要素 | 現状 | 判定 |
|---|---|---|
| 器 | `<button>`・132×190px（SP 116×164／100×158）・`border: 2px solid <type color>`・`border-radius: 10px` | **CSS 枠＝UI ボタン**。枠 material なし |
| 影・elevation | `box-shadow: 0 6px 14px -9px` ＝ ほぼ接地なし | 「置かれている」感が弱い |
| 面構成 | 全面イラスト（`object-position: center 22%`）＋下部 30px から暗グラデ＋名前／タイプ／効果文／bonus 行 | 面積の約 45% が文字帯。SP では絵の見える高さ ≥58px |
| hover（PC のみ） | `translateY(-8px) scale(1.04)`＋光沢 sweep 0.55s | 業界標準の lift。tilt／rim なし |
| press（決定200） | 1px 沈み 60ms | 軽い・即時（Tier 1） |
| **READY（⚡成立）** | `.card-view-bonus-ready`：**文字色 #ffd166＋text-shadow のみ**。アニメなし・枠変化なし・音なし | **カードは「完成状態」にならない**。CEO 観察「通常状態と特別状態の演出強度差」が最も欠ける箇所 |
| play | `card-play` 0.28s：scale 1.08 → 0.6・上へ 40px・フェード | カードは**手札の位置で消える**。敵へ向かわない |
| cast | `cast-flash`（`position: fixed`・アリーナ中央）：静止 PNG＋アイコン 0.35〜0.5s＋神 wind-up 220ms | カード→神→敵の視線は「カード消滅→中央閃光→神突き」の 3 点ジャンプ |

### 3-3. Combat Juice の実装（Phase 6-A・`combatTimeline.ts`／`enemyVfxTiming.ts`）

| 段階 | 実装値 | 強さ |
|---|---|---|
| commit → 着弾 | `CARD_IMPACT_MS` 90（god-strike 0.34s の 26%） | ○ |
| hit stop | L1 0／L2 20／L3 45／L4 60／神の一撃 80／最後の一撃 90 ms | ◎ |
| 敵リアクション | knock-back（--kb 2〜6px）＋shake＋flash、段階別 | ◎ |
| 数字 | 16／22／30／40／**52px（max）**、黒縁 | ◎ |
| 表示 HP | 着弾＋stop＋90ms 後にゴースト付きで減る | ◎ |
| 画面揺れ | L4・神の一撃・最後の一撃のみ（WAAPI 3〜5px） | ◎（抑制が効いている） |
| **⚡ bonus step** | 本体の +150ms／**stopMs 0**（`hitStopFor` で bonus は 0）／反応 **tier 1 `react-minor`**（--kb 3px・shake-l1 0.26s・sepia flash 0.32s）／数字 **20px** 金／SE は `hit_l1`（**最小音量 0.45**）／callout「⚡ 条件成立」18px・0.7s（1 バッチ 1 件・同条件は 1R 1 回・決着バッチは抑止） | **✗ 通常 L2 ヒット（stop 20ms・22px）より弱い** |
| 神の一撃 | 到達反応 200 → カットイン 900 → handoff 200 → 溜め・突き 600（着弾 1,600）→ hit stop 80 → 52px → バナー 900 → 進化 | ◎（業界のカットインに相当） |
| 敵必殺 | カットイン 1,050 → ビーム／連撃 TEMPO-B（0／180／500） | ◎ |
| 撃破 | final stop 90 → 170 → 崩壊 520 → 「撃破」850 → 報酬 | ◎ |
| reduced-motion | hit stop 0・shake／突き／崩壊を停止・情報は保持（`battle.css:4220,4609`） | ◎ |
| skip／速度設定 | なし（報酬の「見送る」のみ） | △（大技は 2.3s ブロック） |
| mobile | `battle-viewport`：一画面固定・手札横スクロール（4 枚可視）・決定125 auto-focus | ○ |

### 3-4. 実画面の観察（`pc-battle.png` 1508×660・`sp-battle.png` 390×844）

- 配色は藍黒＋金＋神色で一貫。HUD の名札はヘアライン＋黒 60〜80% で統一（6-D の方向）
- **キャラ 3 体が横一列・幅比 16〜19%・接地影なし**。敵（ドット）と神（線画）の画風差が同一画面で見える
- 手札 6 枚は同一サイズ・同一枠で等間隔。READY 状態のカード（例：剛撃「共鳴が4以上なら…」）は文字色が変わるだけで、**他 5 枚と輪郭・高さ・光が同じ**
- SP は手札 4 枚可視・横スクロール。カードの絵の可視高は約 60px

### 3-5. 「商用に見えないとすれば本当に不足しているのは何か」

| 候補 | 判定 | 根拠 |
|---|---|---|
| illustration quality | **不足ではない** | カード 512×768・神 1600²・背景 1600×900。6-D でも「画像品質は問題ではない、問題は置き方」 |
| card material | **不足** | 枠＝CSS border。foil／rim／bevel／glass のいずれもない |
| depth | **不足** | 接地影なし・カード elevation ほぼ 0・キャラ横一列 |
| lighting | 部分的 | 数字・バナーの発光はある。READY の光がない |
| motion | 部分的 | 大技・ヒットは業界水準。**READY／PAYOFF が空白** |
| hit feedback | 充足 | 6-A |
| timing | 充足 | 定数が一元管理され CSS と一致 |
| sound | **不足** | 合成トーン 20 種・⚡専用音なし（Benchmark v2 で Sound 48/100） |
| UI consistency | 概ね充足 | 6-B／6-D |
| hierarchy | **逆転あり** | ⚡ payoff ＜ 通常 L2 |
| composition | 不足 | 6-D §2-2 |
| animation continuity | **不足** | カード消滅→中央閃光→神突きの 3 点ジャンプ |

---

## 4. QUALITY GAP DECOMPOSITION（9 層）

各 Gap を「商用品質への寄与」と「North Star（解く）への寄与」で分ける。

| LEVEL | 参考作品にあって SEVEN GODS に無い／弱いもの | 商用品質 | North Star | Pilot 対象 |
|---|---|---|---|---|
| 1 ART | 敵と神の画風不一致。カード・背景は同等 | 中 | 低 | ✗（21 体再生成・identity リスク） |
| 2 MATERIAL | カード枠が CSS border。READY でも material が変わらない | **高** | **中**（成立状態の可視化） | **○（READY で枠が「点く」）** |
| 3 DEPTH | 接地影・elevation・キャラの奥行きなし | 中 | 低 | △（READY の 2px lift のみ） |
| 4 MOTION | READY／PAYOFF の motion 空白。大技・ヒットは充足 | 中 | **高** | **○** |
| 5 TIMING | hit stop は充足。⚡ の stop が 0 | 中 | **高** | **○（40ms）** |
| 6 LIGHT | rim／bloom は数字とバナーのみ。焦点誘導なし | 高 | 中 | ○（金リング 1 つ） |
| 7 SOUND | 合成トーン・⚡音なし | 高 | 中 | ○（SE 1 音） |
| 8 HIERARCHY | normal ＞ payoff の逆転 | 中 | **高** | **○** |
| 9 CONTINUITY | カード→攻撃→敵反応が 3 点ジャンプ | 高 | 中 | ✗（Pilot 後） |

**最大 Gap 3 つ（順位なし・事実と根拠）**

- **G-A Payoff 階層の逆転**：`combatTimeline.hitStopFor` で `role==='bonus'` は 0ms、`enemyReactions` は `tier 1 / minor`、数字は `floating-number-bonus` 20px、SE は `damageEnemy(tier)` で 4 ダメージ→L1→`hit_l1` gain 0.45（最小）。通常 L2 ヒットは stop 20ms・22px・gain 0.6。**North Star の「鮮やかに決まった」瞬間が、何でもない一撃より小さい**
- **G-B カードが物体ではなく UI ボタン**：`<button>`＋`border: 2px solid`＋`box-shadow 6px 14px -9px`。READY は色のみ。play は手札位置で消滅（`card-play`）。参考作品のカードは「枠に material があり、選ぶと持ち上がり、出すと盤へ移動する」。CEO 観察「cardを単なるUI画像ではなくphysical objectとして扱う」「illustrationとframeの一体感」に対応する空白
- **G-C キャラ層の静止と画風の割れ**：神 7・敵 7・OTOMO 7×3＝**35 枚が静止 1 枚絵**。攻撃・被弾・idle が同一ポーズ（transform のみ）。敵はドット風・神は線画。6-D で既知。**最も見た目に効くが最も高コストで identity リスク（決定211）が最大**。Pilot にしない

---

## 5. PREMIUM COMBAT LANGUAGE（SEVEN GODS の visual grammar・採用案）

基本文法（CEO 案）を SEVEN GODS の実コードに写像し、**追加が必要な段階だけ**を新設する。

| 段階 | 意味 | 既存の実装 | 追加（Pilot） |
|---|---|---|---|
| CALM | 通常戦闘 | `enemy-idle` 3.4s・`arena-glow-breathe` 9s | なし（決定222 で「常時の緩やかな変化は知覚されない」を確認済み。増やさない） |
| SETUP | 仕込み札を出す（共振＝共鳴+2・一心不乱＝+1） | ゲージ更新・`resonance_gain` SE・ミニ結果 | なし（決定218 L1「4 の目印」は 218 QA の観察結果を待つ） |
| **READY** | 本命札が「完成状態」になる | `.card-view-bonus-ready` 文字色のみ | **新設**：state が false→true になった瞬間に 1 回だけ「点火」（枠 rim light 400ms sweep・2px lift 保持・コスト珠の glint）。ループ禁止・無音 |
| SELECT | 手札から浮く | hover lift 8px／press 1px | なし |
| COMMIT | 前面へ出る・material が強まる | `card-play` 0.28s・cast-flash・wind-up 220ms | なし（Before/After の因果分離のため Pilot では触らない） |
| RELEASE | カード→攻撃へ視線がつながる | god-strike 0.34s（90ms で最前） | なし |
| IMPACT | 本体着弾 | hit stop／shake／flash／数字／HP lag | なし |
| **PAYOFF** | ⚡ 成立を強く見せる | +150ms・stop 0・minor・20px・hit_l1 | **格上げ**：stop 40ms・金 impact ring 0.42s・数字 30px（L3 相当・金）・専用 SE 1 音・callout は既存のまま（同時刻・金） |
| RETURN | 即座に通常へ | 入力ブロックは cast 280ms のみ | なし（PAYOFF は入力を止めない） |

言語の原則（SEVEN GODS 独自）：
1. **「点いて、撃って、決まる」**：READY（点火）→ IMPACT（本体）→ PAYOFF（決まる）の 3 拍。仕込みが可視化され、結果が本体より一段強い
2. **金は「解けた」の色**：⚡・READY・PAYOFF・神の一撃に限定。通常ヒットは白〜タイプ色
3. **1 回だけ動く**：状態変化の瞬間に 1 回。ループ・常時発光は作らない（決定222 の教訓）
4. **強さは頻度の逆数**：毎手（通常プレイ）は最短、⚡（1 戦 3〜5 回）は中、神の一撃（≤1 回）は最長
5. **正典を動かさない**：立ち絵・カード絵は transform／filter のみ。再描画・生成をしない（P12）

---

## 6. RED-TEAM（CORE HYPOTHESIS と Premium Combat Language への疑い）

| 疑い | 判定 | 根拠 |
|---|---|---|
| 9 段階は長すぎないか | **長い。ただし新設は 2 段階だけ** | 他 7 段階は既に存在し時間は変えない。追加は READY 400ms（非ブロック・手札内）と PAYOFF の tail ≤600ms（非ブロック）。**入力ブロック時間の増分 0** |
| 毎回だと邪魔ではないか | **毎回ではない** | 発火は `BONUS_TRIGGERED` のみ。実測（決定217／218・600 試合）：恵比寿 4.0〜4.8 回／試合、大耀×龍神 charged 1.82＋combo 1.90＋blocked 1.38。カードプレイ 15〜20 回／戦の 2〜3 割 |
| 思考テンポを壊さないか | **壊さない** | PAYOFF は commit 後の tail。READY は手札で待っている間に点く（思考中の情報） |
| CSS／VFX だけで十分か | **Pilot は十分** | 追加要素は transform／opacity／filter／box-shadow のみ。G-C（キャラ）は CSS では埋まらないが Pilot 外 |
| SFX 改善の方が ROI が高いか | **SFX は Pilot に含める（1 音）** | ⚡専用音の欠落は G-A の一部。SE 全面再設計（合成→設計音）は別 milestone |
| 既存 Combat Juice と重複しないか | **重複しない** | 同じ `planBatch` の bonus step のパラメータ（stop／tier／size／SE）を変えるだけ。時刻の真実は 1 か所のまま |
| 「解く」より演出を見るゲームにならないか | **ならない** | 演出は「正しい順番で出した」ときだけ強くなる。順番が違えば通常ヒット。演出が判断の報酬になる（P1 第一 Gate 通過） |
| 逆仮説：本当の Gap は G-C（静止キャラ）で、READY／PAYOFF は小手先では | **半分真** | 見た目レベルでは G-C が最大。ただし 35 枚の rig／再生成・identity（決定211）・画風統一が前提で、Pilot の 10 基準（§7）のうち 5・6・7 を満たさない。G-A／G-B は 0 asset で North Star に直結。**G-C は Pilot 結果を見てから別監査** |
| 逆仮説：READY の点火も決定222 と同じく「気づかれない」のでは | **構造が違う** | 222 は操作と無関係な +7.5% luma の緩やかな呼吸。READY は**自分が出した札の直後**に、**注視している手札**の 1 枚だけが 1 回変わる。Hearthstone の「出せる札の緑枠」と同じ位置づけ。ただし証明は Human QA で行う（§15 Q1） |
| 参考作品の material（箔・金・3D）を今入れるべきでは | **今は入れない** | 全作で premium material は課金／レア領域。SEVEN GODS は課金なし（P14）で 60 枚全部に載せる形になり、「READY だけ光る」という情報が薄まる。material は **READY 状態にだけ**入れて「成立＝プレミアム化」とする |

---

## 7. MOTION INTENSITY HIERARCHY（定義）

「静 → 動 → 強い結果 → 静」の振幅を、頻度の逆数で固定する。

| Tier | 場面 | 頻度／戦 | 入力ブロック | 視覚 | hit stop | 数字 | 音 | 実装状態 |
|---|---|---|---|---|---|---|---|---|
| 0 Idle／Calm | 待機 | 常時 | — | 呼吸 3.4s・glow 9s | — | — | — | 既存・増やさない |
| 1 Normal Play | 通常カード | 15〜20 | cast 280ms | card-play 0.28s・cast-flash 0.35〜0.5s・突き 0.34s・shake | L1 0／L2 20 | 16／22px 白 | card_play 0.3・hit_l1/l2 0.45/0.6 | 既存・不変 |
| **2 Ready／Setup Success** | 本命札が成立 | 3〜6 | **0** | **枠 rim light 400ms 1 回・2px lift 保持・珠 glint** | — | — | **無音** | **新設** |
| **3 Payoff／Combo** | ⚡ 発動 | 3〜5 | **0** | **金 ring 0.42s・react tier 2 相当・callout 0.7s** | **40** | **30px 金** | **bonus_payoff（新 1 音・gain 0.7）** | **格上げ** |
| 4 Resonance（7/7 到達＋カットイン） | 神技の予告 | ≤1 | 200＋900＋200 | ゲージ発光・暗転・神カットイン | — | — | burst_ready 0.65 | 既存 |
| 5 God Strike／Finisher | 神の一撃・撃破 | ≤1 | 溜め〜着弾 600 | 溜め→突き・52px・バナー・画面揺れ・崩壊 | 80／90 | 52px 金 | hit_l4 1.0・victory | 既存 |

ルール：Tier 3 は Tier 5 と重ならない（神の一撃バッチでは ⚡ を出さない＝既存 callout の big-moment 抑止と同じ）。Tier 2 は同時に複数枚点いてもよいが、点火は各 1 回。

---

## 8. CARD AS A PHYSICAL OBJECT（検証）

現状は §3-2 の通り **UI ボタン**（CSS border・elevation ≈0・READY は文字色）。物体感を作る価値：**ある。ただし Pilot では READY 状態にだけ入れる**（§6 最終行）。

| 方式 | material | depth／tilt | 60 枚横展開 | mobile | reduced-motion | asset | 回帰リスク | 判定 |
|---|---|---|---|---|---|---|---|---|
| **CSS（transform／box-shadow／gradient／mask）** | rim・glint・bevel は gradient と inset shadow で可 | lift・scale・`perspective`+`rotateX/Y` 可 | クラス 1 つで全枚 | ◎（GPU 合成） | ◎（media query） | 0 | 低 | **採用** |
| CSS 3D tilt（hover 追従） | — | ◎ | 可 | ✗（hover なし） | △ | 0 | 低 | PC の SELECT 拡張候補（Pilot 外） |
| Canvas 2D | 粒子・箔の疑似反射 | △ | 要ループ | ○ | 要実装 | 0 | 中（React と二重描画） | 不採用 |
| WebGL（Phaser／shader） | 箔・屈折・glass は本物 | ◎ | 可 | △（電池・古い端末） | 要実装 | shader | 高（Phaser 戦闘未使用・アーキ変更） | 不採用（将来 premium 素材専用の候補） |
| static art＋procedural | 既存 PNG（cast-flash）方式 | ✗ | 6 種固定 | ○ | ○ | PNG 増 | 低 | 現状維持のみ |
| short video（カード面） | ◎に見える | ✗ | **60 本** | ✗（容量・自動再生制限） | ✗ | 大 | 高 | 不採用 |

---

## 9. IMPLEMENTATION（推奨方式 1 つ）

**CSS ＋ 既存 JS タイムライン定数の拡張**（hybrid ではない。JS は既存の `planBatch`／`enemyVfxTiming` の値を変えるだけ）。

理由：①演出の時刻は既に `combatTimeline.ts` に一元化されており、bonus step の `stopMs`／`tier`／数字サイズ／SE を変えるのは設計上の拡張点 ②READY は `bonusReady` prop の遷移を CSS class（1 回再生の keyframe）で受けるだけ ③reduced-motion・mobile・入力非ブロック・golden 不変が既存の仕組みで担保される ④画像 0・video 0・H3 0。

変更点（**実装は本監査の範囲外**。Pilot 実装時の仕様）：

| ファイル | 変更 | `src/core` 差分 |
|---|---|---|
| `combatTimeline.ts` | `hitStopFor`：`role==='bonus'` を 0 → `BONUS_HIT_STOP_MS`（40）。bonus 反応 `tier: 1, minor: true` → `tier: 2, minor: false, payoff: true` | 0 |
| `enemyVfxTiming.ts` | `BONUS_HIT_STOP_MS = 40` 追加（`BONUS_GAP_MS` 150 は不変） | 0 |
| `useFloatingNumbers.ts` | bonus 数字の `tier` を 3 相当（30px）に。`bonus: true` は維持 | 0 |
| `useBattleSound.ts`／`sound.ts` | `BONUS_TRIGGERED` の着弾に `sfx.bonusPayoff(atMs)`（`bonus_payoff.wav`・gain `SE_GAIN.reward` 0.7）。本体の `hit_l*` はそのまま | 0 |
| `EnemyPanel.tsx` | `react-payoff` クラス＋金 `impact-ring-payoff`（既存 `impact-ring-burst` keyframe を金色で流用） | 0 |
| `CardView.tsx` | `bonusReady` が false→true になったフレームで `card-view-ready-ignite` を 1 回付与（`useRef` で前回値比較・timer 0）。`card-view-bonus-ready` に `transform: translateY(-2px)` と rim gradient | 0 |
| `battle.css` | `@keyframes card-ready-ignite`（400ms・box-shadow＋`::after` の rim sweep）、`.react-payoff`、`.impact-ring-payoff`、`.floating-number-bonus` 30px、reduced-motion 節 | 0 |
| `scripts/gen-se.mjs` | `bonus_payoff` 1 音（短い上昇 2 音＋金属質の減衰・≤250ms） | 0 |

禁止：カード ID／名前での分岐（不変ルール 3）。READY／PAYOFF は `CardDef.bonus` を持つ全 23 枚（共通 16＋大耀 2＋蒼毘 3＋笑蓮 2）に自動で効く。**QA の対象だけを『豪快な一撃』に絞る**。

---

## 10. ASSETS（最小）

| 種別 | 数 | 仕様 |
|---|---|---|
| 画像 | **0** | rim／ring／glint は CSS gradient・mask・box-shadow |
| SE | **1** | `public/assets/se/bonus_payoff.wav`・`gen-se.mjs` 生成・mono 44.1kHz・≤250ms・≤30KB・外部素材 0 |
| フォント／動画／H3 | 0 | — |

---

## 11. PERFORMANCE BUDGET（mobile 含む）

| 項目 | 予算 | 測り方 |
|---|---|---|
| 追加アニメーション | transform／opacity／filter／box-shadow のみ。layout／paint を起こすプロパティ禁止 | DevTools Rendering「Paint flashing」で手札全体が再描画されないこと |
| 同時レイヤー | READY：手札内 1〜2 枚。PAYOFF：ring 1＋反応 1（既存と同数） | DOM 差分 ≤3 要素 |
| フレーム | 390×844 の中位 Android（Chrome）で PAYOFF 中 long task 0・平均 ≥55fps | `scripts/phase6-commercial-benchmark/perf.mjs` 同条件で Before/After |
| main thread | 追加 JS：`useRef` 比較 1 回／render・新 timer 0 | 既存 planBatch の呼び出し回数不変 |
| 入力ブロック | **増分 0ms**（cast 280ms のみ） | `useGameEngine.CARD_PLAY_REVEAL_MS` 不変をテストで固定 |
| CLS／LCP | 0／不変（`card-view-bonus-ready` の 2px lift は transform） | `scripts/release-hygiene/cls.mjs` |
| reduced-motion | READY＝rim の静的表示のみ（sweep なし）・PAYOFF＝stop 0・ring なし・数字と SE は残す | media query テスト |
| backdrop-filter／mix-blend-mode | **新規使用 0**（既存 cast-flash の screen は触らない） | grep |

## 12. FILE SIZE BUDGET

| 範囲 | 予算 |
|---|---|
| Pilot | CSS +≤4KB（gzip 前）・JS +≤1KB・WAV +≤30KB。画像 0。**合計 ≤35KB** |
| 将来横展開（7 神色・全 bonus 23 枚・5 条件別の ring 色） | CSS 変数のみ。**画像 0 を維持**。SE は条件別に増やさない（1 音固定） |
| 上限（この言語で許す最大） | CSS 累計 +15KB・SE 累計 +100KB。これを超える拡張（animated frame・粒子 sprite）は別監査 |
| 参考：現在 | JS 443KB・CSS 150KB・SE 372KB・BGM 20MB・画像 33MB |

---

## 13. H3 / GENERATIVE VIDEO VERDICT

**今は使わない。** 追加 fal.ai 生成 0。

| 候補 | 判定 | 根拠 |
|---|---|---|
| God Strike cinematic | ✗ | 初回監査 §6 実測：H3 は生成 0.5 秒で初フレームから luma MAE 25〜31（5 秒後 40 の 6〜8 割）。1〜2 秒のカットインでも神の identity が保てない。COV-M v2（決定211）で CEO が帽子の縁 1 箇所の崩れを検知して FAIL |
| rare finisher／victory splash | ✗（保留） | 同上。加えて victory は 1 戦 1 回で最も「見る」場面＝崩れが最も目立つ |
| card reveal | ✗ | カード絵は 512×768 の chibi で線が細く、drift が最も出やすい。60 枚分 |
| promotional sequence | △（ゲーム外） | 正典を含まない抽象素材（光・水しぶき）に限れば可。ただし本監査の対象外 |
| 通常カードプレイの pre-rendered video | ✗ | repeatability（拡散は非決定）・latency（初回ロード）・size（60 本）・identity・scalability（7 神 × 60）の 5 点すべてで不可 |

将来 H3 を再検討する Gate（初回監査と同じ・変更なし）：①全フレーム MAE ≤8 ②生成回数と単価の事前記録 ③同 seed 再現性 ④正典被写体を含まない ⑤無くても同一体験。

---

## 14. DECISION 218 との関係（1 つに決める）

**先に決定218 Human QA を現行 visual で完了する。**

- 218 の仮説は「今の画面で Setup→Payoff を感じるか」（mechanics の可視性）。223 Pilot を同時に入れると、「感じた」が mechanics 由来か演出由来か分離できない。
- 手順：**218 QA（baseline・4 問）→ 223 Pilot 実装 → 同じ 1 戦（大耀 × 龍神・同 seed）を演出ありで再 QA（§15）→ 差分を記録**。
- 218 の結果が「4 問 YES」でも 223 は実施する（見えていても「鮮やか」ではない可能性）。「4 問 NO」なら 223 より先に 218 の L1／L2（4 の目印・枚数表示）を検討する。
- Preview：`dist/assets/index-X7cOlknS.js`（決定222 close-out の clean build・決定218 と同一ハッシュ）。起動前に `npm run build` の出力ハッシュが一致することを確認するだけでよい（再ビルド不要の可能性が高いが、確認は必須）。

---

## 15. HUMAN QA SUCCESS CRITERIA（最大 5・Pilot 実装後）

同じ構成（大耀 × 蒼海の龍神・ふつう・推奨デッキ・OTOMO 能力なし）・可能なら 218 と同 seed。順番のコツは説明しない。

| # | 問い | 成功 |
|---|---|---|
| Q1 | 共振／一心不乱を出したあと、『豪快な一撃』（または剛撃）が**光った瞬間に気づいた**か | YES |
| Q2 | 撃ったとき、**⚡の追加ダメージが「決まった」と分かった**か（本体と別の一撃として） | YES |
| Q3 | それが**自分の順番の選択の結果**だと分かったか | YES |
| Q4 | カードを出してから敵が受けるまでが**一続き**に感じたか（途切れ・待ちを感じなかったか） | YES |
| Q5 | 演出のせいで**テンポが悪くなった／目障り**だったか | NO |

補助観察（誘導しない）：光ったカードを次に選んだか／⚡を狙って順番を変えた回数／PAYOFF 中に次のカードへ手が伸びたか。ブラインドは不要（操作起因の演出は因果を測る）。

## 16. RETREAT CONDITIONS

次のいずれかで Pilot を撤去し、docs に記録する：
1. Q1・Q2・Q3 のいずれかが NO（気づかない／決まった感がない／自分の結果と思えない）
2. Q5 が YES（テンポ・目障り）
3. 実測で入力ブロック増分 >0ms、または 390×844 で long task が Before より増える
4. `src/core` 差分 ≠0、golden 変化、既存テスト（vitest 全件）に FAIL
5. reduced-motion で情報（⚡数字・callout）が失われる

撤去時の禁止：強度アップ・時間延長・動画化・キャラ rig への横滑り。撤去後は決定217／218 のゲームループ側（L1／L2）へ戻る。撤去は明示パスの `git checkout --`／削除で行い、`git reset --hard`／`git clean -fd` は使わない。

## 17. NEXT NOW（1 つ）

**決定218 Human QA を実施する**（大耀 × 蒼海の龍神・ふつう・推奨デッキ・4 問）。その結果を持って本書 §7〜§12 の Pilot 実装へ進む。

---

## 18. PILOT STORYBOARD（『豪快な一撃』charged・commit＝0ms・必要な段階のみ）

前提：R3 以降・共鳴 2・手札に 共振（1AP・共鳴+2）と 豪快な一撃（2AP・140＋自傷 20・共鳴 4 以上で +40）。

| 時刻 | 段階 | 画面 | 音 | 入力 |
|---|---|---|---|---|
| −∞ | CALM | 豪快な一撃は通常表示（bonus 行は灰） | — | 可 |
| −2,000〜 | SETUP | 共振をタップ → card-play 0.28s → cast-flash（共鳴・回転）→ ゲージ 2→4 | card_play・resonance_gain | cast 280ms ブロック |
| **−1,700** | **READY** | 手札の豪快な一撃が**点火**：枠に金の rim light が 400ms で一周・2px 持ち上がったまま・コスト珠が一瞬光る・bonus 行が金に | 無音 | 可（思考中） |
| −1,700〜0 | SELECT | プレイヤーが選ぶ（hover lift／press 1px） | — | 可 |
| 0 | COMMIT | タップ → card-play 0.28s・cast-flash（攻撃・斬り込み）・神 wind-up 220ms | card_play | 280ms ブロック（既存） |
| +90 | RELEASE→IMPACT | god-strike 最前・本体 140 着弾：hit stop 45ms（L3）・shake・30px 数字・HP lag | hit_l3 0.8 | 可 |
| **+240** | **PAYOFF** | ⚡+40 着弾：**hit stop 40ms**・敵に**金 ring 0.42s**・**30px 金の「⚡-40」**・callout「⚡ 条件成立／共鳴4以上」0.7s | **bonus_payoff 0.7** | 可 |
| +240〜+840 | RETURN | ring 消滅・数字上昇・callout フェード。次のカードは +280 から既に押せる | — | 可 |

追加された可視時間：READY 400ms（非ブロック）＋PAYOFF tail 600ms（非ブロック）。**入力ブロック増分 0ms**。神の一撃と同一バッチなら PAYOFF は省略（Tier 5 優先）。

---

## 19. COMMERCIAL QUALITY REALITY CHECK

同じ制作予算に見える必要はない。「小規模でも意図的に作られた商用品質」に見える最低線：

| 最低線 | SEVEN GODS の現在地 | 本 Pilot で埋まるか |
|---|---|---|
| 1 すべての操作に 100ms 以内の返答がある | 決定200 で達成（press 60ms） | — |
| 2 成功の大きさと演出の強さが単調増加している（階層の逆転がない） | **⚡ で逆転** | **埋まる** |
| 3 カードが「物」に見える瞬間が 1 つ以上ある | なし | **READY で 1 つできる** |
| 4 1 戦に必ず来る見せ場が構造化されている | 神の一撃・撃破はある。「解けた」はない | **埋まる** |
| 5 画面内の素材の画風が揃っている | 敵と神で割れる | 埋まらない（G-C・別監査） |
| 6 音が設計されている（合成トーンではない） | 合成 20 種 | 1 音のみ。SE 再設計は別 milestone |
| 7 常時動くものは「動くことが報酬」の場所にだけある | 達成（背景は静止・カードは静止） | — |

AAA を表面的に真似して制作量が爆発する案（60 枚 animated card・7 神 rig・全面 3D・動画背景）はすべて不採用。

---

## 20. 記録

- runtime／assets／画像生成／H3／fal.ai／課金／commit／merge／push／deploy／Ranking／Neon／secrets：**すべて 0**
- 決定220／222 の scratchpad 実装コピーは読むだけ。cleanup していない
- 本書は未 commit。`docs/DECISIONS.md` への決定223 行の追記も未実施（CEO 承認後に PM が行う）
- Benchmark の E／H／I／M／O／P 層は一次情報が取れなかったため「未確認」。数値化された一次情報は Hearthstone のトリガー 0.8s→0.2s のみ
- 初回監査（`DECISION223_MOTION_STRATEGY_RED_TEAM.md`）との差分：Pilot を「⚡ Payoff Moment」から **「READY→PAYOFF の 2 段」**へ拡張（CEO 観察「通常状態と特別状態の演出強度差」「カードを物体として扱う」を READY で受ける）。他の結論（Living Background 終了・H3 不使用・218 先行・video 不要）は同じ
