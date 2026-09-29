# SEVEN GODS Commercial Game Principles（Layer 2・判断原則集）

- 日付：2026-09-18（Decision 194・AI判断）
- 用途：今後 AI チームが実装・監査・提案の判断に使う原則。講座の要約ではない。**短く保つ。**
- 出典：ゲーム開発講座 Lesson 1〜47（CEO 提供要約。原文未提供）を SEVEN GODS の実物と照合して 15 条に圧縮。根拠は `docs/SEVENGODS_47_LESSONS_CONSOLIDATION_AUDIT.md` §4 Ledger
- 上位：CLAUDE.md（Layer 1）・`docs/DECISIONS.md` §4 不変ルール。下位：Phase docs（Layer 3）

---

## North Star（すべての Gate の起点）

> 敵の意図を読み、神・OTOMO・カードを組み合わせて攻略の答えを見つけ、その答えが鮮やかに決まったときがうれしいカードゲーム。

Primary Fun＝**解く**。Support Fun＝**組む・うまくなる**。
第一 Gate：「これは『解く』をもっと面白くするか？」 第二 Gate：「組む／うまくなる を強くするか？」
講座にある・競合にある・収益になる、だけでは採用しない。

---

## P1. North Star First
提案は第一 Gate を通してから議論する。通らない提案は「後回し」ではなく「作らない」候補。North Star を repo に書き、CLAUDE.md から参照する。（Lesson 01/30/34）

## P2. Solve Is Visible
解くために必要な情報（敵の意図・手札・AP・HP・神託・共鳴）は隠さない。運で勝たせない。Puzzle Mode は作らない。通常戦がすでに puzzle である。（08/13）

## P3. One Change, Then Play
Build→Play→Notice→Describe→Improve。1 milestone に 1 テーマ。display-only か state 変更かを仕様に明記。開いた milestone を閉じてから次を始める。設計書より先に動くものを CEO に見せる。（02/03/19）

## P4. Touch Answers
押せるものは沈み、強い一撃ほど時間が重くなる。頻繁な操作ほど軽く、重要な結果ほど強く（frequency×intensity）。global `button:active` で雑にやらない。Mobile Safari の stuck active と reduced-motion を acceptance に含める。（05）

## P5. Anticipation, Then Reveal, Repeat Short
重要な結果（勝利・初クリア・神技・milestone）は予告→タメ→開示。2 回目以降は短く、skip 可能。演出は結果を変えない。（06）

## P6. Failure Teaches, Retry Is Free
敗北は事実（残 HP・原因・あと一歩）で返す。同じ盤面（同 Seed）で即再挑戦できる。Daily は同日同 Seed・3 回・開始時消費・欠席罰なし。この semantics は変えない。（07/16）

## P7. Progress Has a Destination, on Existing Axes
進行資産は 49 攻略・OTOMO の絆・自己ベスト・神階の 4 軸のみ。新図鑑・新通貨・新 Build 系を作らない。蓄積には必ず見える到達先を置く。Faucet を変えるときは balanceSim を先に回す。Power Inflation は既定で拒否。（09/10/11/12/14/15/44）

## P8. Return Without Obligation
Daily が心臓。login streak・stamina・待ち時間・FOMO を作らない。Weekly 以上の運営は「必要性の evidence」が出てから。一人で続けられる量だけ運営する。（16/45）

## P9. Self Before Others
比較の順序は 自己比較（今回／前回／BEST）→ 共有 → 他者比較 → Ranking。Ranking は Daily 常連の evidence が出るまで dormant。段階接続のみ、whole merge 禁止。（17）

## P10. State Is a Contract
新しい永続 state は Owner／Default／Range／Mutation／Persistence／Migration／Invalid handling を書いてから実装。version 不一致は「読み取り専用保持」を既定にし、初期化するなら損失を明示。未知 ID は throw させず UI で退避。Presentation は state を作らず、結果を変えない。（20/22/25）

## P11. Evidence Before Fix, Gate Before Release, CEO Says GO
Reproduce→Evidence→Isolate→Root Cause→Fix→Regression→Verify→Learn。NOT REPRODUCED に guess fix 禁止。Release は Security／Rights／Privacy／Commerce／Platform／Integrity／Launch Gate を通し、Production GO は CEO。Player Release Note を Release の成果物に含める。secrets は出さない。（18/22/23/25/26）

## P12. One Canon, Many Channels
正典の一枚を描き直さない。動きは whitelist（水面・反射・髪先・衣の端・1 回の pull-back）だけ、camera drift／不要 particles／AI 文字ロゴ禁止、`mix-blend-mode` 禁止、同時 ≤4 層、reduced-motion では出さない。発信は Canonical Story（Problem／Change／Why／Verification／Result）1 本から派生。Dormant を Live と言わない（Fact Gate）。世界言語は 和神・神秘・躍動、色は藍黒・白・金＋神色。原則は借りる、作品はコピーしない。（21/27/28/29/32/42）

## P13. Promise = Proof in 5 Seconds
North Star は内部、Player Promise は外部。言葉で約束した面白さは 5 秒以内に画面で証明する（神と今日の敵が向き合い、敵の予告に神の一手で答える）。Entrance→One Battle→Another Battle→Tomorrow→Safety の順で Launch Gate を通し、日付は後。公式サイト・SNS・計測・会員制は Web 版の Face が成立してから。（30/31/33/34/46）

## P14. Fun Is Not For Sale
「解く」・勝利・再挑戦・競争優位を売らない。課金のために無料版を不便にしない。ゲーム内広告なし。成長は遊んだ結果、課金は愛着の表現（non-consumable の外装・支援のみ）。Monetization Model→Market Shelf→Price の順。Revenue 最適化より Player Loop。（37/38/39/40/47）

## P15. Sustainable and Compounding
モデル名を Architecture にしない（Role＋Acceptance Criteria＋Evidence）。最小権限。法律・税務・契約・権利は AI が論点整理まで、結論は Specialist／CEO。素材は台帳（Source／Creator／Terms／Evidence）で追跡し、Systems・World／Assets・Audience・Knowledge を次回作へ持ち越せる形で残す。（35/36/43/45/47）

---

## 使い方

- 提案・仕様書・監査は冒頭で **P1** を通し、該当する P 番号を明記する。
- 迷ったら「新しいシステムが要るのか、既存システムの接続が足りないのか」を先に問う（後者を優先）。
- 本書の改訂は AI 判断で可。ただし North Star 文と P6・P9・P14 の変更は CEO 判断（CLAUDE.md §6-3）。
