# Phase 3「神格」FINAL SPEC v0.1 — God Identity（神Passive × 条件付きEffect）

- 作成日：2026-09-06
- 作成：Claude Code（AI-PM／Planner／Dev ペルソナ）。CLAUDE.md §6 に基づく **AI判断文書**。CEOが決めたのは Phase 3 の方針（引継書 §16）と各Step の GO/NO-GO のみ
- 状態：**IMPLEMENTATION READY（ChatGPT最終監査待ち）**。本番コード・カードデータ・UIは未変更。本文書は **未commit**
- 根拠：Step 1 `docs/PHASE3_STEP1_GOD_AUDIT.md`（`5b5808b`）、Step 2 `docs/PHASE3_STEP2_MINIMAL_DESIGN_AUDIT.md`（`1ba5219`）、Step 2.5 `docs/PHASE3_STEP2_5_CARD_PREFERENCE_VALIDATION.md`（`0b791bb`）、最終 narrow pilot（本文書 §12）
- 監査対象commit：`0b791bb`（master、origin/master に対し ahead 3／behind 0、push未実施）

---

## 1. Executive Summary

Phase 3 v0.1 で本番に入れる変更は **2種類の新ルールと4枚のカード追記** だけ。

| 種別 | 内容 | 対象 |
| --- | --- | --- |
| 神Passive（3神） | 蒼毘「反撃の構え」＝敵ターン終了時、残ったブロックを**そのまま（100%）**敵へダメージ／笑蓮「無傷の慈愛」＝カードを使う時点でHPが最大の**80%以上**なら攻撃カードのダメージ**+50%**／福永「大勝負」＝HPが最大の**50%以下**なら攻撃カードのダメージ**+50%** | 蒼毘・笑蓮・福永。恵比寿・大耀・才華・寿楽は変更なし |
| 条件付き追加効果（4枚） | カードに「本体効果＋（条件なら追加効果）」を1つ持たせる `bonus` | 不動の構え・一喝（蒼毘）、福袋・笑って許す（笑蓮） |

変更しないもの：共通32枚、他神の専用24枚、BURST（Decision 127含む）、OTOMO、共鳴経済、神託、おすすめデッキ、神階Ⅰ〜Ⅶ modifier、Daily、報酬構造、スコア式、寿楽。新resourceなし。saveVersion 9 のまま。

期待効果（探索AI、Step 2 full・Step 2.5・最終pilot）：神階Ⅶ 神間スプレッド 29.5→約15pt、最弱神 70→85%以上、fortress／control が最良になる神 1→3、看板と実態が一致する神 2→4、専用カードの有意負価値 12→約3枚。**未解消RISK：共通32枚のGod間順位相関は改善しない（0.64→0.69）。共通カード／報酬レベルの差別化は Phase 4 最優先候補として引き継ぐ（§14・§19）。**

---

## 2. Design Goal

**「その神らしく遊ぶこと」と「勝つための最適行動」を一致させる。** 単純な属性一致buffではなく、「守る／回復する／窮地に立つ」という行動が「殴る」に変換される構造で、防御・回復・リスクという看板の戦い方を実際の最適解にする。

North Star（引継書 §16）：どの神を選ぶかによって、考え方・強いカード・勝ち筋が変わる。ただし7つの別ゲームにせず、3分playを維持する。

---

## 3. Step 1–2.5 Evidence（要約）

| Step | 主な結論 | 本SPECへの反映 |
| --- | --- | --- |
| 1（監査） | 差別化21/100。神本体に固有ルール無し。Effectは無条件9種。防御・回復はAP効率で構造的に負ける（敵ダメージの51〜74%がR5以降、テンポ点1R分 91〜117 vs 残HP最大39）。寿楽一強の主因はデッキ＋神階のATK倍率→デバフ定数減算の順序 | Passive／条件付きEffectの導入。寿楽nerf・デッキ統一・神階是正は不採用 |
| 2（設計監査、約25万試合） | 「守る→殴る」「満タン→殴る」「窮地→殴る」の変換型Passiveだけが fortress／control を最適化。3神で足りる（2神では福永が26%のまま、7神では才華・大耀が純粋強化）。カードは4枚で十分（6・9枚は上積みなし）。デッキ統一は神階崩壊かIdentity破壊、神階緩和は易化のみ | Passive 3神＋条件4枚。数値差し替えのみ・条件のみ・全7神・デッキ統一・神階緩和を却下 |
| 2.5（対応標本、約11.3万試合） | 専用負価値 17→10（有意 12→4、全て笑蓮）、変更4枚は蒼毘で正に転換。**共通32枚の順位相関は 0.64→0.69 で改善せず**、報酬3択の神別価値は 0.99→0.49pt に縮小。残り3神は別の主軸（才華＝手数/AP、大耀＝BURST火力、恵比寿＝最速撃破）で成立 | 共通カード差別化を未解消RISKとして記録。笑蓮の閾値・蒼毘の係数を最終pilotで確定 |
| 最終pilot | 笑蓮閾値 100／90／80／70%、蒼毘係数 50／75／100% を対応標本で比較（§12-3） | 笑蓮 80%、蒼毘 100% を採用 |

---

## 4. Final 7 God Playstyle Matrix（v0.1 実装後の想定＝simulation実測）

| 神 | 主軸（1つ） | 副軸 | Passive | 最適プロファイル（Ⅶ normal／stress） | 勝ち筋の1行 | 優先カード傾向 |
| --- | --- | --- | --- | --- | --- | --- |
| 恵比寿 | 汎用速攻（最速撃破 R4.8） | 回復 | なし | resonance／balanced | 高効率の攻撃札を撃ち続け、BURST＋神力2で最速で仕留める | 神託・大喝・渾身・乱舞（汎用火力） |
| 大耀 | BURST火力（burst由来28%＝7神最大） | atkバフ | なし | resonance | 共鳴札で7/7へ運び、36ダメージで決める | 予言・秘技満ちる・神楽舞・共振（共鳴札を高評価する唯一の攻撃型） |
| 蒼毘 | **反撃防御** | デバフ（一喝・呪縛） | 反撃の構え | control／**fortress** | 予告に合わせてブロックを積み、受け切った盾を反撃に変える | 専用4枚全て正、共通ブロック札が他神より高価値、剛撃より秘技満ちる・神楽舞 |
| 才華 | 手数／AP（draw+AP 2.5倍） | 共鳴到達 | なし | resonance／rush | 神力とカードを増やし、軽い札を並べて撃ち切る | 神速・神力の泉・共振（順位相関 0.37〜0.55 で7神中唯一独自） |
| 寿楽 | 制圧（デバフ実効26〜38） | 火力 | なし | control／**fortress** | 敵ATKを削って被弾を消し、重い火力札で押し切る | 神託・渾身・大喝・見通し |
| 福永 | **窮地の火力** | 回復 | 大勝負 | resonance／engine | HP半分以下で+50%。回復を我慢して殴るか、回復して立て直すかの判断 | 冒険者の勘・一攫千金・幸運の女神・不屈の一歩（専用4枚全て正） |
| 笑蓮 | **無傷の火力** | 回復・ブロック | 無傷の慈愛 | **control**／control | HP80%以上を保って殴る。削られたら回復して戻す | 神託・大喝・渾身、福袋（半分以下で共鳴+2）、笑って許す |

---

## 5. Final Passive Specification

| 項目 | 蒼毘 | 笑蓮 | 福永 |
| --- | --- | --- | --- |
| id | `sobi_counter` | `shouren_pristine` | `fukuei_gamble` |
| 名称 | 反撃の構え | 無傷の慈愛 | 大勝負 |
| 表示文（1行） | 敵の攻撃を受け切って残ったブロックを、そのまま敵へダメージとして返す | HPが8割以上のとき、攻撃カードのダメージ+50% | HPが半分以下のとき、攻撃カードのダメージ+50% |
| trigger | `afterEnemyTurn`（`runEnemyTurn` の直後、`finishRound` の前） | `afterPlay`（カード本体効果と `bonus` の適用後） | `afterPlay`（同左） |
| 条件 | `state.status === 'playing'` かつ `player.block ≥ 1` | カード使用**前**の `player.hp ≥ ceil(maxHp × 0.8)` かつ カードに `damage target:'enemy'` 効果がある | カード使用**前**の `player.hp ≤ floor(maxHp × 0.5)` かつ 同左 |
| 効果 | `damage(enemy, floor(block × 1.0))` を Effect として適用（`applyEffects` 経由。atkバフの加算・敵HP上限・スコア加算は既存 `applyDamage` に従う） | `damage(enemy, floor(cardBaseDamage × 0.5))` を Effect として適用。`cardBaseDamage` ＝ そのカード定義の `damage:'enemy'` amount 合計（atkバフ・BURST・bonus の分は含めない） | 同左 |
| 数値（`RULES.godPassive`） | `sobi.counterRatio: 1.0`, `sobi.minBlock: 1` | `shouren.hpRatio: 0.8`, `shouren.bonusRatio: 0.5` | `fukuei.hpRatio: 0.5`, `fukuei.bonusRatio: 0.5` |
| 発火しない場合 | 敵が既に倒れている／ブロック0／敵ターンが `charge` で被弾ゼロでもブロックが残っていれば発火する（「読み外れて余った盾」も反撃になる） | 攻撃カード以外／HP条件未達／敵が本体効果で倒れた後 | 同左 |
| 神階Ⅳ・Ⅴとの関係 | ブロック効率75%は獲得量に掛かるため反撃量も自然に減る（追加の補正なし） | 回復効率60%で8割維持が難しくなる（追加の補正なし） | — |
| Mastery との関係 | 「鉄壁」は `runEnemyTurn` 内で集計済みのため影響なし | — | 「大勝負」Mastery の `riskCardEffDamage` は本体効果のみ集計し、Passive追加分は含めない（既存 `isRiskCard` ループを変更しない） |
| 神託（天啓）・BURST | 対象外（PLAY_CARD のみ） | 対象外 | 対象外 |

閾値の丸め：`hp ≥ Math.ceil(maxHp * 0.8)`（maxHp 30→24、27→22、35→28）、`hp ≤ Math.floor(maxHp * 0.5)`（30→15、27→13、35→17）。

---

## 6. Final Conditional Effect Specification

### 6-1. 構造

```ts
// types/card.ts
export type BonusCond = 'blocked' | 'enemyBig' | 'lowHp'
export type CardBonus = { when: BonusCond; effects: Effect[]; textJa: string }
export type CardDef = { ...既存, bonus?: CardBonus }
```

### 6-2. 条件の定義（全て `playCard` 内で1回だけ評価）

| when | 定義 | 参照する状態 |
| --- | --- | --- |
| `blocked` | 本体効果適用**後**の `player.block ≥ incoming` かつ `incoming > 0`。`incoming` ＝ 使用**前**の `enemy.intent` の合計（`enemyActionTotal`。難易度・神階倍率適用済みの表示値と同じ。`charge` は 0 → 発火しない） | after.player.block / before.enemy.intent |
| `enemyBig` | 使用**前**の `incoming ≥ RULES.cardBonus.enemyBigThreshold (=10)` | before.enemy.intent |
| `lowHp` | 使用**前**の `player.hp ≤ floor(maxHp × 0.5)` | before.player |

### 6-3. 適用規則

1. カード本体効果（`applyEffects`）→ 2. `status === 'playing'` なら `bonus.when` を評価 → 成立なら `BONUS_TRIGGERED` イベントを発行し `bonus.effects` を同じ rng 継続で `applyEffects` → 3. `status === 'playing'` なら神 Passive `afterPlay` → 4. `rngCursor` を進める。
- bonus 内の `resonance` が BURST を誘発する場合は既存 `applyResonance` に従う。bonus 内に `resonance` を持つのは福袋のみで、BURST 効果側に `resonance` は無いため無限発動は起きない。
- 数値は `RULES.cardBonus`：`enemyBigThreshold: 10`, `lowHpRatio: 0.5`。

---

## 7. Final Card Changes（4枚、本体効果は不変）

| カード | 本体（不変） | bonus | 説明文（表示値×10・2行以内） |
| --- | --- | --- | --- |
| 不動の構え（蒼毘・2AP） | block 13 | `blocked` → `damage(enemy, 6)` | ブロックを130得る。ブロックが敵の予告以上なら、敵に60ダメージ。 |
| 一喝（蒼毘・2AP） | debuff atk −6 ×3R | `enemyBig` → `damage(enemy, 6)` | 敵の攻撃力を3ラウンドのあいだ60下げる。敵の予告が100以上なら、敵に60ダメージ。 |
| 福袋（笑蓮・2AP） | heal 11 | `lowHp` → `resonance(2)` | HPを110回復する。HPが半分以下なら、共鳴ゲージ+2。 |
| 笑って許す（笑蓮・1AP） | heal 4 + block 4 | `blocked` → `draw(1)` | HPを40回復し、ブロックを40得る。ブロックが敵の予告以上なら、カードを1枚引く。 |

Step 2.5 実測（Ⅶ normal、対応標本、ΔWin pt）：不動の構え −10.3→+2.2、一喝 −6.7→+3.6、福袋 −44.2→−2.2（最終pilot 80%閾値で −1.3）、笑って許す −45.5→−6.2（80%で −2.7）。

---

## 8. Data Model / Architecture

| 変更点 | 内容 |
| --- | --- |
| `src/core/types/card.ts` | `BonusCond`, `CardBonus`, `CardDef.bonus?` を追加 |
| `src/core/types/god.ts` | `GodPassiveId = 'sobi_counter' \| 'shouren_pristine' \| 'fukuei_gamble'`、`GodDef.passive?: { id: GodPassiveId; nameJa: string; textJa: string }` を追加（表示データ。ロジックは持たない） |
| `src/core/types/event.ts` | `{ t: 'BONUS_TRIGGERED'; defId: CardDefId; when: BonusCond }`, `{ t: 'PASSIVE_TRIGGERED'; passiveId: GodPassiveId; amount: number }` を追加 |
| `src/core/data/rules.ts` | `godPassive: { sobi: { counterRatio: 1.0, minBlock: 1 }, shouren: { hpRatio: 0.8, bonusRatio: 0.5 }, fukuei: { hpRatio: 0.5, bonusRatio: 0.5 } }`, `cardBonus: { enemyBigThreshold: 10, lowHpRatio: 0.5 }`, `godIdentity: { passivesEnabled: true, cardBonusEnabled: true }`（rollback用kill switch） |
| `src/core/data/gods.ts` | 蒼毘・笑蓮・福永に `passive` を追加 |
| `src/core/data/cards/sobi.ts`, `shouren.ts` | 4枚に `bonus` と `text` 追記 |
| `src/core/engine/cardBonus.ts`（新規） | `evaluateBonusCond(when, before, after): boolean`（1関数・switch 3分岐） |
| `src/core/engine/godPassive.ts`（新規） | `PASSIVE_HOOKS: Record<GodPassiveId, { afterPlay?; afterEnemyTurn? }>`。`GodDef.passive.id` から参照する（神名やカード名の文字列比較は行わない） |
| `src/core/engine/playCard.ts` | 本体効果後に bonus → passive.afterPlay。`isRiskCard` ループ（福永Mastery）は本体効果部分のみ従来どおり |
| `src/core/engine/endRound.ts` | `runEnemyTurn` → passive.afterEnemyTurn → `finishRound` |
| 不変ルール | 1（core に React/Phaser なし）、2（rng は `createRng(seed, rngCursor)` を継続）、3（`if (card.name)` なし。条件はデータ、フックは id 登録）、4（数値は `rules.ts`）、5（saveVersion は据え置き、§11） |

参照実装：`scripts/phase3-audit/step2/harness2.ts` の `step()` ／ `evalCond()` ／ `designs.ts` の `sobiPassive`／`shourenPassive`／`PASSIVES[fukuei]`（本番の外側で同じ順序・同じ数値で動作し、本文書の全simulationはこれで測定した）。

---

## 9. Trigger Timing（確定順序）

```
PLAY_CARD:
  1 コスト支払い・combo加点（既存）
  2 本体 effects を applyEffects（既存）
  3 status==='playing' && def.bonus && evaluateBonusCond → BONUS_TRIGGERED → bonus.effects を applyEffects
  4 status==='playing' && god.passive.afterPlay(before, after, card) → PASSIVE_TRIGGERED → effects を applyEffects
  5 rngCursor 更新
END_ROUND:
  1 runEnemyTurn（既存。Mastery集計・debuff・hit逐次処理を含む）
  2 status==='playing' && god.passive.afterEnemyTurn(state) → PASSIVE_TRIGGERED → damage を applyEffects
     （敵HP0で勝利 → applyVictory は applyDamage 内で既存どおり）
  3 finishRound（既存。7R終了判定・次R開始・ブロック0リセット・ドロー）
USE_DIVINATION: 変更なし（bonus・passive 対象外）
```

- 反撃ダメージは「同じラウンド」に発生するため、大耀Mastery用の `roundDamage` にも積まれる（大耀は反撃Passiveを持たないので実害なし）。
- 反撃で敵HPが0になった場合、`finishRound` は `status !== 'playing'` で早期return（既存挙動）。GAME_ENDED は reducer が付与（既存）。

---

## 10. UI / Player Explanation

| 画面 | 変更 |
| --- | --- |
| 神選択（`GodSelectScreen`） | `god-select-tactics` の直下に1行「得意技：反撃の構え — 受け切って残った盾を、そのまま敵へ返す」。Passiveを持たない4神は表示なし（「得意技なし」とは書かない） |
| 戦闘HUD（`GodOtomoPanel`） | 神アイコン横に Passive 名バッジ1個（`title` 属性に効果文）。笑蓮・福永は条件成立中（HP8割以上／半分以下）にバッジを発光（`passive-armed` クラス）。新パネル・新ゲージなし |
| カード（`CardView`） | `def.text` の下に `bonus.textJa` を小さめの1行で表示（`card-view-bonus`）。手札表示時に条件が現在成立していれば強調（`card-bonus-ready`。`blocked` は「このカードを使えばブロックが予告以上になるか」で判定） |
| 発火演出 | `BONUS_TRIGGERED`／`PASSIVE_TRIGGERED` を `formatEvent` にログ行追加、`useBattleFx` で既存トースト経路に「反撃の構え！ 120」等を1件流す（新SE・新VFXは作らない。ダメージは既存 Game Feel 4段階に従う） |
| チュートリアル | ステップ追加なし。①「神とデッキを選ぼう」の本文に1文「神によっては“得意技”があります（神選択画面に表示）」を追記 |
| 結果画面・Mastery | 変更なし |
| Mobile | 追加は1〜2行のみ。Mobile一画面化には触れない |

---

## 11. Save / Compatibility

- `GameState` は無変更 → **saveVersion 9 のまま**。migrate 追加なし。
- v9 以前のセーブを「続きから」再開した場合、そのバトルの途中から新ルールが有効になる（バランス変更と同じ扱い。表示との齟齬は無い）。
- `rewardStorage`／`recordStorage`／`stakeStorage`／`dailyStorage` は無変更。
- Daily の Seed 共有・3回制限は無変更。Daily でも Passive・bonus は有効（神選択の意味を増やす方向で、公平性は「全員同じルール」で維持）。
- リプレイ／決定論：追加効果は同じ rng を継続し `rngCursor` を進めるため、同じ seed・同じ操作で完全再現（ハーネスで実証）。

---

## 12. Simulation Evidence

### 12-1. Step 2 full（探索AI、112試合/セル、C0 → C3-4v2）

| 指標 | C0 | C3-4v2 |
| --- | --- | --- |
| 神階Ⅶ normal：平均／最弱／神間スプレッド | 85.3／70.5／29.5pt | 93.0／84.8／15.2pt |
| ストレス（hard×Ⅶ）：平均／最弱／スプレッド | 49.8／25.0／61.6 | 68.1／51.8／40.2 |
| fortress／control が最良の神（stress） | 1（寿楽） | 3（蒼毘 fortress +14.3、寿楽 fortress +8.9、笑蓮 control +5.4） |
| 神階Ⅳ normal 最弱 | 83.9 | 97.3 |
| 神階0 | 49セル100% | 49セル100% |
| 勝利スコア比 max/min（Ⅶ） | 1.3 | 1.1 |
| BURST/試合 | 0.7〜1.3 | 0.7〜1.3 |

### 12-2. Step 2.5（対応標本、224試合/カード、Ⅶ normal）

| 指標 | C0 | C3-4v2 |
| --- | --- | --- |
| 共通32枚 God間順位相関（Spearman平均） | 0.64 | **0.69（未改善）** |
| 全神で上位8の共通カード | 1 | **2（未改善）** |
| 報酬3択：合意札を選ぶと失う価値 | 0.99pt | **0.49pt（縮小）** |
| 専用負価値（合成<0／有意） | 17／12 | 10／4（全て笑蓮） |

### 12-3. 最終 narrow pilot（対応標本、224試合/カード）

**A. 笑蓮閾値（専用4枚と共通回復札の ΔWin pt）**

| 閾値 | Ⅶ normal：福袋／笑って許す／懐の深さ／おおらかな一打 | 癒し／息吹／息継ぎ | base WR normal／stress | stress：専用4枚 |
| --- | --- | --- | --- | --- |
| 100%（Step 2案） | −2.2／−6.2／−5.8／−3.6 | −14.3／−5.8／−11.6 | 91.1／58.9 | −16.1／−22.3／−20.5／−13.8 |
| 90% | +0.9／−3.1／−1.8／−2.7 | −6.2／−1.3／−4.0 | 90.6／62.9 | −16.1／−18.7／−19.2／−9.8 |
| **80%（採用）** | **−1.3／−2.7／−0.4／0.0** | −5.4／−1.8／−4.5 | **92.0／67.4** | **−10.3／−11.2／−9.4／−2.2** |
| 70% | −3.6／−7.1／−4.5／−4.9 | −9.4／−6.2／−8.0 | 93.3／76.3 | −8.9／−13.4／−12.9／−9.4 |

採用理由：normal では 90% と同等、stress で明確に優位、勝率は +0.9pt で一強化なし（7神中4〜5位）。70% は常時buff化（normal で回復札が再悪化、stress 勝率 +17pt）。目標「有意負価値 4→≤1」は 80% で **3枚（−1.3〜−2.7pt、SE 2.4〜2.6 と同程度）** に留まり完全達成せず → §14 に残課題として記録。

**B. 蒼毘係数（共通ブロック札と剛撃の ΔWin pt、Ⅶ normal／stress）**

| 係数 | 鉄壁の構え | 守護 | 守りの陣 | 受け流し | 剛撃（純火力2AP） | 秘技満ちる／神楽舞（stress） | base WR normal／stress |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50%（Step 2案） | −0.9／−9.8 | −1.3／−12.1 | −0.4／−9.4 | −0.4／−10.3 | +0.9／−5.8 | −4.5／−5.4 | 96.4／82.6 |
| 75% | −1.8／−5.8 | −2.7／−8.5 | −2.2／−8.9 | −0.9／−4.0 | −0.4／−3.6 | +2.7／+1.8 | 96.9／80.8 |
| **100%（採用）** | **0.0／−1.3** | **−0.9／0.0** | **−0.4／−2.2** | **−0.4／+2.2** | **−0.9／−3.6** | **+1.8／+5.4** | **97.8／83.0** |

他神の同カード（C3-4v2、Ⅶ normal）：守護 −2.5〜−9.8、鉄壁 −3.0〜+2.1、守りの陣 −5.1〜+2.0。採用理由：100% で蒼毘の共通ブロック札が全神中最上位（≈0）になり、純火力の剛撃が初めてブロック・共鳴札の下に来る＝**共通カード順位に神差が生まれる唯一の観測**。勝率は +1.4／+0.4pt で最大化ではない。50・75% では到達しない。

### 12-4. FINAL 構成の確認run（蒼毘100%・笑蓮80%・福永50%・条件4枚 ＝ ルールセット `FINAL`）

full（探索AI×6プロファイル、112試合/セル）＋対応標本 marginal（224試合/カード、2条件）。出力 `scripts/phase3-audit/out/step2_full_FINAL.md`, `step25_marginal_FINAL_{s7,stress}.md`, `step25_report_FINAL.md`。

| 条件 | 全神平均／最弱／神間スプレッド | 最良プロファイル（勝率） | fortress／control 最良 |
| --- | --- | --- | --- |
| 神階0 | 100／100／0 | 全神・全プロファイル100% | — |
| 神階Ⅳ normal | 99.5／97.3／2.7 | 蒼毘 balanced 100、笑蓮 engine 100、福永 rush 99.1 | — |
| 神階Ⅶ normal | **93.2／84.8／15.2** | 恵比寿 resonance 93.8、大耀 resonance 84.8、**蒼毘 control 100**（fortress 98.2）、才華 rush 90.2、**寿楽 control 100**（fortress 99.1）、福永 resonance 86.6、笑蓮 resonance 97.3（control 96.4、fortress 94.6） | 2（＋笑蓮 control が最良と0.9pt差で競合） |
| ストレス hard×Ⅶ | 70.2／51.8／42.0 | 恵比寿 balanced 63.4、大耀 resonance 51.8、**蒼毘 fortress 93.8（+13.4）**、才華 resonance 65.2、**寿楽 fortress 86.6（+8.9）**、福永 resonance 55.4、**笑蓮 fortress 75.0（+11.6）** | **3** |

| 指標 | C0 | FINAL |
| --- | --- | --- |
| 神階Ⅶ 最良スコア比 max/min | 1.3 | 1.1（control 最良神のスコア劣後：蒼毘 −2.4%、寿楽 −0.5%、笑蓮 −1.7%） |
| BURST/試合（神階0〜Ⅶ） | 0.7〜1.3 | 0.2〜1.3（蒼毘・笑蓮は早期撃破で減少） |
| 試合内使用枚数（Ⅶ normal） | 蒼毘 18.0、笑蓮 18.3、他 11.9〜19.6 | 蒼毘 13.7、笑蓮 14.4、他 不変（早期撃破で減少、増加なし） |
| ヒューリスティック3戦略 Ⅶ 最良 | 63.6／46.4／45.0／47.9／73.6／31.4／29.3 | 63.6／46.4／**74.3**／47.9／73.6／**40.0**／**62.1**（スプレッド 44.3→34.3） |
| 専用28枚 負価値（合成<0／有意、Ⅶ normal） | 17／12 | **11／3**（有意3枚は全て笑蓮：福袋 −1.3、懐の深さ −2.2、笑って許す −3.6、SE 2.0〜2.3） |
| 共通32枚 God間順位相関（Ⅶ normal／stress） | 0.64／0.56 | **0.60／0.50（差はSE内、明確な改善ではない）** |
| 全神で上位8の共通カード（Ⅶ normal） | 1 | **2（未改善）** |
| 報酬3択：一致率／合意損失（Ⅶ normal） | 21.1%／0.99pt | **22.2%／0.58pt（未改善）** |
| 蒼毘の共通ブロック札（鉄壁・守護・守りの陣、Ⅶ normal） | −0.9／−1.3／−0.4 | 0.0／−0.9／−0.4（他神 −3.0〜+2.1／−9.8〜−2.5／−5.1〜+2.0）→ 蒼毘だけ最上位帯 |

Step 2（C3-4v2）との整合：神階Ⅶ normal・ストレスの平均／最弱／スプレッド、最良プロファイル、スコア比は C3-4v2 と同一帯域（差 ≤2pt）。係数変更（蒼毘 50→100%、笑蓮 100→80%）は勝率を押し上げず（蒼毘 +1.4、笑蓮 +0.9pt）、カード価値の側だけを動かした。

---

## 13. Acceptance Gates（Phase 3 実装後の最低確認。計測器＝`scripts/phase3-audit/step2/`）

| # | Gate | 判定基準 | 種別 | v0.1 simulation |
| --- | --- | --- | --- | --- |
| 1 | Playstyle Differentiation | ストレス条件で fortress／control／engine のいずれかが最良または最良と2pt以内の神 ≥3、かつ最良プロファイルの種類 ≥3 | Hard | **PASS**：fortress 最良3神（蒼毘・寿楽・笑蓮）、種類3（fortress／resonance／balanced） |
| 2 | God Identity | 7神それぞれに §4 の主軸1つが simulation 指標（資源プロファイル／最良プロファイル／カード順位）で説明できる | Hard | **PASS** 7/7（§4） |
| 3 | Exclusive Card Value | 専用28枚の有意負価値 ≤4（Step 1 の12から大幅削減） | Hard | **PASS** 3/28（全て笑蓮、−1.3〜−3.6pt） |
| 4 | God Spread | 神階Ⅶ normal 最良プロファイルの神間スプレッド ≤25pt、最弱神 ≥80% | Hard | **PASS** 15.2pt／84.8% |
| 5 | Defense / Control | 少なくとも2神で fortress または control が最良または競合（±2pt） | Hard | **PASS** Ⅶ normal：蒼毘・寿楽 control 100、笑蓮 control 96.4（最良と0.9差）。stress：fortress 最良3神 |
| 6 | Score Integrity | 神階Ⅶ 最良スコアの神間比 ≤1.2、fortress／control 最良神のスコア劣後 ≤5% | Hard | **PASS** 1.1／−0.5〜−2.4% |
| 7 | Beginner Safety | 神階0で全神 balanced ≥95%、特定神だけ −5pt以上の難化なし | Safety | **PASS** 全神100% |
| 8 | BURST | 全神 BURST ≤1.5回/試合、初発動R ≥3.5 | Hard | **PASS** 0.2〜1.3回（初発動R は Step 2 実測 3.5〜5.5 と同帯域） |
| 9 | Complexity | 新概念2（得意技・カードの追加条件）。カード説明2行以内。新resource/新パネル0 | Hard | **PASS**（§6・§10） |
| 10 | 3-minute Play | 追加操作0。試合内使用枚数・撃破Rが C0 より増えない（+10%以内） | Hard | **PASS** 追加操作0。使用枚数は蒼毘 18.0→13.7、笑蓮 18.3→14.4 と減少（早期撃破）、他神不変 |
| 11 | Common Card Differentiation | 共通32枚 God間順位相関、全神上位8枚数、報酬合意損失 を継続測定（改善目標 相関 ≤0.55） | **RISK metric（Hard Gateにしない）** | **未改善＝RISK**：相関 0.64→0.60（SE内）、全神上位8 1→2、合意損失 0.99→0.58pt。都合よく PASS 扱いしない |

v0.1 simulation 判定：Hard 9項目 PASS、Safety PASS、RISK metric 1項目未改善（記録）。数値はいずれも探索AI＋ルール層ハーネスによるもので、実装後に本番engine直結で再計測する（§16-7）。

Failure 時の扱い：Hard Gate 1つでも不成立なら Production 公開せず、`rules.ts` の係数調整→再simulation。2回調整しても不成立なら §18 の kill switch で無効化し Phase 3 を再設計。

---

## 14. Known Risks

| リスク | 内容・数値 | 扱い |
| --- | --- | --- |
| **COMMON CARD DIFFERENTIATION = RISK（未解消）** | 共通32枚の God間順位相関 0.64→0.69、全神上位8 1→2、報酬合意損失 0.99→0.49pt。共通カードに神を参照する要素が無いため、Passive／専用4枚では原理的に届かない。蒼毘100%で共通ブロック札だけは神差が出た（§12-3 B）が、他6神の共通順位は同じ | **Phase 4 最優先候補**として引き継ぐ（§19）。Gate 11 で継続測定。都合よく PASS 扱いしない |
| 笑蓮専用札の残負価値 | 80%閾値でも 福袋 −1.3／笑って許す −2.7／懐の深さ −0.4（SE同程度）。stress では −9〜−11 | 実装後 Human Play QA で「回復して8割へ戻してから殴る」判断が発生するかを確認。数値調整は `rules.ts` の `shouren.hpRatio`（0.8→0.85）と `bonusRatio` のみ。第2波（他カード追加）は Failure Gate 不成立時のみ |
| 蒼毘・寿楽の神階Ⅶ天井 | 探索AIで 97.8／96%。人間プレイでは低く出る見込みだが、神階Ⅷ相当の目標が無い | Phase 4（神階拡張）。v0.1 では扱わない |
| 福永の「窮地」がAIには現れにくい | 最良プロファイルは resonance／engine。「HPを低く保つ」判断はAIプロファイルに無い。dmgPassive 11.6/試合で発火は確認 | Human Play QA 項目。表示（HUDバッジ発光）で判断を可視化 |
| 神階Ⅳ・Ⅴとの相互作用 | ブロック効率75%で反撃量減、回復効率60%で8割維持が難化。C3-6v2 vs -Fs 比較で差別化指標は不変 | 変更なし。Gate 4 で監視 |
| 決定論・リプレイ | 追加効果の rng 継続を誤ると `rngCursor` がずれ、再開・リプレイが破綻 | §17 のリプレイ再現テストを必須化 |
| Daily 公平性 | 全神が神階0〜Ⅳで97〜100%に収束（C0 Ⅳ スプレッド16.1→2.7）。Daily★5 は未測定 | 実装後 Daily modifier で balanceSim を1回追加 |

---

## 15. Explicit Non-Goals（v0.1 で変更しないもの）

共通32枚の効果／他神の専用24枚／BURST効果・共鳴上限・獲得量・Manual BURST（Decision 127 維持）／OTOMO（形態・効果・進化条件）／神託／おすすめデッキ／神階Ⅰ〜Ⅶ modifier・スコア係数／Daily（Seed・3回・modifier）／報酬3択の構造・提示・上限+1／スコア式・Mastery閾値／寿楽の数値／新resource・新ゲージ・新パネル／Mobile一画面化／PV・BGM・Game Feel の再調整／多言語化。

---

## 16. Implementation Order（feature branch `feat/god-identity-v0.1`）

1. `types`（card.bonus / god.passive / event 2種）＋ `rules.ts`（`godPassive`・`cardBonus`・`godIdentity` kill switch）— 型エラーで実装漏れを検出
2. `engine/cardBonus.ts`・`engine/godPassive.ts` の純関数＋単体テスト
3. `playCard.ts`（bonus → passive.afterPlay）、`endRound.ts`（passive.afterEnemyTurn）＋リプレイ再現テスト
4. データ：`gods.ts` 3神、`cards/sobi.ts`・`cards/shouren.ts` 4枚（`text` 追記）
5. `balanceSim.test.ts` の既存ゲート（決定58・DAILY-01・STAKE-01）を通す。数値が崩れたら `rules.ts` のみで調整
6. UI：`CardView`（bonus行・ready強調）→ `GodOtomoPanel`（バッジ）→ `GodSelectScreen`（得意技行）→ `formatEvent`／`useBattleFx`（ログ・トースト）→ チュートリアル1文
7. `scripts/phase3-audit/step2/` を「本番engine直結モード」（ルール層を通さず `applyAction` のみ）で再実行し、ハーネス実装と本番実装の結果が一致することを確認（Gate 計測器の校正）
8. Acceptance Gates（§13）→ automated QA（§17）→ 必要時のみ Human Play QA → CEO Production承認 → merge/push/Vercel → Production QA → `docs/DECISIONS.md`・`RELEASE_STATUS.md` 更新

---

## 17. Automated QA Plan

| 種別 | 内容 |
| --- | --- |
| 単体（engine） | `evaluateBonusCond` 3条件×成立/不成立（charge予告で `blocked` 不成立、intent なしで不成立、`enemyBig` 境界9/10、`lowHp` 境界 floor(maxHp/2) で maxHp 27/30/35）／Passive 3種×成立/不成立（蒼毘：ブロック0・1・敵撃破時、笑蓮：hp=ceil(0.8maxHp)±1、福永：hp=floor(0.5maxHp)±1、非攻撃カードで不発火）／追加ダメージが `score.damage` と `mastery.roundDamage` に乗ること、福永 `riskCardEffDamage` に乗らないこと／蒼毘「鉄壁」`fullyBlockedCount` が反撃で変わらないこと |
| 決定論 | 同 seed・同操作で `GameState` が完全一致（bonus に draw を含む笑って許すで検証）、`rngCursor` が本体→bonus→passive の順で単調増加、途中保存→再開で同一結果 |
| kill switch | `godIdentity.passivesEnabled=false` / `cardBonusEnabled=false` で C0 と完全同一の状態遷移（既存 balanceSim の数値と一致） |
| データ | 4枚の `text` が `bonus.textJa` と整合、Passive を持つ神が3神のみ、`BonusCond` に未使用値が無い、`rules.ts` 以外に数値リテラルが無い（lint ルールまたはテストで grep） |
| balanceSim（既存） | 決定58（hard×全神×全敵で最良戦略≥50%）、DAILY-01、STAKE-01（段別床・単調性）が PASS |
| Acceptance Gates | `scripts/phase3-audit/step2/full.audit.ts` と `marginal.audit.ts` を本番engine直結で実行し §13 を判定 |
| UI（Playwright、既存スモークに追加） | 神選択で3神に得意技行・4神に無し／戦闘HUDバッジと `title`／手札の bonus 行と `card-bonus-ready` の点灯・消灯／発火トーストとログ／375px で崩れなし／既存 Normal・Daily・神階 E2E が PASS |
| 型・lint・build | `npx tsc -b --noEmit`、`npx oxlint .`、`npm run build`（bundle サイズ差 ≤ +8KB 目安） |

---

## 18. Rollback Plan

| 段階 | 手段 | 効果 |
| --- | --- | --- |
| 即時（数分） | `RULES.godIdentity.passivesEnabled=false`, `cardBonusEnabled=false` を反映した hotfix commit → Vercel deploy | engine 挙動が C0 と完全一致（テストで保証）。カード説明の bonus 行・得意技表示はフラグ連動で非表示 |
| 完全 | feature commit の `git revert` → deploy | saveVersion 据え置きのためセーブ移行不要。旧 bundle との差はロジックのみ |
| 発動条件 | Production QA で P0/P1、Acceptance Gate の Hard 不成立が本番計測で判明、神階Ⅶ／Daily で特定神が極端に一強化（勝率差 >40pt）または神階0で特定神が −10pt 以上難化 | — |
| 不可逆操作 | なし（localStorage 構造・キーは無変更） | — |

---

## 19. Phase 4 Handoff

1. **Reward / Common Card Preference（最優先候補）**：共通32枚の God間順位相関 0.69、全神上位8 2枚、報酬合意損失 0.49pt を改善する。候補：報酬3択の提示重み（神の Passive・専用札と噛み合う型を優先）、共通カードの一部に神条件 bonus（`when: 'godIs'` は禁止 → 状態条件 `blocked`/`lowHp` 等で神差が自然に出る設計）。計測器は `marginal.audit.ts`。
2. OTOMO：進化が Identity に寄与していない（形態平均0.7〜1.3）。
3. おすすめデッキ：統一は不採用。Passive に合わせた神別再設計と 3AP火力札枚数の上限。
4. 神階Ⅷ／Ⅶ選択追加：蒼毘・寿楽の天井。
5. 笑蓮第2波（必要時のみ）：懐の深さ・おおらかな一打の条件付き効果。
6. 負価値専用札の整理（数値のみで判断が変わらない札）。

---

## 20. GO / NO-GO

### 自己監査（Step 1〜2.5 との整合）

| 確認項目 | 結果 |
| --- | --- |
| Step 1 の Root Cause 1・2（無条件Effect／防御の経済）に対応しているか | 対応。条件付き `bonus` と変換型 Passive（守る→殴る／満タン→殴る／窮地→殴る） |
| Step 1 の禁止事項（寿楽nerf・デッキ統一・BURST・OTOMO・神階・Reward・Daily・新resource）を守っているか | 全て不変（§15） |
| Step 2 の推奨セット（3神＋4枚）と一致するか | 一致。変更は係数のみ（蒼毘 0.5→1.0、笑蓮 1.0→0.8）で、Step 2 が「数値・条件だけ微調整可」とした範囲内 |
| Step 2 full（C3-4v2）と FINAL の主指標が同帯域か | Ⅶ normal 93.0→93.2／84.8→84.8／15.2→15.2、stress 68.1→70.2／51.8→51.8、fortress・control最良 3→3 |
| Step 2.5 の RISK（共通カード）を PASS 扱いしていないか | していない。§13 Gate 11・§14 で未解消RISKとして記録、Phase 4 最優先候補（§19） |
| TBD が残っていないか | Passive対象神・名称・条件・係数・timing・4枚・bonus条件／効果・型・hook・save・UI・tutorial・Gate・rollback の全項目に値あり |
| 決定不変ルール 1〜5 | §8 で確認 |
| CEO判断事項（§6-3）該当 | なし（根本コンセプト・IP・課金・権利・公開・不可逆操作を含まない） |

### 判定

**IMPLEMENTATION READY**（ChatGPT最終監査待ち。監査完了と CEO の実装開始指示があるまで Production コードには着手しない）。

- Hard Gate 9項目・Safety 1項目を simulation で PASS。RISK metric（共通カード差別化）は未解消のまま明記。
- 実装は feature branch `feat/god-identity-v0.1` で §16 の順に行い、§17 の QA と §13 の再計測を通してから CEO の Production 承認を得る。
- 本文書・`scripts/phase3-audit/step2/designs.ts` の `FINAL` ルールセット・確認run 出力は **未commit**。commit 可否は ChatGPT 監査後に判断する。
