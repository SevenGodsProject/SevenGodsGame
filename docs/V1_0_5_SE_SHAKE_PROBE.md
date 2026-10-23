# v1.0.5 SE・揺れ 実測 Gate（probe）＋ Human QA 手順

> **状態（2026-10-24・PM・AI 判断（CLAUDE.md §6-2））**
> - branch `test/v1_0_5-se-shake-probe`（worktree `SevenGodsGame-v105probe`・起点 `release/v1_0_5-rc-candidate` `1dd2204`）
> - 計測対象：RC 候補の build `index-D_sKHf-a.js`（4208）。対照は v1.0.4 の build `index-_60cvbl_.js`（4206・Production と sha 以外 byte 一致）
> - **runtime・src/core・セーブ仕様の変更は 0**。probe はページに計測用のフックを入れるだけ
> - Playwright は 1 本ずつ直列で実行した
> - push／merge／deploy は 0。Human QA と正式 RC Gate が済むまで行わない

## 0. 結論

| 対象 | 判定 | 要点 |
|---|---|---|
| Break SE | **PASS（WARN 1）** | 崩しを half・quarter とも観測（PC・SP 各 4 戦）。SE の回数は鳴らすべき崩しの回数と一致し、余分は 0。速度は帯どおり（0.7／0.6）。崩しの表示と SE の予約時刻の差は ≤16ms。**WARN**：溜め予告中の half（鳴らさない条件）は、作為的なシナリオ 3 通りでも実画面で起こせなかった。単体テスト `breakSe.test.ts` で固定済み |
| 敵の揺れ | **PASS（WARN 2：計測環境）** | 計画値は仕様と完全一致：必殺 3px／240ms／開始 1,300ms、敗北を決める最後の被弾 4px／280ms／開始 1,350ms。最後まで再生され、終了後は静止（transform なし）。結果画面が出る前に終わる。同じ timeline 上で比べると、**揺れは被弾の演出の開始から必殺で 40ms・最後の被弾で 90ms 後に始まる（ヒットストップ値と一致）**。通常攻撃・溜めでは揺れない。reduced-motion では 0 本 |
| 敗北画面・Stage B への干渉 | **PASS** | 敗北画面（事実行・Primary 初期可視）は不変。2 回目の敗北で前回比が出る（横はみ出し 0・Primary 初期可視）。**結果画面の出現時刻の中央値は v1.0.4 と ±50ms 以内**（両 build 4 回ずつ）。v1.0.4 の同じ経路では揺れ 0 本・前回比なし（どちらも新規であることの対照） |

**集計**：PC 24/24・SP375 23/24 → S3 を修正して再実行し 5/5。SP375 の FAIL 1 件は probe 側の不具合で、揺れが終わる前にデータを読んでいた。修正後は継続時間のずれ 16ms で PASS。どちらの証跡も残してある。

## 1. 計測の仕組み（`scripts/v1_0_5-rc/se-shake-probe.mjs`）

ページに入る前（`addInitScript`）に次を入れる。runtime のコードは変えない。

| フック | 記録するもの |
|---|---|
| `AudioBufferSourceNode.prototype.start` | 呼んだ時刻・予約時刻（when − currentTime）・playbackRate・音源名（fetch → arrayBuffer → decodeAudioData の結果に URL を紐づけて特定） |
| `Element.prototype.animate`（`.battle-main` のみ） | 振幅・duration・delay・`startTime`（ブラウザが実際に始めた時刻）・finished／cancel の時刻 |
| `document.getAnimations()`（`.ally-row` 内の CSS アニメーション） | 被弾の演出（`hit-shake*`）が document timeline 上で始まる時刻 |
| MutationObserver | 敵の体に `cf2-break-half／quarter` が付いた時刻と、そのとき `.enemy-avatar-charging` があったか・結果画面（`.game-over-card`）が出た時刻 |
| requestAnimationFrame | `.battle-main` の computed transform（静止の確認）・フレームの到着時刻 |

シナリオ：
- **S1** 崩しの SE：鬼将・龍神・怨霊・魔獣を攻撃札優先で攻める
- **S5** 溜め予告中の half：機工師で R2 を見送る
- **S2** 敗北 ×2：鬼将でカードを出さず R4 断岩 → 同じ盤面でもう一度 → 再び敗北。v1.0.4 と 4 回ずつ比べる
- **S3** 致命でない必殺：乱舞の道化 R3
- **S4** reduced-motion

### 1-1. 計測環境の限界（WARN の理由）

- この PC（RAM 6GB）の headless Chromium は、何もしていない戦闘画面で 22fps（Home は 31fps。GPU 系のフラグを付けても同じ）。敵の手番の描画中は、揺れの区間で 7〜12fps まで落ちる。
- `animate()` を呼んでからブラウザが実際に始めるまで 200〜1,080ms 遅れる（main thread の詰まり）。
- そのため、**呼び出しから測った実時間**は ±30ms に収まらない。PC では開始が 918〜945ms 遅れ、SP では 338〜388ms 遅れた。継続時間のずれは 5〜60ms。
- 一方、**被弾の CSS アニメーションも同じだけ遅れる**。同じ timeline 上の相対時刻（40ms／90ms＝ヒットストップの設計値）は崩れない。
- 実機（60fps）での体感は Human QA で確かめる。

## 2. 証跡（`docs/evidence/v1_0_5-se-shake-probe/`）

| ファイル | 内容 |
|---|---|
| `probe-pc1508.json` | PC 24/24（WARN 4） |
| `probe-sp375.json` | SP375 23/24（S3 の FAIL 1 は probe 側の不具合。§0） |
| `probe-sp375-s3-rerun.json` | 修正後の SP375 S3 は 5/5 |
| `s2-*-sp375-defeat2.png` | 2 回目の敗北の結果画面（RC 候補と v1.0.4、それぞれ 2 回） |

PC の PNG（各約 460KB）は commit しない（未追跡のまま残してある）。

## 3. CEO Human QA 手順（v1.0.5・3 項目・約 8 分）

**準備（PM）**
- RC 候補の build を LAN Preview で配信する：`npx vite preview --host 0.0.0.0 --port 4183 --strictPort`（worktree `SevenGodsGame-v105rc`）
- PC では `http://localhost:4183/`、iPhone では `http://192.168.11.6:4183/`（同じ Wi-Fi・Safari のプライベートタブ）
- ミュートは解除する。iPhone は「視差効果を減らす」をオフにする（オンだと揺れは出ない＝仕様）

**比較（任意）**：v1.0.4 は https://seven-gods-game.vercel.app/ で、同じ手順で比べられる。

| # | 項目 | 手順（約） | 問い（YES／NO） | 合格 | 不合格のときの調整案（1 つだけ） |
|---|---|---|---|---|---|
| 1 | **同じ盤面 Retry の前回比**（Stage B） | 3 分：神を選ぶ → 大耀 → 業斧の鬼将 → バトル開始。カードを出さず「ラウンドを終える」を 4 回 → R4 断岩で敗北 → **「同じ盤面でもう一度」** → 今度は R1〜R3 で攻撃札を出してから敗北する | 1a：2 回目の結果画面の「同じ盤面 2 回目：前回 … → 今回 …」で、前より進んだ／戻ったが分かったか ／ 1b：「正解を教えられている」と感じたか | 1a YES・**1b NO** | SP で 1 行に収まるよう先頭を「2 回目：」に短くする |
| 2 | **Break 時の音**（Break SE） | 2 分：大耀 × 業斧の鬼将で攻撃札を出して攻める。敵 HP が半分・4 分の 1 を切った瞬間（敵が大きくのけぞる）に耳を向ける | 2a：音だけで「追い詰めた」と分かったか ／ 2b：着弾音とは別の出来事に聞こえたか ／ 2c：うるさい・多いと感じたか | 2a YES・2b YES・**2c NO** | quarter（4 分の 1）だけ鳴らす（定数 1 行） |
| 3 | **敵攻撃の重量感**（揺れ） | 3 分：大耀 × 乱舞の道化で「ラウンドを終える」だけを 3 回 → R3 の必殺で画面が小さく揺れる。続けて項目 1 の敗北（R4 断岩）でも最後の被弾で揺れる | 3a：敵の必殺が「重い一撃が来た」と体で分かったか ／ 3b：神の一撃の揺れの方が大きく感じたか ／ 3c：酔う・うるさい・やりすぎと感じたか | 3a YES・3b YES・**3c NO** | 必殺 2px・最後の被弾 3px に下げる（定数 2 つ） |

**回答の形**（そのまま貼れる 1 行）：`1a=YES 1b=NO 2a=YES 2b=YES 2c=NO 3a=YES 3b=YES 3c=NO`。期待と違った問だけ一言を添える。

**実機で見てほしいこと（probe で測れなかった点）**
- 揺れが被弾の瞬間とずれて見えないか（項目 3）
- 溜め予告が光っている間に敵が半分を切ったとき、低い「ゴォン」が鳴らないこと（めったに起きないので、気づいたときだけで構わない）

## 4. 正式 RC Gate までの残り

1. CEO Human QA の 3 項目（本書 §3）
2. version を 1.0.5 に上げる
3. DECISIONS に AI 判断の行を入れる（Stage B・Break SE・揺れ・AC12。各文書の行案）
4. RC Gate を v1.0.4 と同じ構成（M1〜M7）で取り直す（本 probe を G 項目に追加）
