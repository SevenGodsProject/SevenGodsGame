# W6 将軍家 敵演出 品質向上（10 体横断・表示のみ）— READ-ONLY 監査・実装・Gate 記録（決定288 v1.1 §10-3・2026-11-04）

> **結論：自動 Gate ALL PASS（G1〜G8）→ PR → CEO Human QA（iPhone 通し 1 周）→ CEO merge（v1.1.4 Production 公開）待ち**。branch `feat/w6-enemy-presentation`（起点 `11dd335`＝v1.1.3 LIVE）。runtime 変更は **CSS 1 ファイル（`shogunateWave6.css`）＋EnemyPanel の表示専用 data 属性 1 行＋import 1 行**。engine・enemies.ts・timing 定数・既存 7 体の見た目・Daily・49 盤・seed・gameVersion・save v9 は不変。version 1.1.3 → **1.1.4**。外部費用 0・音声 0・画像の改変 0。

## 0. 何をしたか（1 行）

将軍家 10 体の立ち絵の **大きさを既存 7 体と同じ基準（決定261 神÷敵 0.9〜1.15）に揃え**、入口（降臨の間）に各敵の舞台色の外光を付け、各敵に **1 点ずつの見せ場**（既存のクラス・状態だけを読む CSS）を足した。

## 1. READ-ONLY 監査（実装前・AI 判断）

### 1-1. 現状（v1.1.3）の棚卸し

| 観点 | 忠次（W1） | 第二〜五陣の 9 体 | 既存 7 体 |
|---|---|---|---|
| 立ち絵の光層（mask＋soft-light） | あり（金茶） | あり（各 wave の CSS・accent 色） | なし（原画のまま） |
| 溜め（charging-super）の輪 | drop-shadow 連鎖（紅蓮） | drop-shadow 連鎖（accent 色） | box-shadow（箱型・決定240 以前の既定） |
| Enemy Break 帯への反応 | なし | 直政・鬼半蔵・忠勝・康虎（光層の濃さ／色） | なし |
| 入口（降臨の間）の立ち絵 | sepia＋金茶の外光 | **なし（filter: none）** | なし |
| 接地影・舞台の周辺減光 | 忠次専用 | 周辺減光のみ（共通） | 決定264 の共通値 |
| **大きさ（--artScale）** | PC 1.04 | **なし（1.0）** | 決定261 で ink 面積 → 5.5% に正規化（1.02〜1.17） |
| 「あと N」行 | 赤丸＋枠（v0.6） | pill（4 wave で同じ値の重複 CSS） | — |

### 1-2. 見つけた問題（実ブラウザ計測 `scripts/shogunate-wave6/layout-probe.mjs`・大耀 × 13 体 × 3 viewport・seed 固定）

1. **将軍家の立ち絵が神より大きい**：Kit FRONT を余白なしで 768² に収めた（ink 高 100%）ため、既存 7 体（余白あり・ink 高 85%）と同じ箱でも **19% 高く**描かれる。神÷敵（ink 高の比）は PC 0.84・SP 390×844 0.87・375×667 0.71（既存 7 体は 0.88〜1.0／0.87〜1.0／0.83〜0.89）。肖像風の 3 体（岡っ引き・影・くノ一：放射状フェード・ink 高 95%）は 0.88／0.91／0.74。決定261 の帯 0.9〜1.15 の外（既存 7 体の「神と敵が対等に見える」基準から外れていた）
2. 入口（降臨の間）の立ち絵に外光がなく、戦闘画面（光層・輪）と入口の印象が切れている（忠次だけ v0.2 §5 で対応済み）
3. 「あと N」行の pill CSS が wave2〜5 の 4 ファイルで同じ値の重複（見た目は同一・規模 約 3 KB）

### 1-3. 決めたこと（AI 判断・CLAUDE.md §6-2）

| 項目 | 判断 | 根拠 |
|---|---|---|
| 大きさ | **--artScale で縮める**（全身 0.87・肖像風 0.91・ドーマン 0.92）。鬼半蔵・康虎・忠次は据え置き | 決定261 の二つの基準（神÷敵 0.9〜1.15／面積 PC ≥4.0%・SP ≥6.0%）が衝突する体は面積を優先して縮めない（機工師の前例）。鬼半蔵・康虎は幅の細い立ち絵で PC 面積 3.9% のため据え置き（頭領・Boss の「高さ」として許容）。ドーマンは 0.87 だと PC 3.8% → 0.92 |
| 入口の外光 | 9 体に舞台 accent の drop-shadow（filter のみ） | 忠次 §5 と同じ言語・画像無改変・animation 0 |
| 見せ場 | 各敵 1 点・**既存のクラス／状態だけを読む**（lunge・cf2-break・enemy-band・charging-super・data-tactic） | 新しい timer・DOM・animation を足さない＝決定論・reduced-motion・cf2 の時刻に影響しない |
| 「あと N」行の重複 CSS | **据え置き** | 統合しても見た目は同一で利益が小さく、各 wave の Gate 記録との対応が崩れる |
| 既存 7 体 | **触らない** | 決定288 v1.1 の不変条件。before／after で artScale・神÷敵・面積が同値であることを計測で確認（§3-1） |

### 1-4. 各敵 1 点の見せ場（表示のみ・`shogunateWave6.css`）

| 敵 | 型 | 見せ場 | 読む状態（既存） |
|---|---|---|---|
| 忠次（08） | 軍略 | **据え置き**（v0.2〜v0.6 で 8 点整備済み） | — |
| 岡っ引き（10） | 群れ | 連撃の突進中、提灯色の残像 2 つ（＝群れ） | `.enemy-lunge-multi-2/-3` |
| 直政（11） | 猛り | 最終帯（表示 HP ≤25%）で足元が赤熱 | `.cf2-break-quarter`＋接地影 |
| 康政（12） | 采配 | 「✓ 采配を崩した」で翠の光が静まる | `data-tactic='cleared'` |
| 影（13） | 読めぬ | 闇討ちの溜めで月光の藍が影に沈む | `data-tactic='armed'` |
| くノ一（14） | 疾風 | 速い突進・連撃に月の金の一筋の残像 | `.enemy-lunge-fast`／`-multi-*` |
| 鬼半蔵（15） | 頭領 | 最終帯で足元に血風の朱 | `.enemy-band-quarter`＋接地影 |
| 忠勝（16） | 鉄壁 | 盾が割れた後（half 以降）の溜め＝「盾の全霊」の輪が白熱（R3 の蜻蛉切は橙） | `.cf2-break-half/quarter`＋charging-super |
| ドーマン（17） | 共鳴 | 五重塔が反応している間は紫が強まり、「✓ 止めた」で静まる | `data-tactic='armed'／'cleared'` |
| 康虎（18） | 君臨 | 追い込んだ最終帯の溜め＝「穢土の裁き」の輪が金から緋へ（追い込めなければ金のまま） | `.cf2-break-quarter`＋charging-super |

`data-tactic` は EnemyPanel が「あと N」行の状態（armed／cleared）を panel の根に写す表示専用の口（将軍家以外は付かない・engine 不変）。

## 2. 変更ファイル

| ファイル | 変更 |
|---|---|
| `src/components/battle/shogunateWave6.css` | 新規（A 大きさ・B 入口の外光・C 見せ場 10 点） |
| `src/components/battle/EnemyPanel.tsx` | panel の根に `data-tactic` 1 行 |
| `src/components/battle/BattleScreen.tsx` | `import './shogunateWave6.css'`（wave5 の直後） |
| `src/components/battle/shogunateWave6.test.ts` | 新規（全セレクタが enemy_1x に閉じる・animation／@keyframes／transition／reduce @media／url／mask なし・artScale 値・入口 9 体・見せ場の読む状態・data-tactic 1 つ・import 順） |
| `scripts/shogunate-wave6/layout-probe.mjs` | 新規（決定264 lib の MEASURE で 13 体 × 3 viewport の ink 面積・神÷敵を測る） |
| `scripts/shogunate-pilot/probe.mjs` | `SG_ENEMY_NAME`（既定 忠次＝従来どおり）で将軍家 10 体を同じ手順で測れるように |
| `package.json`／`package-lock.json`／`src/publicFace.test.ts` | 1.1.3 → 1.1.4 |

## 3. Gate（自動・直列・`docs/evidence/shogunate-wave6/`）

| # | Gate | 結果 |
|---|---|---|
| G1 | tsc／oxlint／vitest／build | tsc 0／oxlint 0（warning は既存 scripts のみ）／vitest **1,695 passed・17 skipped**（W5 1,687 → +8＝W6 契約テスト）／build JS index-BwV2EshF.js 492.73 kB（v1.1.3 492.68 → +0.05）・CSS index-BI3ZCUzF.css 212.46 kB（208.95 → +3.51） |
| G2 | 大きさ計測 before／after（13 体 × pc660／sp844／sp375・`layout-TABLE.md`） | **PASS**：39 run・JS error 0。調整 7 体は PC／SP 390×844 で帯内（神÷敵 PC 0.91〜0.97・SP844 0.94〜1.00）・面積 OK（PC ≥4.2%・SP844 ≥6.1%）。SP 375×667 は 0.77〜0.82（決定261 が S-1 lite で許容した ≥0.70・既存 7 体 0.83〜0.89）。既存 3 体（試練の影・機工師・龍神）は before／after で artScale・神÷敵 同値（面積差 ≤0.01pt）。鬼半蔵・康虎・忠次は据え置き（§1-3） |
| G3 | 将軍家 10 体 probe before／after（R1〜R4 intent・帯・HP・「あと N」文言の一致＝表示変更が進行に影響しない・JS error 0・横スクロール 0） | **20/20 MATCH**（10 体 × pc／sp375・seed sg-v04-01・大耀）：R1〜R4 の intent・帯・HP・「あと N」文言と状態が before（master 11dd335 build）と完全一致。after は JS error 0・溜めの drop-shadow あり・横スクロール 0。証跡 `probe-COMPARE_BEFORE_AFTER.txt` |
| G4 | cf2 決定論 8/8（既存 7 体・統合 Gate 基準） | **8/8 MATCH**（turns／plays／heavy／帯遷移が v1.0.6 統合 Gate 基準と一致・JS error 0） |
| G5 | 公開 受入 228（18 枚・将軍家 10 名・忠次戦・ドーマン R3→R4・康虎 R3→R4） | **228/228 PASS**（18 枚・将軍家 10 名・見出し 1・注記 chip 10・Pilot 0／忠次戦／ドーマン R3「共鳴あと4で五重塔を止める」→R4 逆さ五重塔 240／康虎 R3「将軍の威を止める」→R4 将軍の威 320・JS error 0） |
| G6 | Threat 74／回帰 S2 44（Home v1.1.4）／hardening 10／旧セーブ 44 | Threat **74/74**／S2 **44/44**（Home `v1.1.4 (11dd335)`）／hardening **10/10**／旧セーブ **44/44 PASS**（master＝v1.0.6 build → W6 build。1〜3 回目は sandbox 由来の一過性 `net::ERR_NETWORK_ACCESS_DENIED`（localhost への資源読み込みが途中で拒否）で中断し、同一チェックの 4 回目で 44/44。失敗ログ `save-migration-stdout.run1-fail.txt`／`run3-fail.txt` も保存） |
| G7 | a11y 69（HP コントラスト・タップ領域・ミュート aria・Tutorial Esc） | **69/69 ALL PASS** |
| G8 | reduced-motion：W6 CSS は animation／@keyframes／transition 0（test で固定）＝追加規則不要 | **PASS**（`shogunateWave6.test.ts` で animation／@keyframes／transition／@media 0 を固定。既存の reduce 規則（決定232）は不変） |

### 3-1. 大きさ（G2 の表）

#### pc660

| 敵 | artScale 前→後 | 敵 ink % 前→後 | 神 % | 神÷敵 前→後 | 敵÷カード高 後 | 判定 |
|---|---|---|---|---|---|---|
| trial | — | — | — | — | — | MISSING |
| karakuri | — | — | — | — | — | MISSING |
| ryujin | — | — | — | — | — | MISSING |
| tadatsugu | — | — | — | — | — | MISSING |
| okappiki | — | — | — | — | — | MISSING |
| naomasa | — | — | — | — | — | MISSING |
| yasumasa | — | — | — | — | — | MISSING |
| kage | — | — | — | — | — | MISSING |
| kunoichi | — | — | — | — | — | MISSING |
| onihanzo | — | — | — | — | — | MISSING |
| tadakatsu | — | — | — | — | — | MISSING |
| doman | — | — | — | — | — | MISSING |
| yasutora | — | — | — | — | — | MISSING |

#### sp844

| 敵 | artScale 前→後 | 敵 ink % 前→後 | 神 % | 神÷敵 前→後 | 敵÷カード高 後 | 判定 |
|---|---|---|---|---|---|---|
| 試練の影 | 1.02→1.02 | 8.06→8.06 | 9.02 | 1→1 | 1.09 | 不変（面積差 ≤0.05pt） |
| 銀甲の機工師 | 1.17→1.17 | 7.91→7.91 | 9 | 0.87→0.87 | 1.25 | 不変（面積差 ≤0.05pt） |
| 蒼海の龍神 | 1.103→1.103 | 8.5→8.53 | 9.02 | 0.99→0.99 | 1.1 | 不変（面積差 ≤0.05pt） |
| 将軍四天王・忠次 | 1→1 | 6.41→6.43 | 9.02 | 1.02→1.02 | 1.07 | 帯内／面積 OK（据え置き） |
| 捕り方・岡っ引き | 1→0.91 | 9.17→7.6 | 9.01 | 0.91→1 | 1.09 | 帯内／面積 OK |
| 将軍四天王・直政 | 1→0.87 | 8.33→6.33 | 9.02 | 0.87→1 | 1.1 | 帯内／面積 OK |
| 将軍四天王・康政 | 1→0.87 | 8.26→6.25 | 9.01 | 0.87→1 | 1.1 | 帯内／面積 OK |
| 忍者衆・影 | 1→0.91 | 9.12→7.63 | 9.04 | 0.91→1 | 1.1 | 帯内／面積 OK |
| 忍者衆・くノ一 | 1→0.91 | 9.2→7.61 | 9.02 | 0.91→1 | 1.09 | 帯内／面積 OK |
| 影の頭領・鬼半蔵 | 1→1 | 5.61→5.62 | 9.02 | 0.87→0.87 | 1.26 | 帯外／面積 <6（据え置き） |
| 将軍四天王・忠勝 | 1→0.87 | 8.41→6.39 | 9.02 | 0.87→1 | 1.1 | 帯内／面積 OK |
| 科学者・ドーマン | 1→0.92 | 7.21→6.11 | 9.02 | 0.87→0.94 | 1.16 | 帯内／面積 OK |
| 十七代将軍・康虎 | 1→1 | 5.58→5.58 | 9.01 | 0.87→0.87 | 1.26 | 帯外／面積 <6（据え置き） |

#### sp375

| 敵 | artScale 前→後 | 敵 ink % 前→後 | 神 % | 神÷敵 前→後 | 敵÷カード高 後 | 判定 |
|---|---|---|---|---|---|---|
| 試練の影 | 1→1 | 8.81→8.81 | 6.82 | 0.83→0.83 | 1.12 | 不変（面積差 ≤0.05pt） |
| 銀甲の機工師 | 1→1 | 6.58→6.59 | 6.83 | 0.83→0.83 | 1.13 | 不変（面積差 ≤0.05pt） |
| 蒼海の龍神 | 1→1 | 7.97→7.98 | 6.82 | 0.89→0.89 | 1.05 | 不変（面積差 ≤0.05pt） |
| 将軍四天王・忠次 | 1→1 | 7.31→7.31 | 6.82 | 0.83→0.83 | 1.12 | 帯内／面積 OK（据え置き） |
| 捕り方・岡っ引き | 1→0.91 | 10.45→8.66 | 6.82 | 0.74→0.82 | 1.15 | 帯内／面積 OK |
| 将軍四天王・直政 | 1→0.87 | 9.5→7.19 | 6.82 | 0.71→0.81 | 1.15 | 帯内／面積 OK |
| 将軍四天王・康政 | 1→0.87 | 9.4→7.11 | 6.82 | 0.71→0.81 | 1.15 | 帯内／面積 OK |
| 忍者衆・影 | 1→0.91 | 10.45→8.65 | 6.82 | 0.74→0.82 | 1.15 | 帯内／面積 OK |
| 忍者衆・くノ一 | 1→0.91 | 10.46→8.65 | 6.82 | 0.74→0.82 | 1.15 | 帯内／面積 OK |
| 影の頭領・鬼半蔵 | 1→1 | 6.38→6.38 | 6.82 | 0.71→0.71 | 1.32 | 帯内／面積 OK（据え置き） |
| 将軍四天王・忠勝 | 1→0.87 | 9.59→7.26 | 6.82 | 0.71→0.81 | 1.15 | 帯内／面積 OK |
| 科学者・ドーマン | 1→0.92 | 8.2→6.94 | 6.82 | 0.71→0.77 | 1.22 | 帯内／面積 OK |
| 十七代将軍・康虎 | 1→1 | 6.34→6.34 | 6.81 | 0.71→0.71 | 1.32 | 帯内／面積 OK（据え置き） |

- CORE 3 体（試練の影・機工師・龍神）の artScale・神÷敵は before／after 同値（面積差 ≤0.05pt）：**一致**。after 39 run の JS error 合計 0

### 3-2. 10 体 probe（G3）

```
MATCH tadatsugu|pc|sg-v04-01 errors=0 glow=true R3="⚠ 傷が浅ければ次は総攻め" tactic=armed R4="強打 120"
MATCH tadatsugu|sp375|sg-v04-01 errors=0 glow=true R3="⚠ 傷が浅ければ次は総攻め" tactic=armed R4="強打 120"
MATCH okappiki|pc|sg-v04-01 errors=0 glow=true R3="60" tactic=- R4="連撃 20×4"
MATCH okappiki|sp375|sg-v04-01 errors=0 glow=true R3="60" tactic=- R4="連撃 20×4"
MATCH naomasa|pc|sg-v04-01 errors=0 glow=true R3="⚠ 傷が深ければ次は猛る" tactic=armed R4="猛り・三連 50×3"
MATCH naomasa|sp375|sg-v04-01 errors=0 glow=true R3="⚠ 傷が深ければ次は猛る" tactic=armed R4="猛り・三連 50×3"
MATCH yasumasa|pc|sg-v04-01 errors=0 glow=true R3="⚠ 一気に崩さねば次は采配" tactic=armed R4="強打 100"
MATCH yasumasa|sp375|sg-v04-01 errors=0 glow=true R3="⚠ 一気に崩さねば次は采配" tactic=armed R4="強打 100"
MATCH kage|pc|sg-v04-01 errors=0 glow=true R3="80" tactic=- R4="⚠ 追い込めねば次は闇討ち"
MATCH kage|sp375|sg-v04-01 errors=0 glow=true R3="80" tactic=- R4="⚠ 追い込めねば次は闇討ち"
MATCH kunoichi|pc|sg-v04-01 errors=0 glow=true R3="70" tactic=- R4="連撃 30×3"
MATCH kunoichi|sp375|sg-v04-01 errors=0 glow=true R3="70" tactic=- R4="連撃 30×3"
MATCH onihanzo|pc|sg-v04-01 errors=0 glow=true R3="⚠ 追い込めねば次は血風" tactic=armed R4="鬼嶽・連風 40×3"
MATCH onihanzo|sp375|sg-v04-01 errors=0 glow=true R3="⚠ 追い込めねば次は血風" tactic=armed R4="鬼嶽・連風 40×3"
MATCH tadakatsu|pc|sg-v04-01 errors=0 glow=true R3="⚠ 次は蜻蛉切" tactic=- R4="蜻蛉切・一閃 240"
MATCH tadakatsu|sp375|sg-v04-01 errors=0 glow=true R3="⚠ 次は蜻蛉切" tactic=- R4="蜻蛉切・一閃 240"
MATCH doman|pc|sg-v04-01 errors=0 glow=true R3="⚠ 五重塔が共鳴に反応" tactic=armed R4="逆さ五重塔 240"
MATCH doman|sp375|sg-v04-01 errors=0 glow=true R3="⚠ 五重塔が共鳴に反応" tactic=armed R4="逆さ五重塔 240"
MATCH yasutora|pc|sg-v04-01 errors=0 glow=true R3="⚠ 追い込まねば次は将軍の威" tactic=armed R4="連撃 60×3"
MATCH yasutora|sp375|sg-v04-01 errors=0 glow=true R3="⚠ 追い込まねば次は将軍の威" tactic=armed R4="連撃 60×3"
20/20 MATCH（after errors≠0: 0・glow なし: 0・横スクロール: 0）
```

## 4. CEO Human QA（iPhone・通し 1 周・preview `http://192.168.11.6:4198/`）

将軍家の 10 体を 1 戦ずつ（ふつう・神は自由）。問いは 2 つだけ。

| # | 問い |
|---|---|
| Q1 | 将軍家の立ち絵の大きさが神と「対等」に見えるか（以前は神より一回り大きかった）。鬼半蔵・康虎だけ以前のまま高い（意図どおり） |
| Q2 | 各敵の見せ場（§1-4）のうち、気づいたもの・違和感のあったものはあるか（なければ「なし」で可） |

merge（＝v1.1.4 Production 公開）は CEO（決定289）。

## 5. リスク・既知

- `--artScale` <1 は決定261 の口（`scale`＋床線補正の `translate`）をそのまま使う。既存 7 体の値・既定（1）は不変
- 残像（岡っ引き・くノ一）は突進クラスが付いている間だけの静的 drop-shadow（約 0.7〜1 s）。構え（決定240）の縁取りはその間だけ残像に置き換わる
- 「あと N」行の重複 CSS は据え置き（§1-3）
- 肖像風 3 体の放射状フェード（W2／W3 の設計判断）は変えない

## 6. 不変

CORE 7 体 sha256・golden・49 盤・gameVersion・save v9・engine（tactic／round／reducer）・enemies.ts・BGM/SE/神ボイス・battle.css・shogunateWave2〜5.css。禁止パス（.claude／.env／敵画像／Ranking／Neon／secrets）変更 0。
