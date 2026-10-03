# K02 Device Check — iOS 割り込み後の BGM 再開（CEO 実機・2026-10-03）

- 対象：Production `https://seven-gods-game.vercel.app/`（runtime `8cba184`＝決定257 Sound Layer v1＋決定261 LIVE）。runtime 変更なし
- 端末：iPhone（Safari）
- 手順【CEO】：戦闘中 BGM 再生 → iPhone でアプリ切替 → Safari へ復帰 → ゲーム操作 → BGM が正常に復帰
- 結果【CEO】：**PASS**「BGM が戻った」
- 判定：K02 = **PASS → CLOSED**（MUST FIX BEFORE RC から除外。`docs/COMMERCIAL_RC_KNOWN_ISSUES_TRIAGE.md` §8）
- 未確認のまま残すもの：ロック／着信からの復帰は本 Check の手順に含まれていないため記録しない（推測で PASS にしない）
