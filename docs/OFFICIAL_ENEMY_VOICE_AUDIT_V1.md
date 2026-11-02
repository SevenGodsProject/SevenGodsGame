# 公式敵キャラ × 専用ボイス 設計監査 v1 — 将軍家 10 体・7 場面・台本案・音声サービス・権利（READ-ONLY）

> **2026-11-03 追記：CEO 修正案（`FINAL_SCOPE_ROADMAP_V1.md` §10 v1.1）により、敵キャラの新規 AI ボイス（70 本・ElevenLabs 契約・音声生成費用）は最終スコープから除外。本書は実施しない設計記録として保持する**（理由：将軍家に公式ボイスがない／公式キャラの世界観と統一感を優先／期間・費用・iOS 音声リスクの削減）。本書の台本・サービス比較・権利運用は、将来 CEO が方針を戻す場合の設計資産であり、現時点で生成・契約・実装は行わない。

> **状態（2026-11-03・AI-PM＋Designer＋Dev＋Infra・AI 判断・docs-only・read-only）：AUDIT COMPLETE — 実装 0／runtime・assets 変更 0／音声生成 0／有料 API 呼び出し 0／Kit ダウンロード 0／push・merge・deploy 0。** 基準点：Production `10b0cd3`（v1.0.6）。本書は `docs/FINAL_SCOPE_ROADMAP_V1.md`（最終スコープ）の別紙＝ボイス側の設計・台本・サービス・権利を扱う。**音声生成の実行・有料 API の利用・素材の正式採用は CEO 承認後**（CLAUDE.md §6-3 #5／#6）。

---

## 0. 結論（先に）

| 項目 | 結論 |
|---|---|
| 公式の台詞・音声 | **将軍家 10 体に公式の台詞・口調・声優名・音声は存在しない**（公式 manifest のフィールドは id／nameJa／nameEn／role／profile／model3d／assets のみ。公式サイト Creator Kit ページの将軍家欄にも音声・台詞なし。2026-11-03 再取得）。公式設定は **role 1 語＋profile 1 文だけ**。本作の二つ名・技名・台詞・ボイスは **すべて非公式のファン創作**（§2 で明確に区別） |
| 規約 | Kit RIGHTS.md §5（Updated 2026-10-08・2026-11-03 公式サイトで本文一致を確認）：自作の声（AI 生成含む）は **自由**・「公式」「公式ボイス」「公認」と思わせる表示は **禁止**。§7：第三者が権利を持つ音声は対象外＝**音声サービスの商用利用権と出力の帰属を制作者が確認する** |
| 公式声優の保護 | 7 神の公式音声 28 本（声優名は公式に非公開）を **参照入力・学習・声質模倣・クローンに一切使わない**。敵の声は **サービスのプリセット音声か、テキスト指示からの Voice Design** で作る（実在人物のクローン 0） |
| 設計 | 7 場面（戦闘開始・通常攻撃・強攻撃予告・必殺技・被弾・HP 低下・撃破）の発火点は **既存 engine イベントと既存時刻表** で決まる（新 timer 0）。再生は既存 voice チャネルを拡張（`VoiceScene` に敵場面を追加・**神の声が常に勝つ** 優先度・1 バッチ 1 本・late drop・ミュート即停止・duck は必殺／撃破のみ） |
| iOS Safari | 既存の実測（greeting Q3 PASS・crisis Q4 PASS・K02 BGM 復帰 PASS・K03／K04 duck）を前提に、敵ボイスは **W2 Pilot の Human QA 3 問**（サイレント／復帰／ミュート）で検証。`visibilitychange` 処理は 0 件のまま＝復帰後の遅延分は late drop で捨てる設計 |
| 規模 | 10 体 × 7 本 ＝ **70 本**（各 0.6〜2.5 秒・mp3 mono 64kbps ≈ 8〜25 KB・1 体 ≈ 120 KB・全体 ≈ 1.2 MB・1 戦あたりの遅延ロード ≈ 120 KB） |
| サービス・費用（§6） | Web 一次情報の比較表（取得日付き）と推奨を §6 に記載。費用は 70 本＋予備で小さい（サービスにより 0 円〜数千円） |
| 実装順（§8） | W2 忠次 7 本（Pilot・配線と競合の確認）→ W3 以降は各 wave の敵 3〜1 体 × 7 本を **データ追加＋台帳のみ**（コード 0） |

---

## 1. 公式側の調査結果（事実）

| 調査対象 | 結果（2026-11-03） |
|---|---|
| `docs/assets-kit/shogunate-manifest.json`（公式の無改変コピー） | `kitId sgg-creator-kit-shogunate`・`kitVersion 1.0.0`・`releasedAt 2026-10-08`・10 体／16 枚（FRONT 7・BACK 6・MAIN 3）・各 character は id／nameJa／nameEn／role／profile／model3d／assets のみ。**lines／quotes／voice／tone 等のフィールド無し** |
| 公式サイト manifest（再取得） | 上記と同一（kitVersion・releasedAt・counts・profile 10 文すべて一致） |
| 公式 RIGHTS.md（再取得） | 「二次創作ガイドライン v1.0.0／Effective 2026-07-16／Updated 2026-10-08（5. キャラクターの声を追加）」。§5 本文 4 項目が repo 記録と一字一句一致。§7「GODSの口調設定本文は公開配布対象に含みません」「第三者が権利を持つ音楽、音声…は対象外」 |
| 公式サイト Creator Kit ページ（表示版 CREATOR PROTOCOL v1.1・UPDATED 2026.09.10） | 7 神は GOD／OTOMO 各 4 種（あいさつ・ピンチ・お疲れ・勝利）の MP3。**声優・演者名の記載なし**。将軍家 01〜10 は profile と画像のみ・音声・台詞・口調の記載なし |
| 公式 MCP（過去監査 `CREATOR_KIT_V1_1_AUDIT.md` §4） | server instructions「Official voices exist only for the 7 GODS… Creators may use their own voices but must not call them official… Do not invent canon」 |
| 本作が配信中の公式音声 | 大耀 greeting（189,357 B・VOICE-KIT-01）・crisis（142,893 B・VOICE-KIT-08）。`audio-source/voice/taiyo/` に原本 |

→ 「公式台詞」は存在しないため、§2 の区別は「公式＝role・profile の 2 項目／それ以外＝AI 仮」で一意に決まる。「Do not invent canon」への対応：本作の台詞は **世界設定（穢土・陰陽寮・逆さ五重塔 等）を profile に書かれた範囲でだけ使い、新しい設定（家族関係・過去・死因 等）を作らない**。

---

## 2. 公式テキストと AI 仮台詞の区別（表示・台帳・コードでの扱い）

| 種別 | 内容 | 扱い |
|---|---|---|
| **公式（Kit）** | 名前（nameJa）・role（将軍四天王／影の頭領／科学者 など）・profile 1 文・画像 | そのまま使う。`enemies.ts` の `name` は「role・名」で組む（忠次「将軍四天王・忠次」が前例）。改変しない |
| **AI 仮（非公式）** | 二つ名・技名（「軍略・総攻め」等）・`typeLabel`／`typeDescription`・`battleCries` 7 本・**ボイス台本 7 本・声質** | コード上のコメント「非公式のファン創作・CEO 監修待ち」（忠次の前例）／Credits「将軍家の二つ名・台詞・音声は本作の創作です（公式設定ではありません）」1 行／台帳 `VOICE-AI-xx` の Creator 欄「本作（AI 生成・非公式）」。**「公式」「公認」「公式ボイス」の語を使わない**（`shogunateRoster.test.ts:144` と同型の文字列テストを音声台本にも置く） |
| 既存 7 体（CEO 生成） | 名前・台詞すべて本作オリジナル | 変更しない。本スコープのボイス対象外（公式キャラのみ。CEO が望めば別判断） |

CEO 2026-11-03「二つ名・技名・台詞 7 本は暫定維持」→ 忠次の既存 7 本は W2 の **通常攻撃／予告／必殺** 台本の原文として流用する（§5-1）。

---

## 3. 7 場面の設計 — 発火点・時刻・既存の音との関係

### 3-1. 既存の音の時刻表（実コード・変更しない）

| 場面 | engine イベント／表示の起点 | 既存の音（gain・時刻） | 出典 |
|---|---|---|---|
| 入口（戦闘開始） | 入口演出 → `handleEntranceDone` | `boss_entrance`／`godDescend`（入口中に鳴り終わる）→ 神 greeting（大耀のみ・11.8 秒・gain 0.8×0.85＝0.68）→ 初期手札 `card_draw` ×N（0.24） | `OFFICIAL_VOICE_PILOT_V1.md` §4 |
| 敵ターン開始 | `ENEMY_ACTED`（commit は `ENEMY_TURN_REVEAL_MS` 700 後）／必殺は `enemy_rise`（1,060ms 前・0.75）→ カットイン `ENEMY_CUTIN_TOTAL_MS` 1,050 → 着弾 `SPECIAL_IMPACT_MS` 1,260 | `enemy_turn`（0.65）／`enemy_charge`（警告 0.5）／`self_hit`・`self_hit_heavy`（着弾）／必殺は BGM duck 0.343 | `useBattleSound.ts:104-107`・`enemyVfxTiming.ts:31-48`・`feelTier.ts` SOUND_LAYER |
| 強攻撃予告 | `ENEMY_INTENT_SET` kind `charge`（次ラウンドの予告・R 開始時） | `enemy_charge`（0.5） | 同上 |
| 被弾（敵が受ける） | カード着弾 `CARD_IMPACT_MS` 90／重い突き 150・tier 別 hit stop 30〜60／神の一撃 `BURST_IMPACT_MS` 1,600・hit stop 80 | `hit_l1〜l4`（0.45〜1.0）・`burst_rise`（0.7） | `enemyVfxTiming.ts:123-153` |
| HP 低下（敵） | Enemy Break：表示 HP ≤50%（half）／≤25%（quarter）到達（`hpBand`・`useEnemyBreak`） | `BREAK_SE`（gain 0.55・rate 0.7／0.6・v1.0.5） | `visualHp.ts:107-111`・`enemyBreak.ts`・`feelTier.ts` BREAK_SE |
| 撃破 | 最終着弾 → `FINAL_HIT_STOP_MS` 90 → 表示 HP 0 → `enemy-defeat` 崩壊 520ms → **F+640 `victory_sting`（0.612）＋`playJingle('victory')`（BGM pause・ジングルは HTMLAudio・iOS は volume 無視＝K04）** | `battle.css:4687-4688`・`OFFICIAL_VOICE_EXPANSION_AUDIT_V1.md` §4-C |
| 神 crisis（既存） | 自分の HP ≤50% 初回・最後の着弾 +300ms・1 戦 1 回・優先度 2 | duck（声の長さ＋300） | `crisisVoice.ts`・`VOICE_LAYER` |

### 3-2. 敵ボイス 7 場面の配置（設計・新 timer 0）

| # | 場面 | 発火点（既存） | 尺の上限 | 回数 | 他の音との関係 |
|---|---|---|---|---|---|
| V1 | 戦闘開始 | `handleEntranceDone`（神 greeting と同じ瞬間） | **1.2 秒**（神 greeting がある神＝現状 大耀 では **神が先・敵は greeting 終了後に鳴らさない＝drop**。神 greeting の無い 6 神では敵が鳴る） | 1 戦 1 回 | greeting（優先 1）と同順位 → 「神の声が鳴っていれば敵は drop」を `resolveVoiceContention` の規則に追加（同順位の後勝ちを **敵→神の順でのみ許す**） |
| V2 | 通常攻撃 | `ENEMY_ACTED` kind attack／multiAttack の **突進開始**（着弾の 300〜500ms 前・既存 `enemy_turn` SE と同時） | **1.0 秒** | 1 戦 **最大 2 回**（R1 と、R4 以降の最初の通常攻撃。毎 R 鳴らすと 7 回＝うるさい） | `enemy_turn`（0.65）と同時・着弾 SE より小さい実効 0.6 |
| V3 | 強攻撃予告 | `ENEMY_INTENT_SET` kind `charge`（`enemy_charge` SE と同時） | **1.5 秒** | 予告のたび（最大 2 回） | 予告文（tactic line「あと N」）と同じ情報を声で言わない＝**数字を読まない**（読み合いの情報は画面が正・声は態度だけ） |
| V4 | 必殺技 | `ENEMY_ACTED` kind special／技名付き multiAttack の **カットイン開始**（`enemy_rise` と同時・着弾 1,260ms 前） | **1.8 秒**（着弾前に言い切る） | 必殺のたび | 既存の必殺 duck（0.343）に **声の長さを合流**（`duckBgm` は max 合成＝破綻しない）。`enemy_rise`（0.75）と重なる＝声は rise より **100ms 先** に出す（rise の立ち上がり前に語頭を立てる） |
| V5 | 被弾 | カード着弾 **tier ≥3**（`hit_l3`／`l4`）または 神の一撃着弾の **hit stop 直後** | **0.6 秒** | 1 戦 **最大 2 回**（初回の tier≥3 と 神の一撃） | `hit_l3`（0.8）／`l4`（1.0）の直後＝SE が声を潰さないよう **着弾 +60ms**。神の一撃は `burst_rise`→着弾の流れを壊さないため **着弾 +80（hit stop）+40ms** |
| V6 | HP 低下 | Enemy Break **half 到達**（`BREAK_SE` と同時・quarter では鳴らさない） | **1.5 秒** | 1 戦 1 回 | 忠次の「崩れ＝追い込めた」の合図と一致（軍略 then の境界）。神 crisis が同じバッチで鳴る場合は **神優先**（敵 drop） |
| V7 | 撃破 | 最終着弾 ＋ `FINAL_HIT_STOP_MS` 90 | **0.6 秒**（崩壊 520ms の中・`victory_sting` F+640 に **かぶせない**） | 1 回 | ジングル（HTMLAudio・iOS で duck 不可）より前に終わる尺に固定。尺を超える台本は採用しない |

- **敗北側**（プレイヤーが負けた）には敵ボイスを置かない（`defeat_sting`＋ジングルの領分・既存の静けさを守る。勝ち台詞を敵が言う案は「煽り」になり Retry 導線（決定196）の空気を壊す）
- 1 バッチに鳴らす敵ボイスは **1 本**（V4 と V2 が同バッチなら V4）。同ラウンドに V3（予告）と V2（攻撃）が来る＝予告は R 開始・攻撃は敵ターン＝バッチが違うので両立

### 3-3. 優先順位・連続再生・音量（`sound.ts`／`feelTier.ts` の拡張設計）

| 規則 | 設計 | 既存との差 |
|---|---|---|
| チャネル | 既存 voice チャネル 1 本を共用（`activeVoice`）。`VoiceScene` に `enemyStart｜enemyAttack｜enemyCharge｜enemySpecial｜enemyHit｜enemyBreak｜enemyDefeat` を追加 | 新規 AudioContext・GainNode 経路 0 |
| 優先度 | 神：greeting 1・crisis 2・success／fatigue 3（既存）。敵：**すべて 1**。`resolveVoiceContention` を「次が敵で、鳴っているのが神なら **drop**／次が神で、鳴っているのが敵なら **replace**（fade 80ms）／敵同士は後勝ち」に拡張 | 純関数 1 本の分岐追加・既存テスト 15 件は不変 |
| late drop | 敵は **600ms**（短尺・場面の瞬間を外したら鳴らさない）。`sceneLateDropMs` に追記 | 既存 crisis 800・共通 1,500 は不変 |
| 連続再生防止 | 1 戦の回数上限（V2 2・V5 2・V1／V6／V7 各 1）を **表示層の ref**（`enemyVoice.ts`）で数える。Retry／再戦でリセット（crisis の `battleStartKey` と同じ） | 新規フック 1 本（≈40 行）。`src/core` 0 |
| 音量 | `VOICE_LAYER.enemyGain` **0.7**（実効 0.7×0.85＝0.595）＝神 0.68 より小さく、`enemy_turn` 0.65 と同程度・着弾 L3／L4 より下 | 定数 1 個追加（§5 数値集約ルール） |
| duck | V4（必殺）は既存の必殺 duck に合流・V7（撃破）は duck しない（ジングル直前）・他は duck しない | `duckBgm` 呼び出し箇所 +1 |
| ミュート | `setSoundMuted(true)` で即停止・preload しない（既存） | 0 |
| preload | 戦闘開始時に **その敵の 7 本だけ** `preloadVoice`（`releaseVoiceCacheExcept` を敵 id でも使う） | 既存関数の引数拡張 |
| 失敗時 | fetch／decode 失敗は無音（既存） | 0 |

### 3-4. BGM・SE との干渉監査（場面別）

| 場面 | 重なる既存音 | 判定 | 対処 |
|---|---|---|---|
| V1 開始 | 大耀 greeting 11.8 秒 | **競合**（同時に 2 本の声） | 大耀戦では敵 V1 を drop（神優先）。6 神は競合 0 |
| V2 攻撃 | `enemy_turn` 0.65・着弾 `self_hit` 0.45〜0.8 | 軽い重なり | 声を突進開始に置き、着弾前に終わる尺（≤1.0 秒） |
| V3 予告 | `enemy_charge` 0.5 | 同時 | 声は警告音の **後 120ms**（警告の立ち上がりを残す） |
| V4 必殺 | `enemy_rise` 0.75（900ms）・着弾 L4・duck | rise と重なる | 声を rise の 100ms 前から・≤1.8 秒・duck 合流 |
| V5 被弾 | `hit_l3`／`l4`・hit stop | SE が強い | 着弾 +60ms・≤0.6 秒・短い呻き |
| V6 HP 低下 | `BREAK_SE` 0.55・神 crisis（同バッチの可能性） | crisis と競合しうる | 神優先（drop）。BREAK_SE とは同時で可（周波数帯が違う：SE は低域の割れ・声は中域） |
| V7 撃破 | `victory_sting` F+640・ジングル（iOS duck 不可） | **尺で回避** | ≤0.6 秒・F+90 開始＝F+690 までに終える。**超える台本は不採用** |
| 敗北 | `defeat_sting`・ジングル | 置かない | — |

---

## 4. iPhone Safari の制約と検証計画

| 項目 | 既知の事実（実測済み） | 敵ボイスでの扱い | 検証（W2 Human QA） |
|---|---|---|---|
| サイレントスイッチ | WebAudio は BGM（media element）再生中は鳴る。crisis Pilot Q4 PASS（RC preview） | 同じ経路＝同じ挙動 | Q-iOS1：サイレント ON で BGM・声が止まり、OFF で戻るか |
| ホーム→復帰 | K02 BGM 復帰 PASS（2026-10-03）。AudioContext suspended 中の要求は resume 後にまとまって鳴りうる → 既存は late drop で捨てる | 敵は late drop 600ms＝復帰後に古い声は鳴らない | Q-iOS2：戦闘中にホームへ出て戻ったとき、古い声がまとめて鳴らないか |
| `volume` 無視 | HTMLAudio の volume を無視（K04）。WebAudio GainNode は効く | 声は GainNode＝音量は効く。ジングルは duck 不可＝V7 を尺で回避 | Q-iOS3：撃破の声と勝利ジングルが重ならないか |
| ミュート | 1 ボタンで SE＋BGM＋声。声は即停止 | 同じ | Q-iOS4：ミュートで声が即止まるか（既存 Q3 と同じ） |
| 省電力・バックグラウンド | `visibilitychange` 処理 0 件（既存設計） | 変えない（新 timer を作らない設計で副作用を増やさない） | 受入スクリプトで page.hidden を模擬し drop を機械確認 |
| 自動再生制限 | 最初のユーザー操作で unlock（既存 bgm.ts） | 入口の全画面ボタンで unlock 済み | 既存どおり |

---

## 5. ボイス台本案（全 70 本・**すべて非公式のファン創作・CEO 監修前の仮文**）

書式：場面 / 台本 / 演技メモ。尺は §3-2 の上限内。**数字・HP・ダメージ量は読まない**。公式 profile に無い設定は足さない。

### 5-1. 忠次（将軍四天王・軍師）— W2 Pilot

声質：40 代・低めのバリトン・落ち着いた速さ・感情は抑制（怒鳴らない）・語尾を切る。
| # | 場面 | 台本 | 演技 |
|---|---|---|---|
| V1 | 開始 | 「布陣は整った」 | 静かに。既存台詞 1 の前半 |
| V2 | 攻撃 | 「小手調べだ」 | 軽く |
| V3 | 予告 | 「次は……戦況で決める」 | 含み。予告文「傷が浅ければ総攻め」と同義だが数字は言わない |
| V4 | 必殺 | 「軍略――総攻めッ！」 | 唯一の張り。技名は AI 仮 |
| V5 | 被弾 | 「ぐっ……読み違えたか」 | 短く |
| V6 | HP 低下 | 「……ほう。ここまで読むか」 | 既存台詞 7 を圧縮 |
| V7 | 撃破 | 「見事……」 | 0.6 秒以内。息で終える |

### 5-2. 康政（将軍四天王・文化人の指揮官）— W3

声質：30 代後半・テノール・上品でゆったり・常に余裕・敬語混じり。
| V1 | 「さて、指揮を執らせていただこう」 | V2 | 「前へ」 | V3 | 「次で采配が決まります」 | V4 | 「采配――総攻め」（張らず冷たく） | V5 | 「……陣が乱れた」 | V6 | 「ふむ、崩されましたか」 | V7 | 「お見事」 |

### 5-3. 直政（将軍四天王・最も好戦的）— W3

声質：20 代後半・張りのある高めの男声・速い・直情。
| V1 | 「待ちかねたぞ！」 | V2 | 「おらァ！」 | V3 | 「深手なら……猛るぞ！」 | V4 | 「猛り――一文字ッ！」 | V5 | 「痛ぇな……！」 | V6 | 「はは……効いたぜ」 | V7 | 「忠勝に……笑われる……」（profile の対抗心の範囲） |

### 5-4. 岡っ引き（捕り方）— W3

声質：30 代・軽い中音・江戸っ子調・やや小者感。
| V1 | 「御用だ、御用だ！」 | V2 | 「神妙にしろい！」 | V3 | 「次はまとめてしょっ引くぞ」 | V4 | 「十手の……錆にしてやる！」 | V5 | 「いてっ」 | V6 | 「おいおい、話が違う……」 | V7 | 「ひ、ひでぇ……」 |

### 5-5. 影（忍者衆・諜報と暗殺）— W4

声質：年齢不詳・ささやき寄りの低い男声・無感情・短い。
| V1 | 「……任務、開始」 | V2 | 「消える」 | V3 | 「次は……闇から」 | V4 | 「闇討ち」 | V5 | 「……ちっ」 | V6 | 「深追い……したか」 | V7 | 「影は……消える……」 |

### 5-6. くノ一（忍者衆・女忍）— W4

声質：20 代・澄んだ女声・速く軽やか・余裕と遊び。
| V1 | 「影より参ります」 | V2 | 「はっ！」 | V3 | 「次は速いですよ」 | V4 | 「影走り――！」 | V5 | 「きゃっ……」 | V6 | 「あら……やりますね」 | V7 | 「お役目……果たせず……」 |

### 5-7. 鬼半蔵（影の頭領・鬼嶽一族の血）— W4

声質：50 代・太く嗄れた低音・重く遅い・威圧。
| V1 | 「鬼嶽の血が、騒ぐ」 | V2 | 「沈め」 | V3 | 「次は……血の風だ」 | V4 | 「鬼嶽――血風ッ！」 | V5 | 「ぬうっ」 | V6 | 「ほう……影を抜くか」 | V7 | 「頭領の……名に……」 |

### 5-8. 忠勝（将軍四天王・最強の軍神・最後の盾）— W5

声質：40 代・雷のような低音・短く断定・最も重い。
| V1 | 「将軍の盾、ここにあり」 | V2 | 「貫く」 | V3 | 「次は……蜻蛉切が鳴る」 | V4 | 「蜻蛉切――一閃ッ！」 | V5 | 「むっ」 | V6 | 「盾に……罅が」 | V7 | 「将軍……お逃げ……」 |

### 5-9. ドーマン（元・陰陽寮の天才科学者）— W5

声質：年齢不詳・乾いた中高音・早口・愉快さと狂気。
| V1 | 「実験を、始めよう」 | V2 | 「数値を取る」 | V3 | 「塔が……共鳴に応える」 | V4 | 「逆さ五重塔――起動！」 | V5 | 「おや、誤差か」 | V6 | 「興味深い……実に」 | V7 | 「データは……取れた……」 |

### 5-10. 康虎（17 代将軍・独裁者・姿を見せない）— W6

声質：50 代・冷え切った低音・極端に遅い・感情を見せない。
| V1 | 「……面を上げよ」 | V2 | 「下がれ」 | V3 | 「次は、裁く」 | V4 | 「穢土の――裁き」（張らない・最も静かな必殺） | V5 | 「……」（息のみ 0.4 秒） | V6 | 「余に……触れたか」 | V7 | 「……誰も……見てはおらぬ……」（profile「姿を見せない」の範囲） |

- 既存 `battleCries`（画面の吹き出し・ラウンド順）とボイスは **別物**：吹き出しは従来どおり 7 本の文字列、ボイスは場面駆動。同じ文を二重に出さないよう、ボイス採用後は吹き出し側を **短い地の文** に寄せるかは各 wave の Human QA で判断（W2 で忠次だけ試す）
- 女性キャラはくノ一 1 体のみ。公式音声（7 神・OTOMO）の女声を参照しない

---

## 6. 音声生成サービス — 費用・商用利用権・声の権利（Web 一次情報・2026-11-03）

想定量：70 本 × 約 20 文字 ≈ **1,400 文字**（予備・リテイク込みで 5,000〜10,000 文字）。費用は 10,000 文字で概算。出典は公式の料金・規約ページ（取得 2026-11-03）。**JS 描画・403・404 で本文を取れなかったページは「要 CEO 目視」**と明記する（採用前にブラウザで確認）。

| サービス | 日本語品質／演技 | 費用（10k 文字） | 商用利用 | 出力の帰属 | クローン／声の肖像 | クレジット | 出典・注意 |
|---|---|---|---|---|---|---|---|
| **ElevenLabs** | Eleven v3 が日本語対応・`[angry]` 等の audio tag で演技指示可。**Voice Design**（文章の記述から新規の声を合成＝実在人物不要） | Starter **$6／月**（30k credits・初月割引表記あり）→ 1〜2 か月で足りる ≈ ¥900〜1,800 | **Starter 以上**（Free は非商用・ToS §1(c)） | **ユーザーが Output の権利を保持**（ToS §4(c)(ii)・Last Updated 2026-10-09） | 存命人物の声・肖像の無断クローン／なりすまし禁止（Prohibited Use Policy）。透かし除去禁止・誤解を招く場合は AI 開示 | 不要 | pricing／terms-of-use／use-policy／docs models・voices。料金の $5／$6 表記揺れは要目視 |
| OpenAI Audio API | `gpt-4o-mini-tts` は `instructions` で感情指定可だが「voices are optimized for English」。**tts-1／gpt-4o-mini-tts は 2027-01-06 廃止予定** | ≈ **$0.1〜0.4** | 可（Services Agreement：Customer owns Output・ページ本体 403＝要目視） | 顧客へ譲渡（要目視） | 本人同意なき声の再現禁止・**AI 生成であることを聴者に開示する義務**・記述による架空キャラ指定は可（named character の模倣要求は不可） | 不要（AI 開示は必要） | developers.openai.com pricing／text-to-speech／custom-voices |
| Google Cloud TTS（Chirp 3 HD） | ja-JP 30 声。**感情パラメータなし**（pace・pause のみ）＝戦闘ボイス向きではない | 毎月 100 万文字無料 → **$0**（要 billing 有効化） | 可 | 規約に明示なし（未確認） | Instant Custom Voice は同意必須の別製品。プロンプト型 Voice Design なし | 不要 | 料金ページは JS 描画で本文取得不可＝要目視 |
| fal.ai（MiniMax speech-02-hd／ElevenLabs v3 on fal） | MiniMax：日本語・`emotion` 7 種・300+ 既成声（本作の紹介動画で使用実績） | **$0.10／1k chars → $1.00**・サブスク不要 | ページに「Commercial use」表示。fal ToS（2026-09-08）は第三者モデルの追加条件に従う（§14） | **fal は Input のみ顧客帰属を明記・Output は不明確** | 肖像・プライバシー侵害素材の禁止。**MiniMax Open Platform 規約は本文取得不可**（消費者向け Audio 規約は「personal, non-commercial」＝API 規約と別物の可能性） | 不要 | fal models／terms。帰属と MiniMax 規約が未確認のため **保留** |
| **VOICEVOX** | 無料ローカル。キャラ別スタイル＋イントネーション編集。読み上げ寄りで迫力は限定的 | **¥0** | 全キャラ商用可（ソフト規約＋各キャラ policy.md）。**青山龍星のみ企業関与時は事前確認必須** | 利用許諾型（明示なし） | 声優提供の公式ライブラリ（クローンではない）。キャラのイメージを著しく損なう用途・政治・宗教・風俗は禁止 | **必須「VOICEVOX:キャラ名」**（紹介画面等に記載） | voicevox.hiroshiba.jp/term・voicevox_resource policy.md・zunko.jp 等 |
| COEIROINK／Style-Bert-VITS2 | 無料・感情はモデル依存（SBV2 はスタイル強い） | ¥0（自前 CPU／GPU） | 音声ライブラリごと（おふとんP・KANA・あみたろ・小春音アミ・つくよみちゃん 商用○／JVNV は CC BY-SA 4.0） | 明示なし | 学習データ利用・転移学習禁止（COEIROINK）／なりすまし・ディープフェイク禁止（SBV2 お願い） | **必須**（「COEIROINK:名」／モデル規約の文面） | coeiroink.com/terms・SBV2 TERMS_OF_USE・つくよみちゃん |
| にじボイス | アニメ声 100 体・テキストから感情自動推定・1 リクエスト 140 文字 | API プリペイド **¥825／1 万文字**（Web：Free 1,000 文字／月・Start ¥490／5,000 文字） | 二次情報では商用可。**公式サイト 404／docs 403＝本文未確認** | 未確認 | 独自アニメ声（クローンではない）。アダルト・公序良俗違反禁止 | **必須「にじボイス」or「NIJI Voice」** | Impress 2024-12-12・weel 2026-10-09（二次情報）＝採用前に **CEO 目視必須** |
| CoeFont | 日本語ネイティブ・1 万声超・感情制御は未確認 | Standard **$20／月**（API は Plus $350／月） | Standard 以上のみ商用可（解約後も継続可） | 本体規約 404（未確認） | 登録済みの声提供者の声（自分でクローンする形ではない） | Standard 以上は不要 | coefont.cloud plan／faq |

### 6-1. 方針に関わる注記

- **AI 開示**：OpenAI は TTS の利用で「AI 生成であることを聴者に明示」を要求。本作は規約 §5 対応として Credits に「AI 音声サービスで制作した非公式の音声」と書くので、どのサービスでも開示要件は同じ 1 行で満たす
- **架空キャラへの使用**：いずれのサービスも禁止なし。OpenAI の custom voices のみ「named fictional character の模倣要求は不可」＝記述で声を指定する（本作の運用と一致）
- **第三者 IP**：全サービスが「必要な権利を保持していること」をユーザー責任とする（ElevenLabs §4(g)・fal §6(d)・Google §1.6）。Kit 規約 §5 の範囲内なら抵触しないが、サービス側は保証しない＝台帳に Kit 規約の確認日と併記
- **クローン禁止**：ElevenLabs／OpenAI／Google／fal すべて本人同意なき声の複製を禁止。本件は Voice Design か既成声だけを使うので、運用で問題なし。公式 7 神音声を入力しない規則（§7）はこれと独立に守る
- **クレジット必須系**（VOICEVOX・COEIROINK・にじボイス）は Credits 画面の素材行で満たせる（既存 `creditsText.ts` の様式）。ただし VOICEVOX のキャラ名表記は「将軍家の敵＝ずんだもん」のような **キャラ名の露出** を伴い、世界観と合わない

### 6-2. 推奨（AI 判断・CEO 承認対象）

| 順位 | サービス | 理由 | 条件 |
|---|---|---|---|
| **1（推奨）** | **ElevenLabs Starter（$6／月・1〜2 か月・上限 ¥3,000）** | Voice Design で **実在人物を使わない独自の声** を 10 体ぶん作れる・v3 の audio tag で怒鳴り／囁きの演技差が付く・商用ライセンスと Output の帰属が最も明快・クレジット不要（キャラ名露出なし） | Starter 契約は CEO（§6-3 #6）。料金表記の揺れ（$5／$6・初月割引）は契約画面で目視 |
| 2（0 円代替） | VOICEVOX | 費用 0・商用可・規約明快 | 「VOICEVOX:キャラ名」の表記必須＝Credits に VOICEVOX キャラ名が並ぶ（世界観と不一致）。青山龍星は企業関与の事前確認。演技幅はスタイル依存で敵の迫力が出にくい |
| 3（保留） | にじボイス API（¥825／1 万文字） | アニメ演技の日本語品質は有力 | **公式規約を本日取得できず**（404／403）。CEO がブラウザで商用条件を確認できれば 1 位と並ぶ。クレジット必須 |
| 不採用 | Google Chirp 3 HD（感情なし）／OpenAI TTS（英語最適化・2027-01 廃止）／fal MiniMax（Output 帰属と MiniMax 規約が未確認・紹介動画では使用したが **ゲーム内配信素材** には帰属の明確さを優先）／CoeFont（$20／月で優位性なし） | — | — |

- 推奨の運用：ElevenLabs Starter を **W2 開始時に 1 か月だけ契約** → 忠次 7 本＋声のプリセット 10 体ぶんの Voice Design を同月に作り保存（ledger.json）→ W3〜W6 は保存した声で生成（必要なら 2 か月目）→ 解約。Output の帰属はユーザー（解約後も使用可・ToS 要目視）
- **不確実性**：Google 料金・OpenAI 規約・MiniMax 規約・にじボイス公式・CoeFont 本体規約は自動取得不可。数値は公式ページの検索スニペットか二次情報。**採用前に CEO がブラウザで当該ページを目視すること**（本書は目視を代替しない）

---

## 7. 権利・台帳・表示の運用（確定案）

| 項目 | 運用 |
|---|---|
| 入力に使わないもの | 7 神・OTOMO の公式音声 28 本（参照・学習・クローン・声質指示の「〜のような声」記述を含めて禁止）／実在の声優・俳優名を指示に書かない |
| 声の作り方 | サービスのプリセット音声、または **テキスト指示だけの Voice Design**。生成 1 回ごとに要求本文・日時・モデル名・応答 id を `audio-source/voice-ai/<enemy>/ledger.json` に保存（C2PA が mp3 に残らないため） |
| 原本保全 | 生成 wav／mp3 原本を `audio-source/voice-ai/<enemy>/` に tracked で保全・配信は `public/assets/voice/enemies/<enemy>/<scene>.mp3`（mono 64kbps・-1 dBFS ピーク・先頭無音 ≤20ms） |
| 台帳 | `VOICE-AI-<nn>`：Path／Source／Category voice／Creator「本作（AI 生成・非公式）」／Model-Service（サービス・モデル・プラン）／Generation date／Prompt reference（ledger.json）／Reference inputs「なし（公式音声を入力していない）」／Terms version・date checked／Commercial use／Modification／Attribution（サービスが要求する場合の文言）／Canonical source「—（非公式）」／Evidence sha256／Status |
| Credits | 素材行に「将軍家の音声は、本作が音声生成サービス（<サービス名>）で制作した非公式のものです」＋サービスのクレジット要件があればその書式。「公式」「公式ボイス」「公認」を書かない（文字列テスト） |
| 敵の名前の表記 | 公式名・role のみ公式。二つ名・技名は Credits で「本作の創作」と明記（W1 と同じ） |
| SGG 運営への連絡 | 規約上は不要（§5 で明示許可）。運営報告と同時に **任意の 1 通**（作品名・URL・「非公式表記で AI 音声を使用」）を CEO 判断で送る |

---

## 8. 必要ファイル数・実装順・工数

| wave | 敵 | 音声ファイル | 台帳行 | コード | 工数（AI） | CEO |
|---|---|---|---|---|---|---|
| W2 | 忠次 | 7（≈120 KB） | 1 | `enemyVoice.ts` 新規 ≈40 行・`sound.ts` scene／contention ≈25 行・`feelTier.ts` 2 定数・`EnemyPanel`／`BattleScreen` 配線 ≤10 行・テスト（場面・競合・回数・late・ミュート・sha256・禁止語）≈120 行・受入スクリプト 1 本 | 1.5 日＋Gate 0.5 日 | 台本監修 1 回・試聴・iPhone 4 問 |
| W3 | 岡っ引き・直政・康政 | 21 | 3 | **0**（データ表に 3 体追加） | 0.5 日 | 試聴・各 1 戦 |
| W4 | 影・くノ一・鬼半蔵 | 21 | 3 | 0 | 0.5 日 | 同上 |
| W5 | 忠勝・ドーマン | 14 | 2 | 0 | 0.5 日 | 同上 |
| W6 | 康虎 | 7 | 1 | 0 | 0.25 日 | 同上 |
| 合計 | 10 体 | **70**（≈1.2 MB・1 戦 ≈120 KB 遅延ロード） | 10 | W2 のみ | ≈4 日 | 試聴 5 回・iPhone 1 回 |

- 生成は **wave ごとに一括**（1 サービス・同一設定・ledger.json）。再生成は NO 判定の行だけ
- 音量正規化・mp3 化は ffmpeg（ローカル・外部送信なし）。先頭無音の除去で late drop の実効余裕を稼ぐ

---

## 9. CEO 判断（`FINAL_SCOPE_ROADMAP_V1.md` §8 の ② に統合）

- 音声生成サービスの選定・予算上限・生成開始（§6-3 #5／#6）。本書 §6 の推奨をそのまま承認するか、別サービスを指定するか
- 台本 70 本の扱い：**「仮文のまま W2 で試し、聴いてから直す」を推奨**（文字で監修するより 7 本を聴く方が速い）

## 10. 本書で変更していないもの

- `src/`・`public/`・`audio-source/`・`scripts/`・`package.json`：変更 0。音声生成・有料 API・Kit ダウンロード：0
- 既存 dirty／untracked・Ranking・Neon・secrets：触れていない
