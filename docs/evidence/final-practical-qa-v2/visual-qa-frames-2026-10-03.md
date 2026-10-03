# Visual QA 所感：敵と神のまわりの「枠」（CEO・2026-10-03・決定262 Human QA 時）

- 対象：Production runtime `8cba184`（決定261 対峙構図 v2 LIVE）。決定262 の After 画面でも同じ（決定262 は結果画面の文言のみ）
- 分類：**K34「Battle Composition v3 — Character Integration / Duel HUD」の evidence**（決定262 とは混ぜない。まだ実装しない）

## CEO の言葉【CEO】
- 「敵と神のまわりの円や四角の枠が気になる」

## 観察（CEO 所感の整理）
- 敵／神の周囲の円形・角丸四角プレートが、**戦場に直接立っている感覚を弱める**
- 上部 HP／共鳴パネルを含め、**四角い箱が多い**
- キャラクターが背景に統合されず、**別画像を配置したように見える**

## 既存 Known との関係【docs】
- S2「敵と神がカードより小さい」→ 決定261 で解消（サイズ・向き）。S3「神と敵の大きさがアンバランス」「ゲージの場所」→ K34。本所感は K34 の第 3 の軸＝**キャラクターと背景の統合（Character Integration）**：枠・プレート・箱の削減、立ち位置の接地（影・床・光）、HUD の帰属
- 決定204 Living Hero Layer・決定219 H3 Env VFX・決定221 Living Stage の監査（背景とキャラクターの統合）と同じ領域。実装候補は Composition v3 Preflight で扱う（CSS：プレート枠の透過／影への置換・HUD 箱の統合は TSX）

## 扱い
- RC：影響なし（CAN SHIP・K34 のまま）。Production：変更なし
- 次：Composition v3 Preflight の対象に「Character Integration（枠・プレート・箱）」を追加（まだ実装しない）
