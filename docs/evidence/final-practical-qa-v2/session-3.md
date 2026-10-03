# Final Practical QA v2 — Session 3（Daily・2026-10-03・CEO 実プレイ）

- 対象：Production `https://seven-gods-game.vercel.app/`（master `cce3bb4`・runtime `8cba184`＝決定261 対峙構図 v2 LIVE・Vercel `6820829725`）。Final QA 中の runtime 変更 0
- 条件：別日の Daily（神域挑戦）・same-seed・3 回・best-of-3・Ranking UI は未実装のため評価しない
- 記録者：AI（CEO の言葉をそのまま）

## 1. CEO の自由所感【CEO】
- 「敵と神の大きさがアンバランス。」（添付の Session 3 画面では神が敵よりかなり大きく見える）
- 「ゲージの場所ももう少し考えた方がいいかも」
- 「対戦中、音楽のほかに敵や神の声を出せないか。必殺技を出す際や始まるときなど」

## 2. 進行・公平性・表示
- Daily の開始・3 回の消費・same-seed・結果表示について問題の報告なし
- 進行不能・入力不能・横スクロール・クラッシュ・音の障害の報告なし

## 3. K02（iOS で AudioContext 割り込み後に BGM が再開するか）
- Session 3 の記録に確認の記述 **なし**＝**未確認**（推測で PASS にしない）。RC 前の Device Check（5 分）に分離（`docs/FINAL_PRACTICAL_QA_CLOSEOUT.md` §5-1）

## 4. Triage 入力（→ CLOSEOUT §3）
- 所感 1・2 → C「Battle Composition v3 — Duel HUD」（神 vs 敵の相対 scale・ゲージ配置）＝CAN SHIP（昇格枠候補 #1）
- 所感 3 → D「Battle Voice Layer」＝POST-RC（権利・生成方式・費用は CEO）
