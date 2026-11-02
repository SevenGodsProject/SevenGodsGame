# SEVEN GODS 最終開発スコープ・ロードマップ v1 — 公式敵キャラ 10 体 × キャラクターボイス → 運営報告（READ-ONLY）

> **状態（2026-11-03・AI-PM＋Planner＋Dev＋Infra・AI 判断・docs-only・read-only）：SCOPE PROPOSAL — 実装 0／runtime・assets・scripts 変更 0／音声生成 0／有料 API 呼び出し 0／push・merge・deploy 0。** 基準点：Production = master = origin/master **`10b0cd3`**（v1.0.6・決定286 LIVE）。本書は CEO 最終方針（2026-11-03「公式敵キャラの追加とキャラクターボイス実装を最終開発スコープとし、完了後は運営への成果報告へ移行」）を受けた **最終スコープとロードマップの確定案** であり、CEO の承認（§8）までは実装を開始しない。

- 前提文書：`docs/SHOGUNATE_FACTION_DESIGN_V1.md`（将軍家 設計 v1）／`docs/SHOGUNATE_NEXT_PILOT_AUDIT_V1.md` §3（9 体の評価）／`docs/SHOGUNATE_PUBLIC_ROSTER_V1_AUDIT.md`（決定287 候補・忠次 公開）／`docs/LANE3_NEXT_PLAN_V1.md`（康政 sim）／`docs/OFFICIAL_ENEMY_VOICE_AUDIT_V1.md`（**本書と同時に作成**：ボイス設計・台本・音声サービス・権利）／`docs/ROADMAP_TO_RELEASE.md` §7 DoD
- CEO 方針の制約（本書で固定）：追加ゲームモード・課金・Ranking・大型機能は **作らない**／公式 IP の権利・外部費用・Production 公開は **CEO 承認必須**／既存 dirty・untracked 保護／AI の push・merge・deploy 禁止

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **最終スコープ** | **A. 将軍家 公式 10 体（SGG Creator Kit shogunate v1.0.0）を通常の Enemy Select に並べる**（忠次は Pilot から公開・残り 9 体を新規実装）。**B. 10 体それぞれに専用ボイス 7 場面**（戦闘開始・通常攻撃・強攻撃予告・必殺技・被弾・HP 低下・撃破）を AI 音声で制作し、非公式表記で実装。**C. 以後の新機能は 0**。完了後に運営向け成果報告書を作る |
| 実装範囲の線引き（§2・AI 判断） | 敵の戦闘個性は **既存 engine 語彙（attack／multiAttack／special／charge／tactic）＋ 康政型の cond 1 種（`roundDamageAtLeast`・+12 行・sim 済み）だけ** で表現する。封じ（seal）・反撃（counter）・共鳴／託宣干渉は **作らない**（save v10・`src/core` 中心部の変更＝CEO 方針の「大型機能」に該当。既存 7 体の決定論一致と save v9 を最後まで守る） |
| 既存 7 体・Threat Pilot | CEO 生成の既存 7 体（CORE）は不変。`enemy_09`（鬼将・軍略＝非公式の派生 Pilot）は **最終スコープ外**＝`?pilot=threat` 隔離のまま残し、Production の通常導線には出さない（決定282 のまま。削除もしない＝主要機能削除は §6-3 #2） |
| Daily・49 攻略盤・seed・gameVersion | **全 wave で変更禁止**（CEO 確定 2026-11-03）。将軍家 10 体は選んで戦う敵・戦績／報酬／神階／絆は通常どおり・攻略盤は 7×7 のまま・新 storage は作らない（RL-01 方針） |
| Release 単位 | **6 wave**（§5）：W1 忠次公開 → W2 忠次ボイス Pilot → W3 岡っ引き／直政／康政 → W4 影／くノ一／鬼半蔵 → W5 忠勝／ドーマン → W6 康虎（Boss ★5）→ **最終 Release Gate** → 運営報告書。各 wave は Fast Gate 型・Human QA は wave ごと 2〜3 問 |
| 所要（目安・CEO QA の間隔に依存） | W1 1 週／W2 1〜1.5 週／W3〜W5 各 1.5〜2 週／W6 1 週／最終 Gate＋報告書 1.5 週 ＝ **約 9〜11 週** |
| 外部費用（§4） | 音声生成のみ。70 本（10 体 × 7）＋予備で **概算 数百円〜数千円規模**（サービスにより 0 円）。詳細・推奨は `OFFICIAL_ENEMY_VOICE_AUDIT_V1.md` §6。画像は Kit 公式（0 円）・舞台背景は既存の非生成派生（0 円） |
| **CEO 判断（§8）** | 4 件を **1 回の返答**で：①最終スコープ（上記の線引き）承認 ②音声生成サービスと予算上限 ③W1 忠次公開 v1 の実装開始 ④運営報告書の提出形式（docs＋共有ページ） |

---

## 1. 公式敵キャラ一覧と既存実装の照合

出典：`docs/assets-kit/shogunate-manifest.json`（公式 manifest の無改変コピー・`kitVersion 1.0.0`・`releasedAt 2026-10-08`・10 体／16 枚）。2026-11-03 に公式サイトの manifest・RIGHTS.md を再取得し、**内容の差分なし**（RIGHTS.md Updated 2026-10-08・§5 本文一致・manifest のフィールドは id／nameJa／nameEn／role／profile／model3d／assets のみ＝**公式の台詞・口調・声優名・音声は 10 体とも存在しない**）。

| # | id | 公式名 | 公式 role | 公式 profile（原文） | 2D | Production（`10b0cd3`） | 本スコープ |
|---|---|---|---|---|---|---|---|
| 1 | yasutora | 康虎 | 17代将軍 | 穢土を治める17代将軍。側室や側近以外には姿を見せない独裁者。 | FRONT＋BACK | 未実装 | **W6**（Boss ★5） |
| 2 | tadakatsu | 忠勝 | 将軍四天王 | 四天王最強の軍神。槍・蜻蛉切を振るい、将軍を守る最後の盾となる。 | FRONT＋BACK | 未実装 | **W5** |
| 3 | naomasa | 直政 | 将軍四天王 | 四天王で最も好戦的。直情的で、忠勝に対抗心を燃やす。 | FRONT＋BACK | 未実装 | **W3** |
| 4 | tadatsugu | 忠次 | 将軍四天王 | 四天王で最も軍略に優れた軍師。勇猛さと知恵を兼ね備える。 | FRONT＋BACK | **実装済み（enemy_08・`?pilot=shogunate` 隔離・v0.6）** | **W1 公開・W2 ボイス** |
| 5 | yasumasa | 康政 | 将軍四天王 | 四天王で最も文化人の面を持つ。兵を率いさせれば随一の指揮官。 | FRONT＋BACK | 未実装（設計・sim 済み） | **W3** |
| 6 | onihanzo | 鬼半蔵 | 影の頭領 | 忍者衆「影」を率いる頭領。代々将軍家に仕え、鬼嶽一族の血を引く。 | FRONT＋BACK | 未実装 | **W4** |
| 7 | kage | 影 | 影（忍者衆） | 将軍家に仕える忍者衆。諜報と暗殺を担う。 | MAIN（非透過） | 未実装 | **W4** |
| 8 | kunoichi | くノ一 | 影（忍者衆） | 忍者衆「影」に属する女忍。 | MAIN（非透過） | 未実装 | **W4** |
| 9 | doman | ドーマン | 科学者 | 元・陰陽寮の天才科学者・道曼。将軍に「逆さ五重塔」を献じた。 | FRONT | 未実装 | **W5** |
| 10 | okappiki | 岡っ引き | 捕り方 | 穢土の町を取り締まる将軍家の捕り方。 | MAIN（非透過） | 未実装 | **W3** |

- 既存 Production の敵：CEO 生成 7 体（`CORE_ENEMIES`・試練の影／業斧の鬼将／藍花の怨霊／銀甲の機工師／双牙の魔獣／蒼海の龍神／乱舞の道化）＋ Threat Pilot `enemy_09`（鬼将の派生・隔離）＋ 将軍家 Pilot `enemy_08` 忠次（隔離）。**公式キャラは 忠次 1 体のみ・それも通常導線には未公開**
- 忠次の現行データ（HP 98・★3・actions 7・台詞 7・art／stage・軍略 then 12／else 24）は AI 設計＋CEO Human QA 済み。台詞 7 本と二つ名は **AI 仮文**（CEO 2026-11-03「暫定維持」）
- 既存の「公式ボイス」は 7 神の 28 本（greeting／crisis／fatigue／success）のみ。本作は 大耀 greeting・crisis の 2 本を配信中。**将軍家の公式ボイスは無い** → 本スコープのボイスはすべて **自作（AI 生成）・非公式表記**（規約 §5）

---

## 2. 未実装 9 体の実装範囲（AI 判断・CEO 承認対象）

### 2-1. 採用する語彙と採用しない語彙

| 語彙 | engine | 判定 | 理由 |
|---|---|---|---|
| attack／multiAttack／special（技名付き）／charge（予告） | 既存 | **採用** | 既存 7 体と同じ。save・指紋・決定論に影響 0 |
| tactic `enemyHpRatioAtMost`（忠次型） | 既存 | **採用** | v0.4〜v0.6 で Gate 済み。then／else の中身を変えるだけで「分岐の形」の違いを作れる（直政・鬼半蔵・康虎） |
| tactic `roundDamageAtLeast`（康政型） | **+12 行**（`types/enemy.ts` cond union・`tactic.ts` ctx・`round.ts` 1 行・`rules.ts` ratio） | **採用（唯一の engine 拡張）** | `LANE3_NEXT_PLAN_V1.md` §3／§7-2 で決定論 sim 済み（normal 0.25／hard 0.20・支配戦略でない）。既存 7 体・忠次の挙動は不変（cond 種別が増えるだけ） |
| seal（手札封じ）・counter（反撃）・共鳴／託宣干渉 | M〜L（新 state → **save v10**・`playCard`／`runEnemyTurn`／共鳴ゲージ） | **不採用** | CEO 方針「大型機能開発は行わない」。save v9・RL-01・gameVersion 不変を最後まで守る。忠勝は「盾」を **charge→special の重さと高 HP** で、影／くノ一は **連撃と先読み（tactic）** で、ドーマンは **共鳴ゲージを条件に取る tactic 変種（engine 0・cond を `resonanceAtLeast` にする場合は +6 行）** で表現する |
| rank 5（Boss） | `enemies.test.ts:50-54` の「rank 1〜4」を「通常 ≤4・康虎のみ 5」へ更新（test のみ・表示専用） | **採用（W6）** | ★5 は Boss 予約として v1.0.1 から空けてある。Daily・盤は CORE 固定なので除外処理は不要 |

### 2-2. 9 体の戦闘個性（確定案・数値は各 wave の Preflight sim で調整）

既存 7 体＋忠次との **判断の型の重複を避ける** ことを第一に置く（設計 v1 §3・次期 Pilot 監査 §3-3 を本スコープの語彙制限で再構成）。★は **実測で付ける**（決定281・`enemyStar.audit.ts`）＝下表は帯の目安。

| wave | 敵 | 判断の型（プレイヤーに生まれる問い） | 行動表の骨子（7R） | ★目安 | engine |
|---|---|---|---|---|---|
| W3 | 岡っ引き | **入門**：予告どおり殴る。数で押す「群れ」感＝multiAttack 小刻み | attack 4／multi 2×3／attack 6／multi 2×4／attack 8／multi 3×3／attack 10 | ★1 | 0 |
| W3 | 直政 | **「追い込むと怒る」**＝忠次の逆：R4 tactic の then（追い込めた）が **連撃**・else が **重撃**。「削りすぎると手数が増える」ので R3 の削り方を考える | attack 6／attack 10／charge「⚠ 傷が深ければ猛る」／tactic then multi 5×3 else special 22「猛り・一文字」／attack 12／attack 9／attack 7 | ★3 | 0 |
| W3 | 康政 | **「狙った 1 ラウンドで崩せたか」**（`roundDamageAtLeast`）：R3 の 1 ラウンド実効ダメージが HP×ratio 以上なら采配が崩れる（then 軽い手）・届かなければ総攻め | 設計 §2-③（LANE3 計画）：5／8／溜め／tactic（roundDamage ≥ 0.25 normal・0.20 hard）then 10 else special 26「采配・総攻め」／14／10／6 | ★3〜4 | **+12 行** |
| W4 | くノ一 | **速い連撃と軽い予告**＝手数で削る。ブロックの価値を教える入門〜中位 | multi 2×2／multi 3×2／attack 7／multi 3×3／charge／special 18「影走り」／multi 4×2 | ★2 | 0 |
| W4 | 影 | **「次が読めない」を tactic で表現**：R2・R5 に tactic（HP 比で multi／special を切替）＝2 回の読み | attack 5／tactic then multi 3×3 else attack 11／attack 8／charge／tactic then attack 9 else special 20「闇討ち」／attack 10／attack 8 | ★3 | 0 |
| W4 | 鬼半蔵 | **影の頭領**：影の 2 段 tactic ＋ 高 HP。「R3 まで」ではなく「R5 まで」の長い読み | HP 110 帯／attack 6／multi 3×3／charge／tactic then multi 4×3 else special 24「鬼嶽・血風」／attack 12／charge／special 26 | ★4 | 0 |
| W5 | 忠勝 | **「最後の盾」＝固く重い**：高 HP・単発重撃中心・R4／R7 の特大。守りは「受けるか削り切るか」の問いで表現（敵ブロックは作らない） | HP 120 帯／attack 8／attack 10／charge「⚠ 蜻蛉切」／special 26「蜻蛉切・一閃」／attack 12／charge／special 30 | ★4 | 0 |
| W5 | ドーマン | **「共鳴を溜めるほど危ない」**：tactic の cond を共鳴ゲージに取る（`resonanceAtLeast`・+6 行 or `enemyHpRatioAtMost` で代替）→ 共鳴を早めに撃つか温存するかの問い（決定217 の報酬問題は **干渉しない**＝ゲージを読むだけで、触らない） | attack 5／attack 7／charge「⚠ 五重塔が共鳴に反応」／tactic then attack 9 else special 24「逆さ五重塔」／attack 10／charge／tactic 同型 | ★3〜4 | 0〜+6 行 |
| W6 | 康虎 | **最終 Boss**：全語彙の複合・HP 最大・R3／R6 の 2 段 tactic・必殺 2 種。Daily・盤には出ない（CORE 固定） | HP 140 帯／attack 8／multi 4×3／charge／tactic then multi 5×3 else special 30「将軍の威」／attack 14／charge／special 34「穢土の裁き」 | **★5** | 0（test 更新） |

- HP・amount はすべて **仮値**。各 wave の Preflight で「hard × 全神 ≥50%（決定58）」「既存 7 体 決定論一致」「then 率 35〜65%（分岐が生きる帯）」を sim で満たしてから Gate へ
- 舞台背景：新規生成はしない。既存 CEO 生成 7 枚＋STG-08（忠次・派生）から **非生成加工（色相・明度・反転）で陣営 4 面**（本陣／影の里／逆さ五重塔／将軍の御殿）を派生し、台帳に派生元を記録（STG-08 と同じ運用）。CEO が新規生成を望む場合のみ費用判断
- 立ち絵：FRONT 7 体は Kit 原本 1600²（透過）→ 余白トリム → 768² webp（忠次と同手順・AI 非生成加工）。**MAIN 3 体（影・くノ一・岡っ引き）は非透過のイラスト** → 透過切り抜きが要る。方針：(a) 非生成の切り抜き（手作業／しきい値マスク）で立ち絵化、(b) 切り抜かず「額装（枠付き）」演出で出す。**本書は (a) を推奨**し、切り抜き結果の CEO 目視を W4 Human QA に含める。生成 AI での再描画は Kit 画像を改変する行為として台帳・規約上は可（§2）だが **公式絵の同一性を損なうので行わない**

### 2-3. 共通の密結合（全 wave で同じ扱い＝決定287 監査 §4 を踏襲）

- `SHOGUNATE_ENEMIES` に追加（`CORE_ENEMIES` は 1 文字も変えない・`coreRoster.test.ts` sha256）。`ENEMIES` は CORE 7 ＋ Threat Pilot ＋ 将軍家 N
- `isPilotEnemyId` は Threat Pilot（enemy_09）だけに真（W1 で分離）。将軍家は戦績・セーブ・報酬・神階・絆・同じ盤面 Retry が通常どおり
- Daily／49 盤／`pickEnemyId`／gameVersion は CORE のみ（`shogunateRoster.test.ts` §CORE・seed・Daily・盤・gameVersion を全 wave の Gate 中核に）
- Enemy Select：W3 で 11 体になった時点で **「七柱の試練（既存 7）／将軍家（公式）」の 2 段見出し**（表示のみ・新 CSS 数行）を入れる。SP375 の段組・スクロールは受入で計測
- Credits：W1 で「将軍家（忠次）の画像」、W2 以降で「将軍家の音声は本作が AI 音声サービスで制作した非公式のもの」を素材行に追記（規約 §4・§5。「公式」「公認」の語は使わない）
- 権利台帳：敵 1 体につき `ENEMY-KIT-xx`（立ち絵）＋`STG-xx`（舞台派生）＋`VOICE-AI-xx`（音声 7 本まとめて 1 行＋sha256 一覧）。**配置前に記入**（§1-4）

---

## 3. 敵キャラごとの戦闘個性と専用ボイス（要約・詳細は `OFFICIAL_ENEMY_VOICE_AUDIT_V1.md`）

- 7 場面の発火点は既存 engine イベントと時刻表だけで決まる（新 timer 0）：戦闘開始＝入口完了（greeting と同じ・神の greeting が鳴る神では **敵は 1.2 秒以内の短い一声**に限定）／通常攻撃・必殺＝`ENEMY_ACTED`（突進開始・着弾前）／強攻撃予告＝`ENEMY_INTENT_SET` kind charge（`enemy_charge` SE と同時）／被弾＝カード着弾 tier≥3 or 神の一撃着弾（hit stop 後）／HP 低下＝Enemy Break half 到達（`BREAK_SE` と同時・1 戦 1 回）／撃破＝最終着弾＋`FINAL_HIT_STOP_MS` 90（崩壊 520ms の中・`victory_sting` F+640 より前に **≤0.6 秒**で収める）
- 競合規則：**神の声が常に勝つ**（敵ボイスの優先度は greeting と同じ 1・crisis 2 が来れば敵は fade 80ms で止まる）／敵ボイス同士は後勝ち／1 バッチに 1 本／late drop 600ms／SE より小さい実効 0.6 前後（`VOICE_LAYER` に `enemyGain` を追加）／BGM duck は必殺と撃破だけ（既存 duck 経路・新経路 0）
- 台本：全 70 本（10 体 × 7）を **非公式のファン創作** として起草。公式 profile の 1 行だけが公式設定で、口調・二つ名・技名・台詞はすべて AI 仮文（§5 の区別表示を台帳と Credits に残す）
- 声質・演技：キャラごとに「年齢感・声域・テンポ・感情」を 1 行で指示。**7 神の公式音声を参照入力・学習・声質模倣に使わない**（声優名は公式に非公開＝「誰」を避けるのではなく「公式音声ファイルを一切入力しない」で担保）

---

## 4. 音声生成・利用権・費用（要約）

- 規約：Kit RIGHTS.md §5（2026-11-03 公式サイト再取得・差分なし）「自分で声を作って使うのも自由（AI で作る…）。公式の声がない OTOMO や将軍家のキャラクターも同じ」「公式・公式ボイス・公認と思わせる言葉を書かない」。§7「第三者が権利を持つ音声…は対象外＝制作者が許可を取る」→ **音声サービス側の商用利用権と出力の帰属** が本件の権利の中心
- サービス比較・費用・推奨：`OFFICIAL_ENEMY_VOICE_AUDIT_V1.md` §6（Web 一次情報・取得日付き）。**音声生成の実行・有料 API の利用・素材の正式採用は CEO 承認後**（§6-3 #5／#6）
- 台帳：`VOICE-AI-xx` 行に Service／Plan／Terms version・date／Commercial use／Output ownership／Voice source（プリセット or テキストからの Voice Design＝実在人物のクローン無し）／sha256 を記録。C2PA 等の来歴は mp3 に残らないため **生成ログ（要求本文・日時・応答 id）を `audio-source/voice-ai/<enemy>/ledger.json` に保存**

---

## 5. 段階的な実装・テスト・Human QA（wave 計画）

| wave | 内容 | runtime 範囲 | Gate（自動・直列） | Human QA（CEO） | Release |
|---|---|---|---|---|---|
| **W1** | 忠次 公開 v1（決定287） | 判定関数・Enemy Select・pilotFlag・Credits・rank（★実測） | 決定287 監査 §9 G1〜G8＋CEO 指定 4 Gate（攻略体験の差別化・★実測・hard W1・Human QA） | 2 問 | v1.0.7 |
| **W2** | 忠次 ボイス Pilot（7 本） | `enemyVoice.ts`（新規・表示層）・`sound.ts` enemy scene・`feelTier.ts` enemyGain・`EnemyPanel`／`BattleScreen` 配線 ≤10 行・mp3 7 本・台帳 1 行 | 配信＝登録一致／sha256／競合（crisis 優先）／1 バッチ 1 本／late drop／ミュート即停止／SE 22 不変／a11y 69／受入（PC／SP × ミュート） | 3 問（声が合うか・邪魔しないか・iPhone サイレント／復帰／ミュート） | v1.0.8 |
| **W3** | 岡っ引き・直政・康政（＋各 7 本） | `SHOGUNATE_ENEMIES` +3・康政 +12 行・Enemy Select 2 段見出し・舞台派生 2 面・立ち絵 3（MAIN 1） | W1 Gate ＋ Preflight sim（決定58／then 率／決定論）＋ ★監査 再実行 ＋ 旧セーブ 44 | 3 戦・各 1 問＋切り抜き目視 | v1.1.0 |
| **W4** | 影・くノ一・鬼半蔵（＋各 7 本） | +3（engine 0）・MAIN 2 切り抜き・舞台 1 面 | 同上 | 3 戦 | v1.1.1 |
| **W5** | 忠勝・ドーマン（＋各 7 本） | +2（ドーマン cond 0〜+6 行）・舞台 1 面 | 同上 | 2 戦 | v1.1.2 |
| **W6** | 康虎 Boss ★5（＋7 本） | +1・`enemies.test.ts` rank 更新・★5 表示（既存 5 個固定の星 UI がそのまま使える） | 同上＋Boss の hard 勝率 ≥50% | 1 戦（normal／hard） | v1.1.3 |
| **最終** | 最終 Production Release Gate（§6）→ 運営報告書（§7） | 0 | DoD 18 項目の再点検・Known 凍結・台帳全行 Status | 通し 1 周（7 神 × 任意の将軍家 1 体） | tag v1.1.x（CEO） |

- 各 wave は **branch 1 本・worktree 1 本・Lane 間の同一ファイル編集禁止**（voice の表示層ファイルと敵データファイルを分ける＝W2 と W3 の準備は並走可）
- 毎 wave 必須：`npm run lint`（決定286 教訓）・CORE sha256・cf2 決定論 8/8・旧セーブ 44/44・a11y 69・`enemyStar.audit.ts` 再実行（新敵の ★ を実測で付ける）
- Human QA の問いは wave ごとに固定 2〜3 問・YES／NO。NO は文言・数値のみ 1 回調整して再 QA（仕組みは変えない）

---

## 6. 最終 Production Release Gate（W6 の後・1 回）

1. `docs/ROADMAP_TO_RELEASE.md` §7 DoD 18 項目を **再点検**（A〜E）。特に #7 台帳全行 Status（将軍家 10 体 × 立ち絵・舞台・音声）／#10 RELEASE_STATUS 正本一致／#11 **Rollback 演習 1 回（未実施・CEO のみ Promote 可）**／#17 Voice の CEO GO 記録
2. 生存 Known の凍結（K01〜K39 ＋ v1.0.x〜v1.1.x で増えた分）
3. 最終 Smoke：7 神 × 将軍家 10 体の決定論 probe（normal／hard）・旧セーブ・a11y・console error 0・外部通信 0
4. CEO：tag `v1.1.x`（任意）・公開宣言・SGG 運営への **任意の事前連絡**（規約 §8「公式企画と誤認される可能性がある場合は相談」。本作は非公式表記を徹底するため必須ではないが、運営報告と同時に 1 通送ることを推奨）

---

## 7. 運営向け成果報告書（最終工程・構成案と根拠の所在）

成果物：`docs/OPERATIONS_REPORT_V1.md`（正本・docs）＋ CEO が運営へ渡す **共有ページ 1 枚**（同内容・画像付き。作成は最終 Gate 後・公開範囲は CEO）。

| 章 | 内容 | 根拠の所在（既に repo にあるもの） |
|---|---|---|
| 1 ゲーム概要・コンセプト | 7 柱の神 × OTOMO × 共鳴カードバトル・7R スコアアタック・神階・Daily | `docs/DECISIONS.md` 決定1〜・`README.md`・`SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md` |
| 2 開発成果と実装機能 | v1.0.0（2026-10-10）〜 v1.1.x の Release 一覧・主要機能（決定番号）・テスト 1,658＋・CI | `RELEASE_STATUS.md` §A-00〜A-0b・§A-2 |
| 3 公式敵キャラ・ボイス対応状況 | 将軍家 10 体の実装状況・各 7 本のボイス・非公式表記・台帳 | 本書 §1〜§4・`ASSET_RIGHTS_LEDGER.md` |
| 4 ゲーム画面・プレイ URL | https://seven-gods-game.vercel.app/ ・Home／Enemy Select／戦闘／結果の画像 | `docs/evidence/*/` の webp（Smoke S8 ほか）・最終 Gate で撮り直し |
| 5 QA・品質監査結果 | Release Gate／Smoke の PASS 一覧・Human QA 回数・a11y・perf・Known | 各 `V1_0_x_PRODUCTION_SMOKE.md`・`V1_0_6_INTEGRATION_GATE.md`・§A-4 |
| 6 開発で工夫した点 | 決定論 engine（seed・replay）・AI チーム運営（§6 自律判断・Decision Log 375 行）・Release Protection・Pilot 隔離（`?pilot=`）・Kit 素材の無改変運用 | `DECISIONS.md`・`RELEASE_PROTECTION_V1.md`・`CLAUDE.md` |
| 7 現時点の制約・未解決課題 | Ranking 休眠・Daily spread・K01 等・将軍家の攻略盤外・AI 仮台詞の監修余地・hard W1 | `RELEASE_STATUS.md` §A-4・本書 §2 |
| 8 今後の運営に向けた引き継ぎ | 公開経路（CEO push→PR→CI→merge→Vercel）・Rollback・台帳・規約の確認日・Kit 更新時の手順・環境（6 GB 機・worktree） | `RELEASE_PROTECTION_V1.md`・`RELEASE_STATUS.md` §A-5・memory |

---

## 8. CEO 判断（4 件・§6-4 形式・1 回の返答で）

```
【CEO DECISION REQUIRED】
Issue：SEVEN GODS 最終開発スコープ・ロードマップ v1 の確定（本書 §0〜§7）
AI Recommendation：承認。
  ①最終スコープ＝将軍家 公式 10 体の roster 化（既存語彙＋康政型 cond 1 種のみ・seal／counter／共鳴干渉は作らない・
    enemy_09 は隔離のまま・Daily／49 盤／seed／gameVersion 不変・新 storage 0）＋ 10 体 × 7 場面の AI ボイス（非公式表記）
  ②音声生成サービスと予算上限＝ OFFICIAL_ENEMY_VOICE_AUDIT_V1.md §6 の推奨（CEO が別案を選ぶ場合はその旨）
  ③W1「忠次 公開 v1」（決定287）の実装開始
  ④運営報告書の形式＝ docs 正本 ＋ 共有ページ 1 枚（最終 Gate 後に作成）
Reason：公式 10 体を「同じ判断の型を繰り返さない」形で、save v9・既存 7 体の決定論・指紋を最後まで守って出せる最小の線引き。
  ボイスは既存 voice チャネル・duck・ミュート経路の流用で新経路 0。外部費用は音声のみで小さい
Alternatives：seal／counter／共鳴干渉を実装して語彙を増やす（save v10・core 中心変更＝大型・却下）／
  10 体を一括 Release（Human QA 10 戦同時・切り分け不能・却下）／ボイス無しで敵だけ先に全部出す（CEO 方針に反する・却下）／
  公式 7 神ボイス 28 本の全展開を同時に行う（スコープ外・報告書の「引き継ぎ」に記載）
Risk：MAIN 3 体の非透過イラストの切り抜き品質／★実測で「四天王なのに ★2」等の違和感／AI 音声の声質が CEO 想定と合わない（Pilot で確認）／
  iOS サイレント・復帰での敵ボイス（W2 Human QA）／CEO QA の間隔で所要が伸びる
Impact if delayed：全 wave が止まる。v1.0.6 のまま運営報告に移る場合は「公式キャラ 1 体・未公開」の報告になる
CEO Action：①〜④ 各 承認 / 拒否（②はサービス名と上限額）
```

---

## 9. 本書で変更していないもの

- `src/`・`public/`・`scripts/`・`package.json`・`audio-source/`・`art-source/`：変更 0。音声生成・有料 API 呼び出し・Kit からのダウンロード：0
- 既存 dirty／untracked：保護（触れていない）
- Ranking・Neon・secrets：対象外
- `docs/DECISIONS.md`：決定288（候補）の **スコープ提案行のみ** 追記（CEO 承認後に「確定」へ更新）
