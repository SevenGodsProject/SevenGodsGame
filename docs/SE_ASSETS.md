# SE（効果音）アセット台帳（決定128・Game Feel Phase）

## 出典・ライセンス

| 項目 | 内容 |
|---|---|
| 生成方法 | `scripts/gen-se.mjs`（Node.js）が数式（正弦波・矩形波・ノイズ・簡易フィルタ・エンベロープ）から**決定論的に合成**して `public/assets/se/*.wav` を書き出す。再生成：`node scripts/gen-se.mjs` |
| 権利 | SEVEN GODS プロジェクトのオリジナル音源。サンプル・録音物・第三者素材・外部ライブラリの音源は一切使用していない。商用利用可（プロジェクト所有） |
| 形式 | WAV 16-bit mono 22.05kHz、20ファイル・合計約337KB、1音 0.06〜0.96 秒 |
| 優先順位の判断 | CEO方針「①既存ライセンス済み素材の再利用 ②AI生成・自作 ③無料商用可素材 ④有料素材」のうち、①該当なし（既存は合成トーンのみ・BGM 4曲は Suno 生成でSE用途ではない）→ **②自作**を採用。外部素材のライセンス確認・購入は不要 |
| フォールバック | WAV の取得・デコードに失敗した環境では `sound.ts` が従来の合成トーンを鳴らす（無音にならない） |

## 役割・音量階層（`src/components/battle/feelTier.ts` の `SE_GAIN`）

| 役割 | 係数（master 0.85 に乗算） | 音源 |
|---|---|---|
| Impact L1〜L4（自分→敵） | 0.45 / 0.6 / 0.8 / 1.0 | `hit_l1`〜`hit_l4`（同じノイズ斬撃＋サブ低音を強度で階層化。L4＝神技の一撃） |
| 被弾（敵→自分） | 0.6（通常）／0.8（連撃3発目・必殺）／1.0（必殺着弾） | `self_hit`, `self_hit_heavy` |
| Feedback（操作） | 0.3 | `card_play`, `card_draw`, `resonance_gain` |
| State Change | 0.65 | `burst_ready`（7/7到達）, `evolve`, `heal`, `divination`, `defeat_sting` |
| Warning | 0.5 | `enemy_turn`, `enemy_charge`（溜め） |
| Reward | 0.7 | `reward` |
| Big moment | 0.9（victory は 0.72） | `boss_entrance`, `victory_sting` |
| BGM | 0.35（既存。SE は BGM を邪魔しない上限として master 0.85×係数） | `public/assets/bgm/*.mp3`（決定120） |

勝利／敗北は既存のジングル（`bgm.ts` の `playJingle`、Suno 生成）を主とし、SE は短いスティングを重ねるだけ。

## ファイル一覧

card_play, card_draw, divination, hit_l1, hit_l2, hit_l3, hit_l4, self_hit, self_hit_heavy, block, heal, resonance_gain, burst_ready, evolve, enemy_turn, enemy_charge, boss_entrance, reward, victory_sting, defeat_sting

`src/components/battle/sound.test.ts` が「コード側の SE 名と WAV が1対1で存在する」ことを保証する。
