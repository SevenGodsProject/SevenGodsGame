# Decision248 — 現行の反応インベントリ（Production bcfd530・実コード）

読み方：engine event → 表示側が何を動かすか（file:line）。「主体」は実際に動く DOM の持ち主。時刻は commit（`CARD_PLAY_REVEAL_MS = 280`・`useGameEngine.ts:74`）を 0 とする。

## 1. カードを出す共通経路（60 枚すべて同じ）

| 段階 | 時刻 | 何が動く | 主体 | 出典 |
|---|---|---|---|---|
| タップ | 0ms | `card_play` SE（gain 0.4）、押下の沈み | Card／音 | `useBattleSound.ts`（決定233）、`press.css` |
| cast | −280〜0ms | 中央の閃光 `.cast-flash`（type 別 6 画像＋アイコン・0.35s）、power tier で光量 34／46px、READY なら金の輪 | Arena（画面中央） | `BattleScreen.tsx:446-457`、`battle.css:185-235・397-403・6319` |
| 飛翔 | −280〜−40ms | ゴーストが神の胸元へ 240ms（決定239） | Card → God | `useCardTravel.ts`、`cardTravel.css` |
| 構え | cast 中のみ・敵ダメージ札だけ | `.player-windup.is-winding` −7px・scale 0.97（220ms） | God | `BattleScreen.tsx:320`（`dealsEnemyDamage`）、`battle.css:4362-4368` |
| commit | 0ms | engine 適用 → イベント列 → `useBattleFx` が key を増やす | — | `useBattleFx.ts:96-372` |

## 2. イベント別：誰が動くか

| event | HUD | Card | God（立ち絵） | OTOMO | Enemy（立ち絵） | Arena | 音 | 出典 |
|---|---|---|---|---|---|---|---|---|
| `DAMAGE_DEALT`(enemy) | HP ゴースト 90+180+120+340ms、ミニ結果、トースト | — | **突き** `god-strike` 0.34s 18px／tier≥3 は `god-strike-heavy` 0.52s 28px（溜め 150ms） | — | **hit stop** 30/40/45/60ms・kb 4〜11px・揺れ・閃光・斬撃・数字 16〜40px | tier4 のみ揺れ 3px | `hit_l1〜l4` | `combatTimeline.ts`、`PlayerPanel.tsx:126-131`、`EnemyPanel.tsx:42-56`、`enemyVfxTiming.ts` |
| `DAMAGE_DEALT`(self・自傷) | ミニ結果「自分に n」 | — | **被弾の揺れ**（`hit-shake-flash`・90ms） | — | — | — | `self_hit` | `useBattleFx.ts:157-163`、`PlayerPanel.tsx:133` |
| `BLOCK_GAINED` | **盾バッジ pulse** 0.5s（scale 1.25・青の光）、トースト「🛡 ブロック+n」、ミニ結果 | — | — | — | — | — | `block`（90ms） | `useBattleFx.ts:181-186`、`PlayerPanel.tsx:101-107`、`battle.css:587` |
| `HEALED` | **HP バーの drop-shadow pulse** 0.7s、トースト、数字（緑）、ミニ結果 | — | — | — | — | — | `heal`（440ms） | `useBattleFx.ts:171-176`、`PlayerPanel.tsx:97-99`、`battle.css:1367`、`useFloatingNumbers.ts:130` |
| `CARD_DRAWN` | ミニ結果「カード+n」 | 手札に**その場で出現**（出現アニメなし・`card-play` は消える側だけ） | — | — | — | — | `card_draw`（110ms） | `useBattleFx.ts:190`、`battle.css:2478` |
| AP 変化（gainAp） | ミニ結果「神力+n」・AP バー | — | — | — | — | — | — | `useBattleFx.ts:106-108` |
| `BUFF_APPLIED`(self) | バフバッジ（文字）、ミニ結果 | — | — | — | — | — | — | `useBattleFx.ts:192`、`PlayerPanel.tsx:109-118` |
| `BUFF_APPLIED`(enemy・デバフ) | 敵バフ欄（文字）、予告値の再計算 | — | — | — | **なし**（`filter`/class 変化なし） | — | — | `EnemyPanel.tsx:139-146` |
| `RESONANCE_GAINED` | ゲージ fill（width 遷移）、「あと n」 | — | — | — | — | — | `resonance_gain`（150ms） | `GodOtomoPanel.tsx:173-181` |
| `BONUS_TRIGGERED`（⚡） | 34px 金の数字 | — | — | — | 金リング 110px・stop 50ms・`react-minor` | — | `reward`×1.5 | 決定224、`combatTimeline.ts:181-183` |
| `RESONANCE_BURST` | ゲージ発光、バナー | — | `god-burst-strike` 0.6s 24px | **`otomo-reacting`** pop 0.5s（効果がある形態のみ）＋ラベル | tier4・stop 80ms・52px | 暗転カットイン 900ms・揺れ 5px | `burst_ready`→`hit_l4` | `GodOtomoPanel.tsx:130-146`、`battle.css:1411` |
| `OTOMO_EVOLVED` | 🌱バナー | — | — | `evolve-glow` 1.2s | — | — | `evolve` | `GodOtomoPanel.tsx:140-146` |
| `ENEMY_ACTED` | 予告→実行、トースト | — | 被弾（tier 別揺れ・多段・特大リング） | — | 突進 `enemy-lunge*`（`--atk-x`）、必殺はカットイン | — | `enemy_turn`／`self_hit*` | `EnemyPanel.tsx`、`PlayerPanel.tsx:133-158` |
| `PASSIVE_TRIGGERED` | トースト「✨ 得意技」 | — | （反撃は敵ターン後の DAMAGE_DEALT として突き） | — | 着弾 | — | — | `useBattleFx.ts:194-197` |

## 3. 結論（再検証）

- **キャラクターが動くのは「敵ダメージ」「自傷」「神の一撃」「敵の攻撃」のときだけ**。60 枚のうち敵ダメージ／自傷を持つ札は **21 枚**。残り **39 枚**（GUARD 11・MEND 9・WEAKEN 6・ATTUNE 6・TEMPO 5・EMPOWER 2）は Card（閃光・飛翔）と HUD だけが動く（決定244 は「38」と記録したが `予言` を攻撃側に数えていた。正しくは 39）
- 39 枚のうち 30 枚（1 戦あたり平均 ≈5.2 回）が実プレイで出る（決定244 sim・reader／ふつう）。**1 戦 12〜15 手のうち 4〜6 手は「誰も動かない手」**
- 閃光（`cast-flash`）は type 別に 6 画像あるが、**形が同じ（中央の 320px の光＋130px アイコン）・場所が同じ（画面中央）・時間が同じ（0.35s）**。意味の違いは色とアイコンだけで、方向（誰から誰へ）を持たない
- 現行の資産で再利用できるもの：`god-strike` 系の transform 経路（`--atk-x` で向き）、`heal-pulse`／`badge-block-pulse` の色と時間、`otomo-reaction-pop` 0.5s、`.enemy-reaction` wrapper（`--impact-delay`／`--stop`）、`juice-bonus-flash` の色替え手法、決定240 の `--d240-*` 変数による filter 差し替え、reduced-motion の 4 ブロック（`battle.css:4227・4616・6853` ほか）
