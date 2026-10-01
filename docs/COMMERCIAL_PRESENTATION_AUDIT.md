# Lane3 — Commercial Presentation Audit（2026-10-02・AUDIT ONLY／docs-only）

- 担当：【Designer】＋【PM】（CEO 指示「3-Lane Parallel Audit」LANE 3）
- Baseline：Production master `3dd8b5c`（runtime `a611270`＝決定254 LIVE）。worktree `C:/Users/kimi1/SevenGodsGame-lane3-presentation`・branch `docs/lane3-commercial-presentation-audit`
- 禁止の遵守：runtime／src／public／assets 変更 0・新規生成 0（画像・音声・動画）・H3／fal.ai／外部登録 0・ブラウザ自動化 0・vitest／build 0・`docs/DECISIONS.md` 編集 0（統合担当が追記）
- 表記：【実測】＝本 worktree の実コード・実ファイル／【docs】＝既存文書／【AI 判断】／【推測】。file:line は本 worktree
- 証跡：`docs/evidence/commercial-presentation-audit/`（axis-verdicts.md・sound-timeline.md・referenced-evidence.md・asset-inventory.md）

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 9 軸の判定（9/28 比） | ART ×（asset HOLD・変更 0）／MATERIAL △（名札は統一・fixed バナー 3 枚と pill 2 種が残る）／DEPTH ×（接地 0・SP 空き帯 ≈200px）／LIGHT △（予告リム・神紋・動画の光は増えた・素材の明度差は残る）／MOTION ○戦闘（60/60 に反応主体）×Home・OTOMO／TIMING ○（入口 skip・残 1＝JS 予約 ≈230ms）／**SOUND ×（決定233 以降 変更 0・決め所 2 つが無音）**／IMPACT ◎映像 △音／RETURN TO CALM △（勝利のみ・敗北は帳票即出し） → 詳細 `axis-verdicts.md` |
| God Strike Voice の結論（1 案） | **必要（条件付き）だが、今は作らない**。God Strike の 420〜1,600ms＝**1,180ms が SE 無し**（`enemyVfxTiming.ts:81-106`・`useBattleSound.ts:66-72`【実測】）で、最高額の asset（決定250 動画）が無音＝商用品質の穴。ただし Voice は①権利（Kit 対象外 `SGG-CREATOR-KIT-RIGHTS.md:75`・口調設定本文は非配布・CEO §6-3 #5）②生成手段（#6）③replay fatigue（Lane1 実測：通常 ≈55%／hard ≈72%／神階 ≈75〜80%＝ほぼ毎戦）の 3 条件が CEO 側にある。**先に自前で「Sound Layer v1」（§5）を入れて穴を塞ぎ、Voice は大耀 1 柱・1 本 ≤0.6s・2 variant（seed 決定論）・T+450〜1,050・gain 0.8×master・BGM duck 前提の仕様（§1-2／§1-3）で後日 §6-4 提出**。7 神一斉は不要 |
| Enemy Art の結論 | Brief v1 の受入 MUST は現 Production で **E2／E4／E5／E6／E7 が依然 FAIL**（配信 7 体は `d1e3b30` 以降 変更 0【実測】）。決定247 で HUD の向きは PC/SP とも解消したが、**敵カットイン（`BattleEnemyCutin.tsx:64`）は原画のまま＝左向き 4 体が自分の必殺で神に背を向ける**。Brief は改訂 8 点（§2-3）が必要で、**HOLD 継続**（生成は CEO フロー）。改訂後の 1 体目＝試練の影（初陣プリセット `firstBattle.ts:25`） |
| Sound の結論 | SE 20・BGM 2・ジングル 2・Voice 0・duck 0【実測】。1 戦の無音区間：**神の一撃 1,180ms／敵必殺 1,110ms／入口の降臨 1,062ms**（`sound-timeline.md` §4）。BGM は home↔battle 即切替（`bgm.ts:112-115`）・ジングル後に battle 曲が結果画面で即再開（`bgm.ts:176-184`）・iOS `volume` 無効の可能性（R5）未確認。音は 9 軸で唯一「決定233 以降 1 mm も動いていない」軸 |
| 残る Presentation 問題の順位 | ① SOUND：決め所 2 つの無音・duck 0・ジングル段差 ② ART/LIGHT/DEPTH：敵 7 体（asset HOLD） ③ MATERIAL：fixed バナー 3 枚（`system-ui`＋絵文字）・pill 2 種・中央閃光 PNG 1.98MB ④ DEPTH：SP 空き帯・接地 0・OTOMO 浮遊 ⑤ RETURN TO CALM：敗北の帳票即出し・結果画面の戦闘 BGM ⑥ FACING 残：敵カットイン・笑蓮／才華（asset） ⑦ MOTION：Home 0 keyframes ⑧ TIMING：JS 予約 ≈230ms |
| **Presentation 側の次候補（1 件）** | **「God Strike / Enemy Ultimate Sound Layer v1」**＝①BGM を WebAudio GainNode 経路に移し（iOS でも効く）神の一撃・敵必殺のカットイン中に duck（0.35→≈0.12・ramp 150ms・着弾 +300ms で復帰）②自作合成 SE 2 本（`gen-se.mjs` 拡張・権利 ◎）＝「神の一撃の rise（T+450〜1,300）」「敵必殺の rise（commit+150〜1,260）」③ジングル前後のフェード。runtime 変更＝`bgm.ts`・`sound.ts`・`feelTier.ts`・`useBattleSound.ts`＋`gen-se.mjs`。`src/core` 0・画像 0・CSS 0。**Voice の受け皿（duck 経路・新 SeName 階層）を先に作る**。却下案：A Voice 今すぐ（§6-3 #5／#6 が先・Human QA に生成が要る）／B Enemy Art v2（HOLD・Brief 改訂が先・CEO 生成フロー）／C バナー材質統一（1 戦 2〜3 回で Sound より露出が小さい＝第 2 候補）／D Home の呼吸（Loop への寄与が最小・9/27 で「既に商用寄り」）／E OTOMO 存在感（決定214 で見た目先行禁止）／F SP 空き帯（舞台 art の設計が要る・9/27 §A で優先度低） |
| CEO 判断が必要な事項（§6-3 該当のみ） | **1 件**：God Strike Voice の権利・生成（#5／#6）→ AI 推奨＝**保留**（Sound Layer v1 の Human QA 後に大耀 1 本の生成承認を別途提出）。§8 に §6-4 形式。敵 7 体の生成 HOLD は現状維持（新しい判断なし）。iPhone での音の実機確認（R5）は判断ではなく **CEO への依頼** |

---

## 1. God Strike Voice（必要性・瞬間・7 神・台詞長・競合・fatigue・権利・生成・コスト）

### 1-1. 必要性（North Star・Commercial Player Loop への寄与）【AI 判断】

| Loop の段 | Voice が効く根拠 | 効かない／代替がある根拠 |
|---|---|---|
| 解けた | 一撃は「解けた」の最終地点。音の天井が `hit_l4` 1 本（SOUND §R3【docs】）で、動画が 1.2s 無音【実測】 | 無音の穴は **Voice でなくても rise SE＋duck で塞がる** |
| もう一回 | — | 毎戦 55〜80% で鳴る＝同じ 1 本は 5 戦目で飽きる【推測】。variant が要る |
| 成長した／次も解きたい | 神ごとの声＝「自分の神」の実感（決定250 Human QA Q3「大耀本人」YES と同じ軸） | 7 神分の生成・権利・QA が要る（動画と同じ 1 柱ずつ） |
| 人に見せたい | 声は共有動画で最も伝わる（画面録画に乗る） | 録画で乗るのは BGM・SE も同じ。duck が無いと声が BGM に埋もれる |

結論：**「God Strike に音の主役が無い」こと自体は商用品質の穴（必要）**。ただし穴の第一充填は Voice でなくてよい。Voice は「神の individuality」を足す第二段で、権利・生成・fatigue の 3 条件が揃ってから。

### 1-2. どの瞬間に鳴らすか（既存時刻表に載せる）【実測＋AI 判断】

| T（commit） | 既存（`enemyVfxTiming.ts:81-106`・決定250） | Voice 案 | duck 案 |
|---|---|---|---|
| −280 | タップ `card_play` | — | — |
| 0 | `burst_ready`（420ms・0.55） | — | BGM 0.35→0.12（ramp 150ms・T+0 開始） |
| 200 | カットイン mount・ポスター | — | |
| **450〜1,050** | 動画の「砲口に光が集まる→前傾」（0.25〜0.85s） | **Voice ≤0.6s（叫び・短句）。`burst_ready` の尾（420）から 30ms 以上離して開始** | |
| 1,100 | ロック解除・バナー「✨ 大耀の一撃！」 | 終わっている | |
| 1,300 | 突き・動画の発射〜白フラッシュ | — | |
| 1,600 | 着弾 `hit_l4`（580ms・0.85） | — | |
| 1,900 | — | — | BGM 復帰 0.12→0.35（ramp 300ms） |
| 2,500 | `evolve`（該当時） | — | |

- Voice の gain：新階層 `SE_GAIN.voice`＝0.8（×master 0.85＝0.68）。`hit_l4`（0.85）より下・`burst_ready`（0.55）より上＝「声＜着弾」を保つ
- 新 `SeName`（例 `voice_taiyo_burst`）は独自キー＝30ms dedup（`sound.ts:143-145`）と衝突しない。rate は固定 1.0
- 2 variant の選択は `state.seed` のハッシュで決定論（`Math.random()` 禁止・§3 不変ルール）。reduced-motion でも鳴らす（音は motion ではない。ミュートは `setSoundMuted` に従う）
- iOS：Voice は WebAudio 経路なので gain は効く。**duck は `HTMLMediaElement.volume` では効かない（R5）→ BGM を `createMediaElementSource` の GainNode 経由へ**（Sound Layer v1 の①）

### 1-3. 7 神すべて必要か／台詞長【AI 判断】

- **7 神一斉は不要**。動画と同じく大耀 1 柱の Pilot → Human QA → 1 柱ずつ。笑蓮（寝そべり）は動画が成立しなくても声は成立する＝動画の無い 6 神の premium 化手段として声は動画より安い可能性【推測・コスト WEB確認必要】
- 台詞長：**≤0.6s・名前や文章を言わない**（「はぁっ！」「行くぞ！」級）。理由：①`burst_ready` 420 の後・バナー 1,100 の前に収める ②毎戦鳴るので文章は fatigue が早い ③口調設定本文は Kit 非配布（`SGG-CREATOR-KIT-RIGHTS.md` §6「GODSの口調設定本文は公開配布対象に含みません」【docs】）＝長い台詞ほど「非公式設定を公式のように見せる」リスク（同 §5 禁止事項）

### 1-4. SE・BGM との競合【実測】

| 競合 | 現状 | 対策 |
|---|---|---|
| `burst_ready`（0〜420） | 同時刻に `resonance_gain`・block 等も鳴る（名前違い＝dedup 外） | Voice は 450 以降に置く |
| `hit_l4`（1,600〜2,180） | 0.85＝最大 | Voice は 1,050 で終える。重ねない |
| BGM 0.35 固定 | duck 0 | GainNode duck（iOS 対応）。`bgm.ts:82` の `volume` は残し、GainNode を段に足す |
| 30ms dedup | `name@rate` キー | Voice は独自名で対象外。variant は別名（`voice_taiyo_burst_a/_b`）でもよい |
| iOS 自動再生 | 一撃はタップ後＝制約なし | — |

### 1-5. replay fatigue【AI 判断・Lane1 前提】

- 1 戦の発動率 通常 ≈55%／hard ≈72%／神階 ≈75〜80%【docs：Lane1】→ 1 日 5 戦で 3〜4 回。「同じ 1 本」は数日で背景化する【推測】
- 対策：①≤0.6s ②2 variant（seed 決定論）③「もう一度（Short 入口）」でも鳴らす（一撃は毎回の山）④ミュートは既存スイッチ。**variant 3 本以上・神ごと 7 本×n は生成回数が増えるだけ**で Pilot では不要

### 1-6. 権利（§6-3 #5）【docs】

- Kit §6：「第三者が権利を持つ音楽、音声、フォント、肖像…は対象外。制作者自身で必要な許可を取得」（`SGG-CREATOR-KIT-RIGHTS.md:75`）→ **声は Kit の保護外＝我々の責任で権利を揃える**
- Kit §2：生成 AI への入力・AI 利用は OK（同 :30-33）。ただし「利用する AI サービスの規約、第三者の権利」は制作者側
- Kit §5／§6：非公式設定を公式のように表示しない・口調設定本文は非配布 → 台詞は「叫び」に留める（§1-3）
- 台帳：Voice 行は未作成。生成前に `ASSET_RIGHTS_LEDGER.md` に 1 行（サービス・プラン・規約版・確認日・学習 OFF 証跡）が**先**（Brief v1 §0 と同じ運用）

### 1-7. generation method（候補の列挙のみ・実行しない）

| 候補 | 権利 | 品質 | 備考 |
|---|---|---|---|
| (a) AI 音声生成サービス（TTS／voice design） | サービス規約・商用可・学習利用の確認が要る（#5）・登録／有料（#6） | 高いが「大耀本人」の声の定義が無い | コスト **WEB確認必要**（単価・秒課金か本課金かを断定しない） |
| (b) CEO 本人・知人の収録 | 声の権利契約（#5） | ばらつき | 費用 0 の可能性・録音環境次第 |
| (c) `gen-se.mjs` 式の数式合成「掛け声風 SE」（ノイズ＋フォルマント） | ◎（自作） | 「声」には聞こえない可能性【推測】 | Sound Layer v1 の rise で代替可。Voice 不採用時の保険 |
| (d) 既存 Suno 曲からの切り出し | 加工可否は決定120 の範囲内か要確認 | 声ではない | 不採用 |

### 1-8. cost

- モデル・単価・プランは repo に記録なし → **WEB確認必要／CEO INPUT**。金額は断定しない（決定250 §9 の「$0.20 表示価格」は H3 Max 動画の 1 回分であり Voice には使えない）

---

## 2. Enemy Art

### 2-1. 現 Production の再点検【実測】

| 観点 | 現在 | 根拠 |
|---|---|---|
| flatness | 配信 7 体は `d1e3b30` 以降 変更 0。`.enemy-avatar` は紫グロー＋inset のみ（床なし） | `battle.css:1121-1135`・`asset-inventory.md` §2 |
| style mismatch | 世代 A 修復 4／B 生成 3／Kit 神＝3 系統（Brief §1-1 の「白フチ 3 種」） | 【docs】 |
| grounding | 接地影 0。龍神の水しぶきが舞台 `06-dragon-ocean` と二重 | `pc1508-battle-ready.jpg` 目視 |
| facing | HUD：PC/SP とも `scale -1 1`（`battle.css:6845`・`7062-7067`）＝解消。**入口**：原画のまま（`BossEntrance.tsx:216`・PC は神 30%／敵 68% なので左向き 4 体は神の方＝矛盾なし・決定254 known #4）。**敵カットイン**：原画のまま（`BattleEnemyCutin.tsx:64`）＝左向き 4 体（鬼将・機工師・龍神・道化）が自分の必殺で神に背。笑蓮 右向き・才華 keyvisual 鏡像は asset | |
| lighting | high-key 0.08〜0.21 vs 神 0.41〜0.71 不変。決定240 のリム（`battle.css:6986-7030`）は輪郭に光を足すが面の明度は上がらない | 【docs】＋【実測】 |
| silhouette | 機工師 trim 0.48・bboxW 0.565（E5／E6 FAIL）不変 | 【docs】 |
| God・OTOMO との統一 | 神＝Kit セル・OTOMO＝320px 球体・敵＝3 世代＝4 言語のまま | `asset-inventory.md` §7 |

Brief v1 §9 MUST の現状：E2（白マット）世代 A FAIL／E4（足元）龍神 FAIL／E5／E6 機工師 FAIL／E7（high-key）5 体 FAIL／E8（線密度）敵 0.09〜0.17 で下限 0.14 未満が 4 体。**受入は足りていない（変わっていない）**。

### 2-2. 決定247／252／254 で新しく生じた点

1. HUD の反転が PC にも入った（Brief §5-1「PC は原画のまま」は古い）
2. 入口が Full 2.8s で「最初に見る敵の絵」になった（min(34vh,260px)・暗い舞台の上・顕現アニメ）＝high-key と縁の清潔さが最初の 1.5 秒で評価される
3. 必殺が 7 体全員に付き（決定252）、カットイン `enemy-cutin-image` の露出が毎戦 1 回に増えた（原画の向きのまま）
4. 予告 tier のリム `drop-shadow` 24px が縁に乗る（決定240）＝縁の白マットがあるとリムが二重に見える

### 2-3. Brief v1 の改訂点（列挙のみ・生成しない）【AI 判断】

| # | 箇所 | 改訂 |
|---|---|---|
| R1 | §5-1 | 「PC・カットイン・ボス登場は原画のまま」→「**HUD は PC/SP とも反転**（決定247）・敵カットイン（`BattleEnemyCutin.tsx:64`）と入口（`BossEntrance.tsx:216`）は原画のまま」 |
| R2 | §5-2 | v2 を右向きで描く場合、`artFacing` は `.enemy-avatar` だけでなく **入口（PC：神 30%／敵 68%）と敵カットインにも適用**しないと、v2 の 1 体目が入口で神に背を向ける。実装条件として明記 |
| R3 | §10 Human QA | 「入口 Full の顕現（暗い舞台の上）で白フチ・明度が読めるか」を 5 問目に追加。Before/After は `docs/evidence/decision254/pilot/*-entrance-1300ms.jpg` と同じ時刻で撮る |
| R4 | §9 E3 | 発光グロー除外オプション `--glow-ok` を**使わない**（決定240 のリムが縁に乗るため、縁の汚れは二重に見える） |
| R5 | §0 順序 | **試練の影を先頭へ**（初陣プリセット＝恵比寿 × 試練の影 `firstBattle.ts:25`＝新規プレイヤーの最初の敵）。次に機工師（trim FAIL）・道化 |
| R6 | §9 E13 | 構図ロックを **3 面同時**（HUD 240×260 contain・カットイン `enemy-cutin-image`・入口 `boss-entrance-art`）で確認する Gate に拡張 |
| R7 | §4-2 副光 | 決定240／252 のリム色（金・紅蓮）とステージ副光が衝突しないよう、副光は「リムの反対側（左上の主光側）に置かない」を追記 |
| R8 | §13 権利 | 台帳行は「生成前」に作る運用（決定250 で動画の台帳行が後回しになった教訓）。Training OFF の証跡（§2-1 C2）を必須に |

結論：**HOLD 継続**。改訂 R1〜R8 を Brief v1.1 として docs で先に通し、生成は CEO フロー。

---

## 3. Battle Atmosphere（D249／250／252／254 後でも不足するもの）【実測】

| # | 不足 | 根拠（file:line） | 性格 |
|---|---|---|---|
| 1 | Home の静止 | `setup.css` @keyframes **0**（2,924 行）。`HomeScreen.tsx:100-121` の hero は静止 `<img>`＋グラデ `setup.css:2554-2576` | 9/28 Finding 04 のまま。入口（決定254）が解いたのは「戦闘の入口」で Home ではない |
| 2 | 閃光の同形 6 色 | `BattleScreen.tsx:493-503`：`cast-flash-${type}` で `CAST_FX[type]` の PNG 320×480 を**画面中央固定**（`battle.css:185-223` `position:fixed; inset:0`）。6 枚 1,979,287B | 決定249 で主体が反応するようになった分、中央の汎用閃光が「HUD 言語」として浮く |
| 3 | 文章の三重表示 | 同一バッチで `.result-toast`（`BattleScreen.tsx:432-440`・`useBattleFx.ts` DAMAGE/HEAL/BLOCK/PASSIVE で発火）＋ `BattleMiniResult`（:509-518）＋ 浮遊数字（`EnemyPanel.tsx:205`）。決定241 で位置の重なりは解消 | 可読性（決定203／205）の成果なので文言は保護。材質と場所の統一が未着手 |
| 4 | HUD pill | `.ap-gauge` `battle.css:102-113`（radius 999）・`.result-toast` `2092-2097`（radius 999）・結果画面の pill ボタン（`taiyo-ryujin-normal-pc-after.png`） | 9/27 §G の残り |
| 5 | fixed バナー 3 枚 | `.burst-banner` `1946-1961`／`.evolve-banner` `2009-2025`／`.enemy-turn-banner` `2029-2045`＝`position:fixed; inset:0; radial-gradient`＋`system-ui` 26px 太字＋絵文字（`BattleScreen.tsx:571-585` ✨🌱⚔） | 名札（決定235）・カットイン（明朝）・入口（決定254）と別言語。神の一撃の直後に出る「✨ 大耀の一撃！」が premium 動画の余韻を UI 文字で切る |
| 6 | SP の空き帯 | `sp844-battle-ready.jpg`：HUD 下端 y≈190〜敵の絵 y≈400 に吹き出し 1 個（`EnemyPanel.tsx:162-164`・`battle.css:1012-1028` 12px） | 9/27 §A Known Risk 7。舞台の見せ方（構図）の問題 |
| 7 | OTOMO の存在感 | `GodOtomoPanel.tsx:188-212`：320px 画像 0.75 倍・反応は img 再マウント＋`otomo-reacting` pop。接地・向き・台詞 0 | 決定214 で「戦略的役割が決まるまで見た目先行しない」＝設計上の保留 |
| 8 | 敵の無反応場面 | 敵が体で反応するのは `DAMAGE_DEALT`（突き・反応）と WEAKEN の stagger（決定249）と予告 tier の構え（決定240）。**神の GUARD／MEND／ATTUNE／TEMPO／EMPOWER に敵は無反応**（設計どおり・1 バッチ 1 primitive） | 決定248 の設計範囲内。残は「HP 閾値（50／25%）をまたいだ瞬間の一回性反応 0」（9/27 §D ①・`enemy-wound` は静止の赤円 `battle.css:4651-4670`） |
| 9 | RETURN TO CALM | 勝利：舞台（決定226）あり。**敗北／未撃破：`planResultGate`＋120ms で帳票即出し**（`combatTimeline.ts:302-306`・`useCombatPresentation.ts:157-166`）。一撃後の神は idle へ戻るだけ（決定249 は一撃バッチで primitive 無し）。**結果画面の BGM は battle 曲**（`GameFlow.tsx:123` は `inBattle` でしか切替えない・ジングル後 `bgm.ts:176-184` で即再開） | 「静まり」が勝利の舞台にしか無い |
| 10 | 敵カットインの向き | `BattleEnemyCutin.tsx:64` `def.art` 無反転＝左向き 4 体が必殺で神に背 | 決定247 の規則（`.enemy-avatar` のみ）の外。CSS 1 規則で直るが、v2 右向き art が入ると逆に戻す必要（§2-3 R2） |
| 11 | JS 予約の遅れ | 決定254 known #5：`document.timeline.currentTime` が frame 開始で止まる環境で SE・操作開放が ≈230ms 遅れる | `performance.now()` 1 行（NEXT NOW として既出・本監査では触らない） |

---

## 4. Sound（inventory・無音区間・gain・重なり・ジングル・入口）

詳細は `sound-timeline.md`。要点：

| 項目 | 現状【実測】 | 商用 gap【AI 判断】 |
|---|---|---|
| inventory | SE 20（337,372B・自作・◎）／BGM 2／ジングル 2（Suno・△）／Voice 0 | 決め所に固有音 0 |
| 無音区間（1 戦） | 神の一撃 420〜1,600＝**1,180ms**（発動率 55〜80%）／敵必殺 150〜1,260＝**1,110ms**（6/7 敵で毎戦）／入口 Full 438〜1,500＝1,062ms（初回のみ） | 3 つとも「最も見られる 1 秒」が BGM だけ |
| gain | master 0.85・impact 0.45/0.6/0.8/1.0・feedback 0.3・stateChange 0.65・reward 0.7・warning 0.5・bigMoment 0.9・tap 0.4（`feelTier.ts:33-46`） | 天井が `hit_l4` 1 本（R3） |
| 重なり | dedup 30ms（`name@rate`）。7/7 commit の同時層は名前違いで残る | 決定233 の目標 ≤1.4 の実測は未更新 |
| duck | **0**。BGM `volume 0.35` 固定（`bgm.ts:82`） | iOS では `volume` 自体が効かない可能性（R5） |
| ジングル | `pause()` 即停止 → 0.5 で再生 → 自然終了 or 9,000+500 フェード → **BGM 0.35 で即再開**（`bgm.ts:163-205`） | 段差 2 回。勝利ジングルの先頭 ≈5s が静か【docs】＝「撃破」拍の後 5 秒が空く |
| track 切替 | `src` 差し替え＝クロスフェード 0（`bgm.ts:112-115`）。結果画面は battle 曲のまま | 入口の暗転と同時に曲が変わるのは良い。結果→Home の切替は唐突 |
| 入口 SE | `godDescend`＝`resonance_gain`×0.8（188ms・0.55）@250／`boss_entrance`（960ms・0.77）@1,500（`BossEntrance.tsx:33`・`sound.ts:301`） | 神の降臨 1.1s が無音（神紋の 188ms の後） |
| 動画 | `muted`（`godStrikeVideo.ts:67-70`） | 音声トラックは使わない設計（正しい：音は SE 経路で統一） |

---

## 5. 次候補（1 件）— God Strike / Enemy Ultimate Sound Layer v1【AI 判断】

| 項目 | 内容 |
|---|---|
| 何を | ①BGM を WebAudio（`createMediaElementSource`→GainNode→destination）に載せ、`duck(level, rampMs)` を `bgm.ts` に足す。神の一撃（T+0〜1,900）・敵必殺（commit 0〜1,560）で 0.35→≈0.12 ②`gen-se.mjs` に 2 本追加：`burst_rise`（≈900ms・上昇・`burst_ready` の直後 T+450 から）・`enemy_rise`（≈1,000ms・低い唸り・commit+150 から）＝新 SeName 2・`SE_GAIN.rise` 階層（案 0.6）③ジングル：`pause()` の前に 120ms ramp、復帰も ramp |
| なぜこれか（9 軸） | Player Value：一撃と必殺は「解けた／解かれた」の瞬間＝North Star の両端。Strategic Depth：影響 0（表示専用）。Replayability：毎戦 1〜2 回・duck は fatigue を作らない。Game Feel：9 軸で唯一 0 進捗の SOUND を 2 つの決め所で底上げ。UX：ミュート・reduced 既存どおり。Retention：「人に見せたい」録画に音が乗る。Implementation Cost：`bgm.ts`・`sound.ts`・`feelTier.ts`・`useBattleSound.ts`＋`gen-se.mjs`＋テスト。`src/core` 0・画像 0・CSS 0。Regression Risk：決定233 のタップ経路は不変・`planBatch` の時刻に載せるだけ。独自性：神の一撃の音の階層が「READY→rise→着弾」の三段になる |
| 権利 | 自作合成のみ（◎）。購入・AI 生成音源は使わない（SOUND §9 の AI 推奨と同じ）。**§6-3 該当なし**（SOUND §9 の CEO 判断は購入／AI 生成を選ぶ場合のみ） |
| Voice との関係 | Voice の前提 2 つ（duck 経路・新 SeName 階層）が揃う。Voice 採用時は `burst_rise` の上に Voice を重ねるか置き換える |
| Human QA | PC＋**iPhone**（R5 の実機確認を兼ねる）。同 seed Before/After・4 問（一撃が「来る」と感じたか／必殺が「怖い」か／BGM が邪魔しないか／テンポが落ちていないか） |
| 却下案 | A Voice 今すぐ：§6-3 #5／#6 が先・Human QA に生成が要る・fatigue 設計が未検証／B Enemy Art v2：HOLD・Brief 改訂（§2-3）が先・CEO 生成フロー・7 体 × 試行／C バナー 3 枚＋pill の材質統一：露出は 1 戦 2〜3 回で Sound より小さい（**第 2 候補**として分離）／D Home の呼吸：Loop への寄与が最小・9/27 で「既に商用寄り」／E OTOMO：決定214 で禁止／F SP 空き帯：舞台 art 設計が要る／G 敵カットイン反転 CSS 1 規則：v2 art で逆転するため Brief v1.1 と同時に |
| Risk | iOS Safari の `createMediaElementSource` は要素の `play()` がユーザー操作後である必要（既存 `retryOnNextUserGesture` で満たす）【推測・実機確認】。GainNode 化で `volume` と二重にならないよう片方に寄せる。headless では音の実測不可→`seprobe.mjs`（決定233）の予約ログで時刻を検証 |

---

## 6. 実装しなかったこと・触っていないこと

- runtime／`src`／`public`／assets：**変更 0**。CSS／TS／画像／音声／動画／`rules.ts`／`enemies.ts`：0
- 新規生成：画像 0・音声 0・動画 0・H3／fal.ai 0・外部サービス登録 0・課金 0
- ブラウザ自動化 0・新規スクリーンショット 0・vitest／build 0・node 重処理 0（`find`／`stat`／`file`／`grep`／`sed` のみ）
- `docs/DECISIONS.md`：編集 0（統合担当が追記）
- 他 worktree：読むだけ（`C:/Users/kimi1/SevenGodsGame/scripts/premium-reaudit/out/pc-07-cutin.png` を Read で閲覧）
- merge／push／deploy：0。local commit は docs-only 1 件

## 7. runtime 変更 0 の証明

コミット直前に worktree で実行（結果は「§7 実行ログ」）。

```
git -C C:/Users/kimi1/SevenGodsGame-lane3-presentation status --porcelain
git -C C:/Users/kimi1/SevenGodsGame-lane3-presentation diff --stat -- src public
git -C C:/Users/kimi1/SevenGodsGame-lane3-presentation diff --stat 3dd8b5c -- src public scripts package.json
```

期待：`status` は `docs/` 配下のみ／`diff --stat -- src public` は空／baseline 比でも空。

### §7 実行ログ



## 8. 【CEO DECISION REQUIRED】（§6-3 #5／#6・§6-4 形式・1 件）

```
【CEO DECISION REQUIRED】
Issue：God Strike Voice（大耀 1 本）の生成・権利に進むか
AI Recommendation：保留。先に「Sound Layer v1」（§5・自作合成・権利 ◎・§6-2 範囲）を Pilot → Human QA（PC＋iPhone）。
  その結果を見て、大耀 1 本（≤0.6s・2 variant・T+450〜1,050・gain 0.8×master・duck 前提）の生成承認を
  §6-4 で別途提出する。生成サービス・単価・規約は WEB確認必要／CEO INPUT（本書は金額を断定しない）
Reason：God Strike の 1,180ms 無音は Voice が無くても duck＋rise SE で塞がる（§1-1）。Voice は
  ①権利（Kit 対象外・口調設定本文は非配布）②生成手段（#6）③毎戦 55〜80% の fatigue の 3 条件が揃うまで
  Human QA にかけられない。duck 経路（iOS R5）が無いと Voice は BGM に埋もれる
Alternatives：Voice を今すぐ生成（却下：#5／#6 未確認・duck 無しでは評価できない）／
  Voice を永久に不採用（却下：7 神の individuality を音で出す手段が無くなる・動画の無い 6 神の premium 化手段を失う）
Risk：Sound Layer v1 の Human QA が「十分」と出ると Voice の優先度が下がる（それ自体は健全）。
  iOS の WebAudio 化で既存 BGM の再生開始条件が変わる可能性（実機確認で検出）
Impact if delayed：Production への影響 0（Voice は未実装・Sound Layer v1 は Voice と独立）
CEO Action：承認（保留に同意） / 拒否（今すぐ生成に進む→CEO INPUT 5 項目：サービス・プラン・単価・規約・学習 OFF 証跡）
```

- 敵 7 体の生成 HOLD：**現状維持**（新しい判断なし）。Brief v1.1（§2-3）は docs で AI 側が改訂できる
- 依頼（判断ではない）：iPhone で「BGM が SE より大きく聞こえるか」（R5）を Sound Layer v1 の Human QA で確認いただきたい

```
$ git status --porcelain
?? docs/COMMERCIAL_PRESENTATION_AUDIT.md
?? docs/evidence/commercial-presentation-audit/

$ git diff --stat -- src public

(空)

$ git diff --stat 3dd8b5c -- src public scripts package.json

(空)

docs/ 以外の変更：
(なし)
実行日時：2026-10-01T20:26:02Z
```
