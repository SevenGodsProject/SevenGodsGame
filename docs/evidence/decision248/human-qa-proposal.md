# Decision248 — Human QA 案（実装後に使う。今は設計のみ）

## 前提
- Before＝Production（実装時の master）、After＝Pilot build。同じ seed・同じ神・同じ敵。PC と iPhone
- 推奨：大耀 × 蒼海の龍神（STRIKE／GUARD／MEND／ATTUNE が 1 戦で全部出る：後輩想い・姉御の号令・一心不乱・神楽舞・受け流し）と 寿楽 × 乱舞の道化（WEAKEN 中心：悪戯・呪縛・浄めの光・からかい半分）
- 各 1 戦。託宣は R4 の峰で加護（GUARD の反応を託宣でも見る）

## 3 問（3/3 YES で PASS）
1. 攻撃・防御・回復など、カードの「意味の違い」が以前より感じられるか？
2. カードを使ったとき、God／OTOMO／Enemy が実際に反応して戦っている感じが増えたか？
3. 演出がうるさすぎず、Intent・カード・HP を読む邪魔にならないか？

## NO のときの扱い
- Q1 NO：primitive の区別が弱い → 色ではなく「方向・場所」の差（沈む／持ち上がる／よろめく）を強める。数値は候補値の範囲内（≤6px・≤450ms）で 1 回だけ調整して再 QA。2 回目も NO なら NO-GO
- Q2 NO：主体の選択が違う → semantic→主体の表（§1）を見直す。primitive を増やさない
- Q3 NO：頻度×強度が過剰 → DEAL の開幕 5 枚を無効化、RISE の OTOMO pop を外す、の順で減らす。神の一撃・⚡には触れない

## 機械 Gate（実装時・Human QA の前）
| # | 項目 | 合格 |
|---|---|---|
| G1 | semantic 判定 60/60・unknown 0（テスト） | 必須 |
| G2 | semantic → primitive が決定論（同じ def → 同じ class 列） | 必須 |
| G3 | engine の結果不変：`gameVersion` 同一・golden 同一・1,235 tests PASS | 必須 |
| G4 | 入力ロック時間 280ms 不変（Playwright で押下→次の押下可能まで） | 必須 |
| G5 | reduced-motion：P2〜P6 の transform 0・120ms フェードのみ（computed style） | 必須 |
| G6 | PC 1508×660／SP 390×844 の箱（名札・HP・予告・手札）の差 0px、横スクロール 0 | 必須 |
| G7 | 決定224／226／229／232〜241／246／247 の保護ブロック不変（CSS 末尾追記のみ・diff は末尾） | 必須 |
| G8 | 1 戦の反応回数：Tier 1 ≤ 8 回／戦（sim）、⚡・神の一撃の回数不変 | 必須 |
| G9 | bundle：CSS ≤ +4KB・JS ≤ +2KB | 目標 |
