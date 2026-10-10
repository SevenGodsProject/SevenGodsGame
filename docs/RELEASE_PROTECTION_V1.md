> **状態（2026-10-11・CEO 指示「v1.0.0 Release Finalization」・read-only 調査・AI 判断）：docs の安全な公開方法 1 つと、未承認 push の再発防止策を提示。設定変更・push・tag はいずれも行っていない。**

# Release Protection v1 — docs の安全な公開と、Production 公開経路の保護

## 1. 事実（2026-10-11 実測・read-only）

| # | 確認 | 結果 |
|---|---|---|
| F1 | GitHub Rulesets | `gh api repos/…/rulesets` → **0 件** |
| F2 | branch protection（master） | **未設定**（`protected: false`） |
| F3 | この環境の gh token | scope `repo`・`workflow`・repo 権限 `admin: true`・`push: true`＝**AI セッションから master へ直接 push できる状態**（インシデントの直接条件） |
| F4 | Vercel Git 連携 | master への push で Production 自動 deploy（GitHub Deployments に `vercel[bot]` が Production を作成。v1.0.0＝`6973326943`）。Preview Deployments は 2026-09 に ON（52 件） |
| F5 | Vercel の build 抑止手段（公式 docs 2026-08） | ① Dashboard「Ignored Build Step」（Project Settings → Git）② `vercel.json` の `ignoreCommand`（①を上書き）。**exit 0 ＝ build を無視（deployment は Canceled・Production は不変）／exit 1 ＝ build 続行**。例 `git diff --quiet HEAD^ HEAD ./` ③ 「Require Verified Commits」（GitHub で Verified でない commit の deployment を自動キャンセル）④ `git.deploymentEnabled`（branch 単位の ON/OFF・path では切れない） |
| F6 | 今ローカルにある未 push | integ master は origin/master `d2135d2` に対し **docs-only 3 commit**（INCIDENT 行・Smoke 結果・本 Finalization）。`src/`・`public/`・`package.json`・`index.html` の差分 0（`git diff --stat origin/master..master -- src public package.json index.html` が空） |

## 2. docs の安全な公開方法（推奨 1 つ）

**推奨：CEO が Vercel Dashboard で「Ignored Build Step」を設定してから、AI が docs-only commit を push する。** Production は切り替わらない（Canceled deployment が 1 件記録されるだけ）。

| 順 | 操作 | 誰が | 確認 |
|---|---|---|---|
| 1 | Vercel Dashboard → Project `seven-gods-game` → Settings → Git → **Ignored Build Step** → Behavior「Custom」→ Command に下を貼る → Save | **CEO** | 保存後の画面を 1 枚 |
| 2 | ローカルで事前確認：`git diff --quiet origin/master master -- . ':!docs' ':!*.md'` が **exit 0**（docs 以外の差分なし）であること | AI | 実測（F6 で 0 を確認済み） |
| 3 | `git push origin master`（docs-only 3 commit） | **CEO の明示指示**を受けて AI、または CEO | push 直前に 2 を再実行 |
| 4 | 検証：GitHub Deployments API で新 deployment の state が **`canceled`／`error` ではなく「Ignored」相当**（Vercel 側では Canceled 表示）・Production の配信 JS が `index-Da5QBYVM.js` のまま・`https://seven-gods-game.vercel.app/` の右下が `v1.0.0 (d2135d2)` のまま | AI（read-only） | 変わっていたら即報告（rollback は CEO） |

Ignored Build Step のコマンド（**docs／Markdown だけの push なら build しない**。runtime を含む push は従来どおり build）：

```
git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- . ':!docs' ':!*.md'
```

- `git diff --quiet` は差分が無ければ exit 0（＝無視）、あれば exit 1（＝build）。`VERCEL_GIT_PREVIOUS_SHA`（前回成功 deployment の sha）を使うと、複数 commit をまとめて push したときも**前回 deploy 以降の全差分**で判定する（`HEAD^` だけだと最後の 1 commit しか見ない）。変数が無い環境では `HEAD^` にフォールバック
- 副作用：以後、docs だけの push は常に build されない（意図どおり）。runtime を含む push は build される（v1.0.x の Release 時はこれまでどおり）

却下した案：**`vercel.json` の `ignoreCommand` を先に commit**（`vercel.json` 自体が docs 以外の差分なので、その push で 1 回 build が走り Production の deployment id が変わる＝「確実に抑止」にならない。Dashboard 設定の後なら file 化は可）／**docs を別 branch に push**（Preview deployment が作られうる・master の docs が古いまま）／**push しない**（RELEASE_STATUS と DECISIONS が Production と食い違ったまま）。

## 3. 未承認 push の再発防止（Production 公開経路の保護・read-only 調査）

インシデントの条件は「AI セッションの token が master へ直接 push できる」＋「master push ＝ Production deploy」の 2 つ。両方に別々の鍵をかける。

| # | 策 | 効果 | 設定する人 | 副作用 |
|---|---|---|---|---|
| P1 | **GitHub Ruleset（branch ruleset・target = default branch `master`）**：Require a pull request before merging（承認 0 でも可）＋ Require status checks to pass（`ci`）＋ Block force pushes ＋ Restrict deletions。**Bypass list は空**（owner／admin も直接 push 不可） | `git push origin master` が**サーバー側で拒否**される。master へ入る経路は PR merge だけになり、CI GREEN が前提になる | **CEO**（Settings → Rules → Rulesets → New branch ruleset） | 以後 AI の統合は「branch push → PR → `gh pr merge`」。PR merge 自体は token で可能なので、P3 と併用して「merge は CEO の指示時のみ」をルール化 |
| P2 | **Vercel「Require Verified Commits」**（Settings → Git） | GitHub で **Verified**（署名済み）でない commit の deployment を Vercel が自動キャンセル＝AI の未署名 commit は Production に出ない。CEO が署名した commit（または CEO 署名の merge commit）だけ deploy | **CEO**（GitHub に GPG／SSH 署名鍵を登録し `git config commit.gpgsign true`） | CEO の環境で署名設定が必要。AI の commit を含む merge を CEO が署名して行えば deploy される |
| P3 | **ローカル push 禁止（AI 側）**：integ worktree で `git remote set-url --push origin DISABLED`（push URL を無効化）＋ `.git/hooks/pre-push` で `origin` への push を拒否 | AI セッションからの push が**ローカルで失敗**する（今回の誤実行型を物理的に止める）。CEO が push するときは自分の clone から、または一時的に URL を戻す | **AI**（CEO 承認後・ローカル設定のみ・repo 非追跡） | 正規の push も止まる（意図どおり。解除は 1 コマンド） |
| P4 | **token 分離**：AI セッションの gh を fine-grained PAT（`contents: read`・`actions: read`・ミラー repo だけ `contents: write`）に切替 | 公開元への push 権限を token から外す | **CEO**（GitHub Settings → Developer settings） | ミラー CI 運用は維持可能 |
| P5 | **AI 運用ルール**（CLAUDE.md §6-7 追記案）：「`git push` は CEO の**当該メッセージ**に明示がある場合のみ・push 対象 remote と branch を実行前に 1 行で復唱・Bash 文字列にバッククォート／`$(` を含めない」 | 手順面の二重化 | AI（docs） | — |

**推奨の組合せ**：P1（サーバー側）＋ P3（ローカル側）を即時、P2 は CEO が署名運用を始められるなら追加。P4 は任意。

## 4. CEO 判断（§6-3 #8 該当）

【CEO DECISION REQUIRED】
- Issue：docs 3 commit の公開方法と、Production 公開経路の保護
- AI Recommendation：§2（Ignored Build Step を CEO が設定 → docs push）＋ §3 P1・P3
- Reason：docs push で Production が変わらないことを Vercel 公式の仕組みで保証でき、P1／P3 で「AI セッションから master へ直接 push できる」条件そのものを無くす
- Alternatives：`vercel.json` 先行（1 回 build が走る）／docs を push しない（記録の不整合）／P2 のみ（CEO の署名運用が前提）
- Risk：Ignored Build Step のコマンド誤りで runtime push まで無視される可能性 → v1.0.x 初回 Release 時に deployment が作られたことを確認する手順を追加（§2 順 4 と同じ）
- Impact if delayed：Production と docs の不整合が続く。再発防止が手順のみ（P5）に留まる
- CEO Action：(a) Ignored Build Step 設定済み → AI が push（指示時）／(b) P1 設定済み／(c) P3 を AI に実施させる／(d) 保留
