# 決定196 — Solve Loop v1（敗北した通常戦だけ「同じ盤面でもう一度」）実装報告

- 日付：2026-09-18
- branch：`feat/solve-loop-v1`（**master `88ca430` から分岐**。push・merge・deploy は未実施）
- 判定：**PASS / READY FOR CEO QA**（Production 反映ではない）
- 上流：`docs/SEVENGODS_COMMERCIAL_DESIGN_RED_TEAM.md`（決定195 §8・§25 NEXT NOW）、`docs/SEVENGODS_47_LESSONS_CONSOLIDATION_AUDIT.md`
- 区分：実装方式・判定は **AI判断**（CLAUDE.md §6-2）。着手は **CEO指示**（決定196）

---

## 1. Player Problem

通常戦で負けたあと、結果画面の「次の目標」は

> 次の目標：業斧の鬼将を撃破する（残りHP 100%）

と出る。ところが Primary を押した先は **新しい seed** だった（`resultHub.ts` → `GameFlow.tsx` → `useGameEngine.ts:307` の `seed-${Date.now()}`）。初期手札と山札の並びが入れ替わるため、

Failure → Observation → Hypothesis → **Same-condition Retry** → Learning → Solve

の Hypothesis と Retry が繋がらない。「さっきの判断を変えたら勝てるか？」を検証する前に、問題そのものが差し替わっていた。神域挑戦（Daily）は既に同日同 seed で、この体験を持っている。

---

## 2. Retry Determinism Audit（実装前に実施）

**問い：同じ seed を渡すだけで、本当に同じ問題になるのか？**

`src/core/engine/sameSeedRetry.test.ts`（新規・4 テスト）で機械的に固定した。

| 監査対象 | 結果 | 根拠 |
| --- | --- | --- |
| 初期手札 | **同一** | `createInitialState.ts:21,52` `createRng(seed,0).shuffle(buildDeckInstances(deck))` → `startRound` の `performDraw` |
| 山札の並び | **同一** | 同上（uid `c0…c19` の並びで比較） |
| 敵の予告列（Enemy Intent） | **seed 非依存** | `round.ts:66-91` `actionForRound(actions, round)` × 難易度・Daily補正・神階・後半激化・必殺倍率。乱数を一切使わない |
| カード効果の乱数 | 同一（打ち方が同じなら） | `playCard.ts:63` `createRng(state.seed, state.rngCursor)`。カーソル方式のため、**打ち方を変えればそこから分岐する＝同じ問題・違う解答** |
| 神の得意技（passive） | 同一 | `applyEffects(..., rng)` で同じストリームを共有 |
| OTOMO | 同一 | 形態は毎試合 `spirit` から。`applyResonance` も同じストリーム |
| 報酬3択 | seed から決定論（`rewardPicker.ts`） | **勝利時のみ**発生。本変更は勝利の seed を変えないため無関係 |
| 敵の選出 | 同一 | 再戦は `engine.state.enemy.defId` を明示で渡す（既存の決定126 の挙動） |
| 報酬ボーナス（`bonusCopies`） | 影響なし | デッキ**検証**にしか使われず、シャッフル対象の配列は変わらない。敗北では新規付与も無い |
| 時刻・乱数の混入 | 無し | `src/core` に `Math.random` 0・`Date.now` 0（`dailyBoss.ts` は引数で受け取る） |

**結論：同じ seed ＝ 同じ問題。seed が変えていたのは「引き」だけだった。** 逆に言えば、現行の新 seed 再戦は「敵は同じだが手札が違う」＝敗因の検証ができない状態だった。

さらに測って分かったこと：**敵の予告列は seed に依存しない**。だから同じ seed で引きを固定して初めて「同じ問題」が成立する。

---

## 3. 実装（最小差分・runtime 3 ファイル＋新規 1）

`src/core/` の runtime 変更 **0**。新しい永続 state **0**。`saveVersion` 9・`gameVersion` とも不変。

### 3-1. `src/components/battle/retrySemantics.ts`（新規・純関数）

再戦の意味を 1 か所で決める。

```
isSameBoardRematch({ mode, status })
  = mode が通常（undefined の旧セーブ含む） かつ status が lost / finished
resolveRematchSeed({ mode, status, seed })
  = 同じ盤面なら seed、そうでなければ undefined（呼び出し側が新規発行）
```

- **敗北・未撃破** → 同じ盤面
- **勝利** → 従来どおり新しい盤面（勝った盤面を反復させない）
- **神域挑戦** → 対象外（`startDailyGame` の既存経路のまま）

### 3-2. `src/hooks/useGameEngine.ts`（2 行）

`startGame` に任意引数 `seed?: string` を追加し、優先順位を

```
resolveForcedSeed()（URLバックドア ?seed=） ?? requestedSeed ?? `seed-${Date.now()}`
```

とした。`?enemy=` と同じく **URL バックドアが常に最優先**という既存の順序を保つ。`startDailyGame` は一切触っていない。

### 3-3. `src/components/GameFlow.tsx`（再戦ハンドラ）

`engine.startGame(...)` の末尾に `resolveRematchSeed({ mode: engine.state.mode, status: engine.state.status, seed: engine.state.seed })` を渡すだけ。Daily 分岐（`beginDailyChallenge` で return）はその手前にあり、通っていない。

### 3-4. `src/components/battle/resultHub.ts`（文言）

`exitLabel('rematch', ctx)` を同じ純関数で出し分ける。

| 状況 | 文言 |
| --- | --- |
| 通常戦・敗北／未撃破 | **同じ盤面でもう一度** |
| 通常戦・勝利 | 同じ構成でもう一度（従来どおり） |
| 神域挑戦 | もう一度挑戦（残りN回）（従来どおり） |

判定と文言が同じ関数を参照するため、**「撃破する」と言われて別の手札が来る**状態は構造的に起きない。

### 3-5. 新しいボタンは足していない

決定195 では Secondary に「同じ構成で次の盤面」を置く案を書いたが、採用しなかった。理由：①Primary は 1 個という P1 の設計を崩す ②新しい出口 ID を 4 ファイルに通す差分が必要 ③**逃げ道は既存の出口が持っている**（「デッキを調整」「神・デッキを選び直す」はどちらも新しい seed で始まる）。③は受け入れテスト AC5 で実測して確認した。

---

## 4. 検証結果

### 4-1. 自動テスト

| 項目 | 結果 |
| --- | --- |
| `npx tsc -b --noEmit` | エラー 0 |
| `npx oxlint .` | `src/` の警告 0（既存の `scripts/` 警告のみ） |
| `npm run build` | 成功（`index-DPfeXSyI.js` 427.50 kB / gzip 131.34 kB） |
| `npx vitest run --dir src` | **85 files / 1,064 tests 全通過**（新規 19＋更新 1 を含む） |
| `npx vitest run src`（worktree 込みの広い実行） | 254 files / 3,177 tests 全通過 |

新規・更新したテスト：

- `src/core/engine/sameSeedRetry.test.ts`（4）… 決定論監査。7神×7敵の網羅を含む
- `src/components/battle/retrySemantics.test.ts`（7）… 再戦の意味論
- `src/components/solveLoopWiring.test.ts`（7）… 配線ガード（ソース固定）。**Daily の seed 経路・回数消費に触れていないことを機械的に保証**
- `src/components/battle/resultHub.test.ts`（+1 更新）… 文言

### 4-2. 受け入れテスト（実ブラウザ・`vite preview` のビルド成果物に対して）

`node scripts/solve-loop-v1/acceptance.mjs <out> <url>` → **PASS 17/17**。`?seed=` は使っていない（URL で固定すると検証にならないため）。

| AC | 内容 | 実測値 |
| --- | --- | --- |
| AC1-1/2 | 敗北の Primary が「同じ盤面でもう一度」／出口は `rematch` | PASS |
| AC1-3 | 再戦の seed が同じ | `seed-1789731911077` → `seed-1789731911077` |
| AC1-4 | 初期手札が同じ | `🌿 姉御の号令 / ✨ 巫女の舞 / 🌟 予言 / ⚔ 豪快な一撃 / ⚔ 剛撃` が完全一致 |
| AC1-5 | 敵の予告が同じ | `⚔ 50` → `⚔ 50` |
| AC1-6 | 敵HPが同じ | `1,000 / 1,000` → `1,000 / 1,000` |
| AC2-1/2 | **未撃破（7R終了）**も同じ盤面 | `seed-1789731935105` で一致・手札一致 |
| AC3-1 | 勝利の文言は「同じ構成でもう一度」のまま | PASS |
| AC3-2 | 勝利の再戦は seed が変わる | `…981451` → `…023477`（手札も別） |
| AC4-1 | Daily の文言は「もう一度挑戦（残りN回）」のまま | PASS |
| AC4-2/3/4 | Daily は同日 seed・`daily-` 形式・`mode: daily` のまま | `daily-2026-09-18-enemy_02` が再戦後も同一 |
| AC4-5 | Daily の回数消費は開始 1 回につき 1（1 → 2） | PASS |
| AC5-1 | 敗北後「デッキを調整」→開始 は**新しい盤面** | `…050764` → `…069300` |
| AC6-1 | コンソールエラー 0 | PASS |

### 4-3. 不変条件

| 項目 | 結果 |
| --- | --- |
| `src/core/` の runtime 差分 | **0**（追加したのはテスト 1 本のみ） |
| `saveVersion` | 9（不変） |
| `gameVersion`（`src/core/replay/gameVersion.ts`） | 不変 |
| Daily seed 意味論（同日共有・3回/日・JSTリセット） | 不変（AC4・配線テストで二重に確認） |
| 敵の意図・7ラウンド・AP・神託・共鳴・自動BURST・カード／神／OTOMO効果・敵数値・難易度バランス・スコア式 | 不変（`src/core` 無変更のため構造的に保証） |
| Ranking Absence Gate | PASS（`scripts/release-audit/ranking-absence.mjs` 全項目） |
| Secret Audit | PASS（credential 形式の値 0） |
| 新しい永続 state・localStorage キー | 0 |

---

## 5. 想定されるリスクと対処

| リスク | 評価 | 対処 |
| --- | --- | --- |
| 同じ盤面の固定が暗記化・作業化を招く | 低。**勝てば新しい盤面に戻る**ため、固定は「勝つまで」で自然に終わる。Daily は既に同日 3 回で同じ構造 | 仕様として敗北時のみに限定 |
| 詰んだ盤面に閉じ込められる | 低。神階Ⅶ でも「読めば勝てる」が約 93%（PHASE5F）。加えて逃げ道が Secondary にある | AC5 で実測（デッキ調整→開始は新しい盤面） |
| 記録の farming（同じ盤面でベスト更新） | 変化なし。`?seed=` 共有 URL で以前から同じことが可能（決定126） | 新たな integrity 問題を作らない |
| 旧セーブ（`mode` 未設定）での誤判定 | 低 | `mode ?? 'normal'` として扱い、テストで固定 |
| Daily への波及 | なし | 配線テストで `startDailyGame` に `requestedSeed` が混ざらないことを固定 |

---

## 6. 残件（本 Decision の範囲外）

- 「同じ盤面」を選んだ回数の可視化・計測（決定195 の KPI ③ Defeat→Retry rate）。計測基盤は未導入のため今回は入れない
- 通常戦の「前回 → 今回」比較（神×敵ベスト）は新しい永続 state を要するため L6
- Entrance E1（`feat/entrance-e1` `1cba2e6`）の Production 公開は別の CEO Gate。本ブランチは master から分岐しており、**E1 の判断を待たずに単独でリリース可能**（`useGameEngine.ts`・`resultHub.ts` は E1 が触っていない。`GameFlow.tsx` は別のハンクで、再戦ハンドラは master と E1 で byte 一致）

---

## 7. Human QA（CEO へのお願い）

1. 通常戦でわざと負けて、Primary が「**同じ盤面でもう一度**」になっているか
2. 押した直後の **手札 5 枚が、さっきと同じ並び**か（敵の予告も同じか）
3. もう一度考え直したくなるか。＝「さっきの判断を変えれば勝てそう」と思えるか
4. 勝ったあとに押す「同じ構成でもう一度」は、**別の手札**になっているか（同じ盤面が繰り返されないこと）
5. 神域挑戦（今日の3回）が今までどおりか（同じ敵・同じ盤面・残り回数の減り方）
6. 7ラウンド終了（未撃破）でも同じ盤面で始まるか

---

## 8. 判定

**PASS / READY FOR CEO QA。** Production 反映は未実施（CLAUDE.md §6-3 #8）。commit はこのブランチのみ、push・merge・deploy は行っていない。
