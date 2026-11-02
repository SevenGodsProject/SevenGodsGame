# Release Protection v2 — 作業 branch push の自律化（決定289・2026-11-03）

> **状態：APPLIED（2026-11-03・CEO「進めて」承認後に AI が実施・検証済み）。** Release Protection v1（決定280・`docs/RELEASE_PROTECTION_V1.md`）の「AI は push を一切しない」を、CEO の 7 安全条件つきで「**作業 branch への push のみ AI が自律実行**」へ改める。master への push・force push・tag push・削除 push・`gh pr merge`・`gh release` は従来どおり AI には許可しない。Production 公開（PR merge）は PR ごとに CEO Gate。

## 1. 安全条件（CEO 指定 7 項目）と実装

| # | 条件 | 実装 | 検証 |
|---|---|---|---|
| 1 | 作業 branch への push のみ自律化 | Claude Code ユーザー設定 `permissions.deny`：`Bash(git push:*)` の全面 deny を外し、`git push origin master*`／`-u origin master*`／`--force*`／`-f*`／`--force-with-lease*`／`--tags*`／`origin --tags*`／`--delete*`／`-d*`／`origin :*`／`--no-verify*`／`--mirror*`／`--all*` を **個別 deny**（prefix 一致） | §3-1 |
| 2 | push 前に差分・secret・対象 branch を検査 | 共有 pre-push hook v2（`C:\Users\kimi1\SevenGodsGame\.git\hooks\pre-push`・全 worktree 共有）：対象 remote が公開元 repo のときだけ、ref ごとに ①master 拒否 ②tag 拒否 ③削除拒否 ④non-fast-forward 拒否 ⑤除外ローカルファイル（`.claude/settings.local.json`・`.env*`・`敵画像/`）を含む commit 拒否 ⑥追加行の secret 様文字列（GitHub token 2 種の接頭辞／OpenAI key 接頭辞／AWS access key 接頭辞／パスワード付き Postgres 接続 URL／Neon ホスト名／秘密鍵ヘッダ／Vercel token・DB URL の環境変数代入／Slack token 接頭辞。正規表現は hook 本文を参照）拒否。OK 時は commit 数と検査結果を stderr に 1 行 | §3-2 |
| 3 | master 直接 push・force push・tag push 禁止 | deny（#1）＋ hook（#2）＋ GitHub Ruleset `protect-master`（PR 必須・必須 check・force／削除 禁止）の 3 層。**Ruleset だけに依存しない** | §3-2 |
| 4 | `gh pr merge`・`gh release` の deny 維持 | deny に残置 | §3-1 |
| 5 | Production 公開は CEO 明示承認必須 | 運用：PR ごとに「対象 PR・差分・CI・影響範囲」を提示 → CEO 承認 → merge は CEO（AI は deny のため実行不可） | 運用 |
| 6 | 設定変更前にバックアップ | `C:\Users\kimi1\.claude\settings.json.bak-2026-11-03-prepush`（5,031 B・変更前と同一）／hook 旧版 `pre-push.bak-2026-11-03`（1,089 B） | 実施 |
| 7 | 変更後に実際の権限と保護動作を検証 | §3 | 実施 |

## 2. 変更内容（差分）

- `~/.claude/settings.json`：`permissions.deny` の 1 行（`Bash(git push:*)`）→ 13 行の個別 deny（§1 #1）。`gh pr merge`／`gh release` は不変。JSON 妥当性確認済み
- 同ファイル `autoMode.soft_deny` の `git push` 項目（「全 push を Production deploy 扱いで確認」）の **文言の絞り込みは、Claude Code の自己変更ガードにより AI では適用できなかった**（§4）。現状のまま＝作業 branch への push も自動モードの分類器で確認対象になりうる
- pre-push hook v2（§1 #2）。v1 の挙動（master 拒否・他 remote は素通し）は包含

## 3. 検証結果（2026-11-03）

### 3-1. 設定

- deny 一覧の再読込で 15 項目を確認（`git push origin master*` 〜 `gh release:*`）。バックアップとの差分は deny ブロックのみ

### 3-2. hook（ネットワークに出さないローカル検証：stdin に ref 行を与えて実行）

| ケース | 期待 | 結果 |
|---|---|---|
| `refs/heads/master` へ push | REFUSED | **REFUSED**（exit 1） |
| tag `refs/tags/v9.9.9` | REFUSED | **REFUSED** |
| 削除 push（local sha = 0） | REFUSED | **REFUSED** |
| non-fast-forward（remote sha が local の祖先でない） | REFUSED | **REFUSED** |
| 新 branch `docs/ops-policy-2026-11-03`（origin/master 起点 1 commit） | OK | **OK**（1 commit・fast-forward・除外 0・secret 0） |
| 既存 branch の fast-forward 更新 | OK | **OK** |
| 追加行に `ghp_` 36 文字（一時 branch の一時 commit） | REFUSED | **REFUSED**（secret-like strings）。一時 branch・ファイルは削除済み・tracked dirty 0 |
| 除外ローカルファイルを含む commit | REFUSED | **未実施**（`.claude/` が worktree に無く一時ファイルを置けなかった。grep 条件は secret ケースと同経路で動作） |

### 3-3. 実 push（§5 に追記）

## 4. 残る制約と CEO への依頼（1 件・任意）

- `autoMode.soft_deny` の `Bash(git push:*)` 文言は AI が変更できない（自己変更ガード）。このため自動モードでは作業 branch への push が「確認」に回ることがある。**CEO が任意で** `~/.claude/settings.json` の当該 1 行を「`Bash(git push origin master*)` のみ」に絞れば、作業 branch push は確認なしで通る。絞らなくても安全性は hook＋deny＋Ruleset で担保される

## 5. 実 push の記録

- 2026-11-03：branch docs/ops-policy-2026-11-03 を AI が自律 push（Claude Code の deny に抵触せず・自動モードの分類器も通過）。1 回目は hook ⑥が **本書に書いた検査パターンの文字列そのもの** を secret 様として REFUSED（誤検知・設計どおりの動作）→ 文書の表記を一般語に直して amend → 2 回目 **OK**（new branch・fast-forward）。PR #8 を AI が作成。merge は CEO Gate
- 教訓：検査パターンの正規表現は hook 本文にだけ置き、docs には書かない
