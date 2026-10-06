# 決定267 Production Smoke（2026-10-07 05:23 JST・本番 URL https://seven-gods-game.vercel.app・deployment 6894408979・1 browser 直列）

- 配信確認：push 後 ≈30 秒で `index-3It0LpNO.js` を配信（md5 `c41abc0782e0…`＝RC clean build・Human QA dist と一致）
- 手順：`scripts/d267-reward-relevance-v1/acceptance.mjs` を本番 URL に対して実行（U1〜U6・固定 seed `d267-u1-pc`／`d267-u2-sp`・Daily は本番の当日ボス）。各 run は新規ブラウザ context（CEO 端末の Daily 回数には影響しない）
- 結果：**6/6 PASS**・console error 0・製品異常 0 → 追加修正なし

| run | viewport | checks | console error | 3 択（役：札）／Daily DOM |
|---|---|---|---|---|
| u1-pc | 1508×660 | 13/13 | 0 | ready：card_common_resonance_01／identity：card_ebisu_attack_02／next：card_common_support_01 |
| u2-sp | 390×844 | 13/13 | 0 | ready：card_common_hinder_02／identity：card_ebisu_attack_02／next：card_common_attack_08 |
| u3-pc | 1508×660 | 13/13 | 0 | ready：card_common_resonance_01／next：card_common_support_01／next：card_common_attack_08 |
| u4-sp | 390×844 | 13/13 | 0 | ready：card_common_resonance_01／next：card_common_support_01／next：card_common_attack_08 |
| u5-pc | 1508×660 | 6/6 | 0 | {"openReward":false,"resultHub":true,"dailyDiff":true,"rewardOverlay":false} |
| u6-sp | 390×844 | 6/6 | 0 | {"openReward":false,"resultHub":true,"dailyDiff":true,"rewardOverlay":false} |

確認項目：Reward 3 択（役割チップ・枚数行・枠内・横スク 0）／pick → `rewardBonuses` +1・トースト／skip → `offered`＝`declined`・別 seed の 2 勝目で再提示なし／Daily 勝利で報酬ボタン無し・Result Hub 直接・`rewardHistory` 未作成／PC 1508×660・SP 390×844。証跡 `acceptance-out/summary.json`・PNG。
