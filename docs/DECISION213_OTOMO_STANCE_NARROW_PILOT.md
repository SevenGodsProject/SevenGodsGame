# 決定213 — OTOMO Strategic Identity v0.1「Stance Narrow Pilot」（鯛丸 × 双牙の魔獣／銀甲の機工師）

- 日付：実装 2026-09-20／Automated QA・記録 2026-09-22
- 区分：Pilot 着手は **CEO指示**（決定212 GO 後）。Automated QA の再開と「現仕様のまま Human QA まで固定」は **CEO指示**（2026-09-22）。実装細部・QA 方式・受け入れスクリプトの検出方法修正・判定は **AI判断**（CLAUDE.md §6-2）
- 上流：決定212（OTOMO Strategic Identity Audit・GO Narrow Pilot）、決定206（Solve Legibility）、決定196（同じ盤面でもう一度）、決定126（Seed 共有 `?seed=`）
- branch：`feat/otomo-stance-pilot`（local master `270b3e7` ＋ 決定212 audit の cherry-pick `f4d1745` の上）。Living Hero runtime 不含
- 制約：master `270b3e7`・origin/master＝Production `b0fbd3c` 不変。merge／push／deploy なし。Ranking／Neon／secrets／`.env` 変更なし
- **状態：HOLD — CEO Human QA（2026-09-22・Strategic Effect UX / Player Decision mismatch）**。Automated QA は PASS（§3〜§5・同日）。Root Cause と v0.2 推奨は §8〜§11

---

## 0. 結論（先に）

1. 鯛丸（恵比寿の OTOMO）にだけ「構え」2 種を追加した。敵を見た後（デッキ画面）に「構えなし／連撃の構え／溜めの構え」から 1 つ選び、その対局中ずっと有効。
2. 基礎 Gate（`tsc -b --noEmit`・clean build・`oxlint src`・vitest）と Automated QA（決定213 受け入れ 14/14、既存回帰 11 系統）はすべて PASS。
3. シミュレーションの成功指標 7 項目のうち **2 項目が未達**（魔獣の構え反応回数、共鳴発動回数）。CEO 指示により**効果量は変更せず**、Human QA で「判断が変わったか」を先に確かめる。
4. 構えを選ばない対局（未指定・旧セーブ・Daily・構えを持たない OTOMO）は従来と完全に同じ挙動（golden replay の決着不変・Save Migration PASS）。

## 1. 仕様（実装どおり）

| 項目 | 内容 |
| --- | --- |
| 対象 | 鯛丸のみ（`OtomoDef.stances`）。他 OTOMO は未定義＝選択肢が出ない |
| 連撃の構え `multiHit` | 敵の行動が連撃（multiAttack）のラウンド、各 hit を盾で**完全に受け切る**（HP 実害 0・ブロック消費 > 0）たび共鳴 +1。1 ラウンド最大 3 hit まで |
| 溜めの構え `charge` | 敵の予告が溜め（charge）のラウンド、攻撃カードの**素ダメージ** × 0.5（切り捨て）を追加ダメージとして与える（＝×1.5。神の得意技と同じ計算・同じ丸め） |
| 数値 | `RULES.otomoStance`（`enabled` kill switch・`multiHit.resonancePerHit=1`・`multiHit.maxHitsPerRound=3`・`charge.bonusRatio=0.5`）。データにも UI にも数値を書かない |
| engine | 新規 `src/core/engine/otomoStance.ts`（data-driven hook。OTOMO ID／構え ID の if 分岐で数値を書かない）。呼び出しは神の得意技と同じ 2 箇所：`playCard.ts`（afterPlay）・`endRound.ts`（afterEnemyTurn・ラウンド終了のブロックリセット前） |
| イベント | `OTOMO_STANCE_TRIGGERED`（stanceId・amount・hits）。直後に既存の `RESONANCE_GAINED`／`DAMAGE_DEALT` が続く |
| state／action | `GameState.otomoStance?`・`START_GAME.otomoStance?`（省略・`'none'`・その OTOMO に無い構え＝載せない）。**saveVersion 据え置き**（additive・旧セーブは undefined＝構えなし） |
| UI | デッキ画面に 3 択 radiogroup（役割タグ＋「この予告に強い」＋1 行説明）。既定は「構えなし」で、おすすめの強調・自動選択はしない。神域挑戦（Daily）では出さない。戦闘パネルに構えバッジ（反応する予告のラウンドは「反応中」）。反応時は callout（priority 2）とログ 1 行 |
| 同じ盤面でもう一度 | 構えを引き継ぐ（同じ seed＋同じ構え＝同じ盤面）。神を選び直すと「構えなし」に戻る |
| gameVersion | 指紋対象のデータが増えたため `1.80c6eda23ed082dc` → `1.adf8737336d86649`。engineVersion は据え置き（構え未指定の操作列は決着不変＝golden で確認） |

### 1-1. 決定212 §10 の変更予定からの差分（AI判断）

| 決定212 の予定 | 実装 | 理由 |
| --- | --- | --- |
| 他 OTOMO は `stances: []` | `stances?` 省略（未定義＝選べない） | 既存 6 OTOMO のデータを触らずに済み、差分と回帰リスクが最小 |
| hook を `round.ts`／`effects.ts` に | `playCard.ts`／`endRound.ts` | 神の得意技（`godPassive.ts`）と同じ位置・同じ流儀に揃え、発火順（得意技 → 構え → ラウンド終了）を明示するため |

## 2. 変更ファイル

- `src/core`：`types/otomo.ts`・`types/state.ts`・`types/action.ts`・`types/event.ts`・`types/index.ts`・`data/otomo.ts`・`data/rules.ts`・`engine/createInitialState.ts`・`engine/playCard.ts`・`engine/endRound.ts`・**新規** `engine/otomoStance.ts`・**新規** `engine/otomoStance.test.ts`（12 件）・`replay/gameVersion.test.ts`（golden 版のみ更新）
- UI：`components/GameFlow.tsx`・`components/setup/DeckBuilderScreen.tsx`・`components/setup/setup.css`・**新規** `components/setup/otomoStanceText.ts`・`components/battle/GodOtomoPanel.tsx`・`components/battle/BattleScreen.tsx`・`components/battle/decisionFeedback.ts`・`components/battle/formatEvent.ts`・`hooks/useGameEngine.ts`
- scripts：`scripts/decision213-stance-pilot/`（`stancePilot.audit.ts`・`vitest.audit.config.ts`・`acceptance.mjs`・`out/` の判定 JSON／md。スクリーンショットは commit しない）
- 不変ルール：`src/core` に Phaser／React import なし・`Math.random` なし・カード名／OTOMO 名の if で効果を書かない・数値は `rules.ts` に集約・saveVersion 維持（すべて順守）

## 3. 基礎 Gate（2026-09-22・コード無修正で実行）

| 項目 | 結果 |
| --- | --- |
| `npx tsc -b --noEmit`（正式 Gate。root tsconfig への `tsc --noEmit -p` は根拠にしない＝決定206 §3-2b） | **0 errors** |
| `npm run build`（`tsc -b && vite build`） | 成功（`index-cDvZWOTY.js` / `index-DolMHuew.css`） |
| `npx oxlint src` | **0 警告・0 エラー** |
| `npx vitest run --dir src` | **92 files / 1,169 tests 全通過**（決定206 時点 1,157 ＋ 構え 12） |
| `npx vitest run`（リポジトリ全体。`.claude/worktrees` の旧コピーを含む） | 261 passed・6 skipped／3,282 passed・9 skipped |

## 4. Automated QA（Playwright は 1 本ずつ順次）

- 決定213 Preview：`http://127.0.0.1:4184`（上記 clean build）
- Production 相当：`http://127.0.0.1:4181`（`git archive b0fbd3c` を作業ツリー外でビルド。配信 bundle は Production と同名の `index-4DPzUUkG.js` / `index-C-pQDi18.css`）

### 4-1. 決定213 受け入れ（`scripts/decision213-stance-pilot/acceptance.mjs`）— **PASS 14/14**

| ID | 内容 | 結果 |
| --- | --- | --- |
| S1-1〜3 | 鯛丸にだけ 3 択・既定「構えなし」・3 行表示・選択が保存 state に載る | PASS |
| S2-1〜2 | 大耀のデッキ画面・神域挑戦のデッキ画面に構え選択が出ない | PASS |
| S3-1〜2 | 魔獣 × 連撃の構え：バッジ「反応中」・受け切りで callout「連撃の構え！2発を受け切って共鳴+2」 | PASS |
| S4-1〜2 | 機工師 × 溜めの構え：R1 は反応中でなく R2（溜め）で反応中・攻撃札で callout「溜めの構え！溜めの隙に追加50ダメージ」 | PASS |
| **S4-3（追加）** | **決定論：同じ seed＋同じ構え＋同じ操作を 2 回 → 敵HP 85・自HP 28・スコア・共鳴・R・反応列が完全一致** | PASS |
| S5-1 | 鬼将 × 連撃の構え：バッジは出るが反応中にならず、callout 0（負の対照） | PASS |
| S6-1 | 敗北 →「同じ盤面でもう一度」で seed と構えが同一 | PASS |
| S7-1 | 初陣は構えなし（state・バッジとも無し） | PASS |
| S8-1 | コンソールエラー 0・外部通信 0・シナリオ実行エラー 0 | PASS |

#### 受け入れスクリプトの修正（製品コードは無修正・AI判断）

初回実行は **11/13 FAIL**（S3-2・S4-2）。原因を特定し、**製品側は正常**と確認したうえで、判定基準を変えずに**検出方法だけ**を直した。

1. **検出の欠陥**：callout は約 700ms で消えるが、スクリプトは表示時間外にサンプリングしていた。ログは既定で畳まれて DOM に無く、行要素も `li` を探していた（実体は `.battle-log > div`）。→ 対局開始から callout を MutationObserver で全件記録する方式に変更。診断プローブ（作業ツリー外）で、両構えの callout とログ行が実際に出ることを先に実測した。
2. **偽 PASS の発見**：S5-1（鬼将で一度も反応しない）も同じ欠陥のログ検出で判定しており、**常に空＝見かけ上の PASS** だった。記録した callout 列で「構え！」が 0 件であることを判定に加えた。
3. **S4-2 の非決定性**：修正後の再実行で S4-2 のみ FAIL。失敗 seed `seed-1790028950030` を `?seed=` で 2 回再現すると、R2 の手札で使えたのは「予言」「見切り」（どちらも敵への素ダメージ 0）だけで、溜めの構えは**仕様どおり反応しない**。時刻 seed に依存していたため、S3・S4 を固定 seed（初回に反応を確認した `seed-1790028917235`・`seed-1790029063309`）にした。
4. CEO 指示「同じ seed＋同じ Stance で同一結果」をブラウザ上で明示確認するため S4-3 を追加した。

### 4-2. 既存回帰

| # | スイート | 結果 |
| --- | --- | --- |
| 1 | Solve Loop（決定196） | **PASS 17/17** |
| 2 | 決定206 Solve Legibility | **37/38（B3-1 のみ）→ 回帰ではない**（§4-3） |
| 3 | E1（Entrance） | **ALL PASS**（AC21 22/22・AC25 36/36 ほか） |
| 4 | Interaction Feel（`--baseline` Production 相当） | **PASS 28/28** |
| 5 | Hardening（不正 enemyId） | **ALL PASS**（H1〜H10） |
| 6 | qa-flow（4 viewport・通常戦・続きから・勝利・報酬・Daily・敗北） | **正常**（戦闘 scroll 0・続きから R2・Daily 勝利で残り 2 回・rankingUi false・external／api／failed／errors 0） |
| 7 | Save Migration（Production 相当 → 決定213） | **PASS**（保存 v9 の通常戦 R2 を「続きから」→ 勝利。records／reward／stakes 保持。Daily 再開 → 勝利・残り 2 回。api／external／errors 0） |
| 8 | phase7-p1（Result／Home／Daily・`--baseline` Production 相当） | **ALL PASS**（AC6 戦闘レイアウト一致 2/2・AC7 Daily 20/20・AC10 18/18） |
| 9 | phase7-p2（49 progression・`--p1` Production 相当） | **ALL PASS**（AC1〜AC19・EXTRA-1〜3。AC17 ロールバック互換） |
| 10 | Ranking Absence（dist＝決定213 build） | **PASS** |
| 11 | Secret Audit（コミット履歴）＋ 決定213 の未commit 差分・新規ファイルの個別走査 | **PASS**（資格情報形式の値 0。新規 storage key 0・saveVersion 変更 0） |

### 4-3. 決定206 B3-1 の切り分け（回帰ではない）

- B3 は **大耀 × 業斧の鬼将**（構えを選ばない・小槌は構えを持たない＝構えの hook は `null` で一切動かない）を「stall」方策で 7R まで進め、「未撃破」の recap を確かめるシナリオ。seed は時刻から作られる。
- :4184 は 2 回とも R7 の大技（170 vs 盾 80）で**敗北**し判定対象外に、:4181 は 1 回で未撃破＝PASS。決定207 Gate の 1 回目にも同じ文言で起きていた既知の現象。
- **固定 seed 5 本で両ビルドを比較**：5/5 で状態・recap が文字単位で完全一致。seed `b3-a` では Production 相当も同じく敗北する（`out/regression/solve-legibility-b3-seed-compare.json`）。
- 結論：時刻 seed に依存する既存シナリオの揺れで、決定213 の影響ではない。既存スクリプトは変更しない。

### 4-4. Enemy Intent × 7R × AP × 決定論 Seed の維持

- `rules.ts` の差分は `otomoStance` ブロックの追加のみ。ラウンド数・AP 逓増・敵の予告・乱数の規則は無変更。
- golden replay（固定操作列の決着）が不変のまま PASS。構え未指定・kill switch OFF・旧セーブ相当で対局が完全同一になることを unit で確認。
- 同じ seed＋同じ構え＋同じ操作列 → 同一 state・同一イベント列（unit・両構え）、ブラウザでも S4-3 で同一。

## 5. シミュレーション（`stancePilot.audit.ts`・30 seed・ふつう／むずかしい）

commit するコードで再実行し、2026-09-20 の出力と JSON 完全一致（タイムスタンプ除く）。

決定212 §10 の成功指標との照合（ふつう・aware 方策＝構えを知って打つ）：

| 指標 | 目標 | 実測 | 判定 |
| --- | --- | --- | --- |
| ① 行動分岐 魔獣（連撃の構え） | ≥ 40% | 73.3%（reader 40.0%） | 達成 |
| ① 行動分岐 機工師（溜めの構え） | ≥ 40% | 100%（reader 66.7%） | 達成 |
| ① 行動分岐 鬼将（対照） | ≤ 10% | 0% | 達成 |
| ② 構え反応／試合 魔獣 | ≥ 1.5 | **1.0**（むずかしい 1.47） | **未達** |
| ② 構え反応／試合 機工師 | ≥ 1.5 | 3.6（むずかしい 4.07） | 達成 |
| ④ 共鳴発動／試合 | 0.5 → ≥ 1.0 | **魔獣 0.8／機工師 0.73**（むずかしい 魔獣 1.13） | **未達** |
| ③ ふつう勝率 | 100% 維持 | 100%（ふつう 18 条件すべて。むずかしい 18 条件も 100%） | 達成 |

- 未達 2 項目は隠さず記録する。**CEO 指示（2026-09-22）により効果量は変更しない**。Pilot の主目的は「構えによってプレイヤーの判断・カードの使い方が変わるか」であり、機械指標①は達成している。数値調整は Human QA の所見を得てから別途判断する。
- 読み：魔獣の連撃は hit ごとの予告量が大きく、盾で**完全に**受け切れる hit が 1 試合に約 1 回しか生まれない。発動が 1.0 に届かないのは、構え由来の共鳴（約 +1.7／試合）だけではゲージ 7 を追加で 1 回満たせないため。
- 補足：溜めの構えは機工師戦で被ダメ 20.0 → 15.9（ふつう）と、攻撃タイミングの変化が守りにも効いている。

## 6. CEO Human QA（Preview `http://127.0.0.1:4184`）

最低限の確認導線：

1. **恵比寿 × 双牙の魔獣 × 連撃の構え**：デッキ画面で「連撃の構え」を選ぶ → 連撃の予告で盾札を積み、hit を受け切る → callout「連撃の構え！N発を受け切って共鳴+N」
2. **恵比寿 × 銀甲の機工師 × 溜めの構え**：R2 の溜め（「砲身に魔力を溜めている…」）でバッジが「反応中」→ 攻撃札を使う → callout「溜めの構え！溜めの隙に追加Nダメージ」
3. （任意・負の対照）**恵比寿 × 業斧の鬼将**：どちらの構えでも一度も反応しない

最重要質問：**「OTOMO の構えを選んだことで、敵の予告を見て、自分のカードの使い方を変えた感じがしたか？」**（YES／NO）

Human QA 前は、効果量の調整・7 OTOMO への展開・Progression の実装を行わない。

## 7. 状態

**PASS — READY FOR CEO HUMAN QA**。`feat/otomo-stance-pilot` に commit（push なし）。master `270b3e7`・Production `b0fbd3c` 不変。
---

## 8. CEO Human QA（2026-09-22）— **HOLD：Strategic Effect UX / Player Decision mismatch**

- 判定は **CEO**。記録・原因分析は **AI**。
- 対象：**恵比寿 × 双牙の魔獣 × 連撃の構え**（Preview `127.0.0.1:4184`・commit `c6ca3a7`）。溜めの構え × 機工師は未実施。
- CEO の実際の判断：**「連撃予告は毎回出ているので、盾を使うより回復を使う」**
- 「連撃の構え！」の発動表示は、プレイ中に認識できなかった。
- 位置づけ：Automated QA と simulation の PASS は否定しない。ただし **simulation 上の行動分岐 73.3% だけでは、Human Play で意思決定が変わることを証明できない**と判明した（§9-5）。
- CEO 指示（2026-09-22）：効果量を変更しない・callout 時間だけを延長しない・7 OTOMO へ展開しない・Progression へ進まない・Production へ merge／push／deploy しない。

## 9. Root Cause 分析（AI判断・コード変更なし）

計測：`scripts/decision213-stance-pilot/rca/`（`npx vitest run --config scripts/decision213-stance-pilot/rca/vitest.rca.config.ts`）。runtime はそのまま使い、v0.2 候補の比較だけ hook をメモリ上で差し替えて終了時に復元する。200 seed・ふつう・恵比寿。

比較した方策：
- **reader**：攻撃優先（決定203／213 の既存方策）
- **guard**：受け切れる hit が増える盾札を優先
- **heal**：失った HP に見合う回復札を優先（**CEO の実際の判断に相当**）
- **healGuard**：盾と回復の両方

### 9-1. 魔獣は 7 ラウンドすべて連撃＝「予告を読む」ではなく定常状態

- 行動表（`enemies.ts`）：R1 `[5,4]`・R2 `[5,5]`・R3 `[4,4,4]`（双牙乱撃）・R4 `[7,6]`・R5 `[7,7]`・R6 `[8,7]`・R7 `[8,8]`。**multiAttack は全 7 敵のうち魔獣だけ、しかも 7/7 ラウンド**。
- 連撃の構えの条件は「予告が連撃」なので、魔獣戦ではバッジが毎ラウンド「反応中」になる。情報量がゼロで、「この予告を見たから行動を変える」瞬間が戦闘中に生まれない。
- 構えが表現できるのは戦闘前の「この敵だからこの構え」だけで、戦闘中の読みにならない。CEO の「毎回出ている」という所見と一致する。

### 9-2. 推奨デッキでは「盾で受ける」という選択肢がほぼ存在しない

- 恵比寿の推奨デッキ 20 枚：**盾札 3 枚**（守護 5・鉄壁の構え 12・神楽舞 3）に対し、**回復札 6 枚**（潮招き 4×2・恵比寿顔 6×2・福授け 6×2）。
- 盾は hit を先頭から順に消費する。受け切りには「その hit 以上の盾」が要るため、全 hit を受け切れる盾が手札と神力でそろうラウンドは **22〜24%** しかない（policy.md）。
- 託宣「加護」は予告合計の 50%。連撃では最初の 1 hit にも届かないことが多い（R1 `[5,4]` に対して盾 4）。自然な守りの手段が構えを発火させない。

### 9-3. 回復は盾と同等以上に合理的（CEO の判断は正しい）

連撃の構えを選んだ状態（policy.md）：

| 方策 | 残HP | score | 構え反応／試合 |
| --- | --- | --- | --- |
| guard（盾優先） | 22.45 | 680.4 | 1.05 |
| heal（回復優先） | **23.73** | **683.8** | 1.00 |

- 回復方策のほうが残り HP もスコアも上回る。魔獣は毎ラウンド必ず殴ってくるので回復が無駄にならず、恵比寿顔は 1 枚で回復 6 と共鳴 +2 を確定で得る。構えの「受け切り 1 hit ＝共鳴 +1」はこれより条件付きで小さい。
- **構えの反応回数は、盾を意識しても 1.00 → 1.05 しか増えない**。反応はプレイヤーの判断の結果ではなく、たまたま盾札を引いた回に起きている。
- 構えなしと比べると、どの方策でもスコア約 +20・撃破 0.3R 早い。**実態は判断を生まない無条件の強化**（決定212 §9「無条件バフ禁止」の趣旨に反する）。

### 9-4. 遅延報酬（共鳴 +1）の弱さは主因ではない

効果の種類と量を変えた 5 案で「盾で受ける判断が回復より報われるか」（guard − heal）を比べた（variants.md）：

| 案 | Δscore | Δ残HP | Δ構え反応 | 構え自体の強さ |
| --- | --- | --- | --- | --- |
| V0 現行（共鳴 +1／hit） | −3.4 | −1.28 | +0.05 | +20.3 |
| VB 共鳴 +2／hit | −0.1 | −1.70 | +0.04 | +25.9 |
| VE 連撃中は盾札 +50% | −2.7 | −0.88 | +0.10 | +2.6 |
| VA 牙返し（受け切り hit ごと即時反撃 3） | −1.6 | −0.81 | +0.07 | +6.0 |
| VA2 牙返し 2 | −3.1 | −0.80 | +0.08 | +2.8 |

- **どの案でも盾は回復に勝てず、反応回数もプレイヤーの判断に連動しない（Δ ≤ 0.1）**。即時報酬（反撃）にしても変わらない。
- 報酬の遅さ・量が主因なら、VA や VB で差が縮むはずだが縮まない。**主因は §9-1 の定常状態と §9-2 の盾札の供給不足**。

### 9-5. simulation の行動分岐 73.3% が Human Play を予測できなかった理由

- 決定213 の sim 方策（reader／aware）は**攻撃優先で、危険なとき以外は回復札を選ばない**。CEO が実際に取った「回復で受ける」方策が方策集合に無かった。
- 行動分岐率は「構えを知るボット」と「知らないボット」の初手の差であり、**その行動が合理的か（報われるか）を測っていない**。今後の Pilot 指標には「構えに沿った行動が、最良の代替方策（回復など）より報われるか」と「反応回数が方策に依存するか」を加える。

### 9-6. 0.7 秒の callout は因果を伝える UX として不十分

- 表示時間は全 callout 共通の 700ms（CEO 指定 0.6〜0.8 秒）。1 バッチ 1 件で、敵ターンの被弾演出・数字ポップと同じ時間帯に出る。
- 報酬はプレイヤーが見ていない共鳴ゲージの +1 で、ゲージ側に「構えのおかげ」という痕跡が残らない。
- 推奨デッキ・回復方策での反応は約 1.0 回／試合で、CEO が見られた機会は多くて 1 回程度。
- 常時「反応中」のバッジは、魔獣戦ではノイズになる。
- ただし §9-3・9-4 のとおり、表示を改善しても判断は変わらない。**UX は副因、主因は判断構造**。callout の延長だけで直すのは不適切（CEO 指示と一致）。

### 9-7. 溜めの構えにも同じ構造がある（未 QA・記録のみ）

機工師 × 溜めの構え（deckexp.md）：

| 方策 | score | 撃破R | 残HP |
| --- | --- | --- | --- |
| reader（構えを無視して攻撃） | **697.6** | **4.41** | 19.86 |
| chargeRead（溜めの前は攻撃を温存し、溜めに合わせる） | 682.1 | 4.64 | 20.67 |

- 「読んで合わせる」方策が、構えを無視する方策にスコアと速さで負ける。攻撃札は毎ラウンド使うので、溜めのラウンドの増幅は勝手に乗る。**溜めの構えも実態は判断を生まない強化**。
- v0.2 の範囲外として記録し、連撃の構えの v0.2 結果を見てから扱う。

### 9-8. 何を変えれば「連撃を見たから行動を変える」が成立するか（検証）

構えとデッキの組み合わせを計測した（deckexp.md・効果は現行のまま）：

| デッキ | 構え | 方策 | 撃破R | 残HP | score | 構え反応 | 発動 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 推奨（盾 3） | 連撃 | heal | 4.51 | 23.73 | 683.8 | 1.00 | 0.90 |
| 盾重視（盾 7） | なし | guard | 5.31 | 22.43 | 632.8 | 0 | 0.24 |
| 盾重視（盾 7） | **連撃** | **guard** | 4.61 | **25.38** | 674.6 | **2.81** | 0.89 |
| 盾重視（盾 7） | 連撃 | heal | 4.68 | 23.59 | 669.6 | 2.03 | 0.69 |

盾重視デッキは、推奨デッキの 福授け×2・恵比寿顔×2 を 守護・鉄壁の構え・守りの陣×2 に置き換えたもの（盾札 7 枚）。

- **盾重視デッキ＋連撃の構えでは、盾で受ける判断が回復に勝つ**：残HP +1.8・撃破 0.07R 早い・score +5。
- 構え反応は 2.81／試合（目標 1.5 を達成）。盾方策と回復方策の反応差は **+0.78**（推奨デッキでは +0.05）＝**反応がプレイヤーの判断で決まる**。
- 盾重視デッキは**構えなしでは明確に弱い**（score 633・撃破 R5.3）。つまり「構えを選ぶからデッキと戦い方を変える」因果が成立し、無条件の強化にならない。
- 正解は固定されない：推奨デッキで回復に打てば score と速さで上回り、盾構成なら安全性で上回る＝同じ敵に 2 つの答え（決定212 §9「正解固定の禁止」）。
- 盾構成の戦闘中の読みは「hit の形」：`[4,4,4]` の双牙乱撃は盾 12 で 3 hit すべてを受け切れる。`[8,8]` は 1 hit しか受け切れない。予告の種類は毎回同じでも、ラウンドごとに受け方が変わる。
- 盾札を 5 枚に増やしただけ（盾寄り）では、まだ回復が勝つ（score 684.9 vs 683.2）。盾の供給が十分になって初めて判断が報われる。

## 10. 推奨：Decision213 v0.2 Narrow Pilot（1 案）

**「連撃の構え＝盾で受ける戦い方」を、デッキ画面で 1 タップの構え用デッキとセットで成立させ、構えの貢献を戦闘中に残る形で見せる。効果量・engine・RULES は変更しない。**

| 項目 | 内容 |
| --- | --- |
| ① 構え用デッキ | デッキ画面で「連撃の構え」を選ぶと、「盾で受ける編成にする」ボタンが出る。押すと、推奨デッキの 福授け×2・恵比寿顔×2 が 守護・鉄壁の構え・守りの陣×2 に置き換わる（§9-8 の盾重視）。構えの選択とは独立で、押さなければ従来どおり。デッキ画面の既存の編集で戻せる |
| ② 貢献の可視化 | 戦闘パネルの構えバッジを、常時の「反応中」から「受け切り +N（この戦闘の構え由来の共鳴合計）」の累計表示に変える。callout の時間は変えない |
| 変えないもの | `RULES.otomoStance` の数値、`engine/otomoStance.ts`、溜めの構え、他 OTOMO、Progression、Daily |
| 変更範囲（見込み） | 構えごとの置き換え表をデータとして持つ（`OtomoStanceDef` に置き換え表を追加。数値ではなくカード ID）、`DeckBuilderScreen.tsx`（ボタン 1 つ）、`GodOtomoPanel.tsx`（バッジ文言）、テスト |
| 再 Human QA | 恵比寿 × 双牙の魔獣 × 連撃の構え × 「盾で受ける編成」。同じ最重要質問：「構えを選んだことで、敵の予告を見て、自分のカードの使い方を変えた感じがしたか？」 |
| 機械の合格条件 | 盾方策が回復方策より残HP か撃破R で報われる。構え反応の方策差 ≥ 0.5。構えなしでは盾重視が弱い（無条件の強化でない）。ふつう勝率 100%。既存回帰 PASS |

### 10-1. 比較して却下した案

| 案 | 却下理由 |
| --- | --- |
| 共鳴量を増やす（VB） | 盾が回復に勝てないまま、無条件の強化だけが +26 に増える（§9-4） |
| 盾札を連撃中に強化（VE） | 反応が判断に連動しない（Δ +0.10） |
| 即時反撃にする（VA／VA2） | 即時化しても盾が回復に勝てない。現行より弱い |
| callout の延長・強調だけ | 判断が変わらない（§9-6）。CEO 指示で単独の延長は不可 |
| 魔獣の行動表に連撃以外を混ぜる | 敵 Identity（ENEMY-IDENTITY-PROTOTYPE-02、CEO GO）の変更で、全敵の回帰とバランスに波及する |
| 溜めの構えへ Pilot を切り替える | §9-7 のとおり同じ構造問題があり、HOLD の解消にならない |

### 10-2. リスク

1. 盾重視の置き換えで、恵比寿専用の支援札 2 種（福授け・恵比寿顔）が外れる。恵比寿らしさとの両立は、再 Human QA の所見で判断する。
2. 共鳴発動は 0.89／試合で、決定212 の目安 1.0 には届かない（効果量を変えないため）。
3. 盾構成は最適解ではなく「別の答え」。score では推奨デッキの回復方策が上回る。「判断が変わった手応え」が score の差より勝つかは Human QA でしか分からない。
4. 置き換え表をデータに持つため、gameVersion の指紋が変わる可能性がある（golden の決着は不変の見込み。実装時に確認）。

## 11. 状態

**HOLD — Human QA（Strategic Effect UX / Player Decision mismatch）**。Automated QA PASS（§3〜§5）は有効。実装は `c6ca3a7` のまま変更なし。v0.2 は CEO の GO 待ち（実装していない）。master `270b3e7`・Production `b0fbd3c` 不変。

## 12. Decision213 v0.2 実装・Automated QA（2026-09-22・commit `efdfdf4`）

§10 の推奨 1 案を CEO GO を受けて実装した。効果量・engine・RULES・溜めの構え・他 OTOMO は変更していない。

| 項目 | 内容 |
| --- | --- |
| ① 構え用デッキ | `src/core/data/deckBuilder.ts` に `STANCE_DECK_SWAPS`／`applyStanceDeckSwap`（純粋関数・カード ID の入れ替えのみ）。デッキ画面で連撃の構えを選ぶと「盾で受ける編成にする」ボタン（福授け×2・恵比寿顔×2 → 守護・鉄壁の構え・守りの陣×2）。押さなければ編成は変わらない |
| ② 貢献の可視化 | `GodOtomoPanel.tsx`：連撃の構えのバッジを常時「反応中」から「受け切り +N」（この対局で構えが得た共鳴の合計）の累計表示に変更 |
| 決定213 受け入れ | `scripts/decision213-stance-pilot/acceptance.mjs` **24/24 PASS**。ブラウザの操作列を engine で再生した結果と一致（UI の受け切り +6 == engine 6、最終 state 一致：`out/acceptance/v02-replay-result.json`） |
| 既存回帰 | 11 スイートを 1 本ずつ逐次実行し全 PASS（:4184 v0.2 `index-C9rsak-l` ／ 比較 :4181 Production 相当 `index-4DPzUUkG`）。Solve Loop 17/17・Solve Legibility 38/38・E1・Interaction Feel 28/28・Hardening・qa-flow・Save Migration・phase7-p1・phase7-p2（59/59）・Ranking Absence・Secret Audit。結果 JSON：`scripts/decision213-stance-pilot/out/regression-v02/` |
| 回帰中の FLAKE | Interaction Feel 初回の AC3-baseline 失敗（27/28）は、比較側 :4181 だけの計測外れ値（tLeave 580ms、通常は約 300ms）。条件をそろえて AC3 だけ 8 回測り直すと差は 11ms 以内。単独で再実行して 28/28。判定 **TEST / ENVIRONMENT FLAKE**（CEO 承認）。敵 HP 850／1000 の差はハーネスの手順が以前から非対称なためで、原因ではない |

## 13. CEO Human QA（2026-09-22）— **PASS**

対象：恵比寿 × 双牙の魔獣 × 鯛丸「連撃の構え」＋「盾で受ける編成」（v0.2、`efdfdf4`、Preview `http://127.0.0.1:4184`）。判定は **CEO**。

CEO 所見：
- 「今回は盾で受けてみよう」と自然に思えた
- 「鯛丸を活かして自分で攻略している感じ」がした

§8 の HOLD（Strategic Effect UX / Player Decision mismatch）で問題になったのは、構えを選んでもプレイの意思決定が変わらないことだった。v0.2 では「構え → デッキ → 戦い方」の因果を Human Play で確認できた。これは §9-8 の機械検証（盾方策が回復方策より報われる・反応の方策差 +0.78）と一致する。

**Decision213 v0.2 Human QA = PASS**。

## 14. 状態（2026-09-22）

**v0.2 Human QA PASS**。ブランチ `feat/otomo-stance-pilot`（`efdfdf4`）。master `270b3e7`・Production `b0fbd3c` は変えていない。

CEO 指示により、現時点では次を行わない：
- 7 OTOMO への展開
- OTOMO Progression の実装
- runtime の変更
- balance の変更
- master への merge
- push／deploy

次の候補は「銀甲の機工師 × 溜めの構え」の Human QA。§9-7 のとおり、溜めの構えにも同じ構造問題（温存方策が「構えを無視」方策に負ける）が記録されている。実装変更は CEO の指示があるまで行わない。

## 15. Decision213 v0.3「溜め返しの構え」— 設計・実装・Automated QA（2026-09-22）

### 15-1. 経緯
- 銀甲の機工師 × 溜めの構え（v0.1：溜め中の攻撃 +50%）の Human QA 準備で、§9-7 の構造問題を今の runtime で再確認した（**NOT READY — STRUCTURAL ISSUE**。CEO 承認）。溜めのラウンドは敵が攻撃しない空き番なので誰でも攻撃し、構えは読まなくても約 3 回発動する無条件の強化だった（reader 697.6 vs 溜めに合わせて温存 682.1）
- scratchpad で 5 案を比較し、**「溜め返しの構え」を 1 案として AI 推奨 → CEO 承認（GO — IMPLEMENT v0.3）**。却下：今の +50%（無条件の強化）／溜め明けの大技を全部受け切ったら反撃（推奨デッキでは受け切れず反応 0.03）／盾の持ち越しだけ（回復方策に負ける）／神力を預ける（テンポを失う）／倍率の引き上げ（「倍率だけ」は不可）

### 15-2. 仕様（実装どおり）
| 項目 | 内容 |
| --- | --- |
| 発動 | 敵の予告が「溜め」のラウンドに、プレイヤーが盾を張る |
| 効果 | その盾を、ラウンド開始のブロック 0 リセットの例外として次のラウンドまで残す（預かり盾・`GameState.otomoStanceCarry?`）。次のラウンドの敵攻撃を預かり盾で防いだ量 × `RULES.otomoStance.charge.counterRatio`（0.5・切り捨て）を 1 回だけ反撃。そのラウンドの終わりに預かりは必ず消える。v0.1 の「攻撃 +50%」は廃止 |
| 判断 | 空き番の溜めのラウンドに攻撃するか（ふつう）、次の大技に備えて盾を張るか（予告を読んだ場合） |
| UI | 説明「溜めの間に張った盾は次のラウンドまで残る。その盾で受けた分の半分を鯛丸が反撃」／「預かり盾 N」／callout「溜め返し！ N」／Battle Log「盾Nを次のラウンドへ預かった」「預かり盾でX防ぎ、Y反撃」／累計「溜め返し +N」 |
| デッキ | 変更なし（恵比寿の推奨デッキのまま。v0.2 の置き換えは流用しない） |
| 互換 | `otomoStanceCarry` は省略可（旧セーブ＝預かりなし）。saveVersion 据え置き。gameVersion `1.d132654989cadf0b`（engineVersion 据え置き・golden の決着不変） |

### 15-3. Automated QA（詳細は `scripts/decision213-stance-pilot/out/regression-v03/AUDIT.md`）
- 基礎：`tsc -b --noEmit` 0・clean build（`index-X7cOlknS.js`）・oxlint 0・vitest src 1,191 PASS
- **定量 Gate（実 runtime・600 試合・`out/v03-gate.md`）**：G1 分岐 85.8%／1.22R、G2 score +4.96（vs reader）／+3.86（vs heal）・撃破R で勝ち・勝ち越し +15／+12／+23.5pt、G3 −23／−41／−18、G4 反応差 +1.0、G6 +1.62／−0.45、G7 672.5 vs 669.1 — すべて PASS
- **G5 の訂正（AI の Gate 設定ミス・CEO 決定で訂正）**：旧 G5「ふつうで構えあり勝率 100%」は **FAIL**（構えあり 599/600 ×3 方策）。baseline（構えなし）も 100% 未満（reader 598・heal 599・対応 566／600）で、設計時シミュレーションの勝率丸め表示（0.995→100）により見落としていた。結果確認後に「同一 seed・同一方策で構えあり ≥ 構えなし」へ訂正し **PASS**。seed の除外・差し替え、runtime／balance による救済はしていない
- **受け入れ（決定213 acceptance）**：Run 1＝**23/25 FAIL**（Test Harness Bug：閉じた Battle Log を開かずに読んでいた）→ CEO 承認で「ログ」ボタンを実際に押し、表示行を MutationObserver で記録する方式へ修正 → Run 2＝**24/25 FAIL**（**Product Bug**：Battle Log は一括追加後の最新 6 件だけを描画し、反撃の行が一度も表示されない＝UI 要件未達）→ CEO 承認で、ラウンド処理の最後に表示専用の要約 `OTOMO_STANCE_SUMMARY` を 1 行追加（確定値を写すだけ。二重計上なしを unit test で確認、600 試合の Gate 出力は修正前と同一）→ Run 3＝**25/25 PASS**（画面の Battle Log に両方の行が実際に表示された）
- **既存回帰 11 スイート**：すべて PASS。Solve Loop の初回 15/17 は、同一 seed で :4181 と :4184 が完全一致（両方とも敗北）＝**TEST FLAKE / SEED-DEPENDENT TEST ASSUMPTION**（時刻 seed のテストが「攻撃優先なら必ず勝つ」と仮定）。変更なしで 1 回だけ再実行して 17/17。時刻 seed 問題は QA Technical Debt として記録のみ
- 手順上の逸脱：同一 seed 比較を空きメモリ 1.5GB 未満（約 593MB）で起動した（完了はしたがルール違反）。以後はメモリ gate を通して実行

### 15-4. 状態
**PASS — READY FOR CEO HUMAN QA**（銀甲の機工師 × 恵比寿（推奨デッキ）× 溜め返しの構え・ふつう・Preview `http://127.0.0.1:4184`）。むずかしいでは対応方策が回復方策に負ける（602 vs 614・参考値）が、今回は最適化しない（CEO 指示）。7 OTOMO 展開・Progression・master merge・push・deploy はしていない。master `270b3e7`・Production `b0fbd3c` 不変。

## 16. CEO Human QA（2026-09-23）— v0.3 **PASS**／Narrow Pilot クローズアウト

対象：恵比寿 × 銀甲の機工師 × 鯛丸「溜め返しの構え」（推奨デッキのまま・ふつう・Preview `http://127.0.0.1:4184`・`6b8f09e`）。判定は **CEO**。

実プレイの結果：**勝利**・スコア 9,360・自己ベスト更新・初撃破（恵比寿 × 銀甲の機工師）。

| 最重要質問 | 回答 |
| --- | --- |
| 機工師の「溜め」予告を見て行動を変えたか | **YES** |
| 溜め返しの構えを活かすためにカード使用のタイミングを変えたか | **YES** |
| 「預かり盾」→「溜め返し！」で、鯛丸が自分の判断に反応したと感じたか | **YES** |
| 「おすすめどおり」ではなく「鯛丸を活かして自分で攻略した」と感じたか | **YES** |

CEO のプレイ中の観察：

- R2「砲身に魔力を溜めている…」を見た時点で、**指示される前に自然に「ブロックを使う」と判断した**
- R3 で持ち越された盾（預かり盾）を確認した
- 敵の攻撃時の「溜め返し！」表示を CEO 自身が認識した
- R4 の再度の「⚠ 主砲充填開始…！」も確認した

§8 の HOLD で問題になったのは「構えを選んでもプレイの意思決定が変わらない」ことだった。v0.3 では、**予告を見る → プレイヤーが行動を変える → その行動に OTOMO が反応する → 結果が変わる**という因果を Human Play で確認できた。これは §15-3 の機械側の結果（対応方策が reader・heal に勝ち、構えなしでは同じ対応が最適にならない、反応回数の方策差 +1.0）と一致する。

### 16-1. Narrow Pilot の結論（決定212 → 決定213）

| Pilot | 対象 | Human QA |
| --- | --- | --- |
| v0.2 | 鯛丸「連撃の構え」× 双牙の魔獣（＋「盾で受ける編成にする」1 タップ置き換え） | **PASS**（2026-09-22・§13） |
| v0.3 | 鯛丸「溜め返しの構え」× 銀甲の機工師（推奨デッキのまま） | **PASS**（2026-09-23・§16） |

2 つの敵 Identity（連撃型・溜め型）で、OTOMO Strategic Identity が Human Play の意思決定を変えることを確認した。決定212 の Narrow Pilot（鯛丸 × 魔獣／機工師）は**これで完了**とする。

### 16-2. 状態（2026-09-23）

**v0.2・v0.3 とも Human QA PASS。Narrow Pilot クローズアウト。** ブランチ `feat/otomo-stance-pilot`。CEO 指示により、現時点では次を行わない：

- 7 OTOMO への展開
- OTOMO Progression の実装
- runtime／balance／tests の追加変更
- master への merge・push・deploy

master `270b3e7`・Production `b0fbd3c` は不変。むずかしい向けの調整（§15-4 の参考値）と、QA Technical Debt（時刻 seed のテスト前提・Battle Log の 6 件表示で重要行が流れる件）は未着手の記録のみ。
