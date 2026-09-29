# SEVEN GODS Next Milestones（一本道）

- 日付：2026-09-18（Decision 194・AI判断）
- 根拠：`docs/SEVENGODS_47_LESSONS_CONSOLIDATION_AUDIT.md` §35〜§38、原則：`docs/SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md`
- ルール：NEXT NOW は常に 1 つ。開いた milestone を閉じてから次へ（P3）。各 milestone は `src/core` diff の有無・新 state の有無を冒頭で宣言する
- Baseline：Production＝master＝origin/master＝`88ca430`（決定192）。E1＝`feat/entrance-e1` `1cba2e6`（決定193・未 LIVE）

---

# NEXT NOW — Entrance E1 Close-out

**Living Still stage 1（Ebisu・CSS のみ）を E1 に足し、CEO QA → Production Release まで閉じる。time-box 3.5 日。未達なら Living Still を外して E1 のみ Release。**

| 項目 | 内容 |
| --- | --- |
| Player Problem | Production の入口は 7 click＋699 字の自動 tutorial で、5 秒で約束が伝わらない。E1 は 2 tap に直したが未 LIVE。CEO Human QA は 2〜6 PASS、first impression は「静止画で世界に入る感覚が弱い」で HOLD |
| Why Now | 開いた milestone を閉じる（P3）。Launch Gate の最初が Entrance（P13）。feasibility は実測済み（`docs/PHASE7_ENTRANCE_CINEMATIC_FEASIBILITY.md`・未 commit）。Production は今も 7 click 入口 |
| Exact Scope | ①feasibility doc を commit ②Ebisu Living Still stage 1：camera pull-back（scale 1.12→1.0・約 9s ease-out）・微粒子 ≤2 層・光帯（`mix-blend-mode` 禁止）・入場＝全画面 `<button>`（Enter/Space 可・背景 `inert`）・8s 無操作で操作可能化・画像読込失敗で 2.5s 自動解除・`prefers-reduced-motion: reduce` は入場を出さず静止 E1 直行・`visibilitychange` で停止・session 内 1 回のみ（memory flag） ③既存 acceptance.mjs に「入場があれば押す」1 行 ④CEO QA ⑤Release Gate → master merge → Production → Smoke → 決定 195 追記 ⑥`docs/CHANGELOG_PLAYER.md` 初版（Canonical Story 5 行） |
| Existing Systems Reused | E1 Hero God ルール（`heroGod.ts`）・`gods/ebisu/keyvisual-hero.webp`・`bgm.ts` の unlock・`reducedMotion.ts`・`scripts/release-hygiene/cls.mjs`・`scripts/entrance-e1/acceptance.mjs` |
| New State? | **なし**（storage write 0・新キー 0・saveVersion 9 不変・gameVersion 不変） |
| Core Risk | 0（`src/core` diff 0） |
| Save Risk | 0 |
| Daily Risk | 0（Home 表示のみ。Daily panel・回数・Seed に触れない） |
| Ranking Risk | 0 |
| Privacy Risk | 0 |
| Rights Risk | 低（既存正典画像のみ。台帳整備は L4） |
| Commercial Risk | 0 |
| Automated Tests | `entranceWiring.test.ts` 維持／reduced-motion 時に入場 DOM が存在しない／8s fallback／CLS 0・LCP 不変（cls.mjs）／入場後の最終 layout が E1 と一致／追加転送 ≤10KB・新画像 0 |
| Human QA Question | 「入場→Home で別の絵に見えなかったか（seam ×3）」「iPhone 実機で引っかかり・発熱はないか」「初陣まで何 tap か（4 以内）」「静止 E1 より世界に入る感覚は上がったか（YES/NO）」 |
| Exit Criteria | CEO QA PASS／Release Gate 10 項 PASS／Ranking Absence・Secret Audit PASS／Production Smoke PASS／決定 195 追記／CHANGELOG_PLAYER 初版 |
| Expected Player Effect | 初回訪問で「神と今日の敵が向き合う」約束が 5 秒で伝わり、初陣まで 3〜4 tap。Entrance 内部スコア 67 → 72 前後（予測） |
| Motion Laws | P12・監査 §15 の 12 項を acceptance に転記 |
| Time-box 超過時 | Living Still の CSS/JS を外し、E1（`1cba2e6`）を Release Gate へ。Living Still は L8 に戻す |
| CEO 判断 | Production 公開のみ（§6-3 #8）。完了時に §6-4 形式で 1 案提出 |

---

# NEXT LATER（順序固定）

## L2. Interaction Feel v1（display-only・state 0）
- Player Problem：`:active` が repo で 1 件、tap-highlight 0、ボタン SE 0。押しても世界が返答しない（P4）。勝利 staging 2.4s が skip 不可（P5）。
- Exact Scope：要素別の沈み（カード 1〜2px 最軽／Primary CTA 沈み＋SE 1 種〔木・紙系〕／End Round／神・難易度・OTOMO・報酬・Daily・Records）、`touch-action: manipulation`、`-webkit-tap-highlight-color: transparent`、`focus-visible` 可視化、pointer cancel、勝利 staging の tap-skip（結果不変）。global `button:active` 禁止。
- New State：なし。Core/Save/Daily/Ranking Risk：0。
- Tests：reduced-motion で時間 0・沈みは残る／Mobile Safari stuck active の手動 QA 表／skip 後の Result 内容が非 skip と同一。
- Human QA：「押した感じがあるか」「iPhone で押しっぱなしにならないか」「skip しても損した気がしないか」。
- Exit：CEO QA PASS → Release。

## L3. Solve Loop（通常戦の再挑戦と自己比較）
- Player Problem：通常戦の「同じ構成でもう一度」は新 Seed。同じ意図を読み直せない（P6）。通常戦に前回比がない（P7）。初クリアが 1 行。
- Exact Scope：Result Hub Primary に「同じ盤面でもう一度」（現 seed を `startGame` へ）、Secondary に「同じ構成（新しい盤面）」／同 matchup の「前回→今回」1 行（既存 records から導出。導出不能なら新 state の State Contract を先に書く）／初クリア（神×敵）の 1 拍 ≤600ms・reduced で 0／P2 で DEFER した「49→nextGoal」ルール 1 本の再評価。
- Daily：semantics 不変（同日同 Seed・3 回・開始時消費）。Daily の Primary は現状維持。
- Core Risk：低（seed の受け渡しのみ）。Save Risk：前回比が新 state を要する場合のみ。
- Tests：同 Seed 再挑戦で R1 の敵意図・手札が一致／records の best 更新が retry でも正しい／share URL の seed と retry seed が一致。
- Human QA：「負けた直後にもう一度読み直したくなったか」「前回比の 1 行は嘘がないか」。

## L4. Engineering Sidecar（非 runtime 中心・並行可）
- 理由：runtime を触らない作業は Human QA を奪わないため、L2/L3 と並行してよい（P3 の例外として明記）。
- Exact Scope：①`otomo.defId` guard（決定191 と同型・`isSavedBattle` に検証追加・UI 退避・regression test）②`deckPreference` の版方針（saveVersion bump で破棄しない migration か、破棄を明示）③GitHub Actions 1 本（PR：tsc/oxlint/vitest）④`.claude/worktrees` 5 本と `SevenGodsGame-rc` の整理（`git worktree prune`・CEO 確認不要だが削除前に一覧提示）→公式テスト数の再計測 ⑤docs：`docs/README.md` index、CLAUDE.md §1/§4 の現状化＋North Star 追記、`docs/NORTH_STAR.md`、stale docs（RELEASE_STATUS・NIGHTLY・FINAL_BACKLOG・PLAYTEST_GUIDE）へ superseded 注記、`docs/ASSET_RIGHTS_LEDGER.md` 雛形、`docs/CHANGELOG_PLAYER.md` 運用開始 ⑥`.vercelignore` で dead asset（`enemies/*/art.png` 等 ~2.8MB）の配信除外検討。
- New State：①②のみ Save に触れる → 別 commit・別 Gate。
- Tests：`otomoIdResilience.test.ts`、deckPreference v8→v9 想定の migration test。
- CEO：Rights Ledger の空欄記入（INPUT）。

## L5. OTOMO 絆の到達先
- Player Problem：絆は表示専用で童子到達 0〜4%、経路差 0（決定186）。成長に見える到達先がない（P7）。
- Exact Scope：次称号までの残 pt を Result／OTOMO 画面に 1 行（P1 で DEFER した「絆の次解放」）／絆 pt の Faucet 再調整（共鳴以外の発生条件 1 つを追加候補）→ **balanceSim 必須**／Power は据え置き（戦闘非関与を維持）。
- New State：なし（`sevengods.otomoBond` v1 内で完結。version bump なし）。
- Exit：balanceSim で全神×3 戦略の勝率変動 ≤±5pt、童子到達率が 30 戦以内で >50%。

## L6. Return & Voice
- Web Share API（`navigator.share` 対応時のみ・fallback は現行 clipboard）／Feedback Place 1 個（送信先＝外部サービス → **CEO 判断**）／Daily の Tease（翌日の敵タイプのみ・Seed は出さない）。
- Daily semantics 不変。Privacy：送信内容は snapshot＋自由記述のみ、識別子なし。

## L7. Face & Commercial Prep
- OG メタ・1 行説明・favicon 以外の Icon／Privacy・Credits 画面（SGG Kit クレジットは任意だが掲載）／Canonical Story の公開運用／Store Compliance checklist（再利用資産）／KPI 3 本の導入判断（外部サービス → **CEO 判断**）。
- 課金・広告は入れない（P14）。

## TRIGGER. Ranking staged activation
- Trigger：Daily 常連の evidence（L7 の KPI か Feedback の声）。
- 順序：identity（匿名 ticket）→ submit → leaderboard 表示。Whole merge 禁止。Neon・identity・privacy は **CEO 判断**。

## L8. Build diversity / visual polish / content
- CSS カラートークン化（見た目不変）／敵意図の絵文字 → glyph／共通カードの条件・シナジー拡張（Replayability 監査の次テーマ）／Living Still stage 2（動画・7 神）は CEO 実機評価後。

---

# DO NOT START YET

new gacha／paid random rewards／login streak／stamina／idle economy／giant story mode／separate puzzle mode／many secret collectibles／new 3×5 build system／PvP now／200+ cards now／five currencies／artificial waiting／paid retry／paid Daily attempts／power-selling OTOMO／premature email membership／premature Discord／premature recruitment／premature 3-month Live Ops／premature native Store conversion／premature persistent analytics／premature mass localization／whole ranking branch merge／video Living Hero（7 神・stage 2）

分類（REJECT／LATER-TRIGGER）は監査 §12。

---

# CEO DECISION REQUIRED（現時点）

1. **E1（＋Living Still stage 1）Production 公開** — NEXT NOW 完了・CEO QA PASS 後に §6-4 形式で提出。
2. **（INPUT）Asset Rights Ledger の出所記入** — L4 で雛形作成後。NEXT NOW を block しない。

L6 の Feedback Place、L7 の KPI、TRIGGER の Ranking は到達時に 1 案ずつ提出する。
