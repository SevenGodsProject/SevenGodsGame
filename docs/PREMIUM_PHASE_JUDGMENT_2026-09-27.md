# Premium Phase Judgment（2026-09-27）— code／CSS 中心の Premium 改善を閉じて asset 品質へ移るか

- 日付：2026-09-27
- 種別：**AUDIT ONLY／docs-only**（runtime／tests／assets／branch／worktree／commit／push／deploy：すべて 0。有料の画像・音声生成 0・外部 API 呼び出し 0・公式素材のアップロード 0。Production `01b66f4` 不変）
- 判断主体：AI チーム（CLAUDE.md §6-2「複数案からの推奨案選定」「実装順序」）。実装 GO・asset 生成・Production 公開は CEO
- 問い：**決定224〜241（code／CSS 中心の Premium 改善・全件出荷済み）をここで閉じ、開発を asset 品質改善へ移すべきか。NEXT NOW を 1 件だけ決める**
- 基準：`DECISION225_BATTLE_SCREEN_PREMIUM_QUALITY_AUDIT.md`（A〜P 16 層・「Web ゲームに見せる 3 要因」・G1〜G14）、`PREMIUM_REAUDIT_2026-09-27.md`（決定239 時点の残余と §3 候補）、`SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md`（North Star＝敵の意図を読み攻略の答えを見つける／P3 One Change／P12 One Canon／P15 台帳）
- 対象 build：`C:/Users/kimi1/SevenGodsGame-d240-rc`（HEAD `01b66f4`＝Production）。**rebuild せず**既存 `dist` を `vite preview --host 127.0.0.1 --port 4391` で配信（配信 bundle `index-DI4DksbZ.js`／`index-C_PvVv3w.css`＝決定240 の Production 記録と一致）→ 撮影後に停止（LISTEN 0 を確認）
- 計測：Playwright（Chromium・DPR 1・音なし）で PC 1508×660／SP 390×844 の 大耀 × 蒼海の龍神（`?seed=ppj-2026-09-27`・ASCII）を各 1 戦（17 手・勝利・console error 0・PC 65s／SP 51s）。calm／重い一撃／神の一撃／R4 末／敵ターン／勝利の舞台／結果／ホーム＋立ち絵の切り抜きを撮影（26 枚）、立ち絵の箱・filter・背景・床要素の有無を JSON に採取。asset は `sharp` で全ファイルの寸法・形式・容量を棚卸し。証拠：`scripts/premium-phase-judgment/out/`（`pc-*.png`・`sp-*.png`・`*-log.json`・`inventory.json`）、スクリプト `inventory.mjs`・`shots.mjs`
- 表記：【実測】＝本監査の計測、【docs】＝既存 Decision／監査の記録、【推測】＝根拠の弱い見込み

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| **判定** | **(c) ハイブリッド**。ただし重心は明確に asset 側：**code／CSS の「Premium Pilot」（CEO Human QA を要する演出・材質の Decision）はここで閉じる**。code 側に残すのは「Fast Gate・Human QA 省略可」型の欠陥修正だけ（§4-3 の Hotfix 待機列）で、これは *phase* ではなく *保守*。CEO の Human QA 時間は asset 側へ回す |
| なぜ (a) ではなく (c) か | 欠陥修正（G14 無効カードの二重減光・進化バナーの神への重なり等）は 1〜2 CSS 規則・Human QA 不要で、asset 制作の待ち時間に AI 側だけで出せる。これを「phase 継続」と呼ばない限り、(a) と (c) の差は運用上ほぼ無い |
| なぜ (b) ではないか | 決定225 が挙げた「Web ゲームに見せる 3 要因」のうち ①HUD ガラス板・②L1 が押したら数字 は決定226〜241 で解消し、**残る ③「4 画風・接地なし」は 18 決定が 1 つも触れていない asset 領域**（§1）。再監査 §3 の code-only 残余（§4-1）は「欠陥修正・小部品・高回帰面」のいずれかで、決定240 級の体感（常時 100%・North Star 直結）を持つものは**もう無い** |
| **NEXT NOW（1 件）** | **Asset Pipeline Pilot＝Lane3 After-2『豪快な一撃』新原画**（CEO 承認済み・Image Brief と機械受入 `accept-art.mjs` と配置手順が用意済み・runtime 変更は `cardArt.ts` 1 行＋新 WebP 1 枚）。**CEO 作業：Brief どおりに原画 1 枚を、カード 60 枚・背景 7 枚を作ったのと同じ既存手段で生成して master PNG を渡す**（新規課金・API 課金なし。必要になる場合は事前承認）。AI：受入検査 → 640×960 WebP 書き出し → 登録 → 3 環境 Human QA → Release Gate → Rights Ledger 1 行 |
| なぜこれか | ① asset 4 候補の中で**唯一、設計・受入・実装・QA 計画がすべて完成していて、残りが「画像 1 枚」だけ**（リードタイム最短）② 生成物が **Kit 公式の意匠（大耀）に忠実になれるか**を 1 枚で試せる＝最大の asset 課題「敵 7 体の画風統一」（§3 #1）が同じ手段で成立するかの **前提実験**（Human QA Q3「舞台の神と同一人物に見えるか」がそのまま答えになる）③ 権利面の新規判断が **0**（Kit 素材の参照入力は Guidelines §2 で許可済み・CEO の既存手段・課金なし）で、P15 の台帳記入（Source／Creator／Terms／Evidence）を**初めて完全な形で 1 行作る**練習になる ④ READY Pilot の唯一のカードで、大耀の推奨デッキに入る＝大耀の毎戦で手札に来る |
| 並行して AI 側だけで進めるもの（NEXT NOW ではない） | (i) docs：**Enemy Art Direction Brief v1**（敵 7 体の画風統一の依頼書・受入指標・identity 台帳。After-2 が PASS したら即着手できる状態にする）(ii) docs：`docs/ASSET_RIGHTS_LEDGER.md` 雛形（backgrounds／fx が **未記録 ✗**・cards／enemies △。§2-5）(iii) code：Hotfix 待機列（§4-3。Human QA 省略可のみ） |
| Human QA | After-2：**要**（3 環境 Before／After-1／After-2・6 問・`LANE3_CARD_PREMIUM_V2_PRE_AUDIT.md` §10-4）。SP 実機＋PC |
| CEO 判断（§6-3） | **新規の承認事項は 0**。既存の確認事項 2 つが残る：(A) 生成サービスの利用規約（商用可否・参照画像の入力・生成物の権利）の確認（§6-3 #5・AI 推奨＝カードで使った既存サービスをそのまま使い、規約版と日付を台帳に記録）(B) 有料プラン／課金が必要になった場合のみ事前承認（§6-3 #4・AI 推奨＝現時点で追加課金は提案しない）。§6 参照 |

---

## 1. 決定224〜241 の総括 — 何が code で解決し、何が asset に残ったか

### 1-1. 決定225「Web ゲームに見せる 3 要因」の現在地

| 要因（決定225 §0） | 出荷した決定 | 現在地（本監査の実画面【実測】） | 残余 | 領域 |
|---|---|---|---|---|
| ① HUD が「ガラス板のパネル」（system-ui・絵文字・pill） | 228／230（SP 列）・234（ドック）・235（名札・ゲージ）・240（予告の絵文字→SVG）・241（トースト位置） | 名札 3 枚・HP 2 本・共鳴・ドックが漆黒＋金の「札」。名札内 pill 0・絵文字 0（`pc-01-calm`） | 上部バーの神力 pill・共鳴札下の予告帯・トースト pill 材質・進化／神の一撃バナーの絵文字（0.4〜1 回／戦） | **code（小部品）** |
| ② 通常プレイ L1 が「押したら数字」 | 232（hit weight）・233（0ms 押下音）・237（閃光の黒板）・239（カードが神へ飛ぶ） | 「タップ音 0ms → 札が神の胸元へ → 神が突く → 敵が 30ms 止まり 4px 退く」の一続き | 中央閃光の座標（12 回／戦）・文章の三重表示（決定203／205 の文言は保護） | **code（中〜高回帰面）** |
| ③ キャラ層が 4 系統の画風・接地なし | **229（SP の大きさ・向きのみ）** | 神＝Kit 線画セル（白フチ）、敵＝ドット復元系 4 体＋厚塗り生成系 3 体、OTOMO＝Kit 光沢スプライト 51〜86px、背景＝厚塗り風景。**接地影・床要素 0**（`floorEl:false`・drop-shadow のみ）。神は原画の雲に座り、龍神は原画の水しぶきに乗る＝**足元が絵の中に焼き込まれていて、共通の地面に立っていない**（`pc-01-calm-*-stage.png`） | 画風の不一致・接地・光源の不一致・ポーズ 1 枚 | **asset** |

TOP TARGET だった G1「撃破 → 勝利」は 226 で解消（Human QA 5/5）。G5 SP プレートは 228／230、G9 トーストは 241、G13〜G14 は未。

### 1-2. 出荷 18 決定の内訳（体感の大きさ順・AI 評価）

| 決定 | 層 | 体感（頻度×面積×時間） | 種別 |
|---|---|---|---|
| 226 勝利の舞台 | M | 1 回／戦・全画面・1.6s（最も共有される 10 秒） | 新しく良くなる |
| 229 SP 舞台レイヤー分離＋敵反転 | A・C・D | 常時・SP のキャラ面積 ×1.7〜1.8・向き合い 48/48 | 新しく良くなる |
| 240 予告を敵の構えへ | F・D | 常時・危険予告 28/49 行動（57%） | 新しく良くなる（North Star 直結） |
| 232／233／239 通常プレイの一続き | H・I・O | 12〜17 手／戦 | 新しく良くなる |
| 235／234 名札・ゲージ・ドック材質 | G | 常時・HUD 全体 | 新しく良くなる（第一印象） |
| 224 READY／⚡PAYOFF | B・J | 3〜5 回／戦 | 新しく良くなる |
| 236 Art Window（1 枚） | B | 大耀の手札 1 枚 | 新しく良くなる（After-2 の前段） |
| 228／230／231／237／238／241 | K・B・H・G | 欠陥の解消（SP の潰れ・珠・黒板・はみ出し・重なり） | 元に戻る |

→ 「新しく良くなる」型の大物は **226・229・240** で、いずれも「1 戦に必ず来る／常時見える／解くに直結」の 3 条件を満たしていた。**code-only でこの 3 条件を満たす未着手の層は残っていない**（§4-1）。

### 1-3. 実画面で今いちばん目立つもの（fresh eyes・`pc-01-calm`／`sp-01-calm`）

1. **舞台だけが「貼り付け」に見える**。HUD・手札・ドックは 1 つの材質言語（漆黒＋金）にまとまったので、相対的に「3 体のキャラ＋厚塗り背景」の層が浮く。神の白フチ＋雲、龍神の焼き込まれた水しぶき、OTOMO の光沢、の 3 つが同じ石畳の上に別々の高さで置かれている
2. 汎用の 4 色 blob（`.battle-arena-glow`：緑・紫・金・桃）が龍神の背後に桃色として見え、ステージ（藍）と無関係な光になっている（決定225 W12）。`BattleScreen` が敵ごとに注入している `--stage-accent` は **battle.css で未使用**【実測：`battle.css:3330` のコメント】
3. PC 1508×660 ではキャラが 167〜195px（アリーナ高 327px の 51〜60%）で、決定229 の恩恵は SP のみ。PC の拡大は HUD の縦圧縮と別設計（決定229 §7 案 D・未着手）
4. 神の一撃・勝利の舞台・結果は商用寄り（決定225 PC-7・226）。ここは「もう伸びしろが小さい」

---

## 2. asset 現状棚卸し（種類・数・画風系統・解像度・権利）【実測：`inventory.json`】

### 2-1. 一覧

| 種類 | 数 | 配信で使う形 | 原本 | 画風系統 | 誰が／どう作ったか | 権利（台帳の追跡可能性・`SEVENGODS_47_LESSONS_CONSOLIDATION_AUDIT.md` §21-b） |
|---|---|---|---|---|---|---|
| 神 | 7 柱 × 8 ファイル＝55 | 戦闘 `front_640.webp`（640²・alpha）／カットイン・勝利・Home `keyvisual*.webp`（675×900〜1086×1448・alpha なし）／`main.webp` 1600² | Kit 公式 `GOD_MAIN/FRONT/BACK` 1600²（`art-source/reference/gods/` に keyvisual 原本 PNG 7 枚） | **A. Kit 線画セル**（白フチ・左上単光源・2.5 頭身・座り／立ちポーズ 1 枚） | SGG Creator Kit v1（manifest sha256 付き）。keyvisual は「Kit 派生と推定・生成記録なし」 | ◎（main/front/back）／△（keyvisual：Creator 未記録） |
| 敵 | 7 体 × 2〜3 ファイル＝16 | `art_hq.webp`（oni・juuma・ryujin 768²／onryo 576×768）／`art.webp`（datenshi・doukeshi・karakuri 768²） | oni／juuma／ryujin／onryo は旧ドット系 `art.png`（384×512／512²）から**非生成の修復**（白マット除去＋2 段拡大・決定177〜183・CEO 実機 QA 済み）。datenshi／karakuri／doukeshi は生成原本 1065〜1254px（決定174 Batch A・Lanczos 縮小のみ） | **B. ドット復元系 4 体**（等倍で 4px 単位のドット・自前の水しぶき等が焼き込み）／**C. 厚塗り生成系 3 体** | CEO 生成（サービス・日付は未記録）。修復は AI（非生成） | △（Creator／Terms 未記録） |
| 　└ 未参照 | 7＋2 | `enemies/*/art.png`（7・計 2.8MB）・juuma／oni の旧 `art.webp`（512²） | — | — | 配信されているが実行時未参照（決定170 で認識済み・`.vercelignore` 候補） | — |
| OTOMO | 7 体 × 5＝35 | `spirit_320／incarnate_320／doji_320.webp`（320²・alpha・7.7〜31KB）・`background.webp` 900×437 | Kit 公式 1600²（`art-source/otomo/<id>/*_transparent`）＋配信中の `doji.webp` 1600²（alpha なし・未参照？ 5.5MB） | **D. Kit 光沢 3D 風スプライト**（自発光・透過縁に発光焼き込み） | SGG Creator Kit v1 | ◎ |
| カード | 60 | `512×768 webp`（79〜182KB・計 6.9MB） | `art-source/cards/*.png` 1024×1536（56 枚・実質 ≈362px 幅＝決定37 の 2×2 シート切り出し） | **E. chibi セル塗り**（`CARD_ART_STYLE_GUIDE.md`。神専用カードの神は Kit と別人＝決定37「顔の一致は求めない」） | CEO が ChatGPT で生成（決定37） | △（プロンプト集はあるがサービス版・日付・規約未記録） |
| 背景 | 7 ステージ＋arena | `stages/0N-*.webp` 1600×900（214〜322KB）・`arena.jpg` 1672×941 | 未保全 | **F. 厚塗り風景**（月・灯籠・石畳。1 枚に光源あり） | CEO 生成（決定41・124） | **✗（未記録）** |
| FX | 6 | `cast-*.png` 320×480（263〜429KB・計 2.0MB・黒地 PNG＋`mix-blend-mode: screen`） | 未保全 | 汎用の閃光 | CEO 生成（決定41） | **✗（未記録）** |
| SE | 20 | wav（計 372KB） | `scripts/gen-se.mjs` | 数式合成 | 自作 | ◎ |
| BGM | 4 曲 × 2 形式 | webm（Opus）＋mp3 | `audio-source/bgm/` | — | Suno（決定120 で出所確定） | △（規約版の記録） |

- 除外ローカルファイル `敵画像`（repo 直下・69 byte のメモ・未追跡）は**存在するが git 追跡外のまま**【実測：`git status --porcelain` に `??` で出る・`docs/RELEASE_STATUS.md:151`「含めない」】。本監査でも触れていない
- 画風系統は **A〜F の 6 系統**（決定225 §5-P の「4 系統」は神／敵 2 系統／OTOMO／カードの数え方。背景・FX を含めると 6）。**同じ Kit の中でも神（A・線画）と OTOMO（D・光沢）は画風が違う**＝「画風統一」を Kit 側に求めることはできず、動かせるのは自前の敵 7 体・カード 60 枚・背景 7 枚・FX 6 枚

### 2-2. 解像度は足りているか

| 対象 | 表示（CSS px） | 原画 px／device px | 判定 |
|---|---|---|---|
| 神 `front_640` | PC 240×167 箱（絵の実体 ≈150px）／SP 142² | PC DPR2 で 2.1・SP DPR3 で 1.5 | 足りる |
| 敵 `art_hq` 768 | PC 293×195 箱／SP 177×169 | PC DPR2 で 2.0・SP DPR3 で 1.4 | 足りる（ドット系は等倍でドットが見えるが解像度不足ではなく画風） |
| OTOMO 320 | PC 86²／SP 51² | PC DPR2 で 1.9・SP DPR3 で 2.1 | 足りる（1600 原本あり） |
| カード 512×768 | 100×158／116×164 | 1.66／2.29（実質 362px では 1.18／1.62） | 戦闘は足りる。デッキ構築 DPR3 で不足（Lane3 §1-2） |
| 背景 1600×900 | 1240×327（cover）／378×478 | ≥1.3 | 足りる |

→ **asset の問題は「解像度」ではなく「画風・接地・ポーズ・光源」**（決定225 P・Lane3 §1-2 と一致）。高解像度化だけを目的にした再書き出しは価値が小さい。

### 2-3. 権利・ライセンスの整理（`SGG-CREATOR-KIT-RIGHTS.md` v1.0.0）

- 許可：二次創作・商用・**公式素材の加工と組み込み**・**生成 AI への入力／参照画像としての使用**（§2）。クレジット任意（§4）
- 制約：生成物と公開方法の責任は制作者（§2）／公式素材を「ほぼ未改変のまま素材として再配布」は禁止（§5）／「公式・公認」と誤認させない（§5）／迷ったら運営へ相談（§7）
- 本監査の禁止事項との関係：公式素材を**外部へアップロードする行為そのもの**（生成サービスへの参照入力）は Guidelines 上は許可だが、**そのサービスの規約（入力画像の扱い・商用可否・生成物の権利）の確認は CEO**（§6-3 #5）。AI は判断しない
- 台帳：`docs/ASSET_RIGHTS_LEDGER.md` は**未作成**（Next Milestones L4 の雛形が未着手）。asset phase に入るなら **先に雛形を作り、After-2 の 1 行を最初の記入例にする**（P15）

---

## 3. 4 項目＋追加項目の比較表

体感 impact＝「毎戦どれだけの時間・面積・回数、目に入るか」×「North Star（解く）への寄与」。「code で可能」は新 asset 0 で出せる範囲、「asset が要る」は再描画・新規画像が要る範囲。

| # | 項目 | 体感 impact | code で可能（新 asset 0） | asset が要る部分 | asset 制作経路（制約内） | 権利・§6-3 | コスト・リードタイム【推測】 | 回帰リスク | Human QA |
|---|---|---|---|---|---|---|---|---|---|
| **1** | **キャラクター画風の統一** | **最大**：常時 100%・舞台の 3 体（画面の 10〜17%）・決定225 の 3 要因で唯一の未着手 | **ほぼ 0**。CSS でできるのは filter による色調寄せだけで、6-D モック B は「accent 乗算 12% で画面全体が沈む」と判定【docs】。線・塗り・ドットは CSS で揃わない | **敵 7 体の再描画**（Kit の神＝線画セルに寄せる。OTOMO は Kit 公式のため触らない）。カード 60 枚の神専用 16 枚は決定37 の「別人」問題（After-2 で 1 枚だけ試す） | (a) CEO の既存生成手段（カード・背景と同じ）＋Kit の神を参照画像＝画風の見本（Guidelines §2 で可）／(b) 手描き（社内に手段なし）／(c) 無料ローカルツール（画風変換は identity を壊す・決定211 の教訓）→ **(a) が唯一現実的** | 敵は自前 IP＝IP 変更ではない（§6-3 #3 非該当）。生成サービス規約＝CEO（#5）。課金が要る場合のみ #4 | **7 枚 × （生成→受入→Human QA）**。1 体 1〜2 日＋CEO 作業＝**2〜3 週間**。identity 台帳（決定211 型）が要る | 高：4 体は CEO 実機 QA 済みの修復版を置き換える（決定177〜183）。敵ごとの「らしさ」が変わる | **要**（敵 1 体ごとに Before／After） |
| **2** | **キャラクターと背景の接地感** | 中：常時 100% だが「気づく」型の変化ではない（決定222 の教訓：操作と因果を持たない緩やかな変化は注意の外に落ちる） | **できる範囲**：①足元の楕円影（`.enemy-stage`／`.player-stage` の `::after`・radial-gradient・blend 不使用）②汎用 4 色 blob → **未使用の `--stage-accent`** を使った床光（ステージ色の 1 灯）③リム（drop-shadow 連鎖に 1 段。決定240 と同方式）。≤3KB・CSS のみ。**ただし 6-D の実測**：影は暗い背景に溶け、リムはドット縁を強調、効かせるには立ち絵 1.3〜1.5 倍が要る【docs】。決定229 で **SP は ×1.28〜1.45 になった**ので SP に限れば再評価の余地あり、PC 1508×660 は条件未達 | **足元そのもの**：神は雲に座り（Kit 正典・変えられない）、龍神は水しぶき、鬼将は…と原画に「地面」が焼き込まれている。影を足しても「雲の下に影」になる。光源の向き（月＝上・神＝左上）も原画側。**本質的には #1 の再描画時に「共通の地面・共通の光源」を Brief に書くことで解く** | #1 と同じ経路。神・OTOMO は Kit のため接地は「影で誤魔化す」しかない | なし（CSS）／#1 と同じ（asset） | CSS 案：1〜2 日＋Human QA 1 回。asset 案：#1 に内包 | 中：`enemy-stage` の `::after` は決定240 の special の環（`.enemy-avatar::after`）と別要素で共存可。決定229 の SP 配置・232 の反応・226 の崩壊に触れない。**Human QA で「変わらない」（決定222 型 FAIL）の確率が高い** | 要 |
| **3** | **カード原画品質／Lane3 After-2** | 中：1 枚（大耀『豪快な一撃』）。ただし READY Pilot の唯一の対象・推奨デッキ入り＝**大耀の毎戦で手札に来る**。決定236 で窓は 55% に開いた（Human QA PASS）ので「絵が見えていない」は解消済み、残るは「別人・焦点なし・紫」 | **0（code 側は完了）**：After-1（決定236）出荷済み。After-2 は `cardArt.ts:64` の 1 行＋`_v2.webp` 1 枚 | **新原画 1 枚**（`LANE3_IMAGE_BRIEF_GOUKAI_NO_ICHIGEKI.md`：1536×2304 推奨・領域指定・identity 13 項目・プロンプト日英・negative） | CEO の既存生成手段＋Kit `taiyo` main/front を参照画像。受入は `accept-art.mjs`（MUST 16・TARGET 4・現行原画は不合格で校正済み） | 決定37 の 1 枚上書きは **CEO 承認済み**。生成サービス規約＝CEO（#5）。課金 0 | **CEO の生成作業のみ**（合格まで再生成 ≤3 回想定）。AI 側は受入・書き出し・登録・Gate・QA 環境で 0.5〜1 日 | 低：新ファイル名（旧絵は残す・ロールバック 1 行）。他 59 枚・READY 重ね層・⚡不変 | 要（3 環境・6 問・準備済み） |
| **4** | **God Strike の Premium Cut-in／H3** | 低〜中：≤1 回／戦・3.4s・全画面。**既に画面内で最も強い**（決定225 PC-7「商用水準」・L 層「最高 Tier として十分」） | 残余は code 小物のみ：バナー「✨ 大耀の一撃！」の system-ui＋絵文字・進化バナーの神への重なり（再監査 #7・0.4〜1 回／戦・低リスク） | H3＝fal.ai の image-to-video。**決定219（環境 VFX）・決定223（カットイン）で 2 度 NO-GO**：0.5s で MAE 25〜31＝正典が保てない。再検討 Gate（MAE ≤8・同 seed 再現・正典を含まない・無くても同一体験）は未達のまま。**非 H3 の premium 化＝神 7 柱の「必殺ポーズ」新規画 7 枚**（6-D Post-Release 候補）＝Kit 正典の**新ポーズを生成で作る**＝identity リスク最大 | H3 は有料 API＝本監査の禁止領域・§6-3 #4／#6。ポーズ画は #1 と同じ経路だが Kit の神の **新ポーズ生成は決定211 で FAIL 実績**（帽子の縁 1 箇所で CEO が検知） | Kit 正典の改変＝§6-3 #3 に近い（IP 設定の重大変更ではないが「正典の一枚を描き直さない」P12 に抵触） | 7 枚 × identity QA＝最長。H3 は課金 | 高（identity） | 要 |
| 5（追加） | OTOMO を Kit 1600 原本から高解像度で再書き出し | 低：OTOMO は 51〜86px・決定214「役割未確定のうちは見た目先行しない」 | 書き出しのみ（非生成・sharp）。Kit 素材の加工＝許可 | — | art-source の `*_transparent` から | なし | 0.5 日 | 低 | 省略可 |
| 6（追加） | ステージ背景の「地面」統一（7 枚の床の高さ・光源を揃える） | 中：常時 100%（背景は舞台の 100%） | `--stage-accent` の活用と減光段階の調整のみ | 7 枚の再生成 or 加筆（床の消失点・光源を統一）＝#2 の背景側 | CEO の既存生成手段。**台帳が ✗ のまま**なので先に出所記録 | #5 規約・#4 課金 0 | #1 と同規模 | 中（LCP 要素） | 要 |
| 7（追加） | Asset Rights Ledger（docs） | 体感 0・ただし **asset phase の前提**（P15・§6-3 #5） | docs のみ | — | — | CEO INPUT（サービス名・日付・規約版） | 0.5 日＋CEO 記入 | 0 | 不要 |
| 8（追加） | 未参照 asset の配信除外（敵 `art.png` 7・旧 `art.webp` 2・OTOMO `doji.webp` 1600 ≈ 8.3MB） | 体感 0（転送量のみ） | `.vercelignore` | — | — | なし | 0.5 日 | 低 | 不要 |

### 3-1. 順位（asset phase の中で）

1. **#3 After-2（Asset Pipeline Pilot）** — 準備完了・1 枚・権利新規 0・#1 の前提実験
2. **#7 台帳雛形** — docs・並行・#1／#6 の前提
3. **#1 敵 7 体の画風統一** — asset phase の本命。After-2 の結果（生成物が Kit 意匠に忠実になれるか・受入指標の運用）を見てから Brief を確定
4. **#2 接地** — CSS 部分は #1 の Before／After に混ぜず、**#1 の Brief に「共通の地面・共通の光源・足元を絵に焼き込まない」を書いて asset 側で解く**。CSS 単独の Pilot は決定222 型 FAIL の確率が高いので、やるなら SP 限定・Fast Pilot・撤退条件明記（§5-2 の代替案）
5. #6 背景の地面統一 — #1 の後
6. #4 God Strike — code 小物（#7 バナー）は Hotfix 列へ。H3・新ポーズは **再提案しない**
7. #5・#8 — 保守

---

## 4. 判定と根拠（9 軸・反証）

### 4-1. code／CSS phase は逓減しているか — 再監査 §3 の残余候補とその期待体感

| 再監査 §3 | 候補 | 状態 | 期待体感（対 決定240＝常時 100%・North Star 直結） | 種別 |
|---|---|---|---|---|
| 1 | Enemy Intent Presentation v1 | **出荷（240）** | — | — |
| 2 | 結果トーストの名札重なり | **出荷（241）** | — | — |
| 3 | 無効カードの二重減光（G14） | 未 | 小：AP 0 の数秒 × 5〜7 回／戦。「壊れた UI」に見える瞬間が消える＝元に戻る型 | Hotfix・QA 省略可 |
| 4 | HUD 残余の材質（神力 pill・予告帯・上部バー） | 未 | 小：小部品・常時だが面積 1〜2% | Hotfix 級 |
| 5 | 敵 HP 閾値の一回性反応 | 未 | 中：2 回／戦。決定232 の時刻表に要素を足す | Pilot（QA 要） |
| 6 | 結果画面の材質 | 未 | 中：1 回／戦。`GameOverOverlay` 502 行・tests 多数 | Pilot（高回帰） |
| 7 | 進化／神の一撃バナーの位置と絵文字 | 未 | 小：0.4〜1 回／戦 | Hotfix・QA 省略可 |
| 8 | 共鳴ゲージ「4」の目印（G8） | 未 | 小〜中：charged 型の神のみ | Hotfix 級 |
| 9 | L1／L2 の差 | **見送り**（CEO が v1.1 を Final） | — | — |
| 10 | BGM ダッキング | 未 | 中（耳）：iOS 実機必須・自動再生制限 | Pilot（実機） |
| 11 | 通常カードの枠を material に（G7） | 未 | 中：常時・手札 4〜5 枚。ただし決定223 §6「material は READY だけ＝成立の情報を薄めない」と衝突。60 種 × 5 画面の Gate | Pilot（高回帰・設計判断） |
| 12 | 中央閃光を神の手元へ | 未 | 小〜中：12 回／戦・決定237／239 と同時刻 | Pilot（中回帰） |

- 「常時 100%＋North Star 直結＋未着手層」を満たす候補は **0**。残りは「元に戻る」型（3・4・7）か、「1〜2 回／戦」型（5・6）か、「設計判断と高回帰面」型（11・12）
- 出荷 16 決定で CSS は 150KB → 167.6KB（+17.6KB）、JS 443 → 441KB【docs：決定223 §3-1 → 決定240 §9-1】。容量は問題ないが、`battle.css` は 6,956 行・末尾追記の保護ブロックが 224／226／229／232〜240 と 9 つ積み上がり、**新しい CSS Pilot ほど「触ってはいけない行」が増えて Gate のコストが上がる**（決定240 は 12 戦＋reduced 2 戦の Gate を要した）
- CEO Human QA：本日だけで 229 v2・231／236・232・233・234・235・239・240 の QA を消化。**code Pilot 1 件あたり CEO 15〜60 分**。asset 側は「CEO が画像を作る」時間が律速で、QA 時間と競合する

→ **逓減している**。ただし「ゼロ」ではなく、Hotfix 列（3・4・7・8）は CEO 時間を使わずに出せる。

### 4-2. 9 軸（CLAUDE.md §6-1）— (a)／(b)／(c) の比較

| 軸 | (a) 今すぐ asset へ全振り | (b) code／CSS を継続 | **(c) 閉じて asset へ・Hotfix 列だけ保守** |
|---|---|---|---|
| Player Value | ◎ 3 要因の最後の 1 つ（画風・接地）に着手できる | △ 残余は欠陥修正か 1〜2 回／戦 | ◎ 同左＋欠陥も直る |
| Strategic Depth | — | — | —（どの案も情報は増減しない） |
| Replayability | ○ 7 敵の個性が絵で立つ | △ | ○ |
| Game Feel | ○ | ○（5・12 は効くが小） | ○ |
| UX | ○ | ○ | ◎（G14・バナーの欠陥が消える） |
| Retention | ○ 第一印象（10 秒動画）が変わる | △ | ○ |
| Implementation Cost | 高（CEO 作業が律速・数週間） | 低〜中 | 中（asset は CEO 律速、code は AI 側だけ） |
| Regression Risk | 中〜高（敵 4 体は CEO QA 済み修復版を置換） | 中〜高（11・12・6 は保護ブロックと衝突） | 中（asset は 1 枚から・Hotfix は CSS 1〜2 規則） |
| SEVEN GODS 独自性 | ◎ 「神と敵が同じ世界に立つ」は P13 の約束（神と今日の敵が向き合う）の絵そのもの | △ | ◎ |

→ **(c)**。asset へ移る判断は (a) と同じだが、**「asset の待ち時間に AI 側だけで出せる欠陥修正」を捨てる理由がない**。ただし Hotfix 列は「Premium Pilot」を名乗らず、Human QA を要するものは asset phase が終わるまで起票しない。

### 4-3. Hotfix 待機列（asset 待ちの間・AI 判断・Human QA 省略可・決定237／238／241 型）

1. G14 無効カードの二重減光（`filter` と inline `opacity .45` の片方に）— CSS 1〜2 規則
2. 進化バナー／神の一撃バナーの位置（神の顔に重ならない）と絵文字→SVG（`BattleScreen.tsx:520/532`）— 決定240 と同じ `GlyphIcon`
3. HUD 残余（神力 pill・予告帯）の材質（`hudPlate.css` 追記・寸法 Gate は決定235 の `gate-diff` を再利用）
4. 未参照 asset の配信除外（§3 #8）— `.vercelignore`（転送 −8MB・見た目 0）

### 4-4. 反証（採用前に潰した点）

| 疑い | 判定 | 根拠 |
|---|---|---|
| 「code で『接地』を先にやれば既存 asset が良く見えるのでは（(c) の例示）」 | **半分真・NEXT NOW にはしない** | 6-D モック B（接地影・床光・リム・乗算）の実測は「差が小さい・立ち絵 1.3〜1.5 倍が要る」【docs】。決定229 で SP は条件を満たしたが PC 1508×660 は未達。さらに原画の足元（雲・水しぶき）が焼き込まれているため、影を足しても「雲の下の影」になる。決定222（Lighting Breath・カバー率 34.9%・+19 luma でも「静止画に感じた」）と同型の **Human QA FAIL の確率が高い**。やるなら §5-2 の代替案（SP 限定・Fast Pilot・撤退条件付き） |
| 「After-2 は 1 枚だけ。体感が小さすぎて NEXT NOW に値しないのでは」 | **1 枚の体感ではなく、asset phase の前提実験として選ぶ** | 敵 7 体の画風統一（#1）は「CEO の既存生成手段で、参照画像（Kit の神）に忠実な絵が受入指標を満たして出てくるか」が成否を決める。After-2 はまさにそれを **1 枚・受入指標 16・Human QA Q3（同一人物に見えるか）** で測る。ここで NO-GO（3 回再生成しても A4／A5 が通らない・Q3 が NO）なら、#1 を 7 枚分やる前に手段を見直せる |
| 「敵 7 体の画風統一を直接 NEXT NOW にすべきでは（体感最大）」 | **しない** | ①Brief（受入指標・identity 台帳・共通の地面と光源の指定）が未作成 ②置き換える 4 体は CEO 実機 QA を通した修復版（決定177〜183）で、再生成は決定225 §15-4「敵 7 体・OTOMO 7 体の再生成へ逃げない」の別監査条件を満たす必要がある ③CEO の生成作業 7 枚＋QA 7 回＝律速。After-2 で経路を確認してからの方が総リードタイムは短い【推測】 |
| 「H3 が使えれば God Strike が一段上がるのでは」 | **否** | 決定219・223 で 2 度 NO-GO（0.5s で正典から MAE 25〜31）。再検討 Gate は変わっておらず、有料 API＝本監査の禁止領域。God Strike は既に最上位 Tier で「十分」（決定225 L）。伸びしろは他の層より小さい |
| 「Kit の神・OTOMO を線画に描き直せば画風は完全に揃うのでは」 | **しない** | Guidelines §2 は加工を許可するが、P12「正典の一枚を描き直さない」・決定211（COV-M v2 で帽子の縁 1 箇所の崩れを CEO が検知して FAIL）・§6-3 #3（IP 設定の重大変更に近い）。動かすのは自前の敵・カード・背景 |
| 「決定225 §15-2『エフェクト追加を品質と誤認しない』に反しないか」 | 反しない | asset phase は追加ではなく「揃える」。Hotfix 列も引き算（二重減光・重なり） |
| 「asset phase は CEO 律速で、AI の稼働が空くのでは」 | 空かない | 並行 docs（Enemy Art Direction Brief・台帳雛形・受入スクリプトの敵向け拡張）と Hotfix 列で埋まる。CEO の Human QA 時間を asset に集中させることが目的 |

---

## 5. NEXT NOW Preflight 概要 — Asset Pipeline Pilot＝Lane3 After-2『豪快な一撃』新原画

### 5-1. 本命（NEXT NOW）

| 項目 | 内容 |
|---|---|
| scope | 大耀『豪快な一撃』（`card_taiyo_attack_01`）の原画 1 枚を、Kit 公式 大耀の意匠で新規に作り、決定236 の Art Window v2 レイアウトに載せる。**他 59 枚・READY 重ね層・⚡・共鳴・神の一撃・`src/core`・数値・save は不変** |
| CEO が用意するもの | **master PNG 1 枚**（`LANE3_IMAGE_BRIEF_GOUKAI_NO_ICHIGEKI.md` §2〜§12：2:3・推奨 1536×2304（最低 1024×1536 ネイティブ）・alpha なし・拡大禁止・シートからの切り出し禁止）。参照画像は repo 内の `public/assets/gods/taiyo/main.webp`／`front.webp`（Brief §13）。**生成手段はカード 60 枚・背景 7 枚と同じ既存手段。新規課金・API 課金が必要なら使う前に承認**（§6-3 #4）。生成サービスの規約（商用可否・参照画像の入力・生成物の権利）は CEO が確認（#5）。あわせて **台帳 1 行の材料**：サービス名・プラン・生成日・プロンプト全文・参照画像のファイル名 |
| AI がやること | ①`node scripts/lane3-card-premium/accept-art.mjs <master.png> <delivered.webp>`（MUST 16・TARGET 4）②sharp で 640×960 WebP q85 ≤160KB 書き出し（Brief §14）③`public/assets/cards/card_taiyo_attack_01_v2.webp`（新ファイル名・旧絵は残す）＋`art-source/cards/card_taiyo_attack_01_v2.png`＋`src/core/data/cardArt.ts:64` の 1 行 ④`docs/ASSET_RIGHTS_LEDGER.md` 雛形を作り、この 1 枚を最初の行として記入（Source／Creator／Model-Service／Date／Terms Version／Commercial／Modification／Attribution／Canonical Source／Evidence＝sha256）⑤Fast Gate（tsc／lint／vitest／build・`verify-impl.mjs`・`gate-after1.mjs` 再実行で他カード diff 0）⑥Human QA 環境 3 ポート（Before＝Production／After-1＝Production（決定236 済みなので同一）／After-2）⑦Release Gate → CEO 承認 → Production → Narrow Smoke |
| files／assets | runtime：`src/core/data/cardArt.ts`（1 行）・`public/assets/cards/card_taiyo_attack_01_v2.webp`（新規）。非 runtime：`art-source/cards/card_taiyo_attack_01_v2.png`・`art-source/README.md` 1 行・`docs/ASSET_RIGHTS_LEDGER.md`（新規） |
| 受け入れ（機械） | `accept-art.mjs` MUST 全 PASS・TARGET FAIL ≤1／配信 640×960・≤160KB・alpha なし／`gate-after1.mjs`：文字の開始 ≥54%・条件行 1 行・珠 26×26・READY の縁 0/0/0/0・他カード diff 0・console error 0／`src/core` 差分＝`cardArt.ts` 1 行のみ／JS 差 0（データ表の文字列のみ）・CSS 差 0 |
| Human QA | **要**。3 環境（Before＝Production・After-1＝Production と同一 build・After-2）× SP 実機（390 前後）＋PC 1508×660、大耀 × 蒼海の龍神 × ふつう `?seed=lane3-card-1`（初手に豪快な一撃）。6 問（Lane3 §10-4）。**成功条件：After-2 で Q1〜Q4 YES・Q5 悪化なし・かつ Q1 または Q2 で After-1 より明確に上（原画の寄与）。Q3（舞台の大耀と同一人物）が YES なら「Kit 参照の生成が成立する」＝#1 の前提が立つ** |
| 撤退条件 | 3 回再生成しても A4／A5（文字帯）が通らない → After-2 保留（決定236 のまま。Production に影響 0）／Q3 NO かつ Q1・Q2 が After-1 と同等 → 「参照生成では identity が出ない」と記録し、#1 の手段を再監査（生成→手描き依頼・別サービス等は CEO 判断） |
| 触らないもの | 大耀の他 3 枚・共通カード・`READY_MATERIAL_PILOT`・`ART_WINDOW_V2`（決定236）の許可リスト以外・`battle.css`・決定224／229／232〜241 のブロック・デッキ構築／報酬画面のレイアウト |
| ブランチ | `feat/lane3-after2-art`（Production `01b66f4` から・独立 worktree）。Hotfix 列は別番号・別ブランチ |
| 成果物の次 | PASS → **Enemy Art Direction Brief v1 を確定**（§5-3）→ 敵 1 体（銀甲の機工師＝余白最大・厚塗り系・修復版でない）から Pilot |

### 5-2. 代替（採用しなかった code-only「接地」Fast Pilot・記録のみ）

SP 限定・`@media (max-width: 899px)` 末尾追記・≤3KB：①`.enemy-stage::after`／`.player-stage::after` に足元の楕円影（radial-gradient・黒 α0.55・blur 0・`mix-blend-mode` 不使用）②`.battle-arena-glow` の 4 色 blob を `--stage-accent` 1 色の床光（radial・下端）に置換 ③reduced-motion 影響 0（静的）。Gate：決定229 の `measure.mjs`（大きさ・向き・着弾 100%）SAME・決定240 の special の環と重ならない・HUD 140 項目 SAME。Human QA 1 問「神と敵が同じ地面に立って見えるか」。撤退：NO なら CSS を捨てる。**採用しない理由：6-D／決定222 の実績で FAIL 確率が高く、asset 側（#1 の Brief に地面・光源を書く）で解く方が確実**。After-2 の CEO 作業待ちが長引いた場合の「AI 側だけで出せる次点」として保持。

### 5-3. 並行 docs（NEXT NOW ではない・AI 判断で着手可）

- **Enemy Art Direction Brief v1**（`docs/ENEMY_ART_DIRECTION_BRIEF_V1.md` 案）：画風の見本＝Kit の神（線の太さ・2〜3 階調セル・左上主光）／**共通の地面**（足元を絵に焼き込まない・接地面は透明・影は CSS 側）／**光源**（各ステージ背景の月・灯籠に合わせた 7 通りの副光）／向き（正面〜やや右向き＝決定229 の反転を不要にできる）／余白（trim ≥0.6・機工師 0.48 の是正）／identity 台帳（決定211 型：各敵の固有要素 5〜8 項目）／受入指標（`accept-art.mjs` を敵向けに拡張：alpha あり・bbox・trim・エッジ密度）／順序（機工師 → 道化 → 堕天使＝生成系 3 体を先に、修復系 4 体は CEO QA 済みのため後）
- **`docs/ASSET_RIGHTS_LEDGER.md` 雛形**（§2-3。backgrounds／fx の ✗ を CEO INPUT で埋める）
- **`.vercelignore` 監査**（§3 #8）

---

## 6. CEO 判断が必要な事項（§6-3）— 新規の承認事項は 0・既存の確認 2 件

```
【CEO DECISION REQUIRED】（確認・既存事項の再掲）
Issue：After-2 の原画生成に使うサービスの規約（商用利用・参照画像としての Kit 素材入力・生成物の権利）の確認と、
       サービス名／プラン／規約版／生成日の台帳記入（§6-3 #5・P15）。
AI Recommendation：カード 60 枚・背景 7 枚を作った既存のサービスをそのまま使い、規約を確認した旨と版・日付を
       docs/ASSET_RIGHTS_LEDGER.md の 1 行目に記入する。新規サービス・有料プランは追加しない。
Reason：Guidelines §2 は Kit 素材の参照入力を許可しているが、サービス側の規約確認は制作者責任（同 §2）。
       台帳が ✗ のまま asset phase に入ると、P15／Launch Gate（Rights）で後から全 asset を遡ることになる。
Alternatives：規約が不明確なサービス → Kit 素材をアップロードせず、文章プロンプトのみで生成（identity は落ちる）。
Risk：規約上「入力画像の学習利用」が避けられないサービスの場合、公式素材のアップロード可否は運営相談（Guidelines §7）が要る。
Impact if delayed：After-2 が始まらない（Production への影響は 0）。
CEO Action：承認（既存サービスで続行・台帳記入） / 拒否
```

```
【CEO DECISION REQUIRED】（条件付き・発生時のみ）
Issue：生成に有料プラン／追加課金／API 課金が必要になった場合の可否（§6-3 #4・#6）。
AI Recommendation：現時点で追加課金は提案しない。必要になった時点で、金額・回数上限・用途（After-2 の 1 枚に限る）を
       添えて再提出する。
CEO Action：（発生時）承認 / 拒否
```

- IP（§6-3 #3）：決定37 の 1 枚上書きは CEO 承認済み。敵は自前 IP で IP 設定の変更ではない。Kit の神・OTOMO の描き直しは提案しない
- Production 公開（#8）：After-2 の Release は通常どおり CEO 承認
- H3／fal.ai（#4・#6）：提案しない

---

## 7. Risks

| # | リスク | 程度 | 対策 |
|---|---|---|---|
| R1 | After-2 が CEO 作業待ちで長引き、asset phase が「待ち」だけになる | 中 | §5-3 の並行 docs と §4-3 の Hotfix 列で AI 側の稼働を埋める。2 週間以上動かない場合は §5-2 の SP 接地 Fast Pilot を次点として起票 |
| R2 | 生成物が受入指標（文字帯の暗さ・紫 ≤2%・焦点）に届かず再生成が続く | 中 | Brief §16：3 回で保留・After-1 のまま。指標は現行原画で校正済み（MUST FAIL 12）なので「通らない＝絵が弱い」と読める |
| R3 | 参照生成で大耀の identity が出ない（Q3 NO） | 中 | それ自体が #1 の前提実験の答え。NO なら敵 7 体の手段を再監査してから進む（生成で 7 枚作ってから気づくより安い） |
| R4 | 敵 4 体（修復版・CEO QA 済み）を将来置き換える際の「らしさ」の損失 | 高（#1 着手時） | 生成系 3 体（機工師・道化・堕天使）から Pilot し、修復系 4 体は identity 台帳＋Before／After を敵ごとに CEO QA。決定225 §15-4 の別監査条件を Brief で満たす |
| R5 | 台帳の遡り（backgrounds／fx ✗・cards／enemies △）で CEO INPUT が集まらない | 中 | After-2 の 1 行を「記入例」にして形式を固定。過去分は「Creator＝CEO・Service＝未記録・Date≈決定日」で仮記入し、確定分から埋める |
| R6 | 「code phase を閉じた」ことで、Human QA 省略可の欠陥修正まで止まる | 低 | §4-3 の列を「保守」として明文化。Fast Gate・CSS 1〜2 規則・保護ブロック無変更のみ |
| R7 | 本監査の撮影は headless・DPR 1・音なし・1 組（大耀 × 龍神）。他の 6 敵の画風差（ドット系 vs 厚塗り系）は docs の記録と等倍切り抜き（決定225）に依拠 | 低 | 敵 Brief の作成時に 7 体の等倍切り抜きを撮り直す（docs-only） |
| R8 | `vite preview :4391` を起動した | — | 撮影後に停止（LISTEN 0 を確認）。Firewall 変更 0・外部通信 0・rebuild 0 |
| R9 | God Strike のカットイン瞬間（900ms）は撮影窓を外した（`pc-03-cutin` は直前の calm） | 低 | 判定は決定225 L 層の実測記録と `sp-04`（着弾 −360・52px）に依拠。God Strike は本判定で最下位のため結論に影響しない |

---

## 付録：本監査の証跡
- `scripts/premium-phase-judgment/inventory.mjs` → `out/inventory.json`（public/assets 218 ファイルの寸法・形式・容量）
- `scripts/premium-phase-judgment/shots.mjs` → `out/pc-*.png`（13 枚）・`out/sp-*.png`（13 枚）・`out/pc-log.json`／`sp-log.json`（立ち絵の箱・filter・背景・床要素なし・console error 0）
- 主要フレーム：`pc-01-calm`／`sp-01-calm`（画風の混在・接地なし・4 色 blob）、`pc-01-calm-enemy-stage`／`-player-stage`（龍神の水しぶき・大耀の雲＝足元の焼き込み）、`pc-02-heavy-hit`・`sp-04-godstrike-impact`（52px・着弾）、`sp-08-victory-stage`（円形 keyvisual＝舞台の絵と別）、`pc-09-result`
- runtime／`docs/DECISIONS.md`／他 docs／他 worktree／`敵画像`／assets への変更 0。有料生成・外部 API・公式素材のアップロード 0
