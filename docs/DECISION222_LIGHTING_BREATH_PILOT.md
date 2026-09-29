# 決定222 — Lighting Breath Narrow Pilot（Blind Human QA FAIL・Living Background 終了）

- 日付：2026-09-23
- 前提：決定221 承認（固定の定義＝「形・位置・シルエット・内容・色相は完全固定。環境照明の緩やかな輝度変化のみ許可。上限 +8% luma・加算のみ・暗転禁止」）
- 状態：**CLOSED — Blind Human QA FAIL（CEO 判定）。runtime / assets は完全撤去済み。静止背景を正式採用状態として維持。**

## 0. Close-out（CEO 判定・2026-09-23）

**Blind Human QA 結果**（2 URL・どちらが ON かは事前非開示。ON = `xnk8`、OFF = `2wf8`）
1. どちらが「背景が生きている」と感じたか → **どちらも生きていると感じない**
2. 違いを自然に認識できたか → **違いはよく分からなかった**
3. 背景について → **静止画に感じた**
4. 可読性 → 問題なし

**判定：決定222 Human QA FAIL。Living Background 開発はここで終了。** v0.3・強度アップ・別 mask・別 procedural 方式・H3 再生成・fal.ai 追加利用は行わない。

**経緯の総括**
| 試行 | 結果 |
|---|---|
| H3 全面 Living Background（fal.ai 動画） | NO-GO |
| 決定219 H3 Environmental VFX 抽出 | NO-GO |
| 決定220 Water Procedural（v0.1 / v0.2） | Human QA FAIL（実効カバー率 0〜4%：描画範囲外） |
| 決定222 Lighting Breath（実効カバー率 34.9%・+7.5% luma） | **Blind Human QA FAIL** |

**結論**：canonical identity と gameplay readability を維持する制約下では、現時点の Living Background はプレイヤーが知覚できるだけの体験価値を生まなかった。**「技術的に作れるか」ではなく「実プレイで価値を感じるか」を Human QA した結果、採用しなかった。** 静止背景を正式採用状態として維持する。

**撤去（runtime / assets）**：`BattleScreen.tsx`・`battle.css` を `git checkout --`（明示パス）で HEAD 43c10a4（決定218 Human QA 準備時点）へ復元。`06-dragon-ocean-light-{moon,dragon,lantern}.webp` と `06-dragon-ocean-water-mask.webp` を削除。canonical `06-dragon-ocean.webp` は blob `241a1a1c…`（HEAD と一致・無変更）。`src/core` 差分 0。決定219/221/222 の docs は結果記録として保持（未 commit。commit は CEO 承認待ち）。

---
（以下は Human QA 前の実装記録。撤去済みの内容だが、再現性のため残す）

## 1. 変更ファイル
| ファイル | 内容 |
|---|---|
| `src/components/battle/BattleScreen.tsx` | 決定220 の 1 要素を 3 要素（moon / dragon / lantern）に。`?living=off` と blind token。engine/state/seed に関与なし |
| `src/components/battle/battle.css` | 決定220 の水域ブロック（125 行）を削除し、決定222 の照明ブロック（96 行）を末尾に追加 |
| `public/assets/backgrounds/stages/06-dragon-ocean-light-{moon,dragon,lantern}.webp` | 新規 3 枚（8.5KB / 12.0KB / 18.5KB。各 ≤ 20KB） |
| `06-dragon-ocean-water-mask.webp` | 削除（決定220 の水域方式は撤去） |

`src/core` 差分 0。canonical `06-dragon-ocean.webp` 無変更。

## 2. 方式
- 光マップ = canonical をぼかした色の **R:G:B 比**（加算しても色相が変わらない）× 照明フットプリント α。
- 3 層を `.battle-main` と同じ `cover / center top` で敷き、**opacity だけ**を呼吸させる（14s / 11s / 9s、位相ずらし。最小公倍数 1386s）。
- 合成 `plus-lighter`（非対応は `screen`）。加算量 = opacity × α × 色 ≤ opacity × 255。
- **上限の構造的保証**：画素ごとに 3 層の α 合計を 1 以下へ正規化し、opacity 最大 0.08 → 加算 ≤ 20.4 luma（8%）。3 層同時ピークでも超えない。
- JS 0・filter 0・コンポジタ層 3・`prefers-reduced-motion` で 3 層とも `display:none`。

## 3. オフライン Gate（arena 座標系・3 層同時ピーク＝最悪ケース）
| viewport | 描画範囲内の光量（月/龍/灯籠） | 実効カバー率（UI に隠れず +2 luma 以上） | 最大 luma 増 | 呼吸の振れ幅 最大 | 色相差 平均（>5° の割合） |
|---|---|---|---|---|---|
| **PC 1508×660（CEO 実環境）** | 100% / 99% / 27% | **34.9%** | **+19.0（7.5%）** | 13.9 | 0.50°（1.9%） |
| PC 1366×768 | 100% / 100% / 69% | 31.7% | +19.0 | 14.0 | 0.53°（1.9%） |
| SP 390×844 | 86% / 22% / 65% | 25.3% | +19.0 | 13.9 | 0.68°（2.4%） |

固定物の上の最大 luma 増（1508×660）：月盤 +0.6（WebP α の縁のにじみ）／龍 bbox +9.8／神殿・階段 +19.0／鳥居 +7.3／石床 +0.0。形・位置・シルエットの変化は構造上 0（画素の置換をしない）。

色相差の最大値（34.5°）は、光マップの色（局所平均）と画素の色が異なる**輪郭部**の低彩度画素で生じる。彩度 24 以上の画素で >5° は 1.9%。

tests：`vitest --dir src` 94 files / 1191 PASS、`oxlint` 0、`tsc -b` 0、build 成功（`index-DuAjqr40.js` / `index-yJCgadzg.css`）。

## 4. 未実施
- 実ブラウザでのスクリーンショット（空きメモリ 708MB < ゲート 1.5GB）。描画範囲の証拠はオフライン幾何（§3）による。

## 5. Human QA（ブラインド）
- 2 つの URL（`?living=<token>`）。どちらが OFF かは scratchpad `d222/blind-key.txt` に封印、QA 後に開示。
- 確認 4 点：①どちらが「背景が生きている」か ②違いを自然に認識できたか ③背景の方が気にならなかったか ④カード／Enemy Intent／キャラクターの可読性。
- PASS：ON を正しく識別／「生きている」／邪魔でない／可読性低下なし。

## 6. 決定220 からの学び（適用済み）
- Gate は canonical 座標ではなく **arena 座標系（cover + center top + UI 遮蔽）**で測る。
- 「見える・固定輪郭に接する・低空間周波数・0.07〜0.11Hz・+8% 上限」で設計。
