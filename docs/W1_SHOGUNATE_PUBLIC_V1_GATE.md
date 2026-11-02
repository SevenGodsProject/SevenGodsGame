# W1 将軍家 第一陣 公開 v1（決定287）— 実装・Gate 記録（2026-11-03）

> **状態：IMPLEMENTED・自動 Gate ALL PASS・CEO Human QA 2 問 待ち。** branch `feat/w1-shogunate-public-v1`（起点 master `58227ff`＝v1.0.6 Production runtime）・worktree `SevenGodsGame-w1`。AI 判断（CLAUDE.md §6-2）で実装・Gate を実施。決定288 v1.1（CEO 承認 2026-11-03「進めて」）の W1。merge（＝v1.0.7 Production 公開）は CEO Gate。

## 0. 結論

| 項目 | 結果 |
|---|---|
| 変更 | 忠次（enemy_08）を `?pilot=shogunate` の隔離から外し、Enemy Select の通常導線に **8 体目**として公開。戦績・セーブ・報酬・神階・絆・同じ盤面 Retry は既存 7 体と同じ扱い。**Daily 巡回・49 攻略盤・「神に委ねる」seed 選出・gameVersion は既存 7 体のまま**（変更禁止・機械証明） |
| ★ | **実測で ★3 → ★1**（§3）。数値は 1 つも変えない（CEO 方針） |
| runtime 差分 | `enemies.ts`（判定関数・rank・コメント）・`EnemySelectScreen.tsx`（並び・注記・攻略印の条件）・`pilotFlag.ts`（kind）・`creditsText.ts`（1 行）。`src/core/engine`・`rules.ts`・storage・save v9・指紋：**0** |
| build | JS `index-C4CSv3Pe.js` 481.16 kB（v1.0.6 481.11 → **+0.05 kB**）・CSS **同一ハッシュ** `index-Tat7Jjqr.css` |
| 自動 Gate | tsc 0／oxlint 0／vitest **1,659**（+1）／受入 44/44／敗北 18/18／cf2 決定論 **8/8 一致**／★監査 既存 7 体 **指数まで v1.0.1 と一致**／忠次 probe normal 6/6・hard 4/4 **一致**／忠次 公開 受入 **150/150**／Threat 受入 74/74／hardening 9/9／a11y **69/69**／旧セーブ：§2 S8 |
| CEO 指定 4 Gate | (G-A) 攻略体験の差別化＝probe で then／else 分岐が seed どおり・balanceSim 決定287 ケース PASS・**Human QA Q1**／(G-★) ★実測 PASS／(G-W1) hard W1＝**Human QA Q2**／(G-HQ) Human QA＝§4 |
| 次 | push → PR → CI GREEN → **CEO iPhone Human QA 2 問**（preview `http://192.168.11.6:4195/`）→ CEO merge（v1.0.7）→ AI Smoke → 決定287 LIVE |

## 1. 変更内容（commit）

| commit | 内容 |
|---|---|
| `0b7db66` | `isPilotEnemyId` は Threat Pilot（enemy_09）だけに真／Enemy Select `roster = CORE＋SHOGUNATE（＋?pilot=threat で PILOT）`・将軍家 Pilot の案内撤去・忠次カードに「攻略盤の対象外・戦績は残る」注記（既存 chip 流用・新 CSS 0）・攻略印は `MATCHUP_ENEMIES`（CORE 7）だけ／`pilotFlag` kind は `threat` のみ（旧 `shogunate` は不明な値として無視）／Credits に将軍家画像の出典と「二つ名・技名・台詞は本作の創作」1 行／tests：pilotFlag・shogunateRoster・coreRoster・enemySelectNote 更新、balanceSim に決定287 公開対象の hard 詰み防止ケース追加（既存ケース不変）、lane1 受入 9／10 枚 |
| `f587203` | 忠次 rank 3 → **1**（実測）／`scripts/enemy-star-audit/`（★監査 sim＋harness を repo に同梱・出力先と engine ラベルは env）／evidence `docs/evidence/shogunate-public-v1/star/` |
| （本 commit） | `scripts/v1_0_3-rc/acceptance.mjs` の枚数期待値 8 → 9／`scripts/shogunate-public-v1/acceptance.mjs`（新規・150 項目）／Gate 文書・評価 evidence・DECISIONS・RELEASE_STATUS |

## 2. Gate 結果（直列・6 GB 機・preview :4195＝W1 dist）

| # | 項目 | 結果 | 証跡（`docs/evidence/shogunate-public-v1/`） |
|---|---|---|---|
| G1 | `tsc -b --noEmit`／`npm run lint`（oxlint）／vitest full／build | **0／0（警告は既存 13）／1,659 passed・17 skipped／481.16 kB** | commit message・本書 |
| G2 | CORE 不変：`coreRoster.test`・`shogunateRoster.test`（sha256・pickEnemyId 14 seed golden・Daily 9 日 golden・MATCHUP 49・gameVersion `1.d794038a00b5b53c`） | **PASS（不変）** | vitest |
| G3 | cf2 決定論 probe：既存 7 体 PC ＋ 龍神 sp375（統合 Gate `08-cf2-core7` 基準） | **8/8 MATCH**（turns／plays／heavy／帯遷移すべて一致・JS error 0） | `s10-cf2/`・`COMPARE_VS_INTEGRATION_GATE.json` |
| G-★ | ★監査（9 体 × 7 神 × 3 難易度 × 16 seed × 6 打ち筋＝18,144 run・146 秒） | 既存 7 体の normal 指数・順序が **v1.0.1 と完全一致**／忠次 normal 28.4・hard 39.2 → **★1** | `star/matrix.json`・`star/star-reeval-w1.json`・`star/summary.md` |
| G4 | balanceSim 決定287：hard × 全神 × 将軍家 ≥50% | **PASS**（vitest 内） | vitest |
| G5a | 忠次 公開 受入（新 `scripts/shogunate-public-v1/acceptance.mjs`・pc／sp375 × 通常／旧 `?pilot=shogunate`／`?pilot=threat`） | **150/150**（再実行・chip 矩形チェック 6 件を含む）：通常 9 枚・忠次 ★1・注記 1（SP375 でカード内に収まる）・Pilot 印 0・案内 0／旧 URL は通常と同じ／threat は 10 枚＋印 1＋案内 1／忠次戦：R1 で battleSave が書かれる → 再読込「続きから」で忠次 R1 復元 → R4 総攻め 240 で決着 → records 書き込み・battleSave 消去・matchups に enemy_08 なし・JS error 0 | `acceptance/`・`acceptance-stdout.txt` |
| G5b | Threat Pilot 受入（lane1・74 項目・枚数 9／10） | **74/74** | `threat-acceptance/` |
| G5c | 忠次 probe normal（seed 3 × pc／sp375）／hard（seed 2 × pc／sp375） | **10/10 MATCH**（v1.0.6 Smoke S6 基準：R1〜R4 intent・帯・HP・glow・「あと N」文言） | `probe-normal/`・`probe-hard/`・`probe-COMPARE_VS_V1_0_6_SMOKE.txt` |
| G6a | hardening（不正 enemy id・save 復元） | **9/9 ALL PASS** | `hardening/` |
| G6b | 旧セーブ互換（master＝v1.0.6 build :4196 → RC＝W1 :4195・A／B セーブ） | **44/44 PASS**（§2-1） | `save-migration/` |
| G7 | a11y minimum pack（69 項目） | **69/69 ALL PASS** | `a11y/` |
| G8 | Enemy Select 段組（pc／sp375・9 枚）横はみ出し | **0**（受入内） | `acceptance/enemy-select-*.png` |
| S2／S3 | 回帰受入（v1.0.3 以降の確定文言・44）／敗北画面 18 | **44/44**（枚数期待値を 9 に更新＝Expected Specification Update）／**18/18** | `s2-acceptance/`・`s3-defeat/` |

### 2-1. S8 旧セーブ互換

- master＝v1.0.6 RC build（`SevenGodsGame-integ-v106/dist`・`index-DBJFGX_C.js`・runtime は Production `10b0cd3` と同一）を :4196 で配信、RC＝W1 :4195。`scripts/release-audit/save-migration.mjs`：A（通常戦 決着＋神域 決着＋通常戦 R2 中断）／B（神域 R1 中断）のセーブを master で作り RC に注入 → **44/44 PASS**（Home「続きから」・残り回数・戦績・復元盤面・battleSave 差分 0・他キー改変 0・JS error 0・外部通信 0）
- 1 回目は master を Production URL にしたところ `page.goto` が 30 秒で timeout（headless からの外部接続が遅い）。ローカルの同一 runtime build へ切替えて実施（Production と同じ runtime のため等価）

### 2-2. Gate 中に直した点（AI 判断・表示のみ）

- 忠次カードの注記 chip（`.enemy-select-read-chip`・nowrap・10px）が **SP375 でカード幅を超えて両端が欠けた**（受入の screenshot で発見。機械チェックは横 overflow だけで見逃し）。文言を「攻略盤の対象外・戦績と報酬には残る」（16 字）→ **「攻略盤の対象外・戦績は残る」（12 字）** に短縮し、受入に「chip がカード内に収まる」矩形チェックを追加して再 build・再実行（§2 G5a・S2 は再実行後の値）。新 CSS 0
- 受入の全画面 screenshot で一部の敵の立ち絵が写らないのは `loading="lazy"` の未読込（画面外）によるもの。忠次の画像は戦闘で 200・`.battle[data-enemy=enemy_08]` を受入で確認済み

## 3. ★ 実測（G-★）

- 方法：v1.0.1 決定281 と同じ（`enemyStar.audit.ts`・指数 `0.5×(1−勝率)+0.3×被ダメ比+0.2×撃破R` ×100・6 打ち筋・16 seed・3 難易度）。CORE 7 体の ★ は v1.0.1 のまま固定し、新敵は normal 指数が入る帯（各 ★ の最小指数以上）で付ける
- 結果（normal 指数）：龍神 37.7／怨霊 36.5／魔獣 34.0／鬼将 33.9／影 33.8／機工師 31.4／道化 28.6 ＝ **v1.0.1 の値・順序と完全一致**（既存 7 体の挙動が v1.0.0 から変わっていない追加証明）。帯の下限：★4 36.5／★3 33.9／★2 31.4／★1 28.6
- 忠次：normal **28.4**（道化より低い）・hard 39.2・easy 19.5 → **★1**。参考：enemy_09（Threat Pilot・隔離）27.5 → ★1 相当（rank は変更しない）
- 判断：CEO 方針（2026-11-03「★は実測に合わせ、難易度数値の調整は原則しない」）に従い `rank: 1` のみ変更。「将軍四天王なのに ★1」の違和感は決定287 監査 §5-2 で想定済み（typeDescription「R4は傷が浅ければ総攻め。R3までに追い込め。」で「読みの敵」であることを示す）。数値を上げて ★3 に合わせる案は Human QA 9/9 と決定論一致をやり直すことになるため採らない

## 4. CEO Human QA（iPhone・2 問・YES／NO）

準備：W1 preview `http://192.168.11.6:4195/`（PC と同じ Wi-Fi・ミュート OFF）。Home → 神を選ぶ → 大耀 → この構成で始める → 敵選択。

| # | 問い | 観察点 | 期待 |
|---|---|---|---|
| Q1 | 通常の敵選択に **「将軍四天王・忠次」が 8 番目に並び、注記「攻略盤の対象外・戦績は残る」が読め、★1 に違和感が致命的でないか**。忠次を選んで 1 戦（ふつう）し、勝利後に **報酬カードが出て、Home の戦績が増えた**か | 敵カード・★・注記／結果画面の報酬 3 択／Home「戦績」 | YES |
| Q2 | **むずかしい**で忠次と 1 戦。R3 で「あと N で総攻めを止める」→ 止めたときに「✓ 止めた」と敵の崩れ（赤い罅）が **別の瞬間**に来る（hard W1）。それが気になったか | R3 の帯と「✓」 | NO（気にならない） |

Q1 NO → 注記文言・★表示の見せ方のみ調整（仕組みは変えない）。Q2 YES（気になる）→ 文言 1 回調整（hard のしきい値 0.6 は変えない＝決定 v0.6）。

## 5. 残リスク

- ★1 の物語上の違和感（§3・Q1 で確認）
- hard W1（Q2）
- Enemy Select が 9 枚になった分、SP375 で縦スクロールが 1 枚分増える（受入で横はみ出し 0・段組は従来どおり）
- 旧 `?pilot=shogunate` を含む外部リンク（docs・CEO の QA 手順）は通常導線と同じ表示になる（害なし）

## 6. 変更していないもの

- `src/core/engine`・`rules.ts`・カード 60・既存 7 体データ・Threat Pilot（enemy_09・隔離のまま）・save v9・全 storage スキーマ・BGM／SE／神ボイス・`battle.css`
- 新規 asset 0・追加転送 0（忠次の画像・舞台は v1.0.6 bundle に同梱済み）
