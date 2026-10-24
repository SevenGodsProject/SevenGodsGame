# 将軍家 Pilot v0.4（忠次）CEO iPhone 実機 QA 手順書 — 約 5 分・8 問

> **状態（2026-10-23・Lane 3・独立 QA 準備・docs-only）**：PM Gate ①〜⑤（G0〜G7 PASS・旧セーブ互換 44/44・8 問確定）を前提に、CEO が iPhone で **そのまま実行できる 1 ページ手順**（§1）と、PM 用の LAN Preview 起動手順（§2）・実機で見る PASS 条件（§3）を整理した。設問は `docs/SHOGUNATE_PILOT_V0_4.md` §5 の確定 8 問を**一字も変えずに**使う。完了済み Gate は再実行していない（軽量確認として targeted vitest 2 file 28/28 PASS のみ）。build・preview 起動・Playwright・runtime 変更・push／merge／tag／deploy：**0**。

- 対象：worktree `C:\Users\kimi1\SevenGodsGame-shogunate-pilot`・branch `feat/shogunate-pilot-v0.4`（runbook 作成時 HEAD `f95aad3`）
- 根拠：`docs/SHOGUNATE_PILOT_V0_4.md` §5（確定 8 問・2 戦）／`docs/SHOGUNATE_PILOT_V0_4_GATE.md` §3 G6(d)（probe 実測）／`docs/evidence/shogunate-pilot-v04/08-probe/probe.json`（seed `sg-v04-01` の手順・HP 推移）／`src/hooks/useGameEngine.ts`（`?seed=` の扱い）／`src/components/battle/EnemyPanel.tsx`・`enemyBreak.css`（Break と赤い輪の表示条件）

---

## 1. CEO 用：1 ページ手順（約 5 分）

### 1-0. 始める前に（30 秒）

| # | 確認 | 理由 |
|---|---|---|
| 1 | iPhone を PC と**同じ Wi-Fi**（PC は `Buffalo-2G-67E0`）につなぐ | LAN Preview は同一ネットワークからしか開けない |
| 2 | Safari で**プライベートタブ**を開く | 前回の神階・保存デッキ・難易度が残っていると seed 固定でも手札が変わる。プライベートタブなら初期状態＝PM の probe と同じ進行 |
| 3 | 設定 → アクセシビリティ → 動作 →「**視差効果を減らす**」が**オフ** | オンだと崩れ（体が沈む動き）が止まり、名札の閃きだけになる（`enemyBreak.css` の reduced-motion 規則） |
| 4 | **低電力モードがオフ**（バッテリー表示が黄色でない） | オンだと Safari の描画が 30fps 前後に抑えられ、Q6（カクつき）が正しく測れない |
| 5 | 音は任意（マナーモードでも可） | 8 問に音の設問はない |

### 1-1. 開始 URL

```
http://192.168.11.6:4183/?pilot=shogunate&seed=sg-v04-01
```

- `?pilot=shogunate` が無いと忠次は出ない。`seed=sg-v04-01` で PM の probe と同じ配札になる
- ホーム下の version 表示は `v1.0.2 (f0daa46)`（Gate 時の build。以後の commit は docs／テストのみで画面は同一）
- 開けないとき：PM に「4183 が開かない」と伝える（§2-4 の Firewall）

### 1-2. 戦 A（then・追い込めた）— 約 3 分

| 手順 | 操作 | 見るところ |
|---|---|---|
| A-1 | 説明が出たら「わかった」→「神を選ぶ」（「新しく始める」が出たら押す） | — |
| A-2 | **大耀** → 難易度 **ふつう**・神階なし →「この構成で始める」 | — |
| A-3 | 「挑む敵を選ぼう」の末尾 **将軍四天王・忠次**（印「幕府 Pilot・記録に残らない」）を選ぶ | — |
| A-4 | デッキはそのまま（おすすめ）。違って見えたら「おすすめデッキに戻す」→「この構成でバトル開始」 | 入口演出の忠次の色味（Q5 の参考） |
| A-5 | **R1**：⚔ 一心不乱 → ⚔ 一心不乱 → 札が暗くなったら「ラウンドを終える」 | タップへの反応（§3-2） |
| A-6 | **R2**：🌟 神託 →「ラウンドを終える」 | — |
| A-7 | **R3 開始**：予告「⚠ 傷が浅ければ次は総攻め」・忠次の周りに赤い光。HP は **650 / 980** | Q3（ここで「追い込むか・備えるか」を自分で決める） |
| A-8 | **R3**：⚔ 豪快な一撃 →（HP はまだ 490 より上）→ もう一度 ⚔ 豪快な一撃 | **2 枚目で HP が 370 前後へ**＝**崩れ**（体が沈む・名札が赤く閃く・足元に赤い傷）と同時に**赤い輪が消えて金の溜め光に変わる** → **Q8・Q6** |
| A-9 | 「ラウンドを終える」 | **R4 予告が ⚔ 強打 120**（総攻めではない）→ **Q4** |
| A-10 | R4 以降は好きに戦って決着まで（「敵に N ダメージ」の大きい札からで可） | 決着後 **Q7**。全体で **Q2・Q6** |

> 手順どおりで HP が 650 → 370 にならなかった場合（配札がずれた場合）：R3 で HP が 490 を下回った瞬間を見ればよい（崩れと赤い輪の消失は表示 HP 490 割れで起きる）。R3 で 490 を割れなければ戦 A は「else」になり Q8 は判定不能 → PM へ報告。

### 1-3. 戦 B（else・追い込めなかった）— 約 1 分

| 手順 | 操作 | 見るところ |
|---|---|---|
| B-1 | 同じ URL を開き直す（アドレスバーで再読込）→ A-1〜A-4 と同じ手順で忠次と開戦 | 入口演出の色味（**Q5**） |
| B-2 | **R1・R2・R3 は札を出さず**「ラウンドを終える」だけ（HP 980 のまま） | R1 の忠次の色味（Q5） |
| B-3 | **R3**：予告「⚠ 傷が浅ければ次は総攻め」と赤い光 | 光が**鎧の輪郭に沿う**か、四角い箱に見えるか → **Q1** |
| B-4 | 「ラウンドを終える」→ **R4 予告が 🔥 軍略・総攻め 240** | **Q4**（戦 A との違い）・R4 の必殺カットインの色味（**Q5**）。カットインを見たら終了してよい |

### 1-4. 8 問（`SHOGUNATE_PILOT_V0_4.md` §5 確定版・文言そのまま）

| # | 設問 | 見る場面 | 期待 |
|---|---|---|---|
| Q1 | R3 の溜め（「⚠ 傷が浅ければ次は総攻め」）で、忠次の周りの**赤い光が鎧の輪郭に沿って**見えた（角丸の「箱」に見えなかった）か | 戦 B・R3 | YES |
| Q2 | 「忠次が舞台の中にいる」感じが**増した**か（v0.1／v0.2 の記憶と比べて） | 戦 A・R1〜R4 全体 | YES |
| Q3 | R3 の予告を読んで、「R3 までに追い込む」か「R4 の総攻めに備える」かを**自分で決めた**か（どちらでも YES） | 戦 A・R3 の手札選択 | YES |
| Q4 | R4 の予告（戦 A＝⚔ 強打 120／戦 B＝🔥 軍略・総攻め 240）が、R3 までに自分がやったことの**答え合わせ**に感じられたか | 戦 A・B・R4 開始時 | YES |
| Q5 | 入口・必殺カットイン・戦闘中で、忠次の**色味や光が食い違って**見えたか | 戦 B の入口／R4 の必殺カットイン／R1 | NO |
| Q6 | 画面の**カクつき・遅れ・崩れ**（文字のはみ出し・横スクロール・立ち絵の欠け）があったか。特に R3 で崩れた瞬間 | 戦 A・全体・R3〜R4 | NO |
| Q7 | **もう一度忠次と戦いたい**か | 戦 A・決着後 | YES |
| Q8 | **R3 で忠次が崩れた瞬間（体が沈み・名札が閃き・赤い輪が消えて金の溜め光に変わる）、「追い込めた」と分かったか** | 戦 A・R3 の 2 枚目 | YES |

### 1-5. 回答形式（コピーして使える）

```
Q1 YES／Q2 YES／Q3 YES／Q4 YES／Q5 NO／Q6 NO／Q7 YES／Q8 YES
（期待と違う問だけ一言：例「Q6 YES：R3 の崩れで一瞬止まった」）
```

- 各問 **YES／NO ＋ 期待と違ったときだけ一言**（どの場面で・何が）
- 合否（AI 案・§5 のまま）：Q1・Q2・Q3・Q4・Q7・Q8 が YES、Q5・Q6 が NO で v0.4 を Pilot の正式版とする

---

## 2. PM 用：LAN Preview の起動手順（CEO QA の直前に 1 回）

### 2-1. 照合結果

| 項目 | 実際 | 判断 |
|---|---|---|
| `package.json` scripts | `"preview": "vite preview"`（host 指定なし）・`"build": "tsc -b && vite build"` | `npm run preview` のままでは **127.0.0.1 だけ**で待ち受ける → `npx vite preview` に `--host 0.0.0.0` を付ける |
| `vite.config.ts` | `plugins`・`define`（`__APP_VERSION__`・`__BUILD_SHA__`）のみ。`server`／`preview` の `host`・`port` 設定は**無い** | CLI 引数で `--host 0.0.0.0 --port 4183 --strictPort` を渡す（既定 4173 は使わない） |
| 既存 docs | `SHOGUNATE_PILOT_V0_4.md` §5・`SHOGUNATE_PILOT_V0_4_GATE.md` §5 とも `npx vite preview --host 0.0.0.0 --port 4183 --strictPort`・URL `http://192.168.11.6:4183/…` | 一致。本書もこれに合わせる |
| `dist` の有無 | **あり**。`dist/index.html` が `index-c1wgu65-.js`／`index-DpHcH-gE.css` を参照＝Gate G4 の build（472.64 kB／196.74 kB）と同一。`dist/assets/enemies/tadatsugu/art.webp`・`dist/assets/backgrounds/stages/08-shogunate-camp.webp` 同梱 | **build 不要**。`f0daa46..f95aad3` の `src` 差分は `enemyBreak.test.ts`（テスト）だけで runtime は同一 |
| PC の IPv4 | `ipconfig` → Wi-Fi アダプター `192.168.11.6`（2026-10-23 確認・既存 docs と同値） | DHCP で変わり得るので**起動直前に再確認** |
| ネットワーク種別 | Wi-Fi `Buffalo-2G-67E0` ＝ **Public**（`Get-NetConnectionProfile`） | Firewall 規則は `-Profile Public` が必要（v0.3 文書の `-Profile Private` 例は**このままでは効かない**） |
| 既存 Firewall 規則（4183） | 一般ユーザー権限では `Get-NetFirewallPortFilter` が「アクセス拒否」で**未確認** | 開けなければ §2-4 を実行 |
| 4182／4183 の LISTEN | 2026-10-23 確認時点で **0**（Gate 終了時の `taskkill` 済みと一致） | 起動可能 |

### 2-2. 起動（dist が既存の場合＝今回）

1. PC の IP を確認：PowerShell で `ipconfig` →「Wireless LAN adapter Wi-Fi」の「IPv4 アドレス」（今回 `192.168.11.6`）。変わっていたら §1-1 の URL のホスト部を差し替えて CEO に渡す
2. ポートが空いていることを確認：`netstat -ano | findstr :4183`（何も出なければ空き）
3. 起動（1 本だけ・他の node 重処理と同時に走らせない）：

```
cd C:\Users\kimi1\SevenGodsGame-shogunate-pilot
npx vite preview --host 0.0.0.0 --port 4183 --strictPort
```

4. 表示される `Network: http://192.168.11.6:4183/` を確認 → PC のブラウザで `http://127.0.0.1:4183/?pilot=shogunate&seed=sg-v04-01` が開けること、Home の version が `v1.0.2 (f0daa46)` であることを確認
5. iPhone（同じ Wi-Fi）で `http://192.168.11.6:4183/?pilot=shogunate&seed=sg-v04-01`

### 2-3. dist が無い・古い場合

- `dist/index.html` の参照 JS が `index-c1wgu65-.js` でない、または `dist` が無い場合は **`npm run build` が必要**（PM の直列管理で実行。本 Lane では実行しない）。build 後は Home の version が `v1.0.2 (<その時の HEAD 7 桁>)` になる
- `dist-v02`／`dist-v03` は v0.2／v0.3 の比較用（untracked）。**v0.4 の QA には使わない**

### 2-4. Windows Firewall（iPhone から開けないときだけ）

- 管理者 PowerShell（UAC は CEO 承認）で一時規則を 1 本追加。Wi-Fi が **Public** のため `-Profile Public`、範囲は `LocalSubnet` に限定（決定228 の前例と同じ条件）：

```
New-NetFirewallRule -DisplayName "Shogunate v0.4 QA TCP 4183 (temp)" -Group "Shogunate v0.4 QA (temp)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4183 -RemoteAddress LocalSubnet -Profile Public
```

- QA 後に必ず削除：

```
Remove-NetFirewallRule -Group "Shogunate v0.4 QA (temp)"
Get-NetFirewallRule -Group "Shogunate v0.4 QA (temp)" -ErrorAction SilentlyContinue
```

（2 行目で何も出なければ削除済み）

- node.exe 全体の許可や、ネットワーク種別を Private に変える操作はしない
- それでも届かない場合：iPhone が別 SSID（ゲスト Wi-Fi・5GHz 側の分離）にいないか、ルーターの「プライバシーセパレーター」が有効でないかを確認

### 2-5. 終了

- preview の端末で `Ctrl+C`（止まらなければ `taskkill /T /F /PID <pid>`）→ `netstat -ano | findstr :4183` が 0 であることを確認
- 一時 Firewall を追加した場合は §2-4 の削除まで行う

---

## 3. 実機で見る PASS 条件（FPS・タップ・R3 の Break）

### 3-1. R3 の Break が起きる条件（コードと probe 実測から特定）

| 項目 | 内容 | 根拠 |
|---|---|---|
| 起点 | **表示 HP（`hpShown`）が最大 HP の 50% 以下の帯（half）へ下がった瞬間**に 1 回だけ。忠次は最大 980 なので **490 を割った瞬間** | `EnemyPanel.tsx`（`hpBand(hpShown, maxHp)`・`useEnemyBreak`）・`enemyBreak.css` 冒頭 |
| 同時に起きること | 次ラウンドの軍略（`tactic`）を**表示 HP で**解決（`resolveEnemyTactic(nextScript, hpShown, maxHp, difficulty)`）→ then（強打）側になり「必殺充填」(`enemy-avatar-charging-super`) が外れる＝**赤い輪 → 金の溜め光**。予告文言「⚠ 傷が浅ければ次は総攻め」は崩れ中も**変わらない** | `EnemyPanel.tsx`（enemy_08 限定の分岐）・probe：`halfAndSuperOffSameFrame: true`・差 0ms（PC／SP375）・`intentTextsDuringBreak` 不変 |
| しきい値 | 忠次は `ratio 0.5` のみ（難易度別しきい値なし）→ **ふつう**で then 上限 HP 49（表示 490）。Break の half 帯と全難易度で境界一致（Gate G5） | `shogunateRoster.test.ts`（本 Lane で再実行 PASS） |
| seed と手順 | `?seed=sg-v04-01`・大耀・ふつう・神階なし・おすすめデッキ・初期状態（プライベートタブ）。R1 一心不乱×2 → R2 神託 → R3 豪快な一撃×2。表示 HP **980 → 900（R2 開始）→ 650（R3 開始）→ 2 枚目で 370**。seed 02〜04 は R3 で 490 を割れない（else 側の確認用） | `08-probe/probe.json`（`strategy: damage`）・`useGameEngine.ts`「同じシード・同じ神・同じ神階なら初手まで同一」 |
| 表示要素 | 体：`.enemy-collapse` が攻撃と逆方向へ沈んで暗くなり戻る（half 420ms）／名札：`.enemy-plate::after` の赤い閃き／足元：赤い傷 `.enemy-wound` がふくらんで現れ、**以後も残る**（静止表示）／立ち絵の光：赤 drop-shadow ×5 → 金 drop-shadow ×3 | `enemyBreak.css`・probe `shot.cf2Animations`（`cf2-plate-flash-half@520`・`cf2-wound-bloom-half@600`・`cf2-break-body-half@420`） |
| 崩れの長さ | 開始から約 1.7〜2.0 秒で終わり、即「ラウンドを終える」を押しても R4 予告の切り替え前に終わる（`breakStillRunningAtIntentChange: false`） | probe `immediateEnd` |

### 3-2. 実機 PASS 条件（CEO が見るもの → 該当設問）

| 観点 | ラウンド／操作 | PASS（見えれば OK） | FAIL の例 | 設問 |
|---|---|---|---|---|
| R3 の溜め | 戦 B・R3 開始 | 予告「⚠ 傷が浅ければ次は総攻め」＋立ち絵の**輪郭に沿った**赤い光 | 四角い箱状の光・光が無い | Q1 |
| R3 の Break | 戦 A・R3 で 2 枚目の豪快な一撃 | HP 650→370 前後の瞬間に **体が沈む＋名札が赤く閃く＋足元に赤い傷**が 1 回、**同時に**赤い輪が金の光に変わる（1 つの出来事に見える） | 崩れと色替わりが 2 回に分かれて見える・崩れが見えない（→ 視差効果を減らす がオンでないか確認） | Q8 |
| R4 の分岐 | 戦 A／B・R4 開始 | 戦 A＝**⚔ 強打 120**／戦 B＝**🔥 軍略・総攻め 240** | 戦 A で 240 が出る（R3 で 490 を割れていない） | Q4 |
| FPS（体感） | 戦 A・R3 の Break の約 2 秒間と R4 開始 | 崩れ・光の切り替わりが**滑らかに流れる**（止まる・飛ぶ・引っかかる感覚がない） | 一瞬固まる・光の変化がコマ送りに見える | Q6 |
| タップ操作 | 全ラウンド | 札を 1 回タップで**すぐ**使用演出が始まる（演出の待ちは 0.3 秒弱）・「ラウンドを終える」が 1 回で効く・誤ってズーム／横スクロールしない | 2 度押しが要る・押しても反応が遅れる・画面が拡大／横にずれる | Q6 |
| 表示崩れ | 全体 | 文字のはみ出し・横スクロール・立ち絵の欠けがない（PM 実測：横スクロール 0・予告の画面外 0） | 予告や HP が画面外・立ち絵が切れる | Q6 |
| 色の一貫性 | 戦 B の入口／R1／R4 必殺カットイン | 忠次の色味・光の質が 3 場面で同じ人物に見える | 場面ごとに色温度が違う | Q5 |

### 3-3. FPS について（WARN）

- headless では rAF 間隔が計測できず（Gate G6(e) UNRUN）、**CEO の体感（Q6）が唯一の実機計測**。iPhone には FPS 表示がない
- 任意：Q6 で迷ったら、コントロールセンターの「画面収録」で戦 A の R3 を録画して PM に渡す（録画自体がやや負荷を足すので、録画ありで「カクつき」と答えた場合は録画なしでもう一度だけ見る）
- Q6 が YES（カクつきあり）のときの次手は §5 のとおり「drop-shadow の段数 5→3（CSS 1 行）」

---

## 4. 本書で変更していないもの

runtime（`src/**`）：0。テスト：0。`docs/DECISIONS.md`：0。既存の 8 問の文言：0（§1-4 は §5 からの転記）。build・preview 起動・Playwright：0（軽量確認は `npx vitest run src/core/data/shogunateRoster.test.ts src/components/battle/enemyBreak.test.ts` **2 file 28/28 PASS** のみ）。他 worktree：0。push／merge／tag／deploy：0。
