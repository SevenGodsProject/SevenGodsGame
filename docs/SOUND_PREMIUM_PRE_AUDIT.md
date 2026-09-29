# SOUND PREMIUM PRE-AUDIT — 戦闘の「音の言語」監査（audit／root cause／design のみ）

- 日付：2026-09-27　／　種別：**docs-only 監査**（runtime 変更 0・新規音源 0・音源生成 0・commit なし）
- 対象コード：Production と同一の worktree `C:/Users/kimi1/SevenGodsGame-d230-rc`（`45bfc9e`＝決定230 RC）
- 判断の区分：本書の推奨・仕様は **AI判断**（CLAUDE.md §6-2）。CEO 判断が要る事項は §9 に分離
- 証拠：`scripts/sound-premium-audit/`（`analyze.mjs`＝音源の数値解析／`seprobe.mjs`＝実戦 6 戦の SE・BGM 予約の採取／`bgmwindows.mjs`＝BGM・ジングルの時間窓 RMS／`summarize.cjs`＝タップ基準の時刻表）、出力は同 `out/`（`analyze.json`・`analyze.txt`・`seprobe.json`・`timing.md`・`bgmwindows.json`）
- 前提：**AI は音を聞けない**。以下の数値はデコード後の波形から計算した値。音色・心地よさの評価は【推測】と明記し、最終判断は CEO の Human QA（耳）で行う

---

## 0. 結論（表）

| 項目 | 結論 |
|---|---|
| 一番の問題（ROOT CAUSE） | **音が「押した瞬間」ではなく「結果が確定した瞬間（commit）」に鳴る設計**。タップ後 **280ms は無音**（実測の最短 286ms）、その後 `card_play` と着弾音が 90ms 差で続けて鳴る。さらに**同じ音源が同時に重ねて鳴らされる**（開幕 `card_draw`×5、ラウンド毎 ×2、共鳴 +2 で `resonance_gain`×2）＝位相の揃った同一波形の加算で、意図しない音量の跳ね（×5 で約 +14dB）と 7/7 の瞬間の 7 層の団子が起きている |
| 二番目の問題 | **最上段が 1 つの音に潰れている**：重い L4 カード・神の一撃・撃破の一撃がすべて同じ `hit_l4`（実効 −6.2dBFS）。最頻の L1（6.7 回／戦）は `card_draw` とスペクトルがほぼ同じ（重なり係数 0.963） |
| 音源の性質 | SE 20 本はすべて `scripts/gen-se.mjs` の数式合成（22.05kHz mono・計 337,372B）。BGM 4 曲は Suno 生成（決定120 で商用利用可を確認済み）。Creator Kit に音源は **0 件** |
| 推奨 Narrow Pilot（1 つ） | **Tap Feedback v1**：①タップの瞬間（0ms・クリック処理の中）に既存 `card_play` を鳴らす ②commit 時の `card_play` をやめる（二重再生を無くす） ③同じ音源が 30ms 以内に重なる再生を 1 回にまとめる ④「ラウンドを終える」も押した瞬間に同じ音を低め（×0.85 速）で鳴らす。**新規音源 0・音量の段（L1〜L4）と着弾時刻は不変** |
| 変更予定ファイル | `sound.ts`・`feelTier.ts`・`useBattleSound.ts`・`src/hooks/useGameEngine.ts`・テスト（`sound.test.ts`＋新規 1）。**Lane 2（決定232）・Lane 3・HUD の変更ファイルとは 0 件重複** |
| 主な数値目標 | タップ→最初の音 **286ms → 0ms（予約オフセット 0・クリックから ≤30ms）**／commit の `card_play` **16.5 回／戦 → 0**／同一音源の 30ms 内の重複 **1 戦あたり 7〜11 組 → 0**／7/7 の瞬間の同時層 **7 → ≤5**・合計 gain **2.08 → ≤1.4** |
| CEO 判断 | Pilot 自体は不要（§6-2 の範囲）。**音源の新規制作・購入・AI 生成**（SE の質の底上げ・勝利ジングル差し替え）は §9 で AI 推奨付きで分離 |
| Verdict | **GO（Pilot 実装可）**。Lane 2 の Human QA と並走可能（ファイル競合 0・着弾時刻は `planBatch` に追従するので Lane 2 の重い突き 190ms にも自動で合う） |

---

## 1. SOUND INVENTORY

### 1-1. SE（`public/assets/se/*.wav`・20 本・計 337,372B）

原本は 22.05kHz／16-bit／mono（`gen-se.mjs` L7・`writeWav`）。下表の数値はブラウザが 48kHz にデコードした波形から計算（`analyze.mjs`）。
**実効**＝「50ms 窓の最大 RMS（dBFS）＋ 20·log10(再生 gain)」。再生 gain は `SE_GAIN[役割] × master 0.85`（`feelTier.ts:33-42`・`sound.ts:233-265`）。
**回数／戦**＝`seprobe` 実戦 4 戦（大耀×龍神・才華×影・寿楽×魔獣・才華×機工師）の平均。打撃の回数は Lane 2 の 980 戦シミュレーション（`scripts/lane2-combat-feel/out/sim-frequency.md`）の方が信頼できるので併記。

| SE | bytes | 長さ／聞こえる長さ(ms) | peak／RMS(dBFS) | 立ち上がり(ms) | 重心(Hz) | 帯域 %（<250／250-2k／2-6k／>6k） | 再生 gain | **実効(dBFS)** | 用途 | 回数／戦 |
|---|---|---|---|---|---|---|---|---|---|---|
| card_play | 2,690 | 60／40 | −0.4／−13.2 | 2 | 1,016 | 1／86／11／3 | 0.255 | **−24.3** | commit（タップ +280ms） | **16.5** |
| card_draw | 4,896 | 110／100 | −0.4／−12.1 | 11 | 3,461 | 0／9／83／8 | 0.204 | −23.4（×5 同時で約 −9.4） | ドロー | **22.5** |
| hit_l1 | 5,336 | 120／100 | +0.8※／−11.8 | 9 | **3,496** | 5／7／79／9 | 0.383 | −16.8 | 着弾 L1 | 2.3（sim **6.70**） |
| hit_l2 | 7,542 | 170／140 | +0.1※／−11.4 | 7 | 2,183 | 37／11／46／6 | 0.51 | −13.1 | 着弾 L2 | 1.0（sim 1.01） |
| hit_l3 | 11,510 | 260／210 | −0.9／−10.8 | 3 | 402 | 89／5／4／2 | 0.68 | −9.5 | 着弾 L3 | 1.0（sim 0.92） |
| hit_l4 | 25,622 | 580／460 | **+2.2**※／−9.6 | 0（窓最大）| 2,008 | 64／3／17／16 | 0.85 | **−6.2** | L4・**神の一撃**・**撃破** | 3.3（sim 0.73＋0.22＋1.0） |
| reward ×1.5 | 22,536 | 340（1.5 倍速） | −0.9／−9.3 | — | 1,052→約 1,580 | 0／97／3／0 | 0.595 | −10.4 | **⚡追加着弾**（決定224） | 1.5（sim 0.94） |
| reward | 同上 | 510／450 | 同上 | 135 | 1,052 | 同上 | 0.595 | −10.4 | 報酬画面 | ≤1 |
| resonance_gain | 6,660 | 150／140 | −0.9／−8.9 | 45 | 1,614 | 0／97／3／0 | 0.255 | −18.4（×2 同時で約 −12.4） | 共鳴 +1 | 6.5 |
| burst_ready | 18,566 | 420／370 | 0／−10.8 | 79 | 2,891 | 0／59／21／21 | 0.553 | −12.2 | 共鳴 7/7 | 1.5 |
| evolve | 28,710 | 650／600 | −0.9／−8.3 | 224 | 814 | 0／98／2／0 | 0.553 | −11.0 | OTOMO 進化 | 1.3 |
| block | 4,014 | 90／60 | −0.4／−16.4 | 2 | 1,239 | 0／95／3／3 | 0.408 | −21.8 | ブロック | 5.8 |
| heal | 19,448 | 440／400 | −0.9／−8.6 | 186 | 1,059 | 0／98／2／0 | 0.442 | −13.1 | 回復 | 1.8 |
| divination | 12,834 | 290／260 | −0.9／−9.2 | 74 | 880 | 0／99／1／0 | 0.442 | −13.3 | 託宣 | 0（probe では未使用） |
| self_hit | 6,660 | 150／120 | −0.9／−11.1 | 5 | 245 | 93／5／2／0 | 0.51 | −13.0 | 被弾 | 3.0（sim 12.1 被弾／戦） |
| self_hit_heavy | 18,566 | 420／350 | −0.9／−9.6 | 14 | 120 | 97／2／1／0 | 0.68〜0.85 | −7.8 | 必殺・連撃 3 発目 | 0.5 |
| enemy_turn | 6,660 | 150／110 | −0.9／−12.9 | 2 | 389 | 80／16／2／2 | 0.425 | −16.4 | 敵ターン | 4.3 |
| enemy_charge | 22,094 | 500／440 | −0.9／−12.2 | 56 | 244 | 89／9／1／0 | 0.425 | −14.1 | 溜め | 0.5 |
| boss_entrance | 42,380 | 960／900 | −0.8／−7.9 | 68 | 795 | 16／81／3／0 | 0.765 | −6.1 | 開幕 | 1 |
| victory_sting | 39,734 | 900／810 | +0.1※／−9.3 | 125（窓最大） | 1,498 | 0／87／4／9 | 0.612 | −9.8 | 「撃破」一拍 | 1（勝利時） |
| defeat_sting | 30,914 | 700／600 | −0.9／−11.4 | 13 | 243 | 48／52／0／0 | 0.553 | −11.4 | 敗北 | 1（敗北時） |

※ 原本は `normalize(…, 0.9)`＝−0.9dBFS。48kHz への再標本化で **サンプル間ピーク（true peak）が最大 +2.2dBFS**（hit_l4）。gain 0.85（−1.4dB）を掛けても +0.8dBTP。神の一撃 2 連（110ms 差、`神楽舞`で実測）では重なり部分でさらに上がる＝出力段のクリップの可能性【推測：耳で要確認】。

**音色の近さ**（32 帯域パワー分布の Bhattacharyya 係数。1＝同じ、0＝重ならない。`analyze.json.sim`）
- **card_draw ↔ hit_l1 = 0.963**（全ペア中 1 位）。最頻の一撃（L1）が、1 戦 22 回鳴るドローの「シュッ」と周波数の形がほぼ同じ
- hit_l1 ↔ hit_l2 = 0.777、hit_l3 ↔ hit_l4 = 0.707（上下の段は近い）、hit_l2 ↔ hit_l3 = 0.331（**L2→L3 で音の性格が切り替わる**：重心 2,183Hz → 402Hz）
- burst_ready ↔ victory_sting = 0.875、evolve ↔ victory_sting = 0.881（「上がるチャイム」系が 1 家族）
- reward（⚡）↔ 打撃 4 段 = 0.14〜0.22（**⚡は打撃とはっきり別の色**＝決定224 の狙いどおり）
- Benchmark の「音色 2 系統」は数値でも裏付けられる：**ノイズ＋サブ低音の打撃系**と**正弦波チャイム系**（divination／heal／resonance_gain／evolve／reward／victory_sting が同じ `chime()` 関数）

### 1-2. BGM・ジングル（`public/assets/bgm/`・Suno 生成・決定120 で商用可を確認済み）

`bgm.ts` は `canPlayType('audio/webm; codecs="opus"')==='probably'` なら webm、そうでなければ mp3。

| 曲 | webm／mp3 bytes | 長さ | RMS（全体） | 帯域 %（<250／…） | 使い方 | 実効 |
|---|---|---|---|---|---|---|
| battle | 1,945,366／3,735,973 | 311.3s | −19.7 | 65／22／11／2 | 戦闘ループ・vol **0.35** | RMS −28.8・短時間最大 −20.3 |
| home | 1,650,886／2,910,294 | 242.5s | −19.3 | 51／43／5／1 | 画面外ループ・0.35 | — |
| victory | 1,829,426／3,356,988 | 279.7s | −18.4 | 63／30／6／1 | 勝利ジングル・vol 0.5・**先頭 9s だけ**（`JINGLE_MAX_MS`） | 先頭 0〜5s は **−30〜−35dBFS** → 実効 −36〜−41 |
| defeat | 1,727,978／3,026,278 | 252.1s | −18.0 | 47／50／3／0 | 敗北ジングル・0.5・先頭 9s | 先頭 9s は −26〜−33 |

時間窓（`bgmwindows.json`）：
- **victory の先頭 5 秒は −35→−30dBFS の静かなイントロ、5 秒目から −18dBFS**。9 秒でフェードアウトするので、実際に聞こえる「勝利の音楽」は 5〜9 秒の 4 秒だけ。撃破直後に大きく聞こえるのは合成の `victory_sting`（0.9s）のみ
- battle の先頭 5 秒も −30〜−25（静かな入り）、6 秒目から −19。末尾 3 秒は −93dBFS（無音）＝**ループの継ぎ目で約 3 秒の無音**＋静かなイントロ 5 秒が 311 秒ごとに来る
- 戦闘中の BGM は **1 曲・音量固定**（状況で変化しない。決定225 §O と一致）

### 1-3. 公式素材（Creator Kit）と権利
- `docs/assets-kit/manifest.json`：画像 42 点のみ、音源 **0**、`godVoiceRulesIncluded: 0`
- `SGG-CREATOR-KIT-RIGHTS.md` L75：「第三者が権利を持つ音楽、音声…は対象外」。**ゲームに流用できる公式音源は無い**
- SE は `docs/SE_ASSETS.md` のとおりプロジェクト所有（数式合成）。BGM は決定120（Suno 有料プラン時の生成を CEO が確認）

---

## 2. CURRENT TIMING MAP（Production 45bfc9e。時刻は**タップ＝0ms**、commit＝280ms）

コード上の予定（`useGameEngine.ts:392-402` の `CARD_PLAY_REVEAL_MS=280`、`enemyVfxTiming.ts`、`combatTimeline.planBatch`、`useBattleSound.ts:34-86`、`useCombatPresentation.ts:143-166`）と、実測（`out/timing.md`、ヘッドレスは setTimeout が遅れることがあるので**予約の相対差**で照合）。

| 段（Lane 2 の hit stop） | 押した瞬間 0ms | commit 280 | 着弾 | その後 | 実測（commit→着弾の差） |
|---|---|---|---|---|---|
| タップ（押下） | **無音** | `card_play` 0.255 | — | — | タップ→最初の音 **最短 286ms**（通常 4 戦の全 66 タップ中。中央値 536ms はヘッドレスの setTimeout 遅れ込み） |
| Normal L1（stop 30＊） | 無音 | `card_play` | **370** `hit_l1` 0.383 | — | +90（一撃・一心不乱・速攻・独奏） |
| Normal L2（40＊） | 無音 | `card_play` | 370 `hit_l2` 0.51 | — | +90（剛撃） |
| Heavy L3（45） | 無音 | `card_play` | 370（**Lane 2 決定232 後は 470**）`hit_l3` 0.68 | — | +90（渾身・大喝）。Lane 2 後は +190（Lane 2 A3 で実測済み） |
| Heavy L4（60） | 無音 | `card_play` | 370（Lane 2 後 470）`hit_l4` 0.85 | 画面揺れ 3px | +90（神託） |
| ⚡ Bonus（50） | 無音 | `card_play` | 本体 370 → **520** `reward`×1.5 0.595 | 金リング | 本体 +150（豪快な一撃・連撃・剛撃） |
| 共鳴 +1 | 無音 | `card_play`＋`resonance_gain`（**+2 なら同時に 2 回**） | — | — | 同時刻 |
| 7/7 READY→God Strike（80） | 無音 | `card_play`＋`resonance_gain`＋**`burst_ready`**＋ドロー×3＋block 等（**同時 7 層・gain 合計 2.08**） | **1,880** `hit_l4` 0.85（2 撃なら +110 で 2 回目） | evolve 2,780 | commit→着弾 +1,600、→evolve +2,500 |
| Kill（90） | 無音 | `card_play` | 本体の着弾 `hit_l4`（L4 に上書き） | 「撃破」一拍 **+730** で `victory_sting` 0.612 ＋ **BGM 停止 → victory ジングル 0.5**（先頭 5s は静か） | 着弾→sting +649〜+841 |
| ラウンドを終える | **無音** | —（commit なし） | 敵ターン **700** `enemy_turn`（＋ドロー×2 同時） | 敵の着弾 +158〜 `self_hit` | 押して 711〜1,484ms 後に最初の音 |
| バトル開始 | — | — | — | Boss Entrance の絵が出てから `boss_entrance` まで **+174〜+1,104ms** 遅れ | 全 20 本の初回ロードを開幕と同時に始めるため（`BattleScreen.tsx:231-238`） |

＊ Lane 2（決定232・`SevenGodsGame-lane2` で commit 済み・PENDING HUMAN QA）後の値。Before は L1 0／L2 20。
**音の時刻は `planBatch` の `atMs` をそのまま予約**（`useBattleSound.ts:34-49`）なので、Lane 2 の重い突き（着弾 190ms）にも**コード変更なしで追従**する（Lane 2 文書 A3 で `hit_l3` の予約 +190 を実測済み）。

reduced-motion：SE の予約は通常と**同一**（同じ試合で 65 本・同じ順序・同じ相対時刻。hit stop だけ 0）。
ミュート：SE の `start()` **0 回**・fallback のオシレーター 0 回。BGM は `muted=true` のまま `play()` される（音は出ない）。**ミュート状態は保存されない**（`App.tsx:26` の `useState(false)`）＝再読み込みで音が戻る。

---

## 3. ROOT CAUSE

### R1（主因）：音の起点が「入力」ではなく「結果」
- `useBattleSound` は**イベントログ（core が確定させた結果）だけ**を見て鳴らす設計（`useBattleSound.ts:9-17`）。タップは `useGameEngine.playCard` が `pendingCardUid` を立てて 280ms 待つだけで、音の経路に入っていない（`useGameEngine.ts:392-402`）
- 結果：**押下の手応えが 280ms 遅れ**、その `card_play` も着弾音の 90ms 前に鳴るので「押した音」ではなく「着弾の前ぶれ」に聞こえる【推測】。Lane 2 文書 R4 と同じ指摘を実測で確認（最短 286ms）
- 「ラウンドを終える」も同じ構造で、押してから最初の音まで 700ms 以上

### R2：同じ音源の同時多重起動（位相の揃った加算）
- `CARD_DRAWN`・`RESONANCE_GAINED` はイベント 1 件ごとに 1 回鳴らす（`useBattleSound.ts:57-68`）。同じ瞬間に複数件あると**同じ AudioBuffer を同じ時刻に N 回 start** → 波形が完全に一致して加算され、振幅 N 倍（×2＝+6dB、×5＝+14dB）
- 実測：1 戦あたり `card_draw`×5 が 1 組、×2〜3 が 5〜9 組、`resonance_gain`×2 が 0〜3 組。開幕の `card_draw`×5（gain 合計 1.02）は `boss_entrance`（0.765）より大きい
- 7/7 の commit では最大 **7 層・gain 合計 2.08** が同時に始まり、主役の `burst_ready`（0.553）が他の 6 層と同じ瞬間に埋もれる【推測：耳で要確認】

### R3：最上段の音が 1 つ（階層の天井が平ら）
- `damageEnemy(4)`・`burstImpact`・撃破の一撃（tier を 4 に上書き）がすべて `hit_l4`・gain 0.85（`sound.ts:241-253`・`combatTimeline.ts:205-209`）。**重い L4 カード＝神の一撃＝撃破**が音では同じ
- 映像側の hit stop は 60＜80＜90 と分かれているが、音は分かれていない

### R4：最頻の一撃が UI 音に似ている
- `hit_l1` はノイズのバンドパス（3,200→1,200Hz）＋小さなサブで、低域 <250Hz が 4.7% しかない。`card_draw`（1,800→4,200Hz のバンドパスノイズ）と帯域の形が 0.963 一致
- 最頻（L1 が全打撃の 55%）の音が「打撃」ではなく「紙をめくる音」側に寄っている【推測】

### R5：BGM が状況に反応しない／iOS では音量設定が効かない可能性
- BGM は `HTMLAudioElement.volume` で 0.35 に設定（`bgm.ts:81-91`）。**iOS Safari では `volume` は JavaScript から設定できない**（Apple「Safari HTML5 Audio and Video Guide」：iOS では音量は常にユーザーの物理ボタンの管理下）【一次情報の記述／要 iPhone 実機確認】→ iPhone では BGM が 1.0 で鳴り、SE（Web Audio の gain は効く）との比が設計より約 9dB BGM 寄りになっている可能性
- 同じ理由で、`volume` を使ったダッキング（神の一撃で BGM を下げる）は iPhone では効かない。やるなら BGM を Web Audio の GainNode 経由にする必要がある（§5 候補 C）

### R6：初回ロードが開幕と重なる
- `preloadSe()` は Boss Entrance と同じ瞬間に呼ばれ（`BattleScreen.tsx:231-238`）、`boss_entrance` 自身も未ロードなので**ロード完了待ちで遅れて鳴る**（+174〜+1,104ms。ローカル配信でこの値＝モバイル回線ではさらに遅い【推測】）
- AudioContext の生成・`resume()` も最初の `sfx` 呼び出し（＝開幕の `useEffect` 内）で行われる。iOS はユーザー操作の処理中に `resume()` しないと止まったままになることがある【推測：要 iPhone 実機確認】。今は「クリック処理の中で鳴らす SE」が 1 つも無い

---

## 4. COMMERCIAL GAP（根拠付き。推測は【推測】）

| # | ギャップ | 根拠 |
|---|---|---|
| G1 | **押下音が無い** | 商用のカードゲーム（Hearthstone・Marvel Snap・Slay the Spire 等）はカードを掴む／押す瞬間に必ず短い音を返す【推測：公開プレイ映像の一般的観察。数値の出典ではない】。UI の反応は 100ms 以内が「即時」と感じられる目安（Nielsen の応答時間 3 段階：0.1s／1s／10s）。現状 286ms で即時の範囲外 |
| G2 | **重なりの制御が無い** | 同一音源の同時再生を 1 回にまとめる／同時発音数を制限するのは、商用のゲーム音響ミドルウェア（Wwise の Playback Limit、FMOD の Max Instances）が標準で持つ機能【一次情報：各ミドルウェアの機能名。本件への適用は推測】。現状は制限 0 で ×5 の加算が起きる |
| G3 | **最上段が 1 音** | 決定224 の映像の段（L4＜神の一撃＜撃破）に音が付いていない。コードで確認（R3） |
| G4 | **固有の音が無い**（Benchmark Sound 48／100） | 数式合成 20 本・2 系統。録音素材・レイヤー設計・リバーブ等の空間処理が無い（`gen-se.mjs` にリバーブ・ステレオ処理なし＝全音 mono ドライ）。高級感の差の大部分はここ【推測】。**新しい音源が要る＝本 Pilot の外** |
| G5 | **BGM が 1 曲・固定** | 状況（ピンチ・READY・神の一撃）で変わらない。商用はボス戦や決着前で層・曲を切り替えることが多い【推測】。新しい音源または BGM の Web Audio 化が要る |
| G6 | **勝利の音楽が静かなイントロで始まる** | 数値（§1-2）：勝利ジングル先頭 5 秒は −30〜−35dBFS。撃破の直後に音楽的な「決着」が 4〜5 秒遅れる |

---

## 5. 候補比較

### 新規音源が**要らない**案

| 案 | 内容 | 効く場面／頻度 | 効果 | リスク・コスト | 判定 |
|---|---|---|---|---|---|
| **A. Tap Feedback v1** | タップ 0ms に既存 `card_play`、commit の `card_play` を削除、同一音源 30ms 内の重複を 1 回に、ラウンド終了ボタンも押下音 | 全カード（16.5 回／戦）＋ラウンド終了（約 5 回／戦）＋ドロー／共鳴の重なり（7〜11 組／戦） | 入力の即時性（286→0ms）・二重の「カチッ」解消・7/7 の団子解消・AudioContext をクリック処理の中で起こせる（iOS の安定化に効く見込み【推測】） | 4 ファイル・約 40 行。打撃・⚡・神の一撃の音と時刻は不変。Lane 2 と競合 0 | **採用** |
| B. 最上段の分離（既存音の重ね） | 神の一撃＝`hit_l4`＋`boss_entrance` の低域、撃破＝`hit_l4`＋`self_hit_heavy` 0.8 倍速、L1 に `self_hit` を薄く足して「打撃の芯」 | 神の一撃 0.22・撃破 1.0・L1 6.7／戦 | 段の天井が 3 つに分かれる | 音色の良し悪しを AI が耳で確認できない。重ねると濁る・音割れ（hit_l4 は既に true peak +2.2dB）の恐れ。Lane 2 の重さの Human QA が終わる前に音の重さも変えると、QA でどちらが効いたか分からない | **次候補（Lane 2 QA 後）** |
| C. BGM ダッキング（Web Audio 化） | BGM を `MediaElementAudioSourceNode`→GainNode に通し、神の一撃のカットイン〜着弾 +500ms の間 0.35→0.15、勝利の一拍で下げてからジングルへ | 神の一撃 0.22／戦・勝利 1／戦 | 「大技の瞬間に周りが静まる」。iPhone で BGM 0.35 が効く（R5）ことも同時に直る見込み | `bgm.ts` の再生方式の変更＝自動再生制限・iOS の挙動・ループの継ぎ目に触る。実機確認が必須。範囲が Pilot として広い | **却下（本 Pilot）→ R5 の実機確認の後に別 Pilot** |
| D. 開幕の先読み前倒し | `preloadSe()` を神選択画面など開幕より前へ | 1 回／戦 | Boss Entrance の音ズレ（+174〜+1,104ms）を解消 | `GameFlow.tsx` 等に触る。頻度が低い | **却下（本 Pilot）→ A の後の小修正候補** |

### 新規音源が**要る**案（CEO 判断事項・§9）

| 案 | 内容 | 効果 | 判定 |
|---|---|---|---|
| E. SE の作り直し（高品質化） | 打撃 4 段・神の一撃・撃破・⚡・押下音を、録音素材や専用の音作りで作り直す（例：`gen-se.mjs` の拡張、購入素材、AI 生成音源） | Benchmark 48 点の主因（G4）に直接効く | **CEO 判断**（制作方法・購入・AI 生成のライセンス）。本監査では決めない |
| F. BGM／ジングルの追加・差し替え | ボス用・READY 用の層、短い勝利ジングル（イントロ無し） | G5・G6 | **CEO 判断**（Suno 等の生成・プラン・権利） |

**A を選んだ理由**：頻度が最大（1 戦 20 回以上の操作すべて）、今ある音と今ある時刻を並べ替えるだけで新規音源 0、映像の階層（Lane 2）と音の階層（L1〜L4 の gain）に一切触れない、ファイル競合 0、数値で合否が決められる（予約オフセット・回数・重複数）。B は効果が大きい可能性があるが、耳での確認が要る上に Lane 2 の Human QA と評価が混ざるため後にする。

---

## 6. ONE RECOMMENDED NARROW PILOT — Tap Feedback v1

**一文で：** 押した瞬間に「カチッ」と鳴らし、結果の瞬間には重ねて鳴らさず、同じ音が同時に何重にも鳴るのをやめる。打撃・⚡・神の一撃・撃破の音と時刻は一切変えない。

After の時刻表（タップ＝0ms）：

| 段 | 0ms（押した瞬間） | commit 280 | 着弾 | 備考 |
|---|---|---|---|---|
| カード（全種） | **`card_play` gain 0.34** | **鳴らさない** | 不変（370／Lane 2 重い 470） | タップ→着弾の間は 370ms（ちょうど「押す→溜め→当たる」の 3 拍）【推測】 |
| ⚡ | `card_play` | — | 本体 +150 `reward`×1.5（不変） | |
| 共鳴 +2 | `card_play` | `resonance_gain` **1 回**（←2 回） | — | |
| 7/7 | `card_play` | `resonance_gain`＋`burst_ready`＋`card_draw`（1 回）＋block 等（**≤5 層**） | 1,880 `hit_l4`（不変） | 主役 `burst_ready` が相対的に前に出る |
| ラウンドを終える | **`card_play` ×0.85 速（低め）gain 0.34** | — | 700 `enemy_turn`（不変）＋`card_draw` **1 回**（←2 回） | |
| 開幕 | — | — | `card_draw` **1 回**（←5 回同時） | |

新規音源 0。**非採用のもの**：押下音のカード種別ごとの音程変化、選択（hover）音、使えないカードを押したときの拒否音（いずれも v1.1 以降の候補）。

---

## 7. FINAL SPEC

### 7-1. 変更ファイル（4 本＋テスト）

| ファイル | 変更 | 他 Lane との関係 |
|---|---|---|
| `src/components/battle/feelTier.ts` | `SE_GAIN` に `tap: 0.4` を追加（master 0.85 を掛けて **0.34**。feedback 0.255 より +2.5dB、L1 0.383 より −1.0dB＝**押下＜最弱の打撃**を保つ）。定数 `TAP_END_ROUND_RATE = 0.85`、`SE_DEDUP_WINDOW_MS = 30` を同ファイルに置く（CLAUDE.md の数値集約ルールは core の rules.ts 対象。演出専用の値は既存どおり feelTier.ts に集約） | Lane 2・3・HUD いずれも未変更のファイル |
| `src/components/battle/sound.ts` | ① `playBuffer` の `PlayOptions` に `immediateOnly?: boolean`：`true` のときは**キャッシュ済みの時だけ即再生**、未ロードなら鳴らさない（遅れて鳴る押下音は逆効果のため。fallback 合成音も鳴らさない）② 重複抑制：`const lastStartAt = new Map<string, number>()`（キー＝`name@rate`、値＝予約した AudioContext 時刻）。予約時刻が前回から `SE_DEDUP_WINDOW_MS` 未満なら**鳴らさない**。判定は純関数 `isDuplicateStart(prevAt: number \| undefined, at: number, windowMs: number): boolean` として export（テスト用）。**全 SE に適用**（打撃の最小間隔は `CARD_HIT_GAP_MS` 110ms・連撃 180ms なので打撃は影響を受けない）③ `sfx.cardTap = () => playBuffer('card_play', { gain: SE_GAIN.tap, immediateOnly: true })`、`sfx.endRoundTap = () => playBuffer('card_play', { gain: SE_GAIN.tap, rate: TAP_END_ROUND_RATE, immediateOnly: true })`。④ 旧 `sfx.cardPlay` は削除（呼び出し元が無くなる） | 同上 |
| `src/components/battle/useBattleSound.ts` | `case 'CARD_PLAYED': sfx.cardPlay()` を削除（イベントは無視＝commit は無音）。その他は不変 | 同上 |
| `src/hooks/useGameEngine.ts` | `playCard` の先頭（`setPendingCardUid` の前）で `sfx.cardTap()`、`endRound` の `dispatch` の前で `sfx.endRoundTap()`。**クリック処理の中で同期的に呼ぶ**（＝`getCtx()` の `resume()` がユーザー操作の中で走る）。`playCard` は `isPlayerTurn` が偽のとき手札が disabled なので呼ばれない（`BattleScreen.tsx:296-302`・`CardView` の `disabled`）＝押せないカードでは鳴らない | どの Lane も未変更。`src/core` ではない（UI 層の hook） |
| `src/components/battle/sound.test.ts`＋新規 `src/components/battle/tapFeedback.test.ts` | `isDuplicateStart` の境界（29／30／31ms・rate 違いは別キー）、`SE_GAIN.tap × master < SE_GAIN.impact[1] × master`、`useBattleSound.ts` のソースに `CARD_PLAYED` での再生が無いこと・`useGameEngine.ts` の `playCard`／`endRound` に押下音があること（既存の source-pin テスト形式）、SE ファイル数 20 のまま | — |

**触らない**：`combatTimeline.ts`・`enemyVfxTiming.ts`（Lane 2 が変更中）、`BattleScreen.tsx`（Lane 2 が 1 行変更）、`CardView.tsx`（Lane 3）、`HpBar.tsx`（HUD）、`bgm.ts`、`battle.css`、`public/`、`src/core`、`rules.ts`、save。

**作業場所の注意**：メインの作業ツリー `C:/Users/kimi1/SevenGodsGame`（branch `feat/d224-premium-payoff-pilot`）には `sound.ts`・`useBattleSound.ts` の**未 commit の差分**が残っている（内容は 45bfc9e と同一＝決定224 のリリース済みコード）。実装はそこでは行わず、最新 Production（45bfc9e、または Lane 2 が先に出ればその RC）から切った**新しい worktree**で行う。

### 7-2. 音量（再生 gain＝係数×master 0.85）

| 音 | Before | After |
|---|---|---|
| 押下（card_play） | —（押下時は無音） | **0.34** |
| commit の card_play | 0.255 | **なし** |
| ラウンド終了の押下 | — | **0.34・0.85 倍速**（長さ 60→71ms、音程 −2.8 半音） |
| 打撃 L1〜L4・⚡・神の一撃・撃破・BGM・ジングル | 0.383／0.51／0.68／0.85・0.595・0.85・0.85・0.35・0.5 | **不変** |
| 同一音源 30ms 内の 2 回目以降 | そのまま加算 | **鳴らさない** |

実効レベル（§1 の計算法）：押下 **−21.8dBFS**（BGM の短時間最大 −20.3 とほぼ同じ、RMS −28.8 より 7dB 上。帯域は BGM が低域 65%、押下は 250-2k が 86% なので埋もれにくい見込み【推測】）＜ L1 −16.8。

### 7-3. ミュート／autoplay／reduced-motion
- **ミュート**：`playBuffer` 冒頭の `if (muted) return` を通るので押下音も鳴らない。重複抑制の記録もミュート中は更新しない（解除直後に抑制が誤作動しない）
- **autoplay**：押下音はクリック処理の中で `getCtx()`→`resume()` を呼ぶ。今より AudioContext が確実に起きる方向の変更（iOS での効果は【推測】・Human QA の iPhone 確認項目）。未ロード時は鳴らさない（`immediateOnly`）ので、ロード待ちで遅れて鳴ることは無い
- **reduced-motion**：音は動きではないため、現状どおり SE は変えない（押下音も鳴らす）。reduced-motion でも SE 予約が通常と同一であることを acceptance で確認

### 7-4. Lane 2 の hit weight との同期
- 着弾音は引き続き `planBatch().steps[].atMs` で予約（不変）。Lane 2（決定232）の `CARD_HEAVY_IMPACT_MS`（重い本体 commit +190）が入っても自動で追従
- 押下音はタップ 0ms、着弾は 370（重い 470）。押下と着弾の間は常に ≥370ms 空き、**音が重ならない**（card_play の聞こえる長さ 40ms）
- hit stop の段（L1 30＜L2 40＜L3 45＜⚡50＜L4 60＜神 80＜撃破 90）には音側から何も足さない。音の最上段の分離（候補 B）は Lane 2 の Human QA 後に別 Pilot

---

## 8. ACCEPTANCE CRITERIA

### 8-1. 数値（`scripts/sound-premium-audit/seprobe.mjs` を After ビルドに対して実行。同じ 6 戦＝同じ seed・同じ手順）

| # | 基準 | Before（実測） | After 合格線 |
|---|---|---|---|
| S1 | カードのタップ → `card_play` の予約（click イベントから start までの時間・予約オフセット） | 最短 286ms | **全タップで予約オフセット 0・click から ≤30ms** |
| S2 | commit 時の `card_play` | 16.5 回／戦 | **0**（`card_play` の回数＝カードのタップ数＋ラウンド終了の押下数） |
| S3 | 着弾音の相対時刻（押下音から） | commit+90（Lane 2 後 重い +190） | **不変**：押下 +370±20（重い +470±20）。⚡は本体 +150、神の一撃 commit +1,600、撃破 sting 着弾 +730 系列が Before と同一 |
| S4 | 同一 `name@rate` の 30ms 内の重複 start | 7〜11 組／戦（余分な start 12.5 回／戦＝4 戦で 50／301） | **0 組** |
| S5 | 7/7 commit の同時層（±30ms）と gain 合計 | 7 層・2.08 | **≤5 層・≤1.4** |
| S6 | 開幕の `card_draw` | 5 本同時（gain 合計 1.02） | **1 本（0.204）** |
| S7 | ラウンド終了の押下 → 最初の音 | 711〜1,484ms | **≤30ms**（rate 0.85） |
| S8 | ミュート時の SE start | 0 | **0**（押下音も 0） |
| S9 | reduced-motion と通常の SE 列 | 同一 | **同一** |
| S10 | 新規音源 | — | `public/assets/se` 20 本・337,372B **不変**、`public/` 差分 0 |
| S11 | 自動テスト | — | `npm test` 全 PASS（新規テスト込み）、`tsc -b` 0、lint error 0、`src/core` 差分 0 |
| S12 | エラー | 0 | pageerror 0 |

### 8-2. Human QA（CEO が耳で判断。YES/NO）
1. **カードを押した瞬間に「カチッ」と音が鳴りましたか？**（押してから音が出るまでの間が気にならない）
2. **攻撃カードで「押した音」と「当たった音」が、別々の音としてはっきり分かれて聞こえましたか？**（二重に鳴ってうるさい感じはない）
3. **共鳴が 7 つたまった瞬間、音がごちゃっと固まらず、上がっていく音がはっきり聞こえましたか？**

（任意・iPhone をお持ちなら）iPhone で最初のカードを押したとき、効果音が鳴りましたか？

---

## 9. CEO 判断が必要な事項

Pilot（Tap Feedback v1）は §6-2（軽微な UI・UX 調整／既存仕様の範囲内の改善）で **CEO 確認不要**。以下は Pilot の外で、将来 Sound の点数（48／100）を大きく上げるときに必要になる判断。

```
【CEO DECISION REQUIRED】（今すぐではない。候補 E／F に進む時点で）
Issue：SE・ジングルの「新しい音源」をどう用意するか（制作方法・費用・権利）
AI Recommendation：第 1 段は「自作（gen-se.mjs の拡張＝数式合成のまま音作りを強化）」で
  打撃 4 段・神の一撃・撃破・押下音の 8 本だけを作り直す。購入素材・AI 生成音源は使わない。
  勝利ジングルは既存 Suno 曲（決定120 で商用可）の「5 秒目からの区間」を切り出した短い版を作る
  （新曲の生成はしない）
Reason：CEO の素材優先順位（①既存 ②自作 ③無料 ④有料、決定128）と一致し、権利確認が不要。
  Creator Kit に音源は 0 件で①は該当なし。勝利ジングルは先頭 5 秒が −30〜−35dBFS の静かな
  イントロで、撃破直後の決着感が 4〜5 秒遅れている（§1-2）が、切り出しだけで直せる見込み
Alternatives：購入素材（費用・ライセンス管理が発生）／AI 生成 SE（生成サービスの規約・商用
  可否の確認が必要）／外注（費用）。いずれも第 1 段としては過大と判断
Risk：自作の上限は「数式合成の質」で、録音素材の質感には届かない可能性（Benchmark の
  「固有音 0」は残る恐れ）。切り出しは既存曲の加工に当たるため、Suno 規約上の加工可否は
  決定120 の範囲内か要確認
Impact if delayed：Sound は 48 点のまま。Tap Feedback v1・候補 B/C/D は新規音源なしで進められる
CEO Action：承認 / 拒否
```

参考（決定ではない）：iPhone で BGM の音量設定（0.35）が効いていない可能性（R5）は AI 側で実機確認と修正（候補 C）を進められる技術判断だが、**実機（iPhone）での確認は CEO の手元でしかできない**。Human QA の任意項目で確認をお願いしたい。

---

## 10. Risks・触れないもの

| # | リスク | 程度 | 対策 |
|---|---|---|---|
| K1 | 押下音 1 戦 20 回以上の反復で耳が疲れる | 中 | 音は最短（聞こえる長さ 40ms）・gain 0.34 で L1 未満。commit の音を消すので、card_play の回数は 16.5→約 21／戦（増えるのはラウンド終了の押下分 約 4〜5 回だけ）。一方で重複抑制により SE 全体の start は 1 戦あたり約 12.5 回減る（実測 4 戦 301 回のうち 50 回が 30ms 内の重複）。Human QA Q2 で確認 |
| K2 | 押したのに結果が出なかった場合（エンジンが拒否）も音が鳴る | 低 | 押せるのは `isPlayerTurn` かつ払えるカードだけ（disabled 制御）。拒否はほぼ起きない |
| K3 | 重複抑制で、本来 2 回聞かせたい音が 1 回になる | 低 | 30ms 未満の同一音源は耳では 1 回にしか聞こえない（先行音効果の範囲）【推測】。打撃の最短間隔 110ms には掛からない |
| K4 | 未ロードで押下音が鳴らない（最初の数タップ） | 低 | 開幕で全 SE を先読み済み。先読み前倒し（候補 D）で解消可能 |
| K5 | iOS の AudioContext／BGM の挙動は AI が確認できない | 中 | Human QA の任意項目。R5 は別 Pilot（候補 C） |
| K6 | hit_l4 の true peak +2.2dBFS（音割れの可能性） | 低〜中 | 本 Pilot では変えない（打撃の音量は不変）。候補 B／E の時に master の余裕（例：limiter または gain 0.8）を検討 |
| K7 | Lane 2 と同時期のリリースで「重さ」の評価が混ざる | 低 | 本 Pilot は打撃音・着弾時刻に触らない。Human QA の問いも押下と重なりだけを聞く |

**触れないもの**：打撃 L1〜L4 の音源と gain、⚡（決定224）、神の一撃・撃破・勝利の時刻（決定226）、`combatTimeline.ts`／`enemyVfxTiming.ts`（Lane 2）、`CardView.tsx`（Lane 3）、`HpBar.tsx`（HUD）、`bgm.ts`（BGM・ジングル・ダッキング）、`public/`（音源の追加・差し替え・再生成）、`gen-se.mjs` の再実行、`src/core`・`rules.ts`・save、`docs/DECISIONS.md`（Pilot 実装時に AI 判断として追記する）。

---

## 11. NEXT NOW

**Tap Feedback v1 を実装する（新しい worktree・§7 の 4 ファイル＋テスト）→ §8-1 の S1〜S12 を `seprobe.mjs` で計測 → CEO Human QA（§8-2 の 3 問）。**
その後の順番（AI 推奨）：Lane 2 Human QA 完了 → 候補 B（最上段の分離・既存音の重ね）→ 候補 D（先読み前倒し）→ iPhone 確認の結果しだいで候補 C（BGM の Web Audio 化・ダッキング）→ §9 の CEO 判断を受けて候補 E／F。

---

### 付録：再現手順
```
cd C:/Users/kimi1/SevenGodsGame-d230-rc && npx vite preview --host 127.0.0.1 --port 4251 --strictPort   # 既存 dist をそのまま配信（rebuild しない）
cd C:/Users/kimi1/SevenGodsGame/scripts/sound-premium-audit
node analyze.mjs    http://127.0.0.1:4251 out/analyze.json     # 音源の数値
node bgmwindows.mjs http://127.0.0.1:4251 out/bgmwindows.json  # BGM・ジングルの時間窓
node seprobe.mjs    http://127.0.0.1:4251 out/seprobe.json     # 実戦 6 戦（通常 4・reduced 1・ミュート 1）
node summarize.cjs  out/seprobe.json > out/timing.md
```
seprobe は Chromium を `--autoplay-policy=no-user-gesture-required` で起動する（ヘッドレスの合成クリックでも AudioContext を動かすため）。そのため **autoplay 制限下の挙動（iOS 等）はこの probe では測れない**。ヘッドレスでは setTimeout が数秒遅れることがあるので、時刻は「クリック→予約」の絶対値ではなく**同じバッチ内の相対差**と最短値で読む。

---

## 12. Pilot 実装・Fast Gate（Tap Feedback v1）

- 日付：2026-09-27　／　判断：**AI判断**（CLAUDE.md §6-2。新規音源 0・gameplay 変更 0）
- 状態：**Human QA 準備完了（PENDING HUMAN QA）**。commit／push／merge／deploy なし

### 12-1. 作業場所
| 項目 | 値 |
|---|---|
| worktree | `C:/Users/kimi1/SevenGodsGame-sound`（branch `feat/sound-tap-feedback-v1`、`master`＝`245ecdc`＝Production・決定232 込みから作成）**未 commit** |
| Before | `C:/Users/kimi1/SevenGodsGame-lane2-rc/dist`（Production 245ecdc。rebuild していない） |
| After | `C:/Users/kimi1/SevenGodsGame-sound/dist`（本 Pilot のビルド。残してある） |
| 証拠 | `scripts/sound-premium-audit/tapgate-probe.mjs`（seprobe.mjs の複製＋console error 採取）・`tapgate.cjs`（S1〜S9 集計）・`out/tapgate-before.json`・`out/tapgate-after.json`・`out/tapgate-*-rerun.json`・`out/tapgate.md`。※監査の scripts と本書がメイン作業ツリー側（未追跡）にあるため、証拠も同じ場所に置いた（runtime ファイルはメイン側で一切触っていない） |

### 12-2. 変更ファイル（+／−）
| ファイル | +／− | 内容 |
|---|---|---|
| `src/components/battle/feelTier.ts` | +14／−0 | `SE_GAIN.tap = 0.4`（master 後 0.34）、`TAP_END_ROUND_RATE = 0.85`、`SE_DEDUP_WINDOW_MS = 30` |
| `src/components/battle/sound.ts` | +42／−5 | `PlayOptions.immediateOnly`（キャッシュ済みの時だけ即再生。未ロードなら鳴らさずロードだけ開始・fallback 無音）／純関数 `isDuplicateStart` を export／`lastStartAt`（キー `name@rate`・予約 AudioContext 時刻）で 30ms 未満の 2 回目以降を鳴らさない（全 SE、ミュート中は記録も更新しない）／`sfx.cardTap`・`sfx.endRoundTap` を追加、旧 `sfx.cardPlay` を削除 |
| `src/components/battle/useBattleSound.ts` | +3／−3 | `CARD_PLAYED` での `cardPlay()` を削除（commit は無音）。コメント追記 |
| `src/hooks/useGameEngine.ts` | +8／−1 | `playCard` の先頭（`setPendingCardUid`・`setTimeout` の前）で `sfx.cardTap()`、`endRound` の `dispatch` の前で `sfx.endRoundTap()`。**判定・seed・AP・ダメージ・スコア・保存は不変**（音を呼ぶ 2 行のみ） |
| `src/components/battle/sound.test.ts` | +11／−0 | `cardTap`／`endRoundTap` があり `cardPlay` が無い・SE 20 本のまま |
| `src/components/battle/tapFeedback.test.ts`（新規） | +157 | gain の順序（feedback＜tap＜L1）、`isDuplicateStart` 境界（29ms＝重複／30・31ms＝別）、110ms は抑制されない、source pin（`CARD_PLAYED` で鳴らさない・押下音が遅延の前）、偽 AudioContext での振る舞い（未ロードは無音・予約 off 0／gain 0.34／rate 0.85・ドロー×5→1・rate 違いは別・ミュートで 0） |

`battle.css`・`CardView.tsx`・`combatTimeline.ts`・`enemyVfxTiming.ts`・`BattleScreen.tsx`・`bgm.ts`・`public/`・`src/core`・package：**変更 0**。

### 12-3. Acceptance（ブラウザ実測：Before＝:4262／After＝:4261、Chromium ヘッドレス、`--autoplay-policy=no-user-gesture-required`）
対象：大耀×蒼海の龍神 `d223-pilot-01`（PC 1508×660：通常・reduced・ミュート）、寿楽×双牙の魔獣 `d225-juraku-juuma`（SP 390×844）。詳細は `out/tapgate.md`。

| # | 基準 | Before | After | 判定 |
|---|---|---|---|---|
| S1 | カードタップ→`card_play` | 押下時は無音（最初の音まで最短 285〜286ms） | 全 36 タップで **click→start 0〜2ms・予約 off 0**（1 件だけ off −11＝AudioContext の時計が同じ処理中に 1 刻み進んだ計測誤差。過去時刻＝即再生で遅れではない） | PASS |
| S2 | commit 時の `card_play` | PC 13／SP 10（全タップ分） | **0**。`card_play` 回数＝タップ＋ラウンド終了（PC 13+5＝18、SP 10+4＝14） | PASS |
| S3 | 着弾系の時刻 | — | card_play を除く SE 列（name@rate+予約 off、Before の 30ms 重複は 1 回に畳む）：PC 通常 **42/42 完全一致**。SP・reduced は 1 件ずつ **±11ms**（上と同じ AudioContext 時計の刻みによる計測誤差：`reward@1.5` 240→229、開幕 `card_draw` 0→−11）以外一致。**重い一撃 `hit_l4` +150（決定232）・⚡ `reward`×1.5 本体 +150（=off 240）・神の一撃 `hit_l4` +1,600・evolve +2,500 は Before と同値** | PASS |
| S3' | 撃破→`victory_sting`（決定226） | PC 948（再計測 797）・SP 797・reduced 421 | PC 1,115（再計測 **793**）・SP 792・reduced 418 | PASS（初回 PC の差はヘッドレスの setTimeout 遅れ。同条件の再計測で 797 vs 793） |
| S4 | 同一 `name@rate` の 30ms 内重複 | PC 10・SP 8・reduced 10 組 | **0・0・0** | PASS |
| S5 | 7/7 の同時層（±30ms）・gain 合計 | PC 4 層・1.318／SP 4 層・1.471 | **PC 2 層・0.808／SP 3 層・1.216**（card_play と重複 resonance_gain が抜け、`burst_ready` が前に出る） | PASS（≤5・≤1.4） |
| S6 | 開幕 `card_draw` | 5 本同時 | **1 本** | PASS |
| S7 | ラウンド終了→押下音 | 押下時は無音（最初の音まで 703〜708ms） | **0〜1ms・rate 0.85・gain 0.34** | PASS |
| S8 | ミュート | SE 0・osc 0 | **SE 0・osc 0**（押下音も 0） | PASS |
| S9 | reduced-motion | 通常との差は「重い撃破 `hit_l4` +150→+90」の 1 件のみ（決定232 の reduced 仕様） | **同じ 1 件のみ**（Before と同じ振る舞い。押下音は reduced でも鳴る＝音は動きではない §7-3） | PASS |
| S10 | 音源 | 20 本 | 20 本・`public/` 差分 0 | PASS |
| S12 | エラー | 0 | **pageerror 0・console error 0**（全 4 run×2 版＋再計測） | PASS |

### 12-4. 自動テスト・静的検査
- 新規／更新：`tapFeedback.test.ts`＋`sound.test.ts` 14 件 PASS
- 対象：`sound.test`・`tapFeedback.test`・`combatTimeline`・`readyMaterial`・`victoryReveal`・`battleViewportLayout`・`godStrikeStage` **7 files／71 tests PASS**
- 全体：`npx vitest run --dir src` **94 files／1,187 tests PASS（34.6s、ブラウザ計測と同時実行なし、timeout なし）**
- `npx tsc -b --noEmit` 0 error、`npx oxlint src` 0、`npm run build` 成功

### 12-5. Isolation・bundle
- 変更：上表 5 ファイル＋新規テスト 1。`src/core` **0**（`useGameEngine.ts` は `src/hooks` の UI 層 hook。追加は `sfx` の import と呼び出し 2 行のみで、`dispatch`・`commit`・`applyAndRecord`・timer 値は不変）、`public` 0、package 0
- bundle（vs `SevenGodsGame-lane2-rc/dist`＝245ecdc）：JS 437,925 → **438,202 B（+277 B、gzip +69 B）**、CSS **バイト一致**（`index-1fDLvVaw.css`）
- 入力のブロック：増えない（押下音は同期の `start()` 1 回。未ロード時は何もせず戻る）

### 12-6. 仕様からの逸脱（理由付き）
1. `immediateOnly` で未ロードのとき、鳴らさずに**ロードだけ開始**する（次のタップから鳴るようにするため。遅れて鳴ることはない）
2. 重複判定は「予約時刻の差の絶対値＜30ms」（遅れてロードされた音が先の予約より前に来る場合も同じ扱いにするため）
3. 監査時の 7/7 は「7 層・2.08」だったが、今回の 2 試合の Before は 4 層（デッキ・手順の違い）。合格線（≤5・≤1.4）で判定
4. 証拠ファイルと本節はメイン作業ツリー側の `docs/`・`scripts/sound-premium-audit/`（どちらも未追跡・監査の置き場所）に追記。runtime はメイン側で触っていない

### 12-7. Known Risks
| # | リスク | 程度 | 対応 |
|---|---|---|---|
| K1 | 押下音の反復で耳が疲れる（1 戦 約 18 回） | 中 | gain 0.34＜L1。Human QA Q2 で確認 |
| K2 | iPhone（autoplay 制限・物理スイッチ・BGM volume 無効の可能性 R5）は AI が確認できない | 中 | ヘッドレスは autoplay 制限を外して計測。**CEO の iPhone 実機（音 ON・消音スイッチ OFF）で確認が必須** |
| K3 | 30ms 未満の同じ音は全 SE で 1 回にまとまる（素早い 2 連タップも 1 回） | 低 | 耳では 1 回にしか聞こえない範囲。打撃の最短 110ms・連撃（rate 違い）には掛からないことをテストで固定 |
| K4 | 開幕の先読み前に押すと最初の押下音が鳴らない | 低 | 実測では全タップで鳴った。候補 D（先読み前倒し）で解消可能 |
| K5 | ヘッドレスの時刻誤差（setTimeout 遅れ・AudioContext 時計の刻み ±11ms） | 低 | 予約 off と再計測で確認済み。最終判断は耳 |

### 12-8. Human QA（CEO）
- Before：`cd C:/Users/kimi1/SevenGodsGame-lane2-rc && npx vite preview --port 4262`（`dist` 再ビルド不要）
- After：`cd C:/Users/kimi1/SevenGodsGame-sound && npx vite preview --port 4261`
- 試合：大耀×蒼海の龍神 `?seed=d223-pilot-01`、寿楽×双牙の魔獣 `?seed=d225-juraku-juuma`（Before と After で同じ手順）
- **必ず iPhone 実機で、音を出して（消音スイッチ OFF・音量あり）聞いてください**（AI は音を聞けず、iPhone の音の挙動も確認できないため）。iPhone から開くには、上のコマンドに `--host` を付けて同じ Wi-Fi の PC の IP で開く（AI の計測は localhost のみで実施）
- 質問（はい／いいえ）：
  1. カードを押した瞬間に「カチッ」と音が鳴りましたか？（押してから音が出るまでの間が気にならない）
  2. 攻撃カードで「押した音」と「当たった音」が別々にはっきり聞こえ、二重に鳴ってうるさい感じはありませんでしたか？
  3. 共鳴が 7 つたまった瞬間、音がごちゃっと固まらず、上がっていく音がはっきり聞こえましたか？
- 任意：iPhone で最初のカードを押したとき、効果音が鳴りましたか？
- 3 問すべて「はい」なら RC 化（commit・DECISIONS への AI 判断記録）へ進む。1 つでも「いいえ」なら音量（`SE_GAIN.tap`）または重複窓を調整して再 QA

---

## 13. 決定233 — Human QA PASS と Release Gate（2026-09-27）

### 13-1. CEO Human QA（iPhone 実機・音あり）— **PASS**
Q1 押した瞬間に「カチッ」と鳴る **YES**／Q2 押した音と当たった音が別々に聞こえ、二重でうるさくない **YES**／Q3 共鳴 7/7 で音が固まらず上がる音が聞こえる **YES**。本 Pilot を **決定233 Sound Tap Feedback v1** とする。

### 13-2. Release Gate — **PASS／Blocker 0 → PRODUCTION RELEASE READY（CEO 承認待ち）**
| 項目 | 結果 |
|---|---|
| commit | Human QA 済みの差分をそのまま local commit **`c6d4462`**（`feat/sound-tap-feedback-v1`・6 ファイル +235／−9。差分は `scripts/sound-premium-audit/out/sound-tap-v1-qa.diff`） |
| RC | `release/d233-sound-tap-rc`＝**`c6d4462`**（新規 worktree `C:/Users/kimi1/SevenGodsGame-sound-rc`・`npm ci`）。親は master＝origin/master＝**`245ecdc`**＝clean Production の上に commit 1 つ・worktree clean |
| Human QA 済みとの一致 | RC clean build の **JS `index-Drq96c94.js`（md5 `2296c004…`）・CSS `index-1fDLvVaw.css`（md5 `faca49ef…`＝Production と同一）が Human QA の After と byte 同一** |
| Automated | targeted 7 files・**71 PASS**／tsc 0／lint 0／clean build PASS。full は **1,187 PASS**＝重いコア試験以外 86 files・1,096 PASS ＋ `balanceSim`・`replay/**` 8 files・91 PASS（**CEO ルールどおり、Dock レーンのブラウザ計測の終了を確認してから単独で実行**・タイムアウト 0） |
| Isolation | 変更は `src/components/battle/feelTier.ts`・`sound.ts`・`sound.test.ts`・`tapFeedback.test.ts`（新規）・`useBattleSound.ts`・`src/hooks/useGameEngine.ts`（クリック処理で押下音を呼ぶ 2 行）。`src/core`／`public`（assets 210 ファイル md5 一致）／package 差分 0。save・gameVersion・`Math.random`・決定213 の混入 0。新音源 0 |
| 決定224／226／232 | Fast Gate（§12）の証跡を再利用：着弾・⚡（`reward`×1.5）・神の一撃・撃破・勝利の音の時刻が Before と同値（決定232 の重い一撃 150ms を含む）。CSS は Production と同一のため見た目の差 0 |
| Bundle（Production `245ecdc` 比） | JS 437,925→438,202B（**+277B**・gzip +89B）／CSS ±0（md5 一致）／新規 asset 0 |
| Blockers | **0** |
| Rollback 先 | 現 Production deployment **`6689024801`**（`245ecdc`・status success） |
| Release 手順（CEO 承認後のみ・未実施） | `git fetch . release/d233-sound-tap-rc:master`（fast-forward `245ecdc`→`c6d4462`）→ `git push origin master` → 配信 bundle と RC の md5 一致確認 → Narrow Production Smoke（押下音 0〜2ms・結果確定時 card_play 0・重複 0・打撃音の時刻・ミュート・console error） |

**状態：決定233 = Human QA PASS（CEO）／Release Gate PASS（AI 判断）／PRODUCTION RELEASE READY — CEO 承認待ち。** merge／push／deploy なし。

---

## 14. 決定233 Production Release — **PRODUCTION LIVE / CLOSED**（2026-09-27 JST・CEO 承認）
| 項目 | 値 |
|---|---|
| Release 直前 | master＝origin/master＝`245ecdc`／RC `c6d4462`・worktree clean・commit 1 つ |
| merge／push | `git fetch . release/d233-sound-tap-rc:master`（fast-forward）→ `git push origin master`（16:52 JST・`245ecdc..c6d4462`） |
| Vercel | deployment **`6689622311`**（`c6d4462`・Production）success（2026-09-27T07:52:44Z） |
| 配信 bundle | `index-Drq96c94.js`／`index-1fDLvVaw.css`＝RC build と **md5 一致**（＝Human QA の After） |
| Rollback 先 | **`6689024801`**（`245ecdc`・決定232） |

### 14-1. Narrow Production Smoke（`tapgate-probe.mjs`・PC 大耀×龍神／SP 寿楽×魔獣／PC ミュート）
- タップ→`card_play` 0〜2ms・予約オフセット 0・押下 gain 0.34・ラウンド終了→押下音 1ms、結果確定時の `card_play` 0 回、同じ音の 30ms 以内の重複 0、開幕 `card_draw` 1 本、7/7 の重なり 2 層 0.808（PC）／3 層 1.216（SP）
- 打撃系 SE の列（着弾・⚡・神の一撃・撃破・勝利）：PC は QA 時と **42 本完全一致**、SP は 30 本中 1 本（heal）が −11ms（AudioContext の時計の刻みによる既知の計測誤差）。bot の手数が 1 回少なかった分、押下音が 1 回少ない
- ミュート：SE の再生 0 回
- pageerror／console error：0
- 証跡：`scripts/sound-premium-audit/out/prod233.json`

**Decision233 Sound Tap Feedback v1 = PRODUCTION LIVE / CLOSED。** Production＝**`c6d4462`**。
