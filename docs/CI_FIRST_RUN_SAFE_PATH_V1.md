> **状態（2026-10-10・PM 指示「RC-2 CI 初回実行の安全経路調査」・read-only・AI 判断）：調査のみ。push・PR 作成・CI 実行・Vercel 設定変更・Production deploy はいずれも行っていない。推薦 1 つ（§6）は CEO 判断待ち。**

# CI 初回実行の安全経路 v1 — 未 push 43 commit（integ master `f84b20d`）を origin/master に触れずに検証する方法

## 1. 事実（2026-10-10 実測・read-only）

| # | 確認 | 結果 | 手段 |
|---|---|---|---|
| F1 | `.github/workflows/ci.yml` は origin/master（`641ea5c`）に**存在しない** | 未 push の `39186bf` で追加。GitHub は workflow を 1 つも認識していない（`gh workflow list --all` 空・`gh run list` 空） | `git ls-tree origin/master .github/workflows/`／`gh` |
| F2 | 既定ブランチ＝`master`・Actions 有効（`allowed_actions: all`） | — | `gh api repos/…`・`actions/permissions` |
| F3 | repo は **PUBLIC**（User アカウント `SevenGodsProject`・fork 許可） | — | `gh api repos/…` |
| F4 | Vercel は GitHub App 連携（`vercel[bot]` が GitHub Deployments を作成）。**Preview Deployments は ON だった**：2026-09 の branch push で Preview deployment 52 件、origin に残る 6 branch の HEAD 全てに Preview deployment あり（各 1〜2 件・URL 発行済み） | 2026-09-13 以降 branch push は無く、設定が今も ON かは **UNVERIFIED**（Dashboard 側）。過去の Preview URL 3 件は現在 410（deployment 削除済み） | GitHub Deployments API・`curl -I` |
| F5 | Production deployment は master の commit だけ（64 件・全て `vercel[bot]`・Vercel の status check `Vercel` が master HEAD に付く） | — | 同上 |
| F6 | gh token scope：`repo`・`workflow`・`gist`・`read:org`（workflow 作成・push・PR 作成は技術的に可能） | 本調査では使っていない | `gh auth status` |
| F7 | 未 push 43 commit の runtime 側：`ci.yml`・`package.json`（`1.0.0-rc.1`・`playwright 1.63.0` exact）・`package-lock.json`・`index.html`・icons／OG／manifest・credits 画面・voice（`public/assets/voice/taiyo/greeting.mp3`＝Kit 配布素材）。art-source の新規追加 0・LAN IP は既に origin 上に 18 件 | — | `git diff --stat origin/master..master` |
| F8 | `vercel.json` は履歴上 1 度も存在しない（Vercel は Dashboard 既定で動いている） | — | `git log --all -- vercel.json` |

## 2. 調査項目への回答

### 2-1. workflow_dispatch で origin へ push せずに `f84b20d` を検証できるか → **できない**

- GitHub 公式：「`workflow_dispatch` は **workflow ファイルが既定ブランチに存在する場合のみ**トリガーできる」（docs: events-that-trigger-workflows）。F1 のとおり `ci.yml` は既定ブランチ origin/master に無い＝dispatch の対象 workflow 自体が GitHub に無い
- dispatch は「GitHub 上に存在する ref」にしか向けられない。`f84b20d` はローカルにしか無い＝push なしでは参照不能
- 結論：**push ゼロで `f84b20d` を CI にかける方法は無い**（GitHub Actions はリモートの ref に対してしか走らない）

### 2-2. 既定ブランチ上の workflow 定義と実行対象 ref の制約

| イベント | ci.yml の定義 | 制約（GitHub 仕様） |
|---|---|---|
| `push` | `branches: [master]` | master 以外への push では走らない。**master への push は Vercel Production deploy と同時**（F5） |
| `pull_request` | `branches: [master]`（base が master の PR） | workflow は **PR の head 側のファイル**で実行され、ref は `refs/pull/N/merge`（base との merge 結果）。既定ブランチに workflow が無くても同一 repo の branch からの PR なら走る（公式 docs は dispatch 等に付く「既定ブランチ必須」の注記を `pull_request` には付けていない。初回実行で実証する） |
| `workflow_dispatch` | あり | 既定ブランチに workflow が必要（2-1）→ **今は使えない** |
| `permissions` | `contents: read`・secrets 0・deploy step 0 | CI 自身は Vercel・Production に何も送らない |

### 2-3. 既存 origin/master の CI だけでは未 push 43 commit の検証にならない（明示）

origin/master `641ea5c` には **ci.yml が無い**ので、そもそも CI は 1 度も走っていない（F1）。仮に走っても、検証対象（credits・voice・`1.0.0-rc.1`・lockfile・ci.yml 自体）は全て未 push 側にある。**検証したい内容は 43 commit の中にしか無い**＝origin/master 上の実行は RC-2 の検証として無意味。

### 2-4. 手動実行が不可能な場合の安全手順（一時 branch＋Draft PR・Vercel Preview 抑止）

Vercel 公式 `git.deploymentEnabled`（`vercel.json`・docs: project-configuration/git-configuration・last updated 2026-08-25）：「**Specify branches that should not trigger a deployment upon commits**」。branch 名→`false` で、その branch の commit は deployment を作らない（minimatch 可）。`vercel.json` は push される commit に含めるため **Dashboard の設定変更は不要**。

| 順 | 手順（AI 実行・CEO 承認後） | 安全の根拠 |
|---|---|---|
| 1 | integ master から一時 branch `ci/rc2-first-run` を切る（master は動かさない） | origin/master 不変 |
| 2 | その branch にだけ `vercel.json`：`{"$schema":"https://openapi.vercel.sh/vercel.json","git":{"deploymentEnabled":{"ci/*":false}}}` を 1 commit 追加（master には入れない） | Vercel が `ci/*` の commit で Preview を作らない（公式仕様）。他の branch・master の挙動は不変（未指定＝true） |
| 3 | `git push origin ci/rc2-first-run` | push 先は master ではない。`push` トリガー（master 限定）は走らない |
| 4 | **GitHub Deployments API で「この sha に deployment が無い」ことを確認**（`gh api repos/…/deployments?sha=…` が `[]`）。もし Preview が作られていたら **ここで停止**し CEO へ（Vercel Dashboard で deployment 削除＝CEO） | 抑止の実証。失敗時の後戻り 1 手 |
| 5 | `gh pr create --draft --base master --head ci/rc2-first-run` | `pull_request` で ci.yml（head 側）が走る。Draft は merge できない。PR 自体は Vercel に何も送らない（deployment は 2 で抑止） |
| 6 | `gh run watch`／`gh run view --log-failed` で結果を取得 → evidence（run URL・4 step の結果）を docs に記録 | — |
| 7 | 終了後：PR を close（merge しない）・一時 branch を origin から削除（`git push origin --delete ci/rc2-first-run`）・ローカル branch 削除 | 公開 repo 上の一時物を残さない。master 側の `vercel.json` は不要（入れない） |
| 8 | 本番 push（判断 ④）時は master の `push` で CI が**もう一度**走る＝正式な GREEN はそこで取れる。今回の run は「Production 反映前に RED を見つける」ための前倒し | — |

却下した代替：**`[skip ci]` 等の commit メッセージ**（GitHub Actions も止まる）／**Dashboard の Ignored Build Step**（Vercel 設定変更＝CEO 操作が必要で、master を含む全 branch に影響する）／**Preview ON のまま実行**（公開 URL が 1 本できる）。

### 2-5. リスクの区別（PUBLIC repo への公開／Preview URL／Production）

| 影響 | 一時 branch＋Draft PR（2-4） | private ミラー repo（§5） | 備考 |
|---|---|---|---|
| **コード公開**（PUBLIC repo） | **あり**：43 commit の内容（docs・evidence 29 ファイル・credits・voice MP3・ci.yml）が branch と PR で誰でも閲覧可。内容は v1.0 公開時に master で公開するものと同一。branch 削除後も PR と commit は GitHub 上に残る（fork 済みなら回収不能） | **なし**（private） | voice MP3 は Kit 配布素材（二次創作での配布は Kit §1 で許可）。art-source の新規追加は無い（F7） |
| **Preview URL 生成** | `vercel.json` で抑止（公式仕様）。初回は手順 4 で実証し、生成されていたら停止 | **なし**（Vercel 未連携） | 既存 6 branch には過去の Preview deployment 記録あり（URL は 410） |
| **Production への影響** | **なし**：Production は master の push のみ（F5）。Draft PR は merge 不可。CI は `contents: read` で deploy step 0 | **なし** | いずれの経路でも Production deploy は判断 ④ まで起きない |
| Actions の課金 | public repo は無料 | private は無料枠 2,000 分/月（この CI は 1 run ≈3〜5 分） | — |

## 3. 推薦（1 つ）

**private ミラー repo で `f84b20d` をそのまま CI にかける**（§5）。理由：2-5 の 3 リスク（コード公開・Preview URL・Production）が**全て「なし」**になり、Vercel の設定や `vercel.json` の挙動に依存しない。検証内容は同じ commit・同じ `ci.yml`（`push: branches [master]` が private 側で走る）＝一時 branch＋Draft PR と等価。

手順（CEO 承認後・AI 実行・所要 10 分）：
1. `gh repo create SevenGodsProject/SevenGodsGame-ci --private`（空 repo・Vercel 連携なし・fork ではない）
2. integ から `git push <mirror> master:master`（`f84b20d`。origin には push しない）
3. private 側で `push → master` の CI が走る → `gh run watch -R SevenGodsProject/SevenGodsGame-ci` → evidence を docs に記録
4. GREEN／RED を報告。RED なら integ master で修正 → 再 push（private のみ）
5. 判断 ④（本番 push）の後、ミラー repo は削除（または CI 専用として保持。CEO 判断）

一時 branch＋Draft PR（2-4）は **代替**として手順を確定済み。CEO が「公開 repo 上で CI の痕跡を残したい」場合はこちら。

## 4. CEO 判断が必要な事項

【CEO DECISION REQUIRED】
- Issue：CI 初回実行の経路（§3 private ミラー／§2-4 一時 branch＋Draft PR）
- AI Recommendation：**private ミラー repo**（§3）
- Reason：公開・Preview・Production の 3 影響がゼロ。Vercel 側の未確認（F4 の現設定）に依存しない
- Alternatives：一時 branch＋Draft PR＝公開 repo に 43 commit が先に出る＋Preview 抑止は `vercel.json` の初回実証が要る／Preview ON のまま＝却下／Dashboard 設定変更＝CEO 操作が要り全 branch に影響
- Risk：private repo の新規作成（GitHub Free・費用 0・外部契約なし。§6-3 #6 の「本番登録・購入・有料契約」には当たらないが、アカウント配下の新規 repo なので CEO 判断とした）。Actions 無料枠を数分使う
- Impact if delayed：CI GREEN が取れず RC Gate・判断 ④ に進めない（Production 反映前に RED を見つける機会を失う）
- CEO Action：承認（private ミラー）／代替（一時 branch＋Draft PR）を指示／保留
