# Decision248 — 提案 Reaction Primitive 表（v1・設計のみ・実装なし）

方針：60 枚 → **7 semantic** → **6 primitive**（うち 2 つは既存を「そのまま使う」、4 つが新規）。⚡PAYOFF・神の一撃・撃破は既存のまま（上位 Tier）。数値はすべて「候補値」。実装時は Fast Gate で実測して確定する。

## 1. semantic → primitive

| semantic（枚数） | primitive | 主体 | 既存／新規 | 補助（HUD） |
|---|---|---|---|---|
| STRIKE（20） | **P1 STRIKE** | God → Enemy | 既存（決定232 ladder） | 既存のまま |
| GUARD（11） | **P2 BRACE** | God | 新規 | 盾バッジ pulse（既存・そのまま） |
| MEND（9） | **P3 BREATHE** | God（＋OTOMO 小） | 新規 | HP バー pulse・数字（既存） |
| WEAKEN（7） | **P4 STAGGER** | Enemy | 新規 | 敵バフ欄・予告値（既存） |
| ATTUNE（6）＋EMPOWER（2） | **P5 RISE** | God（＋OTOMO 小・ATTUNE のみ） | 新規 | ゲージ fill／バフバッジ（既存） |
| TEMPO（5） | **P6 DEAL** | Hand／Card | 新規 | ミニ結果「カード+n／神力+n」（既存） |
| modifier RISK（3） | 既存の自傷揺れ | God | 既存 | — |
| modifier PAYOFF（23） | 既存 ⚡（Tier 2） | Enemy＋数字 | 既存 | — |
| 神の一撃／撃破 | 既存（Tier 3） | God＋OTOMO＋Enemy＋Arena | 既存 | — |

複合札（secondary あり・24 枚）の規則：**体の反応は primary の 1 つだけ**。secondary は HUD の既存反応（バッジ・ゲージ・数字）だけで表す。例：反撃の刃（STRIKE＋GUARD）＝突き＋盾バッジ pulse、守りの陣（GUARD＋MEND）＝BRACE＋HP バー pulse。

## 2. primitive の設計（候補値）

| primitive | 動き | 時刻（commit＝0） | 時間 | 強度 | 頻度／戦（reader・ふつう平均） | 割込み | 重なり | reduced-motion |
|---|---|---|---|---|---|---|---|---|
| P1 STRIKE | 既存：構え −7px → 突き 18px（tier≥3：引き 13px→28px・溜め 150ms）→ 敵 stop／kb／揺れ／数字 | 90／150 | 340〜520ms | L1〜L4（既存） | 5.6 | 既存どおり | 既存どおり | 既存どおり（突き無し・閃光のみ） |
| **P2 BRACE** | 神の立ち絵が**相手と反対へ 4px 沈み込み**（`--atk-x` の逆向き＋`translateY` 2px）・scale 0.98 → 戻る。同時に立ち絵の前面に**盾色（#7fb2ff）のリム**を 1 回（既存 `--d240-*` と同じ「drop-shadow を変数で差し替える」手法を神側に用意） | 0 | 320ms | Tier 1（4px・数字なし・stop なし） | 1.6 | 次の commit（≥280ms 後）で key 再マウント＝置換 | STRIKE と同一バッチ（反撃の刃）は STRIKE 優先・BRACE は出さない | リムの 120ms フェードのみ（transform 0） |
| **P3 BREATHE** | 神の立ち絵が **3px 持ち上がり**（`translateY`）・scale 1.02 → 戻る＋緑（#4dbd74・既存 heal-pulse 色）のリム。OTOMO は `otomo-reaction-pop` の **小型版**（scale 1.06・3px・0.35s・ラベル無し） | 0 | 400ms（OTOMO 350ms） | Tier 1 | 0.6 | 置換 | MEND＋ATTUNE（恵比寿顔・巫女の舞）は BREATHE のみ・ゲージ fill は既存 | リムのみ |
| **P4 STAGGER** | 敵の**反応 wrapper**（`.enemy-reaction`・立ち絵の外側）に `react-weaken`：**横に ±3px のよろめき** 2 往復＋wrapper の `filter: brightness(0.78)` → 戻る（内側 `.enemy-avatar` の filter（決定240 の構え・STAGE-LITE の影）には触れない） | 0 | 360ms | Tier 1（kb 0・stop 0・数字なし） | 1.2 | 置換 | 同一バッチに STRIKE（からかい半分）→ STRIKE 優先・STAGGER なし | brightness の 120ms フェードのみ |
| **P5 RISE** | 神の立ち絵が scale 1.03・`translateY` −2px → 戻る＋**外へ広がるリム**：ATTUNE＝共鳴色（#c39bff・既存 otomo-reaction 色）、EMPOWER＝金（#ffd166）。ATTUNE では OTOMO 小型 pop（P3 と同じ） | 0 | 400ms | Tier 1 | 1.2（ATTUNE）＋0.2（EMPOWER） | 置換 | 共鳴 7 到達（BURST）が同一バッチなら RISE を出さない（既存カットインへ譲る） | リムのみ |
| **P6 DEAL** | 引いた札が**手札の下 8px から 160ms で立ち上がる**（`translateY`＋opacity・後続 1 枚ごとに +40ms）。AP 増加は AP バーの既存幅遷移に **1 回の明滅**（`brightness`・200ms）を足す | 0（描画時） | 160〜240ms | Tier 0〜1 | 0.9 | 置換 | 開幕ドロー 5 枚・ラウンド開始 2 枚も同じ DEAL で統一（frequency 高・短く） | 立ち上がり無し・opacity 120ms |

## 3. Interaction Laws との照合

| 法則 | P2〜P6 での守り方 |
|---|---|
| 1 pressable things sink | カードの押下は既存（決定200／233）。P2〜P6 は押下ではなく結果の反応なので沈ませない |
| 2 stronger hits feel heavier in time | 時間差（stop）は STRIKE／⚡／神の一撃にだけ残す。P2〜P6 は stop 0＝「軽い」ことが階層を守る |
| 3 important success responds visually/audio/time | ⚡と神の一撃が「重要な成功」。P2〜P6 は視覚のみ（音は既存 SE のまま追加しない） |
| 4 anticipation → tension → reveal | cast 280ms（閃光・飛翔）＝anticipation、commit＝reveal。P2〜P6 は reveal の側だけに置く |
| 5 repeats are short | 最頻の P1／P6 は ≤340／240ms。P2〜P5 も ≤400ms・次の commit（≥280ms）で置換 |
| 6 presentation does not change outcome | すべて表示クラス／key の再マウント。engine・reducer・入力ロック時間（280ms）に触れない |
| 7 frequency × intensity | 1 戦の合計：STRIKE 5.6×L1〜L4、その他 5.7×Tier 1。Tier 1 は 4px・400ms 以内・数字なし |

## 4. 実装面の置き場所（見積もりのため）

| 変更 | ファイル | 規模 |
|---|---|---|
| semantic 判定（純関数・効果データから。カード名で分岐しない） | `src/components/battle/cardSemantic.ts`（新規）＋test | 60〜80 行 |
| fx key 追加：`braceKey`／`breatheKey`／`staggerKey`／`riseKey`（色）／`dealKey`（枚数） | `useBattleFx.ts` | 30〜40 行 |
| 神の立ち絵にクラス（brace／breathe／rise）と `--rl-rim` 変数 | `PlayerPanel.tsx` | 10〜15 行 |
| 敵 wrapper に `react-weaken` | `EnemyPanel.tsx`＋`combatTimeline.ts`（reaction plan に weaken を 1 種追加） | 15〜25 行 |
| OTOMO 小型 pop | `GodOtomoPanel.tsx` | 10 行 |
| DEAL：手札の新規 uid に `card-view-dealt`（描画時 1 回） | `BattleScreen.tsx` または `CardView.tsx` | 15〜20 行 |
| CSS：keyframes 5 本＋規則 12〜16＋reduce 1 ブロック（末尾追記・既存は消さない） | `battle.css` | 110〜140 行 |
| tests：semantic 60/60・unknown 0・fx key・reduce | `*.test.ts` | 60〜80 行 |
| 合計 | 7〜8 ファイル | **≈300〜400 行**（runtime ≈220・test ≈100） |

bundle 見込み：CSS +2.5〜3.5KB・JS +1.0〜1.5KB（gzip +1KB 前後）。新規画像・音・依存 0。
