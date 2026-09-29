# 決定224 — External Game Visual Benchmark → SEVEN GODS Visual Standard Gate（Final Gate）

- 日付：2026-09-23
- 種別：**GATE ONLY／docs-only**（runtime／assets／tests／branch／SE 生成／画像生成／H3・fal.ai／commit／push／merge／deploy／Ranking／Neon／secrets：すべて 0）
- 判断主体：AI チーム（CLAUDE.md §6-2）。実装 GO は CEO（2026-09-23 承認）。**Human QA 5/5 PASS・Final Verdict PASS（§24）**
- 上位：決定218 **PASS（4/4 YES・確定・不変）**／決定223 Premium Combat Language **SUPPORTED WITH MODIFICATIONS**
- 補助資料：`docs/DECISION223_PILOT_PREFLIGHT.md`（Preflight の発見 A〜F はすべて本書に統合。本書が Final）
- 本書で新たに実コード確認した事項：大耀の推奨デッキ構成（一時テストで出力し即削除・repo 差分 0）、`press.css` の transform／filter 規則、PC／SP の手札コンテナの overflow、`GOD_THEME_COLOR`、`BONUS_TRIGGERED` のフィールド、`reward` SE の形

---

## 0. 結論

| # | 項目 | 結論 |
|---|---|---|
| 1 | Decision224 Gate | **GO WITH MODIFICATIONS**（修正 5 点・§1） |
| 2 | Pilot 対象 | **大耀『豪快な一撃』（`card_taiyo_attack_01`・charged）を維持** |
| 15 | sound | **既存加工**（`reward` を rate 1.5 で再生。新規 SE 0） |
| 16 | 新規 asset | **0**（画像 0・動画 0・音 0） |
| 21 | 実装モデル | **Opus 5 系で妥当**（現行 Opus 5.5） |
| 22 | NEXT NOW | **CEO が本 Gate を承認したら、§17 の 9 ファイルを実装し `:4185` に After 環境を用意する** |

---

## 1. Preflight から変えた点（実コードで判明）

| # | 変更 | 理由（実コード） |
|---|---|---|
| M1 | **READY の material は『豪快な一撃』だけに当てる**（表示専用の許可リスト）。PAYOFF は全 ⚡ 共通 | 大耀の推奨デッキ 20 枚中、charged 条件のカードは **6 枚**（豪快な一撃×2・姉御の号令×2・剛撃・神楽舞）。共鳴が 4 に届いた瞬間、手札の 1〜3 枚が**同時に点火**する（Q6 のノイズ）。1 枚に絞れば、同じ画面で「material あり（豪快）／文字色だけ（剛撃など）」の比較も同時に見られる |
| M2 | **PAYOFF の hit stop は 40 → 50ms、数字は 30 → 34px** | 豪快な一撃は姉御の号令（攻撃+30）込みで 170 ダメージ＝**L3**（hit stop 45ms・数字 30px）になる。40ms／30px では「⚡が本体と同じか小さい」が再発する。50／34 は L3（45／30）より上、L4（60／40）・神の一撃（80／52）より下 |
| M3 | **lift は `transform` ではなく独立プロパティ `translate`／`scale` で行う** | `.card-view` の `transform` は hover（`translateY(-8px) scale(1.04)`）、press（`translateY(1px) scale(0.985)`）、`card-play` keyframe の 3 か所が上書きする。`transform` で lift すると、押した瞬間や使用中に READY の持ち上げが消える。`translate`／`scale` は `transform` と合成されるため衝突しない |
| M4 | **material は inline `boxShadow` を触らず、専用の重ね層（span 1 つ）で作る** | `CardView.tsx` は `boxShadow` を inline style で当てている。class では上書きできない。重ね層なら静的な影・縁・面の光を持たせ、表示切替は `opacity` だけで済む（box-shadow の animate を避けられる） |
| M5 | **PAYOFF の金リングは金の斬撃線（`slash-minor`）と置き換える** | リング・数字・callout・斬撃・SE・自傷（豪快な一撃は 90ms に自分へ 20 ダメージ）が重なると過密。斬撃線を外して要素数を今と同じに保つ |

Preflight の発見 A〜F は維持：A 再点火問題→engine 条件の false→true を JS ref で検出／B tier 格上げ→二重 shake のため shake は minor のまま／C 階層は hit stop・ring・数字・音で作る／D 入力ブロック増分 0ms／E reduced-motion 仕様／F 同一 seed の Before／After QA。

---

## 2. Pilot 対象の最終確認

| 観点 | 豪快な一撃 | 代替：剛撃（共通・charged） |
|---|---|---|
| 決定218 QA で実際に使った | ○ | ○ |
| 1 戦で出会う頻度 | 高（2 枚） | 低（1 枚） |
| 神固有 accent が使える | ○（大耀色 `#e8b33d`） | ×（共通カード） |
| 混ざる要素 | 自傷 20（90ms・自分側の揺れと `self_hit` 音） | なし |

自傷の揺れと音は 90ms に自分側で起き、PAYOFF（240ms）とは 150ms 離れ、場所も反対側。混同の恐れは低い。頻度と神固有 accent の利点が上回るため **豪快な一撃を維持**する。自傷が PAYOFF を濁すかは QA の補助観察に入れる。

---

## 3. NORMAL カード（変更しない）

現行のまま。枠＝タイプ色 2px border、角丸 10px、影は inline `0 6px 14px -9px`、hover（PC のみ）は `translateY(-8px) scale(1.04)`＋光沢 sweep、press は 1px 沈む、使えない時は `filter: grayscale(0.35) brightness(0.72)`。bonus 行は条件成立で金文字（既存）。

## 4. READY カード（`card_taiyo_attack_01` かつ条件成立中）

「金色に光らせただけ」にしないため、**material（縁）＋depth（持ち上げと影）＋light（面の光と 1 回の sweep）**の 3 つを組み合わせる。すべて静的な見た目で、変化は `opacity` と `translate`／`scale` だけ。

| 層 | 仕様 |
|---|---|
| depth | ルート要素に `translate: 0 -3px; scale: 1.02`（hover の 8px／1.04 より控えめ）。重ね層に接地影 `0 10px 16px -8px #000c` |
| material（縁） | 重ね層に内側の細い縁 `inset 0 0 0 1.5px`＝神色（大耀 `#e8b33d`）。上辺だけ明るい線（`#fff3c4`・上から 12% までの linear-gradient）、下辺はやや暗く＝面取りに見せる |
| material（外光） | 外側に弱い光 `0 0 12px -4px` 神色 60%。SP の横スクロール端で切れないよう広がりは 8px 以内 |
| light（面） | 左上から右下への面の光（白 16% → 透明 40%）。光源は左上に固定 |
| 絵 | 隠さない。重ね層は縁と面の光だけで、中央は透明 |
| 無効時 | カード本体の既存 `filter`（grayscale＋暗く）が重ね層にも掛かり、自然に沈む。別処理なし |

神色は `GOD_THEME_COLOR`（`godStyle.ts`）から CSS 変数 `--ready-accent` で渡す。専用カードでないものに将来広げる場合は金 `#ffd166` を既定にする。

## 5. READY への切り替わり

| 項目 | 仕様 |
|---|---|
| 起点 | `previewBonusTrigger(state, def)`（ターン判定を掛けない値）が **false→true** になった描画。`CardView` の `useRef` で前回値と比べる。新規 timer 0 |
| 初期値 | 引いた時点で既に成立しているカードは **点火しない**（重ね層が静かに出るだけ） |
| 点火 | `key` 付きの span を 1 回だけ mount。斜めの光の帯が左から右へ 1 回通る（`translate` と `opacity` のみ） |
| 持続 | 条件成立中は重ね層を表示（`opacity: 1`・180ms で出る）。成立しなくなったら 180ms で消える |
| 再点火 | カードを出した後・ラウンド明け・カットイン明けには **起きない**（起点はターン判定ではなく engine の条件だから）。共鳴が 4 未満に落ちてから再び 4 以上になった場合だけ再点火する（状態が本当に変わった時） |
| 2 枚同時 | 豪快な一撃 2 枚が同時に成立したら、手札の並び順で 90ms ずらす（最大 2 枚） |
| 音 | なし |

## 6. PLAY のつながり

| 項目 | 仕様 |
|---|---|
| カード | 既存の `card-play` 0.28s のまま。重ね層はカードの子なので、持ち上げ・縁ごと一緒に飛ぶ（追加コード 0） |
| 中央の閃光 | 出したカードが READY なら、既存 cast-flash に金の輪を 1 つ足す（`cast-flash-payoff`・0.35s・`transform`／`opacity`） |
| 意図 | 「手札の金の縁 → 中央の金の輪 → 敵の金のリング」と金の線で 1 本につなぐ。カードが敵まで飛ぶ軌道（手札→敵の移動）は Pilot に入れない。レイアウト依存の座標計算が要り、回帰リスクが大きいため |
| 入力 | 既存の 280ms ブロックのまま（増分 0） |

## 7. IMPACT（変更しない）

commit +90ms で神が突き、本体 140 が着弾（姉御の号令込みなら 170）。hit stop は L2 20ms／L3 45ms、敵の揺れ 0.4s、数字 22／30px、`hit_l2`／`hit_l3`。表示 HP は hit stop 後 90ms で減る。自傷 20 は同時刻に自分側へ。

## 8. PAYOFF（全 ⚡ 共通）

| 要素 | 今 | Pilot |
|---|---|---|
| 時刻 | 本体 +150ms（commit +240） | 同じ |
| hit stop | 0 | **50ms**（`BONUS_HIT_STOP_MS`・reduced では 0） |
| 敵の揺れ | minor（`hit-shake-l1` 0.26s・3px） | **同じ**（二重 shake を避ける） |
| 金の演出 | 金の斬撃線 | **金リングに置き換え**（既存 `impact-ring-burst` 0.42s を金色・110px で） |
| 数字 | 20px 金 | **34px 金**・0.9s（数字の表示寿命 900ms に合わせる） |
| 音 | `hit_l1` 0.45 | **`reward` を rate 1.5・音量 0.7**（`hit_l1` を置き換え。1 手の発音数は増えない） |
| callout | 「⚡ 条件成立／共鳴4以上」0.7s | 同じ |
| 撃破と同時 | 既存の L4・最後の一撃経路 | 同じ（金リングは出さない） |

全 ⚡ 共通にする理由：「⚡ は通常ヒットより上」という階層は、カードごとに変えると崩れる。`BONUS_TRIGGERED` は `defId` を持つのでカード単位にも絞れるが、あえて絞らない。

## 9. CALM への戻り

リング 0.42s・数字 0.9s・callout 0.7s で自然に消える。PAYOFF の最後の要素は commit +1,140ms に消える。画面全体の暗転・揺れ・入力ブロックは無い。手札に残った READY カードは静かな重ね層だけ（sweep の繰り返しは無い）。

## 10. タイミング（ms）

**SETUP：共振をタップ（タップ＝0）**

| 時刻 | 出来事 |
|---|---|
| 0〜280 | 既存：card-play・cast-flash・`card_play`（入力ブロック 280 は既存） |
| 280 | commit：共鳴 2→4・`resonance_gain` |
| 280〜460 | 豪快な一撃の重ね層が出る（opacity 180ms）・持ち上がる（`translate` 180ms） |
| 430〜880 | 光の帯が 1 回通る（150ms 遅れて開始・450ms。2 枚目は 520〜970） |

**PAYOFF：豪快な一撃をタップ（commit＝0）**

| 時刻 | 出来事 |
|---|---|
| −280〜0 | 既存：card-play（縁ごと飛ぶ）・cast-flash＋**金の輪 350ms**・神の構え・`card_play` |
| 90 | 本体着弾（hit stop 20／45）・自傷 20（自分側） |
| **240** | **⚡着弾：hit stop 50・金リング 420・34px「⚡-40」・`reward`×1.5（約 340ms）・callout 700** |
| 380 | ⚡分の表示 HP が減り始める（240＋50＋90） |
| 660 | 金リング消える |
| 940 | callout 消える |
| 1,140 | ⚡数字消える＝CALM |

入力ブロック増分：**0ms**。追加 timer：**0**（既存の数字・callout の timer をそのまま使う）。

## 11. 階層 Tier 0〜5 を守れている証拠

| Tier | 場面 | 1 戦の回数 | 入力ブロック | hit stop | 数字 | 画面揺れ／暗転 | 音の大きさ | 範囲 |
|---|---|---|---|---|---|---|---|---|
| 0 CALM | 待機 | 常時 | — | — | — | なし | — | — |
| 1 通常プレイ | 通常カード | 15〜20 | 280 | 0／20／45 | 16／22／30 | なし | 0.45〜0.8 | 敵の立ち絵 |
| 2 READY | 成立した瞬間 | 1〜4 | **0** | — | — | なし | **無音** | カード 1 枚（lift 3px・scale 1.02。hover 8px／1.04 より小さい） |
| 3 PAYOFF | ⚡ | 3〜5 | **0** | **50** | **34** | なし | 0.7 | 敵の周り（リング 110px） |
| 4 共鳴 | 7/7 到達 | ≤1 | 200＋900＋200 | — | — | ゲージ発光・**全画面暗転** | 0.65 | 全画面 |
| 5 神の一撃 | 神技・撃破 | ≤1 | 溜め 600 | 80／90 | **52** | **画面揺れ**・バナー・崩壊 | 1.0 | 全画面 |

- Tier 3 は Tier 1 の最大（L3：45ms／30px）より大きく、Tier 5（80ms／52px）と L4（60ms／40px）より小さい。
- Tier 3 は画面揺れ・暗転・入力ブロックを持たない。これらは Tier 4／5 だけのもの＝**侵食しない**。
- Tier 2 は hover より小さく音もない。**「READY だけ別のゲーム」にはならない**（Q9）。

## 12. PC／SP の見え方と切れ

| 観点 | PC（1508×660・カード 132×190） | SP（390×844・カード 100×158） |
|---|---|---|
| 手札の container | `overflow: visible`（持ち上げ・影は切れない。コメントで明示された設計） | `overflow-x: auto; overflow-y: hidden`・上の余白 30px（低い画面は 26px） |
| lift 3px＋外光 8px | 問題なし | 上の余白 26px 内に収まる |
| 横の切れ | なし | 左右の余白 12px。外光を 8px 以内にすれば端のカードでも切れない |
| 縁 1.5px が見えるか | 見える | 100px 幅でも 1.5px の明るい縁は見える。ただし面の光は小さい |
| 画面外 | なし（全枚表示） | **手札が 5〜6 枚だと点火したカードが横スクロールの外にある場合がある**。Pilot では直さず QA で回数を記録（SP の QA は任意） |

## 13. 性能

| 項目 | 判断 |
|---|---|
| 動かす性質 | `opacity`・`translate`・`scale`・光の帯の `transform` のみ。`box-shadow`・`filter` は **animate しない**（Q11・Q12） |
| filter | 新規使用 0（無効時の既存 filter はそのまま） |
| 追加 DOM | READY カード 1 枚につき重ね層 1＋点火中の帯 1。PAYOFF はリング 1（斬撃線 1 を外すので差し引き 0）。cast-flash の輪 1 |
| JS | `CardView` に ref／state／effect 各 1。新規 timer 0 |
| 容量 | CSS ≈3KB・JS ≈1KB・音 0・画像 0。**合計 ≈4KB**（予算 35KB） |
| 60fps | 合成だけで済む性質に限っているため、PC・SP とも問題にならない見込み。実装後に `perf.mjs` で Before／After を測る |

## 14. reduced-motion

| 要素 | 動作 |
|---|---|
| READY 重ね層 | 表示する（静的） |
| 持ち上げ | しない（`translate`／`scale` なし） |
| 光の帯 | 出さない |
| cast-flash の金の輪 | 出さない |
| PAYOFF hit stop | 0（既存の `ctx.reduced`） |
| 金リング | 出さない |
| 34px 数字・callout・音 | **残す**（情報を失わない） |

## 15. sound：既存加工に決定

| 案 | 判定 |
|---|---|
| 新規 SE | 却下。`gen-se.mjs` の変更と WAV 1 つが要る。既存で足りるなら不要 |
| 不要（`hit_l1` のまま） | 却下。本体より小さい音が残り、耳では「決まった」が階層にならない |
| **既存加工** | **採用**：`reward`（784／1175Hz の 2 音チャイム・戦闘中は鳴らない音）を rate 1.5（約 1,176／1,762Hz・約 340ms）、音量 0.7 で再生し、⚡では `hit_l1` の代わりにこれを鳴らす |

打撃と違う音色なので「別の出来事」に聞こえる。戦闘中に他で鳴らない音なので混ざらない。回復（660〜1,320Hz）より高く、共鳴上昇（110ms）より長いので区別できる。`playBuffer` は rate 指定に対応済みで、WAV 取得失敗時の代替音もある。QA で「区別できない」となった場合だけ、次の段階で新規 SE を検討する。

## 16. 新規 asset
**0**（画像 0・動画 0・音 0・フォント 0）。H3 0。

## 17. 変更予定ファイル（実装時。今は変更しない）

| # | ファイル | 変更 |
|---|---|---|
| 1 | `src/components/battle/cardStyle.ts` | 表示専用の許可リスト `READY_MATERIAL_PILOT`（`card_taiyo_attack_01` のみ。`cardArt.ts` と同じ「ID→見た目」のデータ表で、効果の分岐ではない） |
| 2 | `src/components/battle/CardView.tsx` | `bonusArmed`・`igniteDelayMs` を受け取る。false→true の検出、重ね層、点火の帯、ルートに `card-view-ready` |
| 3 | `src/components/battle/BattleScreen.tsx` | ターン判定を掛けない成立値と、同時点火の順番を渡す。cast-flash に `cast-flash-payoff` |
| 4 | `src/components/battle/enemyVfxTiming.ts` | `BONUS_HIT_STOP_MS = 50` |
| 5 | `src/components/battle/combatTimeline.ts` | ⚡の hit stop に定数を使う（reduced は 0） |
| 6 | `src/components/battle/EnemyPanel.tsx` | ⚡の反応では斬撃線の代わりに金リング |
| 7 | `src/components/battle/battle.css` | READY の重ね層・点火・cast-flash の輪・金リング・34px 数字・reduced-motion |
| 8 | `src/components/battle/sound.ts` | `sfx.bonusPayoff(delayMs)`＝`reward` を rate 1.5・音量 0.7 |
| 9 | `src/components/battle/useBattleSound.ts` | ⚡の着弾だけ `bonusPayoff` を鳴らす |

`src/core`・balance・assets・`scripts/gen-se.mjs`：変更 0。golden・gameVersion は表示層のため不変。

## 18. tests 追加予定（既存テストは変えない）

1. `combatTimeline.test.ts`：⚡の hit stop が 50／reduced で 0。既存の「⚡反応は minor」はそのまま通る
2. 点火判定の純関数（`shouldIgnite(prev, next)`）：false→true だけ true、初回・true→true・true→false は false
3. 同時点火の順番（手札順で 90ms ずつ・最大 2 枚）
4. `READY_MATERIAL_PILOT` の ID が実在し、`bonus` を持つこと
5. `sound.test.ts`：`bonusPayoff` が `reward` を rate 1.5 で鳴らす（既存の fetch モック経路）
6. `src/core` 差分 0 を確認する既存の手順を実行

## 19. Before／After Human QA（最終 5 問）

**方法**：Before＝現行 `:4184`、After＝Pilot の `:4185`。どちらも `?seed=d224-visual-01` を付け、大耀 × 蒼海の龍神 × ふつう × 推奨デッキ × 構えなしで 1 戦ずつ（Before → After の順）。gameplay の発見は決定218 で確認済みなので、今回はコツの説明の有無は問わないが、演出の説明はしない。同じ seed でも出す順番が違えば 2 ラウンド目以降の盤面は変わる。

1. 条件が成立した瞬間、「このカードが今使いどきになった」と説明なしで分かりましたか？
2. READY になった『豪快な一撃』は、ほかのカードより特別な「物」に変わったように感じましたか？
3. カードを使ってから敵に当たり、⚡の追加ダメージが出るまでを、一続きの出来事として感じましたか？
4. ⚡が決まった瞬間は、Before より明確に気持ちよくなりましたか？
5. 演出が邪魔・長い・うるさいと感じましたか？

成功：Q1〜Q4 が YES、Q5 が NO。
補助観察：READY の豪快な一撃と文字色だけの剛撃の差に気づいたか／自傷の揺れが⚡を濁したか／⚡の音を別の出来事として聞き分けたか。

## 20. 撤退条件

次のどれかで Pilot を外し、docs に記録する。

1. Q1〜Q4 のどれかが NO
2. Q5 が YES
3. 入力ブロックの増分が 0ms を超える／SP で long task が Before より増える
4. `src/core` 差分・golden 変化・既存テストの失敗
5. reduced-motion で⚡の数字・callout・音のどれかが消える

外すときは明示したファイルだけ戻す（`git reset --hard`・`git clean -fd` は使わない）。強くする・長くする・動画にする・キャラを動かす方向へは広げない。

## 21. 実装モデル

**Opus 5 系で妥当**（現行 Opus 5.5）。変更は表示層 9 ファイル・数百行規模で、難所は CSS の合成順とタイミング定数の整合。どちらも実コードと既存テストで確かめられる。上位モデルが要る設計判断は本書で済んでいる。

## 22. NEXT NOW（1 つ）

**CEO が本 Gate（GO WITH MODIFICATIONS）を承認したら、新ブランチ `feat/d224-premium-ready-payoff` で §17 の 9 ファイルと §18 のテストを実装し、`:4185` に After 環境を用意する。** 今は実装していない。

---

## 記録
- runtime／assets／tests／branch／SE 生成／画像生成／H3／fal.ai／commit／push／merge／deploy／Ranking／Neon／secrets：すべて 0
- デッキ構成の確認に一時テストファイルを作り、実行後すぐ削除した（repo 差分 0）
- 決定218 PASS は不変。決定223 Preflight は補助資料として保持

---

## 23. 実装記録（2026-09-23・CEO GO 後。Human QA 前のため PASS／FAIL は未判定）

- ブランチ `feat/d224-premium-payoff-pilot`（`feat/otomo-stance-pilot` から分岐）。**未 commit**
- 変更：`readyMaterial.ts`（新規）・`CardView.tsx`・`BattleScreen.tsx`・`enemyVfxTiming.ts`・`combatTimeline.ts`・`EnemyPanel.tsx`・`battle.css`・`sound.ts`・`useBattleSound.ts`。tests：`readyMaterial.test.ts`（新規）・`combatTimeline.test.ts`・`sound.test.ts` に追記のみ
- 仕様どおり：READY は `card_taiyo_attack_01` だけ／点火は engine 条件の false→true のみ／PAYOFF は hit stop 50ms・34px 金数字・金リング（斬撃線と置換）・`reward`×1.5（`hit_l1` と置換）／shake 格上げ・暗転・入力ブロック追加なし
- 実装中の発見：既存 CSS の後勝ち（`.floating-number-damage` が `.floating-number-bonus` より後にある）で、**⚡数字は今まで 20px の赤（#ff9393）で出ていた**。新しい規則は詳細度を上げて金に揃えた（撃破の一撃＝max は従来どおり）。旧 `.slash-minor` の CSS は未使用になったが削除していない

| Gate | 結果 |
|---|---|
| targeted tests | 3 files・25 PASS |
| full suite | 264 files PASS／6 skipped・3,310 tests PASS／9 skipped |
| typecheck（`tsc -b`） | PASS |
| lint（oxlint） | src 0 件（警告は既存の未追跡ビルド出力 `scripts/release-interaction-feel-v1/out/` のみ） |
| clean build | PASS（scratchpad へ出力。baseline の `dist/` は不変）。`index-cY4buVy1.js` 443.73KB（+1.14KB）・`index-BdEGVmgh.css` 152.58KB（+2.58KB）＝**合計 +3.7KB** |
| runtime diff | `src/components/battle/` の表示層のみ |
| `src/core` 差分 | **0** |
| asset 追加 | **0**（`public/` 差分 0・SE は 20 のまま） |
| 入力ブロック増分 | **0ms**。ブロック判定（`isPlayerTurn`・`CARD_PLAY_REVEAL_MS` 280）は無変更。同一 seed・同一手順 12 手で Before／After を 2 回ずつ実測し、差（−19〜+37ms）は Before 同士の揺れ（−37〜+40ms）の範囲内 |
| 新規 timer | 0。animate する box-shadow／filter 0 |
| 再点火 | 同一 seed の 1 戦で READY 成立 2 回＝点火 2 回（12 手・6 ラウンドの間に再点火なし） |
| reduced-motion | 持ち上げ `none`・光の帯／金の輪／金リングは非表示・重ね層は静的表示・⚡数字 34px（`float-up`）・callout・音は残る |
| PC 1508×660 | READY は `translate 0 -3px`・`scale 1.02`・重ね層 opacity 1。手札 container は `overflow: visible` で切れない。console error 0 |
| SP 390×844 | 同上。上の余白内（手札上端から 21px）で切れず、この seed では READY 2 枚とも横スクロールの表示範囲内。console error 0 |

- Before：`http://127.0.0.1:4184/?seed=d223-pilot-01`（HEAD `43c10a4`・`index-X7cOlknS.js`・不変）
- After：`http://127.0.0.1:4185/?seed=d223-pilot-01`（本 Pilot の build）

---

## 24. Human QA 結果と Final Verdict（2026-09-23・CEO 判定）

**FINAL VERDICT：PASS — 技術 Gate 11/11 PASS ＋ Human QA 5/5（Q1〜Q4 YES・Q5 NO）**

| # | 質問 | 回答 |
|---|---|---|
| 1 | 条件が成立した瞬間、「豪快な一撃が今使いどきになった」と説明なしで分かりましたか？ | **YES** |
| 2 | READY になった豪快な一撃は、Before より「特別なカード・物体」に変わったように感じましたか？ | **YES** |
| 3 | カードを使ってから敵へ当たり、⚡追加ダメージが出るまでを一続きの出来事として感じましたか？ | **YES** |
| 4 | ⚡が決まった瞬間は、Before より明確に気持ちよくなりましたか？ | **YES** |
| 5 | 演出が邪魔・長い・うるさいと感じましたか？ | **NO**（※） |

※ Q5 は CEO が最初に「YES」と伝え、直後に訂正した。**正式回答は訂正後の NO**。本記録は訂正後の回答を使う。

条件：Before `http://127.0.0.1:4184/?seed=d223-pilot-01`（HEAD `43c10a4`）→ After `http://127.0.0.1:4185/?seed=d223-pilot-01`（Pilot build `index-cY4buVy1.js`）。大耀 × 蒼海の龍神 × ふつう × 推奨デッキ。

確認できたこと：READY の使いどきを説明なしで認識／カード自体の質感・存在感の向上／Card → Impact → ⚡Payoff が一続き／⚡Payoff の気持ちよさが Before より向上／演出過多ではない。
決定218 PASS（gameplay）は保持。本 Pilot は mechanics を変えず presentation だけを変えた。

**横展開はしない**（他カード・他の神・PAYOFF 以外の演出への展開は、別途 CEO 指示があるまで禁止）。

## 25. 実装差分の再確認（close-out 時点）

- ブランチ `feat/d224-premium-payoff-pilot`・未 commit。変更 10 ファイル（+277／−13）＋新規 2（`readyMaterial.ts`・`readyMaterial.test.ts`）。すべて `src/components/battle/`
- `src/core`・`public/`・balance・`scripts/gen-se.mjs`：差分 0
- 演出追加・再調整：QA 後は一切していない（QA 版 build と同一ソース）

## 26. Known Cleanup：使われなくなった金の斬撃線 CSS

`battle.css` の `.slash-fx.slash-minor`（2 規則・8 行）は、PAYOFF の金リング置き換えで参照 0 になった（src・scripts とも grep 0 件）。

**判断：今回は削除しない（Known Cleanup として残す）。**
- 理由 1：Production で問題が出た場合の撤退は `EnemyPanel.tsx` を戻すだけで済む。CSS を消しておくと、撤退時に CSS も戻す必要があり、撤退の手順が 2 ファイルに増える
- 理由 2：QA 済みのソースから 1 行も変えずに Release Gate へ進められる
- 残すコスト：未使用 CSS 約 0.2KB。見た目・性能への影響なし
- 削除の時期：Production 反映後、撤退の可能性が無くなった時点（次の表示層の変更と同じ commit でよい）

## 27. Production Release 候補としての差分とリスク

| # | 論点 | 事実 | リスク |
|---|---|---|---|
| R1 | **土台のブランチ** | 本ブランチは `feat/otomo-stance-pilot`（master `270b3e7` より 11 commit 先）から分岐。その中に**決定213 OTOMO の構え（Human QA PASS だが Production 未反映）の runtime**が含まれる：`src` 26 ファイル＋1,243 行、うち `src/core` は engine（`otomoStance.ts`・`endRound.ts`・`playCard.ts`）・types（state／event／action）・`rules.ts`・`deckBuilder.ts`・gameVersion テスト | このブランチをそのまま Production にすると、**決定213 も同時に公開される**。213 は `src/core` と gameVersion を変える（保存データ・Daily・記録の互換性に関わる）ため、独自の Release Gate が必要 |
| R2 | 決定224 単独の移植性 | 決定224 の patch（12 ファイル）は **master に競合なしで適用できる**（一時 index での `git apply --check`・作業ツリー不変）。ただし master 上でのビルド・テスト・画面確認は未実施 | 低（213 と重なるのは `BattleScreen.tsx`・`battle.css` の別の箇所のみ） |
| R3 | 全 ⚡ への影響 | PAYOFF（hit stop 50ms・34px 金数字・金リング・`reward`×1.5）は**全カードの ⚡**に効く。QA で確かめたのは大耀 × 龍神の 1 戦のみ | 中。他の神・条件（combo／blocked／enemyBig／lowHp）でも同じ見え方になるが、実画面では未確認 |
| R4 | ⚡数字の色の修正 | これまで CSS の後勝ちで 20px の赤だった⚡数字が、全 ⚡ で 34px の金になる | 低（本来の意図どおり。ただしプレイヤーには見た目の変化） |
| R5 | SP の画面外 | READY の豪快な一撃が手札の横スクロール外に出ることがある（この seed の 1 戦では 0 回） | 低。点火を見逃すだけで、情報（金文字）は残る |
| R6 | 音 | `reward` を 1.5 倍速で再生。WAV 取得失敗時は既存の代替音（ピッチ変更なし） | 低 |
| R7 | engine・保存 | 224 は `src/core` 差分 0・gameVersion 不変・state 追加 0 | なし |
| R8 | 撤退 | 12 ファイルの明示パス revert で撤退可能（Known Cleanup の CSS は残してある） | 低 |

## 28. NEXT NOW（1 つ）

**決定224 の Production Release Gate を、決定213 を含めず master（`270b3e7`）へ決定224 の差分だけを移植した状態で実施する準備として、その範囲（224 単独）で進めてよいか CEO が決める。**

推奨は **224 単独**。理由：213 は `src/core`・gameVersion・保存 state を変えるため別の Release Gate が必要で、同時に公開すると不具合時にどちらが原因か切り分けられない。224 は表示層だけで、master に競合なく適用できる。

【CEO DECISION REQUIRED】
Issue：決定224 の Production Release 候補の範囲
AI Recommendation：決定224 の差分だけを master に移植して Release Gate を行う（決定213 は含めない）
Reason：224 は表示層のみ・`src/core` 差分 0・master に競合なく適用できる。213 は engine・gameVersion・保存 state を変えるため別 Gate が必要
Alternatives：213＋224 を同時に Release（却下：`src/core` 変更と演出変更が混ざり、不具合時の切り分けと撤退が難しい）／本ブランチのまま Release（却下：213 が意図せず公開される）
Risk：master 上でのビルド・テスト・画面確認はまだ（移植後に Gate で実施）。全 ⚡ への PAYOFF は大耀以外で実画面未確認
Impact if delayed：Pilot の成果が Production に届かない。コード上の危険はない（未 commit のまま保持）
CEO Action：承認 / 拒否

---

## 29. Production Release Gate（RC・2026-09-23）— **STOP：Release Blocker 1 件**

CEO 承認（224 単独を master 基点の RC へ移植）に基づき実施。**Production への push／merge／deploy はしていない。**

### 29-1. Baseline と RC
| 項目 | 値 |
|---|---|
| master | `270b3e7`（想定どおり） |
| origin/master | `b0fbd3c`＝Production。master との差は未 push の docs commit 1 つ（決定208 記録）で、`src`／`public`／`api`／設定の差分 0 |
| RC | worktree `C:/Users/kimi1/SevenGodsGame-d224-rc`・ブランチ `release/d224-premium-visual-rc`・HEAD **`1cdc3dc`**（master の上に local commit 1 つ・未 push） |
| 移植方法 | Pilot 作業ツリーの差分（HEAD `43c10a4` 比・224 のみ）を patch 化し `git apply`。競合 0 |

### 29-2. Scope Audit（機械比較）
| 確認 | 結果 |
|---|---|
| Pilot と RC の変更行（369 行） | **完全一致** |
| 変更ファイル | `src/components/battle/` の 12 ファイルのみ |
| 決定213 の混入 | **0**（`\bstance`・`otomoStance`・`構え`・`溜め返し`・`STANCE_` の grep 0。`otomoStance.ts`・`otomoStanceText.ts` は RC に存在しない） |
| `src/core`・`src/hooks`・types・replay（gameVersion）・save schema | 差分 0 |
| assets | build 出力の非 bundle ファイル 211 個が master と名前・md5 とも一致 |
| 入力ブロック判定（`isPlayerTurn`・`pendingCardUid`・`CARD_PLAY_REVEAL_MS`・`cutinActive`） | 変更 0 |
| 新規 timer | 0 |
| READY 対象 | `card_taiyo_attack_01` のみ |

### 29-3. Release Gate（すべて RC 上で再実行）
| # | Gate | 結果 |
|---|---|---|
| 1 | targeted tests | 3 files・25 PASS |
| 2 | full suite | 92 files PASS／6 skipped・**1,163 PASS**／9 skipped（Pilot 時の 3,310 件は main 側 `.claude/worktrees/` のエージェント用コピー 169 ファイルを含んだ計測。RC は src のみ＝master 91 files＋`readyMaterial.test.ts`） |
| 3 | typecheck（`tsc -b --noEmit`） | PASS |
| 4 | lint（`oxlint src`） | 0 件 |
| 5 | clean build | PASS。master build は Production 配信中 bundle と同名（`index-4DPzUUkG.js`／`index-C-pQDi18.css`）。RC は `index-BRQCB5mX.js` 434.88KB（**+1.17KB**）・`index-C8HhB6j4.css` 150.43KB（**+2.58KB**） |
| 6〜9 | runtime／`src/core`／assets／gameVersion・save | 29-2 のとおり |
| 10 | input blocking | 同一 seed・同一 12 手を master build と RC で各 2 回。差（−115〜+60ms）は master 同士の揺れ（−136〜+56ms）の範囲内＝**増分 0** |
| 11 | reduced-motion | 持ち上げ `none`・光の帯／金の輪／金リング非表示・⚡数字 34px（`float-up`）・callout・音は残る |
| 12 | PC 1508×660 | 点火 2＝READY 成立 2（再点火 0）・金リング 3・cast の金の輪 2・⚡数字 34px 金。Pilot `:4185` と同じ観測値 |
| 13 | SP 390×844 | 同上。READY は手札の表示範囲内 |
| 14 | console error | 0（全 run） |

### 29-4. ⚡ Regression（大耀以外を含む 7 組・RC `:4186`・PC）
恵比寿×試練の影／蒼毘×業斧の鬼将／寿楽×藍花の怨霊／才華×銀甲の機工師／笑蓮×乱舞の道化／福永×双牙の魔獣／大耀×蒼海の龍神。7 戦とも撃破・撃破演出（敵の崩壊・「撃破」）・console error 0。

| 確認 | 結果 |
|---|---|
| 通常⚡ | 34px 金・金リング・callout と重ならない（重なり 0） |
| 本体が小さいケース（一撃 50＋⚡30 など） | 本体 16px 赤／⚡ 34px 金で区別できる |
| 本体が大きいケース（姉御込み 170＋⚡70） | ⚡が本体（30px）より上 |
| 複数回⚡ | 1 戦で最大 7 回。毎回同じ見え方・callout は同条件 1R 1 回（既存） |
| 共鳴／神の一撃との階層 | 神の一撃の 52px・カットイン・画面揺れを超えない。⚡と神の一撃の同時発生は観測されず |
| 数字の重なり | 神の一撃の直後（その 52px がまだ消えきらない約 1 秒以内）に次のカードで⚡を出すと、枠が隣接・一部重なる（恵比寿・才華で各 1 回）。色と大きさで区別でき、元々の配置（⚡は横 66%）由来 |
| **撃破を伴う⚡** | **Release Blocker（下記 B-1）** |

### 29-5. Release Blocker（1 件）

**B-1　撃破と重なった⚡の数字が、通常の⚡より小さく赤い（階層の逆転）**
- 事実：⚡の追加着弾で敵を倒した場合（蒼毘×鬼将 R6『一喝』⚡-60、寿楽×怨霊 R6『呪縛』⚡-40）、⚡数字は **20px の赤（#ff9393）**。同じ戦闘の通常の⚡は 34px の金
- 原因：撃破の一撃の数字には `floating-number-max`（52px の最大表示）が付くが、既存 CSS の後勝ちで `.floating-number-bonus`（20px）と `.floating-number-damage`（赤）が上書きしている。**master＝Production でも⚡数字はすべて 20px の赤**（master build で再現・`reg-master/m-sobi-oni.json`）。決定224 は撃破を伴う⚡を意図的に対象外（`:not(.floating-number-max)`）にしたため、この既存の上書きがそのまま残った
- 影響：Production では「⚡はすべて 20px の赤」で一様だった。RC では通常の⚡だけ 34px 金に上がるため、**「決着を決めた⚡」だけが小さく赤い**逆転が新たに見えるようになる。7 戦中 2 戦で発生。Gate の「最後の一撃は常に L4（52px）」「PAYOFF は神の一撃・最後の一撃を超えない／下回らせない」の意図に反する
- 撃破演出そのもの（崩壊・「撃破」・報酬）は壊れていない
- **修正はしていない**（指示どおり STOP）。

**修正案（CEO 承認が必要。1 案）**：`battle.css` の決定224 ブロックに 1 規則を足し、撃破を伴う⚡を最大表示（52px・金・既存 `float-up-max`）に揃える。
```css
.floating-number.floating-number-bonus.floating-number-max {
  font-size: 52px;
  color: #ffe08a;
  animation-name: float-up-max;
  animation-duration: 1.3s;
}
```
理由：Gate §8「撃破と同時：既存の L4・最後の一撃経路」の本来の意図（52px）に実装を合わせるだけで、新しい演出は足さない。変更は CSS 1 規則・数十 byte。reduced-motion では既存の `.floating-number-max { animation-name: float-up }` がそのまま効く。
影響範囲：撃破を伴う⚡の数字の見た目だけ（Production で 20px 赤 → 52px 金）。Human QA 済みの通常⚡・READY・音・timing は不変のため、**再 Human QA は不要**と判断（撃破時のみの変化で、QA 5 問の対象外の場面）。

### 29-6. Known Cleanup／Known Risk
- Known Cleanup：`.slash-fx.slash-minor`（未使用 CSS・§26）
- Known Risk：①神の一撃直後に⚡を出すと数字が隣接（29-4）②SP で READY カードが横スクロール外に出る可能性（今回 0 回）③headless 環境では⚡の絵文字グリフが画像上で判別しにくい（文字列は `⚡-60` で不変・既存と同じ）

### 29-7. 判定
**Release Blocker：1 件（B-1）→ READY FOR CEO PRODUCTION RELEASE APPROVAL には進めない。**
RC は `1cdc3dc` のまま保持（未 push）。preview：Before `:4184`（43c10a4）・Pilot `:4185`・RC `:4186`・master build `:4187`（scratchpad の一時 worktree）。

---

## 30. B-1 修正と Release Re-Gate（2026-09-23）— **Release Blocker 0 → READY FOR CEO PRODUCTION RELEASE APPROVAL**

CEO 承認（B-1 修正）に基づき実施。**Production への push／merge／deploy はしていない。**

### 30-1. B-1 修正内容
`battle.css` の決定224 ブロックに 1 規則だけ追加（RC commit `862367f`・+7 行うちコメント 3 行）。
```css
.floating-number.floating-number-bonus.floating-number-max {
  font-size: 52px;
  color: #ffe08a;
}
```
- 撃破の一撃の数字には既存の `.floating-number-max` が付き、アニメーション（`float-up-max`・reduced-motion では `float-up`）と縁取りはそこから効いていた。潰れていたのは**大きさと色だけ**だったため、2 つだけを戻した（アニメーション指定を足すと reduced-motion の既存規則を上書きしてしまうため入れていない）
- 変更していないもの：READY・通常⚡ 34px・金リング・音・timing・hit stop・敵の反応・入力ブロック・共鳴・神の一撃・`src/core`・balance・gameVersion・save・assets・決定213・未使用の金の斬撃線 CSS

### 30-2. 撃破⚡の再現（B-1 を見つけた 2 ケース・同じ seed・RC `:4186`）
| ケース | 撃破⚡ | 通常⚡ | 「撃破」表示・崩壊・報酬 | console error |
|---|---|---|---|---|
| 蒼毘 × 業斧の鬼将（R6『一喝』） | **⚡-60・52px・金（#ffe08a）**・`float-up-max`・不透明度 1 | 34px 金（6 回） | 崩壊・「撃破」・勝利画面すべて出る | 0 |
| 寿楽 × 藍花の怨霊（R6『呪縛』） | **⚡-40・52px・金**・`float-up-max`・不透明度 1 | 34px 金（2 回） | 同上。「撃破！」と同時に表示されるが、⚡数字（x 357〜557）と「撃破！」（x 約 600〜860）は離れていて重ならない | 0 |

撮影はアニメーションを頂点で一時停止して行った（`reg3/*-paused-num.png`）。過密・視認性低下・階層逆転は見られない。撃破⚡の 52px は、通常カードで撃破した時の最大表示と同じ大きさ（既存の「最後の一撃＝最大表示」）で、神の一撃のカットイン・画面揺れを持たない。

### 30-3. Re-Gate（すべて RC `862367f` 上で再実行）
| # | Gate | 結果 |
|---|---|---|
| 1 | 通常⚡ | 34px 金・`float-up-bonus`（PC・SP・全 run） |
| 2 | 撃破⚡ | 52px 金（30-2） |
| 3 | 撃破表示・崩壊・報酬 | 妨げない（30-2） |
| 4 | Human QA 済みの通常⚡ presentation | 不変（通常⚡の規則は無変更。実測値も修正前と同一：点火 2・リング 3・金の輪 2・34px 金） |
| 5 | 共鳴／神の一撃との階層 | 変化なし（撃破⚡は既存の最大表示に揃っただけ） |
| 6 | PC 1508×660 | PASS（2 run） |
| 7 | SP 390×844 | PASS |
| 8 | reduced-motion | 持ち上げ `none`・光の帯／金の輪／金リング非表示・⚡数字 34px（`float-up`）・callout・音は残る |
| 9 | console error | 0（全 run） |
| 10 | targeted tests | 3 files・25 PASS |
| 11 | full suite | 92 files PASS／6 skipped・**1,163 PASS**／9 skipped |
| 12 | typecheck（`tsc -b --noEmit`） | PASS |
| 13 | lint（`oxlint src`） | 0 件 |
| 14 | clean build | PASS。`index-r-PY8CVw.js` 434.88KB・`index-CRMbnJyl.css` 150.52KB |
| 15 | `src/core` 差分 | 0（`src/hooks`・`public` も 0） |
| 16 | assets 差分 | 0（非 bundle 210 ファイルの md5 が master build と一致） |
| 17 | 決定213 混入 | 0（語の grep 0・変更 12 ファイルはすべて `src/components/battle/`・`1cdc3dc` は Pilot と 369 行一致・`862367f` は CSS 1 規則のみ） |
| 18 | 入力ブロック増分 | 0。ブロック判定のコード差分 0。master build と同じ 12 手の実測差は揺れの範囲内 |

補足（Known Risk・既存）：共鳴 7 に届いた手の直後、カットインが始まるまでの一瞬「ラウンドを終える」が押せる状態になる窓があり、計測がそれを拾う回がある。**master build（＝Production と同じ bundle）でも SP 3 回中 1 回で再現**し、決定224 は該当コード（`BattleScreen.tsx` の cutin 周り）を変えていないため、今回の Release の対象外として記録のみ。

### 30-4. bundle 差（Production＝master build 比）
| | Production（`index-4DPzUUkG.js`／`index-C-pQDi18.css`） | RC | 差 |
|---|---|---|---|
| JS | 433.71KB | 434.88KB | **+1.17KB** |
| CSS | 147.85KB | 150.52KB | **+2.67KB** |
| 合計 | | | **+3.84KB**（予算 35KB） |

### 30-5. Production との差分
- origin/master `b0fbd3c`（Production）→ RC `862367f`：commit 3 つ
  - `270b3e7` docs（決定208 記録・未 push の既存 commit。runtime 0）
  - `1cdc3dc` 決定224 本体（12 ファイル）
  - `862367f` B-1 修正（CSS 1 規則）
- runtime 差分：`src/components/battle/` の 12 ファイル・+363／−13 のみ

### 30-6. Known Cleanup／Known Risk
- Known Cleanup：`.slash-fx.slash-minor`（未使用 CSS・§26。撤退手順を 1 ファイルに保つため残す）
- Known Risk：①神の一撃の直後に⚡を出すと数字が隣接（色と大きさで区別できる）②SP で READY カードが横スクロール外に出る可能性（今回 0 回）③共鳴 7 直後の一瞬の入力窓（既存・master でも再現・本 Release 対象外）④⚡の PAYOFF は全カード共通で、撃破を伴う⚡の見た目が Production の 20px 赤から 52px 金に変わる（B-1 修正・Human QA 5 問の対象外の場面）

### 30-7. 判定
**Release Blocker：0 → READY FOR CEO PRODUCTION RELEASE APPROVAL**
RC：`release/d224-premium-visual-rc` HEAD `862367f`（worktree `C:/Users/kimi1/SevenGodsGame-d224-rc`・local のみ・未 push）。preview：RC `:4186`。

---

## 31. Production Release — **PRODUCTION RELEASE PASS / CLOSED**（2026-09-24 JST・CEO 承認）

| 項目 | 値 |
|---|---|
| Release 直前の確認 | RC `release/d224-premium-visual-rc` HEAD `862367f`／master `270b3e7`／origin/master＝Production `b0fbd3c`（deployment `6547621402`） |
| 決定213 の除外 | 決定212〜213 の 7 commit（`f4d1745`・`c6ca3a7`・`748ea63`・`efdfdf4`・`0144eea`・`6b8f09e`・`1a5dae1`）はいずれも RC の祖先ではない。RC の tree に `otomoStance*`・`stanceDeckSwap*` は 0。origin/master との差分は `src/components/battle/`・docs・決定208 の記録 JSON のみ |
| master を RC へ fast-forward | `270b3e7` → **`862367f`**（`git fetch . release/d224-premium-visual-rc:master`＝fast-forward のみ） |
| `git push origin master` | **02:19:04 JST**（`b0fbd3c..862367f`） |
| Vercel 自動 deploy | GitHub deployment **`6620066497`**（sha `862367f`・Production）**success 02:19:42 JST** |
| Production の配信 | `https://seven-gods-game.vercel.app/` が **`index-r-PY8CVw.js`／`index-CRMbnJyl.css`** を配信。RC の clean build と **md5 一致**（JS `2a6f412df74e`・CSS `b04ea454f025`）。反映直後の数十秒だけ旧 bundle を返す応答が混ざったが、その後は安定 |
| Rollback 先（未使用） | deployment `6547621402`（`b0fbd3c`）。saveVersion 不変のため保存データの巻き戻しは不要 |

### 31-1. Production 上での「含まれていない」確認
| 確認 | 結果 |
|---|---|
| `src/core` | 差分 0（RC の差分監査） |
| gameVersion | `src/core` のデータから計算される値。`src/core` 差分 0・golden テスト PASS で不変 |
| save state | Production と旧 Production bundle（`index-4DPzUUkG.js`）で同じ操作をして保存内容を比較：`version` 9／state の項目名が完全一致 |
| 決定213 | 配信 JS に `otomoStance`・`stanceCarry`・`溜め返し` の文字列 0。保存 state に `otomoStance` なし |

### 31-2. Production Smoke QA（`https://seven-gods-game.vercel.app`・Playwright・空のコンテキスト）
| 項目 | 結果 |
|---|---|
| Home 起動・Battle 開始 | 正常 |
| 大耀『豪快な一撃』READY | 正常（PC・SP とも `translate 0 -3px`・`scale 1.02`・重ね層表示） |
| READY 再点火 | 異常なし（1 戦で成立 2 回＝点火 2 回） |
| 通常⚡ | 34px 金・`float-up-bonus` |
| 撃破⚡ | 52px 金（#ffe08a）・`float-up-max`・不透明度 1（蒼毘 × 鬼将 R6『一喝』⚡-60・頂点で一時停止して撮影） |
| 金リング／cast の金の輪 | 各 3／2（Pilot・RC と同じ） |
| sound／timing | 音源の取得・再生呼び出しでエラー 0（耳での確認はしていない）。入力ブロックの中央値 335〜350ms（RC・master と同じ範囲） |
| 敵撃破 → 勝利遷移 | 正常（崩壊・「撃破」・勝利画面） |
| 共鳴／神の一撃 | 正常（大耀 × 龍神で共鳴 7 → カットイン → 神の一撃を観測） |
| PC 1508×660／SP 390×844 | 正常 |
| console error | 0（全 run） |

Production への追加修正・再 deploy：0。

### 31-3. Known Risk（そのまま記録）
- 神の一撃の直後に⚡を出すと、数字が隣接する
- SP で READY カードが手札の横スクロール外に出る可能性がある
- 共鳴 7 直後に「ラウンドを終える」が一瞬押せる短い入力窓（**既存の Production 挙動・決定224 の対象外**）

### 31-4. Known Cleanup
- 未使用の金の斬撃線 CSS（`.slash-fx.slash-minor`）

### 31-5. 状態
**Decision224：PRODUCTION RELEASE PASS / CLOSED。**
横展開（他カードの READY 化・追加演出）はしない。
NEXT NOW：**Battle Screen Premium Quality Audit**（人気カードゲームとの視覚品質差を戦闘画面全体で実コード・実画面から監査し、次に体感改善量が最大となる箇所を特定する）。本 Release 作業中には開始していない。
