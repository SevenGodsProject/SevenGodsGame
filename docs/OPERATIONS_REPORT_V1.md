# SEVEN GODS PROJECT 運営向け 成果報告書 v1（2026-11-04・SEVENDAO ゲーム開発スタジオ・docs 正本）

> 本書は `docs/FINAL_SCOPE_ROADMAP_V1.md` §7 の構成に従い、repo の記録（`DECISIONS.md`・`RELEASE_STATUS.md`・各 Gate／Smoke 文書・権利台帳）だけを根拠に書く。推測・未検証の数値は書かない。CEO が運営へ渡す共有ページ 1 枚は本書の要約（画像は `docs/evidence/final-gate/screens/`）。公開範囲は CEO が決める。
>
> **本作は SEVENGODS（SGG）二次創作ガイドラインに基づく非公式のファン作品であり、SGG 運営の公式・公認・提携作品ではありません。** 本書で「公式」と書くのは Creator Kit の配布素材・公式キャラクター設定を指す場合のみで、戦闘個性・技名・台詞は本作の創作（AI 創作設定）です。

## 1. ゲーム概要・コンセプト

- **SEVEN GODS：共鳴カードバトル** — 7 柱の神から 1 柱を選び、専属 OTOMO と共に、行動予告を出す敵を **7 ラウンド以内に撃破するスコアアタック**（ブラウザ・無料・登録不要）
- 核：**「読む → 組む → 決まる」**（敵の予告を読み、手札と託宣を組み、共鳴で決める）。神ごとの専用カード・OTOMO・神の一撃（共鳴 7 で発動）・託宣（残り 3 回）・難易度 3 段・神階・Daily・49 攻略盤（7 神 × 7 敵）
- 技術：React 19 + TypeScript + Vite。`src/core` は React にも描画にも依存しない純粋 TS の決定論 engine（seed 付き乱数のみ・`Math.random` 禁止・カード効果はデータ）。セーブは version 付き（現行 v9）
- 根拠：`README.md`・`docs/DECISIONS.md`（決定 1〜289・390 行超）・`docs/SEVENGODS_COMMERCIAL_GAME_PRINCIPLES.md`

## 2. 開発成果と実装機能

### 2-1. Release 一覧（Production：https://seven-gods-game.vercel.app/）

| version | 公開日 | 内容（決定番号） | master sha | Vercel deployment |
|---|---|---|---|---|
| v1.0.0 | 2026-10-10 | 正式公開（Public Face・Save Compatibility・CI・A11y・Credits・Voice Pilot・決定277〜279） | `d2135d2` | `6973326943` |
| v1.0.1 | 2026-10-17 | ★再付番＋語彙補完＋敵選択注記（決定281） | `1ce9876` | `7133236766` |
| v1.0.2 | 2026-10-21 | 軍略 Pilot v1.1 × Enemy Break v1＋初心者導線（決定282） | `0d38c05` | `7228912965` |
| v1.0.3 | 2026-10-22〜23 | 初心者語彙 完結＋Home 2 戦目導線＋敗北画面（決定283） | `1f713d6` | `7256475048` |
| v1.0.4 | 2026-10-24 | Retention bundle（決定284） | `35a7f91` | `7283378458` |
| v1.0.5 | 2026-10-24 | Break SE・重い一撃の揺れ・再挑戦比較（決定285） | `a96a409` | `7291166485` |
| v1.0.6 | 2026-11-02 | 統合（忠次 Pilot v0.6 W2・Cost-Short Marking・神 HP 危険帯・crisis voice・決定286） | `10b0cd3` | `7494257506` |
| v1.0.7 | 2026-11-03 | 将軍家 W1：忠次 公開（決定287） | `f7e263d` | `7505565396` |
| v1.1.0 | 2026-11-03 | 将軍家 W2：岡っ引き・直政・康政（決定288） | `72025ae` | `7506844432` |
| v1.1.1 | 2026-11-03 | 将軍家 W3：影・くノ一・鬼半蔵 | `ee4f187` | `7507971142` |
| v1.1.2 | 2026-11-03 | 将軍家 W4：忠勝・ドーマン | `f4828cf` | `7520160454` |
| v1.1.3 | 2026-11-04 | 将軍家 W5：康虎 Boss ★5（10 体 公開完了） | `11dd335`→`86ed9ea`（記録） | `7530012443`→`7542751824` |
| v1.1.4 | 2026-11-04 | 将軍家 W6：敵演出 品質向上（10 体横断・表示のみ）＝最終 wave | `8af0082`→`c0c2b75`（記録） | `7547769021`→`7548772113` |

公開経路は v1.0.1 以降すべて **feature branch → PR → CI（tsc／oxlint／vitest／build）GREEN → CEO merge → Vercel 自動 deploy**（PR #1〜#19・CI success）。AI による無承認 merge／deploy は 0（決定289）。

### 2-2. 実装内容（主要・決定番号は `RELEASE_STATUS.md` A-2）

- 神 7 柱（恵比寿・大耀・蒼毘・才華・寿楽・福永・笑蓮）× OTOMO 7 体（各 3 形態）・カード 60 枚（共通＋神専用）・託宣・共鳴・神の一撃・神階・Daily・49 攻略盤
- 敵 **18 体**：既存 7 体（試練の影・業斧の鬼将・藍花の怨霊・銀甲の機工師・双牙の魔獣・蒼海の龍神・乱舞の道化）＋ **将軍家 10 体**（§3）＋ 非公開 Pilot 1 体（enemy_09・`?pilot=threat` でのみ）
- 戦闘体験：Combat Feel v2・Enemy Intent（予告）・Enemy Ultimate（必殺）・Enemy Break（崩れ）・God Strike カットイン・降臨の間・対峙構図 v2・Duel HUD v3・神 HP 危険帯・Cost-Short Marking・Reaction Language・Reward Relevance
- 音：BGM・SE（数式合成）・神側ボイス（大耀 greeting／crisis・Creator Kit 公式ボイス）
- 品質：vitest **1,695**（W6 時点）・CI・a11y 最小パック 69 項目・旧セーブ互換 44 項目・決定論 probe（cf2 8／将軍家 10 体／7 神 × 10 体 140 組）

## 3. 公式敵キャラ・ボイス対応状況

- **将軍家 10 体を実装・公開**（Creator Kit v1.1 の将軍家 2D 素材）：将軍四天王・忠次（★2）／捕り方・岡っ引き／将軍四天王・直政／将軍四天王・康政／忍者衆・影／忍者衆・くノ一／影の頭領・鬼半蔵／将軍四天王・忠勝／科学者・ドーマン／十七代将軍・康虎（Boss ★5）。★は実測（決定281 の再付番方式）
- 画像：Kit 原本（FRONT／MAIN）から **非生成加工のみ**（透過余白トリム・人物中心の切り出し＋放射状フェード・768² リサイズ）。舞台背景は既存舞台からの非生成派生（色相・明度・彩度）。AI 画像生成 0・外部費用 0。権利台帳 `docs/ASSET_RIGHTS_LEDGER.md` §8〜§12（立ち絵 10 行 ◎ KNOWN・舞台 10 行 UNKNOWN-ACCEPTED 継承）
- 戦闘個性・技名・予告文・「あと N で〜を止める」の台詞は **本作の創作**（公式設定ではない）。公式キャラ設定と区別するため Credits・Enemy Select 注記で明示
- **ボイス：公式ボイスは 7 神のみ。将軍家には公式ボイスがないため、本作も将軍家に声を付けない**（決定288 v1.1 修正案・2026-11-03・CEO 推奨）。理由：公式キャラクターの世界観と統一感を優先・開発期間と費用（音声生成契約）の削減・iOS 音声不具合リスクの回避。敵ボイス案の設計資産は `docs/OFFICIAL_ENEMY_VOICE_AUDIT_V1.md` に「実施しない記録」として保持
- 非公式表記：Home／Credits に「非公式のファン作品」「SGG 運営の公式・公認・提携作品ではない」「問い合わせを SGG 運営へ送らない」を明記。規約（二次創作ガイドライン・Creator Kit 利用規約）の確認日は台帳 Terms 列（2026-10-08 改訂 §5 音声 を含む）

## 4. ゲーム画面・プレイ URL

- プレイ URL：**https://seven-gods-game.vercel.app/**（PC／iPhone Safari・登録不要・外部通信 0・課金／広告 0）
- 画像（W6 build・大耀 × 康虎）：`docs/evidence/final-gate/screens/`（pc／sp × Home・神選択・挑む敵を選ぼう・降臨の間・戦闘 R1）。各 wave の受入画像は `docs/evidence/shogunate-*/`

## 5. QA・品質監査結果

| 区分 | 結果 | 根拠 |
|---|---|---|
| Release Gate（各 wave） | W1〜W6 すべて自動 Gate ALL PASS（tsc／oxlint／vitest／公開受入 228／Threat 74／回帰 44／hardening 10／a11y 69／旧セーブ 44／cf2 8／将軍家 probe） | `docs/W1〜W6_*_GATE.md` |
| Production Smoke（各 version） | v1.0.0〜v1.1.3 すべて PASS（本番 URL 直撃・JS error 0・外部通信 0） | `docs/V1_0_*_PRODUCTION_SMOKE.md`・`V1_1_*` |
| v1.1.4 本番 Smoke | **PASS**（S2 44／S5 228／S6 6 MATCH／S8 旧セーブ 44・JS error 0・外部通信 0・bundle は W6 Gate build と byte 一致） | `docs/V1_1_4_PRODUCTION_SMOKE.md` |
| 最終 Gate：7 神 × 将軍家 10 体 × normal／hard | **140 組 PASS**（同 seed 2 回で結果一致 140/140・JS error 0・外部通信 0） | `docs/FINAL_RELEASE_GATE_V1_1.md` §4-1 |
| Human QA（CEO・iPhone 実機） | Practical QA v3（2026-10-10）・W1〜W6 各 wave の通し QA（Q1／Q2 PASS・2026-11-02〜04） | DECISIONS 決定273／287／288 各行 |
| a11y | 最小パック 69/69（AA 4.5・44px・reduced-motion・音量） | `docs/A11Y_MINIMUM_PACK_V1.md` |
| perf | SP 実機 3 問 YES＋sp375 probe rafP95 記録 | `docs/SP_PERF_EVIDENCE_V1.md` |
| Known | K01〜K39 凍結（CEO 2026-10-11）＋K40〜K47 凍結（CEO 2026-11-04） | `docs/FINAL_RELEASE_GATE_V1_1.md` §2 |

## 6. 開発で工夫した点

1. **決定論 engine**：seed・replay・`gameVersion` 指紋（演出値を含めない）により「同じ seed なら同じ結果」を機械検査できる。Gate は before／after build を同じ手順で走らせ fingerprint 一致で回帰を判定（cf2・将軍家 probe・最終 140 組）
2. **AI チーム運営（CLAUDE.md §6・決定289）**：調査→比較→sim→実装→Gate→PR まで AI が自律で進め、CEO は Human QA と merge だけ。重要判断は「AI 判断」と明記して `DECISIONS.md` に残し、後から監査できる（Decision Log 390 行超）
3. **Release Protection**：master への直接 push・force・tag push を pre-push hook で禁止、PR → CI → CEO merge の一本道。AI の merge 権限は deny。INCIDENT（2026-10-10）以降 無承認公開 0
4. **Pilot 隔離（`?pilot=`）**：新しい敵や仕組みは URL パラメータでのみ出し、Daily・49 攻略盤・seed・save に影響させずに Human QA できる（忠次 v0.1〜v0.6 → 公開）
5. **Kit 素材の無改変運用**：原本 sha256 を manifest と照合し台帳に記録。加工は非生成（トリム・切り出し・色相）だけ、AI 生成素材は配信しない
6. **evidence first**：Gate の数値は JSON 証跡から生成し、文書に手書きしない（決定252 の教訓）。Human QA は CEO 実機で 1 周ずつ、再プレイ要求はしない

## 7. 現時点の制約・未解決課題

- Ranking は READY-DORMANT（K12・backend 接続なし）・Daily の神間 spread（K11）は Ranking 前提のため保留
- 将軍家 10 体は 49 攻略盤（7 神 × 既存 7 敵）の対象外（戦績には残る）。★は ★1〜2 帯に集中（K42）・hard は「止める／受ける」を要求する重さ（K43）
- 入口の JS 予約が重い端末で ≈230ms 遅れる（K01・CEO「修正しない」）
- 将軍家の台詞・技名は AI 創作設定＝公式設定と異なる可能性があり、運営から指摘があれば文言差し替えは Fast Gate で可能（rules／enemies.ts の文字列のみ）
- Credits の問い合わせ先は「準備中」（K47・CEO 確定待ち）。専門家（法務）による文言確認は未実施
- 既存 7 体の画風統一（K07）・Card Art Unity（K32）・SE 実音源・God Strike 6 柱は課金判断のため未着手
- Rollback 演習は 2026-11-04 に実施済み（v1.1.3 へ戻し → v1.1.4 へ復旧・各 S2 で機械確認・`docs/FINAL_RELEASE_GATE_V1_1.md` §5-1）。tag は 0 本（任意）

## 8. 今後の運営に向けた引き継ぎ

- **公開経路**：feature branch で実装・Gate → push（CEO または許可された branch）→ PR → CI GREEN → **CEO merge** → Vercel 自動 deploy → AI 本番 Smoke → LIVE 記録 PR。master・force・tag の push は hook で禁止（`docs/RELEASE_PROTECTION_V1.md`）
- **Rollback**：Vercel Dashboard の Deployments から前 version を Promote（CEO のみ）。各 version の deployment id は `RELEASE_STATUS.md` §A
- **台帳と規約**：新しい素材は `docs/ASSET_RIGHTS_LEDGER.md` §1-4 の手順（原本保全・sha256・Terms 確認日・Status）。Creator Kit 更新時は `docs/assets-kit/manifest.json` の sha256 照合 → 差分行の追加。規約改訂は Terms 列の確認日を更新し、Credits 文言を見直す
- **セーブ互換**：storage 13 key の version ポリシー（`docs/STORAGE_VERSION_POLICY.md`）。version を上げる変更は旧セーブ互換 44 項目を必ず通す
- **環境**：開発機は 6 GB RAM（Gate は直列・browser probe は 1 本ずつ）。worktree は wave ごと（`SevenGodsGame-w1〜w4`）。main repo `SevenGodsGame` は `feat/d224` で dirty のまま触らない（A-5）
- **運用メモ**：`docs/RELEASE_STATUS.md` A-5・`CLAUDE.md`・AI メモリ（lanes・自律運用・harness の制約）
- **連絡**：SGG 運営への任意の事前連絡（規約 §8）は本書と同時に CEO が判断。問い合わせ先の確定後に Credits を 1 行更新（Fast Gate）
