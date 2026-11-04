# v1.1.5 Hotfix：将軍家の戦闘背景（舞台画像）復元 — Gate 記録（2026-11-05）

CEO の本番実プレイ（v1.1.4）で「将軍家との戦闘に背景が表示されない」指摘 → READ-ONLY 監査（原因特定・本番再現）→ AI-PM Decision「v1.1.5 Background Hotfix GO」で実装。
**runtime の変更は CSS 4 規則（4 ファイル・約 25 行）だけ**。engine・数値・決定論・save v9・画像素材・音声に変更なし。外部費用 0。

## 0. 結論

| 項目 | 結果 |
|---|---|
| 原因 | `shogunateWave2〜5.css` の「舞台の周辺減光」規則が `.battle[data-enemy] .battle-main` の `background-image` を周辺減光グラデだけで上書きし、共通規則の舞台画像層 `var(--stage-bg, …)` を落としていた（`background-image` は多層指定ごと置き換わる）。忠次（enemy_08・battle.css 末尾）は画像層を併記していたため正常 |
| 影響 | 将軍家 10 体中 9 体（enemy_10〜18）・PC／SP とも舞台画像なし。v1.1.0（W2・2026-11-03）〜v1.1.4 の本番で継続。既存 7 体・忠次・Threat Pilot（enemy_09）は正常 |
| 修正 | 4 規則に、忠次ブロックと同じ並びで「共通の減光グラデ → 周辺減光（各 Wave の意図のまま中間層）→ `var(--stage-bg, url('/assets/backgrounds/arena.jpg'))`」を併記 |
| 素材 | 既存の舞台 10 枚（`backgrounds/stages/08〜17`・台帳 STG-08〜17）をそのまま使用。新規生成 0 |
| 検証 | §2（契約テスト・vitest 1,702）・§3（実ブラウザ 17 体 × PC／SP375 before／after）・§4（S5／S6／cf2 回帰） |
| 残リスク | §5 |

## 1. 変更ファイル

| ファイル | 変更 |
|---|---|
| `src/components/battle/shogunateWave2.css` | enemy_10〜12 の `.battle-main` 規則：画像層＋共通減光を併記 |
| `src/components/battle/shogunateWave3.css` | enemy_13〜15 同上 |
| `src/components/battle/shogunateWave4.css` | enemy_16〜17 同上 |
| `src/components/battle/shogunateWave5.css` | enemy_18（康虎）同上（金の薄明は先頭層のまま） |
| `src/components/battle/shogunateStageBg.test.ts` | 新規：契約テスト（§2） |
| `scripts/release-audit/stage-bg-probe.mjs` | 新規：実ブラウザで `.battle-main` の計算済み `background-image` に舞台 url が含まれるかを 17 体 × viewport で読む（読み取り専用） |
| `package.json`／`package-lock.json`／`src/publicFace.test.ts` | version 1.1.4 → 1.1.5 |

## 2. 契約テスト（`shogunateStageBg.test.ts`・7 件）

- 共通規則（battle.css）と忠次ブロック（enemy_08）が `var(--stage-bg, url('/assets/backgrounds/arena.jpg'))` を持つ
- Wave2〜5 の `.battle-main` を上書きする規則はすべて、共通の減光グラデと `var(--stage-bg, …)` を併記し、画像層が最後（最背面）にある。`background:` 短縮形で size／position を壊さない
- Wave2〜5 の上書きは enemy_10〜18 の 9 体をちょうど一度ずつ覆う（抜け・重複なし）

→ 今回の見落とし（Gate の判定項目に「背景画像の有無」が無かった）を機械化。以後、周辺減光だけの上書きは vitest で落ちる。

## 3. 実ブラウザ検証（`scripts/release-audit/stage-bg-probe.mjs`・大耀 × 17 体 × pc 1508×660／sp375 375×667・seed 固定）

| 敵 | PC before | PC after | SP375 before | SP375 after |
|---|---|---|---|---|
| 試練の影（enemy_01） | 画像あり | 画像あり | 画像あり | 画像あり |
| 業斧の鬼将（enemy_02） | 画像あり | 画像あり | 画像あり | 画像あり |
| 藍花の怨霊（enemy_03） | 画像あり | 画像あり | 画像あり | 画像あり |
| 銀甲の機工師（enemy_04） | 画像あり | 画像あり | 画像あり | 画像あり |
| 双牙の魔獣（enemy_05） | 画像あり | 画像あり | 画像あり | 画像あり |
| 蒼海の龍神（enemy_06） | 画像あり | 画像あり | 画像あり | 画像あり |
| 乱舞の道化（enemy_07） | 画像あり | 画像あり | 画像あり | 画像あり |
| 将軍四天王・忠次（enemy_08） | 画像あり | 画像あり | 画像あり | 画像あり |
| 捕り方・岡っ引き（enemy_10） | **画像なし** | 画像あり | **画像なし** | 画像あり |
| 将軍四天王・直政（enemy_11） | **画像なし** | 画像あり | **画像なし** | 画像あり |
| 将軍四天王・康政（enemy_12） | **画像なし** | 画像あり | **画像なし** | 画像あり |
| 忍者衆・影（enemy_13） | **画像なし** | 画像あり | **画像なし** | 画像あり |
| 忍者衆・くノ一（enemy_14） | **画像なし** | 画像あり | **画像なし** | 画像あり |
| 影の頭領・鬼半蔵（enemy_15） | **画像なし** | 画像あり | **画像なし** | 画像あり |
| 将軍四天王・忠勝（enemy_16） | **画像なし** | 画像あり | **画像なし** | 画像あり |
| 科学者・ドーマン（enemy_17） | **画像なし** | 画像あり | **画像なし** | 画像あり |
| 十七代将軍・康虎（enemy_18） | **画像なし** | 画像あり | **画像なし** | 画像あり |

before: 16/34 画像あり（https://seven-gods-game.vercel.app）
after: 34/34 画像あり（http://localhost:4197）

- before＝本番 v1.1.4（`https://seven-gods-game.vercel.app`）、after＝本 Hotfix の build（`vite preview` localhost:4197）
- 判定は `.battle-main` の計算済み `background-image` に `backgrounds/stages/NN-*.webp` が含まれるか。JS error は全件 0
- 画面（jpeg）：`docs/evidence/v1_1_5-stage-bg-hotfix/screens/`（岡っ引き・康虎・忠次・龍神の before／after・PC／SP375 の 16 枚。全 68 枚は scratchpad）。立ち絵・HP 札・手札の表示は before／after で同じ（舞台画像だけが復元）

## 4. 回帰（表示専用の変更＝進行は完全一致が条件）

| Gate | 結果 | 証跡 |
|---|---|---|
| vitest | **1,702 PASS（136 files・skip 17・新規 7 件を含む）** | `vitest-stdout.txt` |
| lint（oxlint）／tsc | PASS（warning は既存 scripts の 3 件・変更なし） | — |
| build | `index-Cx9pXbN3.js 492.73 kB（JS は v1.1.4 と同サイズ・変更なし）／index-CtARvCu4.css 213.02 kB（v1.1.4 212.46 kB ＋0.56 kB）` | — |
| S5 将軍家 公開受け入れ | **228/228 PASS（pc／sp375 × normal／legacy-shogunate／threat）** | `s5-acceptance.json`・`s5-stdout.txt` |
| S6 忠次 probe（v1.1.4 本番 Smoke 基準） | **6/6 MATCH（3 seed × pc／sp375・R1〜R4 intent／帯／HP／tactic 文言が v1.1.4 本番 Smoke と完全一致・errors 0）** | `s6-probe-normal/`・`s6-COMPARE_VS_V1_1_4_SMOKE.txt` |
| cf2 決定論 probe（既存 7 体 PC＋龍神 sp375・v1.0.6 統合 Gate 基準） | **8/8 MATCH（turns／plays／heavy／帯遷移が v1.0.6 統合 Gate 基準と一致・errors 0。oni-pc は連続実行の 1 回目が 14 turn で早期終了（一過性・errors 0）→ 単独再実行で一致。両方の stdout を保存）** | `cf2/COMPARE_VS_INTEGRATION_GATE.txt` |
| 7 神 × 10 体 × normal／hard 140 組（決定論 matrix） | 省略（engine・data 変更 0・S6／cf2 が一致） | `docs/FINAL_RELEASE_GATE_V1_1.md` §4-1 |

## 5. 残リスク

- Known K40〜K47 は不変（本 Hotfix は Known の追加・解消なし）。`docs/RELEASE_STATUS.md` A-4
- 周辺減光と舞台画像の重なりは忠次（v0.2〜）と同じ構成だが、将軍家 9 体の舞台画像の上に周辺減光が載った見た目は本 Hotfix で初めて本番に出る → CEO Human QA（iPhone・岡っ引き／康虎ほか）で視認性を確認する
- 入口（降臨の間）は `BossEntrance` が inline で舞台画像を出しており本件の影響外（before でも表示）
- 同種の見落とし防止：以後の敵別 CSS で `.battle-main` を触るときは §2 の契約テストが守る。Wave Gate の判定項目にも「舞台画像あり（stage-bg-probe）」を加える

## 6. CEO 操作

1. PR #23（branch `hotfix/v1_1_5-shogunate-stage-bg`）の merge（CI GREEN・CLEAN 確認後・1 回）
2. Hotfix 本番確認（AI：S2 Smoke＋stage-bg-probe を本番 URL で再実行）→ CEO Human QA（iPhone）→ 完成宣言の再開は CEO 判断
