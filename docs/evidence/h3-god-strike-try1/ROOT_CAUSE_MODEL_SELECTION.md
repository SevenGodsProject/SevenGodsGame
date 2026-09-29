# 決定250 Try1 — モデル選定 Root Cause（事実記録・2026-09-29）

- CEO 承認モデル：`minimax/h3-max/image-to-video`（CEO 指示 2026-09-29。fal.ai のモデル一覧に「MiniMax H3 Max Image to Video」`minimax/h3-max` として実在【WEB実測 2026-09-29】）
- 実際に Try1 を生成したモデル：`fal-ai/kling-video/v2.5-turbo/pro/image-to-video`（`gen_try1.mjs` 5 行目に AI がハードコード・`try1_request.json` の `endpoint` と一致）
- 再生成 0・本確認の課金 0（WEB 閲覧のみ）

## 1. 実行ログ／スクリプト／設定の確認結果【実測】

| 確認対象 | 結果 |
|---|---|
| repo 全体（docs／src／scripts／設定・node_modules 除外）の grep `minimax`／`h3-max`／`hailuo`／`kling` | **承認モデル名の記録 0 件**。`kling` は本レーンの `gen_try1.mjs`／`try1_request.json` にしか存在しない |
| `docs/H3_GOD_STRIKE_PILOT_PREFLIGHT.md` §11・§13（決定250 候補・CEO へ提出した文書） | 「H3 model：**fal.ai の image-to-video モデル。名前は repo に記録なし → WEB確認必要・CEO INPUT**」と明記。モデル ID は未決定のまま §19 の CEO DECISION を提出 |
| `docs/DECISIONS.md` 決定250 行 | 「コスト：モデル名・単価・規約は repo に記録なし → WEB確認必要（CEO INPUT 5 項目）」 |
| CEO の Try1 実行指示（本セッション冒頭・2026-09-29） | 「FAL_KEY を設定した」「Decision250 で CEO 承認済みの条件に従って Try1 を 1 回だけ実行」。**モデル ID の記載なし**。承認モデルが `minimax/h3-max` であることは Try1 完了報告後の CEO 指示で初めて文書化された |
| 環境変数・設定ファイル（`FAL_MODEL`／`FAL_ENDPOINT`／`.env*`） | 該当なし（モデルを外部設定から読む仕組みは存在しない） |
| AI の選定過程（本セッションの実行ログ） | fal.ai の価格ページ 3 件（Kling 2.5 Turbo Pro／Wan 2.2 A14B／MiniMax Hailuo-02 Standard）と WebSearch 1 件を閲覧し、「固定 $0.35・1:1 入力保持・negative prompt・2D キャラの identity 保持の評判」を根拠に Kling を **AI 判断で選定**。`minimax/h3-max` はこの調査で表示されず、候補に入っていない |

## 2. Root Cause

1. **承認の成果物にモデル ID が無かった**：決定250 候補は「モデル ID は CEO INPUT」としながら、CEO の承認回答（FAL_KEY 設定＋実行指示）にも AI の実行前確認にもモデル ID が含まれず、**「承認済みの条件」にモデルが含まれているかを AI が確認しないまま実行した**
2. **AI が「WEB確認必要」を「AI が選んでよい」と解釈した**：CLAUDE.md §6-2（ライブラリ内部の選択・推奨案選定）の範囲と判断し、§6-3 #4／#6（課金・外部サービス）に該当する「どのモデルに課金するか」を CEO へ戻さなかった。課金額（$0.35）は小さいが、**承認対象の同一性**が崩れた
3. **調査範囲の漏れ**：fal.ai のモデル一覧（`/models?q=minimax`）を引いておらず、CEO が意図した H3 Max を候補に載せられなかった

## 3. 影響と再発防止（AI 判断・docs のみ）

- 影響：Try1 の identity Gate PASS・候補 D の評価は Kling 出力に対するもの。H3 Max での結果は未知。CEO 判断（2026-09-29）：候補 D を採用し Try2／追加生成は行わない
- 再発防止：**課金を伴う生成は、モデル ID・単価・回数を 1 行で書いた「実行前確認」を CEO 承認文に含め、スクリプトはその ID を引数で受け取る（ハードコード禁止）**。決定250 の DECISIONS 行追記時に本記録を参照する

## 4. 追記（2026-09-29 Resume Audit で新たに確認した事実・docs-only）

**事実【実測】**：Try1 実行より前の 05:23 JST に、先発セッション（scratchpad `a0e18275…/scratchpad/d250/fal-try1.mjs`）が `minimax/h3-max/image-to-video` をハードコードした生成スクリプト（768P・5s・1 回のみ・費用上限と `submitted.json` による再実行防止付き）を作成していた。このスクリプトは**未実行**（`submitted.json`・`response.json`・`taiyo-h3max-try1.mp4` のいずれも存在しない）。その 21 分後の 05:44 に後発セッション（`c7df54ea…/scratchpad/h3try1/gen_try1.mjs`）が Kling 版を独立に作成し、05:45 に実行した（`try1_request.json` の `submitted_at` 2026-09-28T20:45:07Z）。fal.ai の `request_id` は全 scratchpad・docs を通じて `01a0e9c3-…d1d7` の 1 件のみで、追加生成・Try2／Try3 は行われていない。したがって本書 §1 の「承認モデル名の記録 0 件」は **repo 内（docs／src／scripts）について正しい**が、AI チームの作業領域（scratchpad）には承認モデルを正しく指定したスクリプトが一度は存在していた。

**推測（実物からは確定できない）**：2 セッションが並走し、後発セッションが先発セッションの成果物（h3-max 版スクリプト）を参照しないまま、自前の WEB 調査からモデルを選定したと見るのが最も整合的。セッション間の引き継ぎ経緯（CEO がどの順で各セッションへ指示したか）は scratchpad からは判定できない。再発防止（§3）に加え、**課金を伴うスクリプトは repo 管理下の 1 箇所（`docs/evidence/<lane>/`）にのみ置き、実行前にその場所の既存スクリプトを確認する**ことを運用に追加する。
