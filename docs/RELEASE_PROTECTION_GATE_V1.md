> **状態（2026-10-11・CEO 指示「Release Protection Gate」・read-only 調査・AI 判断）：GitHub／Vercel の公式 docs と repo の実測に基づく設計と手順。設定変更・push・deploy・tag は行っていない。CEO が操作する最小手順は §7。**

# Release Protection Gate v1 — Production 公開経路の保護（調査結果と手順）

## 0. 確認済み／未確認の区別

| 区分 | 事項 |
|---|---|
| **確認済み（公式 docs・実測）** | Vercel Ignored Build Step の挙動一覧と exit code（§3）／`VERCEL_GIT_PREVIOUS_SHA` の定義／Vercel の shallow clone depth 10／Vercel は「branch push」で deploy（tag は branch ではない）／repo は PUBLIC・Rulesets 0・branch protection なし・AI セッションの gh token は `repo` scope＝push 可／git の push 認証は credential manager（gh token とは別）／`vite.config.ts`・`package.json` は `scripts/` に依存しない／CI は tag push で走らない（`push.branches: [master]`）／Claude Code のユーザー設定に `Bash(git push:*)` の **soft_deny** が既にある（インシデントは `node -e` 文字列内のバッククォート経由で、この soft_deny を通らなかった） |
| **未確認（docs の文言を取得できず・GitHub の一般仕様として記載）** | Rulesets が **GitHub Free の public repo で使える**こと（GitHub の plans ページは「Pro＝private repo で protected branches」と記す＝public では Free で可、の裏返し。設定画面で確認可能）／bypass list が空なら **repo admin にも適用**されること（設定画面の「Bypass list」で確認可能） |

## 1. GitHub Ruleset — 適用条件と「master への直接 push を確実に拒否」する設定

- **適用条件**：対象 repo `SevenGodsProject/SevenGodsGame` は **PUBLIC**（実測）。公式 docs（available-rules）の rule 定義は取得済み。設定場所＝Settings → Rules → Rulesets → **New branch ruleset**
- **設定（推奨）**

| 項目 | 値 | 根拠 |
|---|---|---|
| Name | `protect-master` | — |
| Enforcement status | **Active** | — |
| Bypass list | **空**（誰も追加しない） | 空でなければ admin（＝CEO の token＝AI セッションの token）が素通りする |
| Target branches | **Default branch**（`master`） | — |
| Restrict deletions | ON | 公式：「bypass 権限のある人だけが削除できる」 |
| Block force pushes | ON（既定） | 公式：force push 禁止 |
| **Require a pull request before merging** | ON・Required approvals **0**・Allowed merge methods **Merge** のみ | 公式：「target branch への全変更が PR に紐づくことを要求」＝`git push origin master` は **GH013 で拒否**。PR の merge は可 |
| Require status checks to pass | ON・check＝`tsc / oxlint / vitest / build`（ci.yml の job 名）・Require branches up to date ON | 公式：「必須 check が通るまで変更不可」＝CI RED の merge を止める |
| Restrict updates | **OFF** | 公式：「bypass 権限のある人だけが push できる」＝PR merge も止まる。bypass 空なら誰も merge できない |
| Require signed commits | 任意（§2-3） | ON にすると AI の未署名 commit は master に入れない（CEO 署名の運用が必要） |

- **確認方法**：`gh api repos/SevenGodsProject/SevenGodsGame/rulesets`（1 件・`enforcement: active`）、`gh api repos/SevenGodsProject/SevenGodsGame/rules/branches/master`（rule 一覧）。実地確認は不要（`git push --dry-run` はサーバー側 rule を評価しない）
- **限界**：Ruleset は「誰が」を区別しない。AI は CEO の token を使うため **PR 作成と `gh pr merge` は依然可能**。「merge は CEO の指示時のみ」を運用で担保し、identity の分離は §2 で行う

## 2. Claude Code の origin push 権限を制限する設計（fetch／pull・作業 branch は維持）

push の経路は 2 本：**git**（credential manager に保存された CEO の GitHub 資格情報。gh token とは独立）と **gh／API**（`gho_` token・`repo` scope）。両方に鍵をかける。

### 2-1. git 側：`pre-push` hook で「origin の master」だけ拒否（推奨・AI が承認後に設置）

- 置き場所：共通 git dir `C:\Users\kimi1\SevenGodsGame\.git\hooks\pre-push`（**全 worktree で共有**＝integ・pilot・rl01 すべてに効く。保護 worktree の作業ファイルには触れない）
- 動作：stdin の各行 `<local ref> <local sha> <remote ref> <remote sha>` を読み、**remote URL が公開元（`SevenGodsProject/SevenGodsGame`）かつ `<remote ref>` が `refs/heads/master`** のときだけ exit 1。作業 branch（`refs/heads/feat/*` 等）・tag・ミラー `SevenGodsGame-ci` への push は通す。fetch／pull には無関係
- CEO の正規 push：`git push --no-verify origin master`（hook を**明示的に**スキップ＝意思表示）。AI は `--no-verify` を使わない（§2-4 ルール）
- 確認：`git push --dry-run origin master` が hook で止まる（pre-push は `--dry-run` でも走る）／`git push --dry-run origin feat/xxx` は通る

```sh
#!/bin/sh
# pre-push: block pushes to the public repo's master unless --no-verify (CEO intent)
remote_url="$2"
case "$remote_url" in *SevenGodsProject/SevenGodsGame.git*|*SevenGodsProject/SevenGodsGame) ;; *) exit 0 ;; esac
while read -r local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_ref" = "refs/heads/master" ]; then
    echo "pre-push: refusing to push to origin/master (Production). Use --no-verify only on explicit CEO instruction." >&2
    exit 1
  fi
done
exit 0
```

却下した案：`git remote set-url --push origin DISABLED`（作業 branch の push も全部止まる＝CEO 要件「作業ブランチの運用は維持」に反する）／`extensions.worktreeConfig` で integ だけ pushurl を無効化（repo 形式の拡張を有効化する副作用・他 worktree は無防備）

### 2-2. gh／API 側：AI セッション用の fine-grained PAT に切替（CEO 作業・任意だが identity 分離の本命）

- GitHub → Settings → Developer settings → Fine-grained tokens：Repository access＝`SevenGodsGame`（**Contents: Read**・Metadata: Read・Actions: Read・Pull requests: Read and write）＋`SevenGodsGame-ci`（Contents: **Read and write**・Actions: Read）
- AI セッションでは `gh auth login --with-token` でこの token を使う（CEO 自身の gh は現状維持）。効果：AI の `gh`／API からは公開元へ **書き込めない**（PR 作成・merge・contents 更新が不可）。ミラー CI 運用は維持
- 注意：git push の認証は credential manager（CEO 資格情報）なので、**2-1 の hook と併用**が必須

### 2-3. Vercel 側：Require Verified Commits（任意・CEO の署名運用が前提）

- Settings → Git → Require Verified Commits：GitHub で Verified でない commit の deployment を**自動キャンセル**（公式）。AI の未署名 commit が master に入っても Production には出ない。CEO が署名（GPG／SSH 鍵を GitHub に登録・`git config commit.gpgsign true`）した merge commit だけ deploy
- 副作用：CEO の環境で署名設定が必要。未署名のまま push すると「deploy されない」ので Release 手順に署名確認を足す

### 2-4. Claude Code／AI 側の設定とルール

- ユーザー設定 `~/.claude/settings.json` の `soft_deny` にある `Bash(git push:*)` を **`permissions.deny`** へ格上げ（CEO 作業・1 行）。直接の `git push …` コマンドをツール層で拒否。**ただし文字列内のコマンド置換は捕まえられない**（今回のインシデント型）→ 2-1 の hook が最終防衛
- AI ルール（CLAUDE.md §6-7 追記案）：①`git push` は CEO の**当該メッセージ**に明示がある場合のみ ②実行前に remote と ref を 1 行で復唱 ③Bash 文字列にバッククォート／`$(` を含めない（ファイル編集は Write／Edit／.cjs 経由） ④`--no-verify` を使わない

## 3. Vercel Ignored Build Step の再監査

| 観点 | 結果（公式 docs・2026-09 版） |
|---|---|
| 挙動の選択肢 | Automatic／Only build production／Only build preview／Only build if there are changes／**Only build if there are changes in a folder**／**Don't build anything**／Run my Bash script／Run my Node script／Custom |
| exit code | **0 ＝ build を即中止し deployment は `CANCELED`**。**1 以上 ＝ build 続行**（KB：「1 or greater」）。＝ コマンドのエラー（git の 128 等）も「build する」側に倒れる（fail-open） |
| Canceled の扱い | Production は不変（前の deployment が配信され続ける）。ただし **Canceled も deployment 数にカウント**（Hobby の 1 日上限に含まれる） |
| 同一 SHA | 既に deploy 済みの SHA は新 deployment を作らない |
| git 履歴 | `git clone --depth=10` の shallow clone。`HEAD^` は使える。`VERCEL_GIT_PREVIOUS_SHA`（前回成功 deployment の sha・branch 初回は空・Ignored Build Step 設定時のみ露出）が depth 10 より古いと `git diff` は失敗（128）→ build 側に倒れる |
| **`scripts/` 全体を除外するリスク** | `vite.config.ts`・`package.json` の scripts は `scripts/` を参照しない（実測）＝build 入力ではない。リスク＝将来 build 時に `scripts/` を読むようにしたとき除外ルールが古くなる → ルール更新を Release 手順に含める。もう 1 つ：`.github/`・`package.json`・`index.html`・`public/` は除外しないので runtime push は確実に build される |
| **初回 push 時の動作**（docs 4 commit） | `VERCEL_GIT_PREVIOUS_SHA` ＝ `d2135d2`（master の最終成功 deployment）。HEAD から 4 commit 前＝depth 10 内 → diff 可。`HEAD^` フォールバックは**最後の 1 commit しか見ない**ため、4 commit まとめ push では不十分（今回はたまたま最後も docs-only） |
| **SHA 比較の正しさ** | 判定したいのは「前回 deploy 以降の全差分に runtime が含まれるか」＝`VERCEL_GIT_PREVIOUS_SHA..HEAD`。`HEAD^..HEAD` は誤り（複数 commit push で runtime 変更を見落とし Production が古いまま＝fail-closed 側の誤り） |
| **設定失敗時の挙動** | コマンド誤り／パス誤り／変数空 → 非 0 → **build が走る**（同じ src なら同一 bundle の新 deployment＝Production の id が変わるだけ・内容は同じ）。「確実に再 deploy しない」を保証できるのは **Don't build anything** だけ |

**結論**：docs 4 commit の公開には **「Don't build anything」を一時設定**（コマンド依存ゼロ・fail-safe）。恒久の docs スキップは §7 の後で Custom を設定（任意）：

```
git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- . ':!docs' ':!scripts' ':!*.md'
```

## 4. docs-only 4 commit を Production 再デプロイなしで公開する手順（1 案）

対象：integ master `426c611`（origin/master `d2135d2` ＋ docs 4 commit：`dfb8f71`・`aaa254b`・`173299b`・`426c611`）。runtime 差分 0 を実測済み（`git diff --quiet origin/master master -- . ':!docs' ':!scripts' ':!*.md'` → exit 0）。

| 順 | 操作 | 誰が | 確認 |
|---|---|---|---|
| 1 | Vercel → Project `seven-gods-game` → Settings → **Build and Deployment** → Ignored Build Step → **Don't build anything** → Save | **CEO** | 画面 1 枚 |
| 2 | 事前確認（read-only）：`git fetch origin`・`git rev-parse --short origin/master` ＝ `d2135d2`・上の `git diff --quiet` が exit 0・`git log --oneline origin/master..master` が 4 件 | AI | 1 つでも違えば中止 |
| 3 | `git push origin master`（**§1 の Ruleset 適用前**に行う。適用後は直接 push が拒否される） | **CEO**（または CEO の明示指示で AI。hook 設置後なら CEO が `--no-verify`） | push 出力 `d2135d2..426c611` |
| 4 | 検証（read-only）：GitHub Deployments API に `426c611` の deployment が **Production で作られていない／Canceled**・`https://seven-gods-game.vercel.app/` の配信 JS が `index-Da5QBYVM.js` のまま・Home 右下 `v1.0.0 (d2135d2)` のまま・公開元 CI run（push で走る・GREEN 期待） | AI | 変わっていたら即報告（rollback は CEO） |
| 5 | §5 の tag を同じ窓で push（任意・推奨） | CEO | — |
| 6 | Ignored Build Step を **Automatic** に戻す（または §3 の Custom） | **CEO** | 戻し忘れると次の v1.0.x が deploy されない |

## 5. tag `v1.0.0` が公開 commit `d2135d2` を正確に指す手順

- 対象 commit の完全 sha：**`d2135d2ede1b5acad0cc2c92b2ba48c7055ca333`**（`git cat-file -t` ＝ commit・実測）。Production deployment `6973326943` はこの sha
- tag は **annotated**（tag object が commit を指す。`^{}` で剥がすと commit sha）

```
git fetch origin
git rev-parse origin/master                       # → d2135d2ede1b…（4 commit push 後は 426c611 になるが、tag は d2135d2 を指す）
git tag -a v1.0.0 d2135d2ede1b5acad0cc2c92b2ba48c7055ca333 -m "SEVEN GODS v1.0.0 — Production deployment 6973326943"
git rev-parse v1.0.0^{commit}                     # → d2135d2ede1b5acad0cc2c92b2ba48c7055ca333 であること
git push origin refs/tags/v1.0.0                  # tag だけ（branch は含めない）
git ls-remote --tags origin refs/tags/v1.0.0 'refs/tags/v1.0.0^{}'   # ^{} 行が d2135d2ede1b… であること
```

- Vercel：deploy は「branch push」で作られる（公式）。tag push は branch ではないので deployment は作られない見込み。**確実にするため §4 順 1 の「Don't build anything」の窓の中で push する**。CI：`push.branches: [master]` のため tag push では走らない（実測）
- hook（§2-1）は `refs/tags/*` を通す設計。Ruleset（§1）は branch ruleset なので tag には及ばない（tag を守るなら別途 tag ruleset）
- 失敗時：誤った commit を指した tag は **push 前**なら `git tag -d v1.0.0` で作り直し。push 後は削除＋再 push（Ruleset の Restrict deletions は tag ruleset を作らない限り tag には効かない）

## 6. 適用順序と各段階の確認

| 段階 | 操作 | 誰が | 確認方法 | なぜこの順 |
|---|---|---|---|---|
| 0 | 現状（何も変えない） | — | §0 | — |
| 1 | Vercel：Ignored Build Step ＝ Don't build anything | CEO | 設定画面 | 2・3 の push で Production が動かない保証 |
| 2 | docs 4 commit を push | CEO（or 指示で AI） | §4 順 4 | Ruleset の前（直接 push が必要） |
| 3 | tag `v1.0.0` を push | CEO | `ls-remote` の `^{}` ＝ d2135d2 | 同じ窓 |
| 4 | Vercel：Ignored Build Step ＝ Automatic（or Custom） | CEO | 設定画面。次の runtime Release で deployment が作られることを確認 | 戻し忘れ防止 |
| 5 | GitHub Ruleset `protect-master`（§1） | CEO | `gh api …/rulesets`・`…/rules/branches/master` | 以後 master は PR 経由のみ |
| 6 | `pre-push` hook（§2-1）＋ Claude 設定の `deny` 格上げ（§2-4） | AI（承認後）／CEO | `git push --dry-run origin master` が hook で拒否・`feat/*` は通る | ローカル最終防衛 |
| 7 | 任意：fine-grained PAT（§2-2）／Vercel Require Verified Commits（§2-3） | CEO | `gh auth status` の scope／Vercel 設定画面 | identity 分離 |

## 7. CEO が操作する最小手順（この順・各 1〜2 分）

1. Vercel Settings → Build and Deployment → Ignored Build Step → **Don't build anything** → Save
2. 「docs を push してよい」と指示（AI が事前確認 → CEO か AI が push → AI が §4 順 4 を確認して報告）
3. `git tag -a v1.0.0 d2135d2ede1b5acad0cc2c92b2ba48c7055ca333 -m "…"` → `git push origin refs/tags/v1.0.0`（CEO）
4. Ignored Build Step → **Automatic**（または §3 の Custom コマンド）→ Save
5. GitHub Settings → Rules → Rulesets → New branch ruleset：Active・Bypass 空・Default branch・Restrict deletions・Block force pushes・Require PR（approvals 0・Merge のみ）・Require status checks `tsc / oxlint / vitest / build`
6. 「hook を設置してよい」と指示（AI が §2-1 を設置し dry-run で確認）／`~/.claude/settings.json` の soft_deny → deny（CEO）
7. 任意：fine-grained PAT・Require Verified Commits
