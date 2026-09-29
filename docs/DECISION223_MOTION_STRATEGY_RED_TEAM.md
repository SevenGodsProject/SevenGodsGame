# 決定223 — Modern Card Game Motion Strategy RED-TEAM / REALITY-CHECK

- 日付：2026-09-23
- 種別：AUDIT ONLY（runtime／assets 変更 0・commit 0・fal.ai 呼び出し 0・追加課金 0）
- 判断主体：AI チーム（CLAUDE.md §6-2）。docs-only。commit は CEO 承認待ち
- 入力：外部 Benchmark（Web 一次資料優先・3 調査）／SEVEN GODS 実コード棚卸し（`src/components/battle/*`・`battle.css` 6191 行・90 `@keyframes`・assets）／H3 Test01/02（龍神）・ebisu Test01〜03・COV-M（決定204/209/211）の既存素材と記録／決定219〜222 の結果
- 注：CEO の「220/222 差分は cleanup しない」は、222 close-out 指示による撤去完了後に届いた。監査は scratchpad の実装コピー（`d220/*`・`d222/living-block.css`・光マップ・シミュレーション）と docs で行い、材料は失われていない

---

## 0. 結論（先に）

| # | 項目 | 結論 |
|---|---|---|
| 1 | 仮説「Living Background ではなく player-triggered motion へ投資すべき」 | **SUPPORTED WITH MODIFICATIONS**。方向は正しい。ただし修正が 3 つ：①「動画」ではなく **realtime VFX＋SFX＋hit-stop**（Benchmark 9 作品中、試合画面で動画を使う作品は 0）②「毎回のカードプレイ」ではなく **成功が確定した瞬間だけ**（毎手の演出はテンポ苦情の最大源）③SEVEN GODS はすでに大技演出（神の一撃 2.3 秒連鎖・敵必殺カットイン・撃破シーケンス）を持つ。**足りないのは「解けた瞬間（条件ボーナス ⚡ 成立）」の演出であり、そこは現状ほぼ無音**（金文字＋小さな数字のみ・SE なし・バナーなし） |
| 4 | 最大の Visual Quality Gap | 体験レベル：**⚡ 成立の瞬間が無音**（North Star の「鮮やかに決まった」が画面に出ない）。見た目レベル：**キャラクター 21 体が全て静止 1 枚絵**（idle と攻撃が同じポーズ）。後者は高コスト・identity リスク（決定211）で最初の Pilot にしない |
| 5 | 最初に検証する 1 箇所 | **「⚡ 条件ボーナス成立の瞬間（Solve Payoff Moment）」** |
| 7 | H3 | **使わない（現時点）**。既存素材の実測で、生成 0.5 秒後には初フレームから MAE 25〜31（5 秒後の 40 に対し 6〜8 割）＝**短尺でも identity は保てない**。「H3 を使うために機能を作る」は禁止のまま |
| 11 | 決定218 との関係 | **218 Human QA を先に（今のまま・準備済み）**。223 Pilot を先に入れると「感じた」が mechanics 由来か VFX 由来か分離できない。218 = baseline、223 = 同じ QA を演出込みで再測定 |
| 12 | NEXT NOW | **決定218 Human QA（大耀 × 蒼海の龍神・:4184 に復元済み）を実施する**。その結果を持って 223 Pilot（⚡ Payoff Moment）へ |

---

## 1. 前提の検証：「最新カードゲームには必ず動画背景がある」→ **FALSE**

| 作品 | 試合中の背景 | 根拠 |
|---|---|---|
| Hearthstone | 静止盤＋微小な環境粒子（塵・霧・煙）＋角の「クリック玩具」。動画なし | hearthstone.wiki.gg/wiki/Battlefield |
| MARVEL SNAP | 暗いガラス盤＋状態連動グロー。動画なし。動きはカードと VFX に集中 | tiffanysmart.com/work/marvel-snap |
| Pokémon TCG Pocket | **静止**プレイマット（コスメ）。動画なし | game8.co/…/482813 |
| Shadowverse: Worlds Beyond | リーダーの idle アニメ＋ステージ効果（**設定で OFF 可**）。realtime、動画なし | gamewith.net/shadowverse-wb/68449 |
| Yu-Gi-Oh! MASTER DUEL | 3D フィールド＋小さな idle。Mate（マスコット）が反応。動画なし | masterduelmeta.com（Mates / Duel Fields） |
| Legends of Runeterra | 盤スキンに VFX・反応するガーディアン。**Riot は 2023 年に盤スキン制作を停止**（「hit or miss」） | wiki.leagueoflegends.com/en-us/LoR:Board |
| Slay the Spire | **静止**背景（松明のみ） | steamcommunity.com/app/646570 |
| Balatro | 全面シェーダー（強い動き・**酔い対策の設定あり**） | shadertoy XXtBRr／Steam 討論 |
| MTG Arena | 3D 盤＋VFX。社内レビューで「**この VFX はゲームプレイの邪魔**」が常套フィードバック | magic.wizards.com（battlefield 制作記事） |

- 9 作品中、動画背景 **0**。完全静止 **2**（Slay the Spire・Pokémon Pocket ＝いずれも商業的に大成功）。強い常時動き **2**（Balatro・Gwent）で、いずれも酔い・可読性の対策を同梱。
- 「動画があれば商用品質になる」→ **否定**。商用品質は realtime VFX・UI の手触り・カードの質感（SNAP のレアリティ演出、Pocket の 3D カード）で作られている。
- Blizzard の VFX 規範：「VFX はまず盤面を読ませるためにある」「常駐エフェクトはターン中ずっと出ていても**うるさくならず・注意を奪わない**こと」（hearthstone.blizzard.com Developer Insights）。決定220/222 が目指した「気づくが邪魔しない常時背景」は、業界でも**意図的に上限を低く抑える対象**だった。

## 2. Benchmark 表：motion 予算はどこに使われているか

凡例：**常**＝常時／**操**＝プレイヤー操作に反応／**稀**＝成功・レア・大技だけ強く

| 分類 | Hearthstone | MARVEL SNAP | Pokémon Pocket | Shadowverse WB | Master Duel |
|---|---|---|---|---|---|
| A 常時背景 | 常・微小（粒子＋玩具） | 常・状態グロー | 静止 | 常・OFF 可 | 常・微小 |
| B カード自体 | 稀（Golden/Signature/Diamond ＝**課金・希少**） | 常（レアリティ階段：視差→アニメ→枠→Flare ＝**進行報酬**） | 操（傾け 3D・Immersive は**コレクション限定**） | 稀（Fully Animated ＝**報酬限定**） | 稀（Royal 1%・静止フォイル） |
| C プレイ/公開 | 操（レジェンドは専用音楽＋枠） | 操（毎ターン一括公開） | 操（毎操作にアニメ→**ターンタイマーを食う苦情 #1**） | 操（簡易表示設定あり） | 操（毎召喚・スキップ不可） |
| D キャラ反応 | 操（エモート・スキンは課金） | 操（エモート） | 操（エモート） | 常（リーダー idle・OFF 可） | 常（Mate 反応） |
| E 攻撃/ヒット | 操（画面揺れは**トグル**） | なし（数値変化） | 操（毎攻撃） | 操（揺れ・ブラー OFF 可） | 操（汎用） |
| F 能力/コンボ | 操（**0.8s→0.2s に短縮**） | 稀（長ループは**自動早送り**） | 操 | 操 | 稀（エース限定カットイン） |
| G 大技/フィニッシュ | 稀（ヒーロー登場・Mythic） | 稀（最終ターン倍化・SNAP） | 稀（KO） | 稀（進化/超進化カットイン 2〜3s） | 稀（召喚カットイン・**ON/OFF＋クリックスキップ**） |
| H 勝利/結果 | 稀（ポートレート爆散） | 毎回・タップで進行 | 毎回 | 稀 | 稀（Final Blow） |
| I パック | 操（スペースで加速） | 操 | 操（**最も称賛される儀式**・スキップ要望も最多） | 稀（レア演出） | 稀（Royal） |
| J UI 微細 | 常（HS は「our game is UI」） | 常（触感・ハプティクス） | 操（図鑑フリップ） | 常（Live2D ホーム） | — |

**読み取り**
1. 常時 motion の予算は「カードそのもの（希少・課金・進行報酬）」に住んでおり、**盤面の背景には住んでいない**。
2. 最大の motion は例外なく「プレイヤーが起こした稀な成功」（レジェンド着地・進化・召喚カットイン・最終ターン）に集中。
3. テンポは能動的な制約：Blizzard はトリガー演出を 0.8s→0.2s へ、SNAP は自動早送り、MD はカットインを ON/OFF＋スキップ、Pocket は毎操作演出が最大の苦情。**毎回出る演出ほど短く、稀な演出ほど長く**が共通則。
4. 開発者の言（一次）：Ben Brode「splashy and **quick** visual effects に膨大な時間を使った」／LocalThunk「仕込んだ Rube Goldberg 装置が動くのを見るのが楽しい」（＝**スコアが決まる瞬間**に motion）／Blizzard「VFX はまず盤面を読ませる」。

## 3. SEVEN GODS の現在地（実コード・2026-09-23 HEAD 43c10a4）

| 分類 | 現状 | 強さ |
|---|---|---|
| A 常時背景 | 静止ステージ 7 枚＋`arena-glow-breathe` 9s＋`enemy-idle` 3.4s（呼吸） | 業界標準どおり微小。決定220/222 で「上限内では知覚されない」を実証済み |
| B カード | 60 枚とも静止 WebP。ホバーの光沢のみ | 業界の base card と同等（アニメ化は課金/報酬領域） |
| C カードプレイ | `card-play` 0.28s ＋ cast-flash（タイプ別**静止 PNG 6 枚**・0.35〜0.5s）＋神の wind-up 220ms＋SE | 中。汎用で神・カードの個性なし |
| D キャラ反応 | 神・OTOMO・敵 = **全て静止 1 枚絵**（sprite/動画/animated webp なし）。OTOMO 反応ポップ 0.5s、進化 1.2s | **弱**（見た目レベルの最大ギャップ） |
| E 攻撃/ヒット | **強**：4 段の feel ladder（hit-stop 0/20/45/60ms、shake/flash/knockback、数字 20→52px、SE 4 段、arena shake 3/5px）。Phase 6-A で JS/CSS 同期 | 業界水準以上 |
| F 能力/コンボ | **⚡ 条件ボーナス：手札は金文字のみ（アニメなし）、成立時は 150ms 後の小さな追加ヒット＋金の小数字。専用 SE・バナー・予兆なし** | **最弱**。North Star の核心なのに無音 |
| G 大技 | **強**：神の一撃 = 7/7 発光→900ms カットイン→wind-up 0.6s→hit-stop 80ms→52px→バナー→進化（約 2.3s 連鎖）。敵必殺カットイン 1.05s＋ビーム | 業界水準（MD/SWB のカットインに相当） |
| H 勝利/結果 | 撃破シーケンス（final hit-stop 90ms→崩れ 520ms→「撃破！」850ms）→結果段階表示。報酬は pop のみ | 中〜強 |
| I 収集 | 報酬選択は `overlay-card-pop-in` のみ・SE `reward` | 弱（MVP 範囲） |
| J UI 微細 | ホバー・ゲージ段階・トースト。**スキップ／速度設定なし**（OS の reduced-motion のみ） | 中 |
| 音 | SE 20 種（`gen-se.mjs` で生成）・BGM 2＋ジングル 2。**⚡ 専用 SE なし**、神の一撃は `hit_l4` 流用、防御/支援/回復系は数字のみ | 中 |

**要点**：SEVEN GODS は「G 大技」「E ヒット」にはすでに投資済みで、業界に劣らない。空白は **F（解けた瞬間）** と **D（静止キャラ）**。前者は安く・因果が明確・全神全カードに横展開できる。後者は 21 体の rig とidentity 保証が要る（決定211 Future Research の領域）。

## 4. 戦略比較

評価：◎ 強 / ○ 中 / △ 弱 / ✗ 不可

| 戦略 | 気づく | 操作との因果 | 「解けた」強化 | 反復で邪魔しない | 制作コスト | asset 量 | mobile | canonical 保存 | H3 相性 | 拡張性（7神/7敵/60枚） | 商用画質 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Living Background 追加投資 | ✗（4 方式で実証） | ✗ | ✗ | ○ | 高（済） | 中 | △ | ○ | ✗（drift） | △ | △ |
| 2 Animated Card | ○（手札で常時） | △ | △ | △（常時・注意競合） | 高 | **60 枚** | △ | ○ | △ | ✗（60 枚） | ○（課金領域） |
| 3 Card Play / Attack VFX 強化 | ◎ | ◎ | △（全カード同じ） | **✗（毎手 15〜25 回/戦）** | 中 | 少 | ○ | ○ | ✗ | ◎（汎用） | ○ |
| 4 God/OTOMO Character Reaction | ◎ | ○ | △ | ○ | **高（21 体 rig）** | 多 | △ | **△（決定211）** | ✗（drift） | ✗ | ◎ |
| 5 **⚡ Conditional Payoff 演出** | ◎ | ◎（自分の仕込みの結果） | **◎** | ○（1 戦 2〜5 回・≤0.6s） | **低** | **0〜1** | ◎ | ◎（既存絵を動かさない） | ✗ | ◎（5 条件 × タイプ色で全カード共通） | ○ |
| 6 God Strike cinematic 強化 | ◎ | ○ | ○ | ○（1 戦 ≤1 回） | 中〜高 | 7 神分 | ○ | △〜○ | △（1〜2s でも drift） | △（7 本） | ◎ |
| 7 Victory / Result cinematic | ◎ | △（結果） | ○ | ◎（1 戦 1 回） | 中 | 少〜中 | ○ | ○ | △ | ○ | ○ |
| 8 最小 Motion System（5＋7＋SE 補完） | ◎ | ◎ | ◎ | ○ | 中 | 少 | ○ | ◎ | ✗ | ◎ | ○ |

- **5 が唯一「解けた快感」に直結し、かつ最安・最も拡張しやすい**。8 は 5 の成功後に組む。
- 3 は毎手発火＝Pocket 型のテンポ苦情を SEVEN GODS に持ち込む。6 はすでに強く、逓減。4 は見た目のギャップだが決定211 の教訓（identity）と 21 体分のコストで最初にしない。

## 5. Red-Team（疑いと判定）

| 疑い | 判定 | 根拠 |
|---|---|---|
| 「動画があれば商用品質」 | **否** | 9 作品中 0 が試合中に動画。商用品質は realtime VFX・UI 触感・カード質感 |
| 「背景より戦闘演出が重要」 | **真、ただし条件付き** | Blizzard「VFX はまず読ませる」。戦闘演出でも**毎回出るものは短く**が前提 |
| 「動画より SFX/hit-stop/camera/VFX の ROI が高い」 | **真** | SEVEN GODS は hit-stop・shake を実装済みで効いている。⚡ は SE すら無い＝最安の最大効果 |
| 「毎回動画を見せるとテンポを壊す」 | **真** | Pocket（毎操作演出 = 苦情 #1）、MD（チェーン演出）、HS（0.8s→0.2s 短縮） |
| 「7 神すべてに動画が必要か」 | **否** | 大技のキャラ固有演出は業界でも「エース/課金限定」。⚡ は汎用言語＋色で 7 神共通 |
| 「60 カード全部動かすか」 | **否** | base card は全作品で静止。カードアニメは希少・課金領域 |
| 「AI 動画の identity drift は短尺なら許容できるか」 | **否（実測）** | §6 |
| 「skip/短縮/反復対策が要るか」 | **要** | SEVEN GODS にはスキップ・速度設定がゼロ。⚡ 演出は ≤0.6s・入力非ブロック・反復で伸びない設計にする |
| 逆仮説「本当のギャップは静止キャラでは」 | **半分真** | 見た目レベルではそう。ただし Pilot としては高コスト・identity リスク。⚡ の結果を見てから判断 |

## 6. H3 / image-to-video の適性（既存素材の実測・追加生成 0）

既存の H3 動画（`SEVENGODS_H3_Dragon_LivingBackground_Test01.mp4`・`ebisu-h3-test01.mp4`）から時刻別フレームを抽出し、luma MAE を測定（scratchpad `d223/drift.cjs`）：

| t(s) | 龍ステージ H3 vs canonical | 龍 H3 vs 初フレーム | 恵比寿 H3 vs 初フレーム |
|---|---|---|---|
| 0 | 15.8 | 0.0 | 0.0 |
| **0.5** | 27.3 | **25.2** | **30.8** |
| 1 | 32.5 | 31.2 | 37.6 |
| 2 | 38.7 | 38.2 | 41.8 |
| 5 | 41.2 | 40.3 | 33.5 |

- **0.5 秒で 5 秒分のドリフトの 6〜8 割に達する**。「1〜2 秒の必殺カットインなら drift は許容」は成立しない。COV-M v2 は露出 12→拡大でも帽子の縁 1 箇所の崩れを CEO が認識して FAIL（決定211）。
- H3 が向く場所：**canonical を含まない**素材（抽象的なエネルギー・水しぶき・光のテクスチャを VFX の**ソース**として切り出す）。ただしその用途は procedural／既存 PNG で代替でき、決定219 で「水のみ抽出」も構造物ゴーストで NO-GO。
- H3 が向かない場所：神・OTOMO・敵・ステージの canonical が映る全て（カットイン、God Strike、victory splash、card illustration micro-animation）。
- **結論：使わない。** 将来使う場合の Gate（追加生成前に固定）：①identity：クリップ全フレームで source との MAE ≤ 8（今回は 0.5s で 25）②cost：1 素材あたりの生成回数上限と単価を事前記録 ③repeatability：同 seed で再生成しても同一出力であること（拡散動画は非決定＝差し替え不能なら不採用）④用途：canonical 被写体を含まないこと ⑤fallback：無くても同一体験（COV-M と同じ）。

## 7. Narrow Pilot 仕様：「⚡ Solve Payoff Moment」

| 項目 | 仕様 |
|---|---|
| 対象（1 つ） | **条件ボーナス ⚡ が成立して発火した瞬間**（5 条件共通の 1 言語。Pilot は 大耀 × 蒼海の龍神 × 推奨デッキ＝決定218 と同一構成） |
| 演出の中身 | ①予兆：手札の ⚡ が「成立」に変わった瞬間に**1 回だけ** 400ms のパルス（ループ禁止・現状は金文字のみ）②発火：既存の bonus impact step（+150ms）に **hit-stop +40ms・金のリング burst・「⚡ 条件成立 +N」ミニバナー 500ms・専用 SE 1 音**を追加 ③色は `TYPE_STYLE` のタイプ色を流用 |
| 最小 asset | 画像 **0**（CSS のみ）。SE **1**（`scripts/gen-se.mjs` で生成・外部素材 0） |
| 最大時間 | 追加分 **≤ 600ms**。入力を**ブロックしない**。既存の神の一撃・敵カットインと重なる場合は ⚡ を省略（優先度：大技＞⚡） |
| skip / repeat | スキップ不要な長さに抑える。同一戦で何度発火しても伸びない。`prefers-reduced-motion` は flash＋SE のみ |
| 変更範囲 | `battle.css` 追記・`useFloatingNumbers`/`useCombatPresentation` の bonus step 拡張・`sound.ts` に 1 SE。**engine/core 差分 0・golden 不変** |
| Gate（実装前固定） | ⚡ 発火頻度（600 試合 sim）が 1 戦 2〜5 回に収まる／追加時間 ≤600ms／入力ブロック 0／1191 tests PASS／`src/core` 差分 0／reduced-motion で動作 |
| Human QA 成功条件 | 決定218 と同じ 1 戦（baseline 済み）を演出ありで再プレイ。①「⚡ が決まった瞬間が分かった」＝Yes ②「自分が仕込んだ結果だと分かった」（因果）＝Yes ③「気持ちよかった／もう一度狙いたい」＝Yes ④「テンポが悪くなった」＝No ⑤可読性低下＝No。**ブラインドは不要**（操作起因の演出は因果を測る） |
| 撤退条件 | ①〜③のいずれかが No、または④⑤が Yes → 明示パスで撤去し docs に記録。**強度アップ・動画化・キャラ rig への横滑りはしない**。motion 投資を止め、決定217/218 のゲームループ改善へ戻る |

## 8. 決定218 との関係と NEXT NOW

- 218 は「Setup→Payoff を**今の画面で**感じられるか」を測る。223 Pilot を先に入れると、感じた理由が mechanics か演出か分離できない。
- 218 の Human QA 環境は **:4184 に復元済み**（HEAD 43c10a4・`index-X7cOlknS`・runtime/assets 差分 0）。コスト 0・所要 1 戦。
- **順序：218 Human QA（baseline）→ 223 Pilot 実装 → 同じ QA を再実施（演出の差分を測る）**。
- **NEXT NOW（1 つ）：決定218 Human QA を実施する。**

## 9. 記録
- 本監査は docs-only。runtime／assets／commit／push／deploy／fal.ai／課金：すべて 0。
- 一次資料 URL は §1〜2 の各行と調査エージェントの報告に基づく。公式に演出の秒数を明記した資料は無く、秒数は報道・コミュニティ観測に基づく概算。
