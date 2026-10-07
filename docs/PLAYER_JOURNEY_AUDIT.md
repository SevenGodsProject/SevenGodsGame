# Player Journey Audit — 「切れ目」監査（DISCOVER → RETURN TOMORROW）

- **日付：** 2026-10-07
- **種別：** AUDIT ONLY（docs-only・read-only）。runtime／src／public／scripts 変更 0・build／vitest／browser／simulation 実行 0
- **判断主体：** AI 判断（CLAUDE.md §6-2「既存仕様の範囲内の改善」「推奨案選定」）。CEO 承認が必要な事項（§6-3）は含まない
- **baseline：** `SevenGodsGame-integ` master `641ea5c`（= Production）
- **Decision 番号追加：** なし（本書は監査であり決定ではない。採用時は該当 lane が番号を取る）
- **決定263（Threat Shape v1）不干渉：** 別 lane で CEO Human QA 待ち。本書は参照・重複明記のみ行い、263 の仕様変更は提案しない
- **ペルソナ：** 📊 Planner（UX 観点）

---

## §0. 結論（先に）

「機能が足りない」ではなく「体験が切れている」場所を探した。結論：**切れ目は 3 箇所**（DISCOVER／SECOND BATTLE／RETURN TOMORROW の条件付き）。うち最大は SECOND BATTLE で、Root Cause は **「第 1 戦の結果が第 2 戦の選択（神・敵・カード）に接続されていない＝Result→Setup の情報断絶」** の 1 件。

| Stage | 現状 | 切れ目 | 根拠（file:line／doc §） | 既存 Decision／Backlog ID |
|---|---|---|---|---|
| DISCOVER | `<title>` のみ。description／OGP／twitter:card 0 | **有** | `index.html:5-7` | CM-01（P0） |
| OPEN | 金色 Primary 常に 1（resume／初陣／神域／神を選ぶ）。Secondary 枠のみ | 無（小さな競合のみ） | `homePrimary.ts:41-46`・`HomeScreen.tsx:134-174` | 決定193／198（E1）・UX-08 |
| UNDERSTAND | Brief 3 行＝予告・神力・ラウンド終了。「カードを選ぶ基準」は「神力の範囲で攻撃・防御・回復」のみ | **有（部分）**＝263 と重なる軸と重ならない軸がある | `firstBattle.ts:34-38`・`TutorialOverlay.tsx:69-90` | OB-01・決定206／217・決定263（AUTOMATED GATE PASS → HUMAN QA READY） |
| FIRST SOLVE | Recap（事実のみ・最大 3 行）＋自己ベスト＋49 攻略＋報酬 3 役＋次の目標 | 無（ただし初陣は「読まなくても勝てる」設計のため **Recap が空になり得る＝未検証**） | `GameOverOverlay.tsx:269-347`・`battleRecap.ts:12-17`・`nextGoal.ts:152-155` | 決定166／206／226／267・決定262 NO-GO |
| SECOND BATTLE | NR1「魔獣に挑む（神を選ぶ）」→ 選択を全消去して神選択へ。4 画面を初見 | **有（最大）** | `nextGoal.ts:157-163`・`GameFlow.tsx:251-258`・`EnemySelectScreen.tsx:112-116` | UX-01・UX-02・RP-02 |
| RESULT／REPLAY | 出口 Primary 1／Secondary 2。敗北時のみ同じ盤面 | 無 | `resultHub.ts:55-74`・`nextGoal.ts:119-127` | 決定187／196・RP-03 |
| RETURN TOMORROW | 「明日の理由」は N4（今日の神域が手つかず）と D4（神域 3 回消化後の countdown）だけ | **有（条件付き）**＝通常戦で終えた日は 0 | `nextGoal.ts:100-105,165-169` | Daily Retention lane・RP-06 |

---

## §1. DISCOVER — Discord／X で URL を見た人

**現状：** `index.html:7` は `<title>SEVEN GODS：共鳴カードバトル</title>` のみ。`meta description`・`og:*`・`twitter:card`・`theme-color` は無い（`index.html:3-8`）。Discord／X のカードには **タイトルとドメインだけ** が出る。「何のゲームか」「何が楽しいか」「何分か」「インストール不要か」のどれも URL からは分からない。

**既存コピーから OGP に載せられる文（新規の言葉を作らない）：**

| 項目 | 候補文 | 出典 |
|---|---|---|
| og:title | SEVEN GODS：共鳴カードバトル | `index.html:7` |
| og:description（何のゲームか） | 七柱の神と挑む、七日間の物語。 | `HomeScreen.tsx:130` |
| 同（何が楽しいか＝ループ） | 敵は次の行動を予告します。神力でカードを出し、7ラウンド以内に敵のHPを0にすれば勝利。 | `firstBattle.ts:35-37`・`TutorialOverlay.tsx:90` |
| 同（インストール不要） | ブラウザでそのまま遊べます | 事実（Vercel 配信）。アプリ内に該当コピーは無い＝新規 1 句 |
| 何分か | **書けない**。1 戦の所要時間の実測は Practical QA v2 の観察欄が空欄（`evidence/final-practical-qa-v2/session-1.md:15`） | — |

**切れ目：** 有。「何分か」は実測値が無いので OGP に書けず、書くなら先に測る必要がある（§8 PJ-01）。`og:image` は Public Face Pack（CM-01）側の決定事項であり本書は文言のみ扱う。

---

## §2. OPEN — Home で「次に押すもの」は一意か

**現状：** `selectHomePrimary`（`homePrimary.ts:41-46`）が resume → firstBattle → daily → normal の順で金色 Primary を **ちょうど 1 つ** 決める。新規は「初陣へ／おすすめの構成ですぐ戦う」（`HomeScreen.tsx:144-154`）。「神を選ぶ」は Primary でない限り枠のみの Secondary（`:163-170`）。Today パネルの CTA は Primary が daily のとき消える（`:173`）。「戦績を見る」「OTOMOとの絆を見る」はテキストリンク（`:176-185`）。

**評価：** E1（決定193／198）で CTA 競合は解決済み。残る小さな点は 2 つ。(a) 復帰プレイヤーで Primary が normal のとき、金色「神を選ぶ」と Today パネル CTA が同画面に並ぶ（`:165` と `:173 showCta`）が、これは決定193 §6 の想定内。(b) OTOMO リンクは設計未了画面への入口（UX-08・決定214）。どちらも「次に押すものが分からない」には至らない。

**切れ目：** 無。E1 の再提案はしない。

---

## §3. UNDERSTAND — 初見がループを掴めるか

**ループ：** 敵 Intent を見る → カード／神託を考える → AP を使う → 敵の行動に備える。

**現状：** Brief 3 行（`firstBattle.ts:34-38`）は「予告（⚔ の数字）」「神力と持ち越し不可」「ラウンドを終える／7R 以内に HP 0」を伝える。完全版 Tutorial は 5 ステップ（`TutorialOverlay.tsx:69-90`）で、カードを選ぶ基準は **「神力の範囲で、攻撃・防御・回復のカードを使えます」**（`:75`）＝基準は「AP に収まるか」だけ。戦闘中は EnemyPanel が「⚔ 次の攻撃：N」を常時出す（`EnemyPanel.tsx:144-146`）。

**外部所感「何を基準にカードを選べばいいか」：** integ `docs/` を `*EXTERNAL*`／`*FEEDBACK*`／本文全文で検索したが **該当文字列は見つからなかった**（`PHASE6C_DECISION_FEEDBACK.md` は決定フィードバック UI の文書で外部所感ではない）。よって本書では **CEO 報告の外部所感** として扱う。

**突き合わせ：** 基準は設計上すでに 2 軸ある。①「予告に備える」（決定206：Recap が announced／unharmed を数える `battleRecap.ts:25-32`）、②「仕込んでから撃つ」（決定217 §0：bonus `combo`／`charged` を成立させる順）。しかし **初見がこの 2 軸に触れる場所が、Brief にも Tutorial step 2 にも無い**。Tutorial が教える基準は AP 範囲だけなので、所感はコードと整合する（＝言われていないことを聞いている）。

**決定263 との重なり（明記）：** 263 は「敵 7R の脅威の形を glyph 1 行で常時表示」＝軸①の **いつ備えるか** を補う。軸②（カード側の役割・順番）は 263 の範囲外。本書は 263 の文言・表示に一切提案しない。軸②についても「おすすめカード／正解表示／自動選択」は North Star「読む→組む→決まる」（`DECISION203 §:17,27`）と衝突するため提案しない（OB-01／OB-04 DROP と同じ判断）。

**切れ目：** 有（部分）。「選ぶ基準の語彙」が初見導線に無い。ただし 263 の Human QA 結果で軸①側がどう読まれるかが決まるため、**263 クローズアウト前に runtime を動かさない**。

---

## §4. FIRST SOLVE — 初勝利は「自分で解いた」と読めるか

**現状（結果画面の構成順）：** Recap 最大 3 行（`GameOverOverlay.tsx:269-271`、事実のみ・推測禁止 `battleRecap.ts:12-17`）→ スコア → 自己ベスト更新／あと N 点（`:311-312`）→ 49 攻略の印（`:316`）→ 報酬 3 役ローテ（`RewardOverlay.tsx:43-44`・決定267）→ 次の目標 1 つ＋出口（`:344-367`）→ スコア内訳（SP は畳む `:221`）。Victory Reveal（決定226）はこの前段。

**評価：** 「解いた」を語る部品は Recap のみで、しかも決定206 の announced／unharmed／blockedTotal 行は **予告攻撃に対する事実があるときだけ** 出る。初陣（恵比寿×試練の影×ふつう）は「読まなくても勝てる」設計（致死 0.13/試合 `nextGoal.ts:153`、決定260 SUPPORTED）なので、初陣の Recap が「読んだ」事実を含むかは **確率的** で、本書では未検証（simulation 禁止）。Practical QA Session 1 では Q2「予告で行動を変えたか」YES（`FINAL_PRACTICAL_QA_CLOSEOUT.md:29`）だが Session 2 Q2「手札によってどう戦おうと考えたか」NO（`:34`）。

**決定262 NO-GO の尊重：** 事後の「解き方」1 行は提案しない。Recap の **事実行** が出た場合は十分に機能しており、出なかった場合の補完を「説明」で埋めるのは 262 と同じ道になる。

**切れ目：** 無（部品は揃っている）。ただし「初陣で Recap の読み行が出る割合」は evidence 0 ＝ §8 PJ-02 の観察項目に含める。

---

## §5. SECOND BATTLE — 1 戦後に「違う神／敵／カード」を試す理由があるか

**現状の導線：** 初陣に初めて勝つと NR1「次は連撃型『双牙の魔獣』に挑む — 予告を読む戦い」／Primary「魔獣に挑む（神を選ぶ）」（`nextGoal.ts:157-163`）。action は `reselect` → `exitResult` が **godId・deck・selectedEnemyId を全消去**（`GameFlow.tsx:251-255`）→ 神選択（神技・難易度・神階・最終試練が同居、375px で 899px 縦長＝UX-02）→ 敵選択（魔獣にだけ「予告を読む戦い」チップ `EnemySelectScreen.tsx:112-116`）→ デッキ編成（おすすめ 1 発）→ 降臨の間。

**評価：**
- 「敵を変える理由」は NR1 が **与えている**（目的地＋理由「予告を読む」）。これは決定206 の成果で、UX-01 が言う「4〜5 画面初見」はこの導線上で起きる。
- 「神を変える理由」は **無い**。Primary 文言は「神を選ぶ」だが、初陣は恵比寿を選んでおらず（preset）、神選択画面に着いたとき「恵比寿のままでよいのか／なぜ変えるのか」の手がかりが 0。神選択画面の「得意な戦い方」（`GodSelectScreen.tsx:237-254`）は神の説明であって、**第 1 戦で起きたことと接続していない**。
- 「カードを変える理由」も **無い**。報酬 3 役（決定267）は「1 枚足す」判断だが、デッキ編成画面で「初陣でどのカードが働いたか」は参照できない（Recap はデッキ編成画面に持ち越されない）。
- Human QA evidence：「初陣後に自力で 2 戦目を始められたか」は未計測（UX-01 HYP）。「構成を変えたら勝ち方が変わった」も evidence 0（RP-02）。

**切れ目：** 有（最大）。プレイヤーは **目的地（魔獣）だけ渡され、「何を変えるか」の判断材料を持たずに 4 画面を通る**。

---

## §6. RETURN TOMORROW — セッション終端に「明日の理由」が見えるか（観察のみ）

**現状：** 「翌日に戻る理由」を UI に出す規則は 2 つだけ。N4「今日の神域挑戦：○○に挑む」は **今日の神域が手つかずのときのみ**（`nextGoal.ts:165-169`）。D4「今日の挑戦は終了。次の敵まで HH:MM」は **神域モードで 3 回使い切ったときのみ**（`:100-105`）。通常戦で終える日（神域を既にやった、または神域に行かない）は、次の目標が N5〜N10（自己ベスト・神技評価・絆・神階）となり、**明日に言及する行は 0**。Home の Today パネルは翌日開いたときに見えるが、「閉じる前」には出ない。

**切れ目：** 有（条件付き）。Daily 機能の設計は Daily Retention Loop lane の管轄なので本書は観察に留める。関連 Backlog：RP-06「Daily Tease（翌日の敵タイプのみ）」。

---

## §7. SECOND BATTLE Root Cause（1 件）

**Root Cause：Result→Setup の情報断絶。** 第 1 戦の結果画面は「次の目的地」（NR1）を 1 つ渡すが、神選択・デッキ編成画面は第 1 戦で起きたこと（どの予告に備えたか・どのカードが働いたか・何が怖かったか）を一切受け取らない（`GameFlow.tsx:251-255` で選択を全消去、神選択画面に NR1 由来の文脈なし）。初陣は「読まなくても勝てる」ので、プレイヤー自身にも「変えたい何か」が生まれにくく（決定260 SUPPORTED・Session 2 Q2 NO）、**理由の無いまま 4 画面を初見で通る** ことが「2 戦目の壁」の正体である。

**却下した代替 Root Cause：**
| 候補 | 却下理由 |
|---|---|
| 画面数が多い（4〜5 画面） | 画面数を減らしても「何を変えるか」は分からない。2 戦目も preset 直行にすると「組む」を奪い North Star と衝突 |
| 神選択画面の情報密度（UX-02） | 密度を下げても判断材料は増えない。UX-02 は独立した P2 として残す |
| おすすめ神／おすすめ敵の表示 | 「正解表示」系＝FORBIDDEN（OB-01／OB-04 DROP） |
| 初陣が簡単すぎる（AP 曲線） | 決定260 NO-GO。初陣 preset は E1 で確定済み |
| 2 戦目用チュートリアル追加 | 説明文の増加＝PHASE7 監査が削った方向への逆行（`PHASE7_ENTRANCE_FIRST_IMPRESSION_AUDIT.md:22`） |

---

## §8. 推奨（最小の修正 3 件・いずれも 決定263 クローズアウト前に runtime 着手しない）

| ID | 内容 | 紐づく ID | Human QA | 着手条件 |
|---|---|---|---|---|
| **PJ-01** | OGP／description の **文言セット** を §1 の表の既存コピーから確定し CM-01 に渡す。「何分」は実測が無いので入れない。実測は PJ-02 の観察欄で取る | CM-01（P0） | 不要（CA。文言は既存コピー） | docs のみ即時可。runtime は CM-01 lane |
| **PJ-02** | Practical QA v3 に **2 戦目の観察欄** を追加：①初陣後に自力で 2 戦目を始められたか（UX-01 既出）②2 戦目で何を変えたか・その理由を自分の言葉で ③初陣 Recap に「予告」行が出たか ④1 戦の所要時間（PJ-01 用） | UX-01・RP-02・OB-01 | **必要**（これ自体が Human QA 設問） | 263 Human QA と同一セッションで取るのが最も安い（CEO 負荷 1 回） |
| **PJ-03** | 「選ぶ基準の語彙」を初見導線に 1 箇所置く：Tutorial step 2（`TutorialOverlay.tsx:75`）の「攻撃・防御・回復のカードを使えます」を、既存の 2 軸「予告に備える」「仕込んでから撃つ」の語に差し替える文言案を作る（行数・字数は E1 の枠内。おすすめ・正解は書かない）。Brief 3 行は触らない | OB-01・決定217 | **必要**（文言差し替えでも初見理解に効くため） | **263 クローズアウト後**。263 の結果で軸①の読まれ方が変わるため先行禁止 |

SECOND BATTLE の Root Cause（§7）に対する runtime 案（結果画面の事実を編成画面へ持ち越す等）は、PJ-02 の evidence が出るまで **設計しない**（HYP のまま実装しない＝UX-01 の方針に従う）。

---

## §9. 重複明記

- **決定263 Threat Shape v1（RUNNING・別 lane）：** §3 軸①「いつ備えるか」と重なる。本書は 263 の仕様・文言・表示に提案しない。PJ-03 は 263 クローズアウト後に限る
- **Daily Retention Loop Preflight lane：** §6 は観察のみ。「明日の理由」の設計・RP-06 の扱いは当該 lane に委ねる
- **E1（決定193／198）：** §2 で再提案なし。PJ-03 は Brief 3 行を触らず Tutorial step 2 のみ
- **決定262 NO-GO：** §4 で事後「解き方」行を提案しない。PJ-03 は「事前の語彙」であり事後説明ではない
- **決定260 NO-GO：** AP 曲線の変更を前提にしない
- **CM-01 Public Face Pack：** PJ-01 は文言供給のみ。favicon／og:image／version 表示は CM-01 側

---

## §10. runtime 変更 0 の証明

- 作成ファイル：`docs/PLAYER_JOURNEY_AUDIT.md` のみ（本書）
- `src/`・`public/`・`scripts/`・`index.html`・`package.json` への書き込み 0
- 実行したコマンド：Read／Grep／Glob のみ。build・vitest・browser・Playwright・simulation 実行 0（6GB RAM 制約遵守）
- 参照 worktree：`SevenGodsGame-integ`（master `641ea5c`）のみ。`SevenGodsGame`（stale）・`SevenGodsGame-d263-pilot` は未参照
- commit 0・Decision 番号追加 0
