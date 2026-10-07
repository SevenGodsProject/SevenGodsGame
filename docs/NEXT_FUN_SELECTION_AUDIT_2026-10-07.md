# 「次にゲームを最も面白くする 1 件」再選定監査（2026-10-07・AI 判断・docs/code-read のみ）

- 種別：**AUDIT ONLY／docs-only**（npm／vitest／ブラウザ／simulation／runtime 変更 0）
- 判断主体：候補比較と推薦＝**AI 判断**（CLAUDE.md §6-2「複数案からの推奨案選定」）。Pilot 開始＝**CEO**（決定4 境界に触れるため §6-3 #1 相当の確認。2026-10-07 承認）
- 対象 runtime：master `641ea5c`（Production・決定267 Reward Relevance v1 LIVE 後）
- 本書は決定263 Pilot の結果（`docs/DECISION263_THREAT_SHAPE_V1_PILOT.md`）とは **分離** して記録する（CEO 指示）
- 読んだ一次情報：`docs/DECISIONS.md`（決定213／214／240／244／246／252／255／260／261／262／263／264／266／267）、`COMMERCIAL_RC_KNOWN_ISSUES_TRIAGE.md`（K31〜K35）、`DECISION262_ANSWER_VISIBILITY_V1_PILOT.md` §6、`SOLUTION_DIVERSITY_V1_PREFLIGHT.md`、`ENEMY_ULTIMATE_THREAT_DIFFERENTIATION_PREFLIGHT.md`、`FINAL_PRACTICAL_QA_CLOSEOUT.md`、`evidence/final-practical-qa-v2/session-1.md`・`session-3.md`、`LATE_ROUND_ENEMY_IDENTITY_INTEGRATED_PREFLIGHT.md`、`src/core/data/enemies.ts`・`otomo.ts`・`rules.ts`、branch 文書（`DECISION263_THREAT_SHAPE_PREP.md`・`OPENING_HAND_READ_PREFLIGHT.md`・`HAND_DECISION_DENSITY_AUDIT.md`・`POST_D262_LANE_AB_EXECUTION_ORDER.md`）、`feat/otomo-stance-pilot` の diff（26 files・+1,243／−8）

## 0. 結論

**決定263 候補「Threat Shape v1」を採用（74／100）。次点＝OTOMO Stance 再 Pilot（54）。**

## 1. 前提となる事実（同週の監査で確定済み）

| # | 事実 | 出典 |
|---|---|---|
| F1 | 通常／Hard で**カード選択は勝敗に効かない**：randomRO 99.6％＝reader 99.6％。勝敗を分けるのは「加護をいつ切るか」の 1 点 | HDD Audit・決定260 |
| F2 | 数値レバーは閉鎖：AP 平準化 NO-GO（決定260）、カード数値／係数 NO-GO（決定255）、加護弱体 ±0.3pt | 決定255／260 |
| F3 | 事後の可視化（結果画面）は lever ではない：決定262 CEO Human QA NO | DECISION262 §6 |
| F4 | 開幕の「この手札でどう戦う？」が成立しない Root Cause＝**備える先が画面に無い**。マリガン／役割タグ／開幕オーバーレイ／持ち越し表示は却下済み | OHR Preflight |
| F5 | 「解く」自体は成立（S1 Q2・S2 Q1 YES）。未成立は S2 Q2「手札でどう戦うか」NO のみ。K33 OPEN | CLOSEOUT §3／TRIAGE K33 |
| F6 | 7R は上限であり目標ではない。R4〜R5 が山場。HP／ATK／AP／新 mechanic で R6〜R7 を延ばさない | Lane 5 NO-GO・CEO 受容 |
| F7 | 敵の「問題」は予告列の形だけで作られ、新 mechanic（break／自己回復／自己強化）・敵 guard（決定216）・per-hit・2 段溜めは棄却。決定252 FINAL SPEC は CLOSED | ENEMY_ULTIMATE Preflight §2-3 |
| F8 | OTOMO 精霊態の効果は 7 体すべて空。Stance Pilot（決定213）は CEO Human QA PASS だが branch のみ（基点 `270b3e7`）。決定214「7 OTOMO DESIGN NOT READY」NO-GO | `otomo.ts`／決定212〜214 |
| F9 | 神階Ⅲ以降では WEAKEN／MEND が勝敗に必要＝「組み合わせ」は熟練面に既に実装済み | 決定255 §2-1 |
| F10 | 決定263 Prep：`previewEnemyActions` 純関数＋1,568 セル一致テスト PASS・`round.ts` export 1 行・UI 未実装・配置先＝決定264 Duel HUD v3 の敵 HP 直下 | DECISION263 PREP |

## 2. 候補別監査

### (a) 決定263 Threat Shape v1 — 敵 7R の脅威の形（段階 glyph のみ・数値なし）
- 狙う弱点：F4「備える先が画面に無い」（K33 の唯一残った構造 lever）。S2 Q2 NO に直結
- 期待効果：解く＝R1 の 1 択 42.8％ を「残す／出す」の判断へ、託宣温存に「見えている R」という対象を与える／Strategic Depth＝敵別の答え（道化＝加護 72％・魔獣＝MEND 38％・機工師＝その R に撃破 37％）が初見で問題として見える／Replayability＝7 敵の形の違いが一目で分かる／UX＝HUD 1 行追加（枠なし・K34 整合）
- コスト：core は読み取り専用純関数 1 つ（済・テスト済・gameVersion 不変）。UI ≈70 行。rollback＝revert 1 commit
- 制約：決定4「予告は 1 手先」・決定205 §8 の**境界に触れる**→ CEO 承認。ただし型説明が既に R と技名を文章で開示済み＝提示形式の変更。数値・AP・敵表・託宣は変更 0
- Gate：G1 一致／G2 帯 glyph＝実 R の予告 glyph／G3 静的／G4 240 A1・254 T5／G5 timing lock／G6 文言 0。sim 不要。Human QA 2 戦
- 不確実性：数値構造が不変（F1）なので「R4 に加護」という答えが見えやすくなるだけで計画が 1 次元のまま＝規則的応答が強まる可能性。Q2／Q4 で検出でき、NO なら「presentation では K33 は解けない」と確定（情報価値はどちらでも出る）

### (b) Enemy Identity — 試練／怨霊／龍神の差別化（文言・telegraph のみ）
- 狙う弱点：3 体が R4 単峰で数値差のみ
- 期待効果：解く＝低。F7 のとおり問題は峰の形でしか作れず、それは決定252 で CLOSED。文言では「分かるが変わらない」（決定262 と同型）。試練は入門敵として差が無いこと自体が設計
- 制約：表を触れば決定252 再開（CEO 判断）

### (c) OTOMO Strategic Value — 鯛丸 Stance（v0.2 連撃／v0.3 溜め返し）の再 Pilot
- 狙う弱点：F8
- 期待効果：解く＝実証あり（v0.3 Human QA 4/4 YES）。新規所見：決定214 の前提「charge は機工師と道化だけ」は決定252 で鬼将 R3 溜めが加わり、溜め返しの適用敵は 2→3 体。ただし試練／怨霊／龍神は attack／special のみで決定214 の結論は不変
- コスト：**高**。26 files／+1,243 行、`playCard.ts`・`endRound.ts`・`createInitialState.ts`・`types/state.ts`・`gameVersion` を含み、決定246／251／252／253／267 を跨ぐ rebase。golden／balanceSim 全面再基準化
- 制約：CEO 指示「7 OTOMO 展開・Progression・merge 禁止」継続。決定214 NO-GO
- 不確実性：恵比寿 1 神限定＝製品全体の「解く」には 1/7

### (d) Card Decision Meaning — 残レバー（役割タグ／「残せます」表示／引き直し／悪手の回復）
- 期待効果：解く＝低〜中。悪い引きは存在しない（山札 85〜93％ 消化）＝「回復すべき失敗」が無い。マリガンは却下済み。役割タグ／残せます表示は OHR Preflight が「備える先が無ければ計画にならない」として単独不採用・(a) の次段

### (e) Battle／Character polish — K34 残（G13・K32 Card Art Unity・K35 Voice）
- 期待効果：解く≈0。Game Feel は確実に＋。K32／K35 は CEO 判断事項（§6-3 #5／#6）

### (f) その他
- f1 道化 第 2 峰 R6→R5（並べ替え）：決定252 FINAL SPEC の再開＝CLOSED レバー・1 敵のみ
- f2 神階／Daily 到達誘導：通常の K33 を解かず Retention 側
- f3 第 3 の判断「仕込んでから撃つ」強化：決定218 で体験経路は既に通っており追加余地が小
- f4 God Strike カットイン 6 神展開（決定250）：Game Feel のみ・有料生成（§6-3 #6）

## 3. 100 点評価

重み：Primary Fun「解く」**45**（North Star・K33 が唯一の OPEN 設計課題）／Strategic Depth 10／Replayability 5／Game Feel・UX 10／Retention 5／実装コスト・Regression 10／既存 Decision 整合・Gate 準備度 10／反証可能性 5

| 候補 | 解く/45 | 深さ/10 | 再遊/5 | Feel・UX/10 | 継続/5 | コスト/10 | 整合/10 | 反証/5 | **計** |
|---|---|---|---|---|---|---|---|---|---|
| **(a) 決定263 Threat Shape v1** | **34** | 7 | 3 | 6 | 3 | **9** | 7 | **5** | **74** |
| (c) OTOMO Stance 再 Pilot | 24 | 7 | 3 | 6 | 3 | 3 | 4 | 4 | 54 |
| f3 第 3 の判断 強化 | 16 | 5 | 2 | 5 | 2 | 7 | 8 | 3 | 48 |
| f2 神階／Daily 到達誘導 | 15 | 5 | 4 | 3 | 4 | 7 | 7 | 2 | 47 |
| (d) 役割タグ／残せます表示 | 14 | 3 | 2 | 5 | 2 | 8 | 8 | 3 | 45 |
| (b) Enemy Identity 文言のみ | 12 | 3 | 2 | 4 | 2 | 9 | 6 | 2 | 40 |
| f1 道化 R5／R6 並べ替え | 8 | 2 | 1 | 3 | 1 | 6 | 3 | 4 | 28 |
| (e) Polish 残 | 2 | 0 | 1 | 8 | 3 | 5 | 5 | 3 | 27 |
| f4 God Strike 6 神展開 | 2 | 0 | 2 | 9 | 3 | 2 | 3 | 4 | 25 |

## 4. 推薦の根拠（次点に勝つ 3 点）

1. **対象の広さ**：(a) は 7 神 × 7 敵 × 全難易度・Daily に同時に効く。(c) は恵比寿 × 4 敵
2. **コストと Regression**：(a) の core 接触は済み・テスト済の純関数のみ。(c) は engine 5 ファイル＋型＋gameVersion を跨ぐ rebase
3. **順序の合理性**：(a) で「溜め」「必殺」の位置が常時見えれば、(c) の構えは「帯の上に乗る」形で設計し直せる

## 5. 成立条件（反証可能）と Pilot 後の分岐

- C1：CEO Human QA（怨霊→機工師）で Q2「帯を見て盾札・託宣を後の R へ意図的に残そうと思った場面があった」YES
- C2：Q3「答えを教えられている」NO・Q4「R1〜R3 の緊張が減った」NO
- C3：行動の痕跡：盾札または託宣を意図的に後の R へ残した場面が 2 戦中 1 回以上
- C4：帯 glyph ＝ 実 R の予告 glyph 不一致 0／C5：決定240 A1 ±0・timing lock・横スク 0・console 0
- YES → (c) OTOMO Stance を「帯の上に乗る構え」として再設計（決定214 前提の更新を含む）／NO → 「Threat presentation だけでは Card Decision Meaning を改善できない」と確定し STOP（表示量・色・文章・数値の追加で救済しない）

## 6. 新たに記録する所見（AI 判断）

1. 決定214 の前提「`charge` は機工師と道化だけ」は決定252 で鬼将 R3 溜めが加わり更新が必要（溜め返し系の適用敵 2→3）。7 OTOMO NO-GO の結論自体は不変
2. Threat Shape v1 は試練／怨霊／龍神の「形の同一性」を画面上で可視化する副作用を持つ＝Enemy Identity を次に議論する際の実プレイ証拠になる
3. 7R 常時表示は R6〜R7 を「⚔ ⚔」として見せる＝F6「7R は上限」と整合し、R4〜R5 山場への集中を視覚的にも裏付ける
