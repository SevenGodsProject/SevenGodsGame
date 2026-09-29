# docs/evidence の収録ポリシー（決定209〜250 docs 統合・2026-09-30）

- 収録対象：各 Decision 文書が参照する **正式 evidence**（Gate／Smoke の JSON・TSV・summary、解析スクリプト（`.mjs`／`.txt`）、比較画像、配信候補の小さな動画）。
- **PNG スクリーンショットは 500KB 超のものを同名 `.webp`（quality 82）へ変換して収録**した（69 ファイル・57.7MB → 6.2MB）。PNG 原本はローカルの main worktree にのみ残る。Decision 文書中の `.png` 参照は対応する `.webp` を読み替える。
- 収録しないもの：生成動画の原本（Try1 18MB／Try2 5.4MB＝`art-source/h3-god-strike/`・配信外）、scratchpad、node_modules、dist、一時 QA サーバーのログ、API キー・secret（`FAL_KEY` は**変数名のみ**記録し、値はどこにも書かない。request/response JSON は Authorization を含まない形で保存済み）。
- 統合方法：Production runtime `a50b127` を起点にした docs-only branch（`docs/decision209-250-integration`）へ、main worktree から**ファイル単位で**取り出した。`feat/d224`（決定213 runtime を含む）は merge していない。
