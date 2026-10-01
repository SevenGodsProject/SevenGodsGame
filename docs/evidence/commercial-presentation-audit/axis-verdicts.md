# Lane3 Commercial Presentation Audit — 軸別判定表（9 軸）

- Baseline：Production master `3dd8b5c`（runtime `a611270`＝決定254 LIVE）。worktree `SevenGodsGame-lane3-presentation`（docs-only）
- 比較元：`docs/PRACTICAL_QA_2026-09-28_AUDIT.md`（9/28・Production `d1e3b30`）／`docs/PREMIUM_REAUDIT_2026-09-27.md`（9/27・A〜P 16 層）
- 表記：【実測】＝本 worktree の実コード・実ファイルで確認／【docs】＝既存文書の記述／【AI 判断】／【推測】
- 判定記号：◎ 商用水準／○ 改善済み・残 1〜2／△ 部分改善／× 未改善

| 軸 | 9/28 時点（決定244）【docs】 | 現在 Production（決定249／250／252／254 後）【実測】 | 直った | 残る（file:line） | 判定 |
|---|---|---|---|---|---|
| ART | 敵 4 画風・low-key 0.08〜0.21 vs 神 0.41〜0.71・接地 0（Finding 05 SUPPORTED） | `public/assets/enemies/*` は `d1e3b30` 以降 変更 0（配信 7 体＝`enemies.ts:52/94/131/168/209/245/282`）。神は Kit `front_640`（`gods.ts:45`）。大耀だけ God Strike 動画 720²（`godStrikeVideo.ts:23-24`） | 大耀の決め所 1 枚（動画＋ポスター）が Kit 画風の延長で premium 化 | 敵 7 体の画風・明度・白フチ 3 種混在（Brief §1-1 の実測値そのまま）。才華 keyvisual 鏡像・笑蓮 右向き（asset） | × |
| MATERIAL | HUD ガラス板→名札（決定235）。残：神力 pill・予告帯・トースト pill・絵文字 | 名札＝漆黒＋金で維持。残：`.ap-gauge` pill `battle.css:102-113`（radius 999）／`.result-toast` pill `battle.css:2092-2097`（radius 999・決定241 でアリーナ内へ移動済み＝名札重なりは解消）／`.burst-banner`・`.evolve-banner`・`.enemy-turn-banner`＝`position:fixed; inset:0` の radial＋`system-ui` 太字＋絵文字 ✨🌱⚔（`battle.css:1946-1961`・`2009-2045`、`BattleScreen.tsx:571-585`）／`.cast-flash` は画面中央固定 320×480 PNG×6（`battle.css:185-223`、`public/assets/fx/cast-*.png` 計 1,979,287B） | トーストの重なり（9/27 §G ④）は決定241 で解消 | 3 枚の fixed バナーが HUD と別言語のまま。閃光 6 枚は同形・色違い（9/28 §5-1） | △ |
| DEPTH | 接地影 0・舞台は静止・SP 空き帯 ≈155px | `.enemy-avatar` は `box-shadow` の紫グロー＋inset のみ（`battle.css:1121-1135`）、床要素 0。背後のオーラ輪 `::before` 14s 回転（`1063-1095`）。入口 Full で舞台 bg の scale 1.08→1 が一瞬だけ奥行きを作る（決定254）。SP は HUD 下端〜敵の絵の間に ≈200px の帯（`sp844-battle-ready.jpg` 目視：y≈190〜400 に吹き出しだけ） | 入口の 0.9s だけ奥行きが出る | 戦闘中は 9/27 §N「再検討しない」のまま。OTOMO は 320px 球体が浮遊（`GodOtomoPanel.tsx:188-212`） | × |
| LIGHT | 敵は沈む／神は明るい（素材差）。演出光は閃光と God Strike のみ | 決定240：予告 tier を立ち絵のリム（`drop-shadow` 24px・金／紅蓮）で出す（`battle.css:6986-7030`）。決定254：神色の神紋 `GOD_THEME_COLOR`（`BossEntrance.tsx:196`）。決定250：動画の発光（Human QA Q4 YES） | 「光が意味を持つ」場面が 3 つ増えた（予告・降臨・一撃） | 素材の明度差（high-key）は asset 側のまま | △ |
| MOTION | 札で動くのは 21/60（敵ダメージ札のみ）。Home 0 keyframes | 決定249：7 semantic × 6 primitive で **60/60** の札に反応主体（`cardSemantic.ts:120-127`・`useReactionLanguage.ts`）。決定240：構え。敵 idle 呼吸 3.4s（`battle.css:1137`）。`battle.css` @keyframes **123**／`setup.css` **0**（`HomeScreen.tsx:100-121` の hero は静止 `<img>`） | 戦闘の反応言語は成立（Human QA 3/3） | Home は静止のまま（Finding 04）。OTOMO は img 再マウント＋小反応のみ（決定214 で見た目先行禁止） | ○（戦闘）／×（Home・OTOMO） |
| TIMING | 押下 0ms（決定233）・重い突き 150ms・God Strike 1,600・入口 1.5s skip 不可 | 入口 Full 2,800／操作可 2,400・Short 1,500／1,150・skip 200ms（`BossEntrance.tsx:12-36`）。God Strike：`burst_ready` 0→カットイン 200→解除 1,100→突き 1,300→着弾 1,600→進化 2,500（`enemyVfxTiming.ts:81-106`）。動画は overlay で unmount だけ 1,400 まで延長（決定250） | 入口 skip・Full/Short の 2 尺 | main thread が重い環境で JS 予約が ≈230ms 遅れる（決定254 known #5・`performance.now()` 1 行）。God Strike はスキップ不可（Law 5） | ○ |
| SOUND | SE 20・BGM 2・Voice 0・duck 0（9/27 §O） | **決定233 以降 変更 0**（`sound.ts:34-55` SeName 20・Voice 0）。God Strike：`burst_ready` 0〜420ms の後 **着弾 1,600 まで 1,180ms SE 無し**（動画は `muted`＝`godStrikeVideo.ts:67-70`）。敵必殺カットイン：`enemy_turn` 150ms の後 **1,260 まで 1,110ms SE 無し**（`enemyVfxTiming.ts:31-35`）。BGM は `HTMLAudioElement.volume 0.35` 固定（`bgm.ts:14,82`）・duck 0・home↔battle は `src` 差し替えの即切替（`bgm.ts:112-115`・`GameFlow.tsx:123`）・ジングルは `pause()`→終了で `play()`（`bgm.ts:169,176-184`・フェード 0）。入口 SE＝`resonance_gain`×0.8（`sound.ts:301`）＋`boss_entrance` | 入口に神紋の音が 1 つ付いた（決定254） | 決め所 2 つ（神の一撃・敵必殺）の中身が無音／BGM が状況に反応しない／iOS の `volume` 無効（R5）未確認 | × |
| IMPACT | L1〜L4 hit stop・撃破 52px・God Strike L4 | 不変で強い：stop 30/40/45/60・bonus 50・burst 80・final 90（`enemyVfxTiming.ts:136-153`）、揺れ 3／5px（`useCombatPresentation.ts:127-140`）、敵必殺ビーム（`BattleScreen.tsx:566-568`）。決定250 で着弾前の「溜め」が動画になった | 着弾前 1.2s の視覚的な溜め | 音の天井が `hit_l4` 1 本（SOUND §R3）。L1 と `card_draw` の帯域類似（R4） | ◎（映像）／△（音） |
| RETURN TO CALM | 勝利の舞台（決定226）。敗北は帳票 | 勝利：撃破→崩壊 520→「撃破」拍 380→舞台 850→報酬（`combatTimeline.ts:286-299`）＝山から降りる設計あり。敗北／未撃破：`planResultGate`＝最後の着弾＋HP 表示終了＋120ms で**帳票モーダル即出し**（`combatTimeline.ts:302-306`・`useCombatPresentation.ts:157-166`、`taiyo-ryujin-normal-pc-after.png` 目視：舞台なし・pill ボタン 3 個）。神の一撃後は神が元の idle へ戻るだけ（決定249 は一撃バッチで primitive を出さない）。音：ジングル後に **battle BGM が結果画面でそのまま再開**（`bgm.ts:176-184`・track は `inBattle` でしか切り替わらない `GameFlow.tsx:123`） | 勝利側は決定226 で成立 | 敗北側に「静まり」が 0／結果画面の BGM が戦闘曲／一撃後の神の「収め」なし | △ |

## 9/28 Finding 14 件の現在地（Presentation 該当分のみ）

| # | Finding（決定244） | 対応 Decision | 現在 |
|---|---|---|---|
| 01 | 才華の向き | 決定247（PC 反転は敵のみ） | 才華 keyvisual 鏡像は asset。**残** |
| 02 | 対峙感 | 決定247・254 | HUD は PC/SP とも向き合う。入口は原画の向き（PC では神が左なので一致）。敵カットイン `BattleEnemyCutin.tsx:64` は原画のまま＝左向き 4 体が自分の必殺で神に背。**残 1** |
| 03 | カード反応の単調さ | 決定249 | 60/60 に主体。**解消** |
| 04 | Home の静止 | — | `setup.css` keyframes 0。**残** |
| 05 | 敵の平面感 | 決定240（リム）・247（向き） | 明度・接地・画風は asset。**残** |
| 07 | 一撃ボイス | 決定250（動画のみ） | Voice 0・カットイン 1,180ms 無音。**残** |
| 13 | 敵攻撃の単調さと敵必殺 | 決定252 | 7 敵に名前付き必殺。カットインの音は `enemy_turn` 1 本のまま。**半分** |
| 14 | 入口の没入 | 決定254 | 降臨の間 Full/Short。**解消** |
