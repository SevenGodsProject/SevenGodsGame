# SGG Creator Kit v1.1 活用監査（公式ボイス 28 本・将軍家 10 体・MCP・権利）— Evidence

- 監査日：2026-10-09（CEO 指示・**read-only 監査**。実装／素材ダウンロード／commit（本書以外）／push／deploy／MCP 設定変更／新規 Decision は **0**）
- 判定：**AI 判断**（CLAUDE.md §6-2）。権利の可否認定は行わない（§6-3 #5 は CEO）
- 結論：**公式ボイス 68／100・将軍家 55／100・両方とも v1.0 導入見送り**。公式ボイス Pilot は **v1.0 公開後の候補**として記録のみ（Decision 番号は付けない）
- 優先順位：**Public Face Pack v1（CM-01）→ Save Compatibility Guard → Release Safety → Practical QA v3 → v1.0 は不変**（`docs/ROADMAP_TO_RELEASE.md`）。本書はこの順序に何も挿入しない
- 一次情報：公式サイト `https://sevengodsgames.com/creator-kit`／公式 3D Kit `https://sgg-creator-kit.svc-manage-2020.workers.dev/`／同 `/mcp`（curl による JSON-RPC 読み取りのみ）／`/creator-kit/v1/RIGHTS.md`／`/creator-kit/v1/manifest.json`／`/creator-kit/shogunate/v1/manifest.json`
- 監査時の Git 状態（事実）：作業 worktree `SevenGodsGame` は `feat/d224-premium-payoff-pilot` `43c10a4`・tracked 変更 12・未追跡 1,870（合計 1,882 行）で**一切触れていない**。本書は integ `master`（`26a3171` 起点・tracked 変更 0）へ **本書 1 ファイルのみ** commit する

---

## 1. 結論（CEO 指定 7 項目）

| # | 項目 | 判定 |
|---|---|---|
| 1 | 公式ボイス導入価値 | **68／100** |
| 2 | 将軍家導入価値 | **55／100** |
| 3 | v1.0 への導入可否 | **両方とも導入しない**（ROADMAP §5 DoD は固定・Human QA Lane を増やさない） |
| 4 | 最初に試す神と場面 | **大耀「あいさつ（greeting）」を戦闘開始時**（BossEntrance 1.5 秒の直後・決定257 の `duckBgm` 経路） |
| 5 | 必要な実装範囲 | S（音声 1 本の自前配信＋`sound.ts` に voice チャネル＋開始時 1 呼び出し＋台帳 1 行＋規約コピー更新。`src/core` 0） |
| 6 | 想定リスク | 尺が未計測（ダウンロード禁止）／規約 ID 据え置きで台帳が曖昧／勝利場面はジングルと衝突／セリフ内容が決定20 の性格設定と合うか未確認 |
| 7 | 推奨 NEXT ACTION（1 件） | **Public Face Pack v1 完了後に「公式ボイス Pilot v1 Preflight」（docs＋尺計測のみ）を起票** |

採点根拠（§6-1 の軸）：

| 軸 | 公式ボイス | 将軍家 |
|---|---|---|
| Player Value | 中〜高（神の「声」は本作に 0。公式＝権利コスト 0・生成コスト 0） | 中（公式正典の敵陣営。ただし現行 7 体と同じ 4 語彙では「敵の差が薄い」（決定244）が再現する） |
| Strategic Depth | 0（音のみ） | 新メカニクスが無ければ 0。あれば `src/core` 変更 |
| Game Feel | 中（識別性）。ただし決定257 で特定済みの「神の一撃 1,180ms 無音窓」に合う場面は 4 場面に**無い** | 低〜中（静止画 1 枚） |
| Rights | 強（Kit 公式・§5 で明文化） | 強（現行敵 7 体は CEO 生成・台帳 △。公式素材なら ◎） |
| Implementation Cost | S | L（曜日ローテ・49 攻略盤・gameVersion・balanceSim と密結合） |
| Regression Risk | 低（UI 音のみ） | 高（敵 roster は core／save／Daily に波及） |
| 時期 | v1.0 後の Growth 第 1 弾候補 | Growth Phase 後半（敵語彙設計と K07 アート判断の後） |

---

## 2. 監査1：公式ボイス 28 本

### 2-1. 事実

| 項目 | 実測・一次情報 |
|---|---|
| 構成 | 7 神 × 4 場面＝28 本。場面＝`greeting`（あいさつ）／`crisis`（ピンチ）／`fatigue`（お疲れ）／`success`（勝利） |
| 形式 | MP3（`audio/mpeg`）。URL 形式 `/creator-kit/voice/v1/<god>/<god>-<scene>.mp3`（公式サイト・workers.dev 双方で配信） |
| 容量 | 1 本 122,925〜252,333 byte。神ごとの 4 本合計：ebisu 633,396／taiyo 687,924／sobi 706,740／saika 690,228／juraku 582,324／fukuei 599,988／shouren 693,300。**28 本合計 4,593,900 byte ≈ 4.6MB** |
| 尺 | **未計測**（ダウンロード禁止）。容量からの推定 5〜14 秒（128〜192kbps 仮定）。Pilot 前に必ず計測 |
| sha256 | 2D manifest（v1.1.0）には**ボイス項目なし**（`godVoiceRulesIncluded: 0`）。sha256 は公式 MCP `get_voice` でのみ取得可（例：taiyo greeting `cdb5d44c6b0c48d7…`・taiyo success `c480aeae8d31ec98…`・ebisu success `44dfb22aa047fe29…`） |
| キャラクター ID | Kit の god id＝`ebisu／taiyo／sobi／saika／juraku／fukuei／shouren`＝本作 `GOD_IDS`（`src/core/data/gods.ts`）と**完全一致**。MCP 上の id は `<god>-god` |
| 配信ヘッダ | `Cache-Control: public, max-age=0, must-revalidate`・`Content-Length` なし（chunked）・**CORS ヘッダ無し** → 本作 origin からの fetch＋decode は不可。**自前配信（`public/assets/voice/`）が前提** |
| 利用条件 | 規約 §5（本書 §5-1）。Kit 配布音声は「本ガイドラインの範囲で作品に使える」。クレジット任意 |

### 2-2. 既存の音声・演出構造との整合（integ master `26a3171` 時点）

| 観点 | 既存 | 公式ボイスの載せ方 |
|---|---|---|
| SE 経路 | `sound.ts`：WebAudio `AudioBuffer`・fetch→`decodeAudioData`・gain は `feelTier.ts` `SE_GAIN`（master 0.85）・22 音源は全て数式合成（決定128／257） | 新 voice チャネルを同経路に追加。MP3 は全ブラウザで decode 可。fallback tone は持たない（失敗時は無音） |
| BGM | `bgm.ts`：HTMLAudioElement 0.35・決定257 で WebAudio GainNode 経由の `duckBgm(holdMs)`（iOS の volume 無視対策済み） | 再生中は `duckBgm(尺 + 300ms)` を流用。新規経路 0 |
| ミュート | `App.tsx` の 1 ボタンが `setSoundMuted`＋`setBgmMuted` を同時に切替 | voice も `sound.ts` の `muted` フラグを共有＝**設定変更なしで整合** |
| スマホ | `getCtx()` が suspended なら resume・戦闘開始は tap 後 | 同じ。decode PCM は 8 秒 stereo で ≈2.8MB → **選択中の神の 1 本だけ遅延ロード**（28 本の preload 禁止） |
| 連続再生防止 | SE は 30ms dedup・late >400ms drop | voice チャネル 1 本・新規再生で前の source を stop・**1 戦 1 回**（ref フラグ）・late >400ms は鳴らさない |
| 音量 | `SE_GAIN` 階層（impact／feedback／stateChange／reward／warning／bigMoment） | `voice` 階層を 1 つ追加（初期値 0.8 前後・`feelTier.ts` に閉じる） |
| 容量・ロード | SE 452KB・BGM 20MB（WebM＋MP3） | +1 本 ≈190KB（大耀 greeting）。遅延ロードのため LCP／CLS 影響 0 |

### 2-3. 場面ごとの適合

| 場面 | 本作の対応場面 | 競合 | 判定 |
|---|---|---|---|
| greeting | 戦闘開始（`sfx.bossEntrance()` 1.5 秒の直後・battle BGM 稼働中） | 初期手札 `card_draw`（feedback 0.3）のみ | **◎ 最初の Pilot** |
| crisis | 本作に「ピンチ状態」が存在しない（grep：`decisionFeedback.ts`／`formatEvent.ts` のみ） | HP 閾値ルールを `rules.ts` に追加＋1 戦 1 回 | △ 後回し |
| fatigue | 敗北／セッション終了 | `defeat_sting`＋敗北ジングル（HTMLAudio 直結・duck 不可） | ✗ 不採用 |
| success | 勝利 | `victory_sting`（bigMoment 0.8）＋勝利ジングル 0.5・最大 9 秒。ジングルは GainNode を通らず **iOS で音量を下げられない** | △ ジングル配線変更が必要 |
| （参考）神の一撃 | 決定257 で特定した 1,180ms 無音窓 | 4 場面に該当なし | **公式ボイスは BF-02（God Strike Voice）の代替にならない** |

最初の 1 神＝**大耀**：決定218／232／257 の Human QA 基準神で Evidence が揃っており、カード画 v2（CARD-NEXT-01）も大耀で進行中のため、比較対象が最も多い。

---

## 3. 監査2：将軍家 10 体

### 3-1. 事実

| 項目 | 実測・一次情報 |
|---|---|
| 2D | 別 manifest `/creator-kit/shogunate/v1/manifest.json`：`kitId sgg-creator-kit-shogunate`・`kitVersion 1.0.0`・`releasedAt 2026-10-08`・10 体／**16 枚**・WEBP 1600×1600・`termsId SGG-FAN-CREATION-GUIDELINES-1.0.0`・bundle `sgg-creator-kit-shogunate-v1.zip` |
| 枚数内訳 | FRONT＋BACK：康虎・忠勝・直政・忠次・康政・鬼半蔵（6 体）／MAIN のみ：影・くノ一・岡っ引き／FRONT のみ：ドーマン |
| 3D | 全 10 体 GLB（≈10.7〜11.8MB・約 29 万三角形・**リグ無し静止モデル**・`animations: []`）。本作（2D React）には不要 |
| 役割・設定（公式プロフィール） | 康虎＝17 代将軍（独裁者）／忠勝・直政・忠次・康政＝将軍四天王（最強の盾・好戦・軍師・文化人の指揮官）／鬼半蔵＝忍者衆「影」の頭領／影・くノ一＝忍者衆／ドーマン＝元陰陽寮の科学者／岡っ引き＝捕り方 |
| ボイス | **無し**（MCP instructions：「OTOMO and SHOGUNATE have none」） |

### 3-2. 既存 7 敵との違いと「新しい攻略判断」評価

- 既存 7 体（`src/core/data/enemies.ts`）は `attack／charge／multiAttack／special` の 4 語彙＋決定252 Enemy Ultimate。決定244 の実測で **4/7 が attack のみ・別の解き方を要求するのは機工師・魔獣の 2 体だけ**
- 将軍家の役割は敵の型へ翻訳しやすい（忠勝＝盾役／忠次＝軍師＝予告読み／影・くノ一＝暗殺・連撃／康虎＝`rank` ★5 予約枠の最終ボス／岡っ引き＝入門枠）。ただし **新しい判断は新メカニクス（`src/core`）があって初めて生まれる**。語彙を足さずに 10 体を追加しても「敵の差が薄い」が再現する
- 密結合（追加時の波及）：`DAILY_BOSS_POOL`＝`ENEMY_IDS` 7 体の曜日ローテ（`dailyBoss.ts`）／49 攻略盤（`matchupStorage.ts`・`MatchupBoard.tsx`）／`gameVersion.ts` が `ENEMIES` をハッシュ（リプレイ・Ranking 互換）／`balanceSim.test.ts`／敵ごとの舞台背景・battleCries・typeLabel
- 現行 7 体の絵を将軍家へ**差し替える**案は、敵の名前・設定（蒼海の龍神 等）の変更＝IP 設定変更で **§6-3 #3（CEO 判断）**。本書では提案しない
- **判定：v1.0 不要。Growth Phase（敵語彙設計 → K07 敵アート判断 → roster 拡張の順）**

---

## 4. 監査3：公式 Creator Kit MCP

| 項目 | 実測（curl・設定変更 0） |
|---|---|
| Endpoint | `https://sgg-creator-kit.svc-manage-2020.workers.dev/mcp`・Streamable HTTP・`GET` は 405・`POST initialize` 200 |
| Server | `sgg-creator-kit` v0.3.0・protocol `2025-06-18`・ステートレス（`Mcp-Session-Id` 無し）・capabilities：tools／resources |
| Tools（5・全て `readOnlyHint: true`） | `search_characters`（family GODS／OTOMO／SHOGUNATE）／`get_character`／`get_model`（GLB・sha256・サイズ）／`get_voice`（MP3 URL・sha256・bytes・`voicePolicy`）／`get_usage_terms`（規約全文） |
| Resources（2） | `sgg://catalog`（JSON）／`sgg://usage-terms`（Markdown） |
| Server instructions | 「Read-only official SGG character catalog… Official voices exist only for the 7 GODS… Creators may use their own voices but must not call them official… Do not invent canon or substitute partner characters」 |
| Claude Code からの接続 | 可能（下記コマンド）。**本監査では実行せず**。`~/.claude.json` の本プロジェクト `mcpServers` は `{}` のまま・`.mcp.json` なし |
| 用途 | 台帳記入時の sha256・規約全文の取得。外部サーバーの返答は信頼しないデータとして扱う。接続は Pilot 着手時にプロジェクト scope で足せば足りる |

```
claude mcp add --transport http sgg-creator-kit https://sgg-creator-kit.svc-manage-2020.workers.dev/mcp
```

---

## 5. 監査4：権利（最新規約と Rights Ledger の差分）

### 5-1. 規約の変更（公式サイト・workers.dev・MCP `get_usage_terms` の 3 経路で**同一テキスト**を確認）

- 冒頭に 1 行追加：`Updated: 2026-10-08（5. キャラクターの声を追加）`（`Effective: 2026-07-16` は不変）
- §5 を新設し、旧 §5〜§8（禁止事項／対象となる権利／迷った場合の相談／違反時の対応・免責・変更）は **§6〜§9 へ繰り下げ**。本文の変更は §5 追加のみ（diff で確認）
- 新 §5 原文：

> ## 5. キャラクターの声
>
> - SEVEN GODS の公式の声は、SGG Creator Kit で配布している音声だけです。
> - 公式の音声は、本ガイドラインの範囲で作品に使えます。
> - 自分で声を作って使うのも自由です（AIで作る、自分や知り合いが演じる、など）。公式の声がない OTOMO や将軍家のキャラクターも同じです。
> - ただしその場合は、「公式」「公式ボイス」「公認」など、公式の声だと思わせる言葉を書かないでください。

- 不変：商用利用 OK・印税不要（§1）／クレジット任意・3 書式（§4）／「非公式設定や二次創作を公式・公認・提携作品であるかのように表示」禁止（旧 §5→新 §6）／「GODS の口調設定本文は公開配布対象に含みません」（新 §7）
- Kit manifest：2D `kitVersion 1.0.0 → 1.1.0`（`slotsPerPair 6→8`・`images 42→56`＝OTOMO 三面図 14 枚追加・`releasedAt` は 2026-07-16 のまま）／将軍家は別 manifest（§3-1）／ボイスはどの manifest にも無い

### 5-2. Rights Ledger（`docs/ASSET_RIGHTS_LEDGER.md`）および repo 内コピーとの相違

| # | 相違 | 影響 | 対応（本書では実施しない） |
|---|---|---|---|
| 1 | `termsId` が **`SGG-FAN-CREATION-GUIDELINES-1.0.0` のまま据え置き**（本文は 2026-10-08 更新） | 台帳「Terms version・date checked」列の ID だけでは新旧を区別できない | 今後の Kit 行は「1.0.0（Updated 2026-10-08）・確認日」と書く |
| 2 | repo コピー `docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md` は **§5 を含まない旧版**（diff：§5 追加＋節番号繰り下げのみ） | Kit 行の根拠文書が古い | Pilot 着手時に最新テキストへ更新（docs-only） |
| 3 | repo コピー `docs/assets-kit/manifest.json` は **1.0.0**（公式 1.1.0・将軍家 manifest 未取込） | 三面図・将軍家の sha256 照合ができない | 必要になった時点で取込（本書では不要） |
| 4 | 台帳 §4 #12「Kit Guidelines を CEO が確認した日付」は **UNKNOWN のまま** | 変更なし（既存の未確定） | 既存運用どおり |
| 5 | 本作の自作ボイス＝**0 本**（`SeName` に voice なし） | §5 の「公式と誤認させる表示」禁止に現時点の抵触なし | 将来 OTOMO／敵に AI 音声を足す場合は「公式」「公認」と書かない |
| 6 | アプリ UI に「二次創作」「Based on SEVENGODS Games」等の表示が **無い**（`src`／`index.html` grep：コード注釈のみ） | クレジットは任意のため違反ではないが、非公式作品であることの明示が弱い | CM-01 の meta description に載せるのが自然（CM-01 の範囲内・順序変更なし） |

---

## 6. 公式ボイス Pilot v1（v1.0 後の候補・**Decision 番号なし・起票のみ**）

| 項目 | 内容 |
|---|---|
| 対象 | 大耀 `greeting` 1 本（`voice/v1/taiyo/taiyo-greeting.mp3`・189,357 byte・sha256 `cdb5d44c6b0c48d7a676f11b2d69a4d4dbb69e0f90abb1efd143ba2264aba3cc`） |
| 前提（Preflight で確定） | ①尺を計測（受入目安 ≤3.0 秒。超える場合は冒頭のみ使う加工＝§2 で許可）②セリフが決定20 の性格設定と矛盾しない ③CEO が公式ページで試聴し音質・声質が本作のトーンに合う（コスト 0） |
| 実装範囲 | `audio-source/voice/`（原本保全）＋`public/assets/voice/taiyo/greeting.(mp3 or webm)`／台帳 VOICE-KIT-01 を**配置前に**記入（§1-4）／`sound.ts` voice チャネル／`feelTier.ts` `SE_GAIN.voice`／戦闘開始 1.5 秒後に `duckBgm` ＋ 1 呼び出し（1 戦 1 回）／regression：wiring 1 回・mute・late drop／規約コピー更新 |
| Human QA（1 問） | 「大耀の声で『自分の神』だと感じたか（YES／NO）」。NO なら撤去（音源は原本のみ残す） |
| CEO 判断 | 不要（§6-2：素材は公式・無料・規約内。Production 公開時のみ §6-3 #8） |

---

## 7. 本書の制約と証拠

- 作成：integ `master` に **本書 1 ファイルのみ** `git add docs/CREATOR_KIT_V1_1_AUDIT.md` で staged → `git diff --cached --stat` 1 file を確認 → commit。`git add .`／`-A` 不使用・素材の移動／削除 0・push 0・deploy 0
- 作業 worktree `SevenGodsGame`（`feat/d224-premium-payoff-pilot` `43c10a4`）：tracked 12／未追跡 1,870 は監査前後で不変・stash 0
- 取得した規約テキスト 3 本（site／workers／MCP）と将軍家 manifest は session scratchpad のみに保存（repo 外）
- 参照：`docs/PRACTICAL_QA_2026-09-28_AUDIT.md` §8（God Strike Voice Feasibility）／`docs/DECISION257_SOUND_LAYER_V1_PILOT.md`（duck 経路・1,180ms 無音窓）／`docs/POST_D257_REMAINING_WORK_AUDIT.md`（07 Voice＝BLOCKED／DEFERRED）／`docs/MASTER_BACKLOG_AUDIT.md` BF-02／`docs/ROADMAP_TO_RELEASE.md` §5 DoD
