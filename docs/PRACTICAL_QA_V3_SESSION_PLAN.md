# Practical QA v3 ＋ iPhone 性能確認 — 1 セッション実施計画（CEO 用）

- 日付：2026-10-09（Lane 2・AI 準備）。設問の定義は `docs/PRACTICAL_QA_V3_DESIGN.md`、性能 3 問は `docs/SP_PERF_EVIDENCE_V1.md` §4、公式ボイスは `docs/OFFICIAL_VOICE_PILOT_V1.md` §9（**別 branch・別 URL**）
- **実施済み（2026-10-10・CEO 報告）**：結果と A／B／C 判定は integ master の `docs/PRACTICAL_QA_V3_RESULT.md`。本書は手順の記録として残す（preview 4178／4173 は QA 後に停止してよい）
- 所要：約 30〜40 分（本編 25〜35 分＋ボイス試聴 5 分）。端末：PC（Chrome）＋ iPhone（Safari）。同じ Wi-Fi

---

## 0. URL（AI が起動済み・止まっていたら §6）

| 用途 | ビルド | PC | iPhone（同じ Wi-Fi） |
|---|---|---|---|
| **本編（QA v3＋性能 3 問＋HP pill）** | integ master `021795b`（CM-01／RL-01／Release Safety／RL-01b／A11y 統合済み。Credits 画面は未統合） | `http://127.0.0.1:4178/` | `http://192.168.11.6:4178/` |
| **公式ボイス試聴（別 Pilot・混同注意）** | `feat/official-voice-pilot-v1` `16140c9`（大耀「あいさつ」） | `http://127.0.0.1:4173/` | `http://192.168.11.6:4173/` |

iPhone から開けないときだけ、管理者 PowerShell で 1 回（QA 後に削除）：

```
New-NetFirewallRule -DisplayName "SEVEN GODS preview 4178" -Direction Inbound -Protocol TCP -LocalPort 4178 -Profile Private -Action Allow
```

（4173 用も同様。Wi-Fi が「パブリック」なら `-Profile Public`）

## 1. 準備（2 分）

1. iPhone：設定 → Safari → 履歴と Web サイトデータを消去（cold 計測のため）。サイレントスイッチ OFF・音量 50%
2. PC：Chrome のシークレットウィンドウで開く（localStorage が空＝初回プレイの状態）
3. 記録：§4 の表をコピーして使う。観察者がいれば「事実ログ」（QA v3 設計 §5）を並行

## 2. 確認する順番（iPhone で本編 → PC で 2 戦目 → ボイス）

| 順 | 端末 | 操作 | 記録するもの |
|---|---|---|---|
| 1 | iPhone | 4178 を開く → Home の神の絵と「初陣へ」が出るまで | **P1** 3 秒以内か（YES／NO） |
| 2 | iPhone | 「初陣へ」→ 短い説明 → 出陣（初陣＝恵比寿 × 試練の影） | 入口（降臨の間）の映像がカクつかず、終わった直後にカードが押せたか → **P2** |
| 3 | iPhone | 初陣を最後まで（勝っても負けても） | **Q1** 勝ち方が分かったか／**Q3** 敵の次の行動を自分の言葉で言えるか／**Q4** カードを選ぶ基準が言えたか／**Q9** HP の数字が緑／赤の上で一目で読めたか（pill が邪魔でないか） |
| 4 | iPhone | 続けて 3 ラウンド分くらい操作（2 戦目の冒頭でよい） | **P3** 押してから反応までの引っかかり・発熱がないか |
| 5 | iPhone or PC | 結果画面の後に自分で次の 1 戦を始める（誘導しない） | **Q2** 自力で 2 戦目を始めたか・きっかけ |
| 6 | PC | 2 戦目：託宣を使う／温存する場面、負けたら「もう一度」 | **Q5** 託宣を温存した場面・導きを使ったか／**Q6** 負けた後に「もう一度」を押し何を変えたか |
| 7 | PC | 構成を変えてもう 1 戦（神か敵かデッキを変える） | **Q7** 勝ち方が変わったか |
| 8 | PC（任意） | Android か別ブラウザで 1 戦 | **D1** 互換 Smoke（端末名だけ記録） |
| 9 | **別 URL** iPhone→PC | **4173** を開く → 神を選ぶ → 大耀 → バトル開始 → 入口直後に声 | **Q8-1** 自分の神が目の前にいると感じたか／**Q8-2** 11.8 秒は長すぎないか／**Q8-3** iPhone で BGM が下がりミュートで止まるか |

本編 URL（4178）には公式ボイスは入っていない。4173 だけが Pilot。混ぜて評価しない。

## 3. 判定の読み方（QA v3 設計 §4 の要約）

- **A**（即時修正）：進行不能・白画面・保存が消えた・同じ seed なのに違う盤面 → 1 件でも v1.0 停止
- **B**（v1.0 前に直す）：Q1〜Q4・Q6 の NO（CEO）、または初心者 2 人以上の NO
- **C**（Known として公開可）：Q5・Q7 の NO、初心者 1 人だけの NO
- **別 Gate**（v1.0 を止めない）：Q8（NO → Pilot 撤去／短縮案）・Q9（NO → pill の透明度を 1 回だけ再調整）・P1〜P3（NO → Known K01 の記録を更新・preload の再検討）・D1

## 4. 回答記録（コピーして記入）

```
日付：2026-10-__　実施者：CEO（＋初心者 __ 名）
本編ビルド：021795b（4178）　ボイス：16140c9（4173）　iPhone 機種／iOS：______　PC ブラウザ：______

P1 Home が 3 秒以内に出た      YES / NO   メモ：
P2 入口がカクつかず直後に操作可  YES / NO   メモ：
P3 引っかかり・発熱なし        YES / NO   メモ：
Q1 勝ち方が分かった            YES / NO   メモ：
Q2 自力で 2 戦目を始めた        YES / NO   きっかけ：
Q3 敵の次の行動を自分の言葉で   YES / NO   言った言葉：
Q4 カードを選ぶ基準が言えた     YES / NO   基準：
Q5 託宣を温存した場面があった   YES / NO   導きを使った：YES / NO
Q6 負けた後「もう一度」を押した YES / NO   変えたこと：
Q7 構成を変えて勝ち方が変わった YES / NO   メモ：
Q8-1 自分の神が目の前にいる     YES / NO
Q8-2 11.8 秒は長すぎる          YES / NO   （長いなら：セッション 1 回 / 冒頭だけ / 撤去）
Q8-3 iPhone で BGM が下がり、ミュートで止まった YES / NO
Q9 HP の数字が一目で読めた      YES / NO   pill が邪魔：YES / NO
D1 互換 Smoke 端末：______      問題：なし / あり（内容）
A 事象：なし / あり（内容・再現手順・seed）
```

## 5. 実施後に AI がやること

1. 回答を `docs/PRACTICAL_QA_V3_RESULT.md` に転記し、A／B／C と別 Gate に分類
2. B があれば Narrow Pilot として 1 件ずつ起票（runtime 変更は CEO GO 後）
3. P1〜P3 の結果を `SP_PERF_EVIDENCE_V1.md` §4 に追記（DoD #15 を閉じる）
4. Q8 の結果で公式ボイス Pilot の統合／撤去を決める（Q9 は pill α の再調整要否）

## 6. preview が止まっていたら（PowerShell）

```
cd C:\Users\kimi1\SevenGodsGame-integ; npx vite preview --host 0.0.0.0 --port 4178 --strictPort
cd C:\Users\kimi1\SevenGodsGame-voice-pilot; npx vite preview --host 0.0.0.0 --port 4173 --strictPort
```
