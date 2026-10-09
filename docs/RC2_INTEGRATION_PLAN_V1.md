# RC-2 束ね — 残項目の整理・統合順序・CI 初回実行の安全条件（v1.0 Release Gate・Lane 1）

- 日付：2026-10-10（Lane 1・**AI 整理**・docs-only・read-only 調査。実行した書き込みは本書と `LEGAL_CREDITS_SCREEN_V1.md` §2-2・`RELEASE_GATE_REMAINING_V1.md` 冒頭の 1 行だけ）
- 対象：integ master `05f80a8`（origin/master `641ea5c` から **29 commit 先行**・origin 側の新規 0）／voice branch `feat/official-voice-pilot-v1` `16140c9`／credits branch `feat/legal-credits-screen-v1` `ccc4450`（本書の branch）
- 本書は何も PASS 扱いにしない。「実測」＝本日コマンドで確認した事実／「UNVERIFIED」＝ローカルからは確認できない事項。origin push・master merge・Production deploy・vitest・build は **実行していない**。
- 正：残項目の優先順位は integ master `docs/PRACTICAL_QA_V3_RESULT.md` §7〜§9。本書はそれを「誰が止めているか」で三分し、統合の実行手順を 1 本にする。

---

## 1. RC-2 に含める残項目（CEO 判断待ち／AI で完了可能／完了済み）

| 区分 | # | 項目 | DoD | 根拠・現状（実測） | 次の 1 手 |
|---|---|---|---|---|---|
| **CEO 判断待ち** | 1 | Legal 文言 3 件（S4／C1／F3）＋前提 2 件の確定 | #6 | `LEGAL_CREDITS_SCREEN_V1.md` §2-2 に**確定候補の全文**を用意（未確定・画面は現行文のまま） | CEO「承認」→ AI が `creditsText.ts` 1 回更新 |
| **CEO 判断待ち** | 2 | 公式ボイス Pilot の master 統合（`--no-ff` merge） | #17 | Human QA Q8 3／3 PASS・merge-tree conflict 0（§2） | CEO「承認」→ AI が §2 の順で merge |
| **CEO 判断待ち** | 3 | CI 初回実行（`ci/first-run-*` 1 本の origin push＋Draft PR） | #12 | ci.yml 定義済み・**未実行**。安全条件は §3（UNVERIFIED 2 件は CEO 確認） | CEO「承認」＋ §3 の事前確認 2 件 → AI 実行 |
| **CEO 判断待ち** | 4 | Release 実行（master push＝Production deploy・Rollback 演習 Promote 2 回・Known 凍結・`1.0.0`・tag・公開投稿） | #5・#9・#10・#11・#13・#18 | RC Gate（§2 の順 6）全 PASS の後に 1 回 | 判断 1〜3 の後 |
| **AI で完了可能（承認後に実行）** | 5 | `creditsText.ts` 更新 → `creditsScreen.test.ts`（7 it）・`scripts/legal-credits/acceptance.mjs`（38 項目）再実行 → credits branch を master へ `--no-ff` merge | #6 | 判断 1 の承認が根拠。merge-tree conflict 0（§2） | 判断 1 直後 |
| **AI で完了可能（承認後に実行）** | 6 | voice branch の Gate を現 master 上で再実行 → `--no-ff` merge → `creditsText.ts` に A-1 の 1 文追加 → master full Gate | #17 | 判断 2 の承認が根拠。runtime 3 ファイルは master 側で未変更（§2） | 判断 2 直後 |
| **AI で完了可能（承認後に実行）** | 7 | `ci/first-run-2026-10-10` 作成 → push（この 1 本のみ）→ Draft PR → GREEN／RED 記録 → PR close | #12 | 判断 3 の承認＋§3 事前確認 | 判断 3 直後 |
| **AI で完了可能（承認不要）** | 8 | clean RC worktree で決定267 型 Release Gate（`ranking-absence.mjs` 17・migration・同 seed・Playwright acceptance） | #2・#8 | 順 5〜7 の後の master で 1 回 | 統合完了後 |
| **AI で完了可能（承認不要）** | 9 | RELEASE_STATUS 生存 Known の v1.0.0 再集計案（判断 4 の材料：初見 evidence 0・D1 未実施・voice skip・敵アート／SE 現状維持 K07／K31・「入口 skip でも鳴る」C 1 行） | #10 | `PRACTICAL_QA_V3_RESULT.md` §2 の追加候補 | 順 8 と同時 |
| **AI で完了可能（承認不要）** | 10 | `package.json` `1.0.0-rc.1 → 1.0.0` bump と DECISIONS LIVE 行の下書き | #18 | 判断 4 の直前に用意（push はしない） | 順 8 の後 |
| **AI で完了可能（CEO の「触らない」解除後）** | 11 | TD-01 main repo（`SevenGodsGame` dirty）の patch 救出（push 0） | #13 | 現在は保護対象（触らない） | v1.0 後でも可 |
| **完了済み** | 12 | DoD #1〜#4・#8（Production で成立）／#14・#15・#16（CEO 実機 QA 2026-10-10）／#7（台帳 §7） | — | `RELEASE_GATE_REMAINING_V1.md` §A・`PRACTICAL_QA_V3_RESULT.md` §4 | なし |
| **完了済み（統合待ち）** | 13 | CM-01 Public Face・RL-01／01b Save Guard・A11y Minimum Pack・CI 定義：master 済み・**Production 未反映** | #5・#9・#12 定義・#14 | 未 push 29 commit に含まれる | 判断 4 で Production へ |

**v1.0 後に回すもの（RC-2 に含めない）**：7 神ボイス展開／初見プレイヤー Human QA／D1 Android Smoke／敵アート・SE 実音源の課金 GO-NO／忠次 Pilot（Lane 2）／Card Art Unity（Lane 3）。

## 2. 統合順序（voice と credits の両 branch・実測に基づく）

### 2-1. 事前確認（read-only・2026-10-10 実測）

| 確認 | voice `16140c9` | credits `ccc4450` |
|---|---|---|
| merge-base | `6c8b226` | `021795b` |
| `git merge-tree --write-tree master <branch>` | **conflict 0**（tree `e2d34a4`） | **conflict 0**（tree `eec277a`） |
| 変更ファイル数 | 11（runtime 3：`src/components/battle/BattleScreen.tsx`・`sound.ts`・`feelTier.ts`／test 1：`officialVoice.test.ts`（10 it）／public 1：`assets/voice/taiyo/greeting.mp3` 189,357B／原本 1：`audio-source/voice/taiyo/taiyo-greeting.mp3`／docs 4：`OFFICIAL_VOICE_PILOT_V1.md`・`ASSET_RIGHTS_LEDGER.md` §3-L・`SGG-CREATOR-KIT-RIGHTS.md`・evidence json／script 1） | 15（runtime 6：`GameFlow.tsx`・`feedbackSnapshot.ts`・`icons.tsx`・`setup/CreditsScreen.tsx`・`HomeScreen.tsx`・`creditsText.ts`・`setup.css`／test 1：`creditsScreen.test.ts`（7 it）／docs 3＋evidence 3／script 1） |
| 両 branch で重なるファイル | **0**（`comm -12` 実測） | |
| `src/core` 差分 | 0 | 0 |
| 権利前提 | **KNOWN**：Kit Guidelines §5「キャラクターの声」（Updated 2026-10-08・master の repo 写しは 2026-10-08 版と同一）・台帳 VOICE-KIT-01 ◎ KNOWN（原本＝配信＝MCP の sha256 3 者一致）。**未確認**：Guidelines の termsId／版番号は本文に「v1.0.0」のまま（§5 追加でも版番号が変わっていない＝規約側の表記。本作側で追跡する識別子は Updated 日付） | 文言は未確定（§1 #1）。権利認定はしない |

### 2-2. 順序（AI 推奨：credits → voice → CI → RC Gate）

| 順 | 作業 | 根拠・理由 | merge 後に走らせるテスト（名前のみ・実行は承認後） |
|---|---|---|---|
| 1 | **credits** branch：`creditsText.ts` を §2-2 確定候補で更新 → branch 上で Gate → master へ `git merge --no-ff feat/legal-credits-screen-v1` | 文言確定（判断 1）が前提。voice より先にする理由：voice 統合時に `creditsText.ts` へ A-1 の 1 文を足す必要があり、**credits が master に無いと A-1 を書く場所が無い** | `npx tsc -b`／`npm run lint`／`npx vitest run src/components/creditsScreen.test.ts src/components/entranceWiring.test.ts src/components/feedback src/components/a11yMinimum.test.ts`／`PLAYWRIGHT_MODULE=… node scripts/legal-credits/acceptance.mjs`（PC・SP375 38 項目）／full `npx vitest run` |
| 2 | **voice** branch：現 master 上で Gate 再実行 → `git merge --no-ff feat/official-voice-pilot-v1` → `creditsText.ts` の素材 1 行目を A-1 の文へ置換（「公式ボイス」の語は使わない＝禁止語テスト維持）→ `creditsScreen.test.ts` の必須語を A-1 に合わせて 1 箇所更新 | 判断 2 が前提。runtime 3 ファイルは master 側で `6c8b226` 以降未変更（実測）＝merge は追加のみ | `npx vitest run src/components/battle/officialVoice.test.ts src/components/battle/sound.test.ts src/components/battle/useBattleSound.test.ts src/components/creditsScreen.test.ts`／`node scripts/official-voice-pilot/acceptance.mjs`（PC・SP × ミュート有無 4）／`scripts/legal-credits/acceptance.mjs` 再実行／full `npx vitest run`／`npx vite build`（voice MP3 が `dist/assets/voice/` に含まれる） |
| 3 | DECISIONS に統合 2 行（決定 候補・AI 実行・CEO 承認日） | 運用ルール | — |
| 4 | **CI 初回実行**（§3） | 判断 3 が前提。master に credits＋voice が入った状態で CI を回す＝RC と同じ内容で GREEN を取る | ci.yml の 4 step（tsc／oxlint／vitest／build）。Playwright は含まれない |
| 5 | clean RC worktree（`release/v1-0-0-rc`）で決定267 型 Release Gate | 承認不要 | `scripts/release-audit/ranking-absence.mjs`（17）／`scripts/release-safety/migration.mjs`／同 seed parity／Playwright acceptance（legal-credits 38・official-voice 4・a11y 70） |
| 6 | 判断 4 → push → Vercel deploy → Production Smoke → Rollback 演習 → Known 凍結 → `1.0.0`・tag | CEO | Production Smoke 6 項目（A-5） |

却下した順序：**voice → credits**（A-1 の文を置く `creditsText.ts` が master に無く、voice 統合後に credits 側で A-1 を含めて再 Gate する二度手間）／**credits と voice を 1 つの RC branch に先に束ねる**（CEO 承認が 2 件別なので、片方だけ承認されたとき解けなくなる）。

## 3. CI 初回実行の安全条件（事実ベース・2026-10-10）

### 3-1. 何がどのイベントで走るか（実測：`.github/workflows/ci.yml`・`package.json`）

| 事実 | 内容 |
|---|---|
| trigger | `pull_request → master`／`push → master`／`workflow_dispatch`。**他 branch への push 単体では走らない**（Draft PR を開いて初めて `pull_request` で走る） |
| job | `ubuntu-latest`・Node 24・`npm ci` → `npx tsc -b` → `npm run lint`（oxlint）→ `npm test -- --reporter=dot`（`vitest run`）→ `npx vite build`。timeout 15 分。Playwright・決定論 sim は含まない |
| permissions | `contents: read` のみ。secrets 参照 0。deploy ステップ 0（**ci.yml から Vercel には何も送らない**） |
| concurrency | `ci-${{ github.ref }}`・cancel-in-progress（同 branch の再 push で前 run を cancel） |
| 環境依存 | `node:fs` で repo 内ファイルを読む契約テストは CI でも動く／`skipIf(env)` の sim は CI で skip（ローカルの skip 数と一致する想定）／`playwright` は devDependency 1.63.0 exact だがブラウザ DL は不要（postinstall なし） |

### 3-2. master push が Production を叩く経路

| 事実／UNVERIFIED | 内容 |
|---|---|
| 実測 | repo に `vercel.json`・`.vercel/` は無い。Vercel の Git 連携は **Dashboard 側の設定**（repo 外）。`RELEASE_STATUS.md` A-5：「`git push origin master` → Vercel 自動 deploy」が決定267 までの実績経路 |
| 実測 | master push は同時に ci.yml の `push` trigger も起動する＝**CI が RED でも Production 反映は止まらない**（CI と deploy は独立） |
| **UNVERIFIED-1** | Vercel が **branch push ごとに Preview deployment** を作る設定か（Preview Deployments の ON／OFF・Deployment Protection）。ON なら `ci/first-run-*` の push で外部からアクセスできる Preview URL が 1 本できる（Production には影響しない） |
| **UNVERIFIED-2** | repo の **public／private**（`gh repo view SevenGodsProject/SevenGodsGame --json isPrivate,visibility` で判る・本日未実行）。public なら branch／PR 経由で `docs/evidence`・`art-source`（CEO 原本画像）・Decision 文書が閲覧可能 |

### 3-3. 安全条件チェックリスト（全て満たしてから AI が実行）

| # | 条件 | 誰が | 状態 |
|---|---|---|---|
| C1 | UNVERIFIED-1（Vercel Preview 設定）を CEO が Dashboard で確認、Preview が ON なら「Preview URL が 1 本できることを許容」か「一時的に OFF」かを決める | CEO | 未 |
| C2 | UNVERIFIED-2（public／private）を確認（AI が `gh repo view` read-only で可・CEO 承認後） | AI（承認後） | 未 |
| C3 | `git fetch origin` 後 `origin/master` が `641ea5c` のまま・origin 側の新規 commit 0 | AI | 実測 OK（2026-10-10） |
| C4 | 一時 branch は `git branch ci/first-run-2026-10-10 master` で作る（checkout なし・新 commit 0・`git diff master ci/first-run-2026-10-10 --stat` が空） | AI | 手順固定 |
| C5 | push は `git push -u origin ci/first-run-2026-10-10` の **1 本だけ**（`--all`／`--tags`／master 禁止）。push 直後に `git log -1 origin/master` が `641ea5c` のまま | AI | 手順固定 |
| C6 | PR は `--draft`・title「ci: first run (do not merge)」・merge しない。GREEN／RED を run URL 付きで記録。RED でも「GREEN」と記録しない | AI | 手順固定 |
| C7 | 後始末：`gh pr close` → branch 削除（CEO が残置を望めば残す）。origin/master 不変を再確認 | AI | 手順固定 |
| C8 | master 本体の push は別承認（判断 4）。CI GREEN は push の条件であって push の承認ではない | — | ルール |

### 3-4. 「一時 branch＋Draft PR」なら Production に触れないか

- **ci.yml 経路**：触れない（deploy ステップ 0・secrets 0・`contents: read`）。**事実**。
- **Vercel Git 連携経路**：Production は master に紐づく（A-5 実績）ので、他 branch の push では Production は変わらない。ただし **Preview deployment は作られ得る**（UNVERIFIED-1）。Preview は Production とは別 URL・別 deployment id で、Production の配信内容・rollback 先 `6859615239` には影響しない。
- **結論**：Production に触れないことは「ci.yml 側＝確定／Vercel 側＝C1 の確認を経て確定」。C1 なしで「Production に影響なし」と断定しない。

## 4. CEO 判断（§6-3 該当のみ・`PRACTICAL_QA_V3_RESULT.md` §9 の 4 件と同一・本書で更新した点だけ）

| # | 判断 | 本書での更新 |
|---|---|---|
| 1 | Legal 文言 3 件＋前提 2 件の確定 | **確定候補の全文**を `LEGAL_CREDITS_SCREEN_V1.md` §2-2 に用意（CEO は「承認」または行ごとの修正で確定できる） |
| 2 | 公式ボイス Pilot の master 統合 | 統合順序を credits → voice に固定（§2-2）。conflict 0・重複ファイル 0 を実測 |
| 3 | CI 初回実行 | 安全条件 C1〜C8（§3-3）。CEO が事前に行うのは **C1（Vercel Preview 設定の確認）1 件**。C2 は承認後 AI が read-only で確認 |
| 4 | Release 実行 | 変更なし（§2-2 順 6 の前に順 5 の報告） |

判断 1〜3 は 1 回の返信で同時に可。判断 4 は順 5 の報告後。
