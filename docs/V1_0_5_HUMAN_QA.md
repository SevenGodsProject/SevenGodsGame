# v1.0.5 CEO Human QA 記録（iPhone 実機）

> **結果：8/8 PASS（2026-10-24・CEO 実施・iPhone 実機）**。これは CEO が評価した結果の記録で、AI の判断ではない。手順は `docs/V1_0_5_SE_SHAKE_PROBE.md` §3。

## 1. 実施条件

| 項目 | 内容 |
|---|---|
| 対象 build | `release/v1_0_5-rc-candidate` `1dd2204`（runtime は `40ff3f4` と同一）・`index-D_sKHf-a.js`・Home の表示 `v1.0.4 (40ff3f4)`（この時点では version 未更新） |
| 配信 | PM が LAN Preview（`npx vite preview --host 0.0.0.0 --port 4183 --strictPort`・worktree `SevenGodsGame-v105rc`）で配信。URL `http://192.168.11.6:4183/`・Wi-Fi `Buffalo-2G-67E0`。Production には影響していない |
| 端末 | CEO の iPhone・Safari（手順はプライベートタブ・ミュート解除・「視差効果を減らす」オフ） |
| 終了後 | PM が preview を停止した（node プロセス 0）。QA 用の Firewall 規則は PM は作っていない。CEO が追加していれば `Remove-NetFirewallRule -DisplayName "SevenGods QA Preview 4183"` で削除する |

## 2. 回答（CEO の原文）

`1a=YES 1b=NO 2a=YES 2b=YES 2c=NO 3a=YES 3b=YES 3c=NO`

| # | 項目 | 問い | 合格条件 | 回答 | 判定 |
|---|---|---|---|---|---|
| 1a | 同じ盤面 Retry の前回比（Stage B） | 2 回目の結果画面の「同じ盤面 2 回目：前回 … → 今回 …」で、前より進んだ／戻ったが分かったか | YES | YES | PASS |
| 1b | 同上 | 「正解を教えられている」と感じたか | NO | NO | PASS |
| 2a | Break 時の音（Break SE） | 音だけで「追い詰めた」と分かったか | YES | YES | PASS |
| 2b | 同上 | 着弾音とは別の出来事に聞こえたか | YES | YES | PASS |
| 2c | 同上 | うるさい・多いと感じたか | NO | NO | PASS |
| 3a | 敵攻撃の重量感（揺れ） | 敵の必殺が「重い一撃が来た」と体で分かったか | YES | YES | PASS |
| 3b | 同上 | 神の一撃の揺れの方が大きく感じたか | YES | YES | PASS |
| 3c | 同上 | 酔う・うるさい・やりすぎと感じたか | NO | NO | PASS |

## 3. 帰結

- 不合格のときの調整案（前回比の短縮・quarter だけ鳴らす・2px／3px への引き下げ）は**どれも使わない**。数値と文言は RC 候補のまま確定する。
- probe で WARN としていた「実機での揺れと被弾のずれ」は、3a・3b・3c の PASS により、体感上の問題が無いことを確認した（実機の fps での確認）。
- 「溜め予告中の half は鳴らさない」は QA の手順中に起きる場面ではないため、引き続き単体テストで担保する（WARN として RC Gate に残す）。
