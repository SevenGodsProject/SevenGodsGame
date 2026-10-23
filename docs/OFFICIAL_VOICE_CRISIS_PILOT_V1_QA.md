# Official Voice Crisis Pilot v1 — Lane 4 独立 QA ＋ CEO Human QA 手順書

- 日付：2026-10-23（Lane 4「大耀 crisis ボイス・独立 QA」・**AI 判断**（CLAUDE.md §6-2：QA 方式・テスト方式））
- 対象：worktree `SevenGodsGame-voice-pilot`／branch `feat/official-voice-crisis-pilot-v1`（検証時 HEAD `b917aa0`）。仕様は `docs/OFFICIAL_VOICE_CRISIS_PILOT_V1.md`（以下「仕様書」）
- 範囲：既存成果（c9b990d／4dcd6f7／6dba810／0e41145／b917aa0）の再検証のみ。**runtime 変更 0**（追加はテスト 1 ファイルと本書）。build・Playwright（`acceptance.mjs`）・full vitest・tsc は **未実行**（PM 直列管理）
- 結論：**PASS（自動で検証できる範囲）／WARN 3（設計上の注意・未実行 Gate）／FAIL 0** → CEO Human QA は Gate G-A／G-B の PASS 後に §3 の手順で実施可

---

## 1. 結果一覧

| # | 確認項目 | 判定 | 根拠 |
|---|---|---|---|
| 1 | 固定 seed `crisis-003` の再現性 | **PASS** | §2-1。`crisis-seed.mjs --seed crisis-003` を 3 回・`--scan 200` を 2 回実行し、出力 json は **`date` 行以外がバイト一致**（sha256 同一）。HP 経路・ピンチ時刻とも仕様書 §5-1 と一致 |
| 2-a | 発火タイミング（着弾＋300ms・HP ≤ 50% 初回のみ） | **PASS** | 純関数 `crisisVoice.test.ts` 15 件（既存）＋ フック本体 `crisisVoiceHook.test.ts`（新規）で実 engine の R4 commit から **1,560ms ちょうど**（1,559ms では未発火） |
| 2-b | BGM duck（量・復帰） | **PASS** | 量・合流・復帰・Retry 解除は `soundLayer.test.ts`（決定257・既存）で GainNode 値まで検証済み：0→60ms で 0.343（実効 0.35→0.12）、`duckUntil = max` で合流、復帰 300ms ランプ、`releaseBgmDuck` 120ms。crisis 固有は新規テストで `duckBgm(8,858＋300＝9,158)` を **1 回だけ**要求することを確認 |
| 2-c | 二重再生防止（1 戦 1 回・再戦・リトライ・ミュート） | **PASS（WARN 1・2 付き）** | 新規テストで：R5 の再低下（10→7）で 2 回目なし／同 seed 再戦（ログ巻き戻し）で各戦 1 回／seed 変更で記憶リセット／予約中の seed 変更・unmount で予約解除／「続きから」（既に ≤50%）では鳴らない／大耀以外は予約 0。1 チャネル優先度（greeting < crisis・replace 80ms フェード）は `officialVoice.test.ts`（既存）で確認済み |
| 3 | CEO Human QA 3 問の手順書 | **PASS** | §3（既存 3 問は文言を変えず、開始方法・seed・観察点・回答形式を追加） |
| — | Gate G-A（full vitest／tsc／oxlint／build） | **未実行・要実行（PM）** | 本 Lane の禁止事項 |
| — | Gate G-B（`acceptance.mjs` 8 ケース） | **未実行・要実行（PM）** | 同上。実時間の `setTimeout` 遅延（WARN 3）はここでしか測れない |

### 1-1. WARN（FAIL ではない・仕様どおりだが CEO／PM が知っておくべき点）

| # | 内容 | 影響 | 推奨 |
|---|---|---|---|
| W1 | **ミュート中にピンチ条件を満たすと、その戦闘の「1 回」は消費済みになる**（同じ戦闘内で後からミュートを解除しても鳴らない）。`firedRef` は予約時に立ち、ミュートは `playVoice` 側で弾くため | 体験上は「ミュート中に起きた出来事の声は後から鳴らない」で自然。不具合ではない | 現状維持（テストで挙動を固定済み） |
| W2 | **戦闘開始時にミュート → 戦闘中に解除**した場合、先読み（`preloadVoice`）が走っていないため crisis は発火時に遅延ロードとなり、取得が 800ms（`sceneLateDropMs.crisis`）を超えると無音で drop される | 低頻度・無音になるだけ（例外・二重再生なし） | 現状維持。Human QA ではミュートを解除してから戦闘を始める（§3） |
| W3 | 実ブラウザの `setTimeout` 遅延（決定254 で ≈230ms の実測あり）が `acceptance.mjs` (b) の ±50ms を超える可能性（仕様書 §5-1 既知リスク） | G-B の (b) だけ FAIL し得る | G-B 実行時に `deltaFromHpLabelMs` で切り分け。声側の遅延なら `performance.now()` 基準の 1 行修正（決定254 の NEXT と同じ）を別途検討 |

補足：`crisis-003` は R4 以降 HP が閾値（15）を再び上回らないため、「回復して再び落ちても鳴らない」（`firedRef` が効く経路）は実 seed では通らない。この経路は純関数テスト（`fired: true` → null）で担保している。

---

## 2. 検証詳細

### 2-1. 固定 seed 再現性（node 単体・engine 純関数）

```
cd C:\Users\kimi1\SevenGodsGame-voice-pilot
node --import ./scripts/official-voice-pilot/ts-loader.mjs scripts/official-voice-pilot/crisis-seed.mjs <out.json> --seed crisis-003   # ×3
node --import ./scripts/official-voice-pilot/ts-loader.mjs scripts/official-voice-pilot/crisis-seed.mjs <out.json> --scan 200          # ×2
```

| 実行 | 生 sha256（`date` を含む） | `date` 行を除いた sha256 |
|---|---|---|
| `--seed crisis-003` 1〜3 回目 | 3 回とも異なる（`date` のみ差分・`diff` で確認） | **`6b6908a7…`（3 回一致）** |
| `--scan 200` 1〜2 回目 | 異なる（`date` のみ） | **`e8c580ed…`（2 回一致）** |

- `crisisSource: "crisisVoice.ts"`（インライン複製ではなく本物の `planCrisisVoice` を使用）
- `crisis-003`：R1 26 → R2 26 → R3 30 → **R4 大海嘯 30→10**（着弾 1,260 → 声 **1,560**）→ R5 10→7 → **R6 撃破（won）**。仕様書 §5-1 の表と一致
- 走査統計：ピンチ発生 177／200・R3 69・R4 88・R5 17・R6 3・候補 87（R4 必殺 48・R3 通常 39）。仕様書 §5-1 と一致

### 2-2. 追加したテスト（runtime 変更 0）

`src/components/battle/crisisVoiceHook.test.ts`（新規・12 件）：`useCrisisVoice` **フック本体**を、`crisis-seed.mjs` と同じ構成・方策で回した**実 engine の `crisis-003` の commit 列**で駆動する。react は `useRef`／`useEffect` だけの最小ランナーに差し替え（この環境に DOM・testing-library が無いため）、`playVoice`／`duckBgm` はスパイ（ミュート時 false は本物と同じ）、`hasOfficialVoice`・`planBatch`・`planCrisisVoice` は本物。

| テスト | 確かめること |
|---|---|
| 決定論 | 同 seed 2 回でログ長・HP 経路が完全一致／HP 経路 26・26・30・10・7・R6 won |
| 発火 | 1 戦 1 回・R4 ラウンド終了 commit ＋ 1,560ms／1,559ms では未発火 |
| duck | `duckBgm(9,158)` を 1 回だけ |
| 二重防止 | R5 再低下で 2 回目なし／同 seed 再戦（ログ巻き戻し）で各戦 1 回／別 seed で記憶リセット |
| 予約解除 | 予約中の seed 変更・unmount で鳴らない |
| ミュート | ミュート中は鳴らず duck なし・同戦闘内で解除しても後から鳴らない（W1 を固定） |
| 再開 | 「続きから」（既に ≤50%）では鳴らない |
| 対象外 | 大耀以外は予約（timer）0 |

実行結果（targeted vitest のみ）：

```
npx vitest run src/components/battle/crisisVoiceHook.test.ts src/components/battle/crisisVoice.test.ts src/components/battle/officialVoice.test.ts src/components/creditsScreen.test.ts src/components/battle/soundLayer.test.ts
→ 5 files・74 tests PASS（新規 12 ＋ 既存 48 ＋ soundLayer 14）
```

### 2-3. コード確認で見た点（変更なし）

- 再戦・リトライ：`useGameEngine.startGame` は `setLog([])` の直後に `START_GAME` を dispatch → ログ長が縮む → フックの「巻き戻し」分岐で `firedRef` リセット・予約解除。Daily の「もう一度」も同じ経路。勝利後の新盤面は seed 変化で同様
- 「続きから」：`resumeGame` は `setLog([])`＋`setState(saved)` → seed が null から変わる分岐で `hpRef` を再開時 HP に合わせる
- ミュート：`setSoundMuted(true)` は鳴っている声を即時停止（既存）。BGM 側もミュート中は `duckBgm` が false
- 画面離脱：`BattleScreen` unmount で `stopVoice()`（既存）＋フックの `clearTimer()`。duck は `useBattleSound` の unmount `releaseBgmDuck()`（既存）で解除

---

## 3. CEO Human QA 手順書（3 問・YES／NO）

**前提**：PM が Gate G-A（build 等）・G-B（`acceptance.mjs`）を PASS させ、本 worktree のビルドを `vite preview --host 0.0.0.0 --port 4173` で配信していること（起動・LAN・Firewall は `docs/OFFICIAL_VOICE_PILOT_V1.md` §9 と同じ）。

### 3-1. 開始方法（固定 seed）

| 手順 | 内容 |
|---|---|
| URL | PC：`http://127.0.0.1:4173/?enemy=ryujin&seed=crisis-003`／iPhone：`http://<PC の LAN IP>:4173/?enemy=ryujin&seed=crisis-003` |
| 音 | 画面右上のスピーカーが**ミュートでない**状態で始める（W2）。iPhone はサイレントスイッチ OFF・音量 50% 程度 |
| 選択 | 「神を選ぶ」→ **大耀** →「この構成で始める」→ **蒼海の龍神** →「この構成でバトル開始」（仕様書 §5-1 と同じ操作。デッキは**おすすめのまま**・難易度は既定の**ふつう**・報酬ボーナス無し。保存済みの自作デッキや別難易度だと HP 経路が変わる） |
| 入口 | 入口演出の終わりに「あいさつ」（11.8 秒）。**鳴り終わるまで待ってから**操作を始める |
| 進め方（再現用） | 各ラウンド「押せる一番左のカードを押す → 押せるものが無くなったらラウンドを終える」（託宣は使わない）。参考：R1 一心不乱・速攻／R2 神楽舞・守護／R3 後輩想い×2／R4 豪快な一撃・姉御の号令・巫女の舞・姉御の号令 |
| 起きること | **R4 のラウンド終了**で龍神の必殺「大海嘯」（20）→ HP 表示 300 → **100**。着弾の約 0.3 秒後に大耀の「ピンチ」の声（約 8.9 秒）。その間 BGM が下がり、声の終了 0.3 秒後から戻る。R5 で HP 100→70 に下がっても**声は鳴らない**。R6 で撃破 |
| 進め方が違った場合 | 自由に遊んでも可（同条件 200 seed 中 177 戦で R3〜R6 にピンチが起きる）。その場合は「HP 表示が半分（150）以下に初めて落ちた直後」に鳴ることを見る |

### 3-2. 質問（仕様書 §7 の 3 問・文言は変更しない）

| # | 問い | 観察点 | NO の場合（仕様書 §7） |
|---|---|---|---|
| **Q1** | HP が半分を切った直後の声で「神が自分を見ている」と感じたか | 大海嘯の着弾 → 声までの間（約 0.3 秒）が「被弾への反応」に聞こえるか。台詞の内容が場面に合うか（AI 未試聴） | 撤去 |
| **Q2** | 次のラウンドの思考を邪魔しなかったか | 声（約 8.9 秒）が R5 の手札を読む間に重なる。読む・押す操作の妨げになったか | crisis を「敵必殺の直後だけ」に限定して再 QA 1 回 |
| **Q3** | iPhone で BGM が下がり、ミュートで止まり、あいさつの後に自然につながったか | iPhone で：声の間 BGM が小さくなり、終わると戻る／声の途中でスピーカーボタン → 声が即止まる／入口の「あいさつ」と R4 の「ピンチ」が別の場面として自然に聞こえる | `VOICE_LAYER` の係数調整 |

### 3-3. 回答形式（コピーして返信）

```
Crisis Pilot v1 Human QA（seed crisis-003）
Q1: YES / NO
Q2: YES / NO
Q3: YES / NO
（任意）気になった点：
```

判定：Q1 YES ∧ Q2 YES ∧ Q3 YES → Production 候補（公開判断は CEO §6-3 #8）。NO があれば上表の「NO の場合」を AI 側で実施して再 QA。

---

## 4. 残課題（PM／次 Lane）

1. **Gate G-A**（full vitest・tsc・oxlint・build）：未実行。新規テスト 1 ファイル（12 件）が増える（仕様書 §5 の期待件数 ＋12）
2. **Gate G-B**（`acceptance.mjs` 8 ケース）：未実行。W3 の timer 遅延に注意。`crisisMeasuredDurationSec` を台帳 VOICE-KIT-08 へ転記
3. Human QA（§3）→ PASS 後に `docs/DECISIONS.md` へ AI 判断 1 行（PM）
